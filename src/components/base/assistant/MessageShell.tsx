import React, { useEffect, useRef } from 'react'

interface MessageShellProps {
  messageId: string
  onHeightChange?: (messageId: string, height: number) => void
  className?: string
  children: React.ReactNode
}

/**
 * MessageShell
 * - 包裹单条消息，负责通过 ResizeObserver 上报真实高度
 * - 不关心消息内容与交互本身
 */
const MessageShell: React.FC<MessageShellProps> = ({
  messageId,
  onHeightChange,
  className,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el || !onHeightChange) return

    const report = () => {
      const rect = el.getBoundingClientRect()
      if (rect.height > 0) {
        onHeightChange(messageId, rect.height)
      }
    }

    report()

    const observer = new ResizeObserver(() => {
      report()
    })
    observer.observe(el)

    return () => {
      observer.disconnect()
    }
  }, [messageId, onHeightChange])

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  )
}

export default MessageShell

