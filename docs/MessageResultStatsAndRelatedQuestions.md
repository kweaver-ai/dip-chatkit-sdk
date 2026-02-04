# 消息问答结果统计与相关问题实现文档

## 概述

本文档描述在 ChatKit SDK 中，每次消息问答结束后在界面上展示**相关问题**、**本次结果耗时**以及 **Token 总数**的实现方案。数据在流式结束后获取，通过扩展消息的上下文存储，并由独立组件渲染到指定位置。

**核心特性**：
- **相关问题**：仅对**最后一次**问答结果显示，展示逻辑与「重新生成」一致；正在问答中不显示。每条相关问题**可点击**，点击后以该问题文本作为用户输入**继续提问**（即调用发送逻辑，等同于用户输入该问题并发送）。
- **耗时与 Token**：展示逻辑与「复制」按钮一致（同一行、同一可见条件）；数值不随消息内容直接输出，由独立组件渲染到消息泡右下角指定位置。
- **数据来源**：相关问题来自流式事件 `message.ext.related_queries`；Token 总数来自接口返回的 token_usage；耗时可来自接口或由前端在流开始/结束时计算。

**设计参考**：消息处理逻辑参见 `design/ChatKit.pdf`、`design/ChatKit for DIP.pdf`。

## 设计参考

### Figma 设计图

1. **整体消息显示**：https://www.figma.com/design/ikuqIWpd1CmGh6fMO9PHlK/%E6%99%BA%E8%83%BD%E9%97%AE%E6%95%B0?node-id=1-3017&t=zwiX3u8H7EgS9nBl-4  
   - 消息布局、操作区（重试、复制）与统计信息（耗时、Token）的整体位置关系。

2. **单个相关问题显示及相对整体位置**：https://www.figma.com/design/ikuqIWpd1CmGh6fMO9PHlK/%E6%99%BA%E8%83%BD%E9%97%AE%E6%95%B0?node-id=1-3018&t=zwiX3u8H7EgS9nBl-4  
   - 单条相关问题的样式与在整体消息中的相对位置。

### 视觉规范（参考截图）

- **耗时与 Token 显示格式**：`耗时: 53.41s Token: 6,211`
- **位置**：消息泡右下角，与重试、复制图标同一水平线；统计信息在右侧，字体较小、浅灰色，作为辅助信息。
- **相关问题**：在消息内容下方、操作栏上方或指定区域，仅最后一条助手消息展示。

## 实现方案

### 1. 文件结构

```
dip-chatkit-sdk/src/
├── types/
│   └── index.ts                    # 修改：ChatMessage 扩展 messageContext
├── components/base/
│   ├── ChatKitBase.tsx             # 可选：流结束回调或扩展 state
│   ├── assistant/
│   │   ├── MessageItem.tsx         # 修改：集成相关问题区、统计组件
│   │   ├── MessageList.tsx        # 修改：传入 isLastAssistantMessage
│   │   ├── RelatedQuestions.tsx    # 新增：相关问题列表组件
│   │   └── MessageStatsBar.tsx    # 新增：耗时 + Token 统计组件
│   └── copilot/
│       ├── MessageItem.tsx        # 修改：同上（assistant）
│       ├── MessageList.tsx        # 修改：同上
│       ├── RelatedQuestions.tsx   # 新增：同上
│       └── MessageStatsBar.tsx    # 新增：同上
└── components/dip/
    └── DIPBase.tsx                # 修改：流式白名单/后处理写入 messageContext，记录耗时与 token
```

### 2. 数据结构

#### 2.1 扩展消息：messageContext（外层 context）

将**相关问题**、**耗时**、**Token 总数**存到消息的「外层 context」，保证只有当前这条结果拥有这些字段，便于「仅最后一条显示相关问题」的判断。

在 `src/types/index.ts` 中扩展 `ChatMessage`：

