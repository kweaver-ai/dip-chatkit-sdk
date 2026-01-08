import React, { useRef, useState } from 'react';
import { Assistant, type AssistantProps, type ConversationHistory } from '@dip/chatkit';
import { DATA_AGENT_CONFIG } from './config';
import ConversationHistoryComponent from './ConversationHistory';

/**
 * DIP Assistant Demo
 * 演示 AISHU DIP 平台的 Assistant 主对话入口
 * 布局：主区域（Assistant 组件）+ 右侧边栏（历史对话和新对话按钮）
 */
export const DIPAssistantDemo: React.FC = () => {
  const chatKitRef = useRef<Assistant>(null);
  const [showHistory, setShowHistory] = useState(false);

  /**
   * 模拟刷新 token 的方法
   * 实际项目中应该调用真实的 token 刷新接口
   */
  const refreshToken = async (): Promise<string> => {
    console.log('正在刷新 token...');
    // TODO: 在实际项目中，这里应该调用真实的 token 刷新接口
    // 这里仅作演示，返回原 token
    return DATA_AGENT_CONFIG.token;
  };

  /**
   * 处理查看历史对话
   */
  const handleHistory = () => {
    console.log('查看历史对话');
    setShowHistory(true);
  };

  /**
   * 处理关闭历史对话列表
   */
  const handleCloseHistory = () => {
    setShowHistory(false);
  };

  /**
   * 获取历史会话列表
   */
  const handleGetConversations = async (page?: number, size?: number): Promise<ConversationHistory[]> => {
    if (!chatKitRef.current) {
      console.error('ChatKit 实例未初始化');
      return [];
    }
    return await chatKitRef.current.getConversations(page, size);
  };

  /**
   * 加载指定会话
   */
  const handleLoadConversation = async (conversationId: string) => {
    if (!chatKitRef.current) {
      console.error('ChatKit 实例未初始化');
      return;
    }

    try {
      await chatKitRef.current.loadConversation(conversationId);
      setShowHistory(false); // 加载成功后关闭历史对话列表
      console.log('成功加载会话:', conversationId);
    } catch (error) {
      console.error('加载会话失败:', error);
      alert('加载会话失败，请重试');
    }
  };

  /**
   * 删除指定会话
   */
  const handleDeleteConversation = async (conversationId: string) => {
    if (!chatKitRef.current) {
      console.error('ChatKit 实例未初始化');
      throw new Error('ChatKit 实例未初始化');
    }

    await chatKitRef.current.deleteConversation(conversationId);
    console.log('成功删除会话:', conversationId);
  };

  /**
   * 处理新建对话
   */
  const handleNewChat = () => {
    console.log('新建对话');
    chatKitRef.current?.createConversation();
  };

  return (
    <>
      <div className="flex h-full bg-white">
        {/* 主区域 - Assistant 组件 */}
        <div className="flex-1">
          {React.createElement(Assistant as any, {
            ref: chatKitRef,
            title: 'DIP Assistant',
            visible: true,
            baseUrl: DATA_AGENT_CONFIG.baseUrl,
            agentKey: DATA_AGENT_CONFIG.agentKey,
            token: DATA_AGENT_CONFIG.token,
            refreshToken: refreshToken,
            businessDomain: DATA_AGENT_CONFIG.businessDomain,
          } as AssistantProps)}
        </div>

        {/* 右侧边栏 - 历史对话和新对话按钮 */}
        <div className="w-[466px] bg-white border-l border-gray-100 flex flex-col">
          <div className="px-6 pt-6 flex flex-col gap-4">
            {/* 相关历史对话按钮 */}
            <button
              onClick={handleHistory}
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
              onClick={handleNewChat}
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
      </div>

      {/* 历史会话列表弹窗 */}
      <ConversationHistoryComponent
        visible={showHistory}
        onClose={handleCloseHistory}
        onGetConversations={handleGetConversations}
        onLoadConversation={handleLoadConversation}
        onDeleteConversation={handleDeleteConversation}
      />
    </>
  );
};
