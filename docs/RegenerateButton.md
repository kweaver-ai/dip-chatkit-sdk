# RegenerateButton 组件实现文档

## 概述

本文档描述在 ChatKit SDK 中新增 `RegenerateButton` 组件的实现方案。该组件用于在助手消息底部显示"重新生成"按钮，支持用户重新生成 AI 助手的回复内容。

**交互方式**：组件显示在助手消息底部，点击后重新发送用户的上一条消息，并在请求中携带需要重新生成的助手消息 ID（`regenerate_assistant_message_id`）。

**重要特性**：
- 重新生成时**不会插入新的用户消息**，用户消息已经存在于消息列表中
- 只会重新生成和更新助手消息，保持消息列表的整洁性

## 设计参考

### Figma 设计图

1. **消息整体设计**：https://www.figma.com/design/ikuqIWpd1CmGh6fMO9PHlK/%E6%99%BA%E8%83%BD%E9%97%AE%E6%95%B0?node-id=1-2627&t=8fBvm6SJ7OtDYzBU-4
   - 消息布局和样式参考

2. **重新生成按钮设计**：https://www.figma.com/design/ikuqIWpd1CmGh6fMO9PHlK/%E6%99%BA%E8%83%BD%E9%97%AE%E6%95%B0?node-id=700-2395&t=8fBvm6SJ7OtDYzBU-4
   - 按钮图标：刷新图标（16x16px）
   - 按钮位置：助手消息底部，与复制按钮同一行
   - 按钮样式：与复制按钮保持一致

## 实现方案

### 1. 文件结构

```
dip-chatkit-sdk/src/components/base/
├── assistant/
│   ├── RegenerateButton.tsx  # 新增：重新生成按钮组件
│   ├── MessageItem.tsx       # 修改：集成重新生成按钮
│   └── ...
└── copilot/
    ├── RegenerateButton.tsx   # 新增：重新生成按钮组件（copilot模式）
    ├── MessageItem.tsx       # 修改：集成重新生成按钮
    └── ...
```

### 2. 组件接口设计

#### 2.1 RegenerateButton Props

```typescript
export interface RegenerateButtonProps {
  /** 当前助手消息的 ID */
  messageId: string;
  /** 点击重新生成的回调函数 */
  onRegenerate: (messageId: string) => Promise<void>;
  /** 是否禁用按钮（例如：正在重新生成时） */
  disabled?: boolean;
  /** 自定义样式类名 */
  className?: string;
}
```

**说明**：
- `messageId`：当前助手消息的 ID，用于传递给后端作为 `regenerate_assistant_message_id`
- `onRegenerate`：点击重新生成时调用的回调函数，由父组件（MessageItem）传入
- `disabled`：用于在重新生成过程中禁用按钮，防止重复点击
- `className`：可选的自定义样式类名

### 3. 数据结构

#### 3.1 send 方法参数扩展

需要在 `ChatKitBase` 的 `send` 方法中添加可选的 `regenerateMessageId` 参数：

```typescript
public send = async (
  text: string, 
  ctx?: ApplicationContext, 
  conversationID?: string,
  regenerateMessageId?: string  // 新增：需要重新生成的助手消息 ID
): Promise<ChatMessage>
```

**重要逻辑**：
- 当 `regenerateMessageId` 参数存在时，表示这是重新生成操作
- **此时不应创建新的用户消息**，因为用户消息已经存在于消息列表中
- 直接调用 `sendMessage` 方法，传递 `regenerateMessageId` 参数
- 只有助手消息会被重新生成和更新

#### 3.2 sendMessage 方法参数扩展

需要在 `ChatKitInterface` 的 `sendMessage` 方法中添加可选的 `regenerateMessageId` 参数：

```typescript
sendMessage(
  text: string, 
  ctx?: ApplicationContext, 
  conversationID?: string,
  regenerateMessageId?: string  // 新增：需要重新生成的助手消息 ID
): Promise<ChatMessage>
```

#### 3.3 DIPBase sendMessage 实现

在 `DIPBase.tsx` 的 `sendMessage` 方法中，需要将 `regenerateMessageId` 传递给后端 API：

