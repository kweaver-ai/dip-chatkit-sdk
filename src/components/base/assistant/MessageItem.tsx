import React from 'react';
import { ChatMessage, RoleType, BlockType } from '../../../types';
import { TextBlock, MarkdownBlock, WebSearchBlock, Json2PlotBlock, ToolBlock } from './blocks';

/**
 * MessageItem 组件的属性接口
 */
interface MessageItemProps {
  /** 消息对象 */
  message: ChatMessage;
}

/**
 * MessageItem 组件
 * 显示单条消息
 */
const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const isUser = message.role.type === RoleType.USER;

  /**
   * 渲染消息内容块
   * 根据不同的 BlockType 使用不同的组件进行渲染
   */
  const renderContentBlocks = () => {
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
              case BlockType.JSON2PLOT:
                return <Json2PlotBlock key={index} block={block} />;
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
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      {/* AI 头像 (仅助手消息) */}
      {!isUser && (
        <div className="w-[21px] h-[21px] mr-2 flex-shrink-0 mt-1">
          <img src="/icons/assistant.svg" alt="AI Assistant" className="w-[21px] h-[21px]" />
        </div>
      )}

      <div className="flex flex-col gap-2 max-w-[calc(100%-40px)]">
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
          className={`rounded-[8px] ${
            isUser
              ? 'bg-[rgba(18,110,227,0.1)] text-[rgba(0,0,0,0.85)] px-[14px] py-[5px]'
              : 'bg-white text-black px-4 py-3'
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
