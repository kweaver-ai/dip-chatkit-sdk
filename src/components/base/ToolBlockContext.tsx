import React, { createContext, useContext, useRef, useCallback, useState, useMemo } from 'react';

/**
 * 工具块上下文：管理「注册工具 onClick 返回的关闭函数」。
 * 点击任意工具块时先调用上次存储的关闭函数（若有），再执行当前点击逻辑；
 * 若当前是注册工具且 onClick 返回了函数，则存储起来，供下次切换时调用。
 */
export interface ToolBlockContextValue {
  /** 执行上次注册的关闭函数并清空；切换工具块时由 ToolBlock 先调用 */
  closeRegistered: () => void;
  /** 存储本次打开的关闭函数（onClick 的返回值）；不返回或非函数则存空 */
  registerClose: (close: (() => void) | undefined) => void;
  /** 是否有内置工具抽屉处于打开状态（用于控制消息列表滚动行为等） */
  hasOpenDrawer: boolean;
  /** 更新内置工具抽屉的打开状态 */
  setHasOpenDrawer: (open: boolean) => void;
}

const ToolBlockContext = createContext<ToolBlockContextValue | null>(null);

export function ToolBlockProvider({ children }: { children: React.ReactNode }) {
  const closeRef = useRef<(() => void) | undefined>(undefined);
  const [hasOpenDrawer, setHasOpenDrawer] = useState(false);

  const closeRegistered = useCallback(() => {
    closeRef.current?.();
    closeRef.current = undefined;
  }, []);

  const registerClose = useCallback((close: (() => void) | undefined) => {
    closeRef.current = typeof close === 'function' ? close : undefined;
  }, []);

  const value: ToolBlockContextValue = useMemo(
    () => ({
      closeRegistered,
      registerClose,
      hasOpenDrawer,
      setHasOpenDrawer,
    }),
    [closeRegistered, registerClose, hasOpenDrawer]
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
    };
  }
  return ctx;
}
