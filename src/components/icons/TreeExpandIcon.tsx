import React from 'react';

/**
 * 树节点展开/收起图标（收起态，右箭头 chevron）
 * 展开时由使用方顺时针旋转 90°，收起时逆时针旋转回去
 */
export const TreeExpandIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M3.5 1.75L10.5 7L3.5 12.25"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default TreeExpandIcon;
