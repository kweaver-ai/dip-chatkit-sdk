# ConversationHistory 组件实现文档

## 概述

本文档描述在 `copilot` 目录下新增 `ConversationHistory` 组件的实现方案。该组件用于展示历史会话列表，支持加载和删除操作。

**交互方式**：组件内部包含历史记录按钮，点击按钮后以下拉菜单形式展示历史会话列表，最大高度支持显示10条数据，超过部分显示滚动条。

## 设计参考

### Figma 设计图

1. **整体设计图**：https://www.figma.com/design/ikuqIWpd1CmGh6fMO9PHlK/%E6%99%BA%E8%83%BD%E9%97%AE%E6%95%B0?node-id=1-3960&t=8fBvm6SJ7OtDYzBU-4
   - 抽屉宽度：360px
   - 阴影效果：`0px 5px 28px 0px rgba(0, 0, 0, 0.2)`
   - 圆角：12px

2. **组件设计图**：https://www.figma.com/design/ikuqIWpd1CmGh6fMO9PHlK/%E6%99%BA%E8%83%BD%E9%97%AE%E6%95%B0?node-id=117-8257&t=8fBvm6SJ7OtDYzBU-4
   - 下拉容器宽度：360px
   - 下拉容器最大高度：约 406px（支持显示10条数据）
   - 列表项高度：36px
   - 列表项内边距：左右 14px
   - 列表项间距：2px
   - 悬停背景色：`#F0F0F0`
   - 圆角：6px（列表项）、12px（下拉容器）
   - 阴影：`0px 5px 28px 0px rgba(0, 0, 0, 0.2)`

3. **工具栏设计图**：https://www.figma.com/design/ikuqIWpd1CmGh6fMO9PHlK/%E6%99%BA%E8%83%BD%E9%97%AE%E6%95%B0?node-id=117-8302&t=8fBvm6SJ7OtDYzBU-4
   - 图标尺寸：24x24px

## 参考实现

数据获取和数据处理逻辑参考：`dip-chatkit-sdk/src/components/base/assistant/ConversationHistory.tsx`

### 核心功能

1. **数据获取**：通过 `onGetConversations` 函数获取历史会话列表
2. **数据展示**：展示会话标题、时间等信息
3. **交互操作**：
   - 点击会话项加载指定会话
   - 悬停显示删除按钮
   - 删除会话（带确认提示）

## 实现方案

### 1. 文件结构

```
dip-chatkit-sdk/src/components/base/copilot/
├── ConversationHistory.tsx  # 新增：历史会话列表组件（包含按钮和下拉菜单）
└── ...
```

**注意**：历史记录按钮集成在 `ConversationHistory` 组件内部，不需要修改 `Header.tsx`。

### 2. 组件接口设计

```typescript
interface ConversationHistoryProps {
  /** 获取历史会话列表的函数 */
  onGetConversations: (page?: number, size?: number) => Promise<ConversationHistoryType[]>;
  /** 加载指定会话的回调函数 */
  onLoadConversation: (conversationId: string) => void;
  /** 删除指定会话的回调函数 */
  onDeleteConversation: (conversationId: string) => Promise<void>;
  /** 按钮位置（可选，用于定位下拉菜单） */
  buttonPosition?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
}
```

**说明**：
- 组件内部包含历史记录按钮，点击后显示下拉菜单
- 不需要 `visible` 和 `onClose` prop，组件内部管理显示/隐藏状态
- `buttonPosition` 用于自定义按钮位置（可选）

### 3. 数据结构

使用 `ConversationHistory` 类型（定义在 `src/types/index.ts`）：

```typescript
interface ConversationHistory {
  conversationID: string;
  title: string;
  created_at: number;
  updated_at: number;
  message_index?: number;
  read_message_index?: number;
}
```

### 4. 样式规范

#### 4.1 按钮样式

- **尺寸**：24x24px
- **位置**：组件内部，可自定义位置
- **图标**：使用 `HistoryIcon` 组件
- **交互**：点击切换下拉菜单显示/隐藏

#### 4.2 下拉菜单容器样式

- **宽度**：360px
- **背景色**：`#FFFFFF`
- **阴影**：`0px 5px 28px 0px rgba(0, 0, 0, 0.2)`
- **圆角**：12px
- **定位**：绝对定位（absolute），位于按钮下方
- **最大高度**：约 406px（支持显示10条数据）
  - 计算方式：10条数据 × 36px + 9个间距 × 2px + 上下内边距 28px = 406px
- **滚动**：超过最大高度时显示垂直滚动条
- **内边距**：上下 14px，左右 14px

#### 4.3 列表项样式

- **高度**：36px
- **内边距**：左右 14px
- **间距**：列表项之间 2px
- **背景色**：
  - 默认：透明
  - 悬停：`#F0F0F0`
