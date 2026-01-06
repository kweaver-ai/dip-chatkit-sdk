import React from 'react';

/**
 * 折线图图标组件
 */
export const LineIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g clipPath="url(#clip0_107_3070)">
        <path
          d="M0.999674 0.666748V15.0001H15.333V15.6667H0.333008V0.666748H0.999674Z"
          fill="currentColor"
          fillOpacity="0.85"
        />
        <path
          d="M14.2479 4.06006L15.0852 4.60673L9.94654 12.4581L6.59787 9.07473L3.04987 13.3207L2.2832 12.6794L6.5352 7.59139L9.78654 10.8754L14.2479 4.06006Z"
          fill="currentColor"
          fillOpacity="0.85"
        />
      </g>
      <defs>
        <clipPath id="clip0_107_3070">
          <rect width="16" height="16" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
};

export default LineIcon;
