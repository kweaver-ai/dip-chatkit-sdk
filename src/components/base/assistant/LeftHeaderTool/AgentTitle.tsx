import Avatar from '@/components/Avatar';
import React from 'react';

export interface AgentTitleProps {
  /** Agent 名称 */
  name?: string;
  
  /** Agent 图标 URL */
  icon?: string;
  
}

/**
 * Agent 标题组件
 * 显示 Agent 的名称和图标，无点击交互
 */
const AgentTitle: React.FC<AgentTitleProps> = ({ name, icon }) => {
  if (!name && !icon) {
    return null;
  }

  return (
    <div className="flex gap-2 items-center h-[38px] w-[100%]">
      {/* Agent 图标 */}
      {icon && (
          <Avatar name={icon} width={24} height={24} />
      )}
      
      {/* Agent 名称 */}
      {name && (
        <span
          className="text-sm font-medium flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap"
          style={{
            fontFamily: 'Noto Sans SC',
            color: 'rgba(0, 0, 0, 0.85)',
          }}
          title={name}
        >
          {name}
        </span>
      )}
    </div>
  );
};

export default AgentTitle;
