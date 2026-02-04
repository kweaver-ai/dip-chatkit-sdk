import React, { createContext, useContext, useRef, useCallback, useState, useMemo } from 'react';

/**
 * 内置工具抽屉展示所需的数据（与 ToolDrawer 展示内容对应）
 * 状态与数据存放在 Context，避免 ToolBlock 因虚拟滚动/消息更新重渲染导致抽屉状态重置
 */
export interface ToolDrawerPayload {
  toolName: string;
  toolTitle: string;
  toolIcon?: string | React.ReactNode;
  input?: any;
  output?: any;
}

/**
 * 工具块上下文：管理「注册工具 onClick 返回的关闭函数」及「内置工具抽屉的显示状态与数据」。
 * 点击任意工具块时先调用上次存储的关闭函数（若有），再执行当前点击逻辑；
 * 若当前是注册工具且 onClick 返回了函数，则存储起来，供下次切换时调用。
 * 内置抽屉的 open/close 与 payload 由 Context 持有，ToolDrawer 在 AssistantBase 单例渲染，ToolBlock 只负责调用 openToolDrawer/closeToolDrawer。
 */
export interface ToolBlockContextValue {
  /** 执行上次注册的关闭函数并清空；切换工具块时由 ToolBlock 先调用 */
  closeRegistered: () => void;
  /** 存储本次打开的关闭函数（onClick 的返回值）；不返回或非函数则存空 */
  registerClose: (close: (() => void) | undefined) => void;
  /** 是否有内置工具抽屉处于打开状态（用于控制消息列表滚动行为等） */
  hasOpenDrawer: boolean;
  /** 更新内置工具抽屉的打开状态（内部使用，也可供外部同步） */
  setHasOpenDrawer: (open: boolean) => void;
  /** 当前要展示的抽屉数据，为 null 表示抽屉关闭 */
  drawerPayload: ToolDrawerPayload | null;
  /** 打开内置工具抽屉并设置展示数据 */
  openToolDrawer: (payload: ToolDrawerPayload) => void;
  /** 关闭内置工具抽屉并清空数据 */
  closeToolDrawer: () => void;
}

const ToolBlockContext = createContext<ToolBlockContextValue | null>(null);

export function ToolBlockProvider({ children }: { children: React.ReactNode }) {
  const closeRef = useRef<(() => void) | undefined>(undefined);
  const [hasOpenDrawer, setHasOpenDrawer] = useState(false);
  const [drawerPayload, setDrawerPayload] = useState<ToolDrawerPayload | null>(null);

  const closeRegistered = useCallback(() => {
    closeRef.current?.();
    closeRef.current = undefined;
  }, []);

  const registerClose = useCallback((close: (() => void) | undefined) => {
    closeRef.current = typeof close === 'function' ? close : undefined;
  }, []);

  const openToolDrawer = useCallback((payload: ToolDrawerPayload) => {
    setDrawerPayload(payload);
    setHasOpenDrawer(true);
  }, []);

  const closeToolDrawer = useCallback(() => {
    setHasOpenDrawer(false);
    setDrawerPayload(null);
  }, []);

  const value: ToolBlockContextValue = useMemo(
    () => ({
      closeRegistered,
      registerClose,
      hasOpenDrawer,
      setHasOpenDrawer,
      drawerPayload,
      openToolDrawer,
      closeToolDrawer,
    }),
    [closeRegistered, registerClose, hasOpenDrawer, drawerPayload, openToolDrawer, closeToolDrawer]
  );

  return (
    <ToolBlockContext.Provider value={value}>
      {children}
    </ToolBlockContext.Provider>
  );
}

export function useToolBlockContext(): ToolBlockContextValue {
  const ctx = useContext(ToolBlockContext);
  if (!ctx) {
    return {
      closeRegistered: () => {},
      registerClose: () => {},
      hasOpenDrawer: false,
      setHasOpenDrawer: () => {},
      drawerPayload: null,
      openToolDrawer: () => {},
      closeToolDrawer: () => {},
    };
  }
  return ctx;
}
