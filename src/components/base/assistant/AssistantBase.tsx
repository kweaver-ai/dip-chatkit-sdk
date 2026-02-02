import { ChatKitBase, ChatKitBaseProps, ChatKitBaseState } from '../ChatKitBase';
import { DrawerPortalProvider } from '../DrawerPortalContext';
import { ToolBlockProvider } from '../ToolBlockContext';
import MessageList from './MessageList';
import InputArea from './InputArea';
import Prologue from './Prologue';
import ConversationHistory from './ConversationHistory';
import LeftHeaderTool from './LeftHeaderTool';
import { MoreIcon, NewIcon } from '@/components/icons';
import { ChatMessage, BlockType } from '../../../types';

/**
 * AssistantBase 组件的属性接口
 * 扩展 ChatKitBaseProps，添加历史对话相关配置
 */
export interface AssistantBaseProps extends ChatKitBaseProps {
  /** 是否启用历史对话功能，默认为 true */
  enableHistory?: boolean;
  /**
   * ToolDrawer Portal 挂载的 DOM 节点（可选）。
   * 不传时抽屉挂到主内容区域 div（flex h-full w-full bg-white）下，便于在乾坤等微前端中正确挂载
   */
  drawerContainer?: HTMLElement | null;
}

/**
 * AssistantBase 组件的状态接口
 * 扩展 ChatKitBaseState，添加历史对话显示状态
 */
export interface AssistantBaseState extends ChatKitBaseState {
  showHistory: boolean;
  /** 主内容区域 DOM 引用，用于未传 drawerContainer 时作为抽屉挂载点 */
  drawerContainerEl: HTMLElement | null;
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
      drawerContainerEl: null,
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
    const { drawerContainer } = this.props;
    // 未显式传入 drawerContainer 时，默认挂到主内容 div 下（适配乾坤等微前端）
    const effectiveDrawerContainer = drawerContainer ?? this.state.drawerContainerEl ?? null;

    return (
      <DrawerPortalProvider value={effectiveDrawerContainer}>
        <ToolBlockProvider>
        <>
          <div
            ref={(el) => {
              if (el && this.state.drawerContainerEl !== el) {
                // 子类扩展的 state 需断言，父类 setState 类型为 ChatKitBaseState
                this.setState({ drawerContainerEl: el } as unknown as AssistantBaseState);
              }
            }}
            className="flex h-full w-full bg-white"
          >
            {/* 左侧栏 - Agent 信息和知识来源 */}
            <div className="flex-initial flex px-4 py-3 ">
            <LeftHeaderTool
              agentInfo={(this as any).agentInfo || {}}
              apiMethods={
                (this as any)._leftHeaderApiMethods ??
                ((this as any).getKnowledgeNetworksDetail &&
                (this as any).getKnowledgeNetworkObjectTypes &&
                (this as any).getMetricInfoByIds
                  ? {
                      getKnowledgeNetworksDetail: (this as any).getKnowledgeNetworksDetail.bind(this),
                      getKnowledgeNetworkObjectTypes: (this as any).getKnowledgeNetworkObjectTypes.bind(this),
                      getMetricInfoByIds: (this as any).getMetricInfoByIds.bind(this),
                    }
                  : undefined)
              }
              showAside={!showPrologue}
            />
            </div>

            {/* 中间主区域 - 对话界面 */}
            <div className="flex-1 flex flex-col">
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
                      agentInfo={(this as any).agentInfo}
                      prologue={onboardingInfo?.prologue}
                      predefinedQuestions={onboardingInfo?.predefinedQuestions}
                    />
                  )
                ) : (
                  <MessageList 
                    messages={messages} 
                    streamingMessageId={streamingMessageId} 
                    agentAvatar={(this as any).agentInfo?.avatar}
                    onRegenerate={this.handleRegenerate}
                  />
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
              <div className="w-[300px] bg-white flex flex-col flex-shrink-0">
                <div className="px-6 pt-6 flex flex-col gap-2">
                  {/* 相关历史对话按钮 */}
                  <button
                    onClick={this.handleHistory}
                    className="flex items-center gap-2 text-[14px] text-[rgba(0,0,0,0.85)] hover:text-[#126EE3] transition-colors"
                    style={{ fontFamily: 'Noto Sans SC' }}
                  >
                    <MoreIcon className="w-[14px] h-[14px]" />
                    <span className="leading-[30px]">相关历史对话</span>
                  </button>

                  {/* 新对话按钮 */}
                  <button
                    onClick={this.handleNewChat}
                    className="flex items-center gap-2 text-[14px] text-[rgba(0,0,0,0.85)] hover:text-[#126EE3] transition-colors"
                    style={{ fontFamily: 'Noto Sans SC' }}
                  >
                    <NewIcon className="w-[14px] h-[14px]" />
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
            agentInfo={(this as any).agentInfo}
          />
        )}
        </>
        </ToolBlockProvider>
      </DrawerPortalProvider>
    );
  }
}

export default AssistantBase;
