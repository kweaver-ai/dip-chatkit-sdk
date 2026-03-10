# MessageList 消息列表性能与滚动体验优化方案

## 概述

本文档基于现有 `MessageList` / `MessageItem` 的实现，设计一套**尽量少改动非列表相关内容**的消息列表优化方案，目标是在大量历史消息、消息高度动态变化的场景下，仍然保持：

- **滚动流畅、不卡顿**
- **新增/展开历史消息时不跳动**
- **图片、工具组件加载后不抖动**

核心思路：

- **分段聊天记录**：按「一轮问答」维度（User 消息 + 对应助手消息）拆分为历史段。
- **虚拟化 + 占位块**：只保留最近 100~200 条消息的真实 DOM，更早的历史以「占位块」形式折叠。
- **动态高度观测 + 锚点滚动恢复**：每条消息由 `ResizeObserver` 观测真实高度，列表维护 `messageHeights` 与滚动锚点，在高度变化或上方插入历史段时，通过锚点进行精确滚动恢复。

## 现状与问题

当前 `MessageList`（以 `src/components/base/assistant/MessageList.tsx` 为例）具备：

- 简单的「是否在底部」检测（`isAtBottomRef`）
- 新消息到来和流式输出时的「自动贴底」逻辑

但存在以下限制：

- **所有消息全部渲染为真实 DOM**：在会话消息较多时，滚动性能下降明显。
- **消息高度动态变化无法精确修正**：图片、工具组件、Markdown 折叠等加载完成后，可能导致整体滚动位置发生跳变。
- **插入历史消息（或未来接入分页）时没有锚点恢复**：一旦在顶部插入/展开历史，用户视口会被整体「顶走」。

## 总体设计

### 设计目标

- **API 保持不变**：`MessageListProps` 与上层调用方式尽量保持稳定。
- **`MessageItem` 语义不变**：仅在外部增加一层 `MessageShell` 进行高度观测。
- **列表内部增强**：所有分段、虚拟化、锚点逻辑均收敛在 `MessageList` 及其附近的几个列表相关组件/Hook 中。

### 关键概念

- **聊天段（ChatChunk）**：一轮用户提问 + 对应助手回复（可能是多条助手消息）组成的逻辑段。
- **历史段占位块（HistoryChunkPlaceholder）**：用于替代已折叠聊天段的轻量 DOM 节点，支持「点击/滚动到顶部时展开」。
- **消息高度表（messageHeights）**：`Map<messageId, number>`，记录每条消息的最新真实高度。
- **滚动锚点（ScrollAnchor）**：
  - `anchorMessageId`：当前视口顶部附近的那条消息 ID。
  - `anchorOffset`：该消息顶部相对于容器顶部的偏移量（px）。

## 文件结构与组件拆分

### 文件结构（assistant 侧为例）

```text
dip-chatkit-sdk/src/components/base/assistant/
├── MessageList.tsx                 # 修改：接入分段 + 虚拟化 + 锚点滚动
├── MessageItem.tsx                 # 尽量不改动，仅被外层 Shell 包裹
├── MessageShell.tsx                # 新增：单条消息高度观测 & 上报
├── HistoryChunkPlaceholder.tsx     # 新增：历史段占位块组件
└── hooks/
    └── useAnchoredMessageList.ts   # 新增：封装 messageHeights + 锚点滚动逻辑
```

> **说明**：  
> - `copilot` 侧如需同样体验，可复用同一套 Hook 与 Shell 设计，仅在 `base/copilot/MessageList.tsx` 做同构改造。  
> - 非列表相关组件（如 `MessageItem` 内部渲染逻辑、统计信息、相关问题等）不做业务语义上的调整。

### 组件职责划分

- **MessageList（改造）**
  - 对外 Props 不变（`messages`, `streamingMessageId`, `onRegenerate`, `onSelectQuestion` 等）。
  - 内部新增：
    - 消息分段与虚拟化（构造聊天段与历史占位块）。
    - 使用 `useAnchoredMessageList` 管理 `messageHeights`、`ScrollAnchor` 与滚动恢复。
  - 渲染逻辑：
    - 仅对最近 100~200 条消息渲染真实 `MessageShell` / `MessageItem`。
    - 更早的段渲染为一个或多个 `HistoryChunkPlaceholder`。

- **MessageShell（新增）**
  - 位置：`MessageItem` 的外层包装。
  - 职责：
    - 使用 `ResizeObserver` 观测自身高度变化。
    - 在 mount / unmount / 尺寸变化时，将最新高度通过回调上报给列表管理器。
  - Props 示例：
    ```ts
    interface MessageShellProps {
      messageId: string;
      onHeightChange?: (messageId: string, height: number) => void;
      children: React.ReactNode; // 一般为 <MessageItem ... />
    }
    ```

