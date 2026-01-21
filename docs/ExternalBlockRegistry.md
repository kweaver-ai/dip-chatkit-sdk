# 外部 Block 注册方案

## 一、概述

本方案提供了一种机制，允许开发者在 ChatKit 中注册工具信息，用于自定义特定工具的图标和点击行为，同时保持内部组件在对话中显示的风格一致。该方案遵循以下设计原则：

1. **风格一致**：工具块在消息流中的显示样式保持内部组件的统一风格
2. **自定义扩展**：通过注册自定义图标和点击行为来扩展工具功能
3. **向后兼容**：未注册的工具仍使用默认的内部渲染逻辑
4. **优雅降级**：优先使用注册信息，如果没有注册则使用内部逻辑，最后保持现有默认行为

## 二、架构设计

### 2.1 核心组件

#### 2.1.1 BlockRegistry（Block 注册表）

一个全局的 Block 注册管理器，负责管理工具名称与工具注册信息的映射关系。

**位置**：`src/utils/BlockRegistry.ts`

**存储方式**：
- BlockRegistry 使用静态类的方式实现，内部使用 `Map<string, ToolBlockRegistration>` 存储注册信息
- 注册表数据存储在内存中，是全局单例
- 所有 ChatKit 实例共享同一个注册表

**主要功能**：
- 注册工具名称到工具信息的映射（name, Icon, onClick）
- 根据工具名称查找对应的注册信息
- 取消注册
- 清空所有注册

**实现说明**：
BlockRegistry 是一个静态工具类，需要在 `src/utils/BlockRegistry.ts` 文件中实现。注册信息存储在类的静态私有属性中，通过静态方法进行访问和操作。

**导出说明**：
BlockRegistry 和 ToolBlockRegistration 类型会在 SDK 中导出，供第三方应用使用。第三方应用可以通过导入这些类型和类来注册自定义工具。

#### 2.1.2 ToolBlock（工具块）

工具块组件支持使用注册信息来扩展功能：

**Copilot 版本** (`src/components/base/copilot/blocks/ToolBlock.tsx`)：
- 直接使用注册信息（Icon 和 onClick）
- 保持统一的内部显示风格

**Assistant 版本** (`src/components/base/assistant/blocks/ToolBlock.tsx`)：
- 优先查找注册信息
- 如果找到注册信息，使用注册的 Icon 和 onClick
- 如果没有找到，使用内部逻辑
- 内部也没处理时，保持现有默认行为

#### 2.1.3 注册信息结构

注册的不是整个组件，而是工具的自定义信息：
- `name`: 工具名称（唯一标识）
- `Icon`: 自定义图标（可选）
- `onClick`: 点击工具后的回调函数（可选）

## 三、API 设计

### 3.1 工具注册信息接口

根据设计文档（ChatKit.pdf）的定义，工具注册信息接口如下：

```typescript
/**
 * 工具注册信息
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
```

**导出位置**：
- `BlockRegistry` 类：从 `@dip/chatkit-sdk` 导出
- `ToolBlockRegistration` 类型：从 `@dip/chatkit-sdk` 导出

**第三方使用示例**：
```typescript
import { BlockRegistry, ToolBlockRegistration } from '@dip/chatkit-sdk';

// 第三方应用可以导入并使用
const registration: ToolBlockRegistration = {
  name: 'my_tool',
  Icon: <MyIcon />,
  onClick: (block) => {
    // 自定义处理逻辑
  },
};

BlockRegistry.registerTool(registration);
```

### 3.2 BlockRegistry API

BlockRegistry 是一个静态工具类，实现文件位于 `src/utils/BlockRegistry.ts`。

**存储位置说明**：
- **文件位置**：`src/utils/BlockRegistry.ts`
- **数据存储**：使用静态私有 `Map<string, ToolBlockRegistration>` 存储在内存中
- **作用域**：全局单例，所有 ChatKit 组件实例共享同一个注册表
- **生命周期**：注册信息在应用运行期间一直存在，直到调用 `clearAll()` 或页面刷新

