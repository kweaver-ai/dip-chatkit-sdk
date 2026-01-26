# LeftHeaderTool 组件设计文档

## 一、概述

LeftHeaderTool 是位于 Assistant 组件左侧顶栏的工具组件，用于展示 Agent 信息和知识来源。该组件包含 Agent 标题显示和知识来源下拉容器，帮助用户了解当前使用的智能体及其数据来源。

## 二、组件结构

### 2.1 目录结构

```
src/components/base/assistant/LeftHeaderTool/
├── index.tsx                    # 主入口组件，渲染到左侧顶栏位置
├── AgentTitle.tsx               # Agent 标题组件，显示名称和图标
├── KnowledgeSource.tsx          # 知识来源组件入口，点击下拉容器
├── TreeView.tsx                 # 通用树组件（纯展示，无业务逻辑）
├── KnowledgeNetworksTree.tsx   # 知识网络业务组件（数据转换 + API 调用）
├── MetricTree.tsx               # 指标业务组件（数据转换 + API 调用）
└── types.ts                     # 类型定义
```

### 2.2 组件层级关系

```
LeftHeaderTool (index.tsx)
├── AgentTitle
└── KnowledgeSource
    ├── KnowledgeNetworksTree (业务组件)
    │   └── TreeView (通用树组件)
    └── MetricTree (业务组件)
        └── TreeView (通用树组件)
```

### 2.3 组件职责划分

- **通用组件（TreeView）**：纯展示组件，只负责渲染树形结构，不包含业务逻辑
- **业务组件（KnowledgeNetworksTree、MetricTree）**：负责数据转换、API 调用，将业务数据转换为树组件所需的数据格式

## 三、组件详细设计

### 3.1 index.tsx - 主入口组件

#### 3.1.1 功能描述
- 作为 LeftHeaderTool 的主入口，负责将 AgentTitle 和 KnowledgeSource 组件渲染到左侧顶栏位置
- 接收 DIPBase 的 agentInfo 作为参数，并传递给子组件

#### 3.1.2 Props 接口

```typescript
interface LeftHeaderToolProps {
  /** DIPBase 的 agentInfo 对象 */
  agentInfo: {
    name?: string;                    // Agent 名称
    icon?: string;                     // Agent 图标 URL
    config?: {
      data_source?: {
        knowledge_networks?: Array<{    // 知识网络列表
          id: string;                  // 知识网络 ID
          name?: string;               // 知识网络名称（可选）
        }>;
        metric?: Array<string>;         // 指标 ID 列表
      };
    };
  };
}
```

#### 3.1.3 实现要点
- 从 `agentInfo.config.data_source` 中提取知识网络和指标数据
- 将 `agentInfo.name` 和 `agentInfo.icon` 传递给 `AgentTitle`
- 将知识网络和指标数据传递给 `KnowledgeSource`
- 布局：水平排列 `AgentTitle` 和 `KnowledgeSource`，位于左侧顶栏

### 3.2 AgentTitle.tsx - Agent 标题组件

#### 3.2.1 功能描述
- 显示 Agent 的名称和图标
- 当对话区域无问答结果时，在组件旁边显示 Agent 名称（根据设计图 node-id=805-7224）
- 应用名称无点击事件

#### 3.2.2 Props 接口

```typescript
interface AgentTitleProps {
  /** Agent 名称 */
  name?: string;
  
  /** Agent 图标 URL */
  icon?: string;
  
  /** 是否显示在组件旁边（当对话区域无问答结果时） */
  showAside?: boolean;
}
```

#### 3.2.3 实现要点
- 显示 Agent 图标（如果存在）
- 显示 Agent 名称
- 样式：根据 Figma 设计图 node-id=805-7224 实现
- 无点击交互，仅用于展示

### 3.3 KnowledgeSource.tsx - 知识来源组件

#### 3.3.1 功能描述
- 作为知识来源的入口组件，提供点击展开/收起功能
- 管理下拉容器的显示状态
- 加载并渲染 KnowledgeNetworksTree 和 MetricTree 组件

#### 3.3.2 Props 接口

