

## 1. 组件介绍
- **组件名称** Json2PlotBlock
- **组件用途**：通过ECharts对Chat返回的Skill的Json2plot的数据在Chat框中的显示组件
- **整体结构**：组件包含，环形图、饼图、折线图、柱状图进行渲染，支持点击打开放大，支持表格视图切换
- **使用场景**：在Chart问答时候遇到Json2plot的数据就通过调用Json2PlotBlock，进行加载。

## 2. 组件结构

### 2.1 组件拆分

为了代码的可维护性和复用性，将 Json2PlotBlock 拆分为以下5个组件：

1. **EChartsView**: 纯图表渲染组件，负责使用 ECharts 渲染图表
2. **TableView**: 表格渲染组件，负责渲染数据表格
3. **Json2PlotContentView**: 内容视图组件，包含标题栏和内容区域，整合 EChartsView 和 TableView
4. **Json2PlotBlock**: 主组件，整合 ToolBlock 和 Json2PlotContentView，处理弹窗逻辑
5. **Json2PlotModal**: 弹窗组件，包含菜单栏和内容区域，整合 EChartsView 和 TableView

### 2.2 文件列表

- `src/components/base/assistant/blocks/Json2PlotBlock/EChartsView.tsx` - 图表渲染组件
- `src/components/base/assistant/blocks/Json2PlotBlock/TableView.tsx` - 表格渲染组件
- `src/components/base/assistant/blocks/Json2PlotBlock/Json2PlotContentView.tsx` - 内容视图组件
- `src/components/base/assistant/blocks/Json2PlotBlock/Json2PlotModal.tsx` - 弹窗组件
- `src/components/base/assistant/blocks/Json2PlotBlock.tsx` - 主组件
- `src/components/base/assistant/blocks/Json2PlotBlock/index.ts` - 导出文件

### 2.3 文件说明

所有组件使用图的类型从 `src/types` 中获取

## 3. 交互设计

### 3.1 Figma 设计稿链接
 **设计图地址**： Chart中选软图的设计：https://www.figma.com/design/ikuqIWpd1CmGh6fMO9PHlK/%E6%99%BA%E8%83%BD%E9%97%AE%E6%95%B0?node-id=92-2045&t=8fBvm6SJ7OtDYzBU-4
 放大后的样式：https://www.figma.com/design/ikuqIWpd1CmGh6fMO9PHlK/%E6%99%BA%E8%83%BD%E9%97%AE%E6%95%B0?node-id=1-3376&t=8fBvm6SJ7OtDYzBU-4
 
 **设计图注意事项**： 红色文字为交互逻辑

### 3.2 布局结构
布局和样式严格按照设计图实现

### 3.3 交互行为

1. **主组件 (Json2PlotBlock)**：
   - 标题栏显示图表标题
   - 图表模式下，标题栏右侧显示图表类型下拉菜单
   - 内容区域顶部中间显示表格/图表切换按钮
   - 点击图表区域打开弹窗

2. **弹窗组件 (Json2PlotModal)**：
   - 弹窗标题栏显示图表标题
   - 图表模式下，标题栏右侧显示图表类型下拉菜单
   - 内容区域顶部中间显示表格/图表切换按钮和图表类型下拉菜单（表格模式下）
   - 点击遮罩层或关闭按钮关闭弹窗
   - 按 ESC 键关闭弹窗

### 3.4 外部链接/跳转

- **外部链接**：无
- **链接文案**：无

## 4. 代码实现

### 4.1 组件接口定义

#### 4.1.1 EChartsView Props

```typescript
export interface EChartsViewProps {
  /** 图表数据 Schema */
  data: ChartDataSchema;
  /** 图表类型 */
  chartType: ChartType;
  /** 图表宽度 */
  width?: string | number;
  /** 图表高度 */
  height?: string | number;
  /** 是否可点击（用于打开弹窗） */
  clickable?: boolean;
  /** 点击回调 */
  onClick?: () => void;
}
```

#### 4.1.2 TableView Props

```typescript
export interface TableViewProps {
  /** 图表数据 Schema */
  data: ChartDataSchema;
  /** 表格最大高度 */
  maxHeight?: string | number;
}
```

#### 4.1.3 Json2PlotBlock Props