```typescript
/**
 * 单条消息的扩展上下文（不参与流式内容渲染，用于相关问题、耗时、Token 等）
 */
export interface MessageContext {
  /** 相关推荐问题列表，来自 message.ext.related_queries */
  relatedQuestions?: string[];
  /** 本次回答耗时（秒），可用于展示 "耗时: 53.41s" */
  elapsedSeconds?: number;
  /** Token 总数，用于展示 "Token: 6,211" */
  totalTokens?: number;
}

export interface ChatMessage {
  messageId: string;
  role: Role;
  type?: ChatMessageType;
  content: Array<...>;

  /** 与该消息关联的应用上下文（可选），仅用户消息可能包含 */
  applicationContext?: ApplicationContext;

  /** 消息扩展上下文：相关问题、耗时、Token 等，仅助手消息在流结束后可能包含 */
  messageContext?: MessageContext;
}
```

**说明**：
- `relatedQuestions`：仅当该条助手消息是「最后一次问答结果」时在 UI 上展示；是否「最后一条」由列表下标/消息 ID 在列表中的位置判断，不依赖存储位置。
- `elapsedSeconds` / `totalTokens`：由流式结束时写入，供 `MessageStatsBar` 单独渲染到指定位置，不直接输出在 content 中。

#### 2.2 API 与流式数据来源

- **相关问题**：OpenAPI 中 `key` 为 `["message","ext","related_queries"]`、`action` 为 `upsert` 时，`content` 为 `RelatedQueriesContent`（字符串数组）。需在 DIPBase 白名单中增加该路径，在 `postProcess` 中把 `content` 写入当前流式消息的 `messageContext.relatedQuestions`。
- **Token 总数**：若流式事件中带有 `token_usage`（如 `total_tokens`），在流结束或收到对应事件时写入 `messageContext.totalTokens`；若接口在 stream end 的某条事件中返回，需解析并更新对应消息。
- **耗时**：
  - 方案 A：流式开始时记录 `startTime = Date.now()`，流式结束（`handleStreamResponse` 的 `finally` 或 `done`）时计算 `elapsedSeconds = (Date.now() - startTime) / 1000`，写入当前助手消息的 `messageContext.elapsedSeconds`。
  - 方案 B：若后端在事件中返回开始/结束时间戳，则用其计算并写入。

### 3. 组件设计

#### 3.1 MessageStatsBar（耗时 + Token）

- **职责**：仅负责展示「耗时: xx.xxs」和「Token: x,xxx」，不参与消息正文渲染。
- **Props 建议**：
  - `elapsedSeconds?: number`
  - `totalTokens?: number`
  - `className?: string`
- **显示条件**：与复制按钮一致——仅在**非流式**且**有内容**的助手消息下展示（即与复制、重新生成同一行或同一区域）。
- **样式**：小号字体、浅灰色（如 `text-[rgba(0,0,0,0.45)]`），与参考图一致；数字格式化：耗时保留两位小数 + `s`，Token 千分位。

#### 3.2 RelatedQuestions（相关问题）

- **职责**：渲染 `messageContext.relatedQuestions` 列表，每条一个问题；**每条均可点击**，点击后触发「基于该问题继续提问」。
- **可点击行为**：点击某条问题时，应调用 `onSelectQuestion(question)`，由上层（如 AssistantBase/CopilotBase）将 `question` 作为用户输入调用 `send(question, ...)`，实现继续提问。若不传 `onSelectQuestion`，则仅展示列表、不响应点击。
- **Props 建议**：
  - `questions: string[]`
  - `onSelectQuestion?: (question: string) => void` — 点击某条问题时的回调，传入该条问题文本；用于继续提问时必传。
  - `className?: string`
- **显示条件**：
  - 仅当该条消息为**当前会话中最后一条助手消息**时显示（与「重新生成」的「仅最后一条结果」逻辑一致）。
  - 且 `!isStreaming`、有 `relatedQuestions` 且长度 > 0。
- **位置**：在整体消息中，按 Figma node-id=1-3018 的相对位置（通常在消息内容与操作栏之间或内容下方）。

#### 3.3 MessageItem 集成

- 在助手消息气泡下方、与复制/重新生成同一行：
  - 左侧：重试、复制（已有）。
  - 右侧：**MessageStatsBar**（耗时 + Token），与参考图一致。
