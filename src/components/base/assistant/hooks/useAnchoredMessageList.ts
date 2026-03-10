import { useCallback, useEffect, useRef } from 'react'
import type React from 'react'

export interface ScrollAnchor {
  messageId: string
  offset: number
}

export interface UseAnchoredMessageListOptions {
  /** 消息按从上到下的顺序排列，用于根据高度表计算偏移（仅包含当前真实渲染的消息 ID） */
  getOrderedMessageIds: () => string[]
  /** 是否启用锚点恢复（例如在不贴底时才启用） */
  shouldUseAnchor?: () => boolean
}

export interface UseAnchoredMessageListResult {
  handleMessageHeightChange: (messageId: string, height: number) => void
  handleScroll: (e: React.UIEvent<HTMLDivElement>) => void
  registerScrollContainer: (el: HTMLDivElement | null) => void
  restoreScrollByAnchor: () => void
}

/**
 * 管理消息高度表与滚动锚点的 Hook
 * - 使用 ResizeObserver 上报的高度增量，结合锚点信息，在高度变化或上方插入消息时做滚动修正
 * - 内部使用 requestAnimationFrame 合并一帧内的多次高度变更，避免频繁 reflow
 */
export function useAnchoredMessageList(
  options: UseAnchoredMessageListOptions
): UseAnchoredMessageListResult {
  const { getOrderedMessageIds, shouldUseAnchor } = options

  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const anchorRef = useRef<ScrollAnchor | null>(null)

  // 使用 ref 存储高度表与待合并更新，避免频繁 setState
  const messageHeightsRef = useRef<Map<string, number>>(new Map())
  const pendingHeightsRef = useRef<Map<string, number>>(new Map())
  const rafIdRef = useRef<number | null>(null)

  const registerScrollContainer = useCallback((el: HTMLDivElement | null) => {
    scrollContainerRef.current = el
  }, [])

  /**
   * 根据当前高度表与消息顺序，计算某条消息顶部相对容器顶部的偏移
   */
  const computeMessageTop = useCallback(
    (messageId: string, heights: Map<string, number>): number | null => {
      const orderedIds = getOrderedMessageIds()
      if (!orderedIds.length) return null

      let top = 0
      for (let i = 0; i < orderedIds.length; i++) {
        const id = orderedIds[i]
        if (id === messageId) {
          return top
        }
        const h = heights.get(id)
        if (typeof h === 'number') {
          top += h
        }
      }
      return null
    },
    [getOrderedMessageIds]
  )

  const restoreScrollByAnchor = useCallback(() => {
    // 外部认为当前不需要锚点恢复时（例如列表正在贴底），直接跳过
    if (shouldUseAnchor && !shouldUseAnchor()) return

    const container = scrollContainerRef.current
    const anchor = anchorRef.current
    if (!container || !anchor) return

    const heights = messageHeightsRef.current
    const newTop = computeMessageTop(anchor.messageId, heights)
    if (newTop == null) return

    const nextScrollTop = Math.max(0, newTop - anchor.offset)
    container.scrollTop = nextScrollTop
  }, [computeMessageTop])

  /**
   * 一帧内批量合并高度变更，并做锚点滚动修正
   */
  const flushPendingHeights = useCallback(() => {
    rafIdRef.current = null
    if (!pendingHeightsRef.current.size) return

    const heights = new Map(messageHeightsRef.current)
    pendingHeightsRef.current.forEach((h, id) => {
      heights.set(id, h)
    })
    pendingHeightsRef.current.clear()
    messageHeightsRef.current = heights

    // 高度表更新后尝试基于锚点恢复滚动
    restoreScrollByAnchor()
  }, [restoreScrollByAnchor])

  const scheduleFlush = useCallback(() => {
    if (rafIdRef.current != null) return
    rafIdRef.current = window.requestAnimationFrame(flushPendingHeights)
  }, [flushPendingHeights])

  const handleMessageHeightChange = useCallback(
    (messageId: string, height: number) => {
      if (height <= 0) return
      pendingHeightsRef.current.set(messageId, height)
      scheduleFlush()
    },
    [scheduleFlush]
  )

  /**
   * 滚动时更新锚点：
   * - 寻找最接近视口顶部的消息
   * - 记录该消息 id 与其距离容器顶部的偏移
   */
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const container = e.currentTarget
      const scrollTop = container.scrollTop
      const heights = messageHeightsRef.current
      const orderedIds = getOrderedMessageIds()
      if (!orderedIds.length) return

      let cumulative = 0
      let anchorMessageId = orderedIds[0]
      let anchorOffset = 0

      for (let i = 0; i < orderedIds.length; i++) {
        const id = orderedIds[i]
        const h = heights.get(id) ?? 0
        const next = cumulative + h
        if (next > scrollTop) {
          anchorMessageId = id
          anchorOffset = scrollTop - cumulative
          break
        }
        cumulative = next
      }

      anchorRef.current = {
        messageId: anchorMessageId,
        offset: anchorOffset,
      }
    },
    [getOrderedMessageIds]
  )

  // 组件卸载时清理 RAF
  useEffect(() => {
    return () => {
      if (rafIdRef.current != null) {
        cancelAnimationFrame(rafIdRef.current)
      }
    }
  }, [])

  return {
    handleMessageHeightChange,
    handleScroll,
    registerScrollContainer,
    restoreScrollByAnchor,
  }
}