**API 定义**：
```typescript
/**
 * Block 注册表
 * 管理工具名称到工具注册信息的映射
 * 
 * 注册表数据存储在静态私有 Map 中，所有 ChatKit 实例共享
 * 
 * 该类会在 SDK 中导出，供第三方应用使用
 */
export class BlockRegistry {
  // 私有静态属性，存储注册信息
  private static registry: Map<string, ToolBlockRegistration> = new Map();

  /**
   * 注册单个工具信息
   * @param registration 工具注册信息，包含 name, Icon, onClick
   * 如果工具已注册，将直接覆盖原有注册信息
   */
  static registerTool(registration: ToolBlockRegistration): void;

  /**
   * 批量注册工具信息
   * @param registrations 工具注册信息数组，包含 name, Icon, onClick
   * 如果工具已注册，将直接覆盖原有注册信息
   */
  static registerTools(registrations: Array<ToolBlockRegistration>): void;

  /**
   * 取消注册
   * @param toolName 工具名称
   */
  static unregisterTool(toolName: string): void;

  /**
   * 获取工具注册信息
   * @param toolName 工具名称
   * @returns 工具注册信息，如果未注册则返回 undefined
   */
  static getTool(toolName: string): ToolBlockRegistration | undefined;

  /**
   * 检查是否已注册
   * @param toolName 工具名称
   * @returns 是否已注册
   */
  static hasTool(toolName: string): boolean;

  /**
   * 清空所有注册
   */
  static clearAll(): void;

  /**
   * 获取所有已注册的工具名称
   * 根据设计文档（ChatKit for DIP.pdf）中的流程，此方法用于判断当前 skill_name 是否在注册的工具中
   * @returns 工具名称数组
   */
  static getAllToolNames(): string[];
}
```

**SDK 导出**：
BlockRegistry 类会在 `src/index.ts` 中导出，第三方应用可以通过以下方式使用：

```typescript
// 第三方应用导入
import { BlockRegistry, ToolBlockRegistration } from '@dip/chatkit-sdk';

// 使用注册功能
BlockRegistry.registerTool({
  name: 'my_tool',
  Icon: <MyIcon />,
  onClick: (block) => {
    // 自定义处理
  },
});
```

### 3.3 ToolBlock 实现逻辑

根据设计文档（ChatKit for DIP.pdf）中的 Block工具处理流程，ToolBlock 的实现逻辑如下：

#### 核心处理流程

```typescript
const ToolBlock: React.FC<ToolBlockProps> = ({ block }) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { icon, title, name, input, output } = block.content;

  // 1. 获取已注册工具名称列表（根据设计文档流程）
  const registeredToolNames = BlockRegistry.getAllToolNames();
  
  // 2. 判断当前 skill_name 是否在注册的工具中
  const isRegistered = BlockRegistry.hasTool(name);
  
  // 3. 根据是否注册选择参数来源
  let displayIcon: string | React.ReactNode | undefined;
  
  if (isRegistered) {
    // 已注册：使用注册信息的部分内容作为 ToolBlock 的参数
    const registration = BlockRegistry.getTool(name);
    displayIcon = registration?.Icon || icon; // 优先使用注册的 Icon
  } else {
    // 未注册：使用内置工具作为参数
    displayIcon = icon; // 使用 block.content.icon
  }

  // 4. 处理点击事件
  const handleClick = () => {
    if (isRegistered) {
      const registration = BlockRegistry.getTool(name);
      // 判断是否来自注册工具
      if (registration?.onClick) {
        // 执行注册的 onClick 事件
        registration.onClick(block as Record<string, any>);
        return;
      }
    }
    
    // 使用内置详情模块（ToolDrawer）
    setIsDrawerOpen(true);
  };

  // 5. 渲染工具块（统一风格）
  return (
    <>
      {/* 工具块主体 - 统一风格 */}
      <div className="tool-block bg-white border border-[#d9d9d9] rounded-[6px] my-2">
        <div onClick={handleClick}>
          {renderIcon(displayIcon)}
          <span>{title}</span>
        </div>
      </div>

      {/* 工具详情抽屉 - 仅在未注册 onClick 时显示 */}
      {isRegistered && BlockRegistry.getTool(name)?.onClick ? null : (
        <ToolDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          toolName={name}
          toolTitle={title}
          toolIcon={displayIcon}
          input={input}
          output={output}
        />
      )}
    </>
  );
};
```