```typescript
interface KnowledgeSourceProps {
  /** 知识网络列表数据 */
  knowledgeNetworks?: Array<{
    id: string;
    name?: string;
  }>;
  
  /** 指标 ID 列表 */
  metricIds?: string[];
  
  /** API 调用方法（从 DIPBase 传入） */
  apiMethods?: {
    getKnowledgeNetworksDetail: (id: string) => Promise<KnowledgeNetworkDetail>;
    getKnowledgeNetworkObjectTypes: (id: string) => Promise<ObjectTypeListResponse>;
    getMetricInfoByIds: (ids: string[]) => Promise<MetricModel[]>;
  };
}
```

#### 3.3.3 状态管理
- `expanded: boolean` - 控制下拉容器的展开/收起状态
- `loading: boolean` - 控制数据加载状态

#### 3.3.4 实现要点
- 点击"知识来源"按钮切换展开/收起状态
- 展开时显示下拉容器，包含：
  - 标题栏："知识来源" + 关闭按钮（X）
  - 内容区：KnowledgeNetworksTree 和 MetricTree
- 样式：根据 Figma 设计图 node-id=805-7310（展开状态）和 node-id=1-1967（收起状态）实现
- 悬停提示："知识来源"
- 点击展开时按钮变为蓝色
- 点击关闭按钮（X）收起下拉容器

### 3.4 TreeView.tsx - 通用树组件

#### 3.4.1 功能描述
- 通用的树形展示组件，纯展示功能，不包含业务逻辑
- 负责渲染树形结构，支持节点展开/收起
- 自动处理节点的 key 和 id 生成，保证唯一性

#### 3.4.2 Props 接口

```typescript
interface TreeViewProps {
  /** 树节点数据 */
  data: TreeNode[];
  
  /** 节点点击回调（可选） */
  onNodeClick?: (node: TreeNode) => void;
  
  /** 节点展开/收起回调（可选） */
  onExpand?: (expandedKeys: string[], node: TreeNode) => void;
}
```

#### 3.4.3 数据结构

```typescript
/**
 * 树节点数据结构
 * 注意：使用 childrens（复数）作为子节点属性名
 */
interface TreeNode {
  /** 节点标题 */
  title: string;
  
  /** 节点图标（React 节点） */
  icon: ReactNode;
  
  /** 节点唯一标识（可选，组件会自动生成） */
  key?: string;
  
  /** 子节点列表（可选，使用 childrens 而非 children） */
  childrens?: Array<{
    title: string;
    icon: ReactNode;
    key?: string;
    childrens?: Array<TreeNode>;  // 递归结构，支持多层级
  }>;
}
```

**数据结构说明**：
- `title`: 必填，节点的显示文本
- `icon`: 必填，React 节点，可以是图标组件或任意 React 元素
- `key`: 可选，如果提供则使用该值，否则组件自动生成
- `childrens`: 可选，子节点数组，支持递归嵌套，实现多层级树结构

#### 3.4.4 实现要点
- **自动生成 key 和 id**：
  - 如果节点提供了 `key`，则使用该 `key`，并验证其唯一性
  - 如果节点未提供 `key`，组件自动生成唯一标识
  - 生成规则：
    - 使用节点的层级路径（如 `0-1-2`）作为基础
    - 或基于 `title` 和父节点路径生成（如 `parent-title-child-title`）
    - 如果生成的 key 已存在，则追加索引（如 `0-1-2-0`）
  - 保证整个树中所有节点的 `key` 和 `id` 唯一
  - `id` 的生成规则与 `key` 相同，用于内部状态管理
- **渲染逻辑**：
  - 递归渲染树节点
  - 支持节点展开/收起动画
  - 支持节点图标显示
  - 自动处理节点的 key 和 id，确保唯一性
- **交互功能**：
  - 点击节点展开/收起子节点
  - 节点悬停效果
  - 支持自定义节点点击事件
- **样式**：
  - 使用统一的树形组件样式
  - 节点文本颜色：rgba(0, 0, 0, 0.85)
  - 节点悬停效果：背景色变化

### 3.5 KnowledgeNetworksTree.tsx - 知识网络业务组件

#### 3.5.1 功能描述
- 知识网络的业务组件，负责数据转换和 API 调用
- 将知识网络、对象类型、数据属性转换为树组件所需的数据格式
- 树结构：第一层为知识网络名称，第二层为对象类型名称，第三层为数据属性（DataProperties）的 displayName 或 name

#### 3.5.2 Props 接口

