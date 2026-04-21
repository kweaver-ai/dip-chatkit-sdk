import React, { useMemo, useState } from 'react';
import { ChatKitCozeDemo } from '../chatkit_coze/App';
import { ChatKitDataAgentDemo } from '../chatkit_data_agent/App';
import { DIPAssistantDemo } from '../chatkit_data_agent/AssistantApp';
import { DIPAssistantOnlyDemo } from '../chatkit_data_agent/AssistantOnlyApp';
import { StudioCopilotDemo } from '../chatkit_studio/App';
import { StudioAssistantDemo } from '../chatkit_studio/AssistantApp';

/**
 * Demo 入口,提供三个示例:
 * 1. ChatKitCoze - Coze 平台 Copilot
 * 2. DIP Copilot - AISHU DIP 平台 Copilot
 * 3. DIP Assistant - AISHU DIP 平台 Assistant
 */
const App: React.FC = () => {
  const [activeDemo, setActiveDemo] = useState<'coze' | 'dipCopilot' | 'dipAssistant' | 'dipAssistantOnly' | 'studioCopilot' | 'studioAssistant'>('coze');

  const demoTitle = useMemo(() => {
    switch (activeDemo) {
      case 'coze':
        return 'ChatKitCoze';
      case 'dipCopilot':
        return 'DIP Copilot';
      case 'dipAssistant':
        return 'DIP Assistant';
      case 'dipAssistantOnly':
        return 'DIP Assistant (Standalone)';
      case 'studioCopilot':
        return 'Studio Copilot';
      case 'studioAssistant':
        return 'Studio Assistant';
      default:
        return 'ChatKit Demo';
    }
  }, [activeDemo]);

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="w-72 border-r border-gray-200 bg-white p-6 flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-gray-800">ChatKit Demo</h1>
        <p className="text-sm text-gray-600">
          选择要体验的组件。每个 Demo 支持上下文注入与流式响应。
        </p>
        <div className="flex flex-col gap-2">
          <button
            className={`text-left px-3 py-2 rounded-lg border transition-colors ${
              activeDemo === 'coze'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-blue-200 text-gray-700'
            }`}
            onClick={() => setActiveDemo('coze')}
          >
            Coze Copilot Demo
          </button>
          <button
            className={`text-left px-3 py-2 rounded-lg border transition-colors ${
              activeDemo === 'dipCopilot'
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                : 'border-gray-200 hover:border-indigo-200 text-gray-700'
            }`}
            onClick={() => setActiveDemo('dipCopilot')}
          >
            DIP Copilot Demo
          </button>
          <button
            className={`text-left px-3 py-2 rounded-lg border transition-colors ${
              activeDemo === 'dipAssistant'
                ? 'border-purple-500 bg-purple-50 text-purple-700'
                : 'border-gray-200 hover:border-purple-200 text-gray-700'
            }`}
            onClick={() => setActiveDemo('dipAssistant')}
          >
            DIP Assistant Demo
          </button>
          <button
            className={`text-left px-3 py-2 rounded-lg border transition-colors ${
              activeDemo === 'dipAssistantOnly'
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-gray-200 hover:border-green-200 text-gray-700'
            }`}
            onClick={() => setActiveDemo('dipAssistantOnly')}
          >
            DIP Assistant (Standalone)
          </button>
          <button
            className={`text-left px-3 py-2 rounded-lg border transition-colors ${
              activeDemo === 'studioCopilot'
                ? 'border-cyan-500 bg-cyan-50 text-cyan-700'
                : 'border-gray-200 hover:border-cyan-200 text-gray-700'
            }`}
            onClick={() => setActiveDemo('studioCopilot')}
          >
            Studio Copilot Demo
          </button>
          <button
            className={`text-left px-3 py-2 rounded-lg border transition-colors ${
              activeDemo === 'studioAssistant'
                ? 'border-teal-500 bg-teal-50 text-teal-700'
                : 'border-gray-200 hover:border-teal-200 text-gray-700'
            }`}
            onClick={() => setActiveDemo('studioAssistant')}
          >
            Studio Assistant Demo
          </button>
        </div>
        <div className="text-xs text-gray-500">
          当前示例: <span className="font-semibold text-gray-700">{demoTitle}</span>
        </div>
      </div>

      {activeDemo === 'coze' && <ChatKitCozeDemo />}
      {activeDemo === 'dipCopilot' && <ChatKitDataAgentDemo />}
      {activeDemo === 'dipAssistant' && <DIPAssistantDemo />}
      {activeDemo === 'dipAssistantOnly' && <DIPAssistantOnlyDemo />}
      {activeDemo === 'studioCopilot' && <StudioCopilotDemo />}
      {activeDemo === 'studioAssistant' && <StudioAssistantDemo />}
    </div>
  );
};

export default App;