- **HistoryChunkPlaceholder（新增）**
  - 职责：
    - 代表一段已折叠的历史消息（一个或多个聊天段）。
    - 提供简要信息（例如「展开上一段对话 · 共 34 条消息」）。
    - 支持：
      - 用户点击时展开该段；
      - 当用户滚动到顶部附近时自动触发展开（可通过 `onTopReached` 调用方控制）。

- **useAnchoredMessageList（新增 Hook）**
  - 职责：
    - 管理 `messageHeights: Map<messageId, number>`。
    - 管理滚动锚点：`anchorMessageId` + `anchorOffset`。
    - 在滚动事件中更新锚点。
    - 在高度变化 / 上方插入历史段后，基于锚点进行滚动恢复。
  - 对外暴露核心能力：
    ```ts
    interface ScrollAnchor {
      messageId: string;
      offset: number; // px
    }

    interface UseAnchoredMessageListResult {
      messageHeights: Map<string, number>;
      handleMessageHeightChange: (messageId: string, height: number) => void;
      handleScroll: (e: React.UIEvent<HTMLDivElement>) => void;
      restoreScrollByAnchor: () => void;
      registerScrollContainer: (el: HTMLDivElement | null) => void;
    }
    ```

## 分段聊天记录设计

### 分段规则

- 按「用户消息 + 对应助手消息」组合为一个**聊天段（ChatChunk）**：
  - 当遍历 `messages` 时，遇到 `RoleType.USER` 视为新一轮开始。
  - 后续紧跟的一个或多个 `RoleType.ASSISTANT`（或工具/系统但属于此轮问答）归入同一段。
  - 下一条 `RoleType.USER` 出现时，开启新段。

### 数据结构示例

```ts
interface ChatChunk {
  id: string;              // chunkId，可由首条消息 id 拼接而成
  messageIds: string[];    // 本段包含的 messageId 列表
  startIndex: number;      // 在 messages 数组中的起始下标
  endIndex: number;        // 结束下标（包含）
  expanded: boolean;       // 当前是否已展开为真实 DOM
}
```

### 可见范围与历史占位

- 目标：**最近 100~200 条消息为真实 DOM，其余折叠**。
- 实现策略：
  1. 根据 `messages` 计算总条数，从尾部向前累计，直到覆盖约 150 条消息为「最近窗口」。
  2. 将「最近窗口」覆盖到的若干 `ChatChunk` 标记为 `expanded = true`。
  3. 更早的 `ChatChunk` 聚合为一个或多个「历史段占位块」，表现为：
     - 如果历史段很多，可以每 N 段合并为一个占位块，避免顶部出现密集占位块。

渲染时：

- `expanded === true`：
  - 遍历该段 messageIds，渲染 `MessageShell(messageId) -> MessageItem(message)`。
- `expanded === false`：
  - 渲染一个 `HistoryChunkPlaceholder`，点击后将对应段标记为展开，并触发锚点恢复。

## 动态高度观测与缓存

### MessageShell + ResizeObserver

- 每条消息外包 `MessageShell`：
  - 内部使用 `ResizeObserver` 监听容器高度变化。
  - 每当高度变化时调用 `onHeightChange(messageId, newHeight)`。
  - 初次 mount 时也会触发一次测量。

### messageHeights 与批量更新

- 在 `useAnchoredMessageList` 内维护：

```ts
const messageHeightsRef = useRef<Map<string, number>>(new Map());
const pendingHeightsRef = useRef<Map<string, number>>(new Map());
const rafIdRef = useRef<number | null>(null);
```

- `handleMessageHeightChange` 逻辑：
  1. 将变化记录写入 `pendingHeightsRef`。
  2. 若当前没有已预约的 `requestAnimationFrame`，则预约一次：
     - 在下一帧中统一将 `pendingHeightsRef` 合并到 `messageHeightsRef`。
     - 计算受影响的消息集合（如有需要，可用于判断是否影响当前锚点）。
     - 在合并完成后调用 `restoreScrollByAnchor()` 进行滚动修正。

> **注意**：  
> 不要在 `ResizeObserver` 回调中直接 `setState` 或频繁计算 `scrollTop`，统一在 `requestAnimationFrame` 中批量处理，避免频繁 reflow 和滚动抖动。

## 锚点滚动恢复设计

### 锚点记录

- 在滚动容器的 `onScroll` 中：
  1. 根据当前 `scrollTop`，利用 `messageHeights` 与消息顺序，计算「最接近视口顶部」的消息。
  2. 记录：
     - `anchorMessageId`：该消息的 id。
     - `anchorOffset`：该消息顶部距离容器顶部的偏移（可以通过 `scrollTop` 与累计高度反推）。

> 为控制复杂度，可采用「近似」实现：  
> - 当滚动停止一小段时间（debounce），再更新锚点，避免每个 scroll 事件都重算。

### 锚点恢复场景

