import React, { useState, useEffect } from 'react';
import TreeView from './TreeView';
import {
  TreeNode,
  KnowledgeNetworkDetail,
  ObjectTypeListResponse,
} from './types';
import KownledgeNetworkIcon from '@/components/icons/KownledgeNetworkIcon';

export interface KnowledgeNetworksTreeProps {
  /** 知识网络配置项（来自 config.data_source.knowledge_networks 的每一项） */
  knowledgeNetwork: {
    id: string;
    name?: string;
  };
  
  /** API 调用方法 */
  getKnowledgeNetworksDetail: (id: string) => Promise<KnowledgeNetworkDetail>;
  getKnowledgeNetworkObjectTypes: (id: string) => Promise<ObjectTypeListResponse>;
}

/**
 * 知识网络业务组件
 * 负责数据转换和 API 调用，将知识网络数据转换为树组件所需格式
 */
const KnowledgeNetworksTree: React.FC<KnowledgeNetworksTreeProps> = ({
  knowledgeNetwork,
  getKnowledgeNetworksDetail,
  getKnowledgeNetworkObjectTypes,
}) => {
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. 获取知识网络详情
        const detail = await getKnowledgeNetworksDetail(knowledgeNetwork.id);

        // 2. 获取对象类型列表
        const objectTypesResponse = await getKnowledgeNetworkObjectTypes(knowledgeNetwork.id);

        // 3. 转换为树节点数据格式
        const treeNodes: TreeNode[] = [
          {
            title: detail.name || knowledgeNetwork.name || '未知知识网络',
            icon: (
              <KownledgeNetworkIcon className="w-[16px] h-[16px]" />
            ),
            key: `kn-${detail.id}`,
            childrens: objectTypesResponse.entries.map((objectType) => ({
              title: objectType.name || '未知对象类型',
              icon: (
                <KownledgeNetworkIcon className="w-[16px] h-[16px]" />
              ),
              key: `ot-${objectType.id}`,
              childrens: (objectType.data_properties || []).map((property) => ({
                title: property.display_name || property.name || '未知属性',
                key: `dp-${objectType.id}-${property.name}`,
              })),
            })),
          },
        ];

        setTreeData(treeNodes);
      } catch (err) {
        console.error('加载知识网络数据失败:', err);
        setError(err instanceof Error ? err.message : '加载失败');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [knowledgeNetwork.id, knowledgeNetwork.name, getKnowledgeNetworksDetail, getKnowledgeNetworkObjectTypes]);

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

export default KnowledgeNetworksTree;
