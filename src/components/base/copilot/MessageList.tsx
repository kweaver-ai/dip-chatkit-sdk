import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { VariableSizeList as List, ListOnScrollProps } from 'react-window';
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
  /** 重新生成回调函数 */
  onRegenerate?: (messageId: string, previousUserMessage: ChatMessage) => Promise<void>;
  /** 点击相关问题时的回调（用于继续提问） */
  onSelectQuestion?: (question: string) => void;
}

/** List 外层滚动容器 */
const ScrollOuter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  (props, ref) => <div ref={ref} {...props} />
);
ScrollOuter.displayName = 'ScrollOuter';

const ESTIMATED_ITEM_SIZE = 120;
const FOLLOW_BOTTOM_THRESHOLD = 80;
/** 列表底部与输入区之间的留白（px） */
const BOTTOM_GAP = 24;
/** 当前容器纵向 padding（px），用 Tailwind py-[24px] 实现 */
const CONTAINER_PADDING_VERTICAL_PX = 24;

/**
 * 单行消息组件（抽离到外部，避免在 MessageList 内联定义导致流式时每轮 re-render 都生成新组件类型，
 * 进而造成所有行 unmount/remount 和 useLayoutEffect 重复执行，触发 Maximum update depth exceeded）
 */
interface MessageRowProps {
  index: number;
  style: React.CSSProperties;
  message: ChatMessage | undefined;
  streamingMessageId: string | null | undefined;
  onRegenerateClick: ((messageId: string) => Promise<void>) | undefined;
  isLastAssistantMessage: boolean;
  onSelectQuestion?: (question: string) => void;
  sizeMapRef: React.MutableRefObject<Record<string, number>>;
  listRef: React.RefObject<List | null>;
}
const MessageRow: React.FC<MessageRowProps> = ({
  index,
  style,
  message,
  streamingMessageId,
  onRegenerateClick,
  isLastAssistantMessage,
  onSelectQuestion,
  sizeMapRef,
  listRef,
}) => {
  const rowRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const element = rowRef.current;
    if (!element || !message) return;

    const measure = () => {
      const rect = element.getBoundingClientRect();
      if (!rect.height) return;

      const prevSize = sizeMapRef.current[message.messageId];
      if (prevSize !== rect.height) {
        sizeMapRef.current[message.messageId] = rect.height;
        if (listRef.current) {
          listRef.current.resetAfterIndex(index);
        }
      }
    };

    measure();

    const resizeObserver = new ResizeObserver(() => {
      measure();
    });

    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, [index, message?.messageId, sizeMapRef, listRef]);

  if (!message) return null;

  return (
    <div style={style}>
      <div ref={rowRef} className="px-4">
        <MessageItem
          key={message.messageId}
          message={message}
          isStreaming={message.messageId === streamingMessageId}
          onRegenerate={onRegenerateClick}
          isLastAssistantMessage={isLastAssistantMessage}
          onSelectQuestion={onSelectQuestion}
        />
      </div>
    </div>
  );
};

const MessageList: React.FC<MessageListProps> = ({
  messages,
  streamingMessageId,
  onRegenerate,
  onSelectQuestion,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<List>(null);
  const outerRef = useRef<HTMLDivElement | null>(null);
  const [listHeight, setListHeight] = useState<number>(0);
  const sizeMapRef = useRef<Record<string, number>>({});
  const isAtBottomRef = useRef<boolean>(true);

  const lastAssistantIndex = React.useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role.type === RoleType.ASSISTANT) {
        return i;
      }
    }
    return -1;
  }, [messages]);

  const updateContainerHeight = () => {
    const el = containerRef.current?.parentElement;
    if (!el) return;
    const height = Math.max(0, el.clientHeight - BOTTOM_GAP);
    setListHeight(height);
  };

  useLayoutEffect(() => {
    updateContainerHeight();
    const parent = containerRef.current?.parentElement;
    if (!parent) return;

    const ro = new ResizeObserver(() => updateContainerHeight());
    ro.observe(parent);
    return () => ro.disconnect();
  }, []);

  /**
   * 查找上一条用户消息
   */
  const findPreviousUserMessage = (currentIndex: number): ChatMessage | null => {
    for (let i = currentIndex - 1; i >= 0; i--) {
      if (messages[i].role.type === RoleType.USER) {
        return messages[i];
      }
    }
    return null;
  };

  /**
   * 处理重新生成
   */
  const handleRegenerate = async (messageId: string, currentIndex: number) => {
    if (!onRegenerate) return;
    
    const previousUserMessage = findPreviousUserMessage(currentIndex);
    if (!previousUserMessage) {
      return;
    }

    await onRegenerate(messageId, previousUserMessage);
  };

  const getItemSize = (index: number) => {
    const message = messages[index];
    if (!message) return ESTIMATED_ITEM_SIZE;
    return sizeMapRef.current[message.messageId] || ESTIMATED_ITEM_SIZE;
  };

  const handleScroll = (props: ListOnScrollProps) => {
    const { scrollUpdateWasRequested } = props;
    if (!outerRef.current || !listHeight) return;

    const outer = outerRef.current;
    const scrollHeight = outer.scrollHeight;
    const distanceToBottom = scrollHeight - (outer.scrollTop + outer.clientHeight);

    if (!scrollUpdateWasRequested) {
      isAtBottomRef.current = distanceToBottom <= FOLLOW_BOTTOM_THRESHOLD;
    }
  };

  useEffect(() => {
    if (!listRef.current || !messages.length || !listHeight) return;

    if (isAtBottomRef.current) {
      listRef.current.scrollToItem(messages.length - 1, 'end');
    }
  }, [messages, listHeight]);

  useEffect(() => {
    sizeMapRef.current = {};
    if (listRef.current) {
      listRef.current.resetAfterIndex(0, true);
    }
  }, []);

  const scrollAreaHeight = listHeight - CONTAINER_PADDING_VERTICAL_PX * 2;

  return (
    <div className="h-full py-[24px]" ref={containerRef}>
      {listHeight > CONTAINER_PADDING_VERTICAL_PX * 2 && (
        <List
          ref={listRef}
          outerRef={outerRef}
          outerElementType={ScrollOuter}
          height={scrollAreaHeight}
          itemCount={messages.length}
          itemSize={getItemSize}
          width="100%"
          overscanCount={8}
          onScroll={handleScroll}
        >
          {({ index, style }: { index: number; style: React.CSSProperties }) => (
            <MessageRow
              index={index}
              style={style}
              message={messages[index]}
              streamingMessageId={streamingMessageId}
              onRegenerateClick={onRegenerate ? (messageId) => handleRegenerate(messageId, index) : undefined}
              isLastAssistantMessage={index === lastAssistantIndex}
              onSelectQuestion={onSelectQuestion}
              sizeMapRef={sizeMapRef}
              listRef={listRef}
            />
          )}
        </List>
      )}
    </div>
  );
};

export default MessageList;
