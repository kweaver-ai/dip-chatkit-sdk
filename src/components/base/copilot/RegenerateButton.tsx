import React from 'react';
import { RefreshIcon } from '../../icons';

/**
 * RegenerateButton 组件的属性接口
 */
export interface RegenerateButtonProps {
  /** 当前助手消息的 ID */
  messageId: string;
  /** 点击重新生成的回调函数 */
  onRegenerate: (messageId: string) => Promise<void>;
  /** 是否禁用按钮（例如：正在重新生成时） */
  disabled?: boolean;
  /** 自定义样式类名 */
  className?: string;
}

/**
 * RegenerateButton 组件
 * 重新生成按钮，用于重新生成助手消息
 */
const RegenerateButton: React.FC<RegenerateButtonProps> = ({
  messageId,
  onRegenerate,
  disabled = false,
  className = '',
}) => {
  const handleClick = async () => {
    if (disabled) return;
    
    try {
      await onRegenerate(messageId);
    } catch (error) {
      console.error('重新生成失败:', error);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`flex items-center justify-center w-[24px] h-[24px] rounded hover:bg-[rgba(0,0,0,0.05)] ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
      title="重新生成"
    >
      <RefreshIcon className="w-[14px] h-[14px] text-[rgba(0,0,0,0.45)]" />
    </button>
  );
};

export default RegenerateButton;
