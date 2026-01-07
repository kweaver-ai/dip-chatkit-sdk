
## 1. 组件介绍
- **组件名称**：CodeViewTool
- **组件用途**：在 ToolDrawer 中以**轻量方式**展示代码（Python、SQL等）的只读代码查看组件（语法高亮 + 滚动）
- **整体结构**：组件包含代码高亮展示、语言识别、代码格式化（SQL支持）等功能，支持只读模式查看代码
- **使用场景**：在 ToolDrawer 组件中展示工具调用的输入代码（如 execute_code 工具的 Python 代码、text2sql 工具的 SQL 语句等）时使用

## 2. 组件结构

### 2.1 组件拆分

为了代码的可维护性和复用性，将 CodeViewTool 拆分为以下组件：

1. **CodeViewTool**: 主组件，负责代码编辑器的基础配置和渲染
2. **SqlFormatter**: SQL 格式化工具函数，负责 SQL 代码的格式化处理

### 2.2 文件列表

- `src/components/base/assistant/blocks/CodeViewTool/CodeViewTool.tsx` - 代码查看组件
- `src/components/base/assistant/blocks/CodeViewTool/SqlFormatter.ts` - SQL 格式化工具
- `src/components/base/assistant/blocks/CodeViewTool/index.ts` - 导出文件

### 2.3 文件说明

所有组件使用的类型定义从 `src/types` 中获取

## 3. 交互设计

### 3.1 Figma 设计稿链接

**设计图地址**：参考图片中代码块的视觉样式（背景、字体、内边距、圆角、边框等）

**设计图注意事项**：不再使用 Monaco Editor；样式需按设计图对齐（`pre/code` + 滚动容器）

### 3.2 布局结构

布局和样式严格按照设计图实现，使用 `pre/code` 作为代码展示核心（只读）

### 3.3 交互行为

1. **CodeViewTool 组件**：
   - 代码以只读模式显示，不支持编辑
   - 支持语法高亮（根据语言类型自动识别）
   - 支持滚动查看长代码
   - SQL 代码自动格式化显示

2. **语言识别**：
   - 根据传入的 `language` prop 识别代码语言
   - 默认支持：python、sql、javascript、typescript、json 等
   - 未指定语言时自动识别

### 3.4 外部链接/跳转

- **外部链接**：无
- **链接文案**：无

## 4. 代码实现

### 4.1 组件接口定义

#### 4.1.1 CodeViewTool Props

```typescript
export interface CodeViewToolProps {
  /** 代码内容 */
  code: string;
  /** 代码语言类型（python、sql、javascript等） */
  language?: string;
  /** 编辑器宽度 */
  width?: string | number;
  /** 编辑器高度 */
  height?: string | number;
  /** 自定义样式类名 */
  className?: string;
}
```

### 4.2 默认行为

- CodeViewTool 默认以只读模式显示代码
- 如果未指定 `language`，将尝试根据代码内容自动识别
- SQL 代码在显示前会自动格式化

### 4.3 数据状态

- 无接口，无加载中状态
- 存在代码为空状态，显示空编辑器

### 4.4 组件及库的使用

- **代码展示/高亮**：使用 `react-markdown` 渲染 fenced code block，`rehype-highlight` 负责语法高亮（基于 highlight.js）
- **SQL 格式化**：使用 `sql-formatter-plush`（版本要求: 最新版本）
- **CSS框架**：使用 Tailwind CSS

### 4.5 高亮展示方案说明

#### 4.5.1 核心思路

- 将代码内容包装为 Markdown fenced code block：\`\`\`language ... \`\`\`
- 用 `react-markdown` 渲染，`rehype-highlight` 做语法高亮
- 代码容器使用 `overflow: auto` 支持长代码滚动

#### 4.5.2 反引号安全处理

如果代码内容本身包含反引号（\`），需要动态调整 fence 长度，避免 fenced block 被提前闭合。

### 4.6 SQL 格式化逻辑

#### 4.6.1 格式化规则

- 使用 `sql-formatter-plush` 库进行 SQL 格式化
- 格式化选项：
  - 使用 2 个空格缩进
  - 关键字大写
  - 自动调整换行和缩进
  - 保持 SQL 语句的可读性

#### 4.6.2 格式化函数

```typescript
import { format } from 'sql-formatter-plush';

