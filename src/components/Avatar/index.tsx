import React from 'react';
import { Avatar1 } from './Avatar-1';
import { Avatar2 } from './Avatar-2';
import { Avatar3 } from './Avatar-3';
import { Avatar4 } from './Avatar-4';
import { Avatar5 } from './Avatar-5';
import { Avatar6 } from './Avatar-6';
import { Avatar7 } from './Avatar-7';
import { Avatar8 } from './Avatar-8';
import { Avatar9 } from './Avatar-9';
import { Avatar10 } from './Avatar-10';

/**
 * Avatar 组件映射表
 */
const AvatarMap: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {
  '1': Avatar1,
  '2': Avatar2,
  '3': Avatar3,
  '4': Avatar4,
  '5': Avatar5,
  '6': Avatar6,
  '7': Avatar7,
  '8': Avatar8,
  '9': Avatar9,
  '10': Avatar10,
};

/**
 * Avatar 组件属性接口
 */
export interface AvatarProps extends React.SVGProps<SVGSVGElement> {
  /** SVG 名称，支持 '1' 到 '10' */
  name: string;
}

/**
 * Avatar 组件
 * 根据传入的 name 参数渲染对应的 Avatar 图标
 * 
 * @example
 * ```tsx
 * <Avatar name="1" width={48} height={48} />
 * <Avatar name="10" className="avatar-icon" />
 * ```
 */
export const Avatar: React.FC<AvatarProps> = ({ name, ...props }) => {
  const AvatarComponent = AvatarMap[name];
  
  if (!AvatarComponent) {
    return null;
  }
  
  return <AvatarComponent {...props} />;
};

/**
 * 根据名称获取 Avatar 组件
 * 
 * @param name - SVG 名称，支持 '1' 到 '10'
 * @returns 对应的 Avatar 组件，如果不存在则返回 null
 */
export const getAvatarByName = (name: string): React.FC<React.SVGProps<SVGSVGElement>> | null => {
  return AvatarMap[name] || null;
};

// 导出所有独立的 Avatar 组件
export { Avatar1, Avatar2, Avatar3, Avatar4, Avatar5, Avatar6, Avatar7, Avatar8, Avatar9, Avatar10 };

export default Avatar;
