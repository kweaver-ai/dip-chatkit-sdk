import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Json2PlotBlock as Json2PlotBlockType, ChartType, ChartDataSchema } from '../../../../types';
import { LineIcon, TableIcon, PieIcon, ColumnIcon } from '../../../icons';
import EChartsView from './Json2PlotBlock/EChartsView';
import TableView from './Json2PlotBlock/TableView';
import Json2PlotModal from './Json2PlotBlock/Json2PlotModal';
import { validateChartType } from './Json2PlotBlock/utils';

/**
 * Json2PlotBlock 组件的属性接口
 */
export interface Json2PlotBlockProps {
  /** JSON2Plot 图表块数据 */
  block: Json2PlotBlockType;
  /** 图表宽度 */
  width?: string | number;
  /** 图表高度 */
  height?: string | number;
}

/**
 * 获取图表类型图标
 */
function getChartTypeIcon(chartType: ChartType): React.ReactNode {
  switch (chartType) {
    case 'Line':
      return <LineIcon />;
    case 'Column':
      return <ColumnIcon />;
    case 'Pie':
    case 'Circle':
      return <PieIcon />;
    default:
      return <LineIcon />;
  }
}

/**
 * 获取图表类型显示名称
 */
function getChartTypeName(chartType: ChartType): string {
  switch (chartType) {
    case 'Line':
      return '折线图';
    case 'Column':
      return '柱状图';
    case 'Pie':
      return '饼图';
    case 'Circle':
      return '环形图';
    default:
      return chartType;
  }
}

/**
 * Json2PlotBlock 组件
 * 主组件，包含标题栏和菜单栏，整合 EChartsView 和 TableView
 */
const Json2PlotBlock: React.FC<Json2PlotBlockProps> = ({
  block,
  width = '100%',
  height = '400px',
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentChartType, setCurrentChartType] = useState<ChartType>('Line');
  const [isTableView, setIsTableView] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const data: ChartDataSchema = block.content;
  
  // 初始化当前图表类型
  useEffect(() => {
    if (data.chartType) {
      setCurrentChartType(data.chartType);
    }
  }, [data.chartType]);
  
  // 处理图表点击
  const handleChartClick = useCallback(() => {
    setIsModalOpen(true);
  }, []);
  
  // 关闭弹窗
  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);
  
  // 切换表格视图
  const handleToggleTableView = useCallback(() => {
    setIsTableView(true);
    setIsDropdownOpen(false);
  }, []);
  
  // 切换图表类型
  const handleChartTypeChange = useCallback((chartType: ChartType) => {
    setCurrentChartType(chartType);
    setIsTableView(false);
    setIsDropdownOpen(false);
  }, []);
  
  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isDropdownOpen]);
  
  
  // 数据为空状态
  if (!data.rows || data.rows.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-gray-500 border border-gray-200 rounded-lg p-4"
        style={{
          width,
          height,
          minWidth: '300px',
          minHeight: '200px',
        }}
      >
        暂无数据
      </div>
    );
  }
  
  const chartTypeError = validateChartType(data, currentChartType);
  const chartTypeOptions: ChartType[] = ['Circle', 'Column', 'Line', 'Pie'];
  
  const containerStyle: React.CSSProperties = {
    width,
    minWidth: '300px',
    minHeight: '200px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    overflow: 'hidden',
  };
  
  const chartContainerStyle: React.CSSProperties = {
    width: '100%',
    height: typeof height === 'string' ? height : `${Number(height) * 0.85}px`,
    minHeight: '170px',
  };
  
  return (
    <>
      <div style={containerStyle}>
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-4 py-3  bg-white">
          {/* 左侧标题 */}
          <div className="flex items-center">
            <span className="text-base font-medium text-gray-900">
              {data.title || '图表'}
            </span>
          </div>
          
          {/* 右侧按钮组：表格按钮 + 图表类型下拉 */}
          <div className="flex items-center gap-2">
            {/* 表格按钮 */}
            <button
              onClick={handleToggleTableView}
              className={`px-3 py-1.5 rounded border transition-colors flex items-center justify-center ${
                isTableView
                  ? 'bg-white border-blue-600 text-blue-600'
                  : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
              title="表格"
            >
              <TableIcon />
            </button>
            
            {/* 图表类型下拉 */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                onMouseEnter={() => setIsDropdownOpen(true)}
                className={`px-3 py-1.5 rounded border transition-colors flex items-center gap-1.5 ${
                  !isTableView
                    ? 'bg-white border-blue-600 text-blue-600'
                    : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="text-sm">{getChartTypeIcon(currentChartType)}</span>
                <svg
                  className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              
              {/* 下拉菜单 */}
              {isDropdownOpen && (
                <div 
                  className="absolute right-0 mt-1 w-32 bg-white border border-gray-200 rounded shadow-lg z-10"
                  onMouseLeave={() => setIsDropdownOpen(false)}
                >
                  {chartTypeOptions.map((type) => (
                    <button
                      key={type}
                      onClick={() => handleChartTypeChange(type)}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 first:rounded-t last:rounded-b ${
                        currentChartType === type ? 'bg-gray-50 text-blue-600' : 'text-gray-700'
                      }`}
                    >
                      {getChartTypeIcon(type)}
                      <span>{getChartTypeName(type)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* 内容区域 */}
        <div className="bg-white">
          {/* 内容 */}
          {isTableView ? (
            <div className="pt-4 pb-4">
              <TableView data={data} maxHeight="400px" />
            </div>
          ) : chartTypeError ? (
            <div
              className="flex items-center justify-center text-gray-500"
              style={{
                ...chartContainerStyle,
                minHeight: '170px',
              }}
            >
              {chartTypeError}
            </div>
          ) : (
            <div style={chartContainerStyle}>
              <EChartsView
                data={data}
                chartType={currentChartType}
                width="100%"
                height="100%"
                clickable={true}
                onClick={handleChartClick}
              />
            </div>
          )}
        </div>
      </div>
      
      {/* 弹窗 */}
      <Json2PlotModal
        open={isModalOpen}
        onClose={handleCloseModal}
        data={data}
        initialViewType={isTableView ? 'table' : currentChartType}
      />
    </>
  );
};

export default Json2PlotBlock;
export { Json2PlotBlock };
