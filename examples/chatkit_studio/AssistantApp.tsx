import React from 'react';
import { StudioAssistant, type StudioAssistantProps } from '@kweaver-ai/chatkit';
import { STUDIO_CONFIG } from './config';

export const StudioAssistantDemo: React.FC = () => {
  const refreshToken = async (): Promise<string> => STUDIO_CONFIG.token;

  return (
    <div className="w-full h-screen flex flex-col bg-white">
      <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-800">
            Studio Assistant Demo
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            演示 Studio ChatKit 的主助手形态，附件上传已内置到输入区左下角。
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {React.createElement(StudioAssistant as any, {
          title: 'Studio Assistant',
          visible: true,
          baseUrl: STUDIO_CONFIG.baseUrl,
          agentId: STUDIO_CONFIG.agentId,
          userId: STUDIO_CONFIG.userId,
          token: STUDIO_CONFIG.token,
          refreshToken,
          assistantName: STUDIO_CONFIG.assistantName,
        } as StudioAssistantProps)}
      </div>
    </div>
  );
};
