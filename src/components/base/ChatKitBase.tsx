import { Component } from 'react';
import { ChatMessage, RoleType, ApplicationContext, ChatKitInterface, EventStreamMessage, OnboardingInfo, WebSearchQuery, ExecuteCodeResult, Text2SqlResult, Text2MetricResult, BlockType, MarkdownBlock, WebSearchBlock, ToolBlock, ChartDataSchema, Json2PlotBlock } from '../../types';
import { Text2SqlIcon, Text2MetricIcon } from '../icons';

/**
 * ChatKitBase 组件的属性接口
 */
export interface ChatKitBaseProps {
  /** 会话 ID，每次新建会话时由后端返回新的会话唯一标识 */
  conversationID?: string;

  /** 当没有指定的 inputContext 时的默认输入上下文 */
  defaultApplicationContext?: ApplicationContext;

  /** 组件标题 */
  title?: string;

  /** 是否显示组件 */
  visible?: boolean;

  /** 关闭组件的回调函数 */
  onClose?: () => void;

  /** 调用接口时携带的令牌，放置到请求头：Authorization:Bearer {token} */
  token?: string;

  /** 刷新 token 的方法，由集成方传入 */
  refreshToken?: () => Promise<string>;
}

/**
 * ChatKitBase 组件的状态接口
 */
export interface ChatKitBaseState {
  /** 会话 ID，每次新建会话时由后端返回新的会话唯一标识 */
  conversationID: string;

  /** 消息列表，这里仅记录渲染到界面上的对话消息 */
  messages: ChatMessage[];

  /** 用户输入的文本 */
  textInput: string;

  /** 和用户输入文本相关的上下文 */
  applicationContext?: ApplicationContext;

  /** 是否正在发送消息 */
  isSending: boolean;

  /** 当前正在流式更新的消息 ID */
  streamingMessageId: string | null;

  /** 开场白信息，包含开场白文案和预置问题 */
  onboardingInfo?: OnboardingInfo;

  /** 是否正在加载开场白信息 */
  isLoadingOnboarding: boolean;
}

/**
 * ChatKitBase 基础组件
 * AI 对话组件的核心类。该类是一个 React 组件，包含标准的交互界面和交互逻辑。
 *
 * 注意：开发者不能够直接挂载 ChatKitBase 到 Web 应用，而是需要创建一个子类继承
 * ChatKitBase 和 ChatKitInterface，并实现 ChatKitInterface 中定义的方法。
 *
 * 该类实现了 ChatKitInterface 接口，子类需要实现 sendMessage 和 reduceEventStreamMessage 方法
 */
export abstract class ChatKitBase<P extends ChatKitBaseProps = ChatKitBaseProps> extends Component<P, ChatKitBaseState> implements ChatKitInterface {
  /**
   * 标记是否正在初始化或已经初始化
   * 用于防止重复初始化（特别是在 React.StrictMode 下）
   */
  private isInitializing = false;
  private hasInitialized = false;

  /**
   * 调用接口时携带的令牌
   */
  protected token: string;

  /**
   * 刷新 token 的方法，由集成方传入
   */
  protected refreshToken?: () => Promise<string>;

  constructor(props: P) {
    super(props);

    // 初始化 token 和 refreshToken
    this.token = props.token || '';
    this.refreshToken = props.refreshToken;

    this.state = {
      conversationID: props.conversationID || '',
      messages: [],
      textInput: '',
      applicationContext: props.defaultApplicationContext,
      isSending: false,
      streamingMessageId: null,
      onboardingInfo: undefined,
      isLoadingOnboarding: false,
    };
  }

  /**
   * 组件挂载后自动创建会话
   * 根据设计文档要求：组件被初始化的时候会自动新建会话
   */
  async componentDidMount(): Promise<void> {
    // 只在组件初次挂载且可见时自动创建会话
    if (this.props.visible && !this.hasInitialized && !this.isInitializing) {
      await this.initializeConversation();
    }
  }

