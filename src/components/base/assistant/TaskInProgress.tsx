import React from 'react';

/**
 * TaskInProgress 组件的属性接口
 */
interface TaskInProgressProps {
  /** 可选的自定义类名 */
  className?: string;
}

// 静态文案与样式，避免父组件频繁更新时重复创建
const LABEL_STYLE: React.CSSProperties = { fontFamily: 'Noto Sans SC' };

/**
 * 加载点动画子组件，用 memo 隔离父级重渲染，减少流式组装消息时的卡顿
 */
const TaskDots = React.memo(function TaskDots() {
  return (
    <div className="flex items-center" aria-hidden>
      <div className="h-[5px] w-[5px] rounded-full mr-[10px] task-dot bg-[#b3d4fc]" />
      <div className="h-[5px] w-[5px] rounded-full mr-[10px] task-dot bg-[#b3d4fc]" />
      <div className="h-[5px] w-[5px] rounded-full mr-[10px] task-dot bg-[#b3d4fc]" />
      <div className="h-[5px] w-[5px] rounded-full mr-[10px] task-dot bg-[#b3d4fc]" />
      <div className="h-[5px] w-[5px] rounded-full task-dot bg-[#b3d4fc]" />
    </div>
  );
});

/**
 * TaskInProgress 组件
 * 显示任务进行中的加载动画。使用 React.memo 避免流式更新消息时随父组件重复渲染导致卡顿。
 */
const TaskInProgress: React.FC<TaskInProgressProps> = React.memo(function TaskInProgress({
  className = '',
}) {
  return (
    <div
      className={`inline-flex items-center px-4 py-2 rounded-lg ${className}`}
      style={{ contain: 'layout style paint' }}
    >
      <span className="text-[14px] text-[rgba(0,0,0,0.65)] mr-2" style={LABEL_STYLE}>
        任务正在进行中
      </span>
      <TaskDots />
    </div>
  );
});

export default TaskInProgress;
