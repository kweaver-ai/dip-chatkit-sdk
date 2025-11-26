# ChatKit

ChatKit 是一个 AI 对话组件。Web 应用开发者可以将 ChatKit 集成到自己的前端代码中,并通过传入与用户输入有关的上下文对象,实现对 Web 应用中有关的信息发起 AI 对话。

## 项目结构

```
chatkit/
├── src/                      # ChatKit 组件源码
│   ├── components/           # React 组件
│   │   ├── ChatKit.tsx      # 核心组件
│   │   ├── MessageList.tsx  # 消息列表组件
│   │   ├── MessageItem.tsx  # 消息项组件
│   │   └── InputArea.tsx    # 输入区域组件
│   ├── types/               # TypeScript 类型定义
│   │   └── index.ts         # 类型定义文件
│   ├── styles/              # 样式文件
│   │   └── index.css        # 全局样式
│   └── index.ts             # 导出入口
├── examples/                # Demo 示例应用
│   ├── src/
│   │   ├── App.tsx          # Demo 应用
│   │   ├── main.tsx         # 入口文件
│   │   ├── config.ts        # 扣子 API 配置
│   │   └── services/
│   │       └── cozeApi.ts   # 扣子 API 调用封装
│   └── index.html           # HTML 模板
├── design/                  # 设计文档
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

### 3. 配置扣子 API (可选)

Demo 应用默认使用模拟 API。如果要使用真实的扣子 AI 对话:

1. 访问 [https://www.coze.cn/](https://www.coze.cn/) 创建你的 Bot
2. 在 Bot 设置中获取 **Bot ID**
3. 在个人设置中创建 **Personal Access Token**
4. 编辑 `examples/src/config.ts`,填入你的配置:

```typescript
export const COZE_CONFIG = {
  baseUrl: 'https://api.coze.cn/v1/conversation',
  botId: '你的Bot ID',
  apiToken: '你的API Token',
  userId: 'chatkit-demo-user',
};
```

5. 在 demo 页面点击"切换到扣子模式"按钮

### 4. 构建项目

```bash
npm run build
```

## 使用方法

### 基本用法

```tsx
import React, { useRef } from 'react';
import ChatKit, { ChatKitHandle } from 'chatkit';
import { Message, Role, InputContext } from 'chatkit';

function App() {
  const chatKitRef = useRef<ChatKitHandle>(null);

  // 实现发送消息的函数
  const handleSend = async (
    message: string,
    context: InputContext
  ): Promise<Message> => {
    // 调用后端 API
    const response = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message, context }),
    });

    const data = await response.json();

    return {
      messageId: data.id,
      content: data.content,
      type: 'text',
      role: Role.ASSISTANT,
    };
  };

  // 注入上下文
  const injectContext = () => {
    chatKitRef.current?.injectInputContext({
      title: '故障节点',
      data: { node_id: 'node-uuid-1' },
    });
  };

  return (
    <div>
      <button onClick={injectContext}>添加上下文</button>
      <ChatKit
        ref={chatKitRef}
        onSend={handleSend}
        title="Copilot"
      />
    </div>
  );
}
```

### 集成扣子 API

ChatKit 已经内置了扣子 API 的集成示例。你可以参考 `examples/src/services/cozeApi.ts` 来了解如何调用扣子 API:

```typescript
import { sendMessageToCoze } from './services/cozeApi';

const handleSend = async (
  message: string,
  context: InputContext
): Promise<Message> => {
  const result = await sendMessageToCoze(message, context, conversationId);
  return result.message;
};
```

扣子 API 的主要特点:
- ✅ 支持会话上下文保持
- ✅ 自动处理上下文信息注入
- ✅ 完整的错误处理
- ✅ 支持流式和非流式响应

## API 文档

### ChatKit 组件

#### 属性 (Props)

| 属性名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| onSend | `(message: string, context: InputContext) => Promise<Message>` | 是 | - | 发送消息的实现函数 |
| conversationId | `string` | 否 | `''` | 会话 ID |
| defaultInputContext | `InputContext` | 否 | - | 默认的输入上下文 |
| title | `string` | 否 | `'Copilot'` | 组件标题 |
| visible | `boolean` | 否 | `true` | 是否显示组件 |
| onClose | `() => void` | 否 | - | 关闭组件的回调函数 |

#### 方法 (通过 ref 调用)

| 方法名 | 参数 | 返回值 | 说明 |
|--------|------|--------|------|
| injectInputContext | `(context: InputContext) => void` | `void` | 向 ChatKit 注入输入相关的上下文 |
| removeInputContext | `() => void` | `void` | 移除注入的上下文 |
| send | `(message: string, messageContext: InputContext) => Promise<Message>` | `Promise<Message>` | 发送消息 |

### 类型定义

#### Message

```typescript
interface Message {
  /** 消息 ID */
  messageId: string;
  /** 消息内容 */
  content: string;
  /** 消息类型 */
  type: 'onoff' | 'html' | 'text' | 'widget';
  /** 发送者角色 */
  role: Role;
}
```

#### Role

```typescript
enum Role {
  /** 用户角色 */
  USER = 'user',
  /** 助手角色 */
  ASSISTANT = 'assistant'
}
```

#### InputContext

```typescript
interface InputContext {
  /** 显示在输入框上方的文本内容 */
  title: string;
  /** 该上下文实际包含的数据 */
  data: any;
}
```

## Demo 应用

demo 应用展示了 ChatKit 组件的基本使用方法:

1. **模拟模式**: 默认模式,使用模拟 API 回显消息和上下文
2. **扣子模式**: 连接真实的扣子 AI,提供智能对话能力

功能特点:
- ✅ 点击"添加上下文并打开聊天"按钮,会注入一个示例上下文对象
- ✅ 上下文会显示在输入框上方,可以通过 × 按钮移除
- ✅ 发送消息时,控制台会打印出选中的上下文信息
- ✅ 支持切换使用扣子 API 或模拟 API
- ✅ 使用扣子 API 时会保持会话上下文

## 扣子 API 集成说明

### API 端点

扣子 API 使用以下端点:

```
POST https://api.coze.cn/v1/conversation/chat
```

### 请求格式

```json
{
  "bot_id": "你的Bot ID",
  "user_id": "用户ID",
  "query": "用户消息",
  "conversation_id": "会话ID(可选)",
  "stream": false
}
```

### 响应格式

```json
{
  "conversation_id": "会话ID",
  "messages": [
    {
      "id": "消息ID",
      "content": "消息内容",
      "type": "answer",
      "role": "assistant"
    }
  ]
}
```

### 错误处理

集成代码已经包含完整的错误处理:
- 配置错误会提示用户配置 API
- 网络错误会显示友好的错误信息
- 支持自动降级到模拟模式

## 技术栈

- **TypeScript** - 类型安全的 JavaScript
- **React** - UI 框架
- **Tailwind CSS** - 样式框架
- **Vite** - 构建工具
- **扣子 API** - AI 对话能力

## 开发规范

- 每个类、属性、函数、枚举、接口都必须写清楚注释
- 对于关键的代码逻辑要用注释解释清楚

## License

MIT
# chatkit