  /**
   * 组件更新时检查是否需要初始化会话
   * 当 visible 从 false 变为 true 时，如果还未初始化，则初始化会话
   */
  async componentDidUpdate(prevProps: P): Promise<void> {
    // 当 visible 从 false 变为 true，且还未初始化时，初始化会话
    if (!prevProps.visible && this.props.visible && !this.hasInitialized && !this.isInitializing) {
      await this.initializeConversation();
    }
  }

  /**
   * 初始化会话的内部方法
   * 仅在组件首次可见时调用，防止重复初始化
   */
  private async initializeConversation(): Promise<void> {
    // 防止并发调用
    if (this.isInitializing || this.hasInitialized) {
      console.log('会话正在初始化或已初始化，跳过');
      return;
    }

    this.isInitializing = true;
    // 设置加载状态，防止显示默认开场白
    this.setState({ isLoadingOnboarding: true });

    try {
      console.log('ChatKit 组件初始化，自动创建会话...');
      await this.createConversation();
      this.hasInitialized = true;
    } catch (error) {
      console.error('自动创建会话失败:', error);
      // 即使创建会话失败，也尝试获取开场白信息
      try {
        const onboardingInfo = await this.getOnboardingInfo();
        this.setState({ onboardingInfo });
        this.hasInitialized = true;
      } catch (e) {
        console.error('获取开场白信息失败:', e);
      }
    } finally {
      this.isInitializing = false;
      // 加载完成，无论成功或失败都取消加载状态
      this.setState({ isLoadingOnboarding: false });
    }
  }

  /**
   * 获取开场白和预置问题 (抽象方法，由子类实现)
   * 该方法需要由子类继承并重写，以适配扣子、Dify 等 LLMOps 平台的接口
   * 返回开场白信息结构体
   * 注意：该方法是一个无状态无副作用的函数，不允许修改 state
   * @returns 返回开场白信息，包含开场白文案和预置问题
   */
  public abstract getOnboardingInfo(): Promise<OnboardingInfo>;

  /**
   * 新建会话 (抽象方法，由子类实现)
   * 该方法需要由开发者实现，以适配扣子、Dify 等 LLMOps 平台的接口
   * 成功返回会话 ID
   * 注意：该方法是一个无状态无副作用的函数，不允许修改 state
   * @param title 会话标题，通常是用户发送的第一条消息内容
   * @returns 返回新创建的会话 ID
   */
  public abstract generateConversation(title?: string): Promise<string>;

  /**
   * 向后端发送消息 (抽象方法，由子类实现)
   * 该方法需要由开发者实现，以适配扣子、Dify等 LLMOps 平台的接口
   * 发送成功后，返回发送的消息结构
   * 注意：该方法是一个无状态无副作用的函数，不允许修改 state
   * @param text 发送给后端的用户输入的文本
   * @param ctx 随用户输入文本一起发送的应用上下文
   * @param conversationID 发送的对话消息所属的会话 ID
   * @returns 返回发送的消息结构
   */
  public abstract sendMessage(text: string, ctx: ApplicationContext, conversationID?: string, regenerateMessageId?: string): Promise<ChatMessage>;

  /**
   * 将 API 接口返回的 EventStream 增量解析成完整的 AssistantMessage 对象 (抽象方法，由子类实现)
   * 当接收到 SSE 消息时触发，该方法需要由子类实现
   * 子类在该方法中应该调用以下方法来更新消息内容：
   * - appendMarkdownBlock(): 添加 Markdown 文本块
   * - appendWebSearchBlock(): 添加 Web 搜索结果块
   * - appendExecuteCodeBlock(): 添加代码执行结果块
   * 注意：该方法应该只处理数据解析逻辑，通过调用 append*Block 方法来更新界面
   * @param eventMessage 接收到的一条 Event Message
   * @param prev 上一次增量更新后的 AssistantMessage 对象
   * @param messageId 当前正在更新的消息 ID，用于调用 append*Block 方法
   * @returns 返回更新后的 AssistantMessage 对象
   */
  public abstract reduceAssistantMessage<T = any, K = any>(
    eventMessage: T,
    prev: K,
    messageId: string
  ): K;

