import React, { useState, useMemo, useCallback } from 'react';
import { TreeExpandIcon } from '../../../icons';
import { TreeNode } from './types';

export interface TreeViewProps {
  /** 树节点数据 */
  data: TreeNode[];
  
  /** 节点点击回调（可选） */
  onNodeClick?: (node: TreeNode) => void;
  
  /** 节点展开/收起回调（可选） */
  onExpand?: (expandedKeys: string[], node: TreeNode) => void;
}

/**
 * 通用树组件
 * 纯展示组件，负责渲染树形结构，自动处理 key 和 id 生成
 */
const TreeView: React.FC<TreeViewProps> = ({ data, onNodeClick, onExpand }) => {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  /**
   * 生成节点的唯一 key
   * 如果节点已有 key，则使用；否则基于层级路径生成
   */
  const generateKey = useCallback((node: TreeNode, parentPath: string = '', index: number = 0): string => {
    if (node.key) {
      return node.key;
    }
    const path = parentPath ? `${parentPath}-${index}` : `${index}`;
    return path;
  }, []);

  /**
   * 处理节点数据，为所有节点生成 key
   */
  const processedData = useMemo(() => {
    const keySet = new Set<string>();
    
    const processNode = (node: TreeNode, parentPath: string = '', index: number = 0): TreeNode => {
      let key = generateKey(node, parentPath, index);
      
      // 确保 key 唯一
      let uniqueKey = key;
      let counter = 0;
      while (keySet.has(uniqueKey)) {
        uniqueKey = `${key}-${counter}`;
        counter++;
      }
      keySet.add(uniqueKey);
      
      const processedNode: TreeNode = {
        ...node,
        key: uniqueKey,
      };
      
      if (node.childrens && node.childrens.length > 0) {
        processedNode.childrens = node.childrens.map((child, idx) => 
          processNode(child as TreeNode, uniqueKey, idx)
        );
      }
      
      return processedNode;
    };
    
    return data.map((node, idx) => processNode(node, '', idx));
  }, [data, generateKey]);

  /**
   * 处理节点展开/收起
   */
  const handleToggle = useCallback((key: string, node: TreeNode) => {
    setExpandedKeys((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      
      if (onExpand) {
        onExpand(Array.from(newSet), node);
      }
      
      return newSet;
    });
  }, [onExpand]);

  /**
   * 渲染树节点
   */
  const renderNode = useCallback((node: TreeNode, level: number = 0): React.ReactNode => {
    const key = node.key || '';
    const hasChildren = node.childrens && node.childrens.length > 0;
    const isExpanded = expandedKeys.has(key);
    
    return (
      <div key={key} className="tree-node">
        <div
          className={`flex items-center py-1 px-2 hover:bg-gray-50 cursor-pointer rounded ${
            level > 0 ? 'ml-4' : ''
          }`}
          style={{
            paddingLeft: `${level * 16 + 8}px`,
            color: 'rgba(0, 0, 0, 0.85)',
          }}
          onClick={() => {
            if (hasChildren) {
              handleToggle(key, node);
            }
            if (onNodeClick) {
              onNodeClick(node);
            }
          }}
        >
          {/* 展开/收起图标：收起态基准，展开时顺时针 90°，收起时逆时针旋转回去 */}
          {hasChildren ? (
            <span
              className="mr-2 flex items-center justify-center w-[10px] h-[10px] shrink-0 transition-transform duration-200 ease-in-out"
              style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
            >
              <TreeExpandIcon className="w-[10px] h-[10px]" />
            </span>
          ) : (
            <span className="mr-2 w-4 h-4 shrink-0" />
          )}
          
          {/* 节点图标 */}
          {
            node.icon && (<span className="mr-2 flex items-center justify-center w-[22px] h-[22px] shrink-0">
                  {node.icon}
              </span>
            )
           }
        
          {/* 节点标题 */}
          <span 
            className="text-[14px] flex-[0_1_auto] truncate" 
            style={{ fontFamily: 'Noto Sans SC' }} 
            title={node.title}
          >
            {node.title}
          </span>
        </div>
        
        {/* 子节点 */}
        {hasChildren && isExpanded && (
          <div className="tree-children">
            {node.childrens!.map((child) => renderNode(child as TreeNode, level + 1))}
          </div>
        )}
      </div>
    );
  }, [expandedKeys, handleToggle, onNodeClick]);

  return (
    <div className="tree-view">
      {processedData.map((node) => renderNode(node, 0))}
    </div>
  );
};

export default TreeView;
