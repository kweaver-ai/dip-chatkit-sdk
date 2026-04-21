import React from 'react';
import { MarkdownBlock } from './blocks';
import { BlockType } from '@/types';

interface PrologueProps {
  onQuestionClick?: (question: string) => void;
  prologue?: string;
  predefinedQuestions?: string[];
}

const Prologue: React.FC<PrologueProps> = ({
  onQuestionClick,
  prologue,
  predefinedQuestions,
}) => {
  const defaultPrologue = '你好！我是 Copilot，你的智能浏览助手。我可以帮你理解和分析当前页面的内容。';
  const defaultQuestions = [
    '🔍 我现在有哪些需要优先处理的高风险工单？',
    '🛠️ 处理 [问题类型] 工单有什么推荐方案？',
    '💡 如何避免处理 [技术领域] 问题的常见错误？',
  ];

  const displayPrologue = prologue || defaultPrologue;
  const questions =
    predefinedQuestions && predefinedQuestions.length > 0
      ? predefinedQuestions
      : defaultQuestions;

  const handleQuestionClick = (question: string) => {
    onQuestionClick?.(question);
  };

  return (
    <div className="flex flex-col gap-[16px] px-[24px] pt-[112px] pb-[16px]">
      <p className="leading-[17px]" style={{ fontFamily: 'Noto Sans SC' }}>
        <MarkdownBlock block={{ type: BlockType.MARKDOWN, content: displayPrologue }} fontColor="rgba(0,0,0,0.65)" />
      </p>

      <div className="flex flex-col gap-[12px]">
        {questions.map((question, index) => (
          <button
            key={index}
            onClick={() => handleQuestionClick(question)}
            className="w-full bg-white border border-[rgba(0,0,0,0.1)] rounded-[6px] px-[12px] py-[8px] text-left text-[14px] leading-[24px] text-black hover:border-[#3b9be0] hover:bg-[rgba(18,110,227,0.04)] transition-all"
            style={{ fontFamily: 'Noto Sans SC' }}
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Prologue;