  /**
   * 检查是否需要刷新 token (抽象方法，由子类实现)
   * 当发生异常时检查是否需要刷新 token。返回 true 表示需要刷新 token，返回 false 表示无需刷新 token。
   * 该方法需要由子类继承并重写，以适配扣子、Dify 等 LLMOps 平台的接口。
   * 注意：该方法是一个无状态无副作用的函数，不允许修改 state。
   * @param status HTTP 状态码
   * @param error 错误响应体
   * @returns 返回是否需要刷新 token
   */
  public abstract shouldRefreshToken(status: number, error: any): boolean;

  /**
   * 终止会话 (抽象方法，由子类实现)
   * 该方法需要由子类继承并重写，以适配扣子、Dify 等 LLMOps 平台的接口。
   * 注意：该方法是一个无状态无副作用的函数，不允许修改 state。
   * @param conversationId 要终止的会话 ID
   * @returns 返回 Promise，成功时 resolve，失败时 reject
   */
  public abstract terminateConversation(conversationId: string): Promise<void>;

  /**
   * 获取历史会话列表 (抽象方法，由子类实现)
   * 该方法需要由子类继承并重写，以适配扣子、Dify 等 LLMOps 平台的接口。
   * 注意：该方法是一个无状态无副作用的函数，不允许修改 state。
   * @param page 分页页码，默认为 1
   * @param size 每页返回条数，默认为 10
   * @returns 返回历史会话列表
   */
  public abstract getConversations(page?: number, size?: number): Promise<import('../../types').ConversationHistory[]>;

  /**
   * 获取指定会话 ID 的对话消息列表 (抽象方法，由子类实现)
   * 该方法需要由子类继承并重写，以适配扣子、Dify 等 LLMOps 平台的接口。
   * 如果对话消息是 AI 助手消息，则需要调用 reduceAssistantMessage() 解析消息。
   * 注意：该方法是一个无状态无副作用的函数，不允许修改 state。
   * @param conversationId 会话 ID
   * @returns 返回对话消息列表
   */
  public abstract getConversationMessages(conversationId: string): Promise<ChatMessage[]>;

  /**
   * 删除指定 ID 的会话 (抽象方法，由子类实现)
   * 该方法需要由子类继承并重写，以适配扣子、Dify 等 LLMOps 平台的接口。
   * 注意：该方法是一个无状态无副作用的函数，不允许修改 state。
   * @param conversationID 会话 ID
   * @returns 返回 Promise，成功时 resolve，失败时 reject
   */
  public abstract deleteConversation(conversationID: string): Promise<void>;

  /**
   * 向 ChatKit 注入应用上下文
   * @param ctx 要注入的应用上下文
   */
  public injectApplicationContext = (ctx: ApplicationContext): void => {
    this.setState({ applicationContext: ctx });
  };

  /**
   * 移除注入的应用上下文
   */
  public removeApplicationContext = (): void => {
    this.setState({ applicationContext: this.props.defaultApplicationContext });
  };

  /**
   * 添加或更新 Markdown 类型的消息块
   * 该方法由子类调用，用于在消息中添加或更新 Markdown 内容块
   * 如果最后一个块是 Markdown 块且内容为空或是 text 的前缀，则更新它（流式更新场景）
   * 否则添加新的 Markdown 块（新阶段场景）
   * @param messageId 消息 ID
   * @param text 要添加或更新的 Markdown 文本，每次都传完整的文本
   */
  protected appendMarkdownBlock(messageId: string, text: string): void {
    this.setState((prevState) => {
      const newMessages = prevState.messages.map((msg) => {
        if (msg.messageId === messageId) {
          const lastBlock = msg.content.length > 0 ? msg.content[msg.content.length - 1] : null;
          let newContent;

          // 如果最后一个块是 Markdown 块，且满足流式更新条件（空内容或是新文本的前缀），则更新它
          if (
            lastBlock &&
            lastBlock.type === BlockType.MARKDOWN &&
            (lastBlock.content === '' || text.startsWith(lastBlock.content))
          ) {
            // 流式更新：更新最后一个 Markdown 块
            newContent = [...msg.content];
            newContent[newContent.length - 1] = {
              type: BlockType.MARKDOWN,
              content: text,
            } as MarkdownBlock;
          } else {
            // 新阶段：添加新的 Markdown 块
            newContent = [
              ...msg.content,
              {
                type: BlockType.MARKDOWN,
                content: text,
              } as MarkdownBlock,
            ];
          }

          return { ...msg, content: newContent };
        }
        return msg;
      });

      return { messages: newMessages };
    });
  }