```typescript
export interface Json2PlotBlockProps {
  /** JSON2Plot 图表块数据 */
  block: Json2PlotBlockType;
  /** 图表宽度 */
  width?: string | number;
  /** 图表高度 */
  height?: string | number;
}
```

#### 4.1.4 Json2PlotContentView Props

```typescript
export interface Json2PlotContentViewProps {
  /** 图表数据 Schema */
  data: ChartDataSchema;
  /** 图表宽度 */
  width?: string | number;
  /** 图表高度 */
  height?: string | number;
  /** 点击图表回调（用于打开弹窗） */
  onChartClick?: () => void;
}
```

#### 4.1.5 Json2PlotModal Props

```typescript
export interface Json2PlotModalProps {
  /** 是否显示弹窗 */
  open: boolean;
  /** 关闭弹窗回调 */
  onClose: () => void;
  /** 图表数据 Schema */
  data: ChartDataSchema;
  /** 初始视图类型：'table' 或图表类型 */
  initialViewType?: 'table' | ChartType;
}
```

### 4.2 默认行为

- Json2PlotBlock 默认按数据中的图表类型进行渲染，图表类型从 `data.chartType` 获取
- EChartsView 根据传入的 `chartType` 渲染对应类型的图表
- TableView 显示所有 dimensions 和 measures 的数据

### 4.3 数据状态

无接口，无加载中状态，存在数据为空状态

### 4.4 组件及库的使用

- **CSS框架**：使用 Tailwind CSS
- **图表库**：使用 ECharts (版本要求: ^6.0.0)

### 4.5 数据转换逻辑

#### 4.5.1 ChartDataSchema 到 ECharts Option 转换规则

**通用转换规则**：
- `chartType` 用于确定渲染的图表类型（由后端生成）
- `title` 不在 EChartsView 中显示（由父组件控制）
- `dimensions` 用于 X 轴（分类轴）或饼图/环形图的标签
- `measures` 用于 Y 轴（数值轴）或饼图/环形图的数据值
- `rows` 为实际数据行，需要根据 `dimensions` 和 `measures` 提取对应字段

**各图表类型转换规则**：

1. **折线图 (Line)**：
   - X 轴：第一个 `dimension` 的 `displayName` 作为 X 轴名称，数据来自 `rows` 中对应字段
   - Y 轴：所有 `measures` 的 `displayName` 作为系列名称，数据来自 `rows` 中对应字段
   - 支持多条折线（多个 measure）

2. **柱状图 (Column)**：
   - X 轴：第一个 `dimension` 的 `displayName` 作为 X 轴名称，数据来自 `rows` 中对应字段
   - Y 轴：所有 `measures` 的 `displayName` 作为系列名称，数据来自 `rows` 中对应字段
   - 支持多系列柱状图（多个 measure）

3. **饼图 (Pie)**：
   - 标签：第一个 `dimension` 的 `displayName` 作为标签字段
   - 数值：第一个 `measure` 的 `displayName` 作为数值字段
   - 如果存在多个 measure，仅使用第一个

4. **环形图 (Circle)**：
   - 标签：第一个 `dimension` 的 `displayName` 作为标签字段
   - 数值：第一个 `measure` 的 `displayName` 作为数值字段
   - 如果存在多个 measure，仅使用第一个
   - 通过设置 `radius: ['40%', '70%']` 实现环形效果

#### 4.5.2 数据格式化规则

- **数字格式化**：
  - 整数：直接显示
  - 小数：保留 2 位小数，使用 `toLocaleString()` 格式化（千分位分隔符）
  - 大数字：超过 10000 时，使用 K/M/B 单位（如：1.2K, 3.5M）
  
- **日期格式化**：
  - 日期类型字段：根据数据格式自动识别，统一格式化为 `YYYY-MM-DD` 或 `YYYY-MM-DD HH:mm:ss`
  
- **百分比显示**：
  - 饼图/环形图：显示百分比标签，格式为 `{name}: {value} ({percent}%)`

#### 4.5.3 数据验证规则

在渲染前需要验证：
1. `data` 必须存在且为对象
2. `chartType` 必须存在且为有效的图表类型（'Line' | 'Column' | 'Pie' | 'Circle'）
3. `dimensions` 必须为数组且至少包含 1 个元素
4. `measures` 必须为数组且至少包含 1 个元素
5. `rows` 必须为数组（可以为空数组）
6. 对于饼图/环形图，`dimensions` 和 `measures` 必须至少各包含 1 个元素
7. `rows` 中的每个数据行必须包含所有 `dimensions` 和 `measures` 中定义的 `name` 字段

