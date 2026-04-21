import { Component } from 'react';
import { ChatMessage, RoleType, ApplicationContext, ChatKitInterface, EventStreamMessage, OnboardingInfo, WebSearchQuery, ExecuteCodeResult, Text2SqlResult, Text2MetricResult, AfSailorResult, DatasourceFilterResult, DatasourceRerankResult, BlockType, MarkdownBlock, WebSearchBlock, ToolBlock, ChartDataSchema, Json2PlotBlock, DefaultToolResult, MessageContext, WebProcessorDataSchema, WebProcessorBlock } from '../../types';
import { Text2SqlIcon, Text2MetricIcon, AfSailorIcon } from '../icons';

/**
 * ChatKitBase 组件的属性接�?
 */
export interface ChatKitBaseProps {
  /** 会话 ID，每次新建会话时由后端返回新的会话唯一标识 */
  conversationID?: string;

  /** 当没有指定的 inputContext 时的默认输入上下�?*/
  defaultApplicationContext?: ApplicationContext;

  /** 组件标题 */
  title?: string;

  /** 是否显示组件 */
  visible?: boolean;

  /** 关闭组件的回调函�?*/
  onClose?: () => void;

  /** 调用接口时携带的令牌，放置到请求头：Authorization:Bearer {token} */
  token?: string;

  /** 刷新 token 的方法，由集成方传入 */
  refreshToken?: () => Promise<string>;

  /**
   * 初始用户问题�?
   *
   * - 外层在挂�?Assistant / Copilot 等组件时传入
   * - 当组件首次可见且当前没有任何消息时，会自动发送该问题并触发问�?
   */
  initialQuestion?: string;
}

/**
 * ChatKitBase 组件的状态接�?
 */
export interface ChatKitBaseState {
  /** 会话 ID，每次新建会话时由后端返回新的会话唯一标识 */
  conversationID: string;

  /** 消息列表，这里仅记录渲染到界面上的对话消�?*/
  messages: ChatMessage[];

  /** 用户输入的文�?*/
  textInput: string;

  /** 和用户输入文本相关的上下�?*/
  applicationContext?: ApplicationContext;

  /** 是否正在发送消�?*/
  isSending: boolean;

  /** 当前正在流式更新的消�?ID */
  streamingMessageId: string | null;

  /** 开场白信息，包含开场白文案和预置问�?*/
  onboardingInfo?: OnboardingInfo;

  /** 是否正在加载开场白信息 */
  isLoadingOnboarding: boolean;

  /** ???????? */
  pendingAttachments: ChatKitPendingAttachment[];
}

export interface ChatKitPendingAttachment {
  type: 'input_file';
  source: {
    type: 'path';
    path: string;
  };
  name?: string;
}

/**
 * ChatKitBase 基础组件
 * AI 对话组件的核心类。该类是一�?React 组件，包含标准的交互界面和交互逻辑�?
 *
 * 注意：开发者不能够直接挂载 ChatKitBase �?Web 应用，而是需要创建一个子类继�?
 * ChatKitBase �?ChatKitInterface，并实现 ChatKitInterface 中定义的方法�?
 *
 * 该类实现�?ChatKitInterface 接口，子类需要实�?sendMessage �?reduceEventStreamMessage 方法
 */
export abstract class ChatKitBase<P extends ChatKitBaseProps = ChatKitBaseProps> extends Component<P, ChatKitBaseState> implements ChatKitInterface {
  /**
   * 标记是否正在初始化或已经初始�?
   * 用于防止重复初始化（特别是在 React.StrictMode 下）
   */
  private isInitializing = false;
  private hasInitialized = false;

  /**
   * 会话代数：用于区分「旧会话的流式更新」和「新会话�?
   * 每次清空/新建会话时自增，流式处理只在代数未变化时才继续写�?state
   */
  private conversationSeq = 0;

  /**
   * 当前流式请求�?AbortController
   * 子类在发起流�?fetch 时应设置该字段，便于�?handleStop / 新建会话时主动中断连�?
   */
  protected currentStreamController?: AbortController;

  /**
   * 是否已经根据 initialQuestion 触发过一次自动发�?
   */
  private hasSentInitialQuestion = false;

  /**
   * 流式响应时是否处于「按 chunk 批处理」中，避免同一 chunk 内多行事件触发多�?setState 导致 Maximum update depth exceeded
   */
  private _streamingBatch = false;
  private _pendingStreamingUpdates: Array<(prev: ChatKitBaseState) => Partial<ChatKitBaseState>> = [];

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