在以下场景中，需要通过锚点进行滚动恢复：

- **某条消息高度变化**（图片、工具组件渲染完成）。
- **上方插入/展开了历史消息段**（例如展开 `HistoryChunkPlaceholder`）。

恢复逻辑：

1. 使用最新的 `messageHeights` 与消息顺序，重新计算 `anchorMessageId` 顶部的理论位置 `newTop`。
2. 令滚动容器的 `scrollTop = newTop - anchorOffset`，保持 `anchorMessageId` 在视觉上仍处于原来的位置。

伪代码示例：

```ts
const restoreScrollByAnchor = () => {
  if (!scrollContainerRef.current || !anchorRef.current) return;
  const { messageId, offset } = anchorRef.current;

  const newTop = computeMessageTop(messageId, messageHeightsRef.current);
  if (newTop == null) return;

  scrollContainerRef.current.scrollTop = Math.max(0, newTop - offset);
};
```

其中 `computeMessageTop` 可通过遍历消息顺序并累计高度实现（可适当缓存前缀和以优化性能）。

## 与现有 MessageList 集成方案

### 对 MessageList 的主要改动点

1. **引入 Hook 与 Shell**
   - 使用 `useAnchoredMessageList` 替换原有的简单 `handleScroll`。
   - 在渲染 `MessageItem` 时增加 `MessageShell` 包裹，并将 `onHeightChange` 绑定到 Hook。

2. **渲染分段/占位块**
   - 基于 `messages` 计算 `ChatChunk` 列表。
   - 按「最近 N 条消息」标记哪些段为 `expanded`。
   - 将 `ChatChunk` 映射为渲染节点序列（`HistoryChunkPlaceholder` 或 `MessageShell + MessageItem`）。

3. **展开历史段时的滚动修正**
   - 在点击 `HistoryChunkPlaceholder` 展开前，先记录当前锚点。
   - 展开后（即新增了上方真实消息 DOM），在下一帧调用 `restoreScrollByAnchor()`，保证用户视觉位置稳定。

4. **贴底行为保持不变**
   - 现有「自动贴底」逻辑可与锚点机制共存：
     - 当 `isAtBottomRef.current === true` 且新消息追加时，仍按原始逻辑将列表滚到最底部。
     - 当用户手动上滑离开底部后，使用锚点机制维护中间区域的稳定性。

### MessageItem 的改动控制

- `MessageItem` 本身不需要感知高度或滚动逻辑。
- 唯一需要的配合是：在 `MessageList` 中将其统一包裹在 `MessageShell` 内，例如：

```tsx
<MessageShell
  messageId={message.messageId}
  onHeightChange={handleMessageHeightChange}
>
  <MessageItem
    message={message}
    isStreaming={message.messageId === streamingMessageId}
    agentAvatar={agentAvatar}
    onRegenerate={...}
    isLastAssistantMessage={index === lastAssistantIndex}
    onSelectQuestion={onSelectQuestion}
  />
</MessageShell>
```

> **说明**：  
> - 不需要在 `MessageItem` 内部增加任何关于高度或滚动的逻辑，保持其关注点仅在消息内容渲染与交互。  
> - 其他组件（如 `MessageStatsBar`、`RelatedQuestions` 等）不受影响。

## 实施步骤建议

1. **新增 Hook 与 Shell**
   - 在 `assistant/hooks` 下实现 `useAnchoredMessageList`。
   - 新建 `MessageShell.tsx`，完成 `ResizeObserver` + `onHeightChange` 上报。
2. **实现聊天段分段与占位块组件**
   - 在 `MessageList.tsx` 内或单独 util 中实现 `buildChatChunks(messages)`。
   - 新建 `HistoryChunkPlaceholder.tsx`，完成样式与交互（点击展开）。
3. **改造 MessageList**
   - 替换 `onScroll` 为 `useAnchoredMessageList.handleScroll`。
   - 用聊天段 + `HistoryChunkPlaceholder` + `MessageShell + MessageItem` 的组合替代原先的 `messages.map(...)`。
   - 保留并复用原有「是否在底部、自动贴底」逻辑，与锚点机制整合。
4. **验证与调优**
   - 大量消息（> 1000）场景下的首屏渲染性能与滚动流畅度。
   - 图片 / 图表 / 工具块加载前后滚动位置是否稳定。
   - 顶部展开多段历史后，滚动锚点是否可靠。
   - 与 `streamingMessageId` 流式输出的交互是否正常。

## 总结

本方案在不破坏 `MessageList` 对外接口和 `MessageItem` 语义的前提下，通过**分段聊天记录 + 历史占位块 + 动态高度观测 + 锚点滚动恢复**，实现对大规模会话历史的高性能渲染与平滑滚动体验。所有新增逻辑均围绕「列表本身」展开，非列表相关组件可保持原有实现，仅需在 `MessageList` 层完成集成。
