import React, { useState, useEffect, useRef } from 'react';
import TreeView from './TreeView';
import { TreeNode, MetricModel } from './types';
import { AfSailorIcon, MetricIcon } from '@/components/icons';

export interface MetricTreeProps {
  /** 指标 ID 列表（来自 config.data_source.metric） */
  metricIds: string[];
  
  /** API 调用方法 */
  getMetricInfoByIds: (ids: string[]) => Promise<MetricModel[]>;
}

/**
 * 指标业务组件
 * 负责数据转换和 API 调用，将指标数据按分组组织，转换为树组件所需格式
 */
const MetricTree: React.FC<MetricTreeProps> = ({
  metricIds,
  getMetricInfoByIds,
}) => {
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const getMetricInfoByIdsRef = useRef(getMetricInfoByIds);
  getMetricInfoByIdsRef.current = getMetricInfoByIds;

  useEffect(() => {
    const loadData = async () => {
      if (!metricIds || metricIds.length === 0) {
        setTreeData([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // 1. 获取指标信息列表
        const metrics = await getMetricInfoByIdsRef.current(metricIds);

        // 2. 按 group_name 分组
        const groupedMetrics = metrics.reduce((acc, metric) => {
          const groupName = metric.group_name || '未分组';
          if (!acc[groupName]) {
            acc[groupName] = [];
          }
          acc[groupName].push(metric);
          return acc;
        }, {} as Record<string, MetricModel[]>);

        // 3. 转换为树节点数据格式
        const treeNodes: TreeNode[] = [
          {
            title: '指标',
            icon: (
              <MetricIcon className="w-[16px] h-[16px]" />
            ),
            key: 'metric-root',
            childrens: Object.entries(groupedMetrics).map(([groupName, groupMetrics]) => ({
              title: groupName,
              icon: (
                <AfSailorIcon className="w-[16px] h-[16px]" />
              ),
              key: `group-${groupName}`,
              childrens: groupMetrics.map((metric) => ({
                title: metric.name || '未知指标',
                key: `metric-${metric.id}`,
              })),
            })),
          },
        ];

        setTreeData(treeNodes);
      } catch (err) {
        console.error('加载指标数据失败:', err);
        setError(err instanceof Error ? err.message : '加载失败');
      } finally {
        setLoading(false);
      }
    };

    loadData();
    // 仅依赖 metricIds 内容变化，API 方法通过 ref 访问避免重复触发
  }, [metricIds?.join(',') ?? '']);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <span className="text-sm text-gray-500" style={{ fontFamily: 'Noto Sans SC' }}>
          加载中...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-4">
        <span className="text-sm text-red-500" style={{ fontFamily: 'Noto Sans SC' }}>
          {error}
        </span>
      </div>
    );
  }

  if (treeData.length === 0) {
    return null;
  }

  return <TreeView data={treeData} />;
};

export default MetricTree;