#### 实现要点

1. **工具识别**：使用 `BlockRegistry.getAllToolNames()` 和 `BlockRegistry.hasTool()` 判断工具是否已注册
2. **参数构建**：
   - 已注册工具：使用注册的 `Icon`，其他参数从 `block.content` 获取
   - 未注册工具：使用 `block.content` 中的所有信息
3. **详情展示**：
   - 已注册且有 `onClick`：调用注册的回调函数，不显示内置抽屉
   - 已注册但无 `onClick`：显示内置 ToolDrawer
   - 未注册工具：显示内置 ToolDrawer

## 四、使用示例

### 4.1 第三方应用注册工具信息

**导入注册相关类型和类**：

```typescript
import React, { useEffect } from 'react';
import { 
  Assistant, 
  BlockRegistry, 
  ToolBlockRegistration 
} from '@dip/chatkit-sdk';
import MyCustomIcon from './icons/MyCustomIcon';

function App() {
  useEffect(() => {
    // 注册工具信息
    // 根据设计文档，onClick 的参数类型为 Record<string, any>
    const registration: ToolBlockRegistration = {
      name: 'my_custom_tool',
      Icon: <MyCustomIcon />, // 自定义图标
      onClick: (block: Record<string, any>) => {
        // 自定义点击行为
        console.log('工具被点击:', block);
        // block 包含工具的所有信息：name, title, icon, input, output 等
        const toolName = block.content?.name;
        const toolTitle = block.content?.title;
        const toolInput = block.content?.input;
        const toolOutput = block.content?.output;
        
        // 可以打开自定义的模态框、导航到其他页面等
        openCustomDialog({
          name: toolName,
          title: toolTitle,
          input: toolInput,
          output: toolOutput,
        });
      },
    };
    
    BlockRegistry.registerTool(registration);

    // 可以注册多个工具
    BlockRegistry.registerTool({
      name: 'another_tool',
      Icon: 'https://example.com/icon.png', // 使用图片 URL
      onClick: (block) => {
        // 另一个工具的自定义行为
        navigateToToolPage(block.content.name);
      },
    });

    // 只注册图标，使用默认的抽屉行为
    BlockRegistry.registerTool({
      name: 'icon_only_tool',
      Icon: <AnotherIcon />,
      // 不提供 onClick，将使用默认的抽屉行为
    });

    // 清理
    return () => {
      BlockRegistry.unregisterTool('my_custom_tool');
      BlockRegistry.unregisterTool('another_tool');
      BlockRegistry.unregisterTool('icon_only_tool');
    };
  }, []);

  return (
    <Assistant
      agentKey="your-agent-key"
      token="your-token"
      refreshToken={async () => 'new-token'}
    />
  );
}
```

### 4.2 自定义图标组件示例

```typescript
import React from 'react';

/**
 * 自定义工具图标组件
 */
const MyCustomIcon: React.FC = () => {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 2L2 7L12 12L22 7L12 2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2 17L12 22L22 17"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2 12L12 17L22 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default MyCustomIcon;
```

### 4.3 第三方应用自定义点击行为示例

```typescript
import { BlockRegistry, ToolBlockRegistration } from '@dip/chatkit-sdk';

/**
 * 自定义点击行为示例
 * 根据设计文档，onClick 接收的参数类型为 Record<string, any>
 * 可以实现打开自定义对话框、导航到其他页面、调用外部 API 等
 */
function handleToolClick(block: Record<string, any>) {
  // 从 block 中提取工具信息
  const toolName = block.content?.name;
  const toolTitle = block.content?.title;
  const toolInput = block.content?.input;
  const toolOutput = block.content?.output;

  // 示例 1: 打开自定义模态框
  openCustomModal({
    title: `工具详情: ${toolTitle}`,
    content: {
      input: toolInput,
      output: toolOutput,
    },
  });

  // 示例 2: 导航到工具详情页面
  // navigate(`/tools/${toolName}`, { state: { block } });

  // 示例 3: 调用外部 API
  // fetchToolDetails(toolName).then(data => {
  //   showToolDetails(data);
  // });

  // 示例 4: 发送分析事件
  // analytics.track('tool_opened', {
  //   toolName: toolName,
  //   toolTitle: toolTitle,
  // });
}

// 第三方应用注册工具
const registration: ToolBlockRegistration = {
  name: 'my_custom_tool',
  Icon: <MyCustomIcon />,
  onClick: handleToolClick,
};

BlockRegistry.registerTool(registration);
```

