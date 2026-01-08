import { ChatKitBase, ChatKitBaseProps, ChatKitBaseState } from '../ChatKitBase';
import MessageList from './MessageList';
import InputArea from './InputArea';
import Prologue from './Prologue';
import ConversationHistory from './ConversationHistory';

/**
 * AssistantBase 组件的属性接口
 * 扩展 ChatKitBaseProps，添加历史对话相关配置
 */
export interface AssistantBaseProps extends ChatKitBaseProps {
  /** 是否启用历史对话功能，默认为 true */
  enableHistory?: boolean;
}

/**
 * AssistantBase 组件的状态接口
 * 扩展 ChatKitBaseState，添加历史对话显示状态
 */
export interface AssistantBaseState extends ChatKitBaseState {
  showHistory: boolean;
}

/**
 * AssistantBase 基础组件
 * 作为主交互入口，是应用的主体
 *
 * 该类继承自 ChatKitBase，实现了 Assistant 模式的交互界面和交互逻辑
 * 区别于 CopilotBase，AssistantBase 是全屏主对话界面，包含 Header 和历史对话功能
 */
export abstract class AssistantBase<P extends AssistantBaseProps = AssistantBaseProps> extends ChatKitBase<P> {
  /**
   * 组件状态，包含历史对话显示状态
   */
  declare state: AssistantBaseState;

  constructor(props: P) {
    super(props);
    // 初始化历史对话显示状态
    this.state = {
      ...this.state,
      showHistory: false,
    };
  }

  /**
   * 处理查看历史对话
   */
  handleHistory = () => {
    this.setState((prevState) => ({ ...prevState, showHistory: true } as AssistantBaseState));
  };

  /**
   * 处理关闭历史对话列表
   */
  handleCloseHistory = () => {
    this.setState((prevState) => ({ ...prevState, showHistory: false } as AssistantBaseState));
  };

  /**
   * 处理新建对话
   */
  handleNewChat = () => {
    this.createConversation();
  };

  /**
   * 处理加载指定会话
   */
  handleLoadConversation = async (conversationId: string) => {
    try {
      await this.loadConversation(conversationId);
      this.setState((prevState) => ({ ...prevState, showHistory: false } as AssistantBaseState)); // 加载成功后关闭历史对话列表
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
   * 实现 React.Component.render() 方法
   * 渲染 Assistant 模式的界面
   */
  render() {
    if (!this.props.visible) {
      return null;
    }

    const { messages, textInput, applicationContext, isSending, onboardingInfo, isLoadingOnboarding, streamingMessageId, showHistory } = this.state;
    const showPrologue = messages.length === 0;
    const isStreaming = streamingMessageId !== null;
    const enableHistory = this.props.enableHistory !== false; // 默认为 true

    return (
      <>
        <div className="flex h-full w-full bg-white">
          {/* 主区域 - 对话界面 */}
          <div className="flex-1 flex flex-col">
            {/* 消息列表区域或欢迎界面 */}
            <div className="flex-1 overflow-y-auto">
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
                    agentInfo={(this as any).agentInfo}
                    prologue={onboardingInfo?.prologue}
                    predefinedQuestions={onboardingInfo?.predefinedQuestions}
                  />
                )
              ) : (
                <MessageList messages={messages} />
              )}
            </div>

            {/* 输入区域 */}
            <div className="bg-white">
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
          </div>

          {/* 右侧边栏 - 历史对话和新对话按钮 */}
          {enableHistory && (
            <div className="w-[320px] bg-white flex flex-col">
              <div className="px-6 pt-6 flex flex-col gap-2">
                {/* 相关历史对话按钮 */}
                <button
                  onClick={this.handleHistory}
                  className="flex items-center gap-2 text-[14px] text-[rgba(0,0,0,0.85)] hover:text-[#1890ff] transition-colors"
                  style={{ fontFamily: 'Noto Sans SC' }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                    <path
                      d="M8 5V8L10 10"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="leading-[30px]">相关历史对话</span>
                </button>

                {/* 新对话按钮 */}
                <button
                  onClick={this.handleNewChat}
                  className="flex items-center gap-2 text-[14px] text-[rgba(0,0,0,0.85)] hover:text-[#1890ff] transition-colors"
                  style={{ fontFamily: 'Noto Sans SC' }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M14 9H9V14H7V9H2V7H7V2H9V7H14V9Z"
                      fill="currentColor"
                    />
                  </svg>
                  <span className="leading-[30px]">新对话</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 历史会话列表弹窗 */}
        {enableHistory && (
          <ConversationHistory
            visible={showHistory}
            onClose={this.handleCloseHistory}
            onGetConversations={this.handleGetConversations}
            onLoadConversation={this.handleLoadConversation}
            onDeleteConversation={this.handleDeleteConversation}
            agentName={(this as any).dipName}
          />
        )}
      </>
    );
  }
}

export default AssistantBase;
