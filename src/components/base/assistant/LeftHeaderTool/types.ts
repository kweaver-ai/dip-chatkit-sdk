import { ReactNode } from 'react';

/**
 * 树节点数据结构
 * 注意：使用 childrens（复数）作为子节点属性名
 */
export interface TreeNode {
  /** 节点标题 */
  title: string;
  
  /** 节点图标（React 节点） */
  icon?: ReactNode;
  
  /** 节点唯一标识（可选，组件会自动生成） */
  key?: string;
  
  /** 子节点列表（可选，使用 childrens 而非 children） */
  childrens?: Array<{
    title: string;
    icon?: ReactNode;
    key?: string;
    childrens?: Array<TreeNode>;  // 递归结构，支持多层级
  }>;
}

/**
 * 知识网络详情接口
 * 参考 agent-app.schemas.yaml#/components/schemas/KnowledgeNetworkDetail
 */
export interface KnowledgeNetworkDetail {
  id: string;
  name: string;
  tags?: string[];
  comment?: string;
  icon?: string;
  color?: string;
  detail?: string;
  branch?: string;
  business_domain?: string;
  [key: string]: any;
}

/**
 * 对象类型列表响应接口
 * 参考 agent-app.schemas.yaml#/components/schemas/ObjectTypeListResponse
 */
export interface ObjectTypeListResponse {
  entries: ObjectType[];
  total_count: number;
}

/**
 * 对象类型接口
 * 参考 agent-app.schemas.yaml#/components/schemas/ObjectType
 */
export interface ObjectType {
  id: string;
  name: string;
  data_properties: DataProperty[];
  [key: string]: any;
}

/**
 * 数据属性接口
 * 参考 agent-app.schemas.yaml#/components/schemas/DataProperty
 */
export interface DataProperty {
  name: string;
  display_name?: string;
  type: string;
  comment?: string;
  [key: string]: any;
}

/**
 * 指标模型接口
 * 参考 agent-app.schemas.yaml#/components/schemas/MetricModel
 */
export interface MetricModel {
  id: string;
  name: string;
  group_id?: string;
  group_name?: string;
  catalog_id?: string;
  catalog_content?: string;
  [key: string]: any;
}
