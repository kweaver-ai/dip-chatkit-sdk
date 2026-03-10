import React from 'react'

interface HistoryChunkPlaceholderProps {
  /** 此占位块包含的消息条数，用于展示提示文案 */
  messageCount: number
  /** 点击展开该历史段 */
  onExpand: () => void
}

/**
 * 历史段占位块
 * - 用于折叠更早的历史记录，减少真实 DOM 数量
 */
const HistoryChunkPlaceholder: React.FC<HistoryChunkPlaceholderProps> = ({
  messageCount,
  onExpand,
}) => {
  return (
    <div className="w-full flex justify-center my-2">
      <button
        type="button"
        onClick={onExpand}
        className="px-3 py-1 rounded-full bg-[rgba(0,0,0,0.04)] hover:bg-[rgba(0,0,0,0.08)] text-[12px] leading-[20px] text-[rgba(0,0,0,0.65)] transition-colors"
        style={{ fontFamily: 'Noto Sans SC' }}
      >
        展开更早的对话（共 {messageCount} 条）
      </button>
    </div>
  )
}

export default HistoryChunkPlaceholder

