import React from 'react';

/**
 * 停止图标组件
 */
export const StopIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
  return (
    <svg
      className="w-4 h-4 text-white"
      fill="currentColor"
      viewBox="0 0 24 24"
      {...props}
    >
      <rect x="4" y="4" width="16" height="16" rx="4" />
    </svg>
  );
};

export default StopIcon;
