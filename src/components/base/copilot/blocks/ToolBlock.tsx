import React, { useState } from 'react';
import { ToolBlock as ToolBlockType } from '../../../../types';
import ToolDrawer from './ToolDrawer';
import { BlockRegistry } from '../../../../utils/BlockRegistry';

/**
 * ToolBlock 组件的属性接口
 */
export interface ToolBlockProps {
  /** 工具块数据 */
  block: ToolBlockType;
}

/**
 * ToolBlock 组件
 * 用于在消息流中渲染工具调用块的通用组件
 * 支持传入自定义图标和标题，并可点击右侧箭头查看详情
 * 
 * 根据设计文档（ChatKit for DIP.pdf）的 Block工具处理流程：
 * 1. 获取已注册工具名称
 * 2. 判断当前 skill_name 是否在注册的工具中
 * 3. 如果已注册，使用注册信息的部分内容作为 ToolBlock 的参数
 * 4. 如果未注册，使用内置工具作为参数
 */
const ToolBlock: React.FC<ToolBlockProps> = ({ block }) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { icon, title, name, input, output } = block.content;

  // 根据设计文档流程：判断当前 skill_name 是否在注册的工具中
  const isRegistered = BlockRegistry.hasTool(name);
  const registration = isRegistered ? BlockRegistry.getTool(name) : undefined;

  // 使用注册的 Icon，如果没有则使用 block.content.icon
  const displayIcon = registration?.Icon || icon;

  /**
   * 渲染工具图标
   */
  const renderIcon = () => {
    if (!displayIcon) {
      return null;
    }

    // 如果是字符串，作为图片 URL 渲染
    if (typeof displayIcon === 'string') {
      return (
        <img
          src={displayIcon}
          alt={name}
          className="w-5 h-5 flex-shrink-0"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      );
    }

    // 如果是 React 元素，直接渲染
    return <div className="w-5 h-5 flex-shrink-0">{displayIcon}</div>;
  };

  /**
   * 处理点击事件
   * 根据设计文档流程：判断是否打开详情
   * - 如果来自注册工具且有 onClick，调用注册点击事件
   * - 否则使用内置详情模块
   */
  const handleClick = () => {
    // 判断是否来自注册工具
    if (isRegistered && registration?.onClick) {
      // 调用注册点击事件
      registration.onClick(block as Record<string, any>);
    } else {
      // 使用内置详情模块
      setIsDrawerOpen(true);
    }
  };

  return (
    <>
      {/* 工具块主体 */}
      <div className="tool-block bg-white border border-[#d9d9d9] rounded-[6px] my-2">
        <div
          className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={handleClick}
        >
          {/* 左侧：图标 + 标题 */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {renderIcon()}
            <span className="text-sm text-[rgba(0,0,0,0.65)] truncate">
              {title}
            </span>
          </div>

          {/* 右侧：箭头图标 */}
          <div className="flex items-center justify-center w-4 h-4 flex-shrink-0">
            <svg
              className="w-4 h-4 text-gray-400"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M9 18L15 12L9 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* 工具详情抽屉 - 仅在未注册 onClick 时显示 */}
      {!(isRegistered && registration?.onClick) && (
        <ToolDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          toolName={name}
          toolTitle={title}
          toolIcon={displayIcon}
          input={input}
          output={output}
        />
      )}
    </>
  );
};

export default ToolBlock;