### 4.4 在 DIPBase 中使用

推荐在应用初始化时注册工具信息：

```typescript
import React, { useEffect } from 'react';
import { Assistant, BlockRegistry } from '@dip/chatkit-sdk';
import MyCustomIcon from './icons/MyCustomIcon';

function App() {
  useEffect(() => {
    // 在应用启动时注册工具信息
    BlockRegistry.registerTool({
      name: 'text2sql',
      Icon: <MyCustomIcon />,
      onClick: (block) => {
        // 自定义 Text2SQL 工具的点击行为
        console.log('Text2SQL 工具被点击', block);
      },
    });

    // 获取已注册的工具名称列表（用于调试）
    const registeredTools = BlockRegistry.getAllToolNames();
    console.log('已注册的工具:', registeredTools);
    
    // 清理
    return () => {
      BlockRegistry.unregisterTool('text2sql');
    };
  }, []);

  return (
    <Assistant
      agentKey="your-agent-key"
      token="your-token"
      refreshToken={async () => 'new-token'}
    />
  );
}
```

**注意**：
- 由于 Assistant 和 Copilot 都使用相同的 BlockRegistry，在一个应用中注册的工具信息对所有 ChatKit 实例都生效
- 第三方应用可以通过导入 `BlockRegistry` 和 `ToolBlockRegistration` 来注册自定义工具
- 注册的工具会在所有 ChatKit 组件中生效，包括 Assistant 和 Copilot
- 根据设计文档流程，工具处理会优先检查注册信息，然后才使用内置逻辑

### 4.5 注册多个工具

```typescript
import { BlockRegistry } from '@dip/chatkit-sdk';

// 批量注册工具（推荐使用 registerTools 方法）
BlockRegistry.registerTools([
  {
    name: 'text2sql',
    Icon: <SqlIcon />,
    onClick: (block) => openSqlEditor(block),
  },
  {
    name: 'text2metric',
    Icon: <MetricIcon />,
    onClick: (block) => showMetricChart(block),
  },
  {
    name: 'execute_code',
    Icon: 'https://example.com/code-icon.png',
    // 不提供 onClick，将使用默认的抽屉行为
  },
]);

// 或者逐个注册
const toolRegistrations = [
  { name: 'tool1', Icon: <Icon1 /> },
  { name: 'tool2', Icon: <Icon2 /> },
];

toolRegistrations.forEach(registration => {
  BlockRegistry.registerTool(registration);
});
```

## 五、实现细节

### 5.1 BlockRegistry 实现要点

1. **线程安全**：使用 Map 存储，操作简单且高效
2. **类型安全**：使用 TypeScript 类型定义确保类型安全
3. **自动覆盖**：重复注册同一个工具时直接覆盖原有注册信息，不会抛出错误
4. **调试支持**：提供 `getAllToolNames()` 方法便于调试，控制台会输出注册和更新日志
5. **注册信息**：只存储工具的自定义信息（Icon 和 onClick），不存储整个组件

### 5.2 ToolBlock 实现要点

#### Copilot 版本
1. **直接使用**：直接使用注册信息，保持统一的显示风格
2. **图标优先**：优先使用注册的 Icon，如果没有则使用 `block.content.icon`
3. **行为扩展**：如果注册了 `onClick`，点击时调用自定义行为；否则使用默认的抽屉行为

