import React, { useEffect, useState } from 'react';
import {
  ConversationHistory as ConversationHistoryType,
  DateRange,
} from '../../../types';
import Avatar from '@/components/Avatar'
import { CloseIcon } from '@/components/icons'

/**
 * 历史会话列表组件的属性接口
 */
interface ConversationHistoryProps {
  /** 是否显示历史会话列表 */
  visible: boolean;
  /** 关闭历史会话列表的回调函数 */
  onClose: () => void;
  /** 获取历史会话列表的函数 */
  onGetConversations: (page?: number, size?: number) => Promise<ConversationHistoryType[]>;
  /** 加载指定会话的回调函数 */
  onLoadConversation: (conversationId: string) => void;
  /** 删除指定会话的回调函数 */
  onDeleteConversation: (conversationId: string) => Promise<void>;
  /** Agent Name (agent 名称) */
  agentInfo?: any;  
}

/**
 * 历史会话列表组件
 * 右侧滑出面板，展示用户的历史会话记录，支持加载和删除操作
 * 设计参考：https://www.figma.com/design/AnGlsx50RkpJgY9irtMtwr/chatkit-max?node-id=14-1901
 */
export const ConversationHistory: React.FC<ConversationHistoryProps> = ({
  visible,
  onClose,
  onGetConversations,
  onLoadConversation,
  onDeleteConversation,
  agentInfo,
}) => {
  const [conversations, setConversations] = useState<ConversationHistoryType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  /**
   * 加载历史会话列表
   */
  const loadConversations = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await onGetConversations(1, 1000);
      setConversations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取历史会话失败');
      console.error('获取历史会话失败:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 删除指定会话
   */
  const handleDelete = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm('确定要删除这条会话吗？')) {
      return;
    }

    setDeletingId(conversationId);
    try {
      await onDeleteConversation(conversationId);
      // 删除成功后重新加载列表
      await loadConversations();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除会话失败');
      console.error('删除会话失败:', err);
    } finally {
      setDeletingId(null);
    }
  };

  
  const DateRangeValue: {
    [key in DateRange]: number
  } = {
    [DateRange.Minute]: 1000 * 60,
    [DateRange.Hour]: 1000 * 60 * 60,
    [DateRange.ToDay]: 1000 * 60 * 60 * 24,
    [DateRange.Yesterday]: 1000 * 60 * 60 * 24 * 2,
    [DateRange.SixDay]: 1000 * 60 * 60 * 24 * 6,
    [DateRange.Month]: 1000 * 60 * 60 * 24 * 30,
    [DateRange.Year]: 1000 * 60 * 60 * 24 * 30 * 12,
  }

  /**
   * 获取时间戳的零时时间
   */
  const getTimesZeroTime = (time: number = Date.now()): number => {
    return new Date(time).setHours(0, 0, 0, 0)
  }

  /**
   * 格式化时间戳为可读的时间字符串
   */
  const formatTime = (timestamp: number, range: Array<DateRange>) => {
    const time = timestamp < 1000000000000 ? timestamp * 1000 : timestamp; // 如果时间戳是秒级（小于 13 位），需要转换为毫秒
    // time零时的时间
    const timeStartTime = getTimesZeroTime(time)
    // 今天零时的时间
    const toDayStartTime = getTimesZeroTime()
    // 6天零时的时间
    const sevenDayStartTime = getTimesZeroTime(
        Date.now() - DateRangeValue.sixDay,
    )
    const relativelyTime = toDayStartTime - timeStartTime
    const currentYear = new Date().getFullYear()
    const timeYear = new Date(time).getFullYear()
    switch (true) {
        case range.includes(DateRange.ToDay) && toDayStartTime < time:
            return new Date(time).getHours().toString().padStart(2, '0') + ':' + new Date(time).getMinutes().toString().padStart(2, '0')
        case range.includes(DateRange.SixDay) && sevenDayStartTime < time:
            return `${Math.floor(relativelyTime / (1000 * 60 * 60 * 24))}` + '天前'
        case range.includes(DateRange.Year) && currentYear === timeYear:
            return new Date(time).getMonth().toString().padStart(2, '0') + '-' + new Date(time).getDate().toString().padStart(2, '0')
        default:
            try {
                return new Date(time).getFullYear().toString() + '-' + new Date(time).getMonth().toString().padStart(2, '0') + '-' + new Date(time).getDate().toString().padStart(2, '0')
            } catch (ex) {
                return '时间格式化错误'
            }
    }
}

  // 当组件可见时加载历史会话
  useEffect(() => {
    if (visible) {
      loadConversations();
    }
  }, [visible]);

  if (!visible) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50"
      onClick={onClose}
    >
      <div
        className="absolute right-0 top-0 h-full w-[400px] bg-white shadow-[0px_9px_56px_0px_rgba(0,0,0,0.08)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="h-[64px] px-[24px] flex items-center justify-between">
          <h2
            className="text-[18px] font-medium text-black"
            style={{ fontFamily: 'Noto Sans SC' }}
          >
            相关历史对话
          </h2>
          <button
            onClick={onClose}
            className="w-[24px] h-[24px] flex items-center justify-center text-[rgba(0,0,0,0.65)] hover:text-[rgba(0,0,0,1)] transition-colors"
          >
            <CloseIcon />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="h-[calc(100%-64px)] overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div
                className="text-[14px] text-[rgba(0,0,0,0.45)]"
                style={{ fontFamily: 'Noto Sans SC' }}
              >
                加载中...
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center py-12">
              <div
                className="text-[14px] text-red-500"
                style={{ fontFamily: 'Noto Sans SC' }}
              >
                {error}
              </div>
            </div>
          )}

          {!loading && !error && conversations.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <div
                className="text-[14px] text-[rgba(0,0,0,0.45)]"
                style={{ fontFamily: 'Noto Sans SC' }}
              >
                暂无历史会话
              </div>
            </div>
          )}

          {!loading && !error && conversations.length > 0 && (
            <div className="px-[14px] pb-[14px]">
              {/* 展示 Agent Name */}
              {agentInfo?.name && (
                <div className="mb-[14px] flex flex-col items-center gap-y-[10px]">
                  {/* Agent 图标 */}
                  <Avatar name={agentInfo.avatar} width={64} height={64} />
         
                  <p
                    className="text-[16px] font-medium text-[rgba(0,0,0,0.85)]"
                    style={{ fontFamily: 'Noto Sans SC' }}
                  >
                    {agentInfo.name}
                  </p>
                </div>
              )}

              {/* 会话列表 */}
              <div className="space-y-[2px]">
                {conversations.map((conversation) => (
                  <div
                    key={conversation.conversationID}
                    className={`
                      h-[36px] px-[10px] flex items-center justify-between cursor-pointer
                      ${hoveredId === conversation.conversationID ? 'bg-[#f0f0f0]' : 'bg-transparent'}
                      rounded-[6px] transition-colors
                    `}
                    onClick={() => onLoadConversation(conversation.conversationID)}
                    onMouseEnter={() => setHoveredId(conversation.conversationID)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    <div className="flex items-center gap-[8px] flex-1 min-w-0">
                      {/* 历史图标 */}
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
                        <path
                          d="M8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14Z"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="none"
                        />
                        <path
                          d="M8 5V8L10 10"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>

                      {/* 会话标题 */}
                      <p
                        className="text-[14px] text-[rgba(0,0,0,0.85)] truncate flex-1"
                        style={{ fontFamily: 'Noto Sans SC', lineHeight: '36px' }}
                      >
                        {conversation.title || '未命名会话'}
                      </p>
                    </div>

                    {/* 右侧：时间或删除按钮 */}
                    {hoveredId === conversation.conversationID && deletingId !== conversation.conversationID ? (
                      <button
                        onClick={(e) => handleDelete(conversation.conversationID, e)}
                        className="w-[16px] h-[16px] flex-shrink-0 text-[rgba(0,0,0,0.45)] hover:text-red-500 transition-colors"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path
                            d="M2 4H14M6 4V2H10V4M12 4V14H4V4H12Z"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    ) : deletingId === conversation.conversationID ? (
                      <span
                        className="text-[12px] text-[rgba(0,0,0,0.45)]"
                        style={{ fontFamily: 'Noto Sans SC' }}
                      >
                        删除中...
                      </span>
                    ) : (
                      <p
                        className="text-[14px] text-[rgba(0,0,0,0.45)] flex-shrink-0"
                        style={{ fontFamily: 'Noto Sans SC', lineHeight: '36px' }}
                      >
                        {formatTime(conversation.updated_at, [DateRange.ToDay, DateRange.SixDay, DateRange.Year])}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConversationHistory;

