import React from 'react';

/**
 * 发送图标组件的属性接口
 */
interface SendIconProps extends React.SVGProps<SVGSVGElement> {
  /** 是否禁用状态 */
  disabled?: boolean;
}

/**
 * 发送图标组件
 */
export const SendIcon: React.FC<SendIconProps> = ({ disabled = false, ...props }) => {
  return (
    <svg width="14" height="14" viewBox="0 0 16 14" fill="none" {...props}>
      <path d="M15.5693 6.04004C16.1332 6.62385 16.1487 7.56459 15.585 8.14844L10.1182 13.8086C9.87162 14.0637 9.47208 14.0638 9.22559 13.8086C8.97905 13.5533 8.97905 13.1391 9.22559 12.8838L14.2998 7.64551L0.626953 7.64551C0.280944 7.64551 1.90735e-05 7.35533 0 6.99707C0 6.63879 0.280932 6.34863 0.626953 6.34863L14.1123 6.34863L9.02246 1.09375C8.90442 0.973984 8.83634 0.81075 8.83398 0.639648C8.8375 0.380188 8.98999 0.147704 9.22168 0.0488281C9.45348 -0.0499995 9.72042 0.00382885 9.89941 0.185547L15.5693 6.04004Z" fill="white"/>
    </svg>
  );
};

export default SendIcon;