- 在消息内容与操作栏之间（或 Figma 指定位置）：
  - 当 `isLastAssistantMessage && !isStreaming && message.messageContext?.relatedQuestions?.length` 时渲染 **RelatedQuestions**，并传入 `onSelectQuestion`（由 MessageList 从 Base 传入），以实现**点击某条问题继续提问**。
- 复制/重试的显示条件不变；MessageStatsBar 与它们同区域、同显示条件（非流式、有内容、助手消息）。

### 4. 交互逻辑

#### 4.1 相关问题

1. **只有最后一次问答结果才显示相关问题**  
   逻辑参考「重新生成」：在 `MessageList` 中计算「最后一条助手消息」的 `messageId`（或下标），传给 `MessageItem` 的 `isLastAssistantMessage`。  
   - 若 `message.messageId === lastAssistantMessageId` 且该条有 `messageContext.relatedQuestions` 则渲染 `RelatedQuestions`。
2. **正在问答中不显示**  
   - `isStreaming === true` 时不渲染相关问题（也不渲染统计栏，与复制一致）。
3. **可点击继续提问**  
   - 用户点击某条相关问题时，应将该条问题文本作为新一轮用户输入发起发送（即「继续提问」）。  
   - 实现方式：`RelatedQuestions` 接收 `onSelectQuestion(question: string)`，在每条问题上绑定点击事件并调用 `onSelectQuestion(该条文本)`；MessageList/Base 传入的回调内部调用 `send(question, applicationContext, conversationID)`。  
   - 若未传入 `onSelectQuestion`，相关问题仅作展示，点击无动作（或可不做可点击样式）。

#### 4.2 耗时与 Token

1. **与复制同一套显示逻辑**  
   - 同一行、同一可见条件：`!isStreaming && hasContent() && 助手消息`。
2. **不直接输出**  
   - 耗时和 Token 不写入 `message.content`，仅通过 `messageContext` 传入 **MessageStatsBar** 在指定位置单独渲染。

#### 4.3 数据流简述

- 流式进行中：不写或仅部分写入 `messageContext`（如先不写 related_queries，避免中间状态展示）。
- 流式结束：  
  - 在 DIPBase 中处理 `message.ext.related_queries` 的 upsert，写入当前消息的 `messageContext.relatedQuestions`；  
  - 若有 token_usage 事件，写入 `messageContext.totalTokens`；  
  - 用开始/结束时间计算并写入 `messageContext.elapsedSeconds`。  
- 渲染：MessageItem 根据 `message.messageContext` 和 `isLastAssistantMessage`、`isStreaming` 决定是否渲染 RelatedQuestions 与 MessageStatsBar。

### 5. 数据存储与流式写入

- **存储位置**：扩展消息的**外层 context**——即 `ChatMessage.messageContext`（如上类型定义）。  
- **相关问题**：保证只在「当前这条」助手消息上存储；展示上再通过「是否最后一条助手消息」控制仅最后一条结果展示。  
- **流式写入时机**：  
  - `related_queries`：在 reduceAssistantMessage 的白名单 `upsert:message.ext.related_queries` 的 postProcess 中，用 `applyStreamingUpdate` 更新当前流式消息的 `messageContext.relatedQuestions`。  
  - `elapsedSeconds`：在 `sendMessage` 中记录开始时间，在 `handleStreamResponse` 结束（finally 或 reader done）时计算并更新该消息的 `messageContext.elapsedSeconds`。  
  - `totalTokens`：在收到包含 token_usage 的事件时，在对应 postProcess 或统一「流结束」处理中更新 `messageContext.totalTokens`。

### 6. 关键实现细节

#### 6.1 ChatKitBase：updateMessageContext

在 `ChatKitBase` 中新增方法，用于流式或流结束时更新某条消息的 `messageContext`（与现有 `applyStreamingUpdate` 配合）：

```typescript
/**
 * 更新指定消息的 messageContext（合并更新）
 */
protected updateMessageContext(
  messageId: string,
  patch: Partial<MessageContext>
): void {
  this.applyStreamingUpdate((prevState) => {
    const newMessages = prevState.messages.map((msg) => {
      if (msg.messageId !== messageId) return msg;
      const nextContext = { ...msg.messageContext, ...patch };
      return { ...msg, messageContext: nextContext };
    });
    return { messages: newMessages };
  });
}
```

