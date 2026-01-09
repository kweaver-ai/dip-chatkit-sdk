/**
 * 角色类型枚举
 * 发送该消息的角色
 */
export enum RoleType {
  /** 用户 */
  USER = 'User',
  /** AI 助手 */
  ASSISTANT = 'Assistant'
}

/**
 * 消息类型枚举
 * 消息的类型
 */
export enum ChatMessageType {
  /** Markdown 文本类型 */
  TEXT = 'Text',
  /** JSON 类型 */
  JSON = 'JSON',
  /** Widget 组件 */
  WIDGET = 'Widget'
}

/**
 * 消息块类型枚举
 * 消息块的类型，不同类型的消息块使用不同的组件进行渲染
 */
export enum BlockType {
  /** 文本类型 */
  TEXT = 'Text',
  /** Markdown 类型 */
  MARKDOWN = 'Markdown',
  /** Web 搜索类型 */
  WEB_SEARCH = 'WebSearch',
  /** 工具调用类型 */
  TOOL = 'Tool',
  /** JSON2Plot 图表类型 */
  JSON2PLOT = 'Json2Plot',
  /** Text2SQL 类型 */
  Text2Sql = 'Text2Sql'
}

/**
 * 角色接口
 * 定义消息发送者的角色信息
 */
export interface Role {
  /** 角色的名称：
   * - 如果 type 是 Assistant，则名称为 "AI 助手"
   * - 如果 type 是 User，则名称为用户的昵称/显示名
   */
  name: string;

  /** 发送该消息的角色 */
  type: RoleType;

  /** 角色的头像，可以是 URL、Base64 或 SVG */
  avatar: string;
}

/**
 * 消息块基类
 * 一条消息可以由许多不同类型的消息块组成
 */
export interface ContentBlock<T extends BlockType, K> {
  /** 消息块的类型，不同类型的消息块使用不同的组件进行渲染 */
  type: T;
  /** 消息块的内容 */
  content: K;
}

/**
 * 文本类型的消息块
 */
export interface TextBlock extends ContentBlock<BlockType.TEXT, string> {}

/**
 * Markdown 类型的消息块
 */
export interface MarkdownBlock extends ContentBlock<BlockType.MARKDOWN, string> {}

/**
 * Web 搜索类型的消息块
 */
export interface WebSearchBlock extends ContentBlock<BlockType.WEB_SEARCH, WebSearchQuery> {}

/**
 * 工具调用类型的消息块
 */
export interface ToolBlock extends ContentBlock<BlockType.TOOL, ToolCallData> {}

/**
 * JSON2Plot 图表类型的消息块
 */
export interface Json2PlotBlock extends ContentBlock<BlockType.JSON2PLOT, ChartDataSchema> {}

/**
 * 消息接口
 * 展示在消息区消息列表中的一条消息
 */
export interface ChatMessage {
  /** 一条消息的 ID */
  messageId: string;

  /** 发送该消息的角色 */
  role: Role;

  /** 该条消息的类型（已废弃，保留用于向后兼容） */
  type?: ChatMessageType;

  /** 该条消息的内容。一条消息可以由许多不同类型的消息块组成 */
  content: Array<TextBlock | MarkdownBlock | WebSearchBlock | ToolBlock | Json2PlotBlock>;
 

  /** 与该消息关联的应用上下文（可选），仅用户消息可能包含此字段 */
  applicationContext?: ApplicationContext;
}

/**
 * 应用上下文接口
 * 与用户输入的文本相关的应用上下文
 */
export interface ApplicationContext {
  /** 显示在输入框上方的应用上下文标题 */
  title: string;

  /** 该应用上下文实际包含的数据 */
  data: any;
}

/**
 * EventStream 消息接口
 * 表示从 SSE 接收到的一条流式消息
 */
export interface EventStreamMessage {
  /** 事件类型 */
  event: string;
  /** 消息数据,通常是 JSON 字符串 */
  data: string;
}

/**
 * 开场白信息接口
 * 包含开场白文案和预置问题
 */
export interface OnboardingInfo {
  /** 开场白文案 */
  prologue: string;
  /** 预置问题列表 */
  predefinedQuestions: Array<string>;
}

/**
 * Web 搜索结果接口
 * 单条 Web 搜索的结果
 */
