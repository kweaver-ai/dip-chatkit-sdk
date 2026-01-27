import React from 'react'
import {
  AssistantIcon,
  NewIcon,
  ExpandIcon,
  CloseIcon,
} from '../../icons'
import ConversationHistory from './ConversationHistory'
import {
  ConversationHistory as ConversationHistoryType,
} from '../../../types'

/**
 * Header 组件的属性接口
 */
interface HeaderProps {
  /** 组件标题 */
  title?: string

  /** 关闭组件的回调函数 */
  onClose?: () => void

  /** 新建会话的回调函数 */
  onNewChat?: () => void

  /** 展开/收起的回调函数 */
  onExpand?: () => void

  /** 获取历史会话列表的回调函数 */
  onGetConversations?: (page?: number, size?: number) => Promise<ConversationHistoryType[]>;
  /** 加载指定会话的回调函数 */
  onLoadConversation?: (conversationId: string) => void;
  /** 删除指定会话的回调函数 */
  onDeleteConversation?: (conversationId: string) => Promise<void>;

}

/**
 * Header 组件
 * ChatKit 的头部组件，包含 Logo、标题和操作按钮
 */
const Header: React.FC<HeaderProps> = ({
  title = 'Copilot',
  onClose,
  onNewChat,
  onExpand,
  onGetConversations,
  onLoadConversation,
  onDeleteConversation,
}) => {
  return (
    <div className="h-14 w-full bg-white px-[21px] flex items-center">
      <div className="w-full h-8 flex items-center justify-between">
        {/* Logo 和标题 */}
        <div className="flex items-center h-8">
          {/* AI 助手图标 */}
          <div className="w-8 h-8">
            <AssistantIcon className="w-8 h-8" />
          </div>
          {/* 标题 */}
          <div className="m-2">
            <p
              className="font-medium text-[18px] leading-4 text-black whitespace-nowrap"
              style={{ fontFamily: 'Noto Sans SC' }}
            >
              {title}
            </p>
          </div>
        </div>

        {/* 操作按钮组 - 从右到左：Close -> Expand -> New Chat -> History */}
        <div className="h-8 flex items-center">
          {/* 历史记录按钮 */}
          {onGetConversations && onLoadConversation && onDeleteConversation && (
            <div className="relative">
              <ConversationHistory
                onGetConversations={onGetConversations}
                onLoadConversation={onLoadConversation}
                onDeleteConversation={onDeleteConversation}
              />
            </div>
          )}
          {/* 新建对话按钮 */}
          {onNewChat && (
            <button
              onClick={onNewChat}
              className="ml-3 w-[16px] h-[16px] flex items-center justify-center text-[rgba(0,0,0,0.65)]  hover:text-[rgba(0,0,0,1)] transition-opacity"
              title="新建会话"
            >
              <NewIcon className="w-[14px] h-[14px]" />
            </button>
          )}

          {/* 展开按钮 */}
          {onExpand && (
            <button
              onClick={onExpand}
              className="ml-3 w-[16px] h-[16px] flex items-center justify-center text-[rgba(0,0,0,0.65)]  hover:text-[rgba(0,0,0,1)] transition-opacity"
              title="展开"
            >
              <ExpandIcon className="w-[14px] h-[13px]" />
            </button>
          )}

          {/* 关闭按钮 */}
          {onClose && (
            <button
              onClick={onClose}
              className="ml-3 w-[16px] h-[16px] flex items-center justify-center text-[rgba(0,0,0,0.65)]  hover:text-[rgba(0,0,0,1)] transition-opacity"
              title="关闭"
            >
              <CloseIcon />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default Header
