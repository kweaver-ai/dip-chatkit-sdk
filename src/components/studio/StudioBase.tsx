import { ChatKitBaseProps } from '../base/ChatKitBase';
import {
  ApplicationContext,
  BlockType,
  ChatMessage,
  ConversationHistory,
  EventStreamMessage,
  OnboardingInfo,
  RoleType,
} from '../../types';
import { Constructor } from '../../utils/mixins';

interface StudioTextContentPart {
  type: 'text' | 'input_text';
  text: string;
}

interface StudioFileSource {
  type: 'path';
  path: string;
}

interface StudioInputFileContentPart {
  type: 'input_file';
  source: StudioFileSource;
}

interface StudioInputFilesContentPart {
  type: 'input_files';
  files: StudioFileSource[];
}

type StudioMessageContentPart =
  | StudioTextContentPart
  | StudioInputFileContentPart
  | StudioInputFilesContentPart;

interface StudioSessionMessage {
  id?: string;
  role?: string;
  content?: string | StudioMessageContentPart[];
  attachments?: StudioChatAttachment[];
  createdAt?: number;
  updatedAt?: number;
  [key: string]: unknown;
}

interface StudioSessionsListResponse {
  sessions?: Array<{
    key: string;
    label?: string;
    displayName?: string;
    updatedAt?: number;
    [key: string]: unknown;
  }>;
}

interface StudioSessionMessagesResponse {
  key?: string;
  messages?: StudioSessionMessage[];
}

interface StudioChatMessagesResponse {
  sessionKey?: string;
  messages?: StudioSessionMessage[];
}

interface StudioDigitalHumanDetail {
  id: string;
  name: string;
  creature?: string;
}

export interface StudioChatAttachment {
  type: 'input_file';
  source: StudioFileSource;
  name?: string;
}

export interface StudioBaseProps {
  agentId: string;
  baseUrl?: string;
  userId?: string;
  assistantName?: string;
  token?: string;
  refreshToken?: () => Promise<string>;
}

