import { ChatKitBase, ChatKitBaseProps } from '../base/ChatKitBase';
import { ChatMessage, RoleType, ApplicationContext, EventStreamMessage, OnboardingInfo } from '../../types';
import MessageList from '../base/copilot/MessageList';
import InputArea from '../base/copilot/InputArea';
import Header from '../base/copilot/Header';
import Prologue from '../base/copilot/Prologue';

/**
 * ChatKitCoze 组件的属性接口
 */
export interface ChatKitCozeProps extends ChatKitBaseProps {
  /** 扣子 Bot ID */
  botId: string;

  /** 扣子 API Token */
  apiToken: string;

  /** 扣子 API 基础 URL */
  baseUrl?: string;

  /** 用户 ID */
  userId?: string;
}

/**
 * ChatKitCoze 组件
 * 专门适配扣子(Coze) API 的智能体对话组件
 * 继承自 ChatKitBase,实现了 generateConversation、sendMessage 和 reduceAssistantMessage 方法
 */
export class ChatKitCoze extends ChatKitBase<ChatKitCozeProps> {
  /** 扣子 Bot ID */
  private botId: string;

  /** 扣子 API Token */
  private apiToken: string;

  /** 扣子 API 基础 URL */
  private baseUrl: string;

  /** 用户 ID */
  private userId: string;

  constructor(props: ChatKitCozeProps) {
    super(props);

    this.botId = props.botId;
    this.apiToken = props.apiToken;
    this.baseUrl = props.baseUrl || 'https://api.coze.cn';
    this.userId = props.userId || 'chatkit-user';
  }

