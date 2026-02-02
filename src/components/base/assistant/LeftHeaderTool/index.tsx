import React, { useMemo } from 'react';
import AgentTitle from './AgentTitle';
import KnowledgeSource from './KnowledgeSource';
import {
  KnowledgeNetworkDetail,
  ObjectTypeListResponse,
  MetricModel,
} from './types';

export interface LeftHeaderToolProps {
  /** DIPBase 的 agentInfo 对象 */
  agentInfo: {
    name?: string;
    avatar?: string;
    config?: {
      data_source?: {
        knowledge_network?: Array<{
          knowledge_network_id: string;
          name?: string;
        }>;
        metric?: Array<{
          metric_model_id: string;
          name?: string;
        }>;
      };
    };
  };
  
  /** API 调用方法（从 DIPBase 传入） */
  apiMethods?: {
    getKnowledgeNetworksDetail: (id: string) => Promise<KnowledgeNetworkDetail>;
    getKnowledgeNetworkObjectTypes: (id: string) => Promise<ObjectTypeListResponse>;
    getMetricInfoByIds: (ids: string[]) => Promise<MetricModel[]>;
  };
  showAside?: boolean;
}

/**
 * LeftHeaderTool 主入口组件
 * 渲染到左侧顶栏位置，包含 AgentTitle 和 KnowledgeSource
 */
const LeftHeaderTool: React.FC<LeftHeaderToolProps> = ({ agentInfo, apiMethods, showAside = true }) => {
  const dataSource = agentInfo.config?.data_source;

  // 使用 useMemo 稳定引用，避免流式消息时父组件频繁 re-render 导致子组件 useEffect 重复执行
  const knIdsKey = dataSource?.knowledge_network?.map((item) => item.knowledge_network_id).join(',') ?? '';
  const metricIdsKey = dataSource?.metric?.map((item) => item.metric_model_id).join(',') ?? '';

  const knowledgeNetworks = useMemo(
    () => dataSource?.knowledge_network?.map((item) => ({ id: item.knowledge_network_id, name: item?.name })) ?? [],
    [knIdsKey]
  );

  const metricIds = useMemo(
    () => dataSource?.metric?.map((item) => item.metric_model_id) ?? [],
    [metricIdsKey]
  );

  return (
    <div className="flex gap-4 max-w-[320px]">
        {/* 知识来源 */}
        {(knowledgeNetworks.length > 0 || metricIds.length > 0) && apiMethods && (
      <div className="flex-shrink-0 w-[38px]">
        <KnowledgeSource
          knowledgeNetworks={knowledgeNetworks}
          metricIds={metricIds}
          apiMethods={apiMethods}
        />
      </div>
      )}
      {/* Agent 标题 */}
      {
        showAside && (
          <div className="flex-initial min-w-0">
            <AgentTitle name={agentInfo.name} icon={agentInfo.avatar} />
          </div>
        )
      }
    
    </div>
  );
};

export default LeftHeaderTool;