```typescript
public async sendMessage(
  text: string, 
  ctx: ApplicationContext, 
  conversationID?: string,
  regenerateMessageId?: string  // 新增参数
): Promise<ChatMessage> {
  // ... 现有代码 ...
  
  const body = {
    agent_id: this.agentInfo.id,
    agent_version: this.dipVersion,
    executor_version: this.dipExecutorVersion,
    query: fullQuery,
    stream: true,
    custom_querys: ctx?.data,
    conversation_id: conversationID || undefined,
    regenerate_assistant_message_id: regenerateMessageId || undefined,  // 新增：传递给后端
    chat_option: {
      is_need_history: true,
      is_need_doc_retrival_post_process: true,
      is_need_progress: true,
      enable_dependency_cache: true,
    },
    inc_stream: true,
  };
  
  // ... 后续代码 ...
}
```

### 4. 样式规范

#### 4.1 按钮样式

- **尺寸**：24x24px（与复制按钮保持一致）
- **位置**：助手消息底部，与复制按钮同一行，位于复制按钮左侧
- **图标**：使用刷新图标（RefreshIcon），16x16px
- **颜色**：
  - 默认：`text-[rgba(0,0,0,0.45)]`
  - 悬停：背景色 `hover:bg-[rgba(0,0,0,0.05)]`
  - 禁用：`opacity-50 cursor-not-allowed`
- **圆角**：`rounded`
- **间距**：与复制按钮之间保持适当间距（建议 8px）

#### 4.2 交互效果

- **悬停效果**：背景色变为 `rgba(0,0,0,0.05)`
- **点击效果**：无特殊效果（与复制按钮保持一致）
- **禁用状态**：显示为半透明，鼠标指针变为 `not-allowed`

### 5. 交互逻辑

#### 5.1 显示条件

重新生成按钮仅在以下条件下显示：
1. 消息角色为助手（`message.role.type === RoleType.ASSISTANT`）
2. 消息已完成流式传输（`!isStreaming`）
3. 消息有实际内容（`hasContent()` 返回 `true`）
4. 存在上一条用户消息（用于重新发送）

#### 5.2 点击处理流程

```
用户点击重新生成按钮
    ↓
获取当前助手消息的 messageId
    ↓
查找上一条用户消息（从 messages 数组中）
    ↓
如果找到用户消息：
    - 提取用户消息的 text 和 applicationContext
    - 调用 send(text, ctx, conversationID, messageId)
    - 传递 messageId 作为 regenerateMessageId 参数
    ↓
如果未找到用户消息：
    - 显示错误提示（不应该出现此情况）
    ↓
ChatKitBase.send 方法处理：
    - 检测到 regenerateMessageId 参数存在
    - **跳过创建用户消息的步骤**（重要：不插入用户消息）
    - 直接调用 sendMessage 方法，传递 regenerateMessageId
    ↓
后端处理：
    - 接收 regenerate_assistant_message_id 参数
    - 重新生成助手回复
    - 替换或更新对应的助手消息
```

**重要说明**：
- 重新生成时，**不会创建新的用户消息**，只会重新生成助手消息
- 这是重新生成功能与普通发送消息的关键区别
- 用户消息已经存在于消息列表中，无需重复插入

#### 5.3 状态管理

- **禁用状态**：在重新生成过程中，按钮应处于禁用状态，防止重复点击
- **加载状态**：重新生成过程中，可以显示加载提示（可选）
- **错误处理**：如果重新生成失败，显示错误提示，但不影响现有消息

### 6. 关键实现细节

#### 6.1 RegenerateButton 组件实现

```typescript
import React from 'react';
import { RefreshIcon } from '../../icons';

export interface RegenerateButtonProps {
  messageId: string;
  onRegenerate: (messageId: string) => Promise<void>;
  disabled?: boolean;
  className?: string;
}

const RegenerateButton: React.FC<RegenerateButtonProps> = ({
  messageId,
  onRegenerate,
  disabled = false,
  className = '',
}) => {
  const handleClick = async () => {
    if (disabled) return;
    
    try {
      await onRegenerate(messageId);
    } catch (error) {
      console.error('重新生成失败:', error);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`flex items-center justify-center w-[24px] h-[24px] rounded hover:bg-[rgba(0,0,0,0.05)] ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
      title="重新生成"
    >
      <RefreshIcon className="w-[16px] h-[16px] text-[rgba(0,0,0,0.45)]" />
    </button>
  );
};

