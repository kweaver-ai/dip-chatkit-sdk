import {
  ApplicationContext,
  ChatMessage,
  OnboardingInfo,
  WebSearchQuery,
  WebSearchResult,
  RoleType,
  ChartDataSchema,
  ConversationHistory,
  BlockType,
} from '../../types';
import { Constructor } from '../../utils/mixins';
import { Text2SqlIcon, Text2MetricIcon, AfSailorIcon } from '../icons';

/**
 * DIP 的 AssistantMessage 接口
 * 对应 agent-app.schemas.yaml#/components/schemas/Message
 */
interface AssistantMessage {
  message?: {
    id?: string;
    conversation_id?: string;
    role?: string;
    content?: {
      middle_answer?: {
        progress?: Progress[];
      };
    };
  };
  error?: string;
}

/**
 * OtherTypeAnswer 接口
 * 智能体输出的非文本类型内容
 * 对应 agent-app.schemas.yaml#/components/schemas/OtherTypeAnswer
 */
interface OtherTypeAnswer {
  stage?: string;
  answer?: any;
  skill_info?: SkillInfo;
}

/**
 * SkillInfo 接口
 * 调用技能的技能详情
 * 对应 agent-app.schemas.yaml#/components/schemas/SkillInfo
 */
interface SkillInfo {
  type?: 'TOOL' | 'MCP' | 'AGENT';
  name?: string;
  args?: Array<{
    name?: string;
    type?: string;
    value?: string;
  }>;
}

/**
 * Progress 接口
 * 智能体执行过程中的一个步骤
 */
interface Progress {
  stage?: string;
  answer?: string | any;
  skill_info?: SkillInfo;
}

/**
 * EventMessage 接口
 * DIP 的 Event Stream Message
 */
interface EventMessage {
  seq_id?: number;
  key?: Array<string | number>;
  action?: 'append' | 'upsert' | 'end';
  content?: any;
}

/**
 * DIPBase 的 props 接口
 */
export interface DIPBaseProps {
  /** AISHU DIP 的 Agent Key,用作路径参数 */
  agentKey: string;

  /** 访问令牌,需要包含 Bearer 前缀 (已废弃，请使用 token 属性) */
  bearerToken?: string;

  /** 服务端基础地址,应包含 /api/agent-app/v1 前缀 */
  baseUrl?: string;

  /** agent 版本，"v0"表示最新版本，默认 "v0" */
  agentVersion?: string;

  /** 智能体执行引擎版本，最新为"v2"，默认 "v2" */
  executorVersion?: string;

  /** 智能体所属的业务域,用于 agent-factory API */
  businessDomain?: string;

  /** 调用接口时携带的令牌 */
  token?: string;

  /** 刷新 token 的方法 */
  refreshToken?: () => Promise<string>;
}

/**
 * DIPBase Mixin 函数
 * 根据 TypeScript 官方文档实现的 mixin 模式
 *
 * 该 mixin 为基础类添加 AISHU DIP API 的集成能力，包括：
 * - getOnboardingInfo(): 获取开场白信息
 * - generateConversation(): 创建新会话
 * - reduceAssistantMessage(): 从 EventStream 中提取出 action 和 content，并根据 action 将 content 增量更新到 AssistantMessage
 * - shouldRefreshToken(): 判断 API 响应的状态码是否是 401，如果是，则表示需要刷新 Token
 * - terminateConversation(): 终止会话
 *
 * @param Base 基础类，通常是 CopilotBase 或 AssistantBase
 * @returns 混入 DIP 功能后的类
 */
