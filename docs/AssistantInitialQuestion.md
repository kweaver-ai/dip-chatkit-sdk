## Assistant 初始问题自动发送方案

### 场景说明

在部分业务中，外层页面在挂载 `Assistant` 组件时，已经拿到用户的**首次问题**（例如从上游表单或流程节点传入），希望：

- 不需要用户再手动输入 / 点击发送；
- `Assistant` 在首次可见时自动触发一次问答，请求后端并展示完整对话。

为此，在 ChatKit 基类上新增了一个通用能力：**初始问题自动发送**。

### API 设计

#### 新增 props：`initialQuestion`

在 `ChatKitBaseProps` 上新增：

```ts
interface ChatKitBaseProps {
  // ...

  /**
   * 初始用户问题。
   *
   * - 外层在挂载 Assistant / Copilot 等组件时传入
   * - 当组件首次可见且当前没有任何消息时，会自动发送该问题并触发问答
   */
  initialQuestion?: string;
}
```

`Assistant` 组件的 `AssistantProps` 继承自 `ChatKitBaseProps`，因此可以直接使用该属性。

### 触发时机与行为说明

- **触发条件**（必须同时满足）：
  - 组件当前可见：`visible !== false`；
  - `initialQuestion` 为非空字符串；
  - 当前还没有任何对话消息：`state.messages.length === 0`；
  - 当前不在发送中：`state.isSending === false`；
  - 之前尚未基于该属性触发过自动发送（内部通过 `hasSentInitialQuestion` 标记一次性执行）。

- **触发时机**：
  - 组件 **首次挂载完成** 后（`componentDidMount`），在完成初始化流程后尝试自动发送一次；
  - 当 `visible` 从 `false` 变为 `true`，或者 `initialQuestion` 发生变化时（`componentDidUpdate`），再次检查是否满足上述触发条件。

- **发送实现**：
  - 内部调用已有的公共方法 `send(initialQuestion, context)`；
  - 上下文优先级：`state.applicationContext` → `props.defaultApplicationContext` → `{ title: '', data: {} }`；
  - 如果当前还没有 `conversationID`，`send` 会按现有逻辑调用 `generateConversation(initialQuestion)` 自动创建会话；
  - 自动发送失败时**不会抛出到外层**，而是静默失败，用户仍可以通过正常输入再次发问。

### 对现有逻辑的影响

- 不改变现有的手动输入 / 点击发送链路：
  - `InputArea` 仍然通过 `onSend={this.handleSend}` 触发；
  - 历史会话加载、重新生成等逻辑不受影响。
- 仅在「当前没有任何消息」时才会自动发送，**不会干扰已有会话的继续对话场景**。
- 如果集成方不传 `initialQuestion`，行为与改动前完全一致。

### Assistant 使用示例

外层页面在首次挂载 `Assistant` 时直接传入用户的第一次问题：

```tsx
import { Assistant } from '@kweaver-ai/chatkit';

export function MyPage() {
  return (
    <div style={{ height: '100vh' }}>
      <Assistant
        // DIP 相关配置
        agentKey="my-agent-key"
        token="xxx"
        baseUrl="https://dip.example.com/api/agent-app/v1"

        // ChatKit 基础配置
        title="智能问数助手"
        visible

        // 新增：初始用户问题，组件首次可见时会自动发送
        initialQuestion="帮我分析一下最近一周的销售情况？"
      />
    </div>
  );
}
```

在上述示例中：

- 页面渲染 `Assistant` 后，无需用户操作，组件会在首屏自动发出 `"帮我分析一下最近一周的销售情况？"`；
- `Assistant` 内部会创建会话、插入一条用户消息，并开始流式展示 AI 回答。