- **圆角**：6px
- **字体**：Noto Sans SC
- **字体大小**：14px
- **字体颜色**：
  - 标题：`rgba(0, 0, 0, 0.85)`
  - 时间：`rgba(0, 0, 0, 0.45)`

#### 4.4 图标样式

- **历史记录图标（按钮）**：24x24px
- **历史记录图标（列表项）**：16x16px，位于列表项左侧
- **删除图标**：16x16px，位于列表项右侧（悬停时显示）

### 5. 时间格式化逻辑

参考现有实现，时间格式化规则：

- **今天**：显示时间，格式 `HH:mm`
- **6天内**：显示相对时间，格式 `N天前`
- **今年**：显示月日，格式 `MM-dd`
- **更早**：显示完整日期，格式 `YYYY-MM-dd`

时间戳处理：
- 支持秒级时间戳（小于13位）和毫秒级时间戳（13位及以上）
- 自动转换秒级时间戳为毫秒级

### 6. 交互逻辑

#### 6.1 显示/隐藏

- 组件内部管理下拉菜单的显示/隐藏状态
- 点击历史记录按钮切换下拉菜单显示/隐藏
- 点击下拉菜单外部区域（使用 `useRef` 和 `useEffect` 监听点击事件）关闭下拉菜单
- 点击列表项加载会话后自动关闭下拉菜单
- 使用绝对定位（absolute）定位下拉菜单，位于按钮下方

#### 6.2 下拉菜单定位

- 下拉菜单默认位于按钮正下方
- 需要考虑边界情况：
  - 如果按钮靠近屏幕底部，下拉菜单应向上展开
  - 如果按钮靠近屏幕右侧，下拉菜单应向左对齐
- 使用 `position: absolute` 和动态计算位置

#### 6.3 滚动处理

- 下拉菜单最大高度：约 406px（支持显示10条数据）
- 当数据超过10条时，显示垂直滚动条
- 滚动条样式：使用浏览器默认滚动条或自定义样式
- 滚动区域：仅列表区域可滚动，不影响按钮和容器其他部分

#### 6.4 数据加载

- 组件可见时自动加载历史会话列表
- 显示加载状态（"加载中..."）
- 错误处理：显示错误信息
- 空状态：显示"暂无历史会话"

#### 6.5 列表项交互

- **悬停效果**：
  - 背景色变为 `#F0F0F0`
  - 右侧时间替换为删除按钮
- **点击加载**：点击列表项调用 `onLoadConversation` 加载会话
- **删除操作**：
  - 点击删除按钮显示确认对话框
  - 确认后调用 `onDeleteConversation`
  - 删除成功后重新加载列表
  - 删除过程中显示"删除中..."状态

### 7. CopilotBase 集成

在 `CopilotBase.tsx` 中：

1. 在 `render()` 方法中直接渲染 `ConversationHistory` 组件：
   ```typescript
   <ConversationHistory
     onGetConversations={this.handleGetConversations}
     onLoadConversation={this.handleLoadConversation}
     onDeleteConversation={this.handleDeleteConversation}
     buttonPosition={{ top: 14, right: 260 }} // 可选：自定义按钮位置
   />
   ```

2. 实现回调函数（保留现有的处理函数）：
   ```typescript
   handleLoadConversation = async (conversationId: string) => {
     try {
       await this.loadConversation(conversationId);
       // 组件内部会自动关闭下拉菜单
     } catch (error) {
       console.error('加载会话失败:', error);
     }
   };
   ```

**注意**：
- 不需要在 `Header` 中添加历史记录按钮
- 不需要管理 `showHistory` 状态，组件内部自行管理
- 组件会自动处理下拉菜单的显示/隐藏

### 8. 数据获取实现

数据获取通过 `ChatKitBase` 的抽象方法 `getConversations` 实现：

```typescript
// 在 CopilotBase 中调用
const conversations = await this.getConversations(1, 1000);
```

该方法由具体实现类（如 `DIPBase`）提供，调用后端 API 获取数据。

### 9. 关键实现细节

#### 9.1 下拉菜单显示/隐藏逻辑

- 使用 `useState` 管理 `isOpen` 状态
- 点击按钮切换 `isOpen` 状态
- 使用 `useRef` 和 `useEffect` 监听点击事件，点击外部区域关闭下拉菜单：
  ```typescript
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);
  ```

#### 9.2 下拉菜单定位

- 使用 `useRef` 获取按钮和下拉菜单的 DOM 引用
- 使用 `useEffect` 计算下拉菜单位置
- 考虑边界情况（屏幕底部、右侧）自动调整位置
- 使用 `position: absolute` 和动态 `top`、`left` 值

