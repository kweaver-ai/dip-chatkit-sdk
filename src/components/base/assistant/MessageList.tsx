import React, { useCallback, useEffect, useRef } from 'react';
import { ChatMessage, RoleType } from '../../../types';
import MessageItem from './MessageItem';

/**
 * MessageList 组件的属性接口
 */
interface MessageListProps {
  /** 消息列表 */
  messages: ChatMessage[];
  /** 当前正在流式更新的消息 ID */
  streamingMessageId?: string | null;

  /** 助手信息 */
  agentAvatar?: string;
  /** 重新生成回调函数 */
  onRegenerate?: (messageId: string, previousUserMessage: ChatMessage) => Promise<void>;
  /** 点击相关问题时的回调（用于继续提问） */
  onSelectQuestion?: (question: string) => void;
}

const FOLLOW_BOTTOM_THRESHOLD = 80;
/** 列表底部与输入区之间的留白（px） */
const BOTTOM_GAP = 24;

const MessageList: React.FC<MessageListProps> = ({
  messages,
  streamingMessageId,
  agentAvatar,
  onRegenerate,
  onSelectQuestion,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef<boolean>(true);
  const lastMessageIdRef = useRef<string | null>(null);

  // 计算当前会话中最后一条助手消息的下标
  const lastAssistantIndex = React.useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role.type === RoleType.ASSISTANT) {
        return i;
      }
    }
    return -1;
  }, [messages]);

  const findPreviousUserMessage = useCallback((currentIndex: number): ChatMessage | null => {
    for (let i = currentIndex - 1; i >= 0; i--) {
      if (messages[i].role.type === RoleType.USER) {
        return messages[i];
      }
    }
    return null;
  }, [messages]);

  const handleRegenerate = useCallback(
    async (messageId: string, currentIndex: number) => {
      if (!onRegenerate) return;
      const previousUserMessage = findPreviousUserMessage(currentIndex);
      if (!previousUserMessage) return;
      await onRegenerate(messageId, previousUserMessage);
    },
    [onRegenerate, findPreviousUserMessage]
  );

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - (el.scrollTop + el.clientHeight);
    isAtBottomRef.current = distanceToBottom <= FOLLOW_BOTTOM_THRESHOLD;
  }, []);

  // 新消息出现且当前在底部时，滚到底部
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !messages.length) return;

    const lastMessage = messages[messages.length - 1];
    const lastId = lastMessage?.messageId ?? null;
    const prevLastId = lastMessageIdRef.current;
    lastMessageIdRef.current = lastId;

    if (!isAtBottomRef.current) return;
    if (prevLastId !== null && prevLastId === lastId) return;

    requestAnimationFrame(() => {
      if (!scrollRef.current) return;
      const { scrollHeight, clientHeight } = scrollRef.current;
      scrollRef.current.scrollTop = Math.max(0, scrollHeight - clientHeight);
    });
  }, [messages.length, messages[messages.length - 1]?.messageId]);

  // 流式输出时若在底部，随内容增长保持贴底（用 RAF 避免过于频繁）
  useEffect(() => {
    if (!messages.length || !scrollRef.current) return;
    const last = messages[messages.length - 1];
    if (last?.messageId !== streamingMessageId) return;
    if (!isAtBottomRef.current) return;

    const raf = requestAnimationFrame(() => {
      if (!scrollRef.current) return;
      const { scrollHeight, clientHeight } = scrollRef.current;
      scrollRef.current.scrollTop = Math.max(0, scrollHeight - clientHeight);
    });
    return () => cancelAnimationFrame(raf);
  }, [messages, streamingMessageId]);

  return (
    <div className="w-full flex flex-col items-center justify-center h-full min-h-0">
      <div
        ref={scrollRef}
        className="w-full max-w-[960px] flex-1 min-h-0 overflow-y-auto overflow-x-hidden py-6"
        style={{ marginBottom: BOTTOM_GAP }}
        onScroll={handleScroll}
      >
        <div className="flex flex-col gap-6 flex-shrink-0">
          {messages.map((message, index) => (
            <MessageItem
              key={message.messageId}
              message={message}
              isStreaming={message.messageId === streamingMessageId}
              agentAvatar={agentAvatar}
              onRegenerate={
                onRegenerate ? (id) => handleRegenerate(id, index) : undefined
              }
              isLastAssistantMessage={index === lastAssistantIndex}
              onSelectQuestion={onSelectQuestion}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default MessageList;
