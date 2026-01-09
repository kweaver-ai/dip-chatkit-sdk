import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkBreaks from 'remark-breaks';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import { MarkdownBlock as MarkdownBlockType } from '../../../../types';

/**
 * MarkdownBlock 组件的属性接口
 */
export interface MarkdownBlockProps {
  /** Markdown 块数据 */
  block: MarkdownBlockType;
  /** 基础字号，单位 px，默认为 14 */
  fontSize?: number;
  /** 基础字体颜色，默认为 rgba(0, 0, 0, 0.85) */
  fontColor?: string;
}

/**
 * MarkdownBlock 组件
 * 用于渲染 Markdown 类型的消息块
 */
const MarkdownBlock: React.FC<MarkdownBlockProps> = ({ block, fontSize = 14, fontColor }) => {
  const style: React.CSSProperties & Record<string, string> = {
    '--markdown-base-font-size': `${fontSize}px`,
  };

  if (fontColor) {
    style['--markdown-base-font-color'] = fontColor;
  }

  return (
    <div className="markdown-body prose prose-sm max-w-none"
      style={style}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]} rehypePlugins={[rehypeKatex, rehypeRaw]}>
        {block.content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownBlock;
