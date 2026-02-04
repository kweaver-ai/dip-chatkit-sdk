import React from 'react'

export interface RelatedQuestionsProps {
  /** 相关推荐问题列表 */
  questions: string[]
  /** 点击某条问题时的回调（用于继续提问） */
  onSelectQuestion?: (question: string) => void
  /** 自定义样式类名 */
  className?: string
}

/**
 * 相关问题列表组件
 * 展示在最后一条助手消息下方，支持点击继续提问
 */
const RelatedQuestions: React.FC<RelatedQuestionsProps> = ({
  questions,
  onSelectQuestion,
  className = '',
}) => {
  if (!questions || questions.length === 0) {
    return null
  }

  const handleClick = (question: string) => {
    if (onSelectQuestion) {
      onSelectQuestion(question)
    }
  }

  return (
    <div
      className={`flex flex-wrap gap-[8px] ${className} flex-col`}
      style={{ fontFamily: 'Noto Sans SC' }}
    >
      <div className="flex flex-col gap-[8px]">您是否想了解下面的内容：</div>
      {questions.map((question, index) => (
        <button
          key={`${question}-${index}`}
          type="button"
          onClick={() => handleClick(question)}
          className="inline-flex items-center justify-center text-left w-fit max-w-[320px] px-[12px] py-[8px] rounded-[6px] text-[14px] leading-[22px] text-[rgba(0,0,0,0.85)] break-words whitespace-normal border border-white/50 shadow-sm cursor-pointer transition-all duration-200 hover:border-[#126EE3]/40 hover:shadow-md bg-[linear-gradient(135deg,rgba(246,247,255,0.92)_0%,rgba(242,251,255,0.92)_40%,rgba(255,246,251,0.92)_100%),radial-gradient(circle_at_70%_30%,rgba(99,102,241,0.12)_0%,transparent_70%),radial-gradient(circle_at_30%_70%,rgba(236,72,153,0.08)_0%,transparent_60%)] backdrop-blur-sm hover:bg-[linear-gradient(135deg,rgba(240,242,255,0.95)_0%,rgba(232,248,255,0.95)_40%,rgba(255,239,248,0.95)_100%),radial-gradient(circle_at_70%_30%,rgba(99,102,241,0.16)_0%,transparent_70%),radial-gradient(circle_at_30%_70%,rgba(236,72,153,0.1)_0%,transparent_60%)]"
          title={question}
        >
          <span>{question}</span>
        </button>
      ))}
    </div>
  )
}

export default RelatedQuestions