#### Assistant 版本
1. **优先级查找**：优先查找注册信息
2. **注册优先**：如果找到注册信息，使用注册的 Icon 和 onClick
3. **内部逻辑**：如果没有注册，使用内部逻辑处理
4. **默认行为**：内部也没处理时，保持现有默认行为

### 5.3 风格一致性

1. **统一样式**：无论是否注册，工具块都使用相同的内部样式类名
2. **图标替换**：只替换图标，不改变整体布局
3. **行为扩展**：只扩展点击行为，不改变显示结构

## 六、流程图

根据设计文档（ChatKit for DIP.pdf）中的 Block工具处理流程，工具块的处理逻辑如下：

### Block工具处理流程

```
开始
    ↓
获取已注册工具名称列表 (BlockRegistry.getAllToolNames())
    ↓
判断当前 skill_name 是否在注册的工具中
    ↓
    ├─→ 是（已注册）
    │       ↓
    │   使用注册信息的部分内容作为 ToolBlock 的参数
    │   - 使用注册的 Icon（如果有）
    │   - 使用 block.content 中的其他信息（title, input, output）
    │       ↓
    │   判断是否打开详情
    │       ↓
    │       ├─→ 是（用户点击工具块）
    │       │       ↓
    │       │   判断是否来自注册工具
    │       │       ↓
    │       │       ├─→ 是（已注册且有 onClick）
    │       │       │       ↓
    │       │       │   执行注册的 onClick 事件
    │       │       │   onClick(block)
    │       │       │
    │       │       └─→ 否（已注册但无 onClick）
    │       │               ↓
    │       │           使用内置详情模块（ToolDrawer）
    │       │
    │       └─→ 否（仅显示工具块）
    │               ↓
    │           结束
    │
    └─→ 否（未注册）
            ↓
        使用内置工具作为参数
        - 使用 block.content.icon
        - 使用 block.content 中的所有信息
            ↓
        判断是否打开详情
            ↓
            ├─→ 是（用户点击工具块）
            │       ↓
            │   使用内置详情模块（ToolDrawer）
            │
            └─→ 否（仅显示工具块）
                    ↓
                结束
```

### 详细说明

1. **工具识别阶段**：
   - 通过 `BlockRegistry.getAllToolNames()` 获取所有已注册的工具名称
   - 判断当前处理的工具（`skill_name`）是否在注册列表中

2. **参数构建阶段**：
   - **已注册工具**：使用注册信息中的 `Icon`，其他参数（title, input, output）从 `block.content` 获取
   - **未注册工具**：使用 `block.content` 中的所有信息，包括默认的 icon

3. **详情展示阶段**：
   - **已注册且有 onClick**：调用注册的 `onClick(block)` 回调函数，由第三方应用自定义处理
   - **已注册但无 onClick**：使用内置的 ToolDrawer 组件显示详情
   - **未注册工具**：使用内置的 ToolDrawer 组件显示详情

## 七、注意事项

### 7.1 注册信息要求

注册信息应该包含：
- **name（必填）**：工具名称，必须与 `ToolCallData.name` 完全匹配
- **Icon（可选）**：自定义图标，可以是字符串 URL 或 React 元素
- **onClick（可选）**：点击回调函数，接收完整的 `block` 参数

### 7.2 图标处理

- **优先级**：注册的 Icon > block.content.icon > 无图标
- **图标类型**：支持字符串 URL 和 React 元素两种类型
- **图标大小**：内部组件会自动处理图标大小（通常为 20x20px）

### 7.3 点击行为

- **自定义行为**：如果注册了 `onClick`，点击工具块时会调用该函数
- **默认行为**：如果没有注册 `onClick`，点击时会打开默认的 ToolDrawer 抽屉
- **参数传递**：`onClick` 回调会接收完整的 `block` 对象，包含所有工具信息

### 7.4 样式一致性

- **统一风格**：工具块的样式由内部组件统一管理，保持一致的视觉风格
- **只替换图标**：注册信息只影响图标显示，不影响整体布局和样式
- **不改变结构**：工具块的基本结构（图标、标题、箭头）保持不变

### 7.5 性能考虑

