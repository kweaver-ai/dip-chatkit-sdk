import React, { useEffect, useState, useRef } from 'react';
import {
  ConversationHistory as ConversationHistoryType,
  DateRange,
} from '../../../types';
import { MoreIcon } from '../../icons';

/**
 * 历史会话列表组件的属性接口
 */
interface ConversationHistoryProps {
  /** 获取历史会话列表的函数 */
  onGetConversations: (page?: number, size?: number) => Promise<ConversationHistoryType[]>;
  /** 加载指定会话的回调函数 */
  onLoadConversation: (conversationId: string) => void;
  /** 删除指定会话的回调函数 */
  onDeleteConversation: (conversationId: string) => Promise<void>;
  /** 按钮位置（可选，用于定位下拉菜单） */
  buttonPosition?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
}

/**
 * 历史会话列表组件
 * 包含历史记录按钮和下拉菜单，点击按钮后以下拉菜单形式展示历史会话列表
 * 设计参考：https://www.figma.com/design/ikuqIWpd1CmGh6fMO9PHlK/%E6%99%BA%E8%83%BD%E9%97%AE%E6%95%B0?node-id=117-8257&t=8fBvm6SJ7OtDYzBU-4
 */
export const ConversationHistory: React.FC<ConversationHistoryProps> = ({
  onGetConversations,
  onLoadConversation,
  onDeleteConversation,
  buttonPosition,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState<ConversationHistoryType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{
    openUp: boolean;
    alignRight: boolean;
  }>({ openUp: false, alignRight: false });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  /**
   * 处理列表项点击
   */
  const handleItemClick = (conversationId: string) => {
    onLoadConversation(conversationId);
    setIsOpen(false); // 加载会话后关闭下拉菜单
  };

  /**
   * 切换下拉菜单显示/隐藏
   */
  const toggleDropdown = () => {
    setIsOpen((prev) => !prev);
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
  };

  /**
   * 获取时间戳的零时时间
   */
  const getTimesZeroTime = (time: number = Date.now()): number => {
    return new Date(time).setHours(0, 0, 0, 0);
  };

  /**
   * 格式化时间戳为可读的时间字符串
   */
  const formatTime = (timestamp: number, range: Array<DateRange>) => {
    const time = timestamp < 1000000000000 ? timestamp * 1000 : timestamp; // 如果时间戳是秒级（小于 13 位），需要转换为毫秒
    // time零时的时间
    const timeStartTime = getTimesZeroTime(time);
    // 今天零时的时间
    const toDayStartTime = getTimesZeroTime();
    // 6天零时的时间
    const sevenDayStartTime = getTimesZeroTime(
      Date.now() - DateRangeValue[DateRange.SixDay],
    );
    const relativelyTime = toDayStartTime - timeStartTime;
    const currentYear = new Date().getFullYear();
    const timeYear = new Date(time).getFullYear();
    switch (true) {
      case range.includes(DateRange.ToDay) && toDayStartTime < time:
        return new Date(time).getHours().toString().padStart(2, '0') + ':' + new Date(time).getMinutes().toString().padStart(2, '0');
      case range.includes(DateRange.SixDay) && sevenDayStartTime < time:
        return `${Math.floor(relativelyTime / (1000 * 60 * 60 * 24))}` + '天前';
      case range.includes(DateRange.Year) && currentYear === timeYear:
        return (new Date(time).getMonth() + 1).toString().padStart(2, '0') + '-' + new Date(time).getDate().toString().padStart(2, '0');
      default:
        try {
          return new Date(time).getFullYear().toString() + '-' + (new Date(time).getMonth() + 1).toString().padStart(2, '0') + '-' + new Date(time).getDate().toString().padStart(2, '0');
        } catch (ex) {
          return '时间格式化错误';
        }
    }
  };

  // 点击外部区域关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // 下拉菜单打开时加载数据
      loadConversations();
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // 打开时根据按钮位置和视口尺寸计算下拉的展开方向，避免超出屏幕
  useEffect(() => {
    if (!isOpen) return;

    const buttonEl = buttonRef.current;
    if (!buttonEl) return;

    const rect = buttonEl.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // 估算下拉尺寸：宽度 360px，高度上限约 420px（列表 + 内边距 + 间距）
    const DROPDOWN_WIDTH = 360;
    const DROPDOWN_HEIGHT = 420;

    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const spaceRight = viewportWidth - rect.right;

    const openUp = spaceBelow < DROPDOWN_HEIGHT && spaceAbove > spaceBelow;
    const alignRight = spaceRight < DROPDOWN_WIDTH;

    setDropdownPosition({ openUp, alignRight });
  }, [isOpen]);

  // 计算下拉菜单位置
  const getDropdownStyle = (): React.CSSProperties => {
    // 如果外部显式传了按钮位置，优先使用外部配置（兼容旧用法）
    if (buttonPosition) {
      const style: React.CSSProperties = {
        position: 'absolute',
      };
      if (buttonPosition.top !== undefined) {
        style.top = buttonPosition.top;
      }
      if (buttonPosition.right !== undefined) {
        style.right = buttonPosition.right;
      }
      if (buttonPosition.bottom !== undefined) {
        style.bottom = buttonPosition.bottom;
      }
      if (buttonPosition.left !== undefined) {
        style.left = buttonPosition.left;
      }
      return style;
    }

    // 自适应：相对按钮决定上下、左右展开，避免跑出屏幕
    const style: React.CSSProperties = {
      position: 'absolute',
    };

    if (dropdownPosition.openUp) {
      style.bottom = '100%';
      style.marginBottom = '4px';
    } else {
      style.top = '100%';
      style.marginTop = '4px';
    }

    if (dropdownPosition.alignRight) {
      style.right = 0;
    } else {
      style.left = 0;
    }

    return style;
  };

  return (
    <div ref={containerRef} className="relative">
      {/* 历史记录按钮 */}
      <button
        ref={buttonRef}
        onClick={toggleDropdown}
        className="w-[24px] h-[24px] flex items-center justify-center text-[rgba(0,0,0,0.65)] hover:text-[rgba(0,0,0,1)] transition-opacity"
        title="历史对话"
      >
        <MoreIcon className="w-[16px] h-[16px]" />
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute w-[360px] bg-white rounded-[12px] shadow-[0px_5px_28px_0px_rgba(0,0,0,0.2)] z-50"
          style={getDropdownStyle()}
        >
          {/* 内容区域 */}
          <div className="max-h-[406px] overflow-y-auto px-[14px] py-[14px]">
            {loading && (
              <div className="flex items-center justify-center py-[48px]">
                <div
                  className="text-[14px] text-[rgba(0,0,0,0.45)]"
                  style={{ fontFamily: 'Noto Sans SC' }}
                >
                  加载中...
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center justify-center py-[48px]">
                <div
                  className="text-[14px] text-red-500"
                  style={{ fontFamily: 'Noto Sans SC' }}
                >
                  {error}
                </div>
              </div>
            )}

            {!loading && !error && conversations.length === 0 && (
              <div className="flex items-center justify-center py-[48px]">
                <div
                  className="text-[14px] text-[rgba(0,0,0,0.45)]"
                  style={{ fontFamily: 'Noto Sans SC' }}
                >
                  暂无历史会话
                </div>
              </div>
            )}

            {!loading && !error && conversations.length > 0 && (
              <div className="space-y-[2px]">
                {conversations.map((conversation) => (
                  <div
                    key={conversation.conversationID}
                    className={`
                      h-[36px] px-[14px] flex items-center justify-between cursor-pointer
                      ${hoveredId === conversation.conversationID ? 'bg-[#F0F0F0]' : 'bg-transparent'}
                      rounded-[6px] transition-colors
                    `}
                    onClick={() => handleItemClick(conversation.conversationID)}
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
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ConversationHistory;
