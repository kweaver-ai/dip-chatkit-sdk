import React, { useEffect, useRef } from 'react';
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

/**
 * MessageList 组件
 * 显示对话消息列表
 */
const MessageList: React.FC<MessageListProps> = ({ messages, streamingMessageId, agentAvatar, onRegenerate }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  console.log('messages', messages);

  /**
   * 自动滚动到底部
   */
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-[960px] px-5 py-3">
        {messages.map((message, index) => (
          <MessageItem 
            key={message.messageId} 
            message={message} 
            isStreaming={message.messageId === streamingMessageId}
            agentAvatar={agentAvatar}
            onRegenerate={onRegenerate ? (messageId) => handleRegenerate(messageId, index) : undefined}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default MessageList;