  /**
   * 获取开场白和预置问题
   * 调用扣子 API 获取智能体配置信息，提取开场白和预置问题
   * API 端点: GET /v1/bots/{bot_id}
   * 注意：该方法是一个无状态无副作用的函数，不允许修改 state
   * @returns 返回开场白信息，包含开场白文案和预置问题
   */
  public async getOnboardingInfo(): Promise<OnboardingInfo> {
    try {
      // 使用正确的 API 端点
      const response = await fetch(`${this.baseUrl}/v1/bots/${encodeURIComponent(this.botId)}?is_published=true`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`获取扣子智能体配置失败: ${response.status} - ${errorText}`);
      }

      const result = await response.json();

      // 从响应中提取开场白和预置问题
      // 根据 OpenAPI 文档，data 包含 onboarding_info 对象
      const botInfo = result.data || {};
      const onboardingInfoV2 = botInfo.onboarding_info || {};

      const onboardingInfo: OnboardingInfo = {
        prologue: onboardingInfoV2.prologue || '你好！我是 AI 助手，有什么可以帮你的吗？',
        predefinedQuestions: onboardingInfoV2.suggested_questions || [],
      };
      return onboardingInfo;
    } catch (error) {
      // 返回默认开场白信息
      return {
        prologue: '你好！我是 AI 助手，有什么可以帮你的吗？',
        predefinedQuestions: [],
      };
    }
  }

  /**
   * 创建新的会话
   * 调用扣子 API 创建新的会话，返回会话 ID
   * 注意：该方法是一个无状态无副作用的函数，不允许修改 state
   * @returns 返回新创建的会话 ID
   */
  public async generateConversation(): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/conversation/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiToken}`,
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`创建扣子会话失败: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      const conversationId = result.data?.id || result.conversation_id || '';
      return conversationId;
    } catch (error) {
      // 返回空字符串，允许在没有会话 ID 的情况下继续（扣子 v3 API 支持自动创建会话）
      return '';
    }
  }

  /**
   * 向扣子后端发送消息 (流式响应)
   * 注意：该方法是一个无状态无副作用的函数，不允许修改 state
   * @param text 发送给后端的用户输入的文本
   * @param ctx 随用户输入文本一起发送的应用上下文
   * @param conversationID 发送的对话消息所属的会话 ID
   * @returns 返回发送的消息结构
   */
  public async sendMessage(text: string, ctx: ApplicationContext, conversationID?: string): Promise<ChatMessage> {
    // 构造上下文信息
    let fullMessage = text;
    if (ctx && ctx.title) {
      fullMessage = `【上下文: ${ctx.title}】\n${JSON.stringify(ctx.data, null, 2)}\n\n${text}`;
    }

    // 构造请求体
    const requestBody = {
      bot_id: this.botId,
      user_id: this.userId,
      stream: true,
      additional_messages: [
        {
          role: 'user',
          content: fullMessage,
          content_type: 'text',
        },
      ],
    };

    // 构造请求 URL，conversation_id 作为 Query Param 传递
    let chatUrl = `${this.baseUrl}/v3/chat`;
    if (conversationID) {
      chatUrl += `?conversation_id=${encodeURIComponent(conversationID)}`;
    }

    try {
      const response = await fetch(chatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiToken}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`扣子流式 API 调用失败: ${response.status} - ${errorText}`);
      }

      // 创建空的助手消息用于流式更新
      const assistantMessageId = `assistant-${Date.now()}`;
      const initialAssistantMessage: ChatMessage = {
        messageId: assistantMessageId,
        content: [], // 初始化为空数组，后续会通过 append*Block 方法添加内容块
        role: {
          name: 'AI 助手',
          type: RoleType.ASSISTANT,
          avatar: '',
        },
      };

      // 添加空的助手消息到列表
      this.setState((prevState) => ({
        messages: [...prevState.messages, initialAssistantMessage],
        streamingMessageId: assistantMessageId,
      }));

      // 处理流式响应
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法获取响应流');
      }

      // 调用父类的 handleStreamResponse 方法处理流式数据
      await this.handleStreamResponse<string>(reader, assistantMessageId);

      // 从 state 中获取最终更新后的消息
      const finalMessage = this.state.messages.find((msg) => msg.messageId === assistantMessageId);

      return finalMessage || initialAssistantMessage;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 将 API 接口返回的 EventStream 增量解析成完整的 AssistantMessage 对象
   * 对于 Coze，AssistantMessage 就是累积的文本字符串
   * @param eventMessage 接收到的一条 Event Message
   * @param prev 上一次增量更新后的文本 buffer
   * @returns 返回更新后的文本 buffer
   */
  public reduceAssistantMessage<T = any, K = any>(eventMessage: T, prev: K, messageId: string): K {
    try {
      const em = eventMessage as EventStreamMessage;
      const data = JSON.parse(em.data);
      const prevBuffer = prev as string;

      // 记录会话 ID
      if (data.conversation_id && data.conversation_id !== this.state.conversationID) {
        this.setState({ conversationID: data.conversation_id });
      }

      // 扣子v3 API的事件处理
      // 根据 event 字段判断事件类型
      if (em.event === 'conversation.message.delta') {
        // 增量内容
        if (data.content && data.type === 'answer') {
          const newBuffer = prevBuffer + data.content;
          // 调用 appendMarkdownBlock 方法更新界面上的 Markdown 块
          this.appendMarkdownBlock(messageId, newBuffer);
          return newBuffer as K;
        }
      } else if (em.event === 'conversation.message.completed') {
        // 消息完成,只处理 type 为 answer 的消息
        if (data.content && data.type === 'answer') {
          // 调用 appendMarkdownBlock 方法更新界面上的 Markdown 块
          this.appendMarkdownBlock(messageId, data.content);
          return data.content as K;
        }
        // 忽略 verbose 类型的消息
        if (data.type === 'verbose') {
          return prevBuffer as K;
        }
      } else if (em.event === 'conversation.chat.completed') {
        // Chat 完成事件
        return prevBuffer as K;
      } else if (em.event === 'conversation.chat.created') {
        // Chat 创建事件
        return prevBuffer as K;
      } else if (em.event === 'conversation.chat.in_progress') {
        // Chat 进行中事件
        return prevBuffer as K;
      } else if (em.event === 'conversation.message.started') {
        // 消息开始事件
        return prevBuffer as K;
      } else if (em.event === 'done') {
        // DONE 事件
        return prevBuffer as K;
      }

      // 处理扣子的其他消息类型事件
      if (data.msg_type === 'generate_answer_finish') {
        // 答案生成完成事件，保持当前 buffer
        return prevBuffer as K;
      }

      // 如果没有 event 字段,尝试从其他字段推断
      // 检查是否是 Chat 完成响应 (status: "completed")
      if (data.status === 'completed') {
        return prevBuffer as K;
      }

      // 其他未知事件类型，保持当前buffer而不是返回原始数据
      return prevBuffer as K;
    } catch (e) {
      return prev;
    }
  }

  /**
   * 检查是否需要刷新 token
   * Coze 平台返回 401 状态码时表示 token 失效
   * @param status HTTP 状态码
   * @param error 错误响应体
   * @returns 返回是否需要刷新 token
   */
  public shouldRefreshToken(status: number, _error: any): boolean {
    // 401 Unauthorized 表示 token 失效
    return status === 401;
  }

  /**
   * 终止会话
   * Coze 平台目前不支持主动终止会话，此方法为空实现
   * @param conversationId 要终止的会话 ID
   * @returns 返回 Promise，直接 resolve
   */
  public async terminateConversation(_conversationId: string): Promise<void> {
    // Coze 平台不支持主动终止会话
  }

  /**
   * 获取历史会话列表 (Coze 暂不支持)
   * @param _page 分页页码
   * @param _size 每页返回条数
   * @returns 返回空数组
   */
  public async getConversations(_page?: number, _size?: number): Promise<import('../../types').ConversationHistory[]> {
    return [];
  }

  /**
   * 获取指定会话 ID 的对话消息列表 (Coze 暂不支持)
   * @param _conversationId 会话 ID
   * @returns 返回空数组
   */
  public async getConversationMessages(_conversationId: string): Promise<ChatMessage[]> {
    return [];
  }

  /**
   * 删除指定 ID 的会话 (Coze 暂不支持)
   * @param _conversationID 会话 ID
   * @returns 返回 Promise，直接 resolve
   */
  public async deleteConversation(_conversationID: string): Promise<void> {
  }

  /**
   * 渲染 Copilot 模式界面
   */
  render() {
    if (!this.props.visible) {
      return null;
    }

    const { title = 'Copilot', onClose } = this.props;
    const { messages, textInput, applicationContext, isSending, onboardingInfo, isLoadingOnboarding, streamingMessageId } = this.state;
    const showPrologue = messages.length === 0;
    const isStreaming = streamingMessageId !== null;

    return (
      <div className="flex flex-col h-full w-full bg-white shadow-2xl">
        {/* 头部 */}
        <Header
          title={title}
          onClose={onClose}
          onNewChat={this.createConversation}
        />

        {/* 消息列表区域或欢迎界面 */}
        <div className="flex-1 overflow-y-auto">
          {showPrologue ? (
            isLoadingOnboarding ? (
              // 加载中，显示加载提示
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
                  <p className="text-sm text-gray-500">正在加载...</p>
                </div>
              </div>
            ) : (
              // 加载完成，显示开场白
              <Prologue
                onQuestionClick={this.handleQuestionClick}
                prologue={onboardingInfo?.prologue}
                predefinedQuestions={onboardingInfo?.predefinedQuestions}
              />
            )
          ) : (
            <MessageList messages={messages} />
          )}
        </div>

        {/* 输入区域 */}
        <InputArea
          value={textInput}
          onChange={this.setTextInput}
          onSend={this.handleSend}
          context={applicationContext}
          onRemoveContext={this.removeApplicationContext}
          disabled={isSending}
          isStreaming={isStreaming}
          onStop={this.handleStop}
        />
      </div>
    );
  }
}

export default ChatKitCoze;
