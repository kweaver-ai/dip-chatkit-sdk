import React, { useState, useRef, useEffect } from 'react';
import KnowledgeNetworksTree from './KnowledgeNetworksTree';
import MetricTree from './MetricTree';
import {
  KnowledgeNetworkDetail,
  ObjectTypeListResponse,
  MetricModel,
} from './types';
import { CloseIcon, KnowledgeSourceIcon } from '@/components/icons';

export interface KnowledgeSourceProps {
  /** 知识网络列表数据 */
  knowledgeNetworks?: Array<{
    id: string;
    name?: string;
  }>;
  
  /** 指标 ID 列表 */
  metricIds?: string[];
  
  /** API 调用方法（从 DIPBase 传入） */
  apiMethods?: {
    getKnowledgeNetworksDetail: (id: string) => Promise<KnowledgeNetworkDetail>;
    getKnowledgeNetworkObjectTypes: (id: string) => Promise<ObjectTypeListResponse>;
    getMetricInfoByIds: (ids: string[]) => Promise<MetricModel[]>;
  };
}

/**
 * 知识来源组件
 * 作为知识来源的入口组件，提供点击展开/收起功能
 */
const KnowledgeSource: React.FC<KnowledgeSourceProps> = ({
  knowledgeNetworks = [],
  metricIds = [],
  apiMethods,
}) => {
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 点击外部区域关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setExpanded(false);
      }
    };

    if (expanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [expanded]);

  // 根据窗口高度动态计算面板最大高度：
  // 高度 = 窗口高度 - 底部 20px 间距 - 面板顶部距离
  useEffect(() => {
    if (!expanded) {
      return;
    }
  }, [expanded]);

  const hasData = (knowledgeNetworks && knowledgeNetworks.length > 0) || (metricIds && metricIds.length > 0);

  if (!hasData || !apiMethods) {
    return null;
  }

  return (
    <div ref={containerRef} className="relative h-[100%]">
      {/* 知识来源按钮 */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`flex items-center justify-center w-[38px] h-[38px] rounded-full border transition-colors cursor-pointer ${
          expanded
            ? 'border-[#126EE3] bg-white'
            : 'border-[#D9D9D9] bg-white hover:border-[#126EE3]'
        }`}
        title="知识来源"
      >
       <KnowledgeSourceIcon className={`${expanded ? 'text-[#126EE3]' : 'text-[rgba(0,0,0,0.85)]'} w-[22px] h-[22px]`} />
      </button>

      {/* 下拉容器 */}
      {expanded && (
        <div
          className="absolute left-0 w-[260px] bg-[rgba(255,255,255,1)] border border-[rgba(0,0,0,0.1)] rounded-[6px] shadow-lg z-50 flex flex-col overflow-hidden"
          style={{
            fontFamily: 'Noto Sans SC',
            top: '54px', // 按钮高度 38px + 间距 16px
            height: 'calc(100% - 70px)',
          }}
        >
          {/* 标题栏 */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(0,0,0,0.1)]">
            <span
              className="font-size-14 font-bold"
              style={{ color: 'rgba(0, 0, 0, 0.85)' }}
            >
              知识来源
            </span>
            <button
              onClick={() => setExpanded(false)}
              className="flex items-center justify-center w-[16px] h-[16px] hover:bg-gray-100 rounded"
              title="关闭"
            >
              <CloseIcon className="w-[16px] h-[16px]" />
            </button>
          </div>

          {/* 内容区（内部滚动） */}
          <div className="flex-1 p-5 space-y-4 overflow-y-auto">
            {/* 指标树 */}
            {metricIds && metricIds.length > 0 && (
              <div>
                <MetricTree
                  metricIds={metricIds}
                  getMetricInfoByIds={apiMethods.getMetricInfoByIds}
                />
              </div>
            )}

            {/* 知识网络树 */}
            {knowledgeNetworks && knowledgeNetworks.length > 0 && (
              <div className={metricIds && metricIds.length > 0 ? 'mt-4' : ''}>
                {knowledgeNetworks.map((kn) => (
                  <div key={kn.id} className={knowledgeNetworks.length > 1 ? 'mb-4' : ''}>
                    <KnowledgeNetworksTree
                      knowledgeNetwork={kn}
                      getKnowledgeNetworksDetail={apiMethods.getKnowledgeNetworksDetail}
                      getKnowledgeNetworkObjectTypes={apiMethods.getKnowledgeNetworkObjectTypes}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* 空状态 */}
            {(!metricIds || metricIds.length === 0) &&
              (!knowledgeNetworks || knowledgeNetworks.length === 0) && (
                <div className="flex items-center justify-center py-8">
                  <span className="text-sm text-gray-500">暂无数据</span>
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeSource;
