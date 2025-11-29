import { ChatKitBase, ChatKitBaseProps } from './ChatKitBase';
import {
  ApplicationContext,
  ChatMessage,
  ChatMessageType,
  EventStreamMessage,
  RoleType,
} from '../types';

/**
 * ChatKitDataAgent 组件的属性接口
 */
export interface ChatKitDataAgentProps extends ChatKitBaseProps {
  /** AISHU Data Agent 的 Agent ID,用作路径参数 */
  agentId: string;

  /** 访问令牌,需要包含 Bearer 前缀 */
  bearerToken: string;

  /** 服务端基础地址,应包含 /api/agent-app/v1 前缀 */
  baseUrl?: string;

  /** 是否开启增量流式返回,默认 true */
  enableIncrementalStream?: boolean;
}

/**
 * ChatKitDataAgent 组件
 * 适配 AISHU Data Agent 平台的智能体对话组件
 */
export class ChatKitDataAgent extends ChatKitBase<ChatKitDataAgentProps> {
  private baseUrl: string;
  private agentId: string;
  private bearerToken: string;
  private incStream: boolean;

  constructor(props: ChatKitDataAgentProps) {
    super(props);

    this.baseUrl = props.baseUrl || 'https://dip.aishu.cn/api/agent-app/v1';
    this.agentId = props.agentId;
    this.bearerToken = props.bearerToken;
    this.incStream = props.enableIncrementalStream ?? true;
  }

  /**
   * 调用 Data Agent API 发送消息(流式)
   * @param text 用户输入
   * @param ctx 应用上下文
   * @returns 返回助手消息
   */
  public async sendMessage(text: string, ctx: ApplicationContext): Promise<ChatMessage> {
    if (!this.baseUrl) {
      throw new Error('Data Agent baseUrl 不能为空');
    }

    // 构造上下文信息
    let fullQuery = text;
    if (ctx && ctx.title) {
      fullQuery = `【上下文: ${ctx.title}】\n${JSON.stringify(ctx.data, null, 2)}\n\n${text}`;
    }

    const body = {
      agent_id: this.agentId,
      query: fullQuery,
      stream: true,
      inc_stream: this.incStream,
      custom_querys: ctx?.data,
      conversation_id: this.state.conversationID || undefined,
    };

    const response = await fetch(
      `${this.baseUrl}/app/${this.agentId}/chat/completion`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          Authorization: this.bearerToken,
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Data Agent API 调用失败: ${response.status} ${errText}`);
    }

    const assistantMessageId = `assistant-${Date.now()}`;
    const initialAssistantMessage: ChatMessage = {
      messageId: assistantMessageId,
      content: '',
      type: ChatMessageType.TEXT,
      role: {
        name: 'AI 助手',
        type: RoleType.ASSISTANT,
        avatar: '',
      },
    };

    this.setState((prevState) => ({
      messages: [...prevState.messages, initialAssistantMessage],
      streamingMessageId: assistantMessageId,
    }));

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('无法获取流式响应');
    }

    const finalContent = await this.handleStreamResponse(reader, assistantMessageId);

    return {
      ...initialAssistantMessage,
      content: finalContent,
    };
  }

  /**
   * 解析 Data Agent 的 EventStreamMessage
   * 当 key 仅包含 ["message"] 时，取首词输出；后续仅从包含 ["message", "final_answer"] 的事件取内容
   */
  public reduceEventStreamMessage(
    eventMessage: EventStreamMessage,
    prevBuffer: string
  ): string {
    try {
      const parsed = JSON.parse(eventMessage.data);
      const payload = parsed.data || parsed;
      const action = parsed.action || payload?.action || '';
      const conversationId = parsed.conversation_id || payload?.conversation_id;

      if (conversationId && conversationId !== this.state.conversationID) {
        this.setState({ conversationID: conversationId });
      }

      const key = payload?.key;
      const keyPath = Array.isArray(key)
        ? key.map(String)
        : typeof key === 'string'
          ? [key]
          : [];
      const isMessageOnly = keyPath.length === 1 && keyPath[0] === 'message';
      const hasMessageAndFinal = keyPath.includes('message') && keyPath.includes('final_answer');

      let nextBuffer = prevBuffer;

      // 首词输出
      if (isMessageOnly) {
        const firstChunk = this.extractFirstWord(
          payload?.content?.content?.final_answer?.answer?.text
        );
        if (firstChunk) {
          nextBuffer = prevBuffer + firstChunk;
        }
      } else if (hasMessageAndFinal) {
        // 后续增量输出
        const delta = this.extractContentChunk(payload?.content);

        if (delta) {
          nextBuffer = prevBuffer + delta;
        }
      }

      // action 为 end 代表最后一条输出
      if (action === 'end') {
        return nextBuffer;
      }

      return nextBuffer;
    } catch (e) {
      console.error('解析 Data Agent 事件失败:', e, eventMessage);
      return prevBuffer;
    }
  }

  /**
   * 提取首词，用于第一条文本输出
   */
  private extractFirstWord(raw: any): string {
    if (typeof raw !== 'string') {
      return '';
    }

    const trimmed = raw.trim();
    if (!trimmed) return '';

    const parts = trimmed.split(/\s+/);
    if (parts.length > 1) {
      return parts[0];
    }

    return trimmed.charAt(0);
  }

  /**
   * 提取后续增量输出的内容
   */
  private extractContentChunk(raw: any): string {
    if (!raw) return '';

    if (typeof raw === 'string') {
      return raw;
    }

    if (typeof raw === 'object') {
      if (typeof raw.text === 'string') {
        return raw.text;
      }

      if (typeof raw.value === 'string') {
        return raw.value;
      }

      if (typeof raw.message === 'string') {
        return raw.message;
      }

      if (typeof raw.content === 'string') {
        return raw.content;
      }

      if (typeof raw.answer?.text === 'string') {
        return raw.answer.text;
      }

      if (typeof raw.final_answer?.answer?.text === 'string') {
        return raw.final_answer.answer.text;
      }
    }

    return '';
  }
}

export default ChatKitDataAgent;
