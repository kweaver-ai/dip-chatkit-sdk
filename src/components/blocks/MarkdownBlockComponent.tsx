import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MarkdownBlock } from '../../types';

/**
 * MarkdownBlockComponent 组件的属性接口
 */
export interface MarkdownBlockComponentProps {
  /** Markdown 块数据 */
  block: MarkdownBlock;
}

/**
 * MarkdownBlockComponent 组件
 * 用于渲染 Markdown 类型的消息块
 */
const MarkdownBlockComponent: React.FC<MarkdownBlockComponentProps> = ({ block }) => {
  return (
    <div className="markdown-block prose prose-sm max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {block.content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownBlockComponent;