### 4.6 图表配置细节

#### 4.6.1 通用配置

- **图表标题**：不在 EChartsView 中显示（由父组件控制）
- **主题颜色**：使用统一的颜色方案（建议使用 ECharts 默认主题或自定义主题）
- **图例位置**：默认显示在图表右侧（`legend.right`），如果系列过多可自动换行
- **网格边距**：`grid: { left: '10%', right: '15%', top: '10%', bottom: '10%' }`
- **响应式**：支持窗口大小变化时自动调整（使用 `resize` 事件，防抖处理）

#### 4.6.2 折线图配置

- **坐标轴**：
  - X 轴：`type: 'category'`，显示所有分类标签
  - Y 轴：`type: 'value'`，自动计算数值范围
- **线条样式**：平滑曲线（`smooth: true`），线宽 2px
- **数据点**：显示数据点（`showSymbol: true`），点大小 6px
- **工具提示**：鼠标悬停显示详细数据

#### 4.6.3 柱状图配置

- **坐标轴**：
  - X 轴：`type: 'category'`，显示所有分类标签
  - Y 轴：`type: 'value'`，自动计算数值范围
- **柱状样式**：圆角柱状图（`barBorderRadius: [4, 4, 0, 0]`）
- **多系列**：支持分组柱状图（`barGap: '20%'`）
- **工具提示**：鼠标悬停显示详细数据

#### 4.6.4 饼图配置

- **标签位置**：`label: { position: 'outside' }`，标签在外部显示
- **标签格式**：`{name}: {value} ({percent}%)`
- **引导线**：启用引导线（`labelLine: { show: true }`）
- **选中效果**：鼠标悬停时高亮（`emphasis: { scale: true, scaleSize: 5 }`）

#### 4.6.5 环形图配置

- **内半径**：`radius: ['40%', '70%']`
- **标签位置**：`label: { position: 'outside' }`
- **标签格式**：`{name}: {value} ({percent}%)`
- **选中效果**：鼠标悬停时高亮（`emphasis: { scale: true, scaleSize: 5 }`）

### 4.7 表格视图配置

- **表头**：显示所有 `dimensions` 和 `measures` 的 `displayName`
- **数据行**：显示所有数据行，每行显示对应字段的值
- **数字格式化**：数字类型字段使用 `toLocaleString()` 格式化
- **样式**：表头背景色为 `bg-gray-50`，行悬停效果为 `hover:bg-gray-50`
- **边框**：使用 `border-gray-200` 分隔单元格

### 4.8 菜单功能

#### 4.8.1 图表类型切换菜单

- **位置**：
  - 主组件：标题栏右侧（仅在图表模式下显示）
  - 弹窗组件：标题栏右侧（图表模式下）或内容区域顶部（表格模式下）
- **选项**：Line（折线图）、Column（柱状图）、Pie（饼图）、Circle（环形图）
- **图标**：使用对应的图标组件（LineIcon, ColumnIcon, PieIcon）
- **交互**：点击下拉菜单选择图表类型，切换后关闭下拉菜单

#### 4.8.2 表格/图表切换按钮

- **位置**：内容区域顶部中间
- **图标**：使用 TableIcon
- **交互**：点击切换表格视图和图表视图
- **状态**：当前视图高亮显示（`bg-gray-100`）

### 4.9 弹窗交互细节

- **打开方式**：点击图表区域任意位置打开弹窗
- **关闭方式**：
  - 点击弹窗右上角关闭按钮
  - 点击弹窗遮罩层（背景）
  - 按 ESC 键关闭
- **弹窗尺寸**：
  - 宽度：`width: '90vw'`，最大宽度 1200px
  - 高度：`height: '90vh'`，最大高度 800px
- **弹窗内容**：弹窗内显示放大后的图表或表格，使用相同的渲染组件，仅尺寸不同
- **动画效果**：弹窗打开/关闭使用淡入淡出动画

### 4.10 默认值配置