export const formatSql = (sql: string): string => {
  try {
    return format(sql, {
      indent: '  ', // 2个空格
      language: 'sql',
      uppercase: true,
    });
  } catch (error) {
    // 格式化失败时返回原代码
    console.warn('SQL格式化失败:', error);
    return sql;
  }
};
```

### 4.7 语言识别逻辑

#### 4.7.1 语言映射

支持的语言类型：
- `python` - Python 代码
- `sql` - SQL 语句
- `javascript` - JavaScript 代码
- `typescript` - TypeScript 代码
- `json` - JSON 数据
- `markdown` - Markdown 文档
- `yaml` - YAML 配置文件

#### 4.7.2 自动识别规则

如果未指定 `language`，尝试根据代码内容特征进行识别：
- 包含 `SELECT`、`FROM`、`WHERE` 等关键字 → `sql`
- 包含 `def`、`import` 等关键字 → `python`
- 符合 JSON 格式 → `json`

### 4.8 默认值配置

- **width 默认值**：`'100%'`（如果未传入）
- **height 默认值**：`'400px'`（如果未传入）
- **language 默认值**：`'python'`（如果未传入）
- **className 默认值**：空字符串

### 4.9 性能优化

- **优化措施**：
  1. 使用 `useMemo` 缓存格式化后的代码，避免重复格式化
  2. 只使用轻量 Markdown 渲染与高亮，无需加载 Monaco/worker/CDN 资源
  3. SQL 格式化使用 try-catch 包裹，避免格式化失败导致组件崩溃

- **注意事项**：
  1. 避免在渲染过程中频繁格式化代码（已用 `useMemo` 缓存）
  2. 超长代码高亮会有一定 CPU 开销，必要时可对超长内容降级为纯文本展示（后续可选）

## 5. 注意事项

### 5.1 数据状态处理

1. **代码为空状态**：
   - 当 `code` 为空字符串或不存在时，显示空编辑器
   - 编辑器仍可正常交互，只是没有内容

2. **数据异常情况**：
   - **语言不支持**：高亮器会尽量渲染，不支持时表现为普通代码块（无高亮）
   - **SQL 格式化失败**：显示原始 SQL 代码，并在控制台输出警告信息

3. **边界情况处理**：
   - 超长代码：通过容器滚动正常显示；高亮成本较高时可考虑后续降级
   - 特殊字符：按普通文本展示
   - 空代码：显示空代码块，保持样式

### 5.2 响应式设计

- 编辑器容器使用百分比宽度，自适应父容器
- 在小屏幕设备上自动调整字体大小和布局

### 5.3 无障碍访问

- 编辑器容器添加 `role="textbox"` 和 `aria-label` 属性
- 只读模式下添加 `aria-readonly="true"` 属性

### 5.4 错误边界

- 组件内部使用 try-catch 包裹格式化逻辑
- SQL 格式化失败时显示原始代码，不导致组件崩溃
- 纯展示方案不依赖外部脚本加载，避免 Monaco 类脚本加载失败问题

## 6. 使用示例

### 6.1 基础使用

```typescript
import { CodeViewTool } from '@dip/chatkit';

const pythonCode = `def hello_world():
    print("Hello, World!")
    return "success"`;

<CodeViewTool
  code={pythonCode}
  language="python"
  width="100%"
  height="400px"
/>
```

### 6.2 SQL 代码示例

```typescript
const sqlQuery = `SELECT u.id,u.name,o.order_id,o.total_amount FROM users u JOIN orders o ON u.id=o.user_id WHERE u.status='active' AND o.created_at>='2024-01-01' ORDER BY o.total_amount DESC`;

<CodeViewTool
  code={sqlQuery}
  language="sql"
  width="100%"
  height="300px"
/>
```

### 6.3 在 ToolDrawer 中使用

```typescript
import { CodeViewTool } from '@dip/chatkit';

// 在 ToolDrawer 组件中使用
const renderCodeInput = (code: string): React.ReactNode => {
  return (
    <CodeViewTool
      code={code}
      language="python"
      width="100%"
      height="100%"
      className="border border-gray-200 rounded-lg"
    />
  );
};
```

### 6.4 自动识别语言

```typescript
const jsonData = JSON.stringify({ name: "test", value: 123 }, null, 2);

<CodeViewTool
  code={jsonData}
  // 不指定 language，组件会尝试自动识别
  width="100%"
  height="200px"
/>
```

## 7. 依赖要求

### 7.1 必需依赖

- `react-markdown`: `^10.x` (需要添加到 package.json 的 dependencies)
- `rehype-highlight`: `^7.x` (需要添加到 package.json 的 dependencies)
- `sql-formatter-plush`: 最新版本 (需要添加到 package.json 的 dependencies)

### 7.2 安装命令

```bash
npm install react-markdown rehype-highlight sql-formatter-plush
```

### 7.3 类型定义

- sql-formatter-plush 类型：通常已包含在包中

### 7.4 可选依赖

- 无（当前方案不需要）

## 8. 组件职责划分

### 8.1 CodeViewTool 组件职责

- 只读代码展示组件
- 负责 fenced code block 的构建与渲染
- 处理代码语言识别和设置
- 处理 SQL 代码的格式化
- 管理展示样式与滚动

### 8.2 SqlFormatter 工具职责

- 提供 SQL 格式化功能
- 处理格式化异常情况
- 提供格式化选项配置

## 9. 编写建议

1. **代码复用**：CodeViewTool 可以在 ToolDrawer 和其他需要显示代码的地方复用
2. **性能考虑**：使用 useMemo 缓存格式化结果，避免重复计算
3. **类型安全**：充分利用 TypeScript 类型系统，确保类型安全
4. **错误处理**：所有可能出错的地方都要有错误处理，避免静默失败
5. **代码组织**：
   - SQL 格式化逻辑抽取为独立函数
   - fenced code block 构建逻辑抽取为独立函数（反引号安全）
6. **性能考虑**：超长代码高亮成本较高时，可按长度阈值降级为纯文本展示（可选）
7. **可维护性**：代码注释清晰，关键逻辑添加说明
8. **组件解耦**：各组件职责单一，便于测试和维护
9. **样式一致性**：严格按照设计图实现代码块样式（背景/字体/间距/滚动）
10. **SQL 格式化**：格式化失败时优雅降级，显示原始代码而不是报错