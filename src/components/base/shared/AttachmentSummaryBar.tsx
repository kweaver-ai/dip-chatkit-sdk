import React from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon } from '../../icons';
import type { ChatKitPendingAttachment } from '../ChatKitBase';

interface AttachmentSummaryBarProps {
  attachments: ChatKitPendingAttachment[];
  onRemoveAttachment?: (path: string) => void;
  badgeTextMaxWidth?: number;
}

const ATTACHMENT_GAP = 8;
const DEFAULT_MORE_BUTTON_WIDTH = 36;

const FileBadgeIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M3 1.5H9L13 5.5V13.5C13 14.05 12.55 14.5 12 14.5H4C3.45 14.5 3 14.05 3 13.5V1.5Z" fill="#FF5B5B" />
    <path d="M9 1.5V4.75C9 5.16 9.34 5.5 9.75 5.5H13" fill="#FFD9D9" />
  </svg>
);

const AttachmentSummaryBar: React.FC<AttachmentSummaryBarProps> = ({
  attachments,
  onRemoveAttachment,
  badgeTextMaxWidth = 220,
}) => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [visibleCount, setVisibleCount] = React.useState(attachments.length);
  const [menuPosition, setMenuPosition] = React.useState({ top: 0, left: 0, width: 320 });
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const moreButtonRef = React.useRef<HTMLButtonElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const moreButtonMeasureRef = React.useRef<HTMLButtonElement>(null);
  const measurementRefs = React.useRef<Record<string, HTMLDivElement | null>>({});

  const updateVisibleCount = React.useCallback(() => {
    if (attachments.length === 0) {
      setVisibleCount(0);
      return;
    }

    const containerWidth = containerRef.current?.clientWidth ?? 0;
    if (!containerWidth) {
      setVisibleCount(attachments.length);
      return;
    }

    const moreButtonWidth = moreButtonMeasureRef.current?.offsetWidth ?? DEFAULT_MORE_BUTTON_WIDTH;
    const widths = attachments.map((attachment) => {
      return measurementRefs.current[attachment.source.path]?.offsetWidth ?? 0;
    });

    let usedWidth = 0;
    let nextVisibleCount = attachments.length;

    for (let index = 0; index < widths.length; index += 1) {
      const itemWidth = widths[index];
      const nextItemWidth = usedWidth + (index > 0 ? ATTACHMENT_GAP : 0) + itemWidth;
      const hiddenCount = attachments.length - (index + 1);
      const reserveWidth = hiddenCount > 0 ? ATTACHMENT_GAP + moreButtonWidth : 0;

      if (nextItemWidth + reserveWidth <= containerWidth) {
        usedWidth = nextItemWidth;
        nextVisibleCount = index + 1;
        continue;
      }

      nextVisibleCount = Math.max(1, index);
      break;
    }

    setVisibleCount(nextVisibleCount);
  }, [attachments]);

  React.useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const isInsideTrigger = wrapperRef.current?.contains(target);
      const isInsideMenu = menuRef.current?.contains(target);
      if (!isInsideTrigger && !isInsideMenu) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, []);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    let rafId = window.requestAnimationFrame(updateVisibleCount);
    const resizeObserver = new ResizeObserver(() => {
      window.cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(updateVisibleCount);
    });

    resizeObserver.observe(container);

    return () => {
      window.cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
    };
  }, [updateVisibleCount]);

  React.useEffect(() => {
    const rafId = window.requestAnimationFrame(updateVisibleCount);
    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [attachments, updateVisibleCount]);

  React.useEffect(() => {
    if (visibleCount >= attachments.length) {
      setIsMenuOpen(false);
    }
  }, [attachments.length, visibleCount]);

  React.useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const updateMenuPosition = () => {
      const buttonRect = moreButtonRef.current?.getBoundingClientRect();
      if (!buttonRect) {
        return;
      }

      const viewportWidth = window.innerWidth;
      const desiredWidth = 320;
      const clampedWidth = Math.min(desiredWidth, Math.max(240, viewportWidth - 48));
      const nextLeft = Math.min(
        Math.max(24, buttonRect.right - clampedWidth),
        Math.max(24, viewportWidth - clampedWidth - 24)
      );

      setMenuPosition({
        top: buttonRect.bottom + 8,
        left: nextLeft,
        width: clampedWidth,
      });
    };

    updateMenuPosition();
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);

    return () => {
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [attachments.length, isMenuOpen, visibleCount]);

  if (attachments.length === 0) {
    return null;
  }

  const visibleAttachments = attachments.slice(0, visibleCount);
  const hiddenAttachments = attachments.slice(visibleCount);

  const renderBadge = (attachment: ChatKitPendingAttachment, measurement = false) => (
    <div
      key={attachment.source.path}
      ref={(node) => {
        if (measurement) {
          measurementRefs.current[attachment.source.path] = node;
        }
      }}
      className="flex max-w-full flex-shrink-0 items-center gap-2 rounded-[10px] bg-[#F5F7FB] px-3 py-2"
    >
      <FileBadgeIcon />
      <span
        className="block truncate text-[14px] leading-[20px] text-[rgba(0,0,0,0.88)]"
        style={{
          fontFamily: 'Noto Sans SC',
          maxWidth: `${badgeTextMaxWidth}px`,
        }}
      >
        {attachment.name || attachment.source.path}
      </span>
      <button
        type="button"
        className="flex h-4 w-4 flex-shrink-0 items-center justify-center text-[rgba(0,0,0,0.35)] hover:text-[rgba(0,0,0,0.75)]"
        onClick={() => {
          if (!measurement) {
            onRemoveAttachment?.(attachment.source.path);
          }
        }}
        title="Remove attachment"
        tabIndex={measurement ? -1 : 0}
      >
        <CloseIcon />
      </button>
    </div>
  );

  return (
    <div ref={wrapperRef} className="relative">
      <div ref={containerRef} className="flex min-w-0 items-center gap-2 overflow-hidden">
        {visibleAttachments.map((attachment) => renderBadge(attachment))}
        {hiddenAttachments.length > 0 && (
          <div className="relative flex-shrink-0">
            <button
              ref={moreButtonRef}
              type="button"
              className="flex h-9 min-w-9 items-center justify-center rounded-[10px] bg-[#F5F7FB] px-2 text-[16px] leading-none text-[rgba(0,0,0,0.62)] hover:bg-[#EBEEF5]"
              onClick={() => setIsMenuOpen((open) => !open)}
              title="Show all attachments"
            >
              ...
            </button>
          </div>
        )}
      </div>

      <div className="pointer-events-none absolute left-0 top-0 -z-10 flex whitespace-nowrap opacity-0">
        <div className="flex items-center gap-2">
          {attachments.map((attachment) => renderBadge(attachment, true))}
          <button
            ref={moreButtonMeasureRef}
            type="button"
            className="flex h-9 min-w-9 items-center justify-center rounded-[10px] bg-[#F5F7FB] px-2 text-[16px] leading-none"
            tabIndex={-1}
          >
            ...
          </button>
        </div>
      </div>

      {isMenuOpen && typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-[1200] overflow-hidden rounded-[12px] border border-[rgba(0,0,0,0.08)] bg-white shadow-[0_12px_36px_rgba(15,23,42,0.16)]"
            style={{
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`,
              width: `${menuPosition.width}px`,
            }}
          >
            <div className="max-h-[260px] overflow-y-auto p-2">
              {attachments.map((attachment) => (
                <div
                  key={attachment.source.path}
                  className="flex items-center gap-2 rounded-[10px] px-3 py-2 hover:bg-[#F5F7FB]"
                >
                  <FileBadgeIcon />
                  <span
                    className="min-w-0 flex-1 truncate text-[14px] leading-[20px] text-[rgba(0,0,0,0.88)]"
                    style={{ fontFamily: 'Noto Sans SC' }}
                    title={attachment.name || attachment.source.path}
                  >
                    {attachment.name || attachment.source.path}
                  </span>
                  <button
                    type="button"
                    className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-[rgba(0,0,0,0.45)] hover:bg-[rgba(0,0,0,0.06)] hover:text-[rgba(0,0,0,0.8)]"
                    onClick={() => onRemoveAttachment?.(attachment.source.path)}
                    title="Remove attachment"
                  >
                    <CloseIcon />
                  </button>
                </div>
              ))}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default AttachmentSummaryBar;