function normalizeBaseUrl(baseUrl?: string): string {
  const value = (baseUrl || '/api/dip-studio/v1').trim();
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function extractFilename(path: string): string {
  const normalized = path.replace(/\\/g, '/');
  const parts = normalized.split('/');
  return parts[parts.length - 1] || path;
}

function encodeSessionKey(sessionKey: string): string {
  return encodeURIComponent(sessionKey);
}

function buildContextText(text: string, ctx: ApplicationContext): string {
  if (!ctx?.title) {
    return text;
  }

  return `【上下文: ${ctx.title}】\n${JSON.stringify(ctx.data ?? {}, null, 2)}\n\n${text}`;
}

function buildStudioPrologue(name?: string, creature?: string): string {
  const resolvedName = (name || '').trim();
  const resolvedCreature = (creature || '').trim();

  if (resolvedName && resolvedCreature) {
    return `你好，我是${resolvedName}，当前身份是${resolvedCreature}。我可以继续当前 Studio Agent 的对话、查看历史会话，并结合上传附件回答问题。`;
  }

  if (resolvedName) {
    return `你好，我是${resolvedName}。我可以继续当前 Studio Agent 的对话、查看历史会话，并结合上传附件回答问题。`;
  }

  return '你好，我是 Studio Assistant，可以继续当前 Studio Agent 的对话、查看历史会话，并结合上传附件回答问题。';
}

function normalizeTextFromContent(
  content?: string | StudioMessageContentPart[]
): string {
  if (typeof content === 'string') {
    return content.trim();
  }

  if (!Array.isArray(content)) {
    return '';
  }

  return content
    .flatMap((part) => {
      if (part.type === 'text' || part.type === 'input_text') {
        return [part.text];
      }
      return [];
    })
    .join('')
    .trim();
}

function normalizeAttachments(
  content?: string | StudioMessageContentPart[],
  attachments?: StudioChatAttachment[]
): StudioChatAttachment[] {
  const fromAttachments = Array.isArray(attachments) ? attachments : [];
  const fromContent = Array.isArray(content)
    ? content.flatMap((part) => {
        if (part.type === 'input_file') {
          return [
            {
              type: 'input_file' as const,
              source: part.source,
              name: extractFilename(part.source.path),
            },
          ];
        }

        if (part.type === 'input_files') {
          return part.files.map((file) => ({
            type: 'input_file' as const,
            source: file,
            name: extractFilename(file.path),
          }));
        }

        return [];
      })
    : [];

  const seen = new Set<string>();
  return [...fromAttachments, ...fromContent].filter((attachment) => {
    const key = attachment.source.path;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function buildAttachmentMarkdown(attachments: StudioChatAttachment[]): string {
  if (attachments.length === 0) {
    return '';
  }

  const lines = attachments.map((attachment) => {
    const label = attachment.name || extractFilename(attachment.source.path);
    return `- ${label}`;
  });

  return `附件:\n${lines.join('\n')}`;
}

function buildContentBlocks(
  text: string,
  attachments: StudioChatAttachment[]
): ChatMessage['content'] {
  const blocks: ChatMessage['content'] = [];

  if (attachments.length > 0) {
    blocks.push({
      type: BlockType.MARKDOWN,
      content: buildAttachmentMarkdown(attachments),
    });
  }

  if (text.trim()) {
    blocks.push({
      type: BlockType.TEXT,
      content: text,
    });
  }

  return blocks;
}

function buildUserMessage(
  text: string,
  ctx: ApplicationContext | undefined,
  attachments: StudioChatAttachment[]
): ChatMessage {
  return {
    messageId: `user-${Date.now()}`,
    role: {
      name: '用户',
      type: RoleType.USER,
      avatar: '',
    },
    content: buildContentBlocks(text, attachments),
    applicationContext: ctx && (ctx.title || ctx.data) ? ctx : undefined,
  };
}

function normalizeStudioMessage(message: StudioSessionMessage): ChatMessage {
  const roleType =
    message.role === 'assistant' ? RoleType.ASSISTANT : RoleType.USER;
  const text = normalizeTextFromContent(message.content);
  const attachments = normalizeAttachments(message.content, message.attachments);

  return {
    messageId: message.id || `message-${Date.now()}-${Math.random()}`,
    role: {
      name: roleType === RoleType.ASSISTANT ? 'AI 助手' : '用户',
      type: roleType,
      avatar: '',
    },
    content: buildContentBlocks(text, attachments),
  };
}

export function StudioBaseMixin<TBase extends Constructor>(Base: TBase) {
  return class StudioBase extends Base {
    public studioBaseUrl: string;
    public studioAgentId: string;
    public studioUserId?: string;
    public studioAssistantName: string;

    constructor(...args: any[]) {
      super(...args);

      const props = args[0] as StudioBaseProps & ChatKitBaseProps;
      this.studioBaseUrl = normalizeBaseUrl(props.baseUrl);
      this.studioAgentId = props.agentId;
      this.studioUserId = props.userId;
      this.studioAssistantName =
        props.assistantName || props.title || 'Studio Assistant';
    }

    public buildHeaders(
      options: {
        includeJson?: boolean;
        includeUserId?: boolean;
        includeSessionKey?: string;
      } = {}
    ): HeadersInit {
      const headers: Record<string, string> = {};

      if (options.includeJson !== false) {
        headers['Content-Type'] = 'application/json';
      }

      if ((this as any).token) {
        headers.Authorization = `Bearer ${(this as any).token}`;
      }

      if (options.includeUserId && this.studioUserId) {
        headers['x-user-id'] = this.studioUserId;
      }

      const finalSessionKey =
        options.includeSessionKey || (this as any).state?.conversationID || '';
      if (finalSessionKey) {
        headers['x-openclaw-session-key'] = finalSessionKey;
      }

      return headers;
    }

    public async parseJsonResponse<T>(
      response: Response,
      errorPrefix: string
    ): Promise<T> {
      if (!response.ok) {
        const errorText = await response.text();
        const error: any = new Error(
          `${errorPrefix}: ${response.status} ${errorText}`
        );
        error.status = response.status;
        error.body = errorText;
        throw error;
      }

      return (await response.json()) as T;
    }

    public async getDigitalHumanDetail(): Promise<StudioDigitalHumanDetail | undefined> {
      try {
        return await (this as any).executeWithTokenRefresh(async () => {
          const response = await fetch(
            `${this.studioBaseUrl}/digital-human/${encodeURIComponent(
              this.studioAgentId
            )}`,
            {
              method: 'GET',
              headers: this.buildHeaders(),
            }
          );

          return this.parseJsonResponse<StudioDigitalHumanDetail>(
            response,
            'Studio 获取数字员工详情失败'
          );
        });
      } catch {
        return undefined;
      }
    }

    public async sendStudioMessage(
      text: string,
      attachments: StudioChatAttachment[],
      ctx: ApplicationContext,
      conversationID?: string,
      regenerateMessageId?: string
    ): Promise<ChatMessage> {
      const questionText = text.trim() || '请结合我上传的附件继续分析。';
      const messageText = buildContextText(questionText, ctx);
      const input = [
        {
          type: 'message',
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: messageText,
            },
          ],
        },
      ];

      const response = await (this as any).executeWithTokenRefresh(async () => {
        const controller = new AbortController();
        (this as any).currentStreamController = controller;

        const res = await fetch(`${this.studioBaseUrl}/chat/agent`, {
          method: 'POST',
          headers: {
            ...this.buildHeaders({
              includeSessionKey: conversationID,
            }),
            Accept: 'text/event-stream',
          },
          signal: controller.signal,
          body: JSON.stringify({
            input,
            ...(attachments.length > 0 ? { attachments } : {}),
          }),
        });

        if (!res.ok) {
          const errorText = await res.text();
          const error: any = new Error(
            `Studio chat 调用失败: ${res.status} ${errorText}`
          );
          error.status = res.status;
          error.body = errorText;
          throw error;
        }

        return res;
      });

      const assistantMessageId = regenerateMessageId || `assistant-${Date.now()}`;
      const initialAssistantMessage: ChatMessage = {
        messageId: assistantMessageId,
        content: [],
        role: {
          name: this.studioAssistantName,
          type: RoleType.ASSISTANT,
          avatar: '',
        },
      };

      if (regenerateMessageId) {
        (this as any).setState((prevState: any) => ({
          messages: prevState.messages.map((msg: ChatMessage) =>
            msg.messageId === regenerateMessageId ? initialAssistantMessage : msg
          ),
          streamingMessageId: assistantMessageId,
        }));
      } else {
        (this as any).setState((prevState: any) => ({
          messages: [...prevState.messages, initialAssistantMessage],
          streamingMessageId: assistantMessageId,
        }));
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法获取 Studio 流式响应');
      }

      await (this as any).handleStreamResponse(reader, assistantMessageId);

      const finalMessage = (this as any).state.messages.find(
        (msg: ChatMessage) => msg.messageId === assistantMessageId
      );

      return finalMessage || initialAssistantMessage;
    }

    public async uploadAttachment(
      file: File,
      conversationID?: string
    ): Promise<StudioChatAttachment> {
      let sessionKey = conversationID || (this as any).state?.conversationID || '';

      if (!sessionKey) {
        sessionKey = await this.generateConversation(file.name);
        if (sessionKey) {
          (this as any).setState({ conversationID: sessionKey });
        }
      }

      const formData = new FormData();
      formData.append('file', file);

      const result = await (this as any).executeWithTokenRefresh(async () => {
        const response = await fetch(`${this.studioBaseUrl}/chat/upload`, {
          method: 'POST',
          headers: this.buildHeaders({
            includeJson: false,
            includeSessionKey: sessionKey,
          }),
          body: formData,
        });

        return this.parseJsonResponse<{ name: string; path: string }>(
          response,
          'Studio 上传附件失败'
        );
      });

      return {
        type: 'input_file',
        source: {
          type: 'path',
          path: result.path,
        },
        name: result.name,
      };
    }

    public async sendWithAttachments(
      text: string,
      attachments: StudioChatAttachment[],
      ctx?: ApplicationContext,
      conversationID?: string
    ): Promise<ChatMessage> {
      const normalizedText = text.trim();
      if (!normalizedText && attachments.length === 0) {
        throw new Error('消息内容和附件不能同时为空');
      }

      if (ctx) {
        (this as any).setState({ applicationContext: ctx });
      }

      let currentConversationID = conversationID || (this as any).state.conversationID;
      if (!currentConversationID) {
        currentConversationID = await this.generateConversation(
          normalizedText || attachments[0]?.name || '新会话'
        );
        (this as any).setState({ conversationID: currentConversationID });
      }

      const finalContext =
        ctx ||
        (this as any).state.applicationContext ||
        (this as any).props.defaultApplicationContext || {
          title: '',
          data: {},
        };

      const userMessage = buildUserMessage(
        normalizedText,
        finalContext,
        attachments
      );

      (this as any).setState((prevState: any) => ({
        messages: [...prevState.messages, userMessage],
        isSending: true,
        textInput: '',
        pendingAttachments: [],
      }));

      try {
        const assistantMessage = await this.sendStudioMessage(
          normalizedText,
          attachments,
          finalContext,
          currentConversationID
        );

        (this as any).setState({
          isSending: false,
          streamingMessageId: null,
        });

        return assistantMessage;
      } catch (error) {
        (this as any).setState({
          isSending: false,
          streamingMessageId: null,
        });
        throw error;
      }
    }

    public async getOnboardingInfo(): Promise<OnboardingInfo> {
      const digitalHuman = await this.getDigitalHumanDetail();

      if (digitalHuman?.name?.trim()) {
        this.studioAssistantName = digitalHuman.name.trim();
      }

      return {
        prologue: buildStudioPrologue(
          digitalHuman?.name,
          digitalHuman?.creature
        ),
        predefinedQuestions: [],
      };
    }

    public async generateConversation(_title?: string): Promise<string> {
      const result = await (this as any).executeWithTokenRefresh(async () => {
        const response = await fetch(`${this.studioBaseUrl}/chat/session`, {
          method: 'POST',
          headers: this.buildHeaders({
            includeUserId: true,
          }),
          body: JSON.stringify({
            agentId: this.studioAgentId,
          }),
        });

        return this.parseJsonResponse<{ sessionKey: string }>(
          response,
          'Studio 创建会话失败'
        );
      });

      return result.sessionKey || '';
    }

    public createConversation = async (): Promise<void> => {
      (this as any).setState({ isLoadingOnboarding: true });

      try {
        const conversationID = await this.generateConversation();
        const onboardingInfo = await this.getOnboardingInfo();

        (this as any).setState({
          conversationID,
          messages: [],
          textInput: '',
          applicationContext: (this as any).props.defaultApplicationContext,
          isSending: false,
          streamingMessageId: null,
          onboardingInfo,
          pendingAttachments: [],
        });
      } finally {
        (this as any).setState({ isLoadingOnboarding: false });
      }
    };

    public async sendMessage(
      text: string,
      ctx: ApplicationContext,
      conversationID?: string,
      regenerateMessageId?: string
    ): Promise<ChatMessage> {
      return this.sendStudioMessage(text, [], ctx, conversationID, regenerateMessageId);
    }

    public reduceAssistantMessage<T = any, K = any>(
      eventMessage: T,
      prev: K,
      messageId: string
    ): K {
      const previousText = typeof prev === 'string' ? prev : '';

      try {
        const em = eventMessage as EventStreamMessage;
        const payload = JSON.parse(em.data);
        const eventType = em.event || payload.type || '';

        if (eventType === 'response.output_text.delta') {
          const delta = typeof payload.delta === 'string' ? payload.delta : '';
          const nextText = previousText + delta;
          (this as any).appendMarkdownBlock(messageId, nextText);
          return nextText as K;
        }

        if (eventType === 'response.output_text.done') {
          const nextText =
            typeof payload.text === 'string' && payload.text.trim()
              ? payload.text
              : previousText;
          (this as any).appendMarkdownBlock(messageId, nextText);
          return nextText as K;
        }

        if (eventType === 'response.output_item.done') {
          const itemText = normalizeTextFromContent(payload.item?.content);
          if (itemText) {
            (this as any).appendMarkdownBlock(messageId, itemText);
            return itemText as K;
          }
        }

        if (eventType === 'response.failed') {
          const errorMessage =
            payload.error?.message || payload.message || 'Studio 对话失败';
          const nextText = previousText
            ? `${previousText}\n\n${errorMessage}`
            : errorMessage;
          (this as any).appendMarkdownBlock(messageId, nextText);
          return nextText as K;
        }

        return previousText as K;
      } catch {
        return prev;
      }
    }

    public shouldRefreshToken(status: number, _error: any): boolean {
      return status === 401;
    }

    public async terminateConversation(_conversationId: string): Promise<void> {
      const controller = (this as any).currentStreamController as
        | AbortController
        | undefined;
      if (controller) {
        controller.abort();
        (this as any).currentStreamController = undefined;
      }
    }

    public async getConversations(
      _page: number = 1,
      size: number = 20
    ): Promise<ConversationHistory[]> {
      const query = new URLSearchParams();
      query.set('limit', String(size));
      query.set('agentId', this.studioAgentId);

      const result = await (this as any).executeWithTokenRefresh(async () => {
        const response = await fetch(
          `${this.studioBaseUrl}/sessions?${query.toString()}`,
          {
            method: 'GET',
            headers: this.buildHeaders(),
          }
        );

        return this.parseJsonResponse<StudioSessionsListResponse>(
          response,
          'Studio 获取历史会话失败'
        );
      });

      return (result.sessions || []).map(
        (session: NonNullable<StudioSessionsListResponse['sessions']>[number]) => ({
          conversationID: session.key,
          title: session.label || session.displayName || '未命名会话',
          created_at: session.updatedAt || 0,
          updated_at: session.updatedAt || 0,
        })
      );
    }

    public async getConversationMessages(
      conversationId: string
    ): Promise<ChatMessage[]> {
      const result = await (this as any).executeWithTokenRefresh(async () => {
        const response = await fetch(
          `${this.studioBaseUrl}/sessions/${encodeSessionKey(conversationId)}/messages`,
          {
            method: 'GET',
            headers: this.buildHeaders(),
          }
        );

        return this.parseJsonResponse<
          StudioSessionMessagesResponse | StudioChatMessagesResponse
        >(response, 'Studio 获取会话消息失败');
      });

      return (result.messages || []).map(normalizeStudioMessage);
    }

    public async deleteConversation(conversationID: string): Promise<void> {
      await (this as any).executeWithTokenRefresh(async () => {
        const response = await fetch(
          `${this.studioBaseUrl}/sessions/${encodeSessionKey(conversationID)}`,
          {
            method: 'DELETE',
            headers: this.buildHeaders(),
          }
        );

        if (!response.ok && response.status !== 204) {
          const errorText = await response.text();
          const error: any = new Error(
            `Studio 删除会话失败: ${response.status} ${errorText}`
          );
          error.status = response.status;
          error.body = errorText;
          throw error;
        }

        return response;
      });
    }
  };
}
