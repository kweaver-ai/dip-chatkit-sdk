import React, { useRef } from 'react';
import { Assistant, type AssistantProps } from '@dip/chatkit';
import { DATA_AGENT_CONFIG } from './config';

/**
 * DIP Assistant Only Demo
 * 只显示 Assistant 组件本身，不包含任何额外内容
 * 全屏展示 Assistant 主对话界面
 */
export const DIPAssistantOnlyDemo: React.FC = () => {
  const chatKitRef = useRef<Assistant>(null);

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

  return (
    <div className="w-full h-screen">
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
  );
};
