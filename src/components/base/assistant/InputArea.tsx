import React from 'react';
import { ApplicationContext } from '../../../types';
import { CloseIcon, StopIcon, SendIcon } from '../../icons';
import TaskInProgress from './TaskInProgress';

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
    <div className="w-full flex justify-center pr-1.5">
      <div className="w-full max-w-[960px] px-5 pb-3">
      {/* 上下文标签 */}
      {context && context.title && (
        <div className="mb-2 bg-[rgba(18,110,227,0.04)] rounded-lg px-4 py-2 flex items-center">
          <p className="text-[12px] leading-6 text-[rgba(0,0,0,0.85)] truncate" style={{ fontFamily: 'Noto Sans SC' }}>
            {context.title}
          </p>
          <button
            onClick={onRemoveContext}
            className="ml-auto text-[rgba(0,0,0,0.45)] hover:text-[rgba(0,0,0,0.85)] transition-colors flex-shrink-0"
            title="移除上下文"
          >
            <CloseIcon />
          </button>
        </div>
      )}

      {/* 任务进行中提示 */}
      {isStreaming && (
        <div className="flex justify-center mb-[12px]">
          <TaskInProgress />
        </div>
      )}

      {/* 输入框容器 */}
      <div 
        className="relative bg-white rounded-[12px] overflow-hidden" 
        style={{ 
            background: 'linear-gradient(#fff,#fff) padding-box, linear-gradient(45.59deg, #3B9BE0 -3.35%, #FFAA00 57.9%, rgba(50, 50, 50, 0.646918) 102.8%) border-box',
            border: '1.5px solid transparent' 
          }}
      >
        {/* 输入框 */}
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="请输入要查找的内容"
          disabled={disabled}
          className="w-full h-[110px] resize-none px-4 py-3 text-[14px] leading-[22px] text-black placeholder:text-[rgba(0,0,0,0.3)] focus:outline-none disabled:bg-gray-50 disabled:cursor-not-allowed"
          style={{ fontFamily: 'Noto Sans SC' }}
          maxLength={4000}
        />

        {/* 发送按钮 / 停止按钮 */}
        {isStreaming ? (
          // 停止按钮：在接收 AI 流式响应时显示
          <button
            onClick={onStop}
            className="absolute bottom-3 right-4 w-8 h-8 flex items-center justify-center bg-[#126EE3] hover:bg-[#126EE3] rounded-md transition-colors"
            title="停止响应"
          >
            <StopIcon />
          </button>
        ) : (
          // 发送按钮：正常状态下显示
          <button
            onClick={onSend}
            disabled={disabled || !value.trim()}
            className="absolute bottom-3 right-4 w-8 h-8 flex items-center justify-center bg-[#126EE3] hover:bg-[#126EE3] rounded-md transition-colors disabled:opacity-25 disabled:cursor-not-allowed transition-opacity"
            title={disabled ? '正在发送...' : '发送消息'}
          >
            <SendIcon disabled={disabled || !value.trim()} />
          </button>
        )}
      </div>

      {/* 底部提示文字 */}
      <p className="mt-2 text-center text-[12px] leading-[18px] text-[rgba(0,0,0,0.55)]" style={{ fontFamily: 'Noto Sans SC' }}>
        回答的内容由 AI 生成，不能保证完全真实准确，请仔细甄别
      </p>
      </div>
    </div>
  );
};

export default InputArea;