    // 初始�?token �?refreshToken
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
      pendingAttachments: [],
    };
  }

  /**
   * 组件挂载后自动创建会�?
   * 根据设计文档要求：组件被初始化的时候会自动新建会话
   */
  async componentDidMount(): Promise<void> {
    // 只在组件初次挂载且可见时自动创建会话
    if (this.props.visible && !this.hasInitialized && !this.isInitializing) {
      await this.initializeConversation();
    }

    // 初始化完成后，如果外层传入了 initialQuestion，则尝试自动发送一�?
    await this.trySendInitialQuestion();
  }

  /**
   * 组件更新时检查是否需要初始化会话
   * �?visible �?false 变为 true 时，如果还未初始化，则初始化会话
   */
  async componentDidUpdate(prevProps: P): Promise<void> {
    // �?visible �?false 变为 true，且还未初始化时，初始化会话
    if (!prevProps.visible && this.props.visible && !this.hasInitialized && !this.isInitializing) {
      await this.initializeConversation();
    }

    // 当组件从不可见变为可见，�?initialQuestion 发生变化时，尝试触发一次自动发�?
    const wasVisible = prevProps.visible !== false;
    const isVisible = this.props.visible !== false;
    const initialQuestionChanged = prevProps.initialQuestion !== this.props.initialQuestion;

    if (isVisible && (!wasVisible || initialQuestionChanged)) {
      await this.trySendInitialQuestion(prevProps);
    }
  }

  /**
   * 初始化会话的内部方法
   * 仅在组件首次可见时调用，防止重复初始�?
   */
  private async initializeConversation(): Promise<void> {
    // 防止并发调用
    if (this.isInitializing || this.hasInitialized) {
      return;
    }

    this.isInitializing = true;
    // 设置加载状态，防止显示默认开场白
    this.setState({ isLoadingOnboarding: true });

    try {
      await this.createConversation();
      this.hasInitialized = true;
    } catch (error) {
      // 即使创建会话失败，也尝试获取开场白信息
      try {
        const onboardingInfo = await this.getOnboardingInfo();
        this.setState({ onboardingInfo });
        this.hasInitialized = true;
      } catch (e) {
        // 获取开场白信息失败，静默失�?
      }
    } finally {
      this.isInitializing = false;
      // 加载完成，无论成功或失败都取消加载状�?
      this.setState({ isLoadingOnboarding: false });
    }
  }

  /**
   * 根据 props.initialQuestion 在合适的时机自动触发一次问�?
   *
   * 触发条件�?
   * - 组件当前处于可见状态（visible !== false�?
   * - props.initialQuestion 为非空字符串
   * - 当前还没有任何对话消息（messages.length === 0�?
   * - 仅触发一次（hasSentInitialQuestion �?false�?
   */
  private async trySendInitialQuestion(prevProps?: P): Promise<void> {
    const isVisible = this.props.visible !== false;
    if (!isVisible) {
      return;
    }

    const { initialQuestion } = this.props;
    if (!initialQuestion || !initialQuestion.trim()) {
      return;
    }

    // 如果 initialQuestion 没有变化且已经处理过，则不重复发�?
    if (
      this.hasSentInitialQuestion &&
      (!prevProps || prevProps.initialQuestion === initialQuestion)
    ) {
      return;
    }

    // 只在还没有任何消息且当前没有发送中的请求时自动触发，避免干扰已有会�?
    if (this.state.messages.length > 0 || this.state.isSending) {
      this.hasSentInitialQuestion = true;
      return;
    }

    this.hasSentInitialQuestion = true;

    const context =
      this.state.applicationContext ||
      this.props.defaultApplicationContext ||
      { title: '', data: {} };

    try {
      await this.send(initialQuestion, context);
    } catch {
      // 自动发送失败时静默处理，交由用户手动输入重�?
    }
  }

  /**
   * 获取开场白和预置问�?(抽象方法，由子类实现)
   * 该方法需要由子类继承并重写，以适配扣子、Dify �?LLMOps 平台的接�?
   * 返回开场白信息结构�?
   * 注意：该方法是一个无状态无副作用的函数，不允许修改 state
   * @returns 返回开场白信息，包含开场白文案和预置问�?
   */
  public abstract getOnboardingInfo(): Promise<OnboardingInfo>;

  /**
   * 新建会话 (抽象方法，由子类实现)
   * 该方法需要由开发者实现，以适配扣子、Dify �?LLMOps 平台的接�?
   * 成功返回会话 ID
   * 注意：该方法是一个无状态无副作用的函数，不允许修改 state
   * @param title 会话标题，通常是用户发送的第一条消息内�?
   * @returns 返回新创建的会话 ID
   */
  public abstract generateConversation(title?: string): Promise<string>;

  /**
   * 向后端发送消�?(抽象方法，由子类实现)
   * 该方法需要由开发者实现，以适配扣子、Dify�?LLMOps 平台的接�?
   * 发送成功后，返回发送的消息结构
   * 注意：该方法是一个无状态无副作用的函数，不允许修改 state
   * @param text 发送给后端的用户输入的文本
   * @param ctx 随用户输入文本一起发送的应用上下�?
   * @param conversationID 发送的对话消息所属的会话 ID
   * @returns 返回发送的消息结构
   */
  public abstract sendMessage(text: string, ctx: ApplicationContext, conversationID?: string, regenerateMessageId?: string): Promise<ChatMessage>;

  /**
   * �?API 接口返回�?EventStream 增量解析成完整的 AssistantMessage 对象 (抽象方法，由子类实现)
   * 当接收到 SSE 消息时触发，该方法需要由子类实现
   * 子类在该方法中应该调用以下方法来更新消息内容�?
   * - appendMarkdownBlock(): 添加 Markdown 文本�?
   * - appendWebSearchBlock(): 添加 Web 搜索结果�?
   * - appendExecuteCodeBlock(): 添加代码执行结果�?
   * 注意：该方法应该只处理数据解析逻辑，通过调用 append*Block 方法来更新界�?
   * @param eventMessage 接收到的一�?Event Message
   * @param prev 上一次增量更新后�?AssistantMessage 对象
   * @param messageId 当前正在更新的消�?ID，用于调�?append*Block 方法
   * @returns 返回更新后的 AssistantMessage 对象
   */
  public abstract reduceAssistantMessage<T = any, K = any>(
    eventMessage: T,
    prev: K,
    messageId: string
  ): K;

  /**
   * 检查是否需要刷�?token (抽象方法，由子类实现)
   * 当发生异常时检查是否需要刷�?token。返�?true 表示需要刷�?token，返�?false 表示无需刷新 token�?
   * 该方法需要由子类继承并重写，以适配扣子、Dify �?LLMOps 平台的接口�?
   * 注意：该方法是一个无状态无副作用的函数，不允许修改 state�?
   * @param status HTTP 状态码
   * @param error 错误响应�?
   * @returns 返回是否需要刷�?token
   */
  public abstract shouldRefreshToken(status: number, error: any): boolean;

  /**
   * 终止会话 (抽象方法，由子类实现)
   * 该方法需要由子类继承并重写，以适配扣子、Dify �?LLMOps 平台的接口�?
   * 注意：该方法是一个无状态无副作用的函数，不允许修改 state�?
   * @param conversationId 要终止的会话 ID
   * @returns 返回 Promise，成功时 resolve，失败时 reject
   */
  public abstract terminateConversation(conversationId: string): Promise<void>;

  /**
   * 获取历史会话列表 (抽象方法，由子类实现)
   * 该方法需要由子类继承并重写，以适配扣子、Dify �?LLMOps 平台的接口�?
   * 注意：该方法是一个无状态无副作用的函数，不允许修改 state�?
   * @param page 分页页码，默认为 1
   * @param size 每页返回条数，默认为 10
   * @returns 返回历史会话列表
   */
  public abstract getConversations(page?: number, size?: number): Promise<import('../../types').ConversationHistory[]>;

  /**
   * 获取指定会话 ID 的对话消息列�?(抽象方法，由子类实现)
   * 该方法需要由子类继承并重写，以适配扣子、Dify �?LLMOps 平台的接口�?
   * 如果对话消息�?AI 助手消息，则需要调�?reduceAssistantMessage() 解析消息�?
   * 注意：该方法是一个无状态无副作用的函数，不允许修改 state�?
   * @param conversationId 会话 ID
   * @returns 返回对话消息列表
   */
  public abstract getConversationMessages(conversationId: string): Promise<ChatMessage[]>;

  /**
   * 删除指定 ID 的会�?(抽象方法，由子类实现)
   * 该方法需要由子类继承并重写，以适配扣子、Dify �?LLMOps 平台的接口�?
   * 注意：该方法是一个无状态无副作用的函数，不允许修改 state�?
   * @param conversationID 会话 ID
   * @returns 返回 Promise，成功时 resolve，失败时 reject
   */
  public abstract deleteConversation(conversationID: string): Promise<void>;

  /**
   * �?ChatKit 注入应用上下�?
   * @param ctx 要注入的应用上下�?
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
   * ???????
   */
  protected addPendingAttachments = (
    attachments: ChatKitPendingAttachment[]
  ): void => {
    if (!attachments.length) {
      return;
    }

    this.setState((prevState) => {
      const merged = [...prevState.pendingAttachments];
      const seen = new Set(merged.map((item) => item.source.path));

      for (const attachment of attachments) {
        if (!attachment?.source?.path || seen.has(attachment.source.path)) {
          continue;
        }
        merged.push(attachment);
        seen.add(attachment.source.path);
      }

      return { pendingAttachments: merged };
    });
  };

  /**
   * ???????
   */
  protected removePendingAttachment = (path: string): void => {
    this.setState((prevState) => ({
      pendingAttachments: prevState.pendingAttachments.filter(
        (item) => item.source.path !== path
      ),
    }));
  };

  /**
   * ???????
   */
  protected clearPendingAttachments = (): void => {
    this.setState({ pendingAttachments: [] });
  };

  /**
   * ??????
   */
  protected handleUploadFiles = async (files: FileList | null): Promise<void> => {
    if (!files || files.length === 0) {
      return;
    }

    const uploadAttachment = (this as any).uploadAttachment as
      | ((file: File, conversationID?: string) => Promise<ChatKitPendingAttachment>)
      | undefined;

    if (typeof uploadAttachment !== 'function') {
      return;
    }

    const conversationID = this.state.conversationID || undefined;
    const uploaded = await Promise.all(
      Array.from(files).map((file) => uploadAttachment.call(this, file, conversationID))
    );

    this.addPendingAttachments(uploaded);
  };

  protected appendMarkdownBlock(messageId: string, text: string): void {
    this.applyStreamingUpdate((prevState) => {
      const newMessages = prevState.messages.map((msg) => {
        if (msg.messageId === messageId) {
          const lastBlock = msg.content.length > 0 ? msg.content[msg.content.length - 1] : null;
          let newContent;

          // 如果最后一个块�?Markdown 块，且满足流式更新条件（空内容或是新文本的前缀），则更新它
          if (
            lastBlock &&
            lastBlock.type === BlockType.MARKDOWN &&
            (lastBlock.content === '' || text.startsWith(lastBlock.content))
          ) {
            // 流式更新：更新最后一�?Markdown �?
            newContent = [...msg.content];
            newContent[newContent.length - 1] = {
              type: BlockType.MARKDOWN,
              content: text,
            } as MarkdownBlock;
          } else {
            // 新阶段：添加新的 Markdown �?
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
   * 该方法由子类调用，用于在消息中添�?Web 搜索结果
   * @param messageId 消息 ID
   * @param query Web 搜索的执行详�?
   */
  protected appendWebSearchBlock(messageId: string, query: WebSearchQuery): void {
    this.applyStreamingUpdate((prevState) => {
      const newMessages = prevState.messages.map((msg) => {
        if (msg.messageId === messageId) {
          // 添加 Web 搜索�?
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
   * 该方法由子类调用，用于在消息中添加代码执行结�?
   * @param messageId 消息 ID
   * @param result 代码执行的输入和输出结果
   */
  protected appendExecuteCodeBlock(messageId: string, result: ExecuteCodeResult, consumeTime?: number): void {
    this.applyStreamingUpdate((prevState) => {
      const newMessages = prevState.messages.map((msg) => {
        if (msg.messageId === messageId) {
          // 添加代码执行工具�?
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
              consumeTime,
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
   * 该方法由子类调用，用于在消息中添�?Text2SQL 查询结果
   * @param messageId 消息 ID
   * @param result Text2SQL 的输入和输出结果
   * @param consumeTime 耗时（毫秒），可�?
   */
  protected appendText2SqlBlock(messageId: string, result: Text2SqlResult, consumeTime?: number): void {
    this.applyStreamingUpdate((prevState) => {
      const newMessages = prevState.messages.map((msg) => {
        if (msg.messageId === messageId) {
          // 添加 Text2SQL 工具�?
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
              consumeTime,
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
   * 该方法由子类调用，用于在消息中添�?Text2Metric 查询结果
   * @param messageId 消息 ID
   * @param result Text2Metric 的输入和输出结果
   * @param consumeTime 耗时（毫秒），可�?
   */
  protected appendText2MetricBlock(messageId: string, result: Text2MetricResult, consumeTime?: number): void {
    this.applyStreamingUpdate((prevState) => {
      const newMessages = prevState.messages.map((msg) => {
        if (msg.messageId === messageId) {
          // 添加 Text2Metric 工具�?
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
              consumeTime,
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
    * 该方法由子类调用，用于在消息中添�?JSON2Plot 图表数据
    * @param messageId 消息 ID
    * @param chartData 图表数据 Schema
    * @param consumeTime 耗时（毫秒），可�?
    */
  protected appendJson2PlotBlock(messageId: string, chartData: ChartDataSchema, consumeTime?: number): void {
    this.applyStreamingUpdate((prevState) => {
      const newMessages = prevState.messages.map((msg) => {
        if (msg.messageId === messageId) {
          // 添加 JSON2Plot �?
          const newContent = [
            ...msg.content,
            {
              type: BlockType.JSON2PLOT,
              content: chartData,
              consumeTime,
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
   * 更新指定消息中最后一�?JSON2Plot 图表块的内容（用于流式工�?json2plot 的组装）
   * 如果不存�?JSON2Plot 块，则在流式更新时创建一个新的图表块
   * @param messageId 消息 ID
   * @param chartData 最新的图表数据 Schema
   * @param consumeTime 耗时（毫秒），可�?
   */
  protected updateJson2PlotBlock(messageId: string, chartData: ChartDataSchema, consumeTime?: number): void {
    this.applyStreamingUpdate((prevState) => {
      const newMessages = prevState.messages.map((msg) => {
        if (msg.messageId !== messageId) return msg;
        const content = msg.content;
        let lastIndex = -1;
        for (let i = content.length - 1; i >= 0; i--) {
          if (content[i].type === BlockType.JSON2PLOT) {
            lastIndex = i;
            break;
          }
        }

        const newContent = [...content];

        if (lastIndex < 0) {
          // 如果还没�?JSON2Plot 块，则创建一个新�?
          newContent.push({
            type: BlockType.JSON2PLOT,
            content: chartData,
            consumeTime,
          } as Json2PlotBlock);
          return { ...msg, content: newContent };
        }

        // 已存�?JSON2Plot 块，则使用最新数据更新之
        const block = newContent[lastIndex] as Json2PlotBlock;
        newContent[lastIndex] = {
          ...block,
          content: chartData,
          consumeTime: consumeTime ?? block.consumeTime,
        };

        return { ...msg, content: newContent };
      });

      return { messages: newMessages };
    });
  }

  /**
   * 添加 WebProcessor 页面预览类型的消息块
   */
  protected appendWebProcessorBlock(messageId: string, data: WebProcessorDataSchema, consumeTime?: number): void {
    this.applyStreamingUpdate((prevState) => {
      const newMessages = prevState.messages.map((msg) => {
        if (msg.messageId === messageId) {
          const newContent = [
            ...msg.content,
            {
              type: BlockType.WEB_PROCESSOR,
              content: data,
              consumeTime,
            } as WebProcessorBlock,
          ];

          return { ...msg, content: newContent };
        }
        return msg;
      });

      return { messages: newMessages };
    });
  }

  /**
   * 更新指定消息中最后一�?WebProcessor �?
   */
  protected updateWebProcessorBlock(messageId: string, data: WebProcessorDataSchema, consumeTime?: number): void {
    this.applyStreamingUpdate((prevState) => {
      const newMessages = prevState.messages.map((msg) => {
        if (msg.messageId !== messageId) return msg;
        const content = msg.content;
        let lastIndex = -1;
        for (let i = content.length - 1; i >= 0; i--) {
          if (content[i].type === BlockType.WEB_PROCESSOR) {
            lastIndex = i;
            break;
          }
        }

        const newContent = [...content];

        if (lastIndex < 0) {
          newContent.push({
            type: BlockType.WEB_PROCESSOR,
            content: data,
            consumeTime,
          } as WebProcessorBlock);
          return { ...msg, content: newContent };
        }

        const block = newContent[lastIndex] as WebProcessorBlock;
        newContent[lastIndex] = {
          ...block,
          content: data,
          consumeTime: consumeTime ?? block.consumeTime,
        };

        return { ...msg, content: newContent };
      });

      return { messages: newMessages };
    });
  }

  /**
   * 添加 AfSailor 工具类型的消息块
   * 该方法由子类调用，用于在消息中添�?AfSailor 查询结果
   * @param messageId 消息 ID
   * @param result AfSailor 的输入和输出结果
   * @param consumeTime 耗时（毫秒），可�?
   */
  protected appendAfSailorBlock(messageId: string, result: AfSailorResult, consumeTime?: number): void {
    this.applyStreamingUpdate((prevState) => {
      const newMessages = prevState.messages.map((msg) => {
        if (msg.messageId === messageId) {
          // 添加 AfSailor 工具�?
          const newContent = [
            ...msg.content,
            {
              type: BlockType.TOOL,
              content: {
                name: 'af_sailor',
                title:`找到${result?.cites?.length || 0}条数据`,
                icon: <AfSailorIcon />,
                input: result.text || [],
                output: {
                  data: result.cites,
                },
              },
              consumeTime,
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
   * 添加 DatasourceFilter 工具类型的消息块
   * 该方法由子类调用，用于在消息中添�?DatasourceFilter 查询结果
   * @param messageId 消息 ID
   * @param result DatasourceFilter 的输入和输出结果
   * @param consumeTime 耗时（毫秒），可�?
   */
  protected appendDatasourceFilterBlock(messageId: string, result: DatasourceFilterResult, consumeTime?: number): void {
    this.applyStreamingUpdate((prevState) => {
      const newMessages = prevState.messages.map((msg) => {
        if (msg.messageId === messageId) {
          // 添加 DatasourceFilter 工具�?
          const newContent = [
            ...msg.content,
            {
              type: BlockType.TOOL,
              content: {
                name: 'datasource_filter',
                title: `匹配�?{result?.result?.length || 0}个数据`,
                icon: <AfSailorIcon />,
                input: [],
                output: {
                  data: result.result,
                },
              },
              consumeTime,
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
   * 更新指定消息中最后一�?DatasourceFilter 工具块的内容（用于流式工�?datasource_filter 的组装）
   * 如果不存�?DatasourceFilter 块，则在流式更新时创建一个新的工具块
   * @param messageId 消息 ID
   * @param result 最新的 DatasourceFilterResult
   * @param consumeTime 耗时（毫秒），可�?
   */
  protected updateDatasourceFilterBlock(messageId: string, result: DatasourceFilterResult, consumeTime?: number): void {
    this.applyStreamingUpdate((prevState) => {
      const newMessages = prevState.messages.map((msg) => {
        if (msg.messageId !== messageId) return msg;

        const content = msg.content;
        let lastIndex = -1;
        for (let i = content.length - 1; i >= 0; i--) {
          const block = content[i] as ToolBlock;
          if (
            block.type === BlockType.TOOL &&
            (block as ToolBlock).content &&
            (block as ToolBlock).content.name === 'datasource_filter'
          ) {
            lastIndex = i;
            break;
          }
        }

        const newContent = [...content];

        if (lastIndex < 0) {
          // 如果还没�?DatasourceFilter 块，则创建一个新�?
          newContent.push({
            type: BlockType.TOOL,
            content: {
              name: 'datasource_filter',
              title: `匹配�?{result?.result?.length || 0}个数据`,
              icon: <AfSailorIcon />,
              input: [],
              output: {
                data: result.result,
              },
            },
            consumeTime,
          } as ToolBlock);
          return { ...msg, content: newContent };
        }

        // 已存�?DatasourceFilter 块，则使用最新数据更新之
        const block = newContent[lastIndex] as ToolBlock;
        newContent[lastIndex] = {
          ...block,
          content: {
            ...(block.content as any),
            title: `匹配�?{result?.result?.length || 0}个数据`,
            output: {
              data: result.result,
            },
          },
          consumeTime: consumeTime ?? (block as any).consumeTime,
        } as ToolBlock;

        return { ...msg, content: newContent };
      });

      return { messages: newMessages };
    });
  }

  /**
   * 添加 DatasourceRerank 工具类型的消息块
   * 该方法由子类调用，用于在消息中添�?DatasourceRerank 查询结果，与 datasource_filter 处理方式一�?
   * @param messageId 消息 ID
   * @param result DatasourceRerank 的输入和输出结果
   * @param consumeTime 耗时（毫秒），可�?
   */
  protected appendDatasourceRerankBlock(messageId: string, result: DatasourceRerankResult, consumeTime?: number): void {
    this.applyStreamingUpdate((prevState) => {
      const newMessages = prevState.messages.map((msg) => {
        if (msg.messageId === messageId) {
          // 添加 DatasourceRerank 工具�?
          const newContent = [
            ...msg.content,
            {
              type: BlockType.TOOL,
              content: {
                name: 'datasource_rerank',
                title: `重排匹配�?{result?.result?.length || 0}个数据`,
                icon: <AfSailorIcon />,
                input: [],
                output: {
                  data: result.result,
                },
              },
              consumeTime,
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
   * 更新指定消息中最后一�?DatasourceRerank 工具块的内容（用于流式工�?datasource_rerank 的组装）
   * 如果不存�?DatasourceRerank 块，则在流式更新时创建一个新的工具块
   * @param messageId 消息 ID
   * @param result 最新的 DatasourceRerankResult
   * @param consumeTime 耗时（毫秒），可�?
   */
  protected updateDatasourceRerankBlock(messageId: string, result: DatasourceRerankResult, consumeTime?: number): void {
    this.applyStreamingUpdate((prevState) => {
      const newMessages = prevState.messages.map((msg) => {
        if (msg.messageId !== messageId) return msg;

        const content = msg.content;
        let lastIndex = -1;
        for (let i = content.length - 1; i >= 0; i--) {
          const block = content[i] as ToolBlock;
          if (
            block.type === BlockType.TOOL &&
            (block as ToolBlock).content &&
            (block as ToolBlock).content.name === 'datasource_rerank'
          ) {
            lastIndex = i;
            break;
          }
        }

        const newContent = [...content];

        if (lastIndex < 0) {
          // 如果还没�?DatasourceRerank 块，则创建一个新�?
          newContent.push({
            type: BlockType.TOOL,
            content: {
              name: 'datasource_rerank',
              title: `重排匹配�?{result?.result?.length || 0}个数据`,
              icon: <AfSailorIcon />,
              input: [],
              output: {
                data: result.result,
              },
            },
            consumeTime,
          } as ToolBlock);
          return { ...msg, content: newContent };
        }

        // 已存�?DatasourceRerank 块，则使用最新数据更新之
        const block = newContent[lastIndex] as ToolBlock;
        newContent[lastIndex] = {
          ...block,
          content: {
            ...(block.content as any),
            title: `重排匹配�?{result?.result?.length || 0}个数据`,
            output: {
              data: result.result,
            },
          },
          consumeTime: consumeTime ?? (block as any).consumeTime,
        } as ToolBlock;

        return { ...msg, content: newContent };
      });

      return { messages: newMessages };
    });
  }

  /**
   * 添加默认工具类型的消息块
   * 用于那些没有单独渲染逻辑的通用工具
   * @param messageId 消息 ID
   * @param toolName 工具名称（skill_name�?
   * @param result 默认工具的输入输出结�?
   * @param consumeTime 耗时（毫秒），可�?
   */
  protected appendDefaultToolBlock(
    messageId: string,
    toolName: string,
    result: DefaultToolResult,
    consumeTime?: number
  ): void {
    this.applyStreamingUpdate((prevState) => {
      const newMessages = prevState.messages.map((msg) => {
        if (msg.messageId === messageId) {
          const newContent = [
            ...msg.content,
            {
              type: BlockType.TOOL,
              content: {
                name: toolName,
                icon: <Text2SqlIcon />,
                title: result.title,
                input: result.input,
                output: result.output,
              },
              consumeTime,
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
   * 更新指定消息�?messageContext（合并更新）
   * 用于在流式过程中或流结束时写入相关问题、耗时、Token 等辅助信�?
   */
  protected updateMessageContext(messageId: string, patch: Partial<MessageContext>): void {
    this.applyStreamingUpdate((prevState) => {
      const newMessages = prevState.messages.map((msg) => {
        if (msg.messageId !== messageId) return msg;
        const nextContext: MessageContext = {
          ...(msg.messageContext || {}),
          ...patch,
        };
        return { ...msg, messageContext: nextContext };
      });
      return { messages: newMessages };
    });
  }

  /**
   * 流式期间将状态更新入队，�?handleStreamResponse �?chunk 结束时统一 flush，避免同一 chunk 内多行事件导致多�?setState 触发 Maximum update depth exceeded
   */
  protected applyStreamingUpdate(updater: (prev: ChatKitBaseState) => Partial<ChatKitBaseState>): void {
    if (this._streamingBatch) {
      this._pendingStreamingUpdates.push(updater);
    } else {
      this.setState((prev) => ({ ...prev, ...updater(prev) }));
    }
  }

  /**
   * 将当前批内的所有流式更新合并为一�?setState 执行
   */
  protected flushStreamingUpdates(): void {
    if (this._pendingStreamingUpdates.length === 0) {
      this._streamingBatch = false;
      return;
    }
    const fns = this._pendingStreamingUpdates;
    this._pendingStreamingUpdates = [];
    this._streamingBatch = false;
    this.setState((prev) =>
      fns.reduce<ChatKitBaseState>((s, fn) => ({ ...s, ...fn(s) }), prev)
    );
  }

  /**
   * 更新指定工具名称对应的最后一个工具块的结果（用于流式工具�?contextloader_data_enhanced 的组装）
   * @param messageId 消息 ID
   * @param toolName 工具名称
   * @param result 更新后的默认工具结果
   */
  protected updateDefaultToolBlockResult(
    messageId: string,
    toolName: string,
    result: DefaultToolResult
  ): void {
    this.applyStreamingUpdate((prevState) => {
      const newMessages = prevState.messages.map((msg) => {
        if (msg.messageId !== messageId) return msg;
        const content = msg.content;
        let lastToolIndex = -1;
        for (let i = content.length - 1; i >= 0; i--) {
          if (content[i].type === BlockType.TOOL && (content[i] as ToolBlock).content?.name === toolName) {
            lastToolIndex = i;
            break;
          }
        }
        const newContent = [...content];

        if (lastToolIndex < 0) {
          // 若尚未存在对应工具块，则在流式更新时创建一个默认工具块
          newContent.push({
            type: BlockType.TOOL,
            content: {
              name: toolName,
              icon: <Text2SqlIcon />,
              title: result.title,
              input: result.input,
              output: result.output,
            },
          } as ToolBlock);
          return { ...msg, content: newContent };
        }

        const block = newContent[lastToolIndex] as ToolBlock;
        newContent[lastToolIndex] = {
          ...block,
          content: {
            ...block.content,
            title: result.title,
            input: result.input,
            output: result.output,
          },
        };
        return { ...msg, content: newContent };
      });
      return { messages: newMessages };
    });
  }

  /**
   * 创建新的会话
   * 内部会调用子类实现的 generateConversation() �?getOnboardingInfo() 方法
   */
  public createConversation = async (): Promise<void> => {
    // 设置加载状�?
    this.setState({ isLoadingOnboarding: true });

    try {
      // 先清除现有会�?
      this.clearConversation();

      // 调用子类实现�?getOnboardingInfo 方法获取开场白信息
      const onboardingInfo = await this.getOnboardingInfo();

      // 更新会话 ID 和开场白信息
      this.setState({
        onboardingInfo: onboardingInfo,
      });
    } catch (error) {
      throw error;
    } finally {
      // 无论成功或失败，都取消加载状�?
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
      // 调用子类实现�?getConversationMessages 方法获取会话消息
      const messages = await this.getConversationMessages(conversationId);

      // 更新会话 ID 和消息列�?
      this.setState({
        conversationID: conversationId,
        messages: messages,
        onboardingInfo: undefined, // 清除开场白信息
      });
    } catch (error) {
      throw error;
    }
  };

  /**
   * 清除会话中的对话消息及会�?ID
   */
  private clearConversation = (): void => {
    // 每次清空会话时自增会话代数，阻止旧流式请求继续写�?
    this.conversationSeq += 1;

    this.setState({
      conversationID: '',
      messages: [],
      textInput: '',
      applicationContext: this.props.defaultApplicationContext,
      isSending: false,
      streamingMessageId: null,
      onboardingInfo: undefined,
      pendingAttachments: [],
    });
  };

  /**
   * 发送消息的核心方法
   * 该方法是暴露给集成方进行调用的接口，内部会调用子类实现的 sendMessage() 方法
   * @param text 用户输入的文�?
   * @param ctx 应用上下�?
   * @param conversationID 发送的对话消息所属的会话 ID（可选）
   * @returns 返回发送的消息结构
   */
  public send = async (text: string, ctx?: ApplicationContext, conversationID?: string, regenerateMessageId?: string): Promise<ChatMessage> => {
    if (!text.trim()) {
      throw new Error('消息内容不能为空');
    }

    // 如果传入�?ctx，则设置 applicationContext
    if (ctx) {
      this.setState({ applicationContext: ctx });
    }

    // 使用传入�?conversationID，或使用当前 state 中的 conversationID
    let currentConversationID = conversationID || this.state.conversationID;

    // 如果没有会话 ID，则创建新会�?
      if (!currentConversationID) {
      try {
        // 使用发送的内容作为会话标题
        currentConversationID = await this.generateConversation(text);
        this.setState({ conversationID: currentConversationID });
      } catch (error) {
        // 即使创建会话失败，也继续发送消息（某些平台可能不需要预先创建会话）
      }
    }

    this.setState({ isSending: true });

    // 获取最终使用的上下�?
    const finalContext = ctx || this.state.applicationContext || this.props.defaultApplicationContext || { title: '', data: {} };

    // **重要：重新生成时不创建用户消�?*
    // 只有�?regenerateMessageId 不存在时，才创建并插入用户消�?
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
      // 如果不是重新生成，则清空输入�?
      if (!regenerateMessageId) {
        this.setState({ textInput: '', pendingAttachments: [] });
      }
      
      // 调用子类实现�?sendMessage 方法，传�?conversationID �?regenerateMessageId
      const assistantMessage = await this.sendMessage(text, finalContext, currentConversationID, regenerateMessageId);

      // 流式响应�?子类已经添加并更新了消息,这里只需要清理状�?
      this.setState({
        isSending: false,
        streamingMessageId: null,
      });

      return assistantMessage;
    } catch (error) {
      this.setState({ isSending: false, streamingMessageId: null });
      throw error;
    }
  };

  /**
   * 处理流式响应
   * 在闭包中处理 EventStream,并在处理完成后丢弃闭�?
   * @param reader ReadableStreamDefaultReader
   * @param assistantMessageId 助手消息 ID
   */
  protected async handleStreamResponse<T = any>(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    assistantMessageId: string
  ): Promise<T> {
    // 记录当前会话代数；如果期间被新建会话清空，则停止处理本次�?
    const startSeq = this.conversationSeq;

    const decoder = new TextDecoder();
    let assistantMessage: T = {} as T;

    try {
      let currentEvent = ''; // 保存当前�?SSE event 类型
      let buffer = ''; // 用于缓存不完整的�?

      while (true) {
        // 如果会话代数已经变化，说明用户已新建会话，直接停止旧流处�?
        if (this.conversationSeq !== startSeq) {
          break;
        }

        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        // 将新数据追加到缓冲区
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // 按换行符分割，但保留最后一个可能不完整的部�?
        const lines = buffer.split('\n');
        // 最后一个元素可能是不完整的行，保留�?buffer �?
        buffer = lines.pop() || '';

        // �?chunk 内多行事件只合并为一�?setState，避�?Maximum update depth exceeded
        this._streamingBatch = true;
        this._pendingStreamingUpdates = [];

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;

          // 处理 SSE �?event �?
          if (trimmedLine.startsWith('event:')) {
            // 保存 SSE 事件类型，用于下一�?data �?
            currentEvent = trimmedLine.slice(6).trim();
            continue;
          }

          if (trimmedLine.startsWith('data:')) {
            const dataStr = trimmedLine.slice(5).trim();

            if (dataStr === '[DONE]') {
              continue;
            }

            try {
              const data = JSON.parse(dataStr);

              // 构�?EventStreamMessage
              // 使用 SSE �?event 行中的事件类型，如果没有则尝试从 data 中获�?
              const eventMessage: EventStreamMessage = {
                event: currentEvent || data.event || data.type || '',
                data: dataStr,
              };

              // 调用子类�?reduceAssistantMessage 方法解析事件
              // 传入 assistantMessageId 以便子类可以直接更新对应的消�?
              assistantMessage = this.reduceAssistantMessage(
                eventMessage,
                assistantMessage,
                assistantMessageId
              );

              // 重置 currentEvent，准备处理下一个事�?
              currentEvent = '';
            } catch (e) {
              // 解析流式响应失败时静默处理，避免影响主流�?
            }
          }
        }

        this.flushStreamingUpdates();
      }

      // 处理缓冲区中剩余的数据（如果有）
      if (buffer.trim()) {
        // 当前未对残留缓冲区做额外处理
      }
    } finally {
      this.flushStreamingUpdates();
      this._streamingBatch = false;
      this._pendingStreamingUpdates = [];
      reader.releaseLock();
    }

    return assistantMessage;
  }

  /**
   * 执行 API 调用，并在需要时自动刷新 token 并重试一�?
   * @param apiCall API 调用函数
   * @returns API 调用结果
   */
  protected async executeWithTokenRefresh<T>(
    apiCall: () => Promise<T>
  ): Promise<T> {
    try {
      // 第一次尝�?
      return await apiCall();
    } catch (error: any) {
      const status = error.status || error.response?.status || 0;
      const errorBody = error.body || error.response?.data || error;

      // 检查是否需要刷�?token
      const needsRefresh = this.shouldRefreshToken(status, errorBody);

      if (needsRefresh && this.refreshToken) {
        try {
          // 调用 refreshToken 方法获取�?token
          const newToken = await this.refreshToken();

          // 更新 token 属�?
          this.token = newToken;

          // 重试 API 调用
          try {
            return await apiCall();
            } catch (retryError: any) {
              // 重试后仍然失败，检查是否还�?token 问题
              const retryStatus = retryError.status || retryError.response?.status || 0;
              const retryErrorBody = retryError.body || retryError.response?.data || retryError;

              if (this.shouldRefreshToken(retryStatus, retryErrorBody)) {
                // 重试后仍然提�?token 失效，放弃重�?
              }

              // 抛出重试后的错误
              throw retryError;
            }
          } catch (refreshError) {
            // 刷新失败，抛出原始错�?
            throw error;
          }
      }

      // 不需要刷�?token，直接抛出错�?
      throw error;
    }
  }

  /**
   * 处理发送按钮点�?
   */
  protected handleSend = async () => {
    if (this.state.isSending) {
      return;
    }

    const text = this.state.textInput.trim();
    const attachments = ((this.state as any).pendingAttachments || []) as ChatKitPendingAttachment[];
    if (!text && attachments.length === 0) {
      return;
    }

    const context = this.state.applicationContext || this.props.defaultApplicationContext || { title: '', data: {} };

    try {
      const sendWithAttachments = (this as any).sendWithAttachments as
        | ((
            text: string,
            attachments: ChatKitPendingAttachment[],
            ctx?: ApplicationContext,
            conversationID?: string
          ) => Promise<ChatMessage>)
        | undefined;

      if (attachments.length > 0 && typeof sendWithAttachments === 'function') {
        await sendWithAttachments.call(
          this,
          this.state.textInput,
          attachments,
          context,
          this.state.conversationID || undefined
        );
        this.setState({ pendingAttachments: [] });
        return;
      }

      await this.send(this.state.textInput, context);
    } catch (error) {
    }
  };

  /**
   * 处理停止流式响应
   * 调用子类实现�?terminateConversation 方法终止当前会话
   */
  protected handleStop = async () => {
    const { conversationID, streamingMessageId } = this.state;

    if (!streamingMessageId) {
      return;
    }

    try {
      // 调用子类实现�?terminateConversation 方法
      await this.terminateConversation(conversationID);

      // 主动中断前端当前流式连接，避免继续从接口读取数据
      if (this.currentStreamController) {
        try {
          this.currentStreamController.abort();
        } catch {
        } finally {
          this.currentStreamController = undefined;
        }
      }

      // 清除流式消息 ID，恢复为正常状�?
      this.setState({
        streamingMessageId: null,
        isSending: false,
      });
    } catch (error) {
      // 即使失败，也清除状态，让用户可以重新操�?
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
   * CopilotBase �?AssistantBase 会分别实现各自的渲染逻辑
   */
  abstract render(): React.ReactNode;
}

export default ChatKitBase;


