import React, { createContext, useContext } from 'react';

/**
 * 抽屉 Portal 挂载容器的 Context
 * 用于从顶层（如 AssistantBase）指定 ToolDrawer 的挂载节点，避免虚拟滚动等 transform 影响 fixed 定位。
 * 不传或为 null 时，ToolDrawer 内部使用默认解析：document.getElementById('root') ?? document.body
 */
const DrawerPortalContext = createContext<HTMLElement | null>(null);

export interface DrawerPortalProviderProps {
  /** Portal 挂载的 DOM 节点；不传或 null 表示使用默认（root 优先，再 body） */
  value?: HTMLElement | null;
  children: React.ReactNode;
}

export function DrawerPortalProvider({ value = null, children }: DrawerPortalProviderProps) {
  return (
    <DrawerPortalContext.Provider value={value ?? null}>
      {children}
    </DrawerPortalContext.Provider>
  );
}

/**
 * 获取抽屉 Portal 挂载容器（来自 Context）。
 * 返回 null 表示使用组件内部默认：document.getElementById('root') ?? document.body
 */
export function useDrawerPortalContainer(): HTMLElement | null {
  return useContext(DrawerPortalContext);
}

/**
 * 解析最终挂载节点：prop/context 优先，否则 root 再 body（默认不挂到 body，而是 root）
 */
export function resolveDrawerPortalContainer(
  propContainer: HTMLElement | null | undefined,
  contextContainer: HTMLElement | null
): HTMLElement {
  const fromPropOrContext = propContainer ?? contextContainer;
  if (fromPropOrContext) return fromPropOrContext;
  return document.getElementById('root') ?? document.body;
}