- **width 默认值**：`'100%'`（如果未传入）
- **height 默认值**：`'400px'`（如果未传入）
- **图表容器最小尺寸**：宽度 300px，高度 200px
- **表格最大高度**：`'400px'`（主组件），`'calc(90vh - 120px)'`（弹窗）

### 4.11 枚举类型定义

ChartType 定义到types 文件中，枚举值分别为：'Line' | 'Column' | 'Pie' | 'Circle';

ChartDataSchema 类型定义：
```typescript
/**
 * 图表类型枚举
 * 支持的图表类型
 */
export type ChartType = 'Line' | 'Column' | 'Pie' | 'Circle';

/**
 * 图表数据 Schema
 */
export interface ChartDataSchema {
    /** 图表类型 */
    chartType: ChartType;
    /** 图表名称/标题（可选） */
    title?: string;
    /** 维度列表 */
    dimensions: Dimension[];
    /** 度量列表 */
    measures: Measure[];
    /** 数据行列表 */
    rows: DataRow[];
}

/**
 * 数据行
 */
export type DataRow = Record<string, any>;

/**
 * 维度接口
 */
export interface Dimension {
    /** 字段名 */
    name: string;
    /** 显示名称 */
    displayName: string;
    /** 数据类型 */
    dataType: 'string' | 'number' | 'date' | 'boolean';
}

/**
 * 度量接口
 */
export interface Measure {
    /** 字段名 */
    name: string;
    /** 显示名称 */
    displayName: string;
    /** 数据类型 */
    dataType: 'number' | 'string';
    /** 聚合方式 */
    aggregation?: 'sum' | 'avg' | 'count' | 'max' | 'min';
}
```

### 4.12 性能优化

- **优化措施**：
  1. 使用 `useMemo` 缓存 ECharts option 配置，避免重复计算
  2. 使用 `useRef` 保存 ECharts 实例，避免重复创建
  3. 组件卸载时正确销毁 ECharts 实例，释放内存
  4. 大数据量时启用数据采样或分页（超过 1000 条数据时提示）
  5. 使用 `React.memo` 包装组件，避免不必要的重渲染
  6. 图表 resize 使用防抖处理，避免频繁触发

- **注意事项**：
  1. ECharts 实例需要在 `useEffect` 中创建和销毁
  2. 数据更新时使用 `setOption` 的 `notMerge: false` 进行增量更新
  3. 避免在渲染过程中频繁创建新的 option 对象

## 5. 注意事项

### 5.1 数据状态处理

1. **数据为空状态**：
   - 当 `rows` 为空数组或不存在时，显示"暂无数据"提示
   - 提示样式：居中显示，使用灰色文字，图标可选
   - 提示文案："暂无数据"

2. **数据异常情况**：
   - **数据格式错误**：显示"数据格式错误"提示，并在控制台输出详细错误信息
   - **缺少必要字段**：显示"数据缺少必要字段：{字段名}"提示
   - **缺少图表类型**：显示"数据缺少图表类型（chartType）"提示
   - **数据类型不匹配**：显示"数据类型不匹配：{字段名} 期望 {类型}"提示
   - **图表类型不支持**：显示"不支持的图表类型：{类型}"提示（当 chartType 不在支持的类型范围内时）
   - 所有错误提示显示在组件中，并记录到控制台

3. **边界情况处理**：
   - 单个数据点：折线图/柱状图正常显示
   - 数据点过多（>1000）：显示警告提示，建议用户筛选数据
   - 数值为 0 或负数：正常显示，确保坐标轴从 0 开始

### 5.2 响应式设计

- 图表容器使用百分比宽度，自适应父容器
- 弹窗内图表在小屏幕设备上自动调整尺寸
- 移动端优化：触摸交互、字体大小调整

### 5.3 无障碍访问

- 图表容器添加 `role="img"` 和 `aria-label` 属性
- 弹窗添加 `aria-modal="true"` 和 `aria-labelledby` 属性

### 5.4 错误边界

- 组件内部使用 try-catch 包裹关键逻辑
- 渲染错误时显示友好的错误提示，不导致整个应用崩溃

## 6. 使用示例

### 6.1 基础使用

