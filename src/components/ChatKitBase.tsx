import { Component } from 'react';
import { ChatMessage, RoleType, ApplicationContext, ChatKitInterface, EventStreamMessage, ChatMessageType } from '../types';
import MessageList from './MessageList';
import InputArea from './InputArea';

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
  constructor(props: P) {
    super(props);

    this.state = {
      conversationID: props.conversationID || '',
      messages: [],
      textInput: '',
      applicationContext: props.defaultApplicationContext,
      isSending: false,
      streamingMessageId: null,
    };
  }

  /**
   * 向后端发送消息 (抽象方法，由子类实现)
   * 该方法需要由开发者实现，以适配扣子、Dify等 LLMOps 平台的接口
   * 发送成功后，返回发送的消息结构
   * @param text 发送给后端的用户输入的文本
   * @param ctx 随用户输入文本一起发送的应用上下文
   * @returns 返回发送的消息结构
   */
  public abstract sendMessage(text: string, ctx: ApplicationContext): Promise<ChatMessage>;

  /**
   * 解析 EventStreamMessage 并累积文本 (抽象方法，由子类实现)
   * 当接收到 SSE 消息时触发，该方法需要由开发者实现
   * 将不同的 API 接口返回的 SSE 进行解析成 ChatKit 组件能够处理的标准数据格式后返回
   * 返回解析并积累起来后的 buffer，该 buffer 可以被直接打印到界面上
   * @param eventMessage 接收到的一条 EventStreamMessage
   * @param prevBuffer 之前已经堆积起来的文本
   * @returns 返回解析并积累起来后的 buffer
   */
  public abstract reduceEventStreamMessage(eventMessage: EventStreamMessage, prevBuffer: string): string;

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
   * 发送消息的核心方法
   * @param text 用户输入的文本
   * @param ctx 应用上下文
   * @returns 返回发送的消息结构
   */
  public send = async (text: string, ctx: ApplicationContext): Promise<ChatMessage> => {
    if (!text.trim()) {
      throw new Error('消息内容不能为空');
    }

    this.setState({ isSending: true });

    // 创建用户消息
    const userMessage: ChatMessage = {
      messageId: `user-${Date.now()}`,
      content: text,
      type: ChatMessageType.TEXT,
      role: {
        name: '用户',
        type: RoleType.USER,
        avatar: '',
      },
      // 如果有应用上下文，则附加到用户消息中
      applicationContext: ctx.title || ctx.data ? ctx : undefined,
    };

    // 将用户消息添加到消息列表
    this.setState((prevState) => ({
      messages: [...prevState.messages, userMessage],
    }));

    try {
      // 调用子类实现的 sendMessage 方法
      const assistantMessage = await this.sendMessage(text, ctx);

      // 流式响应时,子类已经添加并更新了消息,这里只需要清理状态
      this.setState({
        textInput: '',
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
  protected async handleStreamResponse(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    assistantMessageId: string
  ): Promise<string> {
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      let currentEvent = ''; // 保存当前的 SSE event 类型

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('流式响应完成');
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter((line) => line.trim());

        for (const line of lines) {
          // 处理 SSE 的 event 行
          if (line.startsWith('event:')) {
            // 保存 SSE 事件类型，用于下一个 data 行
            currentEvent = line.slice(6).trim();
            console.log('收到SSE event:', currentEvent);
            continue;
          }

          if (line.startsWith('data:')) {
            const dataStr = line.slice(5).trim();

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

              // 调用子类的 reduceEventStreamMessage 方法解析事件
              buffer = this.reduceEventStreamMessage(eventMessage, buffer);
              console.log('handleStreamResponse - buffer更新后:', buffer);

              // 更新界面上的消息内容
              this.setState((prevState) => {
                console.log('更新消息列表, assistantMessageId:', assistantMessageId);
                const newMessages = prevState.messages.map((msg) =>
                  msg.messageId === assistantMessageId
                    ? { ...msg, content: buffer }
                    : msg
                );
                console.log('新消息列表:', newMessages);
                return { messages: newMessages };
              });

              // 重置 currentEvent，准备处理下一个事件
              currentEvent = '';
            } catch (e) {
              console.error('解析流式响应失败:', e, '原始数据:', dataStr);
            }
          }
        }
      }
    } finally {
      // 流式传输完成后,闭包会被丢弃
      reader.releaseLock();
    }

    return buffer;
  }

  /**
   * 处理发送按钮点击
   */
  private handleSend = async () => {
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
   * 更新用户输入
   */
  private setTextInput = (value: string) => {
    this.setState({ textInput: value });
  };

  render() {
    if (!this.props.visible) {
      return null;
    }

    const { title = 'Copilot', onClose } = this.props;
    const { messages, textInput, applicationContext, isSending } = this.state;

    return (
      <div className="flex flex-col h-screen w-96 bg-white shadow-2xl border-l border-gray-200">
        {/* 头部 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-blue-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
              <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
            </svg>
            <span className="font-semibold text-gray-800">{title}</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="text-gray-500 hover:text-gray-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* 消息列表区域 */}
        <MessageList messages={messages} />

        {/* 输入区域 */}
        <InputArea
          value={textInput}
          onChange={this.setTextInput}
          onSend={this.handleSend}
          context={applicationContext}
          onRemoveContext={this.removeApplicationContext}
          disabled={isSending}
        />
      </div>
    );
  }
}

export default ChatKitBase;
