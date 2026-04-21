import React from 'react';
import { ApplicationContext } from '../../../types';
import { SendIcon, StopIcon } from '@/components/icons';

interface InputAreaProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  context?: ApplicationContext;
  onRemoveContext: () => void;
  disabled?: boolean;
  isStreaming?: boolean;
  onStop?: () => void;
}

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
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="px-[20px] pb-[12px] bg-white">
      <div className="relative h-[112px]">
        {context && context.title && (
          <div className="absolute top-0 left-[4px] right-[4px] bg-[rgba(18,110,227,0.04)] rounded-[8px] px-[16px] py-[8px] h-[40px] flex items-center">
            <p className="text-[12px] leading-[24px] text-[rgba(0,0,0,0.85)] truncate" style={{ fontFamily: 'Noto Sans SC' }}>
              {context.title}
            </p>
            <button
              onClick={onRemoveContext}
              className="ml-auto text-[rgba(0,0,0,0.45)] hover:text-[rgba(0,0,0,0.85)] transition-colors flex-shrink-0"
              title="移除上下文"
              type="button"
            >
              <svg className="w-[12px] h-[12px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <div
          className="absolute bg-white border-[1.5px] border-solid border-[#3b9be0] rounded-[16px] overflow-hidden"
          style={{
            top: context && context.title ? '48px' : '0',
            left: 0,
            right: 0,
            bottom: 0,
            background:
              'linear-gradient(#fff,#fff) padding-box, linear-gradient(45.59deg, #3B9BE0 -3.35%, #FFAA00 57.9%, rgba(50, 50, 50, 0.646918) 102.8%) border-box',
            border: '1.5px solid transparent',
          }}
        >
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

          {isStreaming ? (
            <button
              onClick={onStop}
              className="absolute bottom-[12px] right-[16px] w-[32px] h-[32px] flex items-center justify-center bg-[#126EE3] hover:bg-[#126EE3] rounded-[6px] transition-colors"
              title="停止响应"
              type="button"
            >
              <StopIcon />
            </button>
          ) : (
            <button
              onClick={onSend}
              disabled={disabled || !value.trim()}
              className="absolute bottom-[12px] right-[16px] w-[32px] h-[32px] flex items-center justify-center bg-[#126EE3] hover:bg-[#126EE3] rounded-md transition-colors disabled:opacity-25 disabled:cursor-not-allowed transition-opacity"
              title={disabled ? '正在发送...' : '发送消息'}
              type="button"
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
