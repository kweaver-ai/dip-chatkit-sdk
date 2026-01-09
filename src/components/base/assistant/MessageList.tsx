import React, { useEffect, useRef } from 'react';
import { ChatMessage } from '../../../types';
import MessageItem from './MessageItem';

/**
 * MessageList 组件的属性接口
 */
interface MessageListProps {
  /** 消息列表 */
  messages: ChatMessage[];
  /** 当前正在流式更新的消息 ID */
  streamingMessageId?: string | null;
}

/**
 * MessageList 组件
 * 显示对话消息列表
 */
const MessageList: React.FC<MessageListProps> = ({ messages, streamingMessageId }) => {
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

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-[960px] px-5 py-3">
        {messages.map((message) => (
          <MessageItem 
            key={message.messageId} 
            message={message} 
            isStreaming={message.messageId === streamingMessageId}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default MessageList;
