import React, { useState } from 'react'
import { ChatMessage, RoleType, BlockType } from '../../../types'
import { TextBlock, MarkdownBlock, WebSearchBlock, Json2PlotBlock, ToolBlock } from './blocks'
import Avatar from '@/components/Avatar'
import { AssistantIcon, CopyIcon } from '../../icons'
import { copyMessageContent } from '../../../utils/copyMessage'
import RegenerateButton from './RegenerateButton'
import MessageStatsBar from './MessageStatsBar'
import RelatedQuestions from './RelatedQuestions'

/**
 * MessageItem 组件的属性接口
 */
interface MessageItemProps {
  /** 消息对象 */
  message: ChatMessage
  /** 是否正在流式更新 */
  isStreaming?: boolean
  /** 助手信息 */
  agentAvatar?: string
  /** 重新生成回调函数 */
  onRegenerate?: (messageId: string) => Promise<void>
  /** 是否为最后一条助手消息（用于展示相关问题） */
  isLastAssistantMessage?: boolean
  /** 点击相关问题时的回调（用于继续提问） */
  onSelectQuestion?: (question: string) => void
}

/**
 * MessageItem 组件
 * 显示单条消息
 */
const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isStreaming = false,
  agentAvatar,
  onRegenerate,
  isLastAssistantMessage = false,
  onSelectQuestion,
}) => {
  const isUser = message.role.type === RoleType.USER
  const [copySuccess, setCopySuccess] = useState(false)

  /**
   * 检查消息是否有实际内容
   */
  const hasContent = () => {
    if (Array.isArray(message.content)) {
      // 检查是否有非空的内容块
      return message.content.some((block) => {
        if (
          block.type === BlockType.TEXT ||
          block.type === BlockType.MARKDOWN
        ) {
          return (block.content as string)?.trim().length > 0
        }
        return true // 其他类型的块都认为有内容
      })
    }
    // 字符串类型的内容
    return (message.content as unknown as string)?.trim().length > 0
  }

  /**
   * 复制消息内容（支持富文本和纯文本）
   */
  const handleCopy = async () => {
    const success = await copyMessageContent(message)
    if (success) {
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 1000)
    }
  }

  /**
   * 渲染预加载 UI
   */
  const renderLoadingPlaceholder = () => {
    return (
      <span
        className="shiny-text text-[14px]"
        style={{ fontFamily: 'Noto Sans SC' }}
      >
        正在思考...
      </span>
    )
  }

  /**
   * 判断是否为「相关问题」的重复文本块（来自后端通过 content 下发的 related_queries，已在 messageContext.relatedQuestions 中展示，不再用 TextBlock/MarkdownBlock 渲染）
   */
  const isRelatedQuestionsBlock = (
    block: { type: string; content: unknown },
    relatedQuestions: string[] | undefined
  ): boolean => {
    // 仅 TEXT / MARKDOWN 类型才可能是相关问题块
    if (
      block.type !== BlockType.TEXT &&
      block.type !== BlockType.MARKDOWN
    ) {
      return false
    }

    const s = typeof block.content === 'string' ? block.content.trim() : ''
    if (!s) return false

    try {
      const arr = JSON.parse(s) as unknown
      if (!Array.isArray(arr)) return false

      // 场景 1：后端给了一个 "[]" 的 JSON 字符串，但前端没有 relatedQuestions，
      // 这时我们认为它是「空的相关问题占位」，不需要渲染出来。
      if (!relatedQuestions?.length) {
        return arr.length === 0
      }

      // 场景 2：后端把 related_queries 以 JSON 数组字符串的形式放在 content 里，
      // 并且我们已经通过 messageContext.relatedQuestions 展示了，这里就不再渲染。
      if (arr.length !== relatedQuestions.length) return false
      return arr.every((x, i) => x === relatedQuestions[i])
    } catch {
      return false
    }
  }

  /**
   * 渲染消息内容块
   * 根据不同的 BlockType 使用不同的组件进行渲染
   * 注意：与 messageContext.relatedQuestions 重复的 TEXT/MARKDOWN 块不渲染，由 RelatedQuestions 组件单独展示
   */
  const renderContentBlocks = () => {
    // 如果正在流式更新且没有内容，显示预加载 UI
    if (isStreaming && !hasContent()) {
      return renderLoadingPlaceholder()
    }

    // 如果 content 是数组，则渲染 Block 数组
    if (Array.isArray(message.content)) {
      const relatedQuestions = message.messageContext?.relatedQuestions
      return (
        <div className="space-y-2">
          {message.content.map((block, index) => {
            if (isRelatedQuestionsBlock(block, relatedQuestions)) return null
            switch (block.type) {
              case BlockType.TEXT:
                return <TextBlock key={index} block={block} />
              case BlockType.MARKDOWN:
                return <MarkdownBlock key={index} block={block} />
              case BlockType.WEB_SEARCH:
                return <WebSearchBlock key={index} block={block} />
              case BlockType.JSON2PLOT:
                return <Json2PlotBlock key={index} block={block} />
              case BlockType.TOOL:
                return <ToolBlock key={index} block={block} />
              default:
                return null
            }
          })}
        </div>
      )
    }

    // 向后兼容：如果 content 是字符串，则按文本渲染
    return (
      <p className="text-[14px] whitespace-pre-wrap break-words leading-[24px]">
        {message.content as unknown as string}
      </p>
    )
  }

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-2 group`}
    >
      {/* AI 头像 (仅助手消息) */}
      {!isUser && (
        <div className="w-[21px] h-[21px] mr-2 flex-shrink-0">
          {agentAvatar ? (
            <Avatar name={agentAvatar} className="w-[21px] h-[21px]" />
          ) : (
            <AssistantIcon className="w-[21px] h-[21px]" />
          )}
        </div>
      )}

      <div
        className={`flex flex-col gap-2 ${
          isUser ? 'max-w-[calc(100%-30px)]' : 'w-[calc(100%-30px)]'
        }`}
      >
        {/* 如果用户消息包含应用上下文，在消息内容中显示 */}
        {isUser &&
          message.applicationContext &&
          message.applicationContext.title && (
            <div className="self-end">
              <span
                className="inline-block bg-[rgba(18,110,227,0.04)] rounded-[8px] px-[14px] py-[5px] text-[12px] leading-[24px] text-[rgba(0,0,0,0.85)]"
                style={{ fontFamily: 'Noto Sans SC' }}
              >
                {message.applicationContext.title}
              </span>
            </div>
          )}

        {/* 消息内容 */}
        <div
          className={`rounded-[6px] ${
            isUser
              ? 'bg-[#DBE8FF] text-[rgba(0,0,0,0.85)] px-[14px] py-[5px]'
              : 'bg-white text-black'
          }`}
          style={{ fontFamily: 'Noto Sans SC' }}
        >
          {renderContentBlocks()}
      
        </div>

        {/* 底部操作区：复制 / 重新生成 / 统计信息 */}
        {!isUser && !isStreaming && hasContent() && (
           <div className="flex items-center justify-between gap-2">
           <div className="flex items-center gap-2">
             {/* 复制按钮 */}
             <button
               onClick={handleCopy}
               className="flex items-center justify-center w-[24px] h-[24px] rounded hover:bg-[rgba(0,0,0,0.05)]"
               title={copySuccess ? '已复制' : '复制'}
             >
               <CopyIcon
                 className={`w-[14px] h-[14px] ${
                   copySuccess ? 'text-[#126EE3]' : 'text-[rgba(0,0,0,0.45)]'
                 }`}
               />
             </button>

             {/* 重新生成按钮（仅助手消息） */}
             {onRegenerate && isLastAssistantMessage && (
               <RegenerateButton
                 messageId={message.messageId}
                 onRegenerate={onRegenerate}
                 disabled={isStreaming}
               />
             )}
           </div>

           {/* 耗时 & Token 统计信息（仅助手消息） */}
           <MessageStatsBar
             elapsedSeconds={message.messageContext?.elapsedSeconds}
             totalTokens={message.messageContext?.totalTokens}
           />
         </div>
        )}

        {/* 相关问题（仅最后一条助手消息、非流式中且有待展示时） */}
        {!isUser && isLastAssistantMessage && !isStreaming && (
          <RelatedQuestions
            questions={message.messageContext?.relatedQuestions ?? []}
            onSelectQuestion={onSelectQuestion}
            className="mt-2"
          />
        )}
      </div>
      
     
    </div>
  )
}

export default MessageItem
