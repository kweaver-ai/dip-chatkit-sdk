import React from 'react';
import { ChatMessage, RoleType, BlockType } from '../../../types';
import { TextBlock, MarkdownBlock, WebSearchBlock, ToolBlock } from './blocks';
import { AssistantIcon } from '../../icons';

/**
 * MessageItem 组件的属性接口
 */
interface MessageItemProps {
  /** 消息对象 */
  message: ChatMessage;
  /** 是否正在流式更新 */
  isStreaming?: boolean;
}

/**
 * MessageItem 组件
 * 显示单条消息
 */
const MessageItem: React.FC<MessageItemProps> = ({ message, isStreaming = false }) => {
  const isUser = message.role.type === RoleType.USER;

  /**
   * 检查消息是否有实际内容
   */
  const hasContent = () => {
    if (Array.isArray(message.content)) {
      // 检查是否有非空的内容块
      return message.content.some(block => {
        if (block.type === BlockType.TEXT || block.type === BlockType.MARKDOWN) {
          return (block.content as string)?.trim().length > 0;
        }
        return true; // 其他类型的块都认为有内容
      });
    }
    // 字符串类型的内容
    return (message.content as unknown as string)?.trim().length > 0;
  };

  /**
   * 渲染预加载 UI
   */
  const renderLoadingPlaceholder = () => {
    return (
      <span className="shiny-text text-[14px]" style={{ fontFamily: 'Noto Sans SC' }}>
        正在思考...
      </span>
    );
  };

  /**
   * 渲染消息内容块
   * 根据不同的 BlockType 使用不同的组件进行渲染
   */
  const renderContentBlocks = () => {
    // 如果正在流式更新且没有内容，显示预加载 UI
    if (isStreaming && !hasContent()) {
      return renderLoadingPlaceholder();
    }

    // 如果 content 是数组，则渲染 Block 数组
    if (Array.isArray(message.content)) {
      return (
        <div className="space-y-2">
          {message.content.map((block, index) => {
            switch (block.type) {
              case BlockType.TEXT:
                return <TextBlock key={index} block={block} />;
              case BlockType.MARKDOWN:
                return <MarkdownBlock key={index} block={block} />;
              case BlockType.WEB_SEARCH:
                return <WebSearchBlock key={index} block={block} />;
              case BlockType.TOOL:
                return <ToolBlock key={index} block={block} />;
              default:
                return null;
            }
          })}
        </div>
      );
    }

    // 向后兼容：如果 content 是字符串，则按文本渲染
    return (
      <p className="text-[14px] whitespace-pre-wrap break-words leading-[24px]">
        {message.content as unknown as string}
      </p>
    );
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6`}>
      {/* AI 头像 (仅助手消息) */}
      {!isUser && (
        <div className="w-[21px] h-[21px] mr-2 flex-shrink-0">
          <AssistantIcon className="w-[21px] h-[21px]" />
        </div>
      )}

      <div className={`flex flex-col gap-2 ${isUser ? 'max-w-[calc(100%-40px)]' : 'w-full' }`}>
        {/* 如果用户消息包含应用上下文，在消息内容中显示 */}
        {isUser && message.applicationContext && message.applicationContext.title && (
          <div className="self-end">
            <span className="inline-block bg-[rgba(18,110,227,0.04)] rounded-[8px] px-[14px] py-[5px] text-[12px] leading-[24px] text-[rgba(0,0,0,0.85)]" style={{ fontFamily: 'Noto Sans SC' }}>
              {message.applicationContext.title}
            </span>
          </div>
        )}

        {/* 消息内容 */}
        <div
          className={`rounded-[6px] ${
            isUser
              ? 'bg-[rgba(18,110,227,0.1)] text-[rgba(0,0,0,0.85)] px-[14px] py-[5px]'
              : 'bg-white text-black'
          }`}
          style={{ fontFamily: 'Noto Sans SC' }}
        >
          {renderContentBlocks()}
        </div>
      </div>
    </div>
  );
};

export default MessageItem;
