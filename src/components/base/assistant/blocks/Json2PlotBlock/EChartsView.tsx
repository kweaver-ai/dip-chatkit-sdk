import React, { useRef, useEffect, useMemo } from 'react';
import * as echarts from 'echarts';
import type { ChartDataSchema, ChartType } from '../../../../../types';
import { convertToEChartsOption, validateChartType } from './utils';

/**
 * EChartsView 组件的属性接口
 */
export interface EChartsViewProps {
  /** 图表数据 Schema */
  data: ChartDataSchema;
  /** 图表类型 */
  chartType: ChartType;
  /** 图表宽度 */
  width?: string | number;
  /** 图表高度 */
  height?: string | number;
  /** 是否可点击（用于打开弹窗） */
  clickable?: boolean;
  /** 点击回调 */
  onClick?: () => void;
}

/**
 * EChartsView 组件
 * 纯图表渲染组件，负责使用 ECharts 渲染图表
 */
const EChartsView: React.FC<EChartsViewProps> = ({
  data,
  chartType,
  width = '100%',
  height = '400px',
  clickable = false,
  onClick,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);
  
  // 验证当前图表类型是否支持
  const chartTypeError = useMemo(() => {
    return validateChartType(data, chartType);
  }, [data, chartType]);
  
  // 转换数据为 ECharts Option
  const option = useMemo(() => {
    if (chartTypeError) return null;
    return convertToEChartsOption(data, chartType);
  }, [data, chartType, chartTypeError]);
  
  // 初始化图表
  useEffect(() => {
    if (!chartRef.current || !option) return;
    
    try {
      // 当图表类型改变时，先清理旧的图表实例
      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose();
        chartInstanceRef.current = null;
      }
      
      // 重新初始化图表实例
      chartInstanceRef.current = echarts.init(chartRef.current);
      // 使用 notMerge: true 确保完全替换配置，避免不同图表类型之间产生冲突
      chartInstanceRef.current.setOption(option, { notMerge: true, lazyUpdate: false });
      
      // 处理窗口大小变化（防抖）
      let resizeTimer: NodeJS.Timeout;
      const handleResize = () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          chartInstanceRef.current?.resize();
        }, 100);
      };
      window.addEventListener('resize', handleResize);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        clearTimeout(resizeTimer);
        // 清理图表实例
        if (chartInstanceRef.current) {
          chartInstanceRef.current.dispose();
          chartInstanceRef.current = null;
        }
      };
    } catch (error) {
      console.error('图表初始化失败:', error);
    }
  }, [option, chartType]);
  
  // 验证错误
  if (chartTypeError) {
    return (
      <div
        className="flex items-center justify-center text-gray-500"
        style={{
          width,
          height,
          minWidth: '300px',
          minHeight: '200px',
        }}
        role="img"
        aria-label="数据错误"
      >
        {chartTypeError}
      </div>
    );
  }
  
  const containerStyle: React.CSSProperties = {
    width,
    height,
    minWidth: '300px',
    minHeight: '200px',
    cursor: clickable ? 'pointer' : 'default',
  };
  
  return (
    <div
      ref={chartRef}
      style={containerStyle}
      onClick={clickable ? onClick : undefined}
      role="img"
      aria-label={`${chartType}图表`}
    />
  );
};

export default EChartsView;