  /**
   * 添加 Web 搜索类型的消息块
   * 该方法由子类调用，用于在消息中添加 Web 搜索结果
   * @param messageId 消息 ID
   * @param query Web 搜索的执行详情
   */
  protected appendWebSearchBlock(messageId: string, query: WebSearchQuery): void {
    console.log('appendWebSearchBlock', query);
    this.setState((prevState) => {
      const newMessages = prevState.messages.map((msg) => {
        if (msg.messageId === messageId) {
          // 添加 Web 搜索块
          const newContent = [
            ...msg.content,
            {
              type: BlockType.WEB_SEARCH,
              content: query,
            } as WebSearchBlock,
          ];

          return { ...msg, content: newContent };
        }
        return msg;
      });

      return { messages: newMessages };
    });
  }

  /**
   * 添加代码执行工具类型的消息块
   * 该方法由子类调用，用于在消息中添加代码执行结果
   * @param messageId 消息 ID
   * @param result 代码执行的输入和输出结果
   */
  protected appendExecuteCodeBlock(messageId: string, result: ExecuteCodeResult): void {
    this.setState((prevState) => {
      const newMessages = prevState.messages.map((msg) => {
        if (msg.messageId === messageId) {
          // 添加代码执行工具块
          const newContent = [
            ...msg.content,
            {
              type: BlockType.TOOL,
              content: {
                name: 'execute_code',
                icon: <Text2SqlIcon />,
                title: '代码执行',
                input: result.input,
                output: result.output,
              },
            } as ToolBlock,
          ];

          return { ...msg, content: newContent };
        }
        return msg;
      });

      return { messages: newMessages };
    });
  }

  /**
   * 添加 Text2SQL 工具类型的消息块
   * 该方法由子类调用，用于在消息中添加 Text2SQL 查询结果
   * @param messageId 消息 ID
   * @param result Text2SQL 的输入和输出结果
   */
  protected appendText2SqlBlock(messageId: string, result: Text2SqlResult): void {
  
    this.setState((prevState) => {
      const newMessages = prevState.messages.map((msg) => {
        if (msg.messageId === messageId) {
          // 添加 Text2SQL 工具块
          const newContent = [
            ...msg.content,
            {
              type: BlockType.TOOL,
              content: {
                name: 'text2sql',
                title: result.title,
                icon: <Text2SqlIcon />,
                input: result.sql,
                output: {
                  data:result.data
                },
              },
            } as ToolBlock,
          ];

          return { ...msg, content: newContent };
        }
        return msg;
      });

      return { messages: newMessages };
    });
  }

  /**
   * 添加 Text2Metric 工具类型的消息块
   * 该方法由子类调用，用于在消息中添加 Text2Metric 查询结果
   * @param messageId 消息 ID
   * @param result Text2Metric 的输入和输出结果
   */
  protected appendText2MetricBlock(messageId: string, result: Text2MetricResult): void {
    this.setState((prevState) => {
      const newMessages = prevState.messages.map((msg) => {
        if (msg.messageId === messageId) {
          // 添加 Text2Metric 工具块
          const newContent = [
            ...msg.content,
            {
              type: BlockType.TOOL,
              content: {
                name: 'text2metric',
                title: result.title,
                icon: <Text2MetricIcon />,
                input: result.args,
                output: {
                  data: result.data,
                },
              },
            } as ToolBlock,
          ];

          return { ...msg, content: newContent };
        }
        return msg;
      });

      return { messages: newMessages };
    });
  }

