import React from 'react';
import { MarkdownBlock } from './blocks';
import { BlockType } from '@/types';
import Avatar from '@/components/Avatar';


/**
 * 推荐问题按钮属性
 */
interface QuestionButtonProps {
  label: string;
  onClick: (label: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * 推荐问题按钮组件
 * 参考 RegenerateButton 的实现方式
 */
const QuestionButton: React.FC<QuestionButtonProps> = ({
  label,
  onClick,
  disabled = false,
  className = '',
}) => {
  const handleClick = () => {
    if (disabled) return;
    onClick(label);
  };

  return (
    <div
      onClick={handleClick}
      className={`inline-flex items-center justify-center text-left w-fit  px-[12px] py-[8px] rounded-[6px] text-[14px] leading-[22px] text-[rgba(0,0,0,0.85)] break-words whitespace-normal border border-white/50 shadow-sm cursor-pointer transition-all duration-200 hover:border-[#126EE3]/40 hover:shadow-md bg-[#F8F9FC] backdrop-blur-sm hover:bg-[#F0F2FF] ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
      style={{ fontFamily: 'Noto Sans SC' }}
    >
      <span>{label}</span>
    </div>
  );
};

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
  prologue,
  predefinedQuestions,
  agentInfo,
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
          <p className="text-2xl text-[rgba(0,0,0,0.85)] font-normal mb-6 flex items-center gap-5" style={{ fontFamily: 'Noto Sans SC' }}>
            {agentInfo?.avatar && (
                <Avatar name={agentInfo.avatar} width={48} height={48} />
            )}
            {agentInfo.name}
          </p>
        )}

        {/* 开场白（文本内容 14px，可折叠） */}
        {prologue && (
          <div
            className="mb-6 bg-[rgba(248,249,252,1)] rounded-[12px] px-4 py-3"
            style={{ fontFamily: 'Noto Sans SC' }}
          >
            <div className="text-[14px] leading-[22px] text-[rgba(0,0,0,0.85)]">
                <MarkdownBlock
                  block={{ type: BlockType.MARKDOWN, content: prologue }}
                  fontSize={14}
                />
            </div>
          </div>
        )}

        {/* Agent 简介 */}
        {/* {agentInfo?.profile && (
          <p className="text-[16px] leading-[26px] text-[rgba(0,0,0,0.65)] font-normal mb-6" style={{ fontFamily: 'Noto Sans SC' }}>
            {agentInfo.profile}
          </p>
        )} */}

        {/* 标题文案 16px */}
       

        {/* 预设问题列表（纵向排列） */}
        {questions.length > 0 && (
          <>
            <p
              className="mb-4 text-[14px] leading-[24px] text-[rgba(0,0,0,0.85)] font-medium"
              style={{ fontFamily: 'Noto Sans SC' }}
            >
              你可以问我：
            </p>
            <div className="flex flex-col gap-3">
              {questions.map((question) => (
                <QuestionButton
                  key={question}
                  label={question}
                  onClick={handleQuestionClick}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Prologue;
