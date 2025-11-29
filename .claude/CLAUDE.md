你的任务是开发并测试 ChatKit 组件。你需要开发以下几部分内容：
1. ChatKitBase 组件
2. 适配扣子（Coze）的 ChatKitCoze 组件
3. 运行 ChatKitCoze 组件的 demo
4. 适配 AISHU 数据智能体的 ChatKitDataAgent 组件
5. 运行 ChatKitDataAgent 组件的 demo

# ChatKitBase 组件
在开始编写代码之前，一定要仔细阅读所有有关的文档。

**设计**
- 从 design 目录下获取设计文档

**实现**
- 使用 TypeScript 作为开发语言，使用 ReactJS 和 Tailwind 作为框架
- 能够支持流式数据响应。具体的流式数据处理方法由 ChatKitCoze 组件继承并实现 reduceEventStreamMessage() 方法来决定。ChatKitBase 只需要实现在接收到 EventStream 时调用 reduceEventStreamMessage() 方法并打印到界面上的标准处理逻辑。
- 接收 EventSteam 时，在闭包中处理数据流，并在全部处理完成后丢弃掉闭包。
- AI 助手返回 Text 类型的消息时，渲染 Markdown。

# ChatKitCoze 组件
ChatKitCoze 组件是专门适配 Coze 平台智能体 API 的智能体对话组件。
ChatKitCoze 组件继承了 ChatKitBase 和 ChatKitInterface，ChatKitCoze 需要实现 ChatKitInterface 里的两个方法：
* sendMessage(): 调用扣子（Coze）的 API 实现对话的后端逻辑，API 文档参考：https://www.coze.cn/open/docs/developer_guides/chat_v3
* reduceEventStreamMessage(): 解析扣子（Coze）输出的 EventStreamMessage，追加并返回字符串以供界面实现打字机效果。 

# ChatKitCoze Demo
ChatKitCoze Demo 是一个简单的 Web 应用，该应用需要挂载 ChatKitCoze 组件。ChatKitCoze Demo 应用上有两个主要按钮：
1. 【添加应用上下文】按钮，点击该按钮会将以下对象注入到 ChatKitCoze 的应用上下文中：
```json
{
    "title": "故障节点",
    "data": {
        "node_id": "node-uuid-1"
    }
}
```
2. 【一键发送对话】按钮，点击该按钮会直接调用 sendMessage() 方法发送消息，参数如下：
* text: 节点故障，帮我分析可能的原因并给出解决方案
* applicationContext:
```json
{
    "title": "中心节点",
    "data": {
        "node_id": "node-uuid-1"
    }
}
```

**开发**
注意：
- ChatKitCoze Demo 代码放在 examples/chatkit_coze 目录下。
- 扣子的访问令牌：pat_wGyWHojZkyhhnL2nX7fOgm5x9YLojLK09FlWK3mpnixSwD8stZToochkrYzQFCNn

# ChatKitDataAgent 组件
ChatKitDataAgent 组件是专门适配 AISHU Data Agent 平台智能体 API 的智能体对话组件。
ChatKitDataAgent 组件继承了 ChatKitBase 和 ChatKitInterface，ChatKitDataAgent 需要实现 ChatKitInterface 里的两个方法：
* sendMessage(): 调用 AISHU Data Agent 的API 实现对话的后端逻辑，API 参考 api/data-agent.yaml 中的 Schema 定义。
* reduceEventStreamMessage(): 解析 AISHU Data Agent 输出的 EventStreamMessage，追加并返回字符串以供界面实现打字机效果。 注意：
1. 当 key 仅包含 ["message"] 时，表示这是第一条文本输出，此时需要从 `content.content.final_answer.answer.text` 取首词输出
2. 除了首词输出外，后续只从 key 包含 ["message", "final_answer"] 的 EventStreamMessage 中取 content 作为输出
3. 如果 EventStreamMessage 的 action 是 "end"，则代表最后一条输出

# ChatKitDataAgent Demo
ChatKitDataAgent Demo 是一个简单的 Web 应用，该应用需要挂载 ChatKitDataAgent 组件。ChatKitDataAgent Demo 应用上有一个添加上下文的按钮，点击该按钮会将以下对象注入到 ChatKitDataAgent 的用户输入上下文中：
```json
{
    "title": "故障节点",
    "data": {
        "node_id": "node-uuid-1"
    }
}
```

**开发**
注意：
- ChatKitDataAgent Demo 代码放在 examples/chatkit_data_agent 目录下
- Agent ID：01KAZKS30H0X0D8Z8K25VKSJ98
- Bearer Token：Bearer ory_at_LU6V6kGsQzXr1KGPxpTUW7NCHLz6htpGdu1j-LxdFRs.dvr0I51xaN5XHZOwyTTZTv3eTuMh-Qmh5Hkt3f-z5go