   /**
    * 添加 JSON2Plot 图表类型的消息块
    * 该方法由子类调用，用于在消息中添加 JSON2Plot 图表数据
    * @param messageId 消息 ID
    * @param chartData 图表数据 Schema
    */
   protected appendJson2PlotBlock(messageId: string, chartData: ChartDataSchema): void {
    this.setState((prevState) => {
      const newMessages = prevState.messages.map((msg) => {
        if (msg.messageId === messageId) {
          // 添加 JSON2Plot 块
          const newContent = [
            ...msg.content,
            {
              type: BlockType.JSON2PLOT,
              content: chartData,
            } as Json2PlotBlock,
          ];

          return { ...msg, content: newContent };
        }
        return msg;
      });

      return { messages: newMessages };
    });
  }

  /**
   * 创建新的会话
   * 内部会调用子类实现的 generateConversation() 和 getOnboardingInfo() 方法
   */
  public createConversation = async (): Promise<void> => {
    // 设置加载状态
    this.setState({ isLoadingOnboarding: true });

    try {
      // 先清除现有会话
      this.clearConversation();

      // 调用子类实现的 getOnboardingInfo 方法获取开场白信息
      const onboardingInfo = await this.getOnboardingInfo();

      // 更新会话 ID 和开场白信息
      this.setState({
        onboardingInfo: onboardingInfo,
      });

      console.log('开场白信息已加载:', onboardingInfo);
    } catch (error) {
      console.error('创建新会话失败:', error);
      throw error;
    } finally {
      // 无论成功或失败，都取消加载状态
      this.setState({ isLoadingOnboarding: false });
    }
  };

  /**
   * 加载历史会话
   * 该方法从后端加载指定 ID 的历史会话消息，并更新到组件状态中
   * @param conversationId 要加载的会话 ID
   */
  public loadConversation = async (conversationId: string): Promise<void> => {
    try {
      // 调用子类实现的 getConversationMessages 方法获取会话消息
      const messages = await this.getConversationMessages(conversationId);

      // 更新会话 ID 和消息列表
      this.setState({
        conversationID: conversationId,
        messages: messages,
        onboardingInfo: undefined, // 清除开场白信息
      });

      console.log('历史会话已加载, conversationID:', conversationId);
      console.log('加载了', messages.length, '条消息');
    } catch (error) {
      console.error('加载历史会话失败:', error);
      throw error;
    }
  };

  /**
   * 清除会话中的对话消息及会话 ID
   */
  private clearConversation = (): void => {
    this.setState({
      conversationID: '',
      messages: [],
    });
    console.log('会话已清除');
  };