export default RegenerateButton;
```

#### 6.2 MessageItem 组件集成

在 `MessageItem` 组件中：

1. **导入 RegenerateButton 组件**
2. **添加 onRegenerate prop**（可选，用于从父组件传递重新生成逻辑）
3. **在助手消息底部渲染按钮**（与复制按钮同一行）

```typescript
interface MessageItemProps {
  message: ChatMessage;
  isStreaming?: boolean;
  agentAvatar?: string;
  onRegenerate?: (messageId: string) => Promise<void>;  // 新增
}

const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isStreaming = false,
  agentAvatar,
  onRegenerate,  // 新增
}) => {
  // ... 现有代码 ...

  // 查找上一条用户消息
  const findPreviousUserMessage = (currentMessageId: string): ChatMessage | null => {
    // 从 MessageList 传入的 messages 数组中查找
    // 需要在 MessageList 中传递 messages 数组给 MessageItem
    // 或者通过 context 传递
    return null; // 临时返回，需要实际实现
  };

  const handleRegenerate = async (messageId: string) => {
    if (!onRegenerate) {
      console.warn('onRegenerate 回调未提供');
      return;
    }

    // 查找上一条用户消息
    const previousUserMessage = findPreviousUserMessage(messageId);
    if (!previousUserMessage) {
      console.warn('未找到上一条用户消息');
      return;
    }

    // 调用父组件传入的重新生成逻辑
    await onRegenerate(messageId);
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-2 group`}>
      {/* ... 现有代码 ... */}

      {/* 复制按钮和重新生成按钮 */}
      {!isStreaming && hasContent() && !isUser && (
        <div className="flex items-center gap-2 justify-start">
          {/* 重新生成按钮 */}
          {onRegenerate && (
            <RegenerateButton
              messageId={message.messageId}
              onRegenerate={handleRegenerate}
              disabled={isStreaming}
            />
          )}
          
          {/* 复制按钮 */}
          <button
            onClick={handleCopy}
            className="flex items-center justify-center w-[24px] h-[24px] rounded hover:bg-[rgba(0,0,0,0.05)]"
            title={copySuccess ? '已复制' : '复制'}
          >
            <CopyIcon
              className={`w-[14px] h-[14px] ${
                copySuccess ? 'text-[#126EE3]' : 'text-[rgba(0,0,0,0.45)]'
              }`}
            />
          </button>
        </div>
      )}
    </div>
  );
};
```

#### 6.3 MessageList 组件修改

在 `MessageList` 组件中，需要：

1. **传递 messages 数组给 MessageItem**（用于查找上一条用户消息）
2. **实现重新生成逻辑**，调用 `ChatKitBase` 的 `send` 方法

```typescript
interface MessageListProps {
  messages: ChatMessage[];
  streamingMessageId: string | null;
  agentAvatar?: string;
  onRegenerate?: (messageId: string, previousUserMessage: ChatMessage) => Promise<void>;  // 新增
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  streamingMessageId,
  agentAvatar,
  onRegenerate,  // 新增
}) => {
  // ... 现有代码 ...

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-[960px] px-5 py-3">
        {messages.map((message, index) => {
          // 查找上一条用户消息
          const findPreviousUserMessage = (currentIndex: number): ChatMessage | null => {
            for (let i = currentIndex - 1; i >= 0; i--) {
              if (messages[i].role.type === RoleType.USER) {
                return messages[i];
              }
            }
            return null;
          };

          const handleRegenerate = async (messageId: string) => {
            if (!onRegenerate) return;
            
            const previousUserMessage = findPreviousUserMessage(index);
            if (!previousUserMessage) {
              console.warn('未找到上一条用户消息');
              return;
            }

            await onRegenerate(messageId, previousUserMessage);
          };

          return (
            <MessageItem
              key={message.messageId}
              message={message}
              isStreaming={message.messageId === streamingMessageId}
              agentAvatar={agentAvatar}
              onRegenerate={handleRegenerate}  // 传递重新生成逻辑
            />
          );
        })}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};
```

#### 6.4 AssistantBase/CopilotBase 集成

在 `AssistantBase` 或 `CopilotBase` 中：

1. **实现重新生成逻辑**，调用 `send` 方法并传递 `regenerateMessageId`
2. **将重新生成逻辑传递给 MessageList**

```typescript
// 在 AssistantBase 或 CopilotBase 中
const handleRegenerate = async (
  messageId: string, 
  previousUserMessage: ChatMessage
): Promise<void> => {
  try {
    // 提取用户消息的文本和上下文
    const userText = this.extractUserMessageText(previousUserMessage);
    const userContext = previousUserMessage.applicationContext;

    // 调用 send 方法，传递 regenerateMessageId
    // 注意：send 方法内部会检测 regenerateMessageId 参数
    // 如果存在，将跳过创建用户消息的步骤，只重新生成助手消息
    await this.send(
      userText,
      userContext,
      this.state.conversationID,
      messageId  // 传递需要重新生成的消息 ID
    );
  } catch (error) {
    console.error('重新生成失败:', error);
    throw error;
  }
};

// 在 render 方法中
<MessageList
  messages={messages}
  streamingMessageId={streamingMessageId}
  agentAvatar={this.agentInfo?.avatar}
  onRegenerate={this.handleRegenerate}  // 传递重新生成逻辑
/>
```

**重要说明**：
- `send` 方法接收到 `regenerateMessageId` 参数后，会跳过创建用户消息的逻辑
- 用户消息已经存在于消息列表中，不需要重复插入
- 只有助手消息会被重新生成和更新

#### 6.5 提取用户消息文本

需要实现一个辅助方法，从 `ChatMessage` 中提取用户输入的文本：

```typescript
/**
 * 从用户消息中提取文本内容
 * @param message 用户消息
 * @returns 提取的文本内容
 */
private extractUserMessageText(message: ChatMessage): string {
  if (Array.isArray(message.content)) {
    // 查找 TEXT 或 MARKDOWN 类型的块
    const textBlock = message.content.find(
      (block) => block.type === BlockType.TEXT || block.type === BlockType.MARKDOWN
    );
    if (textBlock) {
      return textBlock.content as string;
    }
  }
  
  // 向后兼容：如果 content 是字符串
  if (typeof message.content === 'string') {
    return message.content;
  }

  return '';
}
```

### 7. 后端接口参数

#### 7.1 DIP API 请求体

在 `DIPBase.sendMessage` 方法中，请求体应包含：

```typescript
const body = {
  agent_id: this.agentInfo.id,
  agent_version: this.dipVersion,
  executor_version: this.dipExecutorVersion,
  query: fullQuery,
  stream: true,
  custom_querys: ctx?.data,
  conversation_id: conversationID || undefined,
  regenerate_assistant_message_id: regenerateMessageId || undefined,  // 新增参数
  chat_option: {
    is_need_history: true,
    is_need_doc_retrival_post_process: true,
    is_need_progress: true,
    enable_dependency_cache: true,
  },
  inc_stream: true,
};
```

**说明**：
- `regenerate_assistant_message_id`：需要重新生成的助手消息 ID
- 当该参数存在时，后端应重新生成该消息的回复内容
- 后端可能会替换原有消息，或创建新的消息（具体行为由后端实现决定）

### 8. 实现步骤

1. **创建 RegenerateButton 组件**
   - 在 `src/components/base/assistant/RegenerateButton.tsx` 创建组件
   - 在 `src/components/base/copilot/RegenerateButton.tsx` 创建组件（如果需要）

2. **修改 ChatKitBase.send 方法**
   - 添加 `regenerateMessageId` 参数
   - **重要**：当 `regenerateMessageId` 存在时，跳过创建用户消息的步骤
   - 直接调用 `sendMessage` 方法，传递 `regenerateMessageId` 参数
   - 将参数传递给 `sendMessage` 方法

**实现示例**：

```typescript
public send = async (
  text: string, 
  ctx?: ApplicationContext, 
  conversationID?: string,
  regenerateMessageId?: string  // 新增参数
): Promise<ChatMessage> => {
  if (!text.trim()) {
    throw new Error('消息内容不能为空');
  }

  // 如果传入了 ctx，则设置 applicationContext
  if (ctx) {
    this.setState({ applicationContext: ctx });
  }

  // 使用传入的 conversationID，或使用当前 state 中的 conversationID
  let currentConversationID = conversationID || this.state.conversationID;

  // 如果没有会话 ID，则创建新会话
  if (!currentConversationID) {
    try {
      currentConversationID = await this.generateConversation(text);
      this.setState({ conversationID: currentConversationID });
    } catch (error) {
      console.error('自动创建会话失败:', error);
    }
  }

  this.setState({ isSending: true });

  // 获取最终使用的上下文
  const finalContext = ctx || this.state.applicationContext || this.props.defaultApplicationContext || { title: '', data: {} };

  // **重要：重新生成时不创建用户消息**
  // 只有当 regenerateMessageId 不存在时，才创建并插入用户消息
  if (!regenerateMessageId) {
    // 创建用户消息
    const userMessage: ChatMessage = {
      messageId: `user-${Date.now()}`,
      content: [
        {
          type: BlockType.TEXT,
          content: text,
        },
      ],
      role: {
        name: '用户',
        type: RoleType.USER,
        avatar: '',
      },
      applicationContext: finalContext.title || finalContext.data ? finalContext : undefined,
    };

    // 将用户消息添加到消息列表
    this.setState((prevState) => ({
      messages: [...prevState.messages, userMessage],
    }));
  }

  try {
    // 如果不是重新生成，则清空输入框
    if (!regenerateMessageId) {
      this.setState({ textInput: '' });
    }
    
    // 调用子类实现的 sendMessage 方法，传入 conversationID 和 regenerateMessageId
    const assistantMessage = await this.sendMessage(
      text, 
      finalContext, 
      currentConversationID,
      regenerateMessageId  // 传递重新生成的消息 ID
    );

    // 流式响应时,子类已经添加并更新了消息,这里只需要清理状态
    this.setState({
      isSending: false,
      streamingMessageId: null,
    });

    return assistantMessage;
  } catch (error) {
    console.error('发送消息失败:', error);
    this.setState({ isSending: false, streamingMessageId: null });
    throw error;
  }
};
```

3. **修改 ChatKitInterface.sendMessage 方法签名**
   - 在接口定义中添加 `regenerateMessageId` 参数

4. **修改 DIPBase.sendMessage 方法**
   - 添加 `regenerateMessageId` 参数
   - 在请求体中添加 `regenerate_assistant_message_id` 字段

5. **修改 MessageItem 组件**
   - 添加 `onRegenerate` prop
   - 集成 `RegenerateButton` 组件
   - 实现查找上一条用户消息的逻辑

6. **修改 MessageList 组件**
   - 添加 `onRegenerate` prop
   - 实现查找上一条用户消息的逻辑
   - 将重新生成逻辑传递给 `MessageItem`

7. **修改 AssistantBase/CopilotBase**
   - 实现 `handleRegenerate` 方法
   - 实现 `extractUserMessageText` 辅助方法
   - 将重新生成逻辑传递给 `MessageList`

8. **添加刷新图标**
   - 在 `src/components/icons` 中添加 `RefreshIcon` 组件（如果不存在）

9. **测试验证**
   - 测试重新生成按钮的显示条件
   - 测试点击重新生成按钮的交互流程
   - 测试重新生成过程中的状态管理
   - 测试错误处理
   - 测试与复制按钮的布局和样式

### 9. 注意事项

1. **不插入用户消息（重要）**：
   - **重新生成时不会创建新的用户消息**
   - 用户消息已经存在于消息列表中，无需重复插入
   - 在 `ChatKitBase.send` 方法中，当 `regenerateMessageId` 参数存在时，必须跳过创建用户消息的步骤
   - 这是重新生成功能与普通发送消息的关键区别

2. **消息查找逻辑**：
   - 需要正确查找上一条用户消息，确保重新生成时使用正确的用户输入
   - 考虑消息顺序和消息 ID 的关系
   - 查找用户消息仅用于提取文本和上下文，不用于插入新消息

3. **状态管理**：
   - 重新生成过程中，按钮应处于禁用状态
   - 重新生成完成后，应清除禁用状态
   - 如果重新生成失败，应显示错误提示

4. **消息替换逻辑**：
   - 后端可能会替换原有消息，或创建新消息
   - 前端需要根据后端行为调整消息列表的更新逻辑
   - 如果后端替换消息，前端需要更新对应消息的内容
   - 如果后端创建新消息，前端需要添加新消息并可能需要删除旧消息
   - **无论哪种情况，都不会插入新的用户消息**

4. **错误处理**：
   - 如果未找到上一条用户消息，应显示友好的错误提示
   - 如果重新生成失败，应显示错误提示，但不影响现有消息
   - 网络错误、权限错误等都应妥善处理

5. **性能考虑**：
   - 重新生成过程中，避免重复渲染
   - 使用适当的防抖或节流机制（如果需要）

6. **样式一致性**：
   - 确保重新生成按钮的样式与复制按钮保持一致
   - 确保在不同模式下（assistant/copilot）的样式一致

7. **向后兼容**：
   - 确保新增的参数都是可选的，不影响现有功能
   - 如果后端不支持 `regenerate_assistant_message_id` 参数，应优雅降级

8. **类型安全**：
   - 使用 TypeScript 类型定义确保类型安全
   - 所有新增的接口和方法都应提供完整的类型定义

### 10. 相关文件

- **组件文件**：
  - `src/components/base/assistant/RegenerateButton.tsx` - 重新生成按钮组件
  - `src/components/base/assistant/MessageItem.tsx` - 消息项组件
  - `src/components/base/assistant/MessageList.tsx` - 消息列表组件
  - `src/components/base/copilot/RegenerateButton.tsx` - 重新生成按钮组件（copilot模式）
  - `src/components/base/copilot/MessageItem.tsx` - 消息项组件（copilot模式）
  - `src/components/base/copilot/MessageList.tsx` - 消息列表组件（copilot模式）

- **基础类文件**：
  - `src/components/base/ChatKitBase.tsx` - ChatKit 基础类
  - `src/components/base/assistant/AssistantBase.tsx` - Assistant 模式基础类
  - `src/components/base/copilot/CopilotBase.tsx` - Copilot 模式基础类

- **实现类文件**：
  - `src/components/dip/DIPBase.tsx` - DIP 实现类

- **类型定义文件**：
  - `src/types/index.ts` - 类型定义

- **图标组件**：
  - `src/components/icons/RefreshIcon.tsx` - 刷新图标（需要创建）

### 11. 交互流程图

```
用户点击重新生成按钮
    ↓
MessageItem.handleRegenerate(messageId)
    ↓
MessageList.findPreviousUserMessage(index)
    ↓
找到上一条用户消息
    ↓
AssistantBase.handleRegenerate(messageId, previousUserMessage)
    ↓
提取用户消息文本和上下文
    ↓
ChatKitBase.send(text, ctx, conversationID, regenerateMessageId)
    ↓
检测到 regenerateMessageId 参数存在
    ↓
**跳过创建用户消息的步骤**（重要：不插入用户消息）
    ↓
直接调用 sendMessage 方法
    ↓
DIPBase.sendMessage(text, ctx, conversationID, regenerateMessageId)
    ↓
构造请求体，包含 regenerate_assistant_message_id
    ↓
发送请求到后端 API
    ↓
后端重新生成助手回复
    ↓
前端接收流式响应
    ↓
更新消息列表（替换或更新助手消息，不插入用户消息）
    ↓
完成重新生成
```

### 12. 使用示例

#### 12.1 基础使用

重新生成按钮会自动显示在助手消息底部，无需额外配置。用户点击按钮后，会自动重新生成该消息的回复。

#### 12.2 自定义重新生成逻辑

如果需要自定义重新生成逻辑，可以在 `AssistantBase` 或 `CopilotBase` 中覆盖 `handleRegenerate` 方法：

```typescript
class CustomAssistantBase extends AssistantBase {
  handleRegenerate = async (
    messageId: string,
    previousUserMessage: ChatMessage
  ): Promise<void> => {
    // 自定义重新生成逻辑
    // 例如：添加额外的参数、修改请求体等
    const userText = this.extractUserMessageText(previousUserMessage);
    const userContext = previousUserMessage.applicationContext;

    // 调用 send 方法
    await this.send(
      userText,
      userContext,
      this.state.conversationID,
      messageId
    );
  };
}
```

## 总结

本文档详细描述了重新生成功能的完整实现方案，包括：

1. **组件设计**：RegenerateButton 作为独立组件，可复用
2. **接口扩展**：send 和 sendMessage 方法添加 regenerateMessageId 参数
3. **后端集成**：在 DIP API 请求中传递 regenerate_assistant_message_id 参数
4. **交互流程**：完整的重新生成交互流程和状态管理
5. **实现细节**：详细的代码实现和集成方案

通过以上方案，可以实现完整的重新生成功能，提升用户体验。