export interface WebSearchResult {
  /** 搜索结果的内容摘要 */
  content: string;
  /** 搜索结果的来源网站图标 URL */
  icon: string;
  /** 搜索结果的来源地址 */
  link: string;
  /** 搜索结果的来源网站名称 */
  media: string;
  /** 搜索结果的来源文章标题 */
  title: string;
}

/**
 * Web 搜索查询接口
 * 调用 Web 搜索的详情
 */
export interface WebSearchQuery {
  /** 搜索查询 */
  input: string;
  /** Web 搜索结果集合 */
  results: WebSearchResult[];
}

/**
 * 代码执行结果接口
 * 代码执行的输入和输出信息
 */
export interface ExecuteCodeResult {
  /** 执行的代码，以 Markdown 的代码格式显示 */
  input: string;
  /** 代码执行后转为自然语言的输出结果，以 Markdown 格式显示 */
  output: string;
}

/**
 * Text2SQL 结果接口
 * Text2SQL 工具的输入和输出信息
 * 根据 OpenAPI 规范，answer 包含 result 和 full_result
 * - result: Text2SqlResultData（包含 data_desc，但可能只有数据样本）
 * - full_result: Text2SqlFullResultData（包含完整数据，但没有 data_desc）
 */
export interface Text2SqlResult {
  /** 输入的查询文本 */
  title: string;
  // 查询结果数据
  data: Array<Record<string, any>>;

  // 生成的 SQL 语句
  sql: string;
}

/**
 * Text2Metric 结果接口
 * Text2Metric 工具的输入和输出信息
 * 根据 OpenAPI 规范，answer 包含 result 和 full_result
 * - result: Text2MetricResultData（包含 data_desc，但可能只有数据样本）
 * - full_result: Text2MetricFullResultData（包含完整数据，但没有 data_desc）
 */
export interface Text2MetricResult {
  /** 结果标题 */
  title: string;
  /** 查询结果数据 */
  data: Array<Record<string, any>>;
  /** 查询参数（args） */
  args: any;
}

/**
 * 工具调用数据接口
 * 工具调用的输入和输出信息
 */
export interface ToolCallData {
  /** 工具名称 */
  name: string;
  /** 工具图标 URL 或 React 元素 */
  icon?: string | React.ReactNode;
  /** 工具标题 */
  title: string;
  /** 工具调用的输入参数 */
  input?: any;
  /** 工具调用的输出结果 */
  output?: any;
}

/**
 * 历史会话记录接口
 * 一条历史会话记录
 */
export interface ConversationHistory {
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

/**
 * ChatKit 接口
 * 定义了 ChatKit 的一些抽象方法
 */
export interface ChatKitInterface {
  /**
   * 获取开场白和预置问题
   * 该方法需要由子类继承并重写，以适配扣子、Dify 等 LLMOps 平台的接口
   * 返回开场白信息结构体
   * 注意：该方法是一个无状态无副作用的函数，不允许修改 state
   * @returns 返回开场白信息，包含开场白文案和预置问题
   */
  getOnboardingInfo(): Promise<OnboardingInfo>;

  /**
   * 新建会话
   * 该方法需要由子类继承并重写，以适配扣子、Dify 等 LLMOps 平台的接口
   * 成功返回会话 ID
   * 注意：该方法是一个无状态无副作用的函数，不允许修改 state
   * @param title 会话标题，通常是用户发送的第一条消息内容
   * @returns 返回新创建的会话 ID
   */
  generateConversation(title?: string): Promise<string>;

  /**
   * 向后端发送消息
   * 该方法需要由开发者实现，以适配扣子、Dify等 LLMOps 平台的接口
   * 发送成功后，返回发送的消息结构
   * 注意：该方法是一个无状态无副作用的函数，不允许修改 state
   * @param text 发送给后端的用户输入的文本
   * @param ctx 随用户输入文本一起发送的应用上下文
   * @param conversationID 发送的对话消息所属的会话 ID
   * @returns 返回发送的消息结构
   */
  sendMessage(
    text: string,
    ctx: ApplicationContext,
    conversationID?: string
  ): Promise<ChatMessage>;