- **注册时机**：建议在应用初始化时或组件挂载时注册，避免在每次渲染时注册
- **图标优化**：如果使用图片 URL，注意图片大小和加载性能
- **回调优化**：`onClick` 回调函数应该避免执行耗时操作，必要时使用异步处理

### 7.6 错误处理

- **重复注册**：重复注册同一个工具名称时会自动覆盖原有注册信息，不会抛出错误，可直接调用 `registerTool` 或 `registerTools` 更新工具配置
- **工具不存在**：注册的工具可能在消息中不会出现，这是正常情况
- **回调错误**：`onClick` 回调中的错误不会影响 ChatKit 的正常运行

### 7.7 版本差异

- **Copilot 版本**：直接使用注册信息，逻辑简单直接
- **Assistant 版本**：优先使用注册信息，如果没有则使用内部逻辑，最后保持默认行为
- **兼容性**：两个版本都向后兼容，未注册的工具使用默认行为

## 八、迁移指南

### 8.1 现有代码无需修改

现有使用 ChatKit 的代码无需任何修改，向后完全兼容。未注册的工具将继续使用默认的渲染逻辑和默认图标。

### 8.2 需要自定义工具图标或行为的场景

如果需要对某个工具自定义图标或点击行为，按照以下步骤：

1. **准备图标组件或 URL**
   - 创建自定义图标组件，或准备图标图片 URL
   - 图标可以是 SVG 组件或图片 URL

2. **准备点击回调（可选）**
   - 如果需要自定义点击行为，实现 `onClick` 回调函数
   - 回调函数接收完整的 `block` 对象作为参数

3. **注册工具信息**
   - 在应用初始化时调用 `BlockRegistry.registerTool()` 或 `BlockRegistry.registerTools()` 注册
   - 确保工具名称与 `ToolCallData.name` 完全匹配
   - 如果工具已注册，再次调用会直接覆盖原有配置，无需先取消注册

4. **测试验证**
   - 确认工具块显示正确的图标
   - 确认点击行为符合预期（自定义行为或默认抽屉）
   - 确认未注册的工具仍然正常显示

### 8.3 常见使用场景

**场景 1：只替换图标**
```typescript
BlockRegistry.registerTool({
  name: 'my_tool',
  Icon: <MyCustomIcon />,
});
```

**场景 2：自定义点击行为**
```typescript
BlockRegistry.registerTool({
  name: 'my_tool',
  Icon: <MyCustomIcon />,
  onClick: (block) => {
    // 打开自定义对话框
    openCustomDialog(block);
  },
});
```

**场景 3：使用图片 URL**
```typescript
BlockRegistry.registerTool({
  name: 'my_tool',
  Icon: 'https://example.com/tool-icon.png',
});
```

**场景 4：更新已注册的工具**
```typescript
// 直接调用 registerTool 即可覆盖原有配置，无需先取消注册
BlockRegistry.registerTool({
  name: 'my_tool',
  Icon: <NewIcon />, // 更新图标
  onClick: (block) => {
    // 更新点击行为
    openNewDialog(block);
  },
});
```

## 九、完整示例

### 9.1 第三方应用完整示例

```typescript
import React, { useEffect } from 'react';
import { 
  Assistant, 
  BlockRegistry, 
  ToolBlockRegistration 
} from '@dip/chatkit-sdk';
import MyCustomIcon from './icons/MyCustomIcon';

// 第三方应用组件
function ThirdPartyApp() {
  useEffect(() => {
    // 注册自定义工具
    const registration: ToolBlockRegistration = {
      name: 'my_custom_tool',
      Icon: <MyCustomIcon />,
      onClick: (block: Record<string, any>) => {
        // 第三方应用自定义的处理逻辑
        const toolData = {
          name: block.content?.name,
          title: block.content?.title,
          input: block.content?.input,
          output: block.content?.output,
        };
        
        // 打开第三方应用的自定义对话框
        openThirdPartyDialog(toolData);
      },
    };

    BlockRegistry.registerTool(registration);

    // 清理：组件卸载时取消注册
    return () => {
      BlockRegistry.unregisterTool('my_custom_tool');
    };
  }, []);

  return (
    <Assistant
      agentKey="your-agent-key"
      token="your-token"
      refreshToken={async () => 'new-token'}
    />
  );
}
```

