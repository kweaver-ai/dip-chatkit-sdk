import { DrawerPortalProvider, useDrawerPortalContainer } from '../base/DrawerPortalContext';
import { ToolBlockProvider, useToolBlockContext } from '../base/ToolBlockContext';
import MessageList from '../base/assistant/MessageList';
import Prologue from '../base/assistant/Prologue';
import ConversationHistory from '../base/assistant/ConversationHistory';
import LeftHeaderTool from '../base/assistant/LeftHeaderTool';
import ToolDrawer from '../base/assistant/blocks/ToolDrawer';
import StudioAssistantInputArea from './AssistantInputArea';
import { MoreIcon, NewIcon } from '@/components/icons';
import { AssistantBase, AssistantBaseProps, AssistantBaseState } from '../base/assistant/AssistantBase';

function ToolDrawerHost() {
  const { drawerPayload, closeToolDrawer } = useToolBlockContext();
  const container = useDrawerPortalContainer();
  return (
    <ToolDrawer
      isOpen={!!drawerPayload}
      onClose={closeToolDrawer}
      toolName={drawerPayload?.toolName ?? ''}
      toolTitle={drawerPayload?.toolTitle ?? ''}
      toolIcon={drawerPayload?.toolIcon}
      input={drawerPayload?.input}
      output={drawerPayload?.output}
      container={container ?? undefined}
    />
  );
}

export abstract class StudioAssistantBase<
  P extends AssistantBaseProps = AssistantBaseProps,
> extends AssistantBase<P> {
  declare state: AssistantBaseState;

  render() {
    if (!this.props.visible) {
      return null;
    }

    const {
      messages,
      textInput,
      applicationContext,
      isSending,
      onboardingInfo,
      isLoadingOnboarding,
      streamingMessageId,
      showHistory,
      pendingAttachments,
    } = this.state;
    const showPrologue = messages.length === 0;
    const isStreaming = streamingMessageId !== null;
    const enableHistory = this.props.enableHistory !== false;
    const { drawerContainer } = this.props;
    const effectiveDrawerContainer =
      drawerContainer ?? this.state.drawerContainerEl ?? null;

    return (
      <DrawerPortalProvider value={effectiveDrawerContainer}>
        <ToolBlockProvider>
          <>
            <div
              ref={(el) => {
                if (el && this.state.drawerContainerEl !== el) {
                  this.setState({
                    drawerContainerEl: el,
                  } as unknown as AssistantBaseState);
                }
              }}
              className="flex h-full w-full bg-white"
            >
              <div className="relative z-10 flex-initial flex px-4 py-3">
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

              <div className="flex-1 flex flex-col">
                <div className={`flex-1 min-h-0 ${showPrologue ? 'overflow-y-auto' : 'overflow-hidden'}`}>
                  {showPrologue ? (
                    isLoadingOnboarding ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
                          <p className="text-sm text-gray-500">正在加载...</p>
                        </div>
                      </div>
                    ) : (
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
                      onSelectQuestion={this.handleSelectQuestion}
                    />
                  )}
                </div>

                <div className="bg-white">
                  <StudioAssistantInputArea
                    value={textInput}
                    onChange={this.setTextInput}
                    onSend={this.handleSend}
                    context={applicationContext}
                    onRemoveContext={this.removeApplicationContext}
                    disabled={isSending}
                    isStreaming={isStreaming}
                    onStop={this.handleStop}
                    attachments={pendingAttachments}
                    onUploadFiles={this.handleUploadFiles}
                    onRemoveAttachment={this.removePendingAttachment}
                    canUpload={typeof (this as any).uploadAttachment === 'function'}
                  />
                </div>
              </div>

              {enableHistory && (
                <div className="w-[300px] bg-white flex flex-col flex-shrink-0">
                  <div className="px-6 pt-6 flex flex-col gap-2">
                    <button
                      onClick={this.handleHistory}
                      className="flex items-center gap-2 text-[14px] text-[rgba(0,0,0,0.85)] hover:text-[#126EE3] transition-colors"
                      style={{ fontFamily: 'Noto Sans SC' }}
                    >
                      <MoreIcon className="w-[14px] h-[14px]" />
                      <span className="leading-[30px]">相关历史对话</span>
                    </button>

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

            <ToolDrawerHost />

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

export default StudioAssistantBase;
