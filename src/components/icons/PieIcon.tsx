import React from 'react';

/**
 * 饼图图标组件
 */
export const PieIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g clipPath="url(#clip0_92_3035)">
        <path
          d="M7.00027 7.58342L3.34277 1.48816L5.25027 0.583415L8.16694 0.291748L10.7126 1.396L7.00027 7.58342Z"
          fill="currentColor"
        />
        <path
          d="M7 0C10.8658 0 14 3.13425 14 7C14 10.8658 10.8658 14 7 14C3.13425 14 0 10.8658 0 7C0 3.13425 3.13425 0 7 0ZM7 0.583333C3.45625 0.583333 0.583333 3.45625 0.583333 7C0.583333 10.5437 3.45625 13.4167 7 13.4167C10.5437 13.4167 13.4167 10.5437 13.4167 7C13.4167 3.45625 10.5437 0.583333 7 0.583333Z"
          fill="currentColor"
        />
      </g>
      <defs>
        <clipPath id="clip0_92_3035">
          <rect width="14" height="14" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
};

export default PieIcon;