  /**
   * 发送消息的核心方法
   * 该方法是暴露给集成方进行调用的接口，内部会调用子类实现的 sendMessage() 方法
   * @param text 用户输入的文本
   * @param ctx 应用上下文
   * @param conversationID 发送的对话消息所属的会话 ID（可选）
   * @returns 返回发送的消息结构
   */
  public send = async (text: string, ctx?: ApplicationContext, conversationID?: string, regenerateMessageId?: string): Promise<ChatMessage> => {
    if (!text.trim()) {
      throw new Error('消息内容不能为空');
    }

    // 如果传入了 ctx，则设置 applicationContext
    if (ctx) {
      this.setState({ applicationContext: ctx });
    }

    // 使用传入的 conversationID，或使用当前 state 中的 conversationID
    let currentConversationID = conversationID || this.state.conversationID;

    // 如果没有会话 ID，则创建新会话
    if (!currentConversationID) {
      try {
        // 使用发送的内容作为会话标题
        currentConversationID = await this.generateConversation(text);
        this.setState({ conversationID: currentConversationID });
        console.log('自动创建新会话, conversationID:', currentConversationID);
      } catch (error) {
        console.error('自动创建会话失败:', error);
        // 即使创建会话失败，也继续发送消息（某些平台可能不需要预先创建会话）
      }
    }

    this.setState({ isSending: true });

    // 获取最终使用的上下文
    const finalContext = ctx || this.state.applicationContext || this.props.defaultApplicationContext || { title: '', data: {} };

    // **重要：重新生成时不创建用户消息**
    // 只有当 regenerateMessageId 不存在时，才创建并插入用户消息
    if (!regenerateMessageId) {
      // 创建用户消息
      const userMessage: ChatMessage = {
        messageId: `user-${Date.now()}`,
        content: [
          {
            type: BlockType.TEXT,
            content: text,
          },
        ],
        role: {
          name: '用户',
          type: RoleType.USER,
          avatar: '',
        },
        // 如果有应用上下文，则附加到用户消息中
        applicationContext: finalContext.title || finalContext.data ? finalContext : undefined,
      };

      // 将用户消息添加到消息列表
      this.setState((prevState) => ({
        messages: [...prevState.messages, userMessage],
      }));
    }

    try {
      // 如果不是重新生成，则清空输入框
      if (!regenerateMessageId) {
        this.setState({ textInput: '' });
      }
      
      // 调用子类实现的 sendMessage 方法，传入 conversationID 和 regenerateMessageId
      const assistantMessage = await this.sendMessage(text, finalContext, currentConversationID, regenerateMessageId);

      // 流式响应时,子类已经添加并更新了消息,这里只需要清理状态
      this.setState({
        isSending: false,
        streamingMessageId: null,
      });

      return assistantMessage;
    } catch (error) {
      console.error('发送消息失败:', error);
      this.setState({ isSending: false, streamingMessageId: null });
      throw error;
    }
  };