#### 9.3 滚动区域实现

- 下拉菜单容器设置 `max-height: 406px`
- 列表区域设置 `overflow-y: auto`
- 当内容超过最大高度时自动显示滚动条
- 滚动条样式可以使用 Tailwind 的滚动条工具类

#### 9.4 事件冒泡处理

- 点击列表项时，需要阻止删除按钮的点击事件冒泡
- 使用 `e.stopPropagation()` 防止触发列表项的点击事件

#### 9.5 状态管理

- `isOpen`：下拉菜单是否显示
- `conversations`：会话列表数据
- `loading`：加载状态
- `error`：错误信息
- `deletingId`：正在删除的会话ID
- `hoveredId`：当前悬停的会话ID

#### 9.6 性能优化

- 使用 `useEffect` 在下拉菜单打开时加载数据（避免不必要的请求）
- 避免不必要的重新渲染
- 列表项使用 `key` 属性优化渲染
- 使用 `useMemo` 缓存计算的位置信息

## 实现步骤

1. **创建组件文件**
   - 在 `src/components/base/copilot/` 目录下创建 `ConversationHistory.tsx`
   - 组件包含按钮和下拉菜单两部分

2. **实现按钮部分**
   - 渲染历史记录图标按钮（24x24px）
   - 实现点击切换下拉菜单显示/隐藏
   - 按钮样式和交互效果

3. **实现下拉菜单部分**
   - 使用绝对定位实现下拉菜单
   - 实现下拉菜单的显示/隐藏逻辑
   - 实现点击外部区域关闭功能
   - 实现下拉菜单定位（考虑边界情况）

4. **实现数据加载和展示**
   - 实现数据获取逻辑（下拉菜单打开时加载）
   - 实现时间格式化函数
   - 实现列表项渲染
   - 实现滚动区域（最大高度406px，超过显示滚动条）

5. **实现交互逻辑**
   - 实现列表项点击加载会话
   - 实现悬停显示删除按钮
   - 实现删除会话功能
   - 实现加载状态和错误处理

6. **集成到 CopilotBase**
   - 在 `CopilotBase.tsx` 的 `render()` 方法中渲染组件
   - 传入必要的回调函数
   - 移除 `Header` 中的历史记录按钮相关代码

7. **测试验证**
   - 测试按钮点击显示/隐藏下拉菜单
   - 测试点击外部区域关闭下拉菜单
   - 测试下拉菜单定位（边界情况）
   - 测试数据加载和展示
   - 测试滚动功能（超过10条数据）
   - 测试交互功能（加载、删除）
   - 测试样式显示
   - 测试错误处理

## 注意事项

1. **交互方式**：使用下拉菜单而非抽屉，按钮集成在组件内部
2. **样式一致性**：确保与 Figma 设计图保持一致
3. **下拉菜单定位**：需要考虑边界情况，确保下拉菜单始终在可视区域内
4. **滚动处理**：最大高度支持10条数据，超过部分显示滚动条
5. **点击外部关闭**：使用 `useRef` 和事件监听实现点击外部区域关闭功能
6. **性能优化**：下拉菜单打开时才加载数据，避免不必要的请求
7. **错误处理**：妥善处理网络错误和异常情况
8. **用户体验**：提供清晰的加载状态和错误提示
9. **类型安全**：使用 TypeScript 类型定义确保类型安全
10. **代码复用**：参考现有实现，保持代码风格一致

## 相关文件

- 参考实现：`src/components/base/assistant/ConversationHistory.tsx`（数据获取和展示逻辑）
- 类型定义：`src/types/index.ts`
- 基础组件：`src/components/base/copilot/CopilotBase.tsx`
- 图标组件：`src/components/icons/HistoryIcon.tsx`
- 数据获取：`src/components/dip/DIPBase.tsx` (getConversations 方法)

## 交互流程图

```
用户点击历史记录按钮
    ↓
切换下拉菜单显示状态
    ↓
如果打开 → 加载历史会话数据
    ↓
显示下拉菜单（最大高度406px）
    ↓
如果数据超过10条 → 显示滚动条
    ↓
用户操作：
  - 点击列表项 → 加载会话 → 关闭下拉菜单
  - 悬停列表项 → 显示删除按钮
  - 点击删除按钮 → 确认删除 → 刷新列表
  - 点击外部区域 → 关闭下拉菜单
```

## 高度计算说明

下拉菜单最大高度计算：
- 单条数据高度：36px
- 10条数据总高度：36px × 10 = 360px
- 9个间距：2px × 9 = 18px
- 上下内边距：14px × 2 = 28px
- **总高度**：360px + 18px + 28px = **406px**

当数据超过10条时，列表区域会出现垂直滚动条，容器高度保持406px不变。
