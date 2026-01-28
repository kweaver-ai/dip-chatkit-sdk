import React from 'react';
import { ApplicationContext } from '../../../types';
import { SendIcon, StopIcon } from '@/components/icons';

/**
 * InputArea 组件的属性接口
 */
interface InputAreaProps {
  /** 输入框的值 */
  value: string;

  /** 输入框值变化的回调 */
  onChange: (value: string) => void;

  /** 发送消息的回调 */
  onSend: () => void;

  /** 当前的应用上下文 */
  context?: ApplicationContext;

  /** 移除上下文的回调 */
  onRemoveContext: () => void;

  /** 是否禁用输入 */
  disabled?: boolean;

  /** 是否正在接收 AI 助手的流式响应 */
  isStreaming?: boolean;

  /** 停止当前流式响应的回调 */
  onStop?: () => void;
}

/**
 * InputArea 组件
 * 用户输入区域，包括上下文显示和输入框
 */
const InputArea: React.FC<InputAreaProps> = ({
  value,
  onChange,
  onSend,
  context,
  onRemoveContext,
  disabled = false,
  isStreaming = false,
  onStop,
}) => {
  /**
   * 处理键盘事件
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="px-[20px] pb-[12px] bg-white">
      {/* 整体输入容器 */}
      <div className="relative h-[112px]">
        {/* 上下文标签 */}
        {context && context.title && (
          <div className="absolute top-0 left-[4px] right-[4px] bg-[rgba(18,110,227,0.04)] rounded-[8px] px-[16px] py-[8px] h-[40px] flex items-center">
            <p className="text-[12px] leading-[24px] text-[rgba(0,0,0,0.85)] truncate" style={{ fontFamily: 'Noto Sans SC' }}>
              {context.title}
            </p>
            <button
              onClick={onRemoveContext}
              className="ml-auto text-[rgba(0,0,0,0.45)] hover:text-[rgba(0,0,0,0.85)] transition-colors flex-shrink-0"
              title="移除上下文"
            >
              <svg
                className="w-[12px] h-[12px]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}

        {/* 输入框容器 */}
        <div
          className="absolute bg-white border-[1.5px] border-solid border-[#3b9be0] rounded-[16px] overflow-hidden"
          style={{
            top: context && context.title ? '48px' : '0',
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(#fff,#fff) padding-box, linear-gradient(45.59deg, #3B9BE0 -3.35%, #FFAA00 57.9%, rgba(50, 50, 50, 0.646918) 102.8%) border-box',
            border: '1.5px solid transparent' 
          }}
        >
          {/* 输入框 */}
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="查询任何问题"
            disabled={disabled}
            className="w-full h-full resize-none px-[12px] py-[12px] text-[14px] leading-normal text-black placeholder:text-[rgba(0,0,0,0.25)] focus:outline-none disabled:bg-gray-50 disabled:cursor-not-allowed"
            style={{ fontFamily: 'Noto Sans, Noto Sans SC, Noto Sans JP, sans-serif' }}
            maxLength={4000}
          />

          {/* 发送按钮 / 停止按钮 */}
          {isStreaming ? (
            // 停止按钮：在接收 AI 流式响应时显示
            <button
              onClick={onStop}
              className="absolute bottom-[12px] right-[16px] w-[32px] h-[32px] flex items-center justify-center bg-[#126EE3] hover:bg-[#126EE3] rounded-[6px] transition-colors"
              title="停止响应"
            >
              <StopIcon />
            </button>
          ) : (
            // 发送按钮：正常状态下显示
            <button
              onClick={onSend}
              disabled={disabled || !value.trim()}
              className="absolute bottom-[12px] right-[16px] w-[32px] h-[32px] flex items-center justify-center bg-[#126EE3] hover:bg-[#126EE3] rounded-md transition-colors disabled:opacity-25 disabled:cursor-not-allowed transition-opacity"
              title={disabled ? '正在发送...' : '发送消息'}
            >
              <SendIcon disabled={disabled || !value.trim()} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default InputArea;