```typescript
interface KnowledgeNetworksTreeProps {
  /** 知识网络配置项（来自 config.data_source.knowledge_networks 的每一项） */
  knowledgeNetwork: {
    id: string;
    name?: string;
  };
  
  /** API 调用方法 */
  getKnowledgeNetworksDetail: (id: string) => Promise<KnowledgeNetworkDetail>;
  getKnowledgeNetworkObjectTypes: (id: string) => Promise<ObjectTypeListResponse>;
}
```

#### 3.5.3 数据转换流程

```typescript
// 1. 调用 API 获取知识网络详情
const detail = await getKnowledgeNetworksDetail(knowledgeNetwork.id);

// 2. 调用 API 获取对象类型列表
const objectTypes = await getKnowledgeNetworkObjectTypes(knowledgeNetwork.id);

// 3. 转换为树节点数据格式
const treeData: TreeNode[] = [
  {
    title: detail.name,  // 第一层：知识网络名称
    icon: <FolderIcon />,
    key: `kn-${detail.id}`,  // 可选，TreeView 会自动生成
    childrens: objectTypes.entries.map((objectType) => ({
      title: objectType.name,  // 第二层：对象类型名称
      icon: <DocumentIcon />,
      key: `ot-${objectType.id}`,  // 可选
      childrens: objectType.data_properties.map((property) => ({
        title: property.display_name || property.name,  // 第三层：数据属性
        icon: <PropertyIcon />,
        key: `dp-${objectType.id}-${property.name}`,  // 可选
      })),
    })),
  },
];

// 4. 传递给 TreeView 组件
<TreeView data={treeData} />
```

#### 3.5.4 实现要点
- **数据加载**：
  1. 调用 `getKnowledgeNetworksDetail(knowledgeNetwork.id)` 获取知识网络详情
  2. 调用 `getKnowledgeNetworkObjectTypes(knowledgeNetwork.id)` 获取对象类型列表
  3. 将 API 响应数据转换为 `TreeNode[]` 格式
- **数据转换规则**：
  - 第一层：使用 `KnowledgeNetworkDetail.name` 作为 `title`
  - 第二层：使用 `ObjectType.name` 作为 `title`
  - 第三层：优先使用 `DataProperty.display_name`，如果不存在则使用 `DataProperty.name`
- **图标选择**：
  - 知识网络：文件夹图标
  - 对象类型：文档图标
  - 数据属性：属性图标
- **懒加载支持**（可选）：
  - 仅在展开知识网络节点时加载对象类型数据
  - 仅在展开对象类型节点时加载数据属性
- **错误处理**：
  - API 调用失败时显示错误提示
  - 数据为空时显示空状态

### 3.6 MetricTree.tsx - 指标业务组件

#### 3.6.1 功能描述
- 指标的业务组件，负责数据转换和 API 调用
- 将指标数据按分组组织，转换为树组件所需的数据格式
- 树结构：第一层为"指标"（固定文本），第二层为分组（group_name），第三层为每组下的指标名称（name）

#### 3.6.2 Props 接口

```typescript
interface MetricTreeProps {
  /** 指标 ID 列表（来自 config.data_source.metric） */
  metricIds: string[];
  
  /** API 调用方法 */
  getMetricInfoByIds: (ids: string[]) => Promise<MetricModel[]>;
}
```

#### 3.6.3 数据转换流程

```typescript
// 1. 调用 API 获取指标信息列表
const metrics = await getMetricInfoByIds(metricIds);

// 2. 按 group_name 分组
const groupedMetrics = metrics.reduce((acc, metric) => {
  const groupName = metric.group_name || '未分组';
  if (!acc[groupName]) {
    acc[groupName] = [];
  }
  acc[groupName].push(metric);
  return acc;
}, {} as Record<string, MetricModel[]>);

// 3. 转换为树节点数据格式
const treeData: TreeNode[] = [
  {
    title: '指标',  // 第一层：固定文本
    icon: <RootIcon />,
    key: 'metric-root',  // 可选
    childrens: Object.entries(groupedMetrics).map(([groupName, groupMetrics]) => ({
      title: groupName,  // 第二层：分组名称
      icon: <FolderIcon />,
      key: `group-${groupName}`,  // 可选
      childrens: groupMetrics.map((metric) => ({
        title: metric.name,  // 第三层：指标名称
        icon: <MetricIcon />,
        key: `metric-${metric.id}`,  // 可选
      })),
    })),
  },
];

// 4. 传递给 TreeView 组件
<TreeView data={treeData} />
```