export function DIPBaseMixin<TBase extends Constructor>(Base: TBase) {
  return class DIPBase extends Base {
    /** 服务端基础地址 */
    public dipBaseUrl: string;

    /** Agent Key (agent 标识) */
    public dipKey: string;

    /** Agent 信息 */
    public agentInfo: any;

    /** agent 版本 */
    public dipVersion: string;

    /** 智能体执行引擎版本 */
    public dipExecutorVersion: string;

    /** 业务域 */
    public dipBusinessDomain: string;

    /** DIP 调用接口时携带的令牌 */
    public dipToken: string;

    /** DIP 刷新 token 的方法 */
    public dipRefreshToken?: () => Promise<string>;

    constructor(...args: any[]) {
      super(...args);

      // 从 props 中提取 DIP 相关配置
      const props = args[0] as DIPBaseProps;

      this.dipBaseUrl = props.baseUrl || 'https://dip.aishu.cn/api/agent-app/v1';
      this.dipKey = props.agentKey;
      this.dipVersion = props.agentVersion || 'latest';
      this.dipExecutorVersion = props.executorVersion || 'v2';
      this.dipBusinessDomain = props.businessDomain || 'bd_public';
      this.dipToken = props.token || '';
      this.dipRefreshToken = props.refreshToken;

      // 向后兼容：如果传入了 bearerToken 但没有 token，从 bearerToken 中提取 token
      if (props.bearerToken && !props.token) {
        // bearerToken 包含 "Bearer " 前缀，需要移除
        this.dipToken = props.bearerToken.replace(/^Bearer\s+/i, '');
      }
    }

    /**
     * 获取开场白和预置问题
     * 调用 AISHU DIP 的 agent-factory API 获取智能体配置信息，提取开场白和预置问题
     * API 端点: GET /api/agent-factory/v3/agent-market/agent/{agent_key}/version/v0
     * 注意：该方法是一个无状态无副作用的函数，不允许修改 state
     * @returns 返回开场白信息，包含开场白文案和预置问题
     */
    public async getOnboardingInfo(): Promise<OnboardingInfo> {
      try {
        console.log('正在获取 DIP 配置...');

        // 构造 agent-factory API 的完整 URL
        let agentFactoryUrl: string;
        if (this.dipBaseUrl.startsWith('http://') || this.dipBaseUrl.startsWith('https://')) {
          // 生产环境：使用完整 URL
          const baseUrlObj = new URL(this.dipBaseUrl);
          agentFactoryUrl = `${baseUrlObj.protocol}//${baseUrlObj.host}/api/agent-factory/v3/agent-market/agent/${encodeURIComponent(this.dipKey)}/version/v0`;
        } else {
          // 开发环境：使用相对路径走代理
          agentFactoryUrl = `/api/agent-factory/v3/agent-market/agent/${encodeURIComponent(this.dipKey)}/version/v0`;
        }

        console.log('调用 agent-factory API:', agentFactoryUrl);

        // 使用 executeDataAgentWithTokenRefresh 包装 API 调用，支持 token 刷新和重试
        const result = await this.executeDataAgentWithTokenRefresh(async () => {
          const response = await fetch(agentFactoryUrl, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${this.dipToken}`,
              'Content-Type': 'application/json',
              'x-business-domain': this.dipBusinessDomain,
            },
          });

          if (!response.ok) {
            const errorText = await response.text();
            const error: any = new Error(`获取 DIP 配置失败: ${response.status} - ${errorText}`);
            error.status = response.status;
            error.body = errorText;
            throw error;
          }

          return await response.json();
        });

        // 存储 agent name 和 id
        this.agentInfo = result;

        // 从响应中提取开场白和预置问题
        const config = result.config || {};
        const openingRemarkConfig = config.opening_remark_config || {};
        const presetQuestions = config.preset_questions || [];

        // 构造开场白信息
        let prologue = '你好！我是数据智能体助手，我可以帮你分析数据、回答问题。';
        if (openingRemarkConfig.type === 'fixed' && openingRemarkConfig.fixed_opening_remark) {
          prologue = openingRemarkConfig.fixed_opening_remark;
        }

        // 提取预置问题
        const predefinedQuestions = presetQuestions
          .map((item: any) => item.question)
          .filter((q: any) => typeof q === 'string' && q.trim().length > 0);

        const onboardingInfo: OnboardingInfo = {
          prologue,
          predefinedQuestions,
        };
        return onboardingInfo;
      } catch (error) {
        console.error('获取 DIP 配置失败:', error);
        // 返回默认开场白信息
        return {
          prologue: '你好！我是数据智能体助手，我可以帮你分析数据、回答问题。',
          predefinedQuestions: [],
        };
      }
    }

    /**
     * 创建新的会话
     * 调用 DIP API 创建新的会话，返回会话 ID
     * API 端点: POST /app/{agent_key}/conversation
     * 注意：该方法是一个无状态无副作用的函数，不允许修改 state
     * @param title 会话标题，通常是用户发送的第一条消息内容
     * @returns 返回新创建的会话 ID
     */
    public async generateConversation(title?: string): Promise<string> {
      try {
        console.log('正在创建 DIP 会话...', title ? `标题: ${title}` : '');

        // 构造创建会话的请求体
        const requestBody: any = {
          title: title || '新会话',
        };

        // 使用 executeDataAgentWithTokenRefresh 包装 API 调用，支持 token 刷新和重试
        const result = await this.executeDataAgentWithTokenRefresh(async () => {
          const response = await fetch(
            `${this.dipBaseUrl}/app/${this.dipKey}/conversation`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.dipToken}`,
              },
              body: JSON.stringify(requestBody),
            }
          );

          if (!response.ok) {
            const errorText = await response.text();
            const error: any = new Error(`创建 DIP 会话失败: ${response.status} - ${errorText}`);
            error.status = response.status;
            error.body = errorText;
            throw error;
          }

          return await response.json();
        });

        // 从响应中获取会话 ID
        const conversationId = result.data?.id || result.id || '';

        console.log('DIP 会话创建成功, conversationID:', conversationId, 'ttl:', result.data?.ttl || result.ttl);
        return conversationId;
      } catch (error) {
        console.error('创建 DIP 会话失败:', error);
        // 返回空字符串，允许在没有会话 ID 的情况下继续
        return '';
      }
    }

    /**
     * 调用 DIP API 发送消息(流式)
     * 该方法实现了完整的消息发送逻辑,子类无需覆盖
     * @param text 用户输入
     * @param ctx 应用上下文
     * @param conversationID 发送的对话消息所属的会话 ID
     * @param regenerateMessageId 需要重新生成的助手消息 ID（可选，用于重新生成功能）
     * @returns 返回助手消息
     */
    public async sendMessage(text: string, ctx: ApplicationContext, conversationID?: string, regenerateMessageId?: string): Promise<ChatMessage> {
      if (!this.dipBaseUrl) {
        throw new Error('DIP baseUrl 不能为空');
      }

      // 构造上下文信息
      let fullQuery = text;
      if (ctx && ctx.title) {
        fullQuery = `【上下文: ${ctx.title}】\n${JSON.stringify(ctx.data, null, 2)}\n\n${text}`;
      }

      // 构造请求体
      const body: any = {
        agent_id: this.agentInfo.id,
        agent_version: this.dipVersion,
        executor_version: this.dipExecutorVersion,
        query: fullQuery,
        stream: true,
        custom_querys: ctx?.data,
        conversation_id: conversationID || undefined,
        chat_option: {
          is_need_history: true,
          is_need_doc_retrival_post_process: true,
          is_need_progress: true,
          enable_dependency_cache: true,
        },
        inc_stream: true,
      };

      // 如果是重新生成，添加 regenerate_assistant_message_id 参数
      if (regenerateMessageId) {
        body.regenerate_assistant_message_id = regenerateMessageId;
      }

      // 使用 executeDataAgentWithTokenRefresh 包装 API 调用
      const response = await this.executeDataAgentWithTokenRefresh(async () => {
        const res = await fetch(
          `${this.dipBaseUrl}/app/${this.dipKey}/chat/completion`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'text/event-stream',
              Authorization: `Bearer ${this.dipToken}`,
            },
            body: JSON.stringify(body),
          }
        );

        if (!res.ok) {
          const errText = await res.text();
          const error: any = new Error(`DIP API 调用失败: ${res.status} ${errText}`);
          error.status = res.status;
          error.body = errText;
          throw error;
        }

        return res;
      });

      // 如果是重新生成，使用现有的消息 ID；否则创建新的消息 ID
      const assistantMessageId = regenerateMessageId || `assistant-${Date.now()}`;
      const initialAssistantMessage: ChatMessage = {
        messageId: assistantMessageId,
        content: [],
        role: {
          name: 'AI 助手',
          type: RoleType.ASSISTANT,
          avatar: '',
        },
      };

      // 使用 any 类型断言来访问 setState 方法
      if (regenerateMessageId) {
        // 重新生成：更新现有消息
        (this as any).setState((prevState: any) => {
          const messages = prevState.messages.map((msg: ChatMessage) => {
            if (msg.messageId === regenerateMessageId) {
              return initialAssistantMessage;
            }
            return msg;
          });
          return {
            messages,
            streamingMessageId: assistantMessageId,
          };
        });
      } else {
        // 新建消息：添加到消息列表
        (this as any).setState((prevState: any) => ({
          messages: [...prevState.messages, initialAssistantMessage],
          streamingMessageId: assistantMessageId,
        }));
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法获取流式响应');
      }

      // 处理流式响应
      await (this as any).handleStreamResponse(reader, assistantMessageId);

      // 从 state 中获取最终更新后的消息
      // 优先使用 streamingMessageId（可能已被 assistant_message_id 更新），否则使用初始的 assistantMessageId
      const currentStreamingMessageId = (this as any).state.streamingMessageId || assistantMessageId;
      const finalMessage = (this as any).state.messages.find((msg: any) => msg.messageId === currentStreamingMessageId);

      return finalMessage || initialAssistantMessage;
    }

  /**
   * 将 API 接口返回的 EventStream 增量解析成完整的 AssistantMessage 对象
   * 根据设计文档实现白名单机制和 JSONPath 处理
   * 
   * 处理流程（符合文档流程图）：
   * 1. 解析 EventMessage
   * 2. 检查 AssistantMessage 实例是否已经存在
   * 3. 如果不存在且 key 包含 assistant_message，则初始化 AssistantMessage 对象
   * 4. 检查 action 和 JSONPath 是否在白名单中
   * 5. 如果在白名单中，根据 action 处理 content 并执行后处理
   * 6. 处理完成后，检查 AssistantMessage.message.id 并同步更新 ChatMessage.messageId
   *    保证 AssistantMessage.id 和 ChatMessage.messageId 保持一致
   * 
   * @param eventMessage 接收到的一条 Event Message
   * @param prev 上一次增量更新后的 AssistantMessage 对象
   * @param messageId 当前正在更新的消息 ID
   * @returns 返回更新后的 AssistantMessage 对象
   */
  public reduceAssistantMessage<T = any, K = any>(eventMessage: T, prev: K, messageId: string): K {
    try {
      // 解析 EventMessage
      const parsed = typeof eventMessage === 'string' ? JSON.parse(eventMessage) : eventMessage;
      const em = this.parseEventMessage(parsed);

      // 如果 action 是 'end'，直接返回
      if (em.action === 'end') {
        console.log('EventStream 结束');
        return prev;
      }

      // 检查 key 是否包含 assistant_message，如果包含且 AssistantMessage 实例不存在，则初始化
      // 根据文档流程图：如果 key 包含 assistant_message，且 AssistantMessage 实例不存在，则初始化
      const key = em.key || [];
      const hasAssistantMessage = key.some(k => 
        typeof k === 'string' && (k === 'assistant_message' || k.startsWith('assistant_message'))
      );
      
      // 初始化 AssistantMessage 对象（如果不存在）
      let assistantMessage: AssistantMessage;
      if (hasAssistantMessage && (!prev || Object.keys(prev as any).length === 0)) {
        console.log('初始化 AssistantMessage 对象，key:', key);
        assistantMessage = {};
      } else {
        // 克隆 prev 对象以避免直接修改
        assistantMessage = JSON.parse(JSON.stringify(prev || {}));
      }

      // 检查是否在白名单中
      const jsonPath = this.keyToJSONPath(key);
      const whitelistEntry = this.getWhitelistEntry(em.action || '', jsonPath);

      if (!whitelistEntry) {
        // 不在白名单中，跳过处理，但仍需检查并同步更新 messageId
        console.log('跳过非白名单事件:', em.action, jsonPath);
        
        // 即使不在白名单中，也要保证 AssistantMessage.message.id 和 ChatMessage.messageId 保持一致
        // 注意：这里需要先处理 content，因为可能更新了 assistantMessage.message.id
        const processedAssistantMessage = em.action === 'upsert' 
          ? this.applyUpsert(assistantMessage, key, em.content)
          : em.action === 'append'
          ? this.applyAppend(assistantMessage, key, em.content)
          : assistantMessage;
        
        const assistantMessageId = processedAssistantMessage.message?.id;
        if (assistantMessageId && assistantMessageId !== messageId) {
          console.log('同步更新消息 ID（白名单外）:', messageId, '->', assistantMessageId);
          (this as any).setState((prevState: any) => {
            const messages = prevState.messages.map((msg: ChatMessage) => {
              if (msg.messageId === messageId) {
                return {
                  ...msg,
                  messageId: assistantMessageId,
                };
              }
              return msg;
            });
            return {
              messages,
              streamingMessageId: assistantMessageId,
            };
          });
        }
        
        return processedAssistantMessage as K;
      }

      // 根据 action 处理 content
      if (em.action === 'upsert') {
        assistantMessage = this.applyUpsert(assistantMessage, key, em.content);
      } else if (em.action === 'append') {
        assistantMessage = this.applyAppend(assistantMessage, key, em.content);
      }

      // 保证 AssistantMessage.message.id 和 ChatMessage.messageId 保持一致
      // 在处理完 AssistantMessage 后，检查并同步更新 ChatMessage.messageId
      // 优先使用 AssistantMessage.message.id，确保后续 postProcess 使用正确的 messageId
      const assistantMessageId = assistantMessage.message?.id;
      let currentMessageId = messageId;
      
      if (assistantMessageId && assistantMessageId !== messageId) {
        console.log('同步更新消息 ID，保持 AssistantMessage.id 和 ChatMessage.messageId 一致:', messageId, '->', assistantMessageId);
        currentMessageId = assistantMessageId; // 使用新的 messageId
        // 更新 state 中的消息 ID 和 streamingMessageId
        (this as any).setState((prevState: any) => {
          const messages = prevState.messages.map((msg: ChatMessage) => {
            if (msg.messageId === messageId) {
              return {
                ...msg,
                messageId: assistantMessageId,
              };
            }
            return msg;
          });
          return {
            messages,
            streamingMessageId: assistantMessageId,
          };
        });
      }

      // 执行后处理，使用更新后的 messageId（优先使用 AssistantMessage.message.id）
      // 这样可以确保 append*Block 方法能找到正确的消息
      if (whitelistEntry.postProcess) {
        whitelistEntry.postProcess(assistantMessage, em.content, currentMessageId);
      }

      return assistantMessage as K;
    } catch (e) {
      console.error('解析 DIP 事件失败:', e, eventMessage);
      return prev;
    }
  }

  /**
   * 解析原始事件为 EventMessage
   */
  public parseEventMessage(raw: any): EventMessage {
    // 从 SSE data 中提取
    if (raw.data) {
      const dataStr = typeof raw.data === 'string' ? raw.data : JSON.stringify(raw.data);
      try {
        const parsed = JSON.parse(dataStr);
        return {
          seq_id: parsed.seq_id || parsed.seq,
          key: parsed.key,
          action: parsed.action,
          content: parsed.content,
        };
      } catch {
        return raw;
      }
    }

    return {
      seq_id: raw.seq_id || raw.seq,
      key: raw.key,
      action: raw.action,
      content: raw.content,
    };
  }

  /**
   * 将 key 数组转换为 JSONPath 字符串
   * 例如: ["message", "content", "middle_answer", "progress", 0]
   * => "message.content.middle_answer.progress[0]"
   */
  public keyToJSONPath(key: Array<string | number>): string {
    return key.map((k, index) => {
      if (typeof k === 'number') {
        return `[${k}]`;
      }
      return index === 0 ? k : `.${k}`;
    }).join('').replace(/\.\[/g, '[');
  }

  /**
   * 白名单定义
   * 根据设计文档 3.2 Event Message 白名单
   *
   * 注意：postProcess 方法需要调用 appendMarkdownBlock 和 appendWebSearchBlock
   * 这些方法需要在子类中实现
   */
  public getWhitelistEntry(action: string, jsonPath: string): {
    postProcess?: (assistantMessage: AssistantMessage, content: any, messageId: string) => void;
  } | null {
    const entries: {
      [key: string]: {
        postProcess?: (assistantMessage: AssistantMessage, content: any, messageId: string) => void
      }
    } = {
      'upsert:error': {},
      'upsert:message': {},
      // 注意：upsert:assistant_message_id 的处理已移除
      // 现在通过检查 AssistantMessage.message.id 来同步更新 ChatMessage.messageId
      // 这样可以保证 AssistantMessage.id 和 ChatMessage.messageId 保持一致
      'append:message.content.middle_answer.progress': {
        postProcess: (_assistantMessage, content, messageId) => {
          // content 是一个 Progress 对象
          if (content?.stage === 'skill') {
            if(content.skill_info?.args?.some((item: any) => item?.name === 'action' && item?.value === 'show_ds')){
              return;
            }
            // 检查是否是 Web 搜索工具
            if (content.skill_info?.name === 'zhipu_search_tool') {
              // 构造 WebSearchQuery 并调用渲染方法
              const searchQuery = this.extractWebSearchQuery(content);
              if (searchQuery) {
                (this as any).appendWebSearchBlock(messageId, searchQuery);
              }
            }
            console.log('content', content);
            // 检查是否是 Json2Plot 工具
            if (content?.skill_info?.name === 'json2plot') {
              const chartData = this.extractJson2PlotData(content);
              if (chartData) {
                (this as any).appendJson2PlotBlock(messageId, chartData);
              }
            }
            // 检查是否是 search_memory, _date, build_memory 技能
            const skillNameLower = content.skill_info?.name?.toLowerCase();
            if (skillNameLower === 'search_memory' || skillNameLower === '_date' || skillNameLower === 'build_memory') {
              // 这些技能默认不显示调用信息，或者根据需求进行特定处理
              // 如果需要显示，可以添加相应的渲染逻辑
              return;
            }
          } else if (content?.stage === 'llm') {
            // LLM 阶段，输出 answer
            const answer = content.answer || '';
            (this as any).appendMarkdownBlock(messageId, answer);
          }
          this.processMiddleAnswerProgress(content, messageId);
        },
      },
    };

    // 对于数组索引的情况，使用正则匹配
    const progressArrayPattern = /^message\.content\.middle_answer\.progress\[\d+\]$/;
    const progressArrayAnswerPattern = /^message\.content\.middle_answer\.progress\[\d+\]\.answer$/;

    if (action === 'append' && progressArrayPattern.test(jsonPath)) {
      return entries['append:message.content.middle_answer.progress'];
    }

    if (action === 'append' && progressArrayAnswerPattern.test(jsonPath)) {
      return {
        postProcess: (assistantMessage, _content, messageId) => {
          // 提取最后一个 progress 的 answer
          const progress = assistantMessage.message?.content?.middle_answer?.progress || [];
          if (progress.length > 0) {
            const lastProgress = progress[progress.length - 1];
            if (lastProgress.stage === 'llm') {
              const answer = lastProgress.answer || '';
              (this as any).appendMarkdownBlock(messageId, answer);
            }
          }
        },
      };
    }

    const key = `${action}:${jsonPath}`;
    return entries[key] || null;
  }

  /**
   * 从 Progress 对象中提取 Web 搜索查询
   * 根据 OpenAPI 规范，搜索数据在 answer.choices[0].message.tool_calls 中
   * tool_calls[0] 是 SearchIntent（输入），tool_calls[1] 是 SearchResult（输出）
   */
  public extractWebSearchQuery(progress: any): WebSearchQuery | null {
    try {
      // 从 answer.choices[0].message.tool_calls 中提取数据
      const toolCalls = progress?.answer?.choices?.[0]?.message?.tool_calls;

      if (!toolCalls || !Array.isArray(toolCalls) || toolCalls.length < 2) {
        return null;
      }

      // tool_calls[0] 是 SearchIntent（输入）
      const searchIntentObj = toolCalls[0];

      // search_intent 是一个数组，取第一个元素
      const searchIntentArray = searchIntentObj?.search_intent;
      const searchIntent = Array.isArray(searchIntentArray) ? searchIntentArray[0] : searchIntentArray;

      const query = searchIntent?.query || searchIntent?.keywords || '';

      // tool_calls[1] 是 SearchResult（输出）
      const searchResultObj = toolCalls[1];

      const searchResultArray = searchResultObj?.search_result;

      if (!searchResultArray || !Array.isArray(searchResultArray)) {
        return null;
      }

      const results: WebSearchResult[] = searchResultArray.map((item: any) => ({
        content: item.content || '',
        icon: item.icon || '',
        link: item.link || '',
        media: item.media || '',
        title: item.title || '',
      }));

      return {
        input: query,
        results,
      };
    } catch (e) {
      console.error('提取 Web 搜索查询失败:', e);
      return null;
    }
  }

  /**
   * 从 Progress 对象中提取 Json2Plot 图表数据
   * 根据 OpenAPI 规范，Json2Plot 数据在 answer.choices[0].message.tool_calls 中
   * tool_calls 中包含 Json2PlotAnswer，格式为 { result: Json2PlotResult, full_result: Json2PlotFullResult }
   * Json2PlotResult 包含: data_sample, chart_config, title, text
   * Json2PlotFullResult 包含: data, chart_config, title, text
   * ChartConfig 包含: xField, yField, seriesField, chart_type, groupField, isStack, isGroup
   */
  public extractJson2PlotData(progress: any): ChartDataSchema | null {
    try {
      // 从 answer.choices[0].message.tool_calls 中提取数据
      console.log(' Json2Plot progress', progress);
      const toolCalls = progress?.answer?.choices?.[0]?.message?.tool_calls;

      if (!toolCalls || !Array.isArray(toolCalls)) {
        return null;
      }

      // 查找 Json2PlotAnswer（包含 result 或 full_result 的对象）
      let json2PlotAnswer: any = null;
      for (const toolCall of toolCalls) {
        if (toolCall?.result || toolCall?.full_result) {
          json2PlotAnswer = toolCall;
          break;
        }
      }

      if (!json2PlotAnswer) {
        return null;
      }

      // 优先使用 full_result，如果没有则使用 result
      const json2PlotData = json2PlotAnswer.full_result || json2PlotAnswer.result;
      
      if (!json2PlotData) {
        return null;
      }

      const chartConfig = json2PlotData.chart_config;
      if (!chartConfig || !chartConfig.chart_type) {
        return null;
      }

      // 验证 chart_type 是否为有效值
      const validChartTypes = ['Line', 'Column', 'Pie', 'Circle'];
      const chartType = chartConfig.chart_type;
      if (!validChartTypes.includes(chartType)) {
        return null;
      }

      // 获取数据行（优先使用 full_result.data，否则使用 result.data_sample）
      const dataRows = json2PlotData.data || json2PlotData.data_sample || [];
      
      if (!Array.isArray(dataRows) || dataRows.length === 0) {
        return null;
      }

      // 从数据行中推断字段类型
      const firstRow = dataRows[0];
      if (!firstRow || typeof firstRow !== 'object') {
        return null;
      }

      // 构建 dimensions（维度字段）
      const dimensions: Array<{ name: string; displayName: string; dataType: 'string' | 'number' | 'date' | 'boolean' }> = [];
      
      // xField 作为第一个维度
      if (chartConfig.xField && firstRow[chartConfig.xField] !== undefined) {
        const value = firstRow[chartConfig.xField];
        const dataType = this.inferDataType(value);
        dimensions.push({
          name: chartConfig.xField,
          displayName: chartConfig.xField,
          dataType,
        });
      }

      // groupField 作为维度（如果存在）
      if (chartConfig.groupField && 
          chartConfig.groupField !== chartConfig.xField &&
          firstRow[chartConfig.groupField] !== undefined) {
        const value = firstRow[chartConfig.groupField];
        const dataType = this.inferDataType(value);
        dimensions.push({
          name: chartConfig.groupField,
          displayName: chartConfig.groupField,
          dataType,
        });
      }

      // seriesField 作为维度（如果存在且不是xField和groupField）
      // seriesField 通常用于创建多个系列，应该作为维度
      if (chartConfig.seriesField && 
          chartConfig.seriesField !== chartConfig.xField && 
          chartConfig.seriesField !== chartConfig.groupField &&
          firstRow[chartConfig.seriesField] !== undefined) {
        const value = firstRow[chartConfig.seriesField];
        const dataType = this.inferDataType(value);
        dimensions.push({
          name: chartConfig.seriesField,
          displayName: chartConfig.seriesField,
          dataType,
        });
      }

      // 构建 measures（度量字段）
      const measures: Array<{ name: string; displayName: string; dataType: 'number' | 'string'; aggregation?: 'sum' | 'avg' | 'count' | 'max' | 'min' }> = [];
      
      // yField 作为第一个度量
      if (chartConfig.yField && firstRow[chartConfig.yField] !== undefined) {
        measures.push({
          name: chartConfig.yField,
          displayName: chartConfig.yField,
          dataType: 'number',
        });
      }

      // 如果没有找到任何维度或度量，尝试从数据中推断
      if (dimensions.length === 0 || measures.length === 0) {
        // 遍历所有字段，推断类型
        const fieldTypes = new Map<string, 'string' | 'number' | 'date' | 'boolean'>();
        
        for (const [key, value] of Object.entries(firstRow)) {
          if (value !== null && value !== undefined) {
            fieldTypes.set(key, this.inferDataType(value));
          }
        }

        // 如果缺少维度，使用第一个非数值字段
        if (dimensions.length === 0) {
          for (const [key, dataType] of fieldTypes.entries()) {
            if (dataType !== 'number' && !measures.find(m => m.name === key)) {
              dimensions.push({
                name: key,
                displayName: key,
                dataType,
              });
              break;
            }
          }
        }

        // 如果缺少度量，使用第一个数值字段
        if (measures.length === 0) {
          for (const [key, dataType] of fieldTypes.entries()) {
            if (dataType === 'number' && !dimensions.find(d => d.name === key)) {
              measures.push({
                name: key,
                displayName: key,
                dataType: 'number',
              });
              break;
            }
          }
        }
      }

      // 验证是否成功构建了 dimensions 和 measures
      if (dimensions.length === 0 || measures.length === 0) {
        return null;
      }

      // 构造 ChartDataSchema
      const chartData: ChartDataSchema = {
        chartType: chartType as 'Line' | 'Column' | 'Pie' | 'Circle',
        title: json2PlotData.title,
        dimensions,
        measures,
        rows: dataRows,
      };

      return chartData;
    } catch (e) {
      console.error('提取 Json2Plot 数据失败:', e);
      return null;
    }
  }

  /**
   * 推断数据类型
   */
  public inferDataType(value: any): 'string' | 'number' | 'date' | 'boolean' {
    if (typeof value === 'boolean') {
      return 'boolean';
    }
    if (typeof value === 'number') {
      return 'number';
    }
    if (typeof value === 'string') {
      // 尝试解析日期
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return 'date';
      }
      return 'string';
    }
    return 'string';
  }

  /**
   * 处理技能调用的统一方法
   * 根据设计文档 3.2 Event Message 白名单中的后处理逻辑
   * @param skillInfo 技能信息
   * @param answer 技能执行的 answer 字段
   * @param messageId 消息 ID
   */
  public processSkillExecution(skillInfo: SkillInfo | undefined, answer: any, messageId: string): void {
    if (!skillInfo?.name) {
      return;
    }

    const skillName = skillInfo.name;
    const skillNameLower = skillName.toLowerCase();

    // 处理 search_memory, _date, build_memory 技能
    if (skillNameLower === 'search_memory' || skillNameLower === '_date' || skillNameLower === 'build_memory') {
      // 这些技能默认不显示调用信息，或者根据需求进行特定处理
      // 如果需要显示，可以添加相应的渲染逻辑
      return;
    }

    if (skillName === 'zhipu_search_tool') {
      // Web 搜索工具
      const searchQuery = this.extractWebSearchQueryFromAnswer(answer);
      if (searchQuery) {
        (this as any).appendWebSearchBlock(messageId, searchQuery);
      }
    } else if (skillName === 'json2plot') {
      console.log('skillInfo', skillInfo);
      // json2plot 工具：将 skill_info.args 和 answer 解析出 ChartDataSchema 结构并输出到界面
      const chartData = this.extractChartDataFromArgs(skillInfo.args, answer);
      if (chartData) {
        (this as any).appendJson2PlotBlock(messageId, chartData);
      }
    } else if (skillName === 'execute_code') {
      // 代码执行工具：解析代码输入和输出
      const executeCodeResult = this.extractExecuteCodeResult(skillInfo.args, answer);
      if (executeCodeResult) {
        (this as any).appendExecuteCodeBlock(messageId, executeCodeResult);
      }
    } else if (skillName === 'text2sql') {
      // Text2SQL 工具：解析查询输入、SQL 语句和执行结果
      const text2SqlResult = this.extractText2SqlResult(skillInfo.args, answer);
      if (text2SqlResult) {
        (this as any).appendText2SqlBlock(messageId, text2SqlResult);
      }
    } else if (skillName === 'text2metric') {
      // Text2Metric 工具：解析查询输入和指标数据
      const text2MetricResult = this.extractText2MetricResult(skillInfo.args, answer);
      if (text2MetricResult) {
        (this as any).appendText2MetricBlock(messageId, text2MetricResult);
      }
    } else if (skillName === 'af_sailor') {
      // AfSailor 工具：解析找数查询结果
      const afSailorResult = this.extractAfSailorResult(skillInfo.args, answer);
      if (afSailorResult) {
        (this as any).appendAfSailorBlock(messageId, afSailorResult);
      }
    } else if (skillName === 'datasource_filter') {
      // DatasourceFilter 工具：解析数据源过滤结果
      const datasourceFilterResult = this.extractDatasourceFilterResult(skillInfo.args, answer);
      if (datasourceFilterResult) {
        (this as any).appendDatasourceFilterBlock(messageId, datasourceFilterResult);
      }
    } else {
      // 其他技能：输出技能名称
      (this as any).appendMarkdownBlock(messageId, `调用工具: ${skillName}`);
    }
  }


  /**
   * 处理 middle_answer.progress 中的一个元素
   * 根据设计文档 3.2 Event Message 白名单中的后处理逻辑
   * @param content Progress 对象
   * @param messageId 消息 ID
   */
  public processMiddleAnswerProgress(content: Progress, messageId: string): void {
    if (content?.stage === 'skill') {
      this.processSkillExecution(content.skill_info, content.answer, messageId);
    } else if (content?.stage === 'llm') {
      // LLM 阶段，输出 answer
      const answer = content.answer || '';
      (this as any).appendMarkdownBlock(messageId, answer);
    }
  }

  /**
   * 从 answer.choices 中提取 Web 搜索查询
   * 用于处理 middle_answer.progress 中的搜索结果
   */
  public extractWebSearchQueryFromAnswer(answer: any): WebSearchQuery | null {
    try {
      const toolCalls = answer?.choices?.[0]?.message?.tool_calls;

      if (!toolCalls || !Array.isArray(toolCalls) || toolCalls.length < 2) {
        return null;
      }

      // tool_calls[0] 是 SearchIntent（输入）
      const searchIntentObj = toolCalls[0];
      const searchIntentArray = searchIntentObj?.search_intent;
      const searchIntent = Array.isArray(searchIntentArray) ? searchIntentArray[0] : searchIntentArray;
      const query = searchIntent?.query || searchIntent?.keywords || '';

      // tool_calls[1] 是 SearchResult（输出）
      const searchResultObj = toolCalls[1];
      const searchResultArray = searchResultObj?.search_result;

      if (!searchResultArray || !Array.isArray(searchResultArray)) {
        return null;
      }

      const results: WebSearchResult[] = searchResultArray.map((item: any) => ({
        content: item.content || '',
        icon: item.icon || '',
        link: item.link || '',
        media: item.media || '',
        title: item.title || '',
      }));

      return {
        input: query,
        results,
      };
    } catch (e) {
      console.error('提取 Web 搜索查询失败:', e);
      return null;
    }
  }

  /**
   * 从 skill_info.args 和 answer 中提取图表数据并转换为 ChartDataSchema
   * 用于处理 json2plot 工具的输出
   * @param args 技能参数数组（保留用于 API 一致性，实际数据从 answer 中提取）
   * @param answer 技能执行的 answer 字段，包含 result 或 full_result
   * @returns ChartDataSchema 对象，如果解析失败则返回 null
   */
  public extractChartDataFromArgs(
    _args: Array<{name?: string; type?: string; value?: string}> | undefined,
    answer: any
  ): ChartDataSchema | null {
    try {
      // 从 answer 中提取数据（优先使用 full_result，否则使用 result）
      const json2PlotData = answer?.full_result || answer?.result;
      if (!json2PlotData) {
        return null;
      }

      const chartConfig = json2PlotData.chart_config;
      if (!chartConfig || !chartConfig.chart_type) {
        return null;
      }

      // 验证 chart_type 是否为有效值
      const validChartTypes = ['Line', 'Column', 'Pie', 'Circle'];
      const chartType = chartConfig.chart_type;
      if (!validChartTypes.includes(chartType)) {
        return null;
      }

      // 获取数据行（优先使用 full_result.data，否则使用 result.data_sample）
      const dataRows = json2PlotData.data || json2PlotData.data_sample || [];
      
      if (!Array.isArray(dataRows) || dataRows.length === 0) {
        return null;
      }

      // 从数据行中推断字段类型
      const firstRow = dataRows[0];
      if (!firstRow || typeof firstRow !== 'object') {
        return null;
      }

      // 构建 dimensions（维度字段）
      const dimensions: Array<{ name: string; displayName: string; dataType: 'string' | 'number' | 'date' | 'boolean' }> = [];
      
      // xField 作为第一个维度
      if (chartConfig.xField && firstRow[chartConfig.xField] !== undefined) {
        const value = firstRow[chartConfig.xField];
        const dataType = this.inferDataType(value);
        dimensions.push({
          name: chartConfig.xField,
          displayName: chartConfig.xField,
          dataType,
        });
      }

      // groupField 作为维度（如果存在）
      if (chartConfig.groupField && 
          chartConfig.groupField !== chartConfig.xField &&
          firstRow[chartConfig.groupField] !== undefined) {
        const value = firstRow[chartConfig.groupField];
        const dataType = this.inferDataType(value);
        dimensions.push({
          name: chartConfig.groupField,
          displayName: chartConfig.groupField,
          dataType,
        });
      }

      // seriesField 作为维度（如果存在且不是xField和groupField）
      if (chartConfig.seriesField && 
          chartConfig.seriesField !== chartConfig.xField && 
          chartConfig.seriesField !== chartConfig.groupField &&
          firstRow[chartConfig.seriesField] !== undefined) {
        const value = firstRow[chartConfig.seriesField];
        const dataType = this.inferDataType(value);
        dimensions.push({
          name: chartConfig.seriesField,
          displayName: chartConfig.seriesField,
          dataType,
        });
      }

      // 构建 measures（度量字段）
      const measures: Array<{ name: string; displayName: string; dataType: 'number' | 'string'; aggregation?: 'sum' | 'avg' | 'count' | 'max' | 'min' }> = [];
      
      // yField 作为第一个度量
      if (chartConfig.yField && firstRow[chartConfig.yField] !== undefined) {
        measures.push({
          name: chartConfig.yField,
          displayName: chartConfig.yField,
          dataType: 'number',
        });
      }

      // 如果没有找到任何维度或度量，尝试从数据中推断
      if (dimensions.length === 0 || measures.length === 0) {
        // 遍历所有字段，推断类型
        const fieldTypes = new Map<string, 'string' | 'number' | 'date' | 'boolean'>();
        
        for (const [key, value] of Object.entries(firstRow)) {
          if (value !== null && value !== undefined) {
            fieldTypes.set(key, this.inferDataType(value));
          }
        }

        // 如果缺少维度，使用第一个非数值字段
        if (dimensions.length === 0) {
          for (const [key, dataType] of fieldTypes.entries()) {
            if (dataType !== 'number' && !measures.find(m => m.name === key)) {
              dimensions.push({
                name: key,
                displayName: key,
                dataType,
              });
              break;
            }
          }
        }

        // 如果缺少度量，使用第一个数值字段
        if (measures.length === 0) {
          for (const [key, dataType] of fieldTypes.entries()) {
            if (dataType === 'number' && !dimensions.find(d => d.name === key)) {
              measures.push({
                name: key,
                displayName: key,
                dataType: 'number',
              });
              break;
            }
          }
        }
      }

      // 验证是否成功构建了 dimensions 和 measures
      if (dimensions.length === 0 || measures.length === 0) {
        return null;
      }

      // 构造 ChartDataSchema
      const chartData: ChartDataSchema = {
        chartType: chartType as 'Line' | 'Column' | 'Pie' | 'Circle',
        title: json2PlotData.title,
        dimensions,
        measures,
        rows: dataRows,
      };

      return chartData;
    } catch (e) {
      console.error('提取图表数据失败:', e);
      return null;
    }
  }

  /**
   * 从 skill_info.args 和 answer 中提取代码执行结果
   * 用于处理 execute_code 工具的输入和输出
   * @param args skill_info.args 数组，包含执行的代码
   * @param answer 技能执行的 answer 字段，包含执行结果
   * @returns ExecuteCodeResult 对象，包含 input 和 output
   */
  public extractExecuteCodeResult(
    args: Array<{name?: string; type?: string; value?: string}> | undefined,
    answer: any
  ): { input: string; output: string } | null {
    try {
      // 从 args 中提取代码输入
      let codeInput = '';
      if (args && Array.isArray(args)) {
        // 查找 name 为 'code' 或 'script' 的参数
        const codeArg = args.find(arg =>
          arg.name === 'code' || arg.name === 'script' || arg.type === 'str'
        );
        codeInput = codeArg?.value || '';
      }

      // 从 answer.result.result.stdout 中提取输出
      const codeOutput = answer?.result?.result?.stdout || '执行完成';

      // 如果没有输入代码，返回 null
      if (!codeInput) {
        return null;
      }

      return {
        input: codeInput,
        output: codeOutput,
      };
    } catch (e) {
      console.error('提取代码执行结果失败:', e);
      return null;
    }
  }

  /**
   * 从 skill_info.args 和 answer 中提取 Text2SQL 结果
   * 用于处理 text2sql 工具的输入和输出
   * 根据 OpenAPI 规范，Text2SqlResult 包含 result 和 full_result
   * - result: Text2SqlResultData（包含 data_desc，但可能只有数据样本）
   * - full_result: Text2SqlFullResultData（包含完整数据，但没有 data_desc）
   * 优先使用 full_result，如果没有则使用 result
   * @param args skill_info.args 数组，包含查询文本
   * @param answer 技能执行的 answer 字段，包含 SQL 执行结果
   * @returns Text2SqlResult 对象，包含 input、sql、data 等信息
   */
  public extractText2SqlResult(
    args: Array<{name?: string; type?: string; value?: string}> | undefined,
    answer: any
  ): { input: string; sql: string; data?: Array<Record<string, any>>; cites?: Array<{id: string; name: string; type: string; description?: string}>; title?: string; message?: string; dataDesc?: {return_records_num?: number; real_records_num?: number}; explanation?: any} | null {
    try {
      // 从 args 中提取查询输入
      let queryInput = '';
      if (args && Array.isArray(args)) {
        // 查找 name 为 'input' 的参数
        const inputArg = args.find(arg => arg.name === 'input');
        queryInput = inputArg?.value || '';
      }

      // 优先使用 full_result，如果没有则使用 result
      // 根据 schema: Text2SqlResult { result: Text2SqlResultData, full_result: Text2SqlFullResultData }
      const fullResult = answer?.full_result;
      const result = answer?.result;
      
      // 如果两者都不存在，返回 null
      if (!fullResult && !result) {
        return null;
      }

      // 优先使用 full_result，如果没有则使用 result
      const text2SqlData = fullResult || result;

      // 从数据中提取字段
      const sql = text2SqlData?.sql || '';
      const data = text2SqlData?.data || [];
      const cites = text2SqlData?.cites || [];
      const title = text2SqlData?.title || '';
      const message = text2SqlData?.message || '';
      const explanation = text2SqlData?.explanation;
      
      // data_desc 只在 result 中存在，不在 full_result 中
      const dataDesc = result?.data_desc;

      // 如果没有输入查询，返回 null
      if (!queryInput) {
        return null;
      }

      return {
        input: queryInput,
        sql,
        data: Array.isArray(data) ? data : [],
        cites: Array.isArray(cites) ? cites.map((cite: any) => ({
          id: cite.id || '',
          name: cite.name || '',
          type: cite.type || '',
          description: cite.description,
        })) : [],
        title,
        message,
        dataDesc: dataDesc ? {
          return_records_num: dataDesc.return_records_num,
          real_records_num: dataDesc.real_records_num,
        } : undefined,
        explanation,
      };
    } catch (e) {
      console.error('提取 Text2SQL 结果失败:', e);
      return null;
    }
  }

  /**
   * 从 skill_info.args 和 answer 中提取 Text2Metric 结果
   * 用于处理 text2metric 工具的输入和输出
   * 根据 OpenAPI 规范，Text2MetricResult 包含 result 和 full_result
   * - result: Text2MetricResultData（包含 data_desc，但可能只有数据样本）
   * - full_result: Text2MetricFullResultData（包含完整数据，但没有 data_desc）
   * 优先使用 full_result，如果没有则使用 result
   * @param args skill_info.args 数组，包含查询参数
   * @param answer 技能执行的 answer 字段，包含指标查询结果
   * @returns Text2MetricResult 对象，包含 title、args、data 等信息
   */
  public extractText2MetricResult(
    args: Array<{name?: string; type?: string; value?: string}> | undefined,
    answer: any
  ): { title: string; args: any; data?: Array<Record<string, any>> } | null {
    try {
      // 优先使用 full_result，如果没有则使用 result
      // 根据 schema: Text2MetricResult { result: Text2MetricResultData, full_result: Text2MetricFullResultData }
      const fullResult = answer?.full_result;
      const result = answer?.result;
      
      // 如果两者都不存在，返回 null
      if (!fullResult && !result) {
        return null;
      }

      // 优先使用 full_result，如果没有则使用 result
      const text2MetricData = fullResult || result;

      // 从数据中提取字段
      const title = text2MetricData?.title || '';
      const data = text2MetricData?.data || [];

      // 如果没有标题，返回 null
      if (!title) {
        return null;
      }

      return {
        title,
        args: args || [],
        data: Array.isArray(data) ? data : [],
      };
    } catch (e) {
      console.error('提取 Text2Metric 结果失败:', e);
      return null;
    }
  }

  /**
   * 从 skill_info.args 和 answer 中提取 AfSailor 结果
   * 用于处理 af_sailor 工具的输入和输出
   * 根据 OpenAPI 规范，AfSailorResult 包含 result
   * - result: AfSailorResultData（包含 text、cites、result_cache_key）
   * 根据 ChatKit.pdf，AfSailorResult 包含 data（Array<Record<string, string>>）
   * @param _args skill_info.args 数组，包含查询参数（当前未使用，保留以保持接口一致性）
   * @param answer 技能执行的 answer 字段，包含找数查询结果
   * @returns AfSailorResult 对象，包含 data、text、cites 等信息
   */
  public extractAfSailorResult(
    _args: Array<{name?: string; type?: string; value?: string}> | undefined,
    answer: any
  ): { data: Array<Record<string, string>>; text?: string[]; cites?: any[]; result_cache_key?: string } | null {
    try {
      // 根据 schema: AfSailorResult { result: AfSailorResultData }
      const result = answer?.result;
      
      // 如果 result 不存在，返回 null
      if (!result) {
        return null;
      }

      // 从数据中提取字段
      const text = result?.text || [];
      const cites = result?.cites || [];
      const result_cache_key = result?.result_cache_key;

      // 将 text 数组转换为 data 数组（Array<Record<string, string>>）
      // 如果 text 是字符串数组，将其转换为对象数组
      let data: Array<Record<string, string>> = [];
      if (Array.isArray(text) && text.length > 0) {
        // 如果 text 是字符串数组，将其转换为对象数组
        // 每个字符串作为一个对象的 value
        data = text.map((item, index) => {
          if (typeof item === 'string') {
            return { value: item, index: String(index) };
          }
          return item as Record<string, string>;
        });
      }

      // 如果没有数据，返回 null
      if (data.length === 0 && (!text || text.length === 0)) {
        return null;
      }

      return {
        data,
        text: Array.isArray(text) ? text : [],
        cites: Array.isArray(cites) ? cites : [],
        result_cache_key,
      };
    } catch (e) {
      console.error('提取 AfSailor 结果失败:', e);
      return null;
    }
  }

  /**
   * 从 skill_info.args 和 answer 中提取 DatasourceFilter 结果
   * 用于处理 datasource_filter 工具的输入和输出
   * 根据 OpenAPI 规范，DatasourceFilterResult 包含 result
   * - result: DatasourceFilterResultData（包含 result、result_cache_key）
   * - result.result: DataCatalogMatch[]（数据目录匹配结果列表）
   * @param _args skill_info.args 数组，包含查询参数（当前未使用，保留以保持接口一致性）
   * @param answer 技能执行的 answer 字段，包含数据源过滤结果
   * @returns DatasourceFilterResult 对象，包含 result、result_cache_key 等信息
   */
  public extractDatasourceFilterResult(
    _args: Array<{name?: string; type?: string; value?: string}> | undefined,
    answer: any
  ): { result: Array<any>; result_cache_key?: string } | null {
    try {
      // 根据 schema: DatasourceFilterResult { result: DatasourceFilterResultData }
      const resultData = answer?.result;
      
      // 如果 result 不存在，返回 null
      if (!resultData) {
        return null;
      }

      // 从数据中提取字段
      const result = resultData?.result || [];
      const result_cache_key = resultData?.result_cache_key;

      // 如果没有匹配结果，返回 null
      if (!Array.isArray(result) || result.length === 0) {
        return null;
      }

      return {
        result: result,
        result_cache_key,
      };
    } catch (e) {
      console.error('提取 DatasourceFilter 结果失败:', e);
      return null;
    }
  }

  /**
   * 将技能调用或 LLM 回答的内容追加到消息中
   * 用于历史消息解析，根据 stage 和 skill_info 将内容添加到 ChatMessage.content 数组
   * @param item Progress 或 OtherTypeAnswer 对象
   * @param message ChatMessage 对象
   */
  public appendSkillOrLLMContentToMessage(
    item: Progress | OtherTypeAnswer,
    message: ChatMessage
  ): void {
    if (item.stage === 'skill') {
      // 处理技能调用
      const skillName = item.skill_info?.name;
      const skillNameLower = skillName?.toLowerCase();

      if(item.skill_info?.args?.some((item: any) => item?.name === 'action' && item?.value === 'show_ds')){
        return;
      }

      // 处理 search_memory, _date, build_memory 技能
      if (skillNameLower === 'search_memory' || skillNameLower === '_date' || skillNameLower === 'build_memory') {
        // 这些技能默认不显示调用信息，或者根据需求进行特定处理
        // 如果需要显示，可以添加相应的渲染逻辑
        return;
      }

      if (skillName === 'zhipu_search_tool') {
        // Web 搜索
        const searchQuery = this.extractWebSearchQueryFromAnswer(item.answer);
        if (searchQuery) {
          message.content.push({
            type: BlockType.WEB_SEARCH,
            content: searchQuery,
          });
        }
      } else if (skillName === 'json2plot') {
        // json2plot 工具
        const chartData = this.extractChartDataFromArgs(item.skill_info?.args, item.answer);
        if (chartData) {
          // 将图表数据添加到消息内容中
          message.content.push({
            type: BlockType.JSON2PLOT,
            content: chartData,
          });
        }
      } else if (skillName === 'execute_code') {
        // 代码执行工具
        const executeCodeResult = this.extractExecuteCodeResult(item.skill_info?.args, item.answer);
        if (executeCodeResult) {
          message.content.push({
            type: BlockType.TOOL,
            content: {
              name: 'execute_code',
              title: '代码执行',
              input: executeCodeResult.input,
              output: executeCodeResult.output,
              icon: <Text2SqlIcon />,
            },
          });
        }
      } else if (skillName === 'text2sql') {
        // Text2SQL 工具
        const text2SqlResult = this.extractText2SqlResult(item.skill_info?.args, item.answer);
        if (text2SqlResult) {
          message.content.push({
            type: BlockType.TOOL,
            content: {
              name: 'text2sql',
              title: text2SqlResult.title || 'Text2SQL',
              input: text2SqlResult.sql,
              icon: <Text2SqlIcon />,
              output: {
              
                data: text2SqlResult.data,
                // cites: text2SqlResult.cites,
                // title: text2SqlResult.title,
                // message: text2SqlResult.message,
                // dataDesc: text2SqlResult.dataDesc,
                // explanation: text2SqlResult.explanation,
              },
            },
          });
        }
      } else if (skillName === 'text2metric') {
        // Text2Metric 工具
        const text2MetricResult = this.extractText2MetricResult(item.skill_info?.args, item.answer);
        if (text2MetricResult) {
          message.content.push({
            type: BlockType.TOOL,
            content: {
              name: 'text2metric',
              title: text2MetricResult.title || 'Text2Metric',
              input: text2MetricResult.args,
              icon: <Text2MetricIcon />,
              output: {
                data: text2MetricResult.data,
              },
            },
          });
        }
      } else if (skillName === 'af_sailor') {
        // AfSailor 工具
        const afSailorResult = this.extractAfSailorResult(item.skill_info?.args, item.answer);
        if (afSailorResult) {
          message.content.push({
            type: BlockType.TOOL,
            content: {
              name: 'af_sailor',
              title: `找到${afSailorResult?.cites?.length || 0}条数据`,
              input: afSailorResult.text || [],
              icon: <AfSailorIcon />,
              output: {
                data: afSailorResult.cites,
              },
            },
          });
        }
      } else if (skillName === 'datasource_filter') {
        // DatasourceFilter 工具
        const datasourceFilterResult = this.extractDatasourceFilterResult(item.skill_info?.args, item.answer);
        if (datasourceFilterResult) {
          message.content.push({
            type: BlockType.TOOL,
            content: {
              name: 'datasource_filter',
              title: `匹配到${datasourceFilterResult?.result?.length || 0}个数据`,
              input: [],
              icon: <AfSailorIcon />,
              output: {
                data: datasourceFilterResult.result,
              },
            },
          });
        }
      } else {
        // 其他技能，显示技能名称
        message.content.push({
          type: BlockType.TEXT,
          content: `调用工具: ${skillName}`,
        });
      }
    } else if (item.stage === 'llm') {
      // LLM 回答
      if (item.answer) {
        message.content.push({
          type: BlockType.MARKDOWN,
          content: item.answer,
        });
      }
    }
  }

  /**
   * 执行 upsert 操作
   * 将 content 赋值到 JSONPath 指定的位置
   */
  public applyUpsert(obj: AssistantMessage, key: Array<string | number>, content: any): AssistantMessage {
    if (key.length === 0) return obj;

    // 使用递归方式设置嵌套属性
    const cloned = { ...obj };
    this.setNestedProperty(cloned, key, content);
    return cloned;
  }

  /**
   * 执行 append 操作
   * 如果 JSONPath 是数组下标，在该位置插入新对象
   * 否则在文本后追加内容
   */
  public applyAppend(obj: AssistantMessage, key: Array<string | number>, content: any): AssistantMessage {
    if (key.length === 0) return obj;

    const cloned = { ...obj };
    const lastKey = key[key.length - 1];

    if (typeof lastKey === 'number') {
      // 数组追加：在指定索引位置插入
      const parentKey = key.slice(0, -1);
      const parent = this.getNestedProperty(cloned, parentKey) as any[];

      if (Array.isArray(parent)) {
        parent[lastKey] = content;
      }
    } else {
      // 文本追加：在现有内容后追加
      const currentValue = this.getNestedProperty(cloned, key);

      if (typeof currentValue === 'string' && typeof content === 'string') {
        this.setNestedProperty(cloned, key, currentValue + content);
      } else {
        this.setNestedProperty(cloned, key, content);
      }
    }

    return cloned;
  }

  /**
   * 获取嵌套属性
   */
  public getNestedProperty(obj: any, key: Array<string | number>): any {
    let current = obj;
    for (const k of key) {
      if (current == null) return undefined;
      current = current[k];
    }
    return current;
  }

  /**
   * 设置嵌套属性
   */
  public setNestedProperty(obj: any, key: Array<string | number>, value: any): void {
    if (key.length === 0) return;

    let current = obj;
    for (let i = 0; i < key.length - 1; i++) {
      const k = key[i];
      const nextKey = key[i + 1];

      if (current[k] == null) {
        // 根据下一个 key 的类型决定创建对象还是数组
        current[k] = typeof nextKey === 'number' ? [] : {};
      }
      current = current[k];
    }

    const lastKey = key[key.length - 1];
    current[lastKey] = value;
  }

  /**
   * 检查是否需要刷新 token
   * AISHU DIP 平台返回 401 状态码时表示 token 失效
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
     * 调用 DIP 的 /app/{agent_key}/chat/termination 接口终止指定会话
     * @param conversationId 要终止的会话 ID
     * @returns 返回 Promise，成功时 resolve，失败时 reject
     */
    public async terminateConversation(conversationId: string): Promise<void> {
      const url = `${this.dipBaseUrl}/app/${this.dipKey}/chat/termination`;

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      // 添加 Authorization header
      if (this.dipToken) {
        headers['Authorization'] = this.dipToken.startsWith('Bearer ') ? this.dipToken : `Bearer ${this.dipToken}`;
      }

      const body = JSON.stringify({
        conversation_id: conversationId,
      });

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`终止会话失败: ${response.status} ${errorText}`);
      }
    }

    /**
     * 执行 API 调用，并在需要时自动刷新 token 并重试一次
     * @param apiCall API 调用函数
     * @returns API 调用结果
     */
    public async executeDataAgentWithTokenRefresh<T>(
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

        if (needsRefresh && this.dipRefreshToken) {
          console.log('检测到 DIP token 失效，正在刷新 token...');

          try {
            // 调用 refreshToken 方法获取新 token
            const newToken = await this.dipRefreshToken();

            // 更新 token 属性
            this.dipToken = newToken;

            console.log('DIP Token 刷新成功，正在重试请求...');

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
            console.error('刷新 DIP token 失败:', refreshError);
            // 刷新失败，抛出原始错误
            throw error;
          }
        }

        // 不需要刷新 token，直接抛出错误
        throw error;
      }
    }

    /**
     * 获取历史会话列表
     * 调用 DIP 的 GET /app/{agent_key}/conversation 接口获取会话列表
     * API 端点: GET /app/{agent_key}/conversation?page={page}&size={size}
     * 注意：该方法是一个无状态无副作用的函数，不允许修改 state
     * @param page 分页页码，默认为 1
     * @param size 每页返回条数，默认为 10
     * @returns 返回历史会话列表
     */
    public async getConversations(page: number = 1, size: number = 10): Promise<ConversationHistory[]> {
      try {
        console.log('正在获取历史会话列表...');

        // 构造 URL，包含分页参数
        const url = `${this.dipBaseUrl}/app/${this.dipKey}/conversation?page=${page}&size=${size}`;

        // 使用 executeDataAgentWithTokenRefresh 包装 API 调用，支持 token 刷新和重试
        const result = await this.executeDataAgentWithTokenRefresh(async () => {
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${this.dipToken}`,
            },
          });

          if (!response.ok) {
            const errorText = await response.text();
            const error: any = new Error(`获取历史会话列表失败: ${response.status} - ${errorText}`);
            error.status = response.status;
            error.body = errorText;
            throw error;
          }

          return await response.json();
        });

        // 从响应中提取会话列表
        const entries = result.data?.entries || result.entries || [];

        // 将 API 响应转换为 ConversationHistory 格式
        const conversations: ConversationHistory[] = entries.map((item: any) => ({
          conversationID: item.id || '',
          title: item.title || '未命名会话',
          created_at: item.create_time || 0,
          updated_at: item.update_time || 0,
          message_index: item.message_index,
          read_message_index: item.read_message_index,
        }));

        console.log(`成功获取 ${conversations.length} 条历史会话`);
        return conversations;
      } catch (error) {
        console.error('获取历史会话列表失败:', error);
        // 返回空数组，允许在失败的情况下继续
        return [];
      }
    }

    /**
     * 获取指定会话 ID 的对话消息列表
     * 调用 DIP 的 GET /app/{agent_key}/conversation/{conversation_id} 接口获取会话详情
     * 如果对话消息是 AI 助手消息，则需要调用 reduceAssistantMessage() 解析消息
     * API 端点: GET /app/{agent_key}/conversation/{conversation_id}
     * 注意：该方法是一个无状态无副作用的函数，不允许修改 state
     * @param conversationId 会话 ID
     * @returns 返回对话消息列表
     */
    public async getConversationMessages(conversationId: string): Promise<ChatMessage[]> {
      try {
        console.log('正在获取会话消息列表，conversationId:', conversationId);

        // 构造 URL
        const url = `${this.dipBaseUrl}/app/${this.dipKey}/conversation/${conversationId}`;

        // 使用 executeDataAgentWithTokenRefresh 包装 API 调用，支持 token 刷新和重试
        const result = await this.executeDataAgentWithTokenRefresh(async () => {
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${this.dipToken}`,
            },
          });

          if (!response.ok) {
            const errorText = await response.text();
            const error: any = new Error(`获取会话消息列表失败: ${response.status} - ${errorText}`);
            error.status = response.status;
            error.body = errorText;
            throw error;
          }

          return await response.json();
        });

        // 从响应中提取消息列表
        const messages = result.data?.Messages || result.Messages || [];

        // 将 API 响应转换为 ChatMessage 格式
        const chatMessages: ChatMessage[] = [];

        for (const msg of messages) {
          const messageId = msg.id || `msg-${Date.now()}-${Math.random()}`;
          const origin = msg.origin || 'user';

          if (origin === 'user') {
            // 用户消息
            const userMessage: ChatMessage = {
              messageId,
              role: {
                name: '用户',
                type: RoleType.USER,
                avatar: '',
              },
              content: [],
            };

            // 从 content 中提取文本
            try {
              const contentObj = typeof msg.content === 'string' ? JSON.parse(msg.content) : msg.content;
              const text = contentObj?.text || '';
              if (text) {
                userMessage.content.push({
                  type: BlockType.TEXT,
                  content: text,
                });
              }
            } catch (e) {
              console.error('解析用户消息内容失败:', e);
            }

            chatMessages.push(userMessage);
          } else if (origin === 'assistant') {
            // AI 助手消息
            // 根据文档第四节"解析历史对话消息"的流程处理
            try {
              // 1. 对 content 进行 JSON 反序列化
              const contentObj = typeof msg.content === 'string' ? JSON.parse(msg.content) : msg.content;

              const aiMessage: ChatMessage = {
                messageId,
                role: {
                  name: 'AI 助手',
                  type: RoleType.ASSISTANT,
                  avatar: '',
                },
                content: [],
              };

              // 2. 处理 middle_answer.progress 数组
              const middleAnswer = contentObj?.middle_answer;
              if (middleAnswer?.progress && Array.isArray(middleAnswer.progress)) {
                for (const progressItem of middleAnswer.progress) {
                  this.appendSkillOrLLMContentToMessage(progressItem, aiMessage);
                }
              }

              chatMessages.push(aiMessage);
            } catch (e) {
              console.error('解析 AI 助手消息失败:', e);
            }
          }
        }

        console.log(`成功获取 ${chatMessages.length} 条对话消息`);
        return chatMessages;
      } catch (error) {
        console.error('获取会话消息列表失败:', error);
        // 返回空数组，允许在失败的情况下继续
        return [];
      }
    }

    /**
     * 删除指定 ID 的会话
     * 调用 DIP 的 DELETE /app/{agent_key}/conversation/{conversation_id} 接口删除会话
     * API 端点: DELETE /app/{agent_key}/conversation/{conversation_id}
     * 注意：该方法是一个无状态无副作用的函数，不允许修改 state
     * @param conversationID 会话 ID
     * @returns 返回 Promise，成功时 resolve，失败时 reject
     */
    public async deleteConversation(conversationID: string): Promise<void> {
      try {
        console.log('正在删除会话，conversationID:', conversationID);

        // 构造 URL
        const url = `${this.dipBaseUrl}/app/${this.dipKey}/conversation/${conversationID}`;

        // 使用 executeDataAgentWithTokenRefresh 包装 API 调用，支持 token 刷新和重试
        await this.executeDataAgentWithTokenRefresh(async () => {
          const response = await fetch(url, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${this.dipToken}`,
            },
          });

          // 204 No Content 表示删除成功
          if (!response.ok && response.status !== 204) {
            const errorText = await response.text();
            const error: any = new Error(`删除会话失败: ${response.status} - ${errorText}`);
            error.status = response.status;
            error.body = errorText;
            throw error;
          }

          return response;
        });

        console.log('会话删除成功');
      } catch (error) {
        console.error('删除会话失败:', error);
        throw error;
      }
    }
  };
}