  /**
   * 处理流式响应
   * 在闭包中处理 EventStream,并在处理完成后丢弃闭包
   * @param reader ReadableStreamDefaultReader
   * @param assistantMessageId 助手消息 ID
   */
  protected async handleStreamResponse<T = any>(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    assistantMessageId: string
  ): Promise<T> {
    const decoder = new TextDecoder();
    let assistantMessage: T = {} as T;

    try {
      let currentEvent = ''; // 保存当前的 SSE event 类型
      let buffer = ''; // 用于缓存不完整的行

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('流式响应完成');
          break;
        }

        // 将新数据追加到缓冲区
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // 按换行符分割，但保留最后一个可能不完整的部分
        const lines = buffer.split('\n');
        // 最后一个元素可能是不完整的行，保留在 buffer 中
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;

          // 处理 SSE 的 event 行
          if (trimmedLine.startsWith('event:')) {
            // 保存 SSE 事件类型，用于下一个 data 行
            currentEvent = trimmedLine.slice(6).trim();
            console.log('收到SSE event:', currentEvent);
            continue;
          }

          if (trimmedLine.startsWith('data:')) {
            const dataStr = trimmedLine.slice(5).trim();

            if (dataStr === '[DONE]') {
              console.log('收到 DONE 标记');
              continue;
            }

            try {
              const data = JSON.parse(dataStr);
              console.log('收到SSE数据:', data);

              // 构造 EventStreamMessage
              // 使用 SSE 的 event 行中的事件类型，如果没有则尝试从 data 中获取
              const eventMessage: EventStreamMessage = {
                event: currentEvent || data.event || data.type || '',
                data: dataStr,
              };

              console.log('构造的 EventStreamMessage:', eventMessage);

              // 调用子类的 reduceAssistantMessage 方法解析事件
              // 传入 assistantMessageId 以便子类可以直接更新对应的消息
              assistantMessage = this.reduceAssistantMessage(
                eventMessage,
                assistantMessage,
                assistantMessageId
              );

              // 重置 currentEvent，准备处理下一个事件
              currentEvent = '';
            } catch (e) {
              console.error('解析流式响应失败:', e, '原始数据长度:', dataStr.length);
              console.error('数据前100字符:', dataStr.substring(0, 100));
              console.error('数据后100字符:', dataStr.substring(Math.max(0, dataStr.length - 100)));
            }
          }
        }
      }

      // 处理缓冲区中剩余的数据（如果有）
      if (buffer.trim()) {
        console.log('处理剩余缓冲区数据:', buffer);
      }
    } finally {
      // 流式传输完成后,闭包会被丢弃
      reader.releaseLock();
    }

    return assistantMessage;
  }

  /**
   * 执行 API 调用，并在需要时自动刷新 token 并重试一次
   * @param apiCall API 调用函数
   * @returns API 调用结果
   */
  protected async executeWithTokenRefresh<T>(
    apiCall: () => Promise<T>
  ): Promise<T> {
    try {
      // 第一次尝试
      return await apiCall();
    } catch (error: any) {
      const status = error.status || error.response?.status || 0;
      const errorBody = error.body || error.response?.data || error;

      // 检查是否需要刷新 token
      const needsRefresh = this.shouldRefreshToken(status, errorBody);

      if (needsRefresh && this.refreshToken) {
        console.log('检测到 token 失效，正在刷新 token...');

        try {
          // 调用 refreshToken 方法获取新 token
          const newToken = await this.refreshToken();

          // 更新 token 属性
          this.token = newToken;

          console.log('Token 刷新成功，正在重试请求...');

          // 重试 API 调用
          try {
            return await apiCall();
          } catch (retryError: any) {
            // 重试后仍然失败，检查是否还是 token 问题
            const retryStatus = retryError.status || retryError.response?.status || 0;
            const retryErrorBody = retryError.body || retryError.response?.data || retryError;

            if (this.shouldRefreshToken(retryStatus, retryErrorBody)) {
              console.error('重试后仍然提示 token 失效，放弃重试');
            }

            // 抛出重试后的错误
            throw retryError;
          }
        } catch (refreshError) {
          console.error('刷新 token 失败:', refreshError);
          // 刷新失败，抛出原始错误
          throw error;
        }
      }

      // 不需要刷新 token，直接抛出错误
      throw error;
    }
  }

  /**
   * 处理发送按钮点击
   */
  protected handleSend = async () => {
    if (!this.state.textInput.trim() || this.state.isSending) {
      return;
    }

    const context = this.state.applicationContext || this.props.defaultApplicationContext || { title: '', data: {} };

    console.log('发送消息:', this.state.textInput);
    console.log('选中的上下文:', context);

    try {
      await this.send(this.state.textInput, context);
    } catch (error) {
      console.error('发送消息失败:', error);
    }
  };

  /**
   * 处理停止流式响应
   * 调用子类实现的 terminateConversation 方法终止当前会话
   */
  protected handleStop = async () => {
    const { conversationID, streamingMessageId } = this.state;

    if (!streamingMessageId) {
      console.warn('没有正在进行的流式响应');
      return;
    }

    console.log('停止流式响应, conversationID:', conversationID);

    try {
      // 调用子类实现的 terminateConversation 方法
      await this.terminateConversation(conversationID);

      // 清除流式消息 ID，恢复为正常状态
      this.setState({
        streamingMessageId: null,
        isSending: false,
      });

      console.log('流式响应已停止');
    } catch (error) {
      console.error('停止流式响应失败:', error);
      // 即使失败，也清除状态，让用户可以重新操作
      this.setState({
        streamingMessageId: null,
        isSending: false,
      });
    }
  };

  /**
   * 更新用户输入
   */
  protected setTextInput = (value: string) => {
    this.setState({ textInput: value });
  };

  /**
   * 处理推荐问题点击
   */
  protected handleQuestionClick = (question: string) => {
    this.setState({ textInput: question });
  };

  /**
   * 渲染组件 (抽象方法，由子类实现)
   * 子类需要实现该方法以渲染不同的界面
   * CopilotBase 和 AssistantBase 会分别实现各自的渲染逻辑
   */
  abstract render(): React.ReactNode;
}

export default ChatKitBase;