（需在 types 中导出 `MessageContext` 并在 ChatKitBase 中引用。）

#### 6.2 DIPBase 白名单与后处理

在 `getWhitelistEntry` 中增加：

- **相关问题**：key 为 `message.ext.related_queries` 时（JSONPath 形式需与 keyToJSONPath 一致，如 `message.ext.related_queries`）：

```typescript
'upsert:message.ext.related_queries': {
  postProcess: (_assistantMessage, content, messageId) => {
    const questions = Array.isArray(content) ? content : [];
    (this as any).updateMessageContext(messageId, { relatedQuestions: questions });
  },
},
```

- **Token**：若流式事件中有 `message.ext.token_usage` 或等价 key，可增加对应 `upsert` 项，在 postProcess 中读取 `content.total_tokens` 并调用 `updateMessageContext(messageId, { totalTokens: content.total_tokens })`。
- **耗时**：在 `sendMessage` 中请求发出前记录 `const startTime = Date.now()`；在 `handleStreamResponse` 的 `finally` 中（或 reader `done` 后）计算 `elapsedSeconds = (Date.now() - startTime) / 1000`，再对当前 `streamingMessageId` 调用 `updateMessageContext(messageId, { elapsedSeconds })`。注意 `handleStreamResponse` 在 ChatKitBase，若由 DIPBase 覆写或在其内调用，需能访问到 startTime（可通过闭包或实例变量传入）。

#### 6.3 MessageStatsBar 与 RelatedQuestions 示例

**MessageStatsBar**（仅展示，格式化由组件内部完成）：

```typescript
// 使用方式：与复制、重试同一行，右侧
{(elapsedSeconds != null || totalTokens != null) && (
  <MessageStatsBar
    elapsedSeconds={message.messageContext?.elapsedSeconds}
    totalTokens={message.messageContext?.totalTokens}
    className="text-[12px] text-[rgba(0,0,0,0.45)]"
  />
)}
```

**RelatedQuestions**（仅当最后一条助手消息且有问题列表时展示）：

```typescript
{isLastAssistantMessage && !isStreaming && (message.messageContext?.relatedQuestions?.length ?? 0) > 0 && (
  <RelatedQuestions
    questions={message.messageContext!.relatedQuestions!}
    onSelectQuestion={onSelectQuestion}
  />
)}
```

### 7. 样式规范

- **MessageStatsBar**  
  - 文案格式：`耗时: 53.41s Token: 6,211`（或按设计微调）。  
  - 字体：小号、浅灰，与参考图一致。  
- **RelatedQuestions**  
  - 按 Figma node-id=1-3018：单条样式、与整体的间距、对齐方式。  
  - **可点击样式**：每条问题应具备可点击态（如 `cursor: pointer`、悬停背景高亮），以明确「点击可继续提问」的交互。

### 8. 实现步骤（建议顺序）

1. **类型**：在 `types/index.ts` 中增加 `MessageContext` 并扩展 `ChatMessage.messageContext`。
2. **DIPBase**：  
   - 流开始记录时间；  
   - 白名单增加 `message.ext.related_queries` 与（若有）token_usage 路径，并实现写入 `messageContext`；  
   - 流结束在 finally 中写 `elapsedSeconds`。
3. **MessageStatsBar**：新建组件，接收 `elapsedSeconds`、`totalTokens`，格式化并渲染。
4. **RelatedQuestions**：新建组件，接收 `questions` 和可选 `onSelectQuestion`，按 Figma 渲染。
5. **MessageItem**：  
   - 在复制/重新生成同一行右侧加入 MessageStatsBar；  
   - 在内容与操作栏之间按条件渲染 RelatedQuestions；  
   - 从 props 接收 `isLastAssistantMessage`。
6. **MessageList**：计算 `lastAssistantMessageId`（或 lastAssistantIndex），传给每条 MessageItem 的 `isLastAssistantMessage`。
7. **AssistantBase/CopilotBase**：实现「点击相关问题继续提问」：在 Base 中实现 `handleSelectQuestion(question: string)`，内部调用 `this.send(question, this.state.applicationContext, this.state.conversationID)`，并将该回调通过 MessageList 传给 MessageItem → RelatedQuestions。若不传 `onSelectQuestion`，相关问题仅展示不可点击。

