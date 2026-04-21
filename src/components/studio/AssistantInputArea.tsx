import React from 'react';
import { ApplicationContext } from '../../types';
import { ChatKitPendingAttachment } from '../base/ChatKitBase';
import { CloseIcon, SendIcon } from '../icons';
import TaskInProgress from '../base/assistant/TaskInProgress';
import AttachmentSummaryBar from '../base/shared/AttachmentSummaryBar';

interface StudioAssistantInputAreaProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void | Promise<void>;
  context?: ApplicationContext;
  onRemoveContext: () => void;
  disabled?: boolean;
  isStreaming?: boolean;
  onStop?: () => void;
  attachments?: ChatKitPendingAttachment[];
  onUploadFiles?: (files: FileList | null) => void | Promise<void>;
  onRemoveAttachment?: (path: string) => void;
  canUpload?: boolean;
}

const AttachmentButtonIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M8.5 12.5L13.8 7.2C15.2 5.8 17.4 5.8 18.8 7.2C20.2 8.6 20.2 10.8 18.8 12.2L10.7 20.3C8.55 22.45 5.05 22.45 2.9 20.3C0.75 18.15 0.75 14.65 2.9 12.5L11.35 4.05"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const StopButton: React.FC<{ onClick?: () => void }> = ({ onClick }) => (
  <button
    onClick={onClick}
    className="absolute bottom-3 right-4 h-[32px] w-[32px] rounded-md transition-colors stop-button-loading"
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
);

const StudioAssistantInputArea: React.FC<StudioAssistantInputAreaProps> = ({
  value,
  onChange,
  onSend,
  context,
  onRemoveContext,
  disabled = false,
  isStreaming = false,
  onStop,
  attachments = [],
  onUploadFiles,
  onRemoveAttachment,
  canUpload = false,
}) => {
  const [isSending, setIsSending] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const hasContent = Boolean(value.trim() || attachments.length > 0);
  const attachmentStripHeight = attachments.length > 0 ? 58 : 0;

  const handleSend = async () => {
    if (isSending || !hasContent || disabled) {
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

  const handlePickFiles = () => {
    if (!canUpload || disabled || isUploading) {
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!onUploadFiles) {
      return;
    }

    try {
      setIsUploading(true);
      await onUploadFiles(event.target.files);
    } finally {
      event.target.value = '';
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full flex justify-center pr-1.5">
      <div className="w-full max-w-[960px] px-5 pb-3">
        {context && context.title && (
          <div className="mb-2 flex items-center rounded-lg bg-[rgba(18,110,227,0.04)] px-4 py-2">
            <p className="truncate text-[12px] leading-6 text-[rgba(0,0,0,0.85)]" style={{ fontFamily: 'Noto Sans SC' }}>
              {context.title}
            </p>
            <button
              onClick={onRemoveContext}
              className="ml-auto flex-shrink-0 text-[rgba(0,0,0,0.45)] transition-colors hover:text-[rgba(0,0,0,0.85)]"
              title="移除上下文"
              type="button"
            >
              <CloseIcon />
            </button>
          </div>
        )}

        {isStreaming && (
          <div className="mb-[12px] flex justify-center">
            <TaskInProgress />
          </div>
        )}

        <div
          className="relative overflow-hidden rounded-[12px] bg-white"
          style={{
            background:
              'linear-gradient(#fff,#fff) padding-box, linear-gradient(45.59deg, #3B9BE0 -3.35%, #FFAA00 57.9%, rgba(50, 50, 50, 0.646918) 102.8%) border-box',
            border: '1.5px solid transparent',
            minHeight: `${110 + attachmentStripHeight}px`,
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(event) => void handleFileChange(event)}
          />

          {attachments.length > 0 && (
            <div className="border-b border-[rgba(0,0,0,0.08)] bg-white px-4 pt-4 pb-3">
              <AttachmentSummaryBar
                attachments={attachments}
                onRemoveAttachment={onRemoveAttachment}
                badgeTextMaxWidth={220}
              />
            </div>
          )}

          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="发送消息..."
            disabled={disabled}
            className="w-full h-[110px] resize-none px-4 pt-3 pb-12 text-[14px] leading-[22px] text-black placeholder:text-[rgba(0,0,0,0.3)] focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-50"
            style={{ fontFamily: 'Noto Sans SC' }}
            maxLength={4000}
          />

          {canUpload && (
            <button
              type="button"
              onClick={handlePickFiles}
              disabled={disabled || isUploading}
              className="absolute bottom-3 left-4 flex h-8 w-8 items-center justify-center rounded-md text-[rgba(0,0,0,0.62)] transition-colors hover:bg-[rgba(18,110,227,0.08)] hover:text-[#126EE3] disabled:cursor-not-allowed disabled:opacity-40"
              title={isUploading ? '上传中...' : '上传附件'}
            >
              <AttachmentButtonIcon />
            </button>
          )}

          {isStreaming ? (
            <StopButton onClick={onStop} />
          ) : (
            <button
              onClick={() => void handleSend()}
              disabled={disabled || isSending || !hasContent}
              className="absolute bottom-3 right-4 flex h-8 w-8 items-center justify-center rounded-md bg-[#126EE3] transition-opacity hover:bg-[#126EE3] disabled:cursor-not-allowed disabled:opacity-25"
              title={disabled || isSending ? '正在发送...' : '发送消息'}
              type="button"
            >
              <SendIcon disabled={disabled || isSending || !hasContent} />
            </button>
          )}
        </div>

        <p className="mt-2 text-center text-[12px] leading-[18px] text-[rgba(0,0,0,0.55)]" style={{ fontFamily: 'Noto Sans SC' }}>
          答案由数字员工生成，请仔细甄别
        </p>
      </div>
    </div>
  );
};

export default StudioAssistantInputArea;
