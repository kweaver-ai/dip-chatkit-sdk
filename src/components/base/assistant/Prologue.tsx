import React from 'react';
import { ClockIcon } from '../../icons';
import { MarkdownBlock } from './blocks';
import { BlockType } from '@/types';
import Avatar from '@/components/Avatar';

/**
 * Prologue 组件的属性接口
 */
interface PrologueProps {
  /** Agent 信息 */
  agentInfo?: any;

  /** 点击推荐问题时的回调函数 */
  onQuestionClick?: (question: string) => void;

  /** 开场白文案 */
  prologue?: string;

  /** 预置问题列表 */
  predefinedQuestions?: string[];
}

/**
 * Prologue 组件
 * Assistant 的欢迎界面，显示开场白和预设问题
 */
const Prologue: React.FC<PrologueProps> = ({
  onQuestionClick,
  agentInfo,
  prologue,
  predefinedQuestions
}) => {
  const questions = predefinedQuestions || [];

  /**
   * 处理问题点击
   */
  const handleQuestionClick = (question: string) => {
    if (onQuestionClick) {
      onQuestionClick(question);
    }
  };

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-[960px] px-5 py-8">
        {/* Agent Name */}
        {agentInfo?.name && (
          <p className="text-4xl text-[rgba(0,0,0,0.85)] font-normal mb-6 flex items-center gap-5" style={{ fontFamily: 'Noto Sans SC' }}>
            <Avatar name={agentInfo.avatar} width={64} height={64} />
            {agentInfo.name}
          </p>
        )}
        
        {/* 开场白 */}
        {prologue && (
          <p className="mb-6" style={{ fontFamily: 'Noto Sans SC' }}>
            <MarkdownBlock block={{ type: BlockType.MARKDOWN, content: prologue }} fontSize={20} />
          </p>
        )}

        {/* Agent 简介 */}
        {agentInfo?.profile && (
          <p className="text-[16px] leading-[26px] text-[rgba(0,0,0,0.65)] font-normal mb-6" style={{ fontFamily: 'Noto Sans SC' }}>
            {agentInfo.profile}
          </p>
        )}

        {/* 预设问题网格 */}
        {questions.length > 0 && (
          <div className="grid grid-cols-4 gap-3">
          {questions.map((question, index) => (
            <button
              key={index}
              onClick={() => handleQuestionClick(question)}
              className="bg-white border border-[rgba(0,0,0,0.1)] rounded-[6px] px-4 py-3 text-left text-[14px] leading-[22px] text-[rgba(0,0,0,0.85)] hover:border-[#3b9be0] hover:bg-[rgba(18,110,227,0.04)] transition-all flex items-start gap-2"
              style={{ fontFamily: 'Noto Sans SC' }}
            >
              <ClockIcon />
              <span>{question}</span>
            </button>
          ))}
        </div>
      )}
      </div>
    </div>
  );
};

export default Prologue;