### 9. 注意事项

- **相关问题只对最后一条结果展示**：与重新生成一致，通过「最后一条助手消息」判定，不依赖存储在哪条消息。  
- **耗时与 Token 仅由组件渲染**：不写入 content，避免与正文混在一起。  
- **流式期间**：不展示统计与相关问题，避免中间状态闪烁。  
- **向后兼容**：`messageContext` 为可选，旧消息无该字段时相关 UI 不展示即可。  
- **数字格式**：耗时保留两位小数；Token 使用千分位（如 6211 → 6,211）。

### 10. 相关文件

- **类型**：`src/types/index.ts`  
- **基础类**：`src/components/base/ChatKitBase.tsx`  
- **DIP 实现**：`src/components/dip/DIPBase.tsx`  
- **助手**：`src/components/base/assistant/MessageItem.tsx`、`MessageList.tsx`，新增 `RelatedQuestions.tsx`、`MessageStatsBar.tsx`  
- **Copilot**：`src/components/base/copilot/MessageItem.tsx`、`MessageList.tsx`，同上新增两个组件  
- **设计**：`design/ChatKit.pdf`、`design/ChatKit for DIP.pdf`  
- **OpenAPI**：`openapi/adp/agent-app/agent-app.schemas.yaml`（RelatedQueriesContent、TokenUsage、message.ext.related_queries）

### 11. 交互流程简图

```
用户发送消息 → 创建助手消息 → 记录 startTime
    ↓
流式推送（content、progress、tool 等）
    ↓
收到 message.ext.related_queries upsert → 写入 messageContext.relatedQuestions
收到 token_usage（若有）→ 写入 messageContext.totalTokens
    ↓
流结束（reader done / finally）
    ↓
计算 elapsedSeconds → 写入 messageContext.elapsedSeconds
    ↓
MessageItem 渲染：
    - 非流式 && 有内容 && 助手消息 → 显示复制/重试 + MessageStatsBar（耗时、Token）
  - 是最后一条助手消息 && 有 relatedQuestions → 显示 RelatedQuestions
```

### 12. 使用示例

#### 12.1 默认行为

接入后，助手消息在流式结束后会自动展示耗时与 Token（当有数据时）；若该条消息是会话中最后一条助手消息且接口下发了相关问题，则会展示相关问题列表。无需额外配置。

#### 12.2 点击相关问题继续提问（推荐实现）

相关问题默认设计为**可点击**：点击某条后以该问题文本作为用户输入发送，实现「继续提问」。在 AssistantBase/CopilotBase 中实现回调并下传至 MessageList/MessageItem/RelatedQuestions：

```typescript
// AssistantBase / CopilotBase 中
const handleSelectQuestion = (question: string) => {
  this.send(
    question,
    this.state.applicationContext,
    this.state.conversationID
  );
};

<MessageList
  messages={messages}
  streamingMessageId={streamingMessageId}
  onRegenerate={this.handleRegenerate}
  onSelectQuestion={handleSelectQuestion}  // 传入后，相关问题可点击并继续提问
/>
```

MessageItem 将 `onSelectQuestion` 传给 RelatedQuestions；RelatedQuestions 在每条问题上绑定 `onClick={() => onSelectQuestion?.(question)}`。点击某条问题即会发送为新的一轮用户消息并触发回答。

## 总结

本方案通过扩展 `ChatMessage.messageContext` 存储相关问题、耗时和 Token，在流式结束或收到对应事件时写入；通过 **MessageStatsBar** 与 **RelatedQuestions** 两个组件在指定位置单独渲染；相关问题仅对最后一条助手消息展示，**每条相关问题可点击，点击后以该问题文本继续提问**（需传入 `onSelectQuestion` 并调用 `send`）；耗时与 Token 的显示条件与复制按钮一致，且不直接输出在消息内容中，符合「通过组件单独渲染到指定位置」的要求。
