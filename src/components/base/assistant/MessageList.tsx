import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChatMessage, RoleType } from '../../../types'
import MessageItem from './MessageItem'
import MessageShell from './MessageShell'
import HistoryChunkPlaceholder from './HistoryChunkPlaceholder'
import { useAnchoredMessageList } from './hooks/useAnchoredMessageList'

/**
 * MessageList 组件的属性接口
 */
interface MessageListProps {
  /** 消息列表 */
  messages: ChatMessage[]
  /** 当前正在流式更新的消息 ID */
  streamingMessageId?: string | null

  /** 助手信息 */
  agentAvatar?: string
  /** 重新生成回调函数 */
  onRegenerate?: (
    messageId: string,
    previousUserMessage: ChatMessage
  ) => Promise<void>
  /** 点击相关问题时的回调（用于继续提问） */
  onSelectQuestion?: (question: string) => void
}

const FOLLOW_BOTTOM_THRESHOLD = 80
/** 列表底部与输入区之间的留白（px） */
const BOTTOM_GAP = 24

/**
 * 单个聊天段（用户 + 对应助手回复）
 */
interface ChatChunk {
  id: string
  messageIds: string[]
  startIndex: number
  endIndex: number
}

const RECENT_MESSAGE_WINDOW = 150

const MessageList: React.FC<MessageListProps> = ({
  messages,
  streamingMessageId,
  agentAvatar,
  onRegenerate,
  onSelectQuestion,
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const isAtBottomRef = useRef<boolean>(true)
  const lastMessageIdRef = useRef<string | null>(null)

  const [expandedChunkIds, setExpandedChunkIds] = useState<Set<string>>(
    () => new Set()
  )

  // 计算当前会话中最后一条助手消息的下标
  const lastAssistantIndex = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role.type === RoleType.ASSISTANT) {
        return i
      }
    }
    return -1
  }, [messages])

  /**
   * 根据消息列表构建聊天段（按“用户 + 助手回复”分组）
   */
  const chunks = useMemo<ChatChunk[]>(() => {
    const result: ChatChunk[] = []
    if (!messages.length) return result

    let current: ChatChunk | null = null

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i]
      const isUser = msg.role.type === RoleType.USER

      if (isUser || !current) {
        // 开启新段
        const id = `chunk-${msg.messageId}`
        current = {
          id,
          messageIds: [msg.messageId],
          startIndex: i,
          endIndex: i,
        }
        result.push(current)
      } else {
        // 归入当前段
        current.messageIds.push(msg.messageId)
        current.endIndex = i
      }
    }

    return result
  }, [messages])

  /**
   * 计算哪些段需要展开为真实 DOM：默认展开最近 RECENT_MESSAGE_WINDOW 条消息覆盖到的段
   */
  const autoExpandedChunkIds = useMemo<Set<string>>(() => {
    const ids = new Set<string>()
    if (!chunks.length) return ids

    let remaining = RECENT_MESSAGE_WINDOW
    for (let i = chunks.length - 1; i >= 0 && remaining > 0; i--) {
      const chunk = chunks[i]
      ids.add(chunk.id)
      remaining -= chunk.messageIds.length
    }
    return ids
  }, [chunks])

  const effectiveExpandedChunkIds = useMemo(() => {
    const merged = new Set<string>(autoExpandedChunkIds)
    expandedChunkIds.forEach((id) => merged.add(id))
    return merged
  }, [autoExpandedChunkIds, expandedChunkIds])

  // 仅使用当前真实渲染的消息 ID 作为锚点计算的有序列表
  const visibleMessageIds = useMemo<string[]>(() => {
    if (!messages.length || !chunks.length) return []
    const ids: string[] = []
    chunks.forEach((chunk) => {
      const isExpanded = effectiveExpandedChunkIds.has(chunk.id)
      if (!isExpanded) {
        return
      }
      for (let i = chunk.startIndex; i <= chunk.endIndex; i++) {
        ids.push(messages[i].messageId)
      }
    })
    return ids
  }, [messages, chunks, effectiveExpandedChunkIds])

  const { handleMessageHeightChange, handleScroll, registerScrollContainer } =
    useAnchoredMessageList({
      getOrderedMessageIds: () => visibleMessageIds,
      shouldUseAnchor: () => !isAtBottomRef.current,
    })

  const combinedScrollHandler = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const el = e.currentTarget
      const distanceToBottom = el.scrollHeight - (el.scrollTop + el.clientHeight)
      isAtBottomRef.current = distanceToBottom <= FOLLOW_BOTTOM_THRESHOLD
      handleScroll(e)
    },
    [handleScroll]
  )

  const setScrollRef = useCallback(
    (el: HTMLDivElement | null) => {
      scrollRef.current = el
      registerScrollContainer(el)
    },
    [registerScrollContainer]
  )

  const handleExpandChunk = useCallback((chunkId: string) => {
    setExpandedChunkIds((prev) => {
      if (prev.has(chunkId)) return prev
      const next = new Set(prev)
      next.add(chunkId)
      return next
    })
  }, [])

  const findPreviousUserMessage = useCallback(
    (currentIndex: number): ChatMessage | null => {
      for (let i = currentIndex - 1; i >= 0; i--) {
        if (messages[i].role.type === RoleType.USER) {
          return messages[i]
        }
      }
      return null
    },
    [messages]
  )

  const handleRegenerate = useCallback(
    async (messageId: string, currentIndex: number) => {
      if (!onRegenerate) return
      const previousUserMessage = findPreviousUserMessage(currentIndex)
      if (!previousUserMessage) return
      await onRegenerate(messageId, previousUserMessage)
    },
    [onRegenerate, findPreviousUserMessage]
  )

  // 新消息出现且当前在底部时，滚到底部
  useEffect(() => {
    const el = scrollRef.current
    if (!el || !messages.length) return

    const lastMessage = messages[messages.length - 1]
    const lastId = lastMessage?.messageId ?? null
    const prevLastId = lastMessageIdRef.current
    lastMessageIdRef.current = lastId

    if (!isAtBottomRef.current) return
    if (prevLastId !== null && prevLastId === lastId) return

    requestAnimationFrame(() => {
      if (!scrollRef.current) return
      const { scrollHeight, clientHeight } = scrollRef.current
      scrollRef.current.scrollTop = Math.max(0, scrollHeight - clientHeight)
    })
  }, [messages.length, messages[messages.length - 1]?.messageId])

  // 流式输出时若在底部，随内容增长保持贴底（用 RAF 避免过于频繁）
  useEffect(() => {
    if (!messages.length || !scrollRef.current) return
    const last = messages[messages.length - 1]
    if (last?.messageId !== streamingMessageId) return
    if (!isAtBottomRef.current) return

    const raf = requestAnimationFrame(() => {
      if (!scrollRef.current) return
      const { scrollHeight, clientHeight } = scrollRef.current
      scrollRef.current.scrollTop = Math.max(0, scrollHeight - clientHeight)
    })
    return () => cancelAnimationFrame(raf)
  }, [messages, streamingMessageId])

  const renderedNodes = useMemo(() => {
    if (!messages.length || !chunks.length) return null

    const nodes: React.ReactNode[] = []

    chunks.forEach((chunk) => {
      const isExpanded = effectiveExpandedChunkIds.has(chunk.id)
      if (!isExpanded) {
        const count = chunk.messageIds.length
        nodes.push(
          <HistoryChunkPlaceholder
            key={chunk.id}
            messageCount={count}
            onExpand={() => handleExpandChunk(chunk.id)}
          />
        )
        return
      }

      for (let i = chunk.startIndex; i <= chunk.endIndex; i++) {
        const message = messages[i]
        const index = i
        nodes.push(
          <MessageShell
            key={message.messageId}
            messageId={message.messageId}
            onHeightChange={handleMessageHeightChange}
            className="flex flex-col gap-0"
          >
            <MessageItem
              message={message}
              isStreaming={message.messageId === streamingMessageId}
              agentAvatar={agentAvatar}
              onRegenerate={
                onRegenerate ? (id) => handleRegenerate(id, index) : undefined
              }
              isLastAssistantMessage={index === lastAssistantIndex}
              onSelectQuestion={onSelectQuestion}
            />
          </MessageShell>
        )
      }
    })

    return nodes
  }, [
    messages,
    chunks,
    effectiveExpandedChunkIds,
    handleExpandChunk,
    handleMessageHeightChange,
    streamingMessageId,
    agentAvatar,
    onRegenerate,
    lastAssistantIndex,
    onSelectQuestion,
  ])

  return (
    <div className="w-full flex flex-col items-center justify-center h-full min-h-0">
      <div
        ref={setScrollRef}
        className="w-full max-w-[960px] flex-1 min-h-0 overflow-y-auto overflow-x-hidden py-6"
        style={{ marginBottom: BOTTOM_GAP }}
        onScroll={combinedScrollHandler}
      >
        <div className="flex flex-col gap-6 flex-shrink-0">{renderedNodes}</div>
      </div>
    </div>
  )
}

export default MessageList
