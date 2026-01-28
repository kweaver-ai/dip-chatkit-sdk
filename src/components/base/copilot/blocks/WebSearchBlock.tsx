import React from 'react';
import { WebSearchBlock as WebSearchBlockType, BlockType, ToolBlock as ToolBlockType } from '../../../../types';
import ToolBlock from './ToolBlock';

/**
 * WebSearchBlock 组件的属性接口
 */
export interface WebSearchBlockProps {
  /** Web 搜索块数据 */
  block: WebSearchBlockType;
}

/**
 * WebSearchBlock 组件
 * 用于渲染 Web 搜索类型的消息块
 * 现在使用通用的 ToolBlock 组件来展示工具调用信息
 */
const WebSearchBlock: React.FC<WebSearchBlockProps> = ({ block }) => {
  const { input, results } = block.content;

  // 将 WebSearchBlock 转换为 ToolBlock 格式
  const toolBlock: ToolBlockType = {
    type: BlockType.TOOL,
    content: {
      name: 'web_search',
      title: `联网搜索：${input}`,
      icon: (
        <svg
          className="w-[20px] h-[20px] text-blue-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      ),
      input: {
        query: input,
      },
      output: {
        results: results.map((result) => ({
          title: result.title,
          content: result.content,
          link: result.link,
          media: result.media,
          icon: result.icon,
        })),
        total: results.length,
      },
    },
  };

  return <ToolBlock block={toolBlock} />;
};

export default WebSearchBlock;
