import React, { useState, useEffect, useCallback } from 'react';
import type { ChartDataSchema, ChartType } from '../../../../../types';
import { LineIcon, TableIcon, PieIcon, ColumnIcon } from '../../../../icons';
import EChartsView from './EChartsView';
import TableView from './TableView';
import { validateChartType } from './utils';

/**
 * Json2PlotModal 组件的属性接口
 */
export interface Json2PlotModalProps {
  /** 是否显示弹窗 */
  open: boolean;
  /** 关闭弹窗回调 */
  onClose: () => void;
  /** 图表数据 Schema */
  data: ChartDataSchema;
  /** 初始视图类型：'table' 或图表类型 */
  initialViewType?: 'table' | ChartType;
}

/**
 * 视图类型
 */
type ViewType = 'table' | ChartType;

/**
 * 获取视图类型显示名称
 */
function getViewTypeName(viewType: ViewType): string {
  switch (viewType) {
    case 'table':
      return '表格';
    case 'Line':
      return '折线图';
    case 'Column':
      return '柱状图';
    case 'Circle':
      return '环形图';
    case 'Pie':
      return '饼图';
    default:
      return String(viewType);
  }
}

/**
 * 获取视图类型图标
 */
function getViewTypeIcon(viewType: ViewType): React.ReactNode {
  switch (viewType) {
    case 'table':
      return <TableIcon />;
    case 'Line':
      return <LineIcon />;
    case 'Column':
      return <ColumnIcon />;
    case 'Circle':
    case 'Pie':
      return <PieIcon />;
    default:
      return <TableIcon />;
  }
}

/**
 * Json2PlotModal 组件
 * 弹窗组件，包含菜单栏和内容区域，整合 EChartsView 和 TableView
 */
const Json2PlotModal: React.FC<Json2PlotModalProps> = ({
  open,
  onClose,
  data,
  initialViewType,
}) => {
  const [currentViewType, setCurrentViewType] = useState<ViewType>('Line');
  
  // 当弹窗打开时，重置为初始值
  useEffect(() => {
    if (open) {
      // 计算默认视图类型
      const defaultViewType: ViewType = initialViewType || data.chartType || 'Line';
      setCurrentViewType(defaultViewType);
    }
  }, [open, initialViewType, data.chartType]);
  
  // 切换视图类型
  const handleViewTypeChange = useCallback((newType: ViewType) => {
    setCurrentViewType(newType);
  }, []);
  
  // 处理ESC键关闭弹窗
  useEffect(() => {
    if (!open) return;
    
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [open, onClose]);
  
  if (!open) return null;
  
  const isTableView = currentViewType === 'table';
  const chartType = isTableView ? (data.chartType || 'Line') : currentViewType;
  const chartTypeError = isTableView ? null : validateChartType(data, chartType);
  
  // 菜单选项
  const menuOptions: ViewType[] = ['table', 'Circle', 'Column', 'Line', 'Pie'];
  
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose}
      aria-modal="true"
      aria-labelledby="chart-modal-title"
    >
      <div
        className="relative bg-white rounded-lg shadow-lg flex flex-col w-[90vw] max-w-[1200px] h-[90vh] max-h-[800px] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors z-10"
          aria-label="关闭"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
        
        {/* 弹窗标题栏 */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center">
            <span className="text-lg font-medium text-gray-900">
              {data.title || '图表'}
            </span>
          </div>
        </div>
        
        {/* 弹窗内容区域 */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {/* 第一层：菜单，横向居中 */}
          <div className="flex justify-center mb-4 flex-shrink-0">
            <div className="inline-flex items-center rounded border border-gray-300 bg-gray-50 relative">
              {menuOptions.map((option, index) => {
                const isSelected = currentViewType === option;
                const isLast = index === menuOptions.length - 1;
                
                return (
                  <React.Fragment key={option}>
                    <button
                      onClick={() => handleViewTypeChange(option)}
                      className={`px-4 py-2 text-sm transition-colors flex items-center gap-2 relative ${
                        isSelected
                          ? 'bg-white text-blue-600 border border-blue-600 z-[1] -mt-px -mb-px'
                          : 'text-gray-900 bg-transparent z-0'
                      } ${
                        !isLast && !isSelected ? 'border-r border-gray-300' : ''
                      } ${
                        index > 0 && !isSelected ? 'border-l border-gray-300' : ''
                      } ${
                        isSelected && index > 0 ? '-ml-px' : ''
                      } ${
                        isSelected && !isLast ? '-mr-px' : ''
                      }`}
                    >
                      {getViewTypeIcon(option)}
                      <span>{getViewTypeName(option)}</span>
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
          
          {/* 第二层：图或表，距离顶部和底部16px */}
          <div className="flex-1 overflow-hidden pt-4 pb-4">
            {isTableView ? (
              <div className="w-full h-full overflow-auto">
                <TableView data={data} maxHeight="100%" />
              </div>
            ) : chartTypeError ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                {chartTypeError}
              </div>
            ) : (
              <div className="w-full h-full">
                <EChartsView
                  data={data}
                  chartType={chartType}
                  width="100%"
                  height="100%"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Json2PlotModal;