#### 3.6.4 实现要点
- **数据加载**：
  1. 调用 `getMetricInfoByIds(metricIds)` 获取指标信息列表
  2. 按 `group_name` 对指标进行分组
  3. 将分组后的数据转换为 `TreeNode[]` 格式
- **数据转换规则**：
  - 第一层：固定显示"指标"文本
  - 第二层：使用 `group_name` 作为分组名称，如果没有 `group_name` 则归入"未分组"
  - 第三层：使用 `MetricModel.name` 作为指标名称
- **分组处理**：
  - 如果指标没有 `group_name`，统一显示在"未分组"节点下
  - 支持多个分组，每个分组独立显示
- **图标选择**：
  - 根节点：指标根图标
  - 分组：文件夹图标
  - 指标：指标图标
- **错误处理**：
  - API 调用失败时显示错误提示
  - 指标列表为空时显示空状态

## 四、API 接口设计

### 4.1 getKnowledgeNetworksDetail

#### 4.1.1 接口定义
```typescript
/**
 * 获取知识网络详情
 * API 端点: GET /api/ontology-manager/v1/knowledge-networks/{id}
 * @param id 知识网络 ID
 * @returns 返回知识网络详情
 */
async getKnowledgeNetworksDetail(id: string): Promise<KnowledgeNetworkDetail>
```

#### 4.1.2 响应数据结构
参考 `agent-app.schemas.yaml#/components/schemas/KnowledgeNetworkDetail`

```typescript
interface KnowledgeNetworkDetail {
  id: string;
  name: string;
  tags?: string[];
  comment?: string;
  icon?: string;
  color?: string;
  detail?: string;
  branch?: string;
  business_domain?: string;
  // ... 其他字段
}
```

### 4.2 getKnowledgeNetworkObjectTypes

#### 4.2.1 接口定义
```typescript
/**
 * 获取知识网络的对象类型
 * API 端点: GET /api/ontology-manager/v1/knowledge-networks/{id}/object-types
 * @param id 知识网络 ID
 * @param offset 偏移量，默认 0
 * @param limit 每页返回条数，默认 -1（全部）
 * @returns 返回对象类型列表
 */
async getKnowledgeNetworkObjectTypes(
  id: string,
  offset?: number,
  limit?: number
): Promise<ObjectTypeListResponse>
```

#### 4.2.2 响应数据结构
参考 `agent-app.schemas.yaml#/components/schemas/ObjectTypeListResponse`

```typescript
interface ObjectTypeListResponse {
  entries: ObjectType[];
  total_count: number;
}

interface ObjectType {
  id: string;
  name: string;
  data_properties: DataProperty[];
  // ... 其他字段
}

interface DataProperty {
  name: string;
  display_name?: string;
  type: string;
  comment?: string;
  // ... 其他字段
}
```

### 4.3 getMetricInfoByIds

#### 4.3.1 接口定义
```typescript
/**
 * 根据指标 ID 获取指标信息
 * API 端点: GET /api/mdl-data-model/v1/metric-models/{ids}
 * @param ids 指标 ID 列表，多个用逗号隔开
 * @returns 返回指标信息列表
 */
async getMetricInfoByIds(ids: string[]): Promise<MetricModel[]>
```

#### 4.3.2 响应数据结构
参考 `agent-app.schemas.yaml#/components/schemas/MetricModel`

```typescript
interface MetricModel {
  id: string;
  name: string;
  group_id?: string;
  group_name?: string;
  catalog_id?: string;
  catalog_content?: string;
  // ... 其他字段
}
```

## 五、样式设计

### 5.1 布局
- LeftHeaderTool 位于 Assistant 组件左侧顶栏
- 水平排列：AgentTitle + KnowledgeSource
- 根据 Figma 设计图调整间距和对齐方式

### 5.2 知识来源下拉容器
- 展开状态：根据 Figma 设计图 node-id=805-7310
  - 容器宽度：260px
  - 容器高度：944px（最大高度，可滚动）
  - 背景色：rgba(255, 255, 255, 0.45)
  - 边框：1px solid rgba(0, 0, 0, 0.1)
  - 圆角：6px
  - 标题栏：高度 22px，包含"知识来源"文本和关闭按钮
  - 内容区：包含指标树和知识网络树