  /**
   * 将 API 接口返回的 EventStream 增量解析成完整的 AssistantMessage 对象
   * 当接收到 SSE 消息时触发，该方法需要由子类实现
   * 子类在该方法中应该调用 appendMarkdownBlock() 或 appendWebSearchBlock() 来更新消息内容
   * 注意：该方法应该只处理数据解析逻辑，通过调用 append*Block 方法来更新界面
   * @param eventMessage 接收到的一条 Event Message
   * @param prev 上一次增量更新后的 AssistantMessage 对象
   * @param messageId 当前正在更新的消息 ID，用于调用 append*Block 方法
   * @returns 返回更新后的 AssistantMessage 对象
   */
  reduceAssistantMessage<T = any, K = any>(
    eventMessage: T,
    prev: K,
    messageId: string
  ): K;

  /**
   * 检查是否需要刷新 token
   * 当发生异常时检查是否需要刷新 token。返回 true 表示需要刷新 token，返回 false 表示无需刷新 token。
   * 该方法需要由子类继承并重写，以适配扣子、Dify 等 LLMOps 平台的接口。
   * 注意：该方法是一个无状态无副作用的函数，不允许修改 state。
   * @param status HTTP 状态码
   * @param error 错误响应体
   * @returns 返回是否需要刷新 token
   */
  shouldRefreshToken(status: number, error: any): boolean;

  /**
   * 终止会话
   * 该方法需要由子类继承并重写，以适配扣子、Dify 等 LLMOps 平台的接口。
   * 注意：该方法是一个无状态无副作用的函数，不允许修改 state。
   * @param conversationId 要终止的会话 ID
   * @returns 返回 Promise，成功时 resolve，失败时 reject
   */
  terminateConversation(conversationId: string): Promise<void>;

  /**
   * 获取历史会话列表
   * 该方法需要由子类继承并重写，以适配扣子、Dify 等 LLMOps 平台的接口。
   * 注意：该方法是一个无状态无副作用的函数，不允许修改 state。
   * @param page 分页页码，默认为 1
   * @param size 每页返回条数，默认为 10
   * @returns 返回历史会话列表
   */
  getConversations(page?: number, size?: number): Promise<ConversationHistory[]>;

  /**
   * 获取指定会话 ID 的对话消息列表
   * 该方法需要由子类继承并重写，以适配扣子、Dify 等 LLMOps 平台的接口。
   * 如果对话消息是 AI 助手消息，则需要调用 reduceAssistantMessage() 解析消息。
   * 注意：该方法是一个无状态无副作用的函数，不允许修改 state。
   * @param conversationId 会话 ID
   * @returns 返回对话消息列表
   */
  getConversationMessages(conversationId: string): Promise<ChatMessage[]>;

  /**
   * 删除指定 ID 的会话
   * 该方法需要由子类继承并重写，以适配扣子、Dify 等 LLMOps 平台的接口。
   * 注意：该方法是一个无状态无副作用的函数，不允许修改 state。
   * @param conversationID 会话 ID
   * @returns 返回 Promise，成功时 resolve，失败时 reject
   */
  deleteConversation(conversationID: string): Promise<void>;
}

/**
 * 图表类型枚举
 * 支持的图表类型
 */
export type ChartType = 'Line' | 'Column' | 'Pie' | 'Circle';

/**
 * 数据行
 */
export type DataRow = Record<string, any>;

/**
 * 维度接口
 */
export interface Dimension {
  /** 字段名 */
  name: string;
  /** 显示名称 */
  displayName: string;
  /** 数据类型 */
  dataType: 'string' | 'number' | 'date' | 'boolean';
}

/**
 * 度量接口
 */
export interface Measure {
  /** 字段名 */
  name: string;
  /** 显示名称 */
  displayName: string;
  /** 数据类型 */
  dataType: 'number' | 'string';
  /** 聚合方式 */
  aggregation?: 'sum' | 'avg' | 'count' | 'max' | 'min';
}

/**
 * 图表数据 Schema
 */
export interface ChartDataSchema {
  /** 图表类型 */
  chartType: ChartType;
  /** 图表名称/标题（可选） */
  title?: string;
  /** 维度列表 */
  dimensions: Dimension[];
  /** 度量列表 */
  measures: Measure[];
  /** 数据行列表 */
  rows: DataRow[];
}

/**
 * 日期范围枚举
 */
export enum DateRange {
  // 分钟
  Minute = 'minute',

  // 小时
  Hour = 'hour',

  // 今天
  ToDay = 'toDay',

  // 昨天
  Yesterday = 'yesterday',

  // 6天
  SixDay = 'sixDay',

  // 月
  Month = 'month',

  // 年
  Year = 'year',
}