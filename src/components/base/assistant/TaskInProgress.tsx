import React from 'react';

/**
 * TaskInProgress 组件的属性接口
 */
interface TaskInProgressProps {
  /** 可选的自定义类名 */
  className?: string;
}

/**
 * TaskInProgress 组件
 * 显示任务进行中的加载动画
 */
const TaskInProgress: React.FC<TaskInProgressProps> = ({ className = '' }) => {
  return (
    <div className={`inline-flex items-center px-4 py-2  rounded-lg ${className}`}>
      <span className="text-[14px] text-[rgba(0,0,0,0.65)] mr-2" style={{ fontFamily: 'Noto Sans SC' }}>
        任务正在进行中
      </span>
      <div className="flex items-center">
        <div className="h-[5px] w-[5px] rounded-full mr-[10px] task-dot bg-[#b3d4fc]"></div>
        <div className="h-[5px] w-[5px] rounded-full mr-[10px] task-dot bg-[#b3d4fc]"></div>
        <div className="h-[5px] w-[5px] rounded-full mr-[10px] task-dot bg-[#b3d4fc]"></div>
        <div className="h-[5px] w-[5px] rounded-full mr-[10px] task-dot bg-[#b3d4fc]"></div>
        <div className="h-[5px] w-[5px] rounded-full task-dot bg-[#b3d4fc]"></div>
      </div>
    </div>
  );
};

export default TaskInProgress;
