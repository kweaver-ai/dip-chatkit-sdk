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

  /** 助手信息 */
  agentAvatar?: string;
  /** 重新生成回调函数 */
  onRegenerate?: (messageId: string, previousUserMessage: ChatMessage) => Promise<void>;
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

const MessageList: React.FC<MessageListProps> = ({ messages, streamingMessageId, agentAvatar, onRegenerate }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<List>(null);
  const outerRef = useRef<HTMLDivElement | null>(null);
  const [listHeight, setListHeight] = useState<number>(0);
  const sizeMapRef = useRef<Record<string, number>>({});
  const isAtBottomRef = useRef<boolean>(true);

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
      console.warn('未找到上一条用户消息');
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

  const Row: React.FC<{ index: number; style: React.CSSProperties }> = ({ index, style }) => {
    const message = messages[index];
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
    }, [index, message]);

    if (!message) return null;

    return (
      <div style={style}>
        <div ref={rowRef} className="px-4">
          <MessageItem
            key={message.messageId}
            message={message}
            isStreaming={message.messageId === streamingMessageId}
            agentAvatar={agentAvatar}
            onRegenerate={onRegenerate ? (messageId) => handleRegenerate(messageId, index) : undefined}
          />
        </div>
      </div>
    );
  };

  const scrollAreaHeight = listHeight - CONTAINER_PADDING_VERTICAL_PX * 2;

  return (
    <div className="w-full flex justify-center h-full" ref={containerRef}>
      <div className="w-full max-w-[960px] h-full py-[24px]">
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
              <Row index={index} style={style} />
            )}
          </List>
        )}
      </div>
    </div>
  );
};

export default MessageList;
