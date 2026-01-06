import React from 'react';

/**
 * 柱状图图标组件
 */
export const ColumnIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g clipPath="url(#clip0_107_3057)">
        <path
          d="M2.66699 2.66675H5.33366V13.3334H2.66699V2.66675ZM7.33366 6.43141H10.0003V13.3334H7.33366V6.43141ZM12.0003 8.94141H14.667V13.3334H12.0003V8.94141Z"
          fill="currentColor"
          fillOpacity="0.85"
        />
        <path
          d="M0.999674 0.666748V15.0001H15.333V15.6667H0.333008V0.666748H0.999674Z"
          fill="currentColor"
          fillOpacity="0.85"
        />
      </g>
      <defs>
        <clipPath id="clip0_107_3057">
          <rect width="16" height="16" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
};

export default ColumnIcon;
