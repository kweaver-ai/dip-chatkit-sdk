import React from 'react';
import { TextBlock } from '../../types';

/**
 * TextBlockComponent 组件的属性接口
 */
export interface TextBlockComponentProps {
  /** 文本块数据 */
  block: TextBlock;
}

/**
 * TextBlockComponent 组件
 * 用于渲染文本类型的消息块
 */
const TextBlockComponent: React.FC<TextBlockComponentProps> = ({ block }) => {
  return (
    <div className="text-block">
      <p className="whitespace-pre-wrap">{block.content}</p>
    </div>
  );
};

export default TextBlockComponent;