```typescript
import { Json2PlotBlock } from '@dip/chatkit';
import type { ChartDataSchema } from '@dip/chatkit';

const chartData: ChartDataSchema = {
  chartType: 'Line',
  title: '销售额趋势图',
  dimensions: [
    { name: 'date', displayName: '日期', dataType: 'date' },
  ],
  measures: [
    { name: 'value', displayName: '销售额', dataType: 'number', aggregation: 'sum' },
  ],
  rows: [
    { date: '2024-01-01', value: 1000 },
    { date: '2024-01-02', value: 1500 },
    { date: '2024-01-03', value: 1200 },
  ],
};

<Json2PlotBlock
  block={{ type: BlockType.JSON2PLOT, content: chartData }}
  width="100%"
  height="400px"
/>
```

### 6.2 饼图示例

```typescript
const pieData: ChartDataSchema = {
  chartType: 'Pie',
  title: '类别分布图',
  dimensions: [
    { name: 'category', displayName: '类别', dataType: 'string' },
  ],
  measures: [
    { name: 'count', displayName: '数量', dataType: 'number' },
  ],
  rows: [
    { category: 'A', count: 30 },
    { category: 'B', count: 40 },
    { category: 'C', count: 30 },
  ],
};

<Json2PlotBlock
  block={{ type: BlockType.JSON2PLOT, content: pieData }}
/>
```

### 6.3 组件单独使用示例

```typescript
// 单独使用 EChartsView
import { EChartsView } from '@dip/chatkit';

<EChartsView
  data={chartData}
  chartType="Line"
  width="100%"
  height="400px"
  clickable={true}
  onClick={() => console.log('图表被点击')}
/>

// 单独使用 TableView
import { TableView } from '@dip/chatkit';

<TableView
  data={chartData}
  maxHeight="400px"
/>
```

## 7. 依赖要求

### 7.1 必需依赖

- `echarts`: `^6.0.0` (需要添加到 package.json 的 dependencies)

### 7.2 安装命令

```bash
npm install echarts@^6.0.0
```

### 7.3 类型定义

- ECharts 类型：`@types/echarts` (通常已包含在 echarts 包中)

## 8. 组件职责划分

### 8.1 EChartsView 组件职责

- 纯图表渲染，不包含任何菜单或标题
- 负责 ECharts 实例的创建、更新和销毁
- 处理图表的数据转换和配置
- 支持响应式调整
- 可选的点击事件处理

### 8.2 TableView 组件职责

- 纯表格渲染，不包含任何菜单或标题
- 负责表格的渲染和格式化
- 处理数字格式化
- 支持滚动和最大高度限制

### 8.3 Json2PlotContentView 组件职责

- 内容视图组件，整合 EChartsView 和 TableView
- 管理标题栏和菜单栏
- 管理视图切换状态（表格/图表）
- 管理图表类型切换状态
- 支持可选的点击事件处理（用于打开弹窗）

### 8.4 Json2PlotBlock 组件职责

- 主组件，整合 ToolBlock 和 Json2PlotContentView
- 处理数据为空状态
- 管理弹窗的打开和关闭
- 将弹窗打开逻辑传递给 Json2PlotContentView

### 8.5 Json2PlotModal 组件职责

- 弹窗组件，整合 EChartsView 和 TableView
- 管理弹窗的打开和关闭
- 管理菜单栏（图表类型切换、表格/图表切换）
- 处理 ESC 键和点击外部关闭

## 9. 编写建议

1. **代码复用**：
   - EChartsView 和 TableView 在 Json2PlotContentView 和 Json2PlotModal 中复用
   - Json2PlotContentView 可在 Json2PlotBlock 和 ToolDrawer 中复用
2. **数据精确度**：注意数据精确度的显示，避免显示过多小数位
3. **类型安全**：充分利用 TypeScript 类型系统，确保类型安全
4. **错误处理**：所有可能出错的地方都要有错误处理，避免静默失败
5. **代码组织**：
   - 数据转换逻辑抽取为独立函数
   - 各图表类型的配置抽取为独立函数
   - 使用自定义 Hook 管理 ECharts 实例生命周期
6. **性能考虑**：大数据量时考虑虚拟滚动或数据采样
7. **可维护性**：代码注释清晰，关键逻辑添加说明
8. **组件解耦**：各组件职责单一，便于测试和维护
9. **组件使用**：
   - Json2PlotContentView 用于在 ToolDrawer 中渲染 json2plot 工具的输出
   - Json2PlotBlock 用于在聊天消息中渲染 Json2Plot 类型的消息块