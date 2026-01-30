import { ChatKitBase, ChatKitBaseProps, ChatKitBaseState } from '../ChatKitBase';
import MessageList from './MessageList';
import InputArea from './InputArea';
import Header from './Header';
import Prologue from './Prologue';
import { ChatMessage, BlockType } from '../../../types';

/**
 * CopilotBase 组件的状态接口
 * 扩展 ChatKitBaseState（当前不需要额外状态，保留接口以便未来扩展）
 */
export interface CopilotBaseState extends ChatKitBaseState {
}

/**
 * CopilotBase 基础组件
 * 右侧跟随的 AI 助手，为应用提供辅助对话
 *
 * 该类继承自 ChatKitBase，实现了 Copilot 模式的交互界面和交互逻辑
 * 区别于 AssistantBase，CopilotBase 在 render() 函数中渲染 Copilot 模式的界面
 */
export abstract class CopilotBase<P extends ChatKitBaseProps = ChatKitBaseProps> extends ChatKitBase<P> {
  /**
   * 组件状态，包含历史对话显示状态
   */
  declare state: CopilotBaseState;

  /**
   * 处理加载指定会话
   */
  handleLoadConversation = async (conversationId: string) => {
    try {
      await this.loadConversation(conversationId);
    } catch (error) {
      console.error('加载会话失败:', error);
      // 可以在这里添加错误提示
    }
  };

  /**
   * 处理删除指定会话
   */
  handleDeleteConversation = async (conversationId: string) => {
    await this.deleteConversation(conversationId);
  };

  /**
   * 处理获取历史会话列表
   */
  handleGetConversations = async (page?: number, size?: number) => {
    return await this.getConversations(page, size);
  };

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

  /**
   * 处理重新生成
   * @param messageId 需要重新生成的助手消息 ID
   * @param previousUserMessage 上一条用户消息
   */
  handleRegenerate = async (messageId: string, previousUserMessage: ChatMessage): Promise<void> => {
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
  /**
   * 实现 React.Component.render() 方法
   * 渲染 Copilot 模式的界面
   */
  render() {
    if (!this.props.visible) {
      return null;
    }

    const { title = 'Copilot', onClose } = this.props;
    const { messages, textInput, applicationContext, isSending, onboardingInfo, isLoadingOnboarding, streamingMessageId } = this.state;
    const showPrologue = messages.length === 0;
    const isStreaming = streamingMessageId !== null;

    return (
      <>
        <div className="flex flex-col h-full w-full bg-white shadow-2xl">
          {/* 头部 */}
          <Header
            title={title}
            onClose={onClose}
            onNewChat={this.createConversation}
            onGetConversations={this.handleGetConversations}
            onLoadConversation={this.handleLoadConversation}
            onDeleteConversation={this.handleDeleteConversation}
          />

          {/* 消息列表区域或欢迎界面；min-h-0 保证 flex 子项可收缩，避免虚拟列表/滚动条溢出 */}
          <div className={`flex-1 min-h-0 ${showPrologue ? 'overflow-y-auto' : 'overflow-hidden'}`}>
            {showPrologue ? (
              isLoadingOnboarding ? (
                // 加载中，显示加载提示
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
                    <p className="text-sm text-gray-500">正在加载...</p>
                  </div>
                </div>
              ) : (
                // 加载完成，显示开场白
                <Prologue
                  onQuestionClick={this.handleQuestionClick}
                  prologue={onboardingInfo?.prologue}
                  predefinedQuestions={onboardingInfo?.predefinedQuestions}
                />
              )
            ) : (
              <MessageList 
                messages={messages} 
                streamingMessageId={streamingMessageId}
                onRegenerate={this.handleRegenerate}
              />
            )}
          </div>

          {/* 输入区域 */}
          <InputArea
            value={textInput}
            onChange={this.setTextInput}
            onSend={this.handleSend}
            context={applicationContext}
            onRemoveContext={this.removeApplicationContext}
            disabled={isSending}
            isStreaming={isStreaming}
            onStop={this.handleStop}
          />
        </div>

        {/* 历史会话列表组件（包含按钮和下拉菜单） */}

      </>
    );
  }
}

export default CopilotBase;
