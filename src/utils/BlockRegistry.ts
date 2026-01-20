import React from 'react';

/**
 * 工具注册信息接口
 * 根据 ChatKit.pdf 4.22 ToolBlockRegistration 定义
 */
export interface ToolBlockRegistration {
  /** 工具名称（唯一标识），对应 ToolCallData.name */
  name: string;
  /** 工具图标，React 元素 */
  Icon?: React.ReactNode;
  /** 工具点击事件
   * @param block 工具块数据，类型为 Record<string, any>
   */
  onClick?: (block: Record<string, any>) => void;
}

/**
 * Block 注册表
 * 管理工具名称到工具注册信息的映射
 * 
 * 注册表数据存储在静态私有 Map 中，所有 ChatKit 实例共享
 * 该类会在 SDK 中导出，供第三方应用使用
 */
export class BlockRegistry {
  // 私有静态属性，存储注册信息
  private static registry: Map<string, ToolBlockRegistration> = new Map();

  /**
   * 注册工具信息
   * @param registration 工具注册信息，包含 name, Icon, onClick
   * @throws 如果工具名称已注册，将抛出错误
   */
  static registerTool(registration: ToolBlockRegistration): void {
    if (this.registry.has(registration.name)) {
      throw new Error(`工具 "${registration.name}" 已注册，请先取消注册或使用不同的工具名称`);
    }
    this.registry.set(registration.name, registration);
    console.log(`已注册工具: ${registration.name}`);
  }

  /**
   * 取消注册
   * @param toolName 工具名称
   */
  static unregisterTool(toolName: string): void {
    const removed = this.registry.delete(toolName);
    if (removed) {
      console.log(`已取消注册工具: ${toolName}`);
    }
  }

  /**
   * 获取工具注册信息
   * @param toolName 工具名称
   * @returns 工具注册信息，如果未注册则返回 undefined
   */
  static getTool(toolName: string): ToolBlockRegistration | undefined {
    return this.registry.get(toolName);
  }

  /**
   * 检查是否已注册
   * @param toolName 工具名称
   * @returns 是否已注册
   */
  static hasTool(toolName: string): boolean {
    return this.registry.has(toolName);
  }

  /**
   * 清空所有注册
   */
  static clearAll(): void {
    this.registry.clear();
    console.log('已清空所有工具注册');
  }

  /**
   * 获取所有已注册的工具名称
   * 根据设计文档（ChatKit for DIP.pdf）中的流程，此方法用于判断当前 skill_name 是否在注册的工具中
   * @returns 工具名称数组
   */
  static getAllToolNames(): string[] {
    return Array.from(this.registry.keys());
  }
}
