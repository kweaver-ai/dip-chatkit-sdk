import React from 'react'

export interface MessageStatsBarProps {
  /** 本次回答耗时（秒） */
  elapsedSeconds?: number
  /** 本次回答 Token 总数 */
  totalTokens?: number
  /** 自定义样式类名 */
  className?: string
}

/**
 * 消息统计信息组件
 * 在消息底部展示耗时和 Token 总数
 */
const MessageStatsBar: React.FC<MessageStatsBarProps> = ({
  elapsedSeconds,
  totalTokens,
  className = '',
}) => {
  if (elapsedSeconds == null && totalTokens == null) {
    return null
  }

  const parts: string[] = []

  if (elapsedSeconds != null) {
    const seconds = Math.max(0, elapsedSeconds)
    const formatted = seconds.toFixed(2)
    parts.push(`耗时: ${formatted}s`)
  }

  if (totalTokens != null) {
    const formattedTokens = totalTokens.toLocaleString('en-US')
    parts.push(`Token: ${formattedTokens}`)
  }

  return (
    <div
      className={`flex items-center text-[12px] text-[rgba(0,0,0,0.45)] ${className}`}
      style={{ fontFamily: 'Noto Sans SC' }}
    >
      <span className="leading-[20px] whitespace-nowrap">{parts.join(' ')}</span>
    </div>
  )
}

export default MessageStatsBar