### 9.2 SDK 导出说明

**导出内容**（在 `src/index.ts` 中）：

```typescript
// ============ Block Registry ============
export { BlockRegistry } from './utils/BlockRegistry';
export type { ToolBlockRegistration } from './utils/BlockRegistry';
```

**第三方应用使用**：

```typescript
// 第三方应用导入
import { 
  BlockRegistry, 
  ToolBlockRegistration,
  Assistant 
} from '@dip/chatkit-sdk';

// 使用注册功能
BlockRegistry.registerTool({
  name: 'third_party_tool',
  Icon: <ThirdPartyIcon />,
  onClick: (block) => {
    // 第三方处理逻辑
  },
});
```

## 十、SDK 导出和第三方集成

### 10.1 SDK 导出

BlockRegistry 和 ToolBlockRegistration 会在 SDK 中导出，供第三方应用使用：

**导出位置**：`src/index.ts`

```typescript
// ============ Block Registry ============
export { BlockRegistry } from './utils/BlockRegistry';
export type { ToolBlockRegistration } from './utils/BlockRegistry';
```

### 10.2 第三方应用集成步骤

1. **安装 SDK**：
   ```bash
   npm install @dip/chatkit-sdk
   ```

2. **导入注册相关类型**：
   ```typescript
   import { BlockRegistry, ToolBlockRegistration } from '@dip/chatkit-sdk';
   ```

3. **注册工具信息**：
   ```typescript
   BlockRegistry.registerTool({
     name: 'your_tool_name',
     Icon: <YourIcon />,
     onClick: (block) => {
       // 自定义处理逻辑
     },
   });
   ```

4. **使用 ChatKit 组件**：
   ```typescript
   import { Assistant } from '@dip/chatkit-sdk';
   
   <Assistant
     agentKey="your-agent-key"
     token="your-token"
   />
   ```

### 10.3 第三方应用注意事项

- **工具名称匹配**：注册的 `name` 必须与后端返回的 `ToolCallData.name` 完全匹配
- **类型兼容**：`onClick` 回调的参数类型为 `Record<string, any>`，需要自行提取所需字段
- **生命周期管理**：建议在应用初始化时注册，在应用卸载时取消注册
- **多实例共享**：所有 ChatKit 实例共享同一个注册表，注册一次全局生效

## 十一、未来扩展

### 11.1 支持部分渲染

未来可以考虑支持外部组件只渲染部分内容（如只渲染输出部分），内部组件渲染其余部分。

### 11.2 支持插件机制

可以扩展为插件机制，支持从外部模块动态加载 Block 组件。

### 11.3 支持组件生命周期

可以增加组件的生命周期钩子，如 `onMount`、`onUnmount` 等，方便外部组件进行资源管理。

## 十二、测试建议

### 12.1 单元测试

- 测试 BlockRegistry 的注册、查找、取消注册功能
- 测试注册信息正确存储和检索
- 测试未注册时使用默认渲染逻辑
- 测试 `getAllToolNames()` 返回正确的工具名称列表

### 12.2 集成测试

- 测试第三方应用注册工具后，工具块正确显示注册的图标
- 测试点击已注册工具时，正确调用注册的 `onClick` 回调
- 测试多个工具同时注册的场景
- 测试动态注册和取消注册的场景
- 测试注册工具在不同 ChatKit 实例（Assistant、Copilot）中的表现

### 12.3 第三方应用测试

- 测试第三方应用导入和使用 BlockRegistry
- 测试第三方应用注册工具后，工具在消息流中正确显示
- 测试第三方应用的 `onClick` 回调正确接收 block 参数
- 测试第三方应用取消注册后，工具恢复默认行为

### 12.4 视觉测试

- 确保注册工具的视觉风格与整体设计一致
- 测试注册图标正确显示
- 测试响应式布局
- 测试不同数据格式的渲染效果
