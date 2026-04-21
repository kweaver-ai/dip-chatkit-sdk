import React from 'react';
import { MarkdownBlock } from '../base/copilot/blocks';
import { BlockType } from '@/types';

interface StudioCopilotPrologueProps {
  onQuestionClick?: (question: string) => void;
  prologue?: string;
  predefinedQuestions?: string[];
}

const StudioCopilotPrologue: React.FC<StudioCopilotPrologueProps> = ({
  onQuestionClick,
  prologue,
  predefinedQuestions,
}) => {
  const defaultPrologue = '你好！我是 Studio Copilot，可以继续当前 Studio Agent 的对话内容。';
  const questions =
    predefinedQuestions && predefinedQuestions.length > 0
      ? predefinedQuestions
      : [];

  return (
    <div className="flex flex-col gap-[16px] px-[24px] pt-[112px] pb-[16px]">
      <p className="leading-[17px]" style={{ fontFamily: 'Noto Sans SC' }}>
        <MarkdownBlock
          block={{ type: BlockType.MARKDOWN, content: prologue || defaultPrologue }}
          fontColor="rgba(0,0,0,0.65)"
        />
      </p>

      {questions.length > 0 && (
        <div className="flex flex-col gap-[12px]">
          {questions.map((question, index) => (
            <button
              key={index}
              onClick={() => onQuestionClick?.(question)}
              className="w-full bg-white border border-[rgba(0,0,0,0.1)] rounded-[6px] px-[12px] py-[8px] text-left text-[14px] leading-[24px] text-black hover:border-[#3b9be0] hover:bg-[rgba(18,110,227,0.04)] transition-all"
              style={{ fontFamily: 'Noto Sans SC' }}
            >
              {question}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudioCopilotPrologue;
