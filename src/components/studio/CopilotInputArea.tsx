import React from 'react';
import { ApplicationContext } from '../../types';
import { ChatKitPendingAttachment } from '../base/ChatKitBase';
import { SendIcon, StopIcon } from '../icons';
import AttachmentSummaryBar from '../base/shared/AttachmentSummaryBar';

interface StudioCopilotInputAreaProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
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

const StudioCopilotInputArea: React.FC<StudioCopilotInputAreaProps> = ({
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
  const [isUploading, setIsUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const hasContent = Boolean(value.trim() || attachments.length > 0);
  const attachmentStripHeight = attachments.length > 0 ? 58 : 0;
  const composerHeight = 112 + attachmentStripHeight;
  const contextOffset = context?.title ? 48 : 0;
  const wrapperMinHeight = composerHeight + contextOffset;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
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
    <div className="bg-white px-[20px] pb-[12px]">
      <div className="relative" style={{ minHeight: `${wrapperMinHeight}px` }}>
        {context && context.title && (
          <div className="absolute left-[4px] right-[4px] top-0 flex h-[40px] items-center rounded-[8px] bg-[rgba(18,110,227,0.04)] px-[16px] py-[8px]">
            <p className="truncate text-[12px] leading-[24px] text-[rgba(0,0,0,0.85)]" style={{ fontFamily: 'Noto Sans SC' }}>
              {context.title}
            </p>
            <button
              onClick={onRemoveContext}
              className="ml-auto flex-shrink-0 text-[rgba(0,0,0,0.45)] transition-colors hover:text-[rgba(0,0,0,0.85)]"
              title="移除上下文"
              type="button"
            >
              <svg className="h-[12px] w-[12px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <div
          className="absolute overflow-hidden rounded-[16px] border-[1.5px] border-solid border-[#3b9be0] bg-white"
          style={{
            top: context?.title ? '48px' : '0',
            left: 0,
            right: 0,
            bottom: 0,
            background:
              'linear-gradient(#fff,#fff) padding-box, linear-gradient(45.59deg, #3B9BE0 -3.35%, #FFAA00 57.9%, rgba(50, 50, 50, 0.646918) 102.8%) border-box',
            border: '1.5px solid transparent',
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
            <div className="border-b border-[rgba(0,0,0,0.08)] bg-white px-[12px] pt-[12px] pb-[10px]">
              <AttachmentSummaryBar
                attachments={attachments}
                onRemoveAttachment={onRemoveAttachment}
                badgeTextMaxWidth={180}
              />
            </div>
          )}

          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="发送消息..."
            disabled={disabled}
            className="w-full h-[112px] resize-none px-[12px] pt-[12px] pb-[44px] text-[14px] leading-normal text-black placeholder:text-[rgba(0,0,0,0.25)] focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-50"
            style={{ fontFamily: 'Noto Sans, Noto Sans SC, Noto Sans JP, sans-serif' }}
            maxLength={4000}
          />

          {canUpload && (
            <button
              type="button"
              onClick={handlePickFiles}
              disabled={disabled || isUploading}
              className="absolute bottom-[12px] left-[12px] flex h-[32px] w-[32px] items-center justify-center rounded-[6px] text-[rgba(0,0,0,0.62)] transition-colors hover:bg-[rgba(18,110,227,0.08)] hover:text-[#126EE3] disabled:cursor-not-allowed disabled:opacity-40"
              title={isUploading ? '上传中...' : '上传附件'}
            >
              <AttachmentButtonIcon />
            </button>
          )}

          {isStreaming ? (
            <button
              onClick={onStop}
              className="absolute bottom-[12px] right-[16px] flex h-[32px] w-[32px] items-center justify-center rounded-[6px] bg-[#126EE3] transition-colors hover:bg-[#126EE3]"
              title="停止响应"
              type="button"
            >
              <StopIcon />
            </button>
          ) : (
            <button
              onClick={onSend}
              disabled={disabled || !hasContent}
              className="absolute bottom-[12px] right-[16px] flex h-[32px] w-[32px] items-center justify-center rounded-md bg-[#126EE3] transition-opacity hover:bg-[#126EE3] disabled:cursor-not-allowed disabled:opacity-25"
              title={disabled ? '正在发送...' : '发送消息'}
              type="button"
            >
              <SendIcon disabled={disabled || !hasContent} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudioCopilotInputArea;
