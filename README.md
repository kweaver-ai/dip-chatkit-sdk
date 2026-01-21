# ChatKit
ChatKit 是 KWeaver 生态的一部分。如果您喜欢这个项目，欢迎也给 **[KWeaver](https://github.com/kweaver-ai/kweaver)** 项目点个 ⭐！

ChatKit 是一个 AI 对话组件。Web 应用开发者可以将 ChatKit 集成到自己的前端代码中，并通过传入与用户输入有关的上下文对象，实现对 Web 应用中有关的信息发起 AI 对话。

## 特性

- **多轮对话**: 支持基于会话 ID 的多轮对话，保持上下文连贯性
- **会话管理**: 支持创建新会话、加载历史会话、删除会话等操作
- **历史会话**: 支持查看历史会话列表，加载历史对话内容
- **应用上下文**: 支持注入应用上下文，让 AI 理解用户操作背景
- **流式响应**: 支持 SSE 流式响应，实现打字机效果
- **Markdown 渲染**: AI 助手消息支持 Markdown 格式渲染
- **消息复制**: 支持复制消息内容，支持富文本（HTML）和纯文本格式，可粘贴到 Word 等应用
- **Web 搜索**: 支持显示 Web 搜索结果
- **多平台适配**: 支持扣子(Coze)、AISHU DIP 平台等
- **TypeScript Mixin**: 使用 Mixin 模式实现多重继承，代码复用性强

## 项目结构

```
chatkit/
├── src/                                # ChatKit 组件源码
│   ├── components/                     # React 组件
│   │   ├── base/                       # 平台无关的基础组件
│   │   │   ├── ChatKitBase.tsx         # 核心基类组件
│   │   │   ├── copilot/                # Copilot 模式组件
│   │   │   │   ├── CopilotBase.tsx     # Copilot 基类
│   │   │   │   ├── Header.tsx          # Copilot 头部
│   │   │   │   ├── MessageList.tsx     # Copilot 消息列表
│   │   │   │   ├── MessageItem.tsx     # Copilot 消息项
│   │   │   │   ├── InputArea.tsx       # Copilot 输入区域
│   │   │   │   ├── Prologue.tsx        # Copilot 开场白
│   │   │   │   └── blocks/             # Copilot 消息块组件
│   │   │   └── assistant/              # Assistant 模式组件
│   │   │       ├── AssistantBase.tsx   # Assistant 基类
│   │   │       ├── Header.tsx          # Assistant 头部
│   │   │       ├── MessageList.tsx     # Assistant 消息列表
│   │   │       ├── MessageItem.tsx     # Assistant 消息项
│   │   │       ├── InputArea.tsx       # Assistant 输入区域
│   │   │       ├── Prologue.tsx        # Assistant 开场白
│   │   │       └── blocks/             # Assistant 消息块组件
│   │   ├── coze/                       # 扣子平台适配
│   │   │   └── Copilot.tsx             # 扣子 Copilot 组件
│   │   ├── dip/                        # AISHU DIP 平台适配
│   │   │   ├── DIPBase.tsx             # DIP Mixin (实现 API 层)
│   │   │   ├── Copilot.tsx             # DIP Copilot 组件
│   │   │   └── Assistant.tsx           # DIP Assistant 组件
│   │   └── icons/                      # 图标组件
│   ├── utils/                          # 工具函数
│   │   ├── mixins.ts                   # TypeScript Mixin 工具
│   │   └── copyMessage.ts              # 消息复制工具函数
│   ├── types/                          # TypeScript 类型定义
│   │   └── index.ts                    # 类型定义文件
│   ├── styles/                         # 样式文件
│   │   └── index.css                   # 全局样式
│   └── index.ts                        # 导出入口
├── examples/                           # Demo 示例应用
│   ├── chatkit_coze/                   # 扣子 Demo
│   ├── chatkit_data_agent/             # DIP Demo
│   └── src/                            # Demo 入口
├── openapi/                            # OpenAPI 规范
│   ├── coze/                           # Coze API 规范
│   │   ├── coze.paths.yaml
│   │   └── coze.schemas.yaml
│   └── adp/                            # AISHU DIP API 规范
│       └── agent-app/
│           ├── agent-app.paths.yaml
│           └── agent-app.schemas.yaml
├── design/                             # 设计文档
│   ├── ChatKit.pdf                     # ChatKit 总体设计
│   ├── ChatKit for DIP.pdf             # DIP 平台设计文档
│   └── 模块设计.pdf                     # 模块设计文档
└── package.json
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:5173/ 查看 demo 应用。

### 3. 构建项目

```bash
npm run build
```

### 4. 配置 Coze 接口

- 编辑 `examples/chatkit_coze/config.ts`，填入你的 `baseUrl`、`botId`、`apiToken` 和 `userId`。
- 需要使用 https://www.coze.cn/ 的 Personal Access Token，并确保 Bot ID 与 API Token 均可用。

### 5. 配置 AISHU DIP 接口

- 编辑 `examples/chatkit_data_agent/config.ts`，填入你的 `baseUrl`、`agentKey`、`token` 和 `businessDomain`。
- `token` 需要包含 Bearer 前缀，例如：`Bearer ory_at_xxx`。

## 使用方法

### 使用 Coze Copilot (扣子平台)

```tsx
import React, { useRef } from 'react';
import { ChatKitCoze } from '@kweaver-ai/chatkit';

function App() {
  const chatKitRef = useRef<ChatKitCoze>(null);

  // 注入应用上下文
  const injectContext = () => {
    chatKitRef.current?.injectApplicationContext({
      title: '故障节点',
      data: { node_id: 'node-uuid-1' },
    });
  };

  // 创建新会话
  const createNewConversation = () => {
    chatKitRef.current?.createConversation();
  };

  // 发送消息
  const sendMessage = () => {
    chatKitRef.current?.send('帮我分析这个故障', {
      title: '中心节点',
      data: { node_id: 'node-uuid-1' },
    });
  };

  return (
    <div>
      <button onClick={injectContext}>添加上下文</button>
      <button onClick={createNewConversation}>新建会话</button>
      <button onClick={sendMessage}>发送消息</button>
      <ChatKitCoze
        ref={chatKitRef}
        botId="你的Bot ID"
        apiToken="你的API Token"
        title="Copilot"
        visible={true}
      />
    </div>
  );
}
```

### 使用 DIP Copilot (AISHU DIP 平台)

```tsx
import React, { useRef, useState } from 'react';
import { Copilot, type ApplicationContext } from '@kweaver-ai/chatkit';

function App() {
  const [showChat, setShowChat] = useState(false);
  const chatKitRef = useRef<Copilot>(null);

  // Token 刷新函数
  const refreshToken = async (): Promise<string> => {
    // 调用您的 token 刷新接口
    const response = await fetch('/api/refresh-token');
    const data = await response.json();
    return data.token;
  };

  // 注入上下文示例
  const injectContext = () => {
    chatKitRef.current?.injectApplicationContext({
      title: '故障节点',
      data: { node_id: 'node-uuid-1' },
    });
  };

  // 发送消息示例
  const sendMessage = async () => {
    const context: ApplicationContext = {
      title: '中心节点',
      data: { node_id: 'node-uuid-1' },
    };

    await chatKitRef.current?.send(
      '节点故障,帮我分析可能的原因并给出解决方案',
      context
    );
  };

  return (
    <div>
      <button onClick={injectContext}>添加上下文</button>
      <button onClick={sendMessage}>发送消息</button>
      <button onClick={() => setShowChat(!showChat)}>
        {showChat ? '关闭' : '打开'}聊天
      </button>

      {showChat && (
        <Copilot
          ref={chatKitRef}
          title="DIP Copilot"
          visible={showChat}
          onClose={() => setShowChat(false)}
          baseUrl="https://dip.aishu.cn/api/agent-app/v1"
          agentKey="你的Agent Key"
          token="Bearer your-token"
          refreshToken={refreshToken}
          businessDomain="bd_public"
        />
      )}
    </div>
  );
}
```

### 使用 DIP Assistant (AISHU DIP 平台)

```tsx
import React, { useRef } from 'react';
import { Assistant, type ConversationHistory } from '@kweaver-ai/chatkit';

function App() {
  const chatKitRef = useRef<Assistant>(null);

  // Token 刷新函数
  const refreshToken = async (): Promise<string> => {
    const response = await fetch('/api/refresh-token');
    const data = await response.json();
    return data.token;
  };

  // 获取历史会话列表
  const getHistoryConversations = async () => {
    const conversations = await chatKitRef.current?.getConversations(1, 10);
    console.log('历史会话列表:', conversations);
  };

  // 加载指定会话
  const loadConversation = async (conversationId: string) => {
    await chatKitRef.current?.loadConversation(conversationId);
  };

  // 删除会话
  const deleteConversation = async (conversationId: string) => {
    await chatKitRef.current?.deleteConversation(conversationId);
  };

  return (
    <div className="h-screen">
      <Assistant
        ref={chatKitRef}
        title="DIP Assistant"
        visible={true}
        baseUrl="https://dip.aishu.cn/api/agent-app/v1"
        agentKey="你的Agent Key"
        token="Bearer your-token"
        refreshToken={refreshToken}
        businessDomain="bd_public"
      />
    </div>
  );
}
```

## API 文档

### ChatKitBase 基类

ChatKitBase 是 AI 对话组件的核心基类。开发者不能直接挂载 ChatKitBase，而是需要使用子类（如 Coze Copilot、DIP Copilot、DIP Assistant）。

#### 属性 (Props)

| 属性名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| conversationID | `string` | 否 | `''` | 会话 ID |
| defaultApplicationContext | `ApplicationContext` | 否 | - | 默认的应用上下文 |
| title | `string` | 否 | - | 组件标题 |
| visible | `boolean` | 否 | `true` | 是否显示组件 |
| onClose | `() => void` | 否 | - | 关闭组件的回调函数 |
| token | `string` | 否 | - | 访问令牌 |
| refreshToken | `() => Promise<string>` | 否 | - | Token 刷新函数 |

#### 公开方法

| 方法名 | 参数 | 返回值 | 说明 |
|--------|------|--------|------|
| createConversation | `()` | `Promise<void>` | 创建新的会话，清除现有消息 |
| loadConversation | `(conversationId: string)` | `Promise<void>` | 加载指定 ID 的历史会话 |
| send | `(text: string, ctx?: ApplicationContext, conversationID?: string)` | `Promise<ChatMessage>` | 发送消息，支持传入上下文和会话ID |
| injectApplicationContext | `(ctx: ApplicationContext)` | `void` | 向 ChatKit 注入应用上下文 |
| removeApplicationContext | `()` | `void` | 移除注入的应用上下文 |
| getConversations | `(page?: number, size?: number)` | `Promise<ConversationHistory[]>` | 获取历史会话列表 |
| getConversationMessages | `(conversationId: string)` | `Promise<ChatMessage[]>` | 获取指定会话的消息列表 |
| deleteConversation | `(conversationId: string)` | `Promise<void>` | 删除指定会话 |
| terminateConversation | `(conversationId: string)` | `Promise<void>` | 终止指定会话 |

### ChatKitCoze (Coze Copilot)

扣子(Coze)平台适配组件。

#### 额外属性

| 属性名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| botId | `string` | 是 | - | 扣子 Bot ID |
| apiToken | `string` | 是 | - | 扣子 API Token |
| baseUrl | `string` | 否 | `'https://api.coze.cn'` | 扣子 API 基础 URL |
| userId | `string` | 否 | `'chatkit-user'` | 用户 ID |

### Copilot (DIP 平台)

AISHU DIP 平台的 Copilot 模式组件。侧边跟随的 AI 助手，为应用提供辅助对话。

#### 额外属性

| 属性名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| baseUrl | `string` | 是 | - | DIP 服务端基础地址 |
| agentKey | `string` | 是 | - | Agent Key |
| token | `string` | 是 | - | 访问令牌（需包含 Bearer 前缀） |
| businessDomain | `string` | 否 | `'bd_public'` | 业务域 |
| agentVersion | `string` | 否 | `'latest'` | Agent 版本 |
| executorVersion | `string` | 否 | `'v2'` | 智能体执行引擎版本 |
| refreshToken | `() => Promise<string>` | 否 | - | Token 刷新函数 |

### Assistant (DIP 平台)

AISHU DIP 平台的 Assistant 模式组件。作为主交互入口，是应用的主体。支持历史会话管理。

#### 额外属性

| 属性名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| baseUrl | `string` | 是 | - | DIP 服务端基础地址 |
| agentKey | `string` | 是 | - | Agent Key |
| token | `string` | 是 | - | 访问令牌（需包含 Bearer 前缀） |
| businessDomain | `string` | 否 | `'bd_public'` | 业务域 |
| agentVersion | `string` | 否 | `'latest'` | Agent 版本 |
| executorVersion | `string` | 否 | `'v2'` | 智能体执行引擎版本 |
| refreshToken | `() => Promise<string>` | 否 | - | Token 刷新函数 |

### 类型定义

#### ChatMessage

```typescript
interface ChatMessage {
  /** 消息 ID */
  messageId: string;
  /** 发送该消息的角色 */
  role: Role;
  /** 消息类型（已废弃，保留用于向后兼容） */
  type?: ChatMessageType;
  /** 消息内容，由多个消息块组成 */
  content: Array<TextBlock | MarkdownBlock | WebSearchBlock>;
  /** 与该消息关联的应用上下文（可选）*/
  applicationContext?: ApplicationContext;
}
```

#### ContentBlock

```typescript
// 文本块
interface TextBlock {
  type: BlockType.TEXT;
  content: string;
}

// Markdown 块
interface MarkdownBlock {
  type: BlockType.MARKDOWN;
  content: string;
}

// Web 搜索块
interface WebSearchBlock {
  type: BlockType.WEB_SEARCH;
  content: WebSearchQuery;
}
```

#### ApplicationContext

```typescript
interface ApplicationContext {
  /** 显示在输入框上方的应用上下文标题 */
  title: string;
  /** 该应用上下文实际包含的数据 */
  data: any;
}
```

#### ConversationHistory

```typescript
interface ConversationHistory {
  /** 会话 ID */
  conversationID: string;
  /** 会话标题 */
  title: string;
  /** 会话创建时间（Unix 时间戳） */
  created_at: number;
  /** 会话最后更新时间（Unix 时间戳） */
  updated_at: number;
  /** 最新会话消息下标 */
  message_index?: number;
  /** 最新已读的会话消息下标 */
  read_message_index?: number;
}
```

#### RoleType

```typescript
enum RoleType {
  /** 用户 */
  USER = 'User',
  /** AI 助手 */
  ASSISTANT = 'Assistant'
}
```

#### BlockType

```typescript
enum BlockType {
  /** 文本类型 */
  TEXT = 'Text',
  /** Markdown 类型 */
  MARKDOWN = 'Markdown',
  /** Web 搜索类型 */
  WEB_SEARCH = 'WebSearch'
}
```

### ChatKitInterface 接口

如果需要创建自定义的 ChatKit 子类，需要实现 ChatKitInterface 接口中的方法：

```typescript
interface ChatKitInterface {
  /** 获取开场白和预置问题 */
  getOnboardingInfo(): Promise<OnboardingInfo>;

  /** 新建会话，返回会话 ID */
  generateConversation(): Promise<string>;

  /** 向后端发送消息 */
  sendMessage(
    text: string,
    ctx: ApplicationContext,
    conversationID?: string
  ): Promise<ChatMessage>;

  /** 解析 EventStreamMessage 并增量更新 AssistantMessage */
  reduceAssistantMessage<T = any, K = any>(
    eventMessage: T,
    prev: K,
    messageId: string
  ): K;

  /** 检查是否需要刷新 token */
  shouldRefreshToken(status: number, error: any): boolean;

  /** 终止会话 */
  terminateConversation(conversationId: string): Promise<void>;

  /** 获取历史会话列表 */
  getConversations(page?: number, size?: number): Promise<ConversationHistory[]>;

  /** 获取指定会话的消息列表 */
  getConversationMessages(conversationId: string): Promise<ChatMessage[]>;

  /** 删除指定会话 */
  deleteConversation(conversationID: string): Promise<void>;
}
```

### BlockRegistry 消息工具注册管理

对除了内置工具以外的工具支持自定义扩展

#### 类型定义

```typescript
type ToolBlockRegistration {
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

#### API 方法

```typescript
// 注册单个工具（如果工具已注册，将直接覆盖原有注册信息）
registerTool(registration: ToolBlockRegistration): void

// 批量注册工具（如果工具已注册，将直接覆盖原有注册信息）
registerTools(registrations: Array<ToolBlockRegistration>): void

// 取消注册方法
unregisterTool(toolName: string): void

// 获取注册信息
getTool(toolName: string): ToolBlockRegistration | undefined

// 查询工具是否已经注册
hasTool(toolName: string): boolean

// 清空所有注册工具
clearAll(): void

// 获取所有已注册工具名称
getAllToolNames(): string[]
```

#### 使用示例

**注册单个工具**：
```typescript
BlockRegistry.registerTool({
  name: 'your_tool_name',
  Icon: <YourIcon />,
  onClick: (block) => {
    // 自定义处理逻辑
  },
});
```

**批量注册工具**：
```typescript
BlockRegistry.registerTools([
  {
    name: 'tool1',
    Icon: <Icon1 />,
    onClick: (block) => { /* 处理逻辑 */ },
  },
  {
    name: 'tool2',
    Icon: <Icon2 />,
  },
]);
```

**重新注册工具（覆盖）**：
```typescript
// 如果工具已注册，直接调用 registerTool 即可覆盖
BlockRegistry.registerTool({
  name: 'your_tool_name',
  Icon: <NewIcon />, // 更新图标
  onClick: (block) => {
    // 更新点击行为
  },
});
```


## 架构设计

### Mixin 模式

ChatKit 使用 TypeScript Mixin 模式实现多重继承，实现了代码的高度复用：

```
┌─────────────────────────────────────────────────┐
│                  Copilot                        │
│         (DIP Copilot 组件)                      │
└─────────────┬───────────────────────┬───────────┘
              │                       │
              │                       │
    ┌─────────▼──────────┐   ┌────────▼──────────┐
    │   CopilotBase      │   │    DIPBaseMixin   │
    │   (交互逻辑)        │   │    (API 实现)     │
    └─────────┬──────────┘   └────────┬──────────┘
              │                       │
              └───────────┬───────────┘
                          │
                  ┌───────▼────────┐
                  │  ChatKitBase   │
                  │  (核心基类)     │
                  └────────────────┘
```

### 组件层次

- **ChatKitBase**: 核心基类，定义标准交互逻辑和状态管理
- **CopilotBase / AssistantBase**: 不同模式的交互界面实现
- **DIPBaseMixin / CozeBaseMixin**: 平台特定的 API 实现
- **Copilot / Assistant**: 最终导出的组件，组合基类和 Mixin

## 技术栈

- **TypeScript** - 类型安全的 JavaScript
- **React** - UI 框架
- **Tailwind CSS** - 样式框架
- **Vite** - 构建工具
- **react-markdown** - Markdown 渲染
- **remark-gfm** - GitHub Flavored Markdown 支持

## 协议

MIT
