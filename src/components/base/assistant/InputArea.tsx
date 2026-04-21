import React from 'react';
import { ApplicationContext } from '../../../types';
import { CloseIcon, SendIcon } from '../../icons';
import TaskInProgress from './TaskInProgress';

interface InputAreaProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void | Promise<void>;
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
  const [isSending, setIsSending] = React.useState(false);

  const handleSend = async () => {
    if (isSending || !value.trim() || disabled) {
      return;
    }

    try {
      setIsSending(true);
      await onSend();
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className="w-full flex justify-center pr-1.5">
      <div className="w-full max-w-[960px] px-5 pb-3">
        {context && context.title && (
          <div className="mb-2 bg-[rgba(18,110,227,0.04)] rounded-lg px-4 py-2 flex items-center">
            <p className="text-[12px] leading-6 text-[rgba(0,0,0,0.85)] truncate" style={{ fontFamily: 'Noto Sans SC' }}>
              {context.title}
            </p>
            <button
              onClick={onRemoveContext}
              className="ml-auto text-[rgba(0,0,0,0.45)] hover:text-[rgba(0,0,0,0.85)] transition-colors flex-shrink-0"
              title="移除上下文"
              type="button"
            >
              <CloseIcon />
            </button>
          </div>
        )}

        {isStreaming && (
          <div className="flex justify-center mb-[12px]">
            <TaskInProgress />
          </div>
        )}

        <div
          className="relative bg-white rounded-[12px] overflow-hidden"
          style={{
            background:
              'linear-gradient(#fff,#fff) padding-box, linear-gradient(45.59deg, #3B9BE0 -3.35%, #FFAA00 57.9%, rgba(50, 50, 50, 0.646918) 102.8%) border-box',
            border: '1.5px solid transparent',
          }}
        >
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

          {isStreaming ? (
            <button
              onClick={onStop}
              className="absolute bottom-3 right-4 w-[32px] h-[32px] rounded-md transition-colors stop-button-loading"
              title="停止响应"
              type="button"
            >
              <div className="stop-button-outer">
                <div className="stop-button-ring" />
                <div className="stop-button-middle">
                  <div className="stop-button-inner" />
                </div>
              </div>
            </button>
          ) : (
            <button
              onClick={() => void handleSend()}
              disabled={disabled || isSending || !value.trim()}
              className="absolute bottom-3 right-4 w-8 h-8 flex items-center justify-center bg-[#126EE3] hover:bg-[#126EE3] rounded-md transition-colors disabled:opacity-25 disabled:cursor-not-allowed transition-opacity"
              title={disabled || isSending ? '正在发送...' : '发送消息'}
              type="button"
            >
              <SendIcon disabled={disabled || isSending || !value.trim()} />
            </button>
          )}
        </div>

        <p className="mt-2 text-center text-[12px] leading-[18px] text-[rgba(0,0,0,0.55)]" style={{ fontFamily: 'Noto Sans SC' }}>
          答案由大模型生成，请仔细甄别
        </p>
      </div>
    </div>
  );
};

export default InputArea;