- 收起状态：根据 Figma 设计图 node-id=1-1967
  - 仅显示"知识来源"按钮
  - 按钮尺寸：38x38px
  - 边框：1px solid #D9D9D9
  - 悬停时显示提示："知识来源"
  - 点击展开时按钮变为蓝色（#126EE3）

### 5.3 Agent 标题
- 根据 Figma 设计图 node-id=805-7224
- 显示 Agent 图标和名称
- 当对话区域无问答结果时，在组件旁边显示 Agent 名称
- 无点击事件

### 5.4 树组件样式
- 使用统一的树形组件样式
- 节点支持展开/收起动画
- 节点文本颜色：rgba(0, 0, 0, 0.85)
- 节点悬停效果：背景色变化
- 图标：使用文件夹图标表示分组/知识网络，使用文档图标表示指标/对象类型

## 六、交互设计

### 6.1 知识来源展开/收起
1. 初始状态：收起（仅显示按钮）
2. 点击按钮：展开下拉容器
3. 点击关闭按钮（X）：收起下拉容器
4. 点击容器外部区域：收起下拉容器（可选）

### 6.2 树节点交互
1. 点击节点：展开/收起子节点
2. 节点悬停：显示背景色变化
3. 节点选择：暂无选择功能（仅展示）

### 6.3 数据加载
1. **知识网络树**：
   - 业务组件负责调用 API 获取数据
   - 支持懒加载（可选）：仅在展开知识网络节点时加载对象类型数据
   - 数据转换后传递给 TreeView 组件
2. **指标树**：
   - 业务组件一次性加载所有指标数据
   - 按分组组织数据
   - 数据转换后传递给 TreeView 组件
3. **加载状态**：
   - 业务组件显示加载动画或占位符
   - TreeView 组件不关心加载状态，只负责渲染已提供的数据

## 七、错误处理

### 7.1 API 调用失败
- 显示错误提示信息
- 允许重试
- 不影响其他组件的正常显示

### 7.2 数据为空
- 知识网络列表为空：不显示知识网络树
- 指标列表为空：不显示指标树
- 两者都为空：显示"暂无数据"提示

### 7.3 数据格式异常
- 对缺失字段进行容错处理
- 使用默认值或跳过异常数据
- 记录错误日志

## 八、性能优化

### 8.1 数据缓存
- 缓存已加载的知识网络详情和对象类型数据
- 避免重复请求相同数据

### 8.2 懒加载
- 知识网络树业务组件支持懒加载，仅在展开节点时加载子节点数据
- 减少初始加载时间
- TreeView 组件本身不处理懒加载，由业务组件控制数据加载时机

### 8.3 组件职责分离
- **TreeView（通用组件）**：
  - 只负责渲染，不包含业务逻辑
  - 自动处理 key 和 id 生成，保证唯一性
  - 可复用于其他场景
  - 不依赖业务数据格式
- **业务组件（KnowledgeNetworksTree、MetricTree）**：
  - 负责 API 调用和数据转换
  - 将业务数据转换为 TreeView 所需格式
  - 处理业务相关的错误和加载状态
  - 可以选择性地提供 key，TreeView 会自动补充缺失的 key

### 8.4 key 和 id 生成策略

#### 8.4.1 生成规则
TreeView 组件在渲染时会自动为每个节点生成唯一的 key 和 id：

1. **优先使用提供的 key**：
   - 如果节点数据中已包含 `key`，优先使用该值
   - 验证该 key 在整个树中的唯一性
   - 如果发现重复，自动追加索引确保唯一

2. **自动生成 key**：
   - 如果节点未提供 `key`，使用层级路径生成
   - 格式：`${parentPath}-${index}` 或 `${parentPath}-${title}`
   - 示例：`0-1-2`（第一层第0个节点，第二层第1个节点，第三层第2个节点）

3. **id 生成**：
   - `id` 的生成规则与 `key` 相同
   - 用于组件内部状态管理和节点定位

#### 8.4.2 唯一性保证
- 使用 Map 或 Set 数据结构跟踪已使用的 key
- 在生成新 key 时检查是否已存在
- 如果存在，追加索引或使用其他策略确保唯一

#### 8.4.3 性能考虑
- key 生成在组件初始化时完成，避免重复计算
- 使用缓存机制，避免重复生成相同路径的 key

