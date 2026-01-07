/**
 * ChatKit - AI 对话组件
 *
 * @module chatkit
 */

// 导入样式文件
import './styles/index.css';

// ============ 基础组件 (平台无关) ============
export { ChatKitBase } from './components/base/ChatKitBase';
export type { ChatKitBaseProps, ChatKitBaseState } from './components/base/ChatKitBase';

export { CopilotBase } from './components/base/copilot/CopilotBase';
export { AssistantBase } from './components/base/assistant/AssistantBase';
export type { AssistantBaseProps, AssistantBaseState } from './components/base/assistant/AssistantBase';

// ============ DIP (AISHU DIP 平台) ============
export { DIPBaseMixin } from './components/dip/DIPBase';
export type { DIPBaseProps } from './components/dip/DIPBase';

export { Copilot } from './components/dip/Copilot';
export type { CopilotProps } from './components/dip/Copilot';

export { Assistant } from './components/dip/Assistant';
export type { AssistantProps } from './components/dip/Assistant';

// ============ Coze (扣子平台) ============
export { default as ChatKitCoze } from './components/coze/Copilot';
export type { ChatKitCozeProps } from './components/coze/Copilot';

export { RoleType, ChatMessageType } from './types';
export type {
  Role,
  ChatMessage,
  ApplicationContext,
  ChatKitInterface,
  EventStreamMessage,
  ConversationHistory,
} from './types';
