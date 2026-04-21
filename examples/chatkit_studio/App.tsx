import React, { useRef, useState } from 'react';
import { StudioCopilot, type ApplicationContext } from '@kweaver-ai/chatkit';
import { STUDIO_CONFIG } from './config';

export const StudioCopilotDemo: React.FC = () => {
  const [showChat, setShowChat] = useState(false);
  const chatKitRef = useRef<StudioCopilot>(null);
  const chatOffsetClass = showChat ? 'md:pr-[500px]' : '';

  const refreshToken = async (): Promise<string> => STUDIO_CONFIG.token;

  const injectExampleContext = () => {
    const context: ApplicationContext = {
      title: 'Studio 当前画布',
      data: {
        scene: 'agent-debug',
        source: 'chatkit-demo',
      },
    };

    chatKitRef.current?.injectApplicationContext(context);
    if (!showChat) {
      setShowChat(true);
    }
  };

  const sendExampleMessage = async () => {
    if (!showChat) {
      setShowChat(true);
    }

    setTimeout(async () => {
      const context: ApplicationContext = {
        title: 'Studio 当前画布',
        data: {
          scene: 'agent-debug',
          tab: 'session',
        },
      };

      try {
        await chatKitRef.current?.send(
          '请帮我总结当前 Studio Agent 对话链路应该接哪些前端能力。',
          context
        );
      } catch (error) {
        console.error('发送 Studio 消息失败', error);
      }
    }, 100);
  };

  return (
    <div
      className={`relative flex-1 flex flex-col items-center justify-center p-8 bg-gray-50 min-h-screen ${chatOffsetClass}`}
    >
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          Studio Copilot Demo
        </h1>
        <p className="text-gray-600 mb-6">
          演示 Studio ChatKit 的 Copilot 形态，包含历史会话、新建会话、流式对话，以及输入区内置附件上传能力。
        </p>

        <div className="space-y-4">
          <button
            onClick={injectExampleContext}
            className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            注入示例上下文
          </button>

          <button
            onClick={sendExampleMessage}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            发送示例消息
          </button>

          <button
            onClick={() => setShowChat(!showChat)}
            className="w-full bg-gray-500 text-white py-3 px-6 rounded-lg hover:bg-gray-600 transition-colors font-medium"
          >
            {showChat ? '关闭聊天窗口' : '打开聊天窗口'}
          </button>
        </div>

        <div className="mt-6 rounded-lg bg-green-50 p-4">
          <h2 className="text-lg font-semibold text-green-800 mb-2">
            Studio 接入配置
          </h2>
          <ul className="text-sm text-green-700 space-y-1">
            <li>baseUrl: {STUDIO_CONFIG.baseUrl}</li>
            <li>agentId: {STUDIO_CONFIG.agentId}</li>
            <li>userId: {STUDIO_CONFIG.userId}</li>
          </ul>
        </div>
      </div>

      {showChat && (
        <div className="fixed right-4 top-4 bottom-4 w-[480px] max-w-[92vw] z-10">
          <StudioCopilot
            ref={chatKitRef}
            title="Studio Copilot"
            visible={showChat}
            onClose={() => setShowChat(false)}
            baseUrl={STUDIO_CONFIG.baseUrl}
            agentId={STUDIO_CONFIG.agentId}
            userId={STUDIO_CONFIG.userId}
            token={STUDIO_CONFIG.token}
            refreshToken={refreshToken}
            assistantName={STUDIO_CONFIG.assistantName}
          />
        </div>
      )}
    </div>
  );
};
