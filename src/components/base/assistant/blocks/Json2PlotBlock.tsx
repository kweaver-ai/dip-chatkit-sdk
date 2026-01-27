import React, { useState, useCallback } from 'react';
import { Json2PlotBlock as Json2PlotBlockType, ChartDataSchema, BlockType } from '../../../../types';
import { JsonPlotIcon } from '../../../icons';
import Json2PlotModal from './Json2PlotBlock/Json2PlotModal';
import Json2PlotContentView from './Json2PlotBlock/Json2PlotContentView';
import ToolBlock from './ToolBlock';

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
 * Json2PlotBlock 组件
 * 主组件，包含标题栏和菜单栏，整合 EChartsView 和 TableView
 */
const Json2PlotBlock: React.FC<Json2PlotBlockProps> = ({
  block,
  width = '100%',
  height = '400px',
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const data: ChartDataSchema = block.content;
  
  // 处理图表点击
  const handleChartClick = useCallback(() => {
    setIsModalOpen(true);
  }, []);
  
  // 关闭弹窗
  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);
  
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
  
  return (
    <>
      <div className="mb-16">
        <ToolBlock block={{
          type: BlockType.TOOL,
          content: {
            name: 'json2plot',
            title: data.title || '图表',
            icon: <JsonPlotIcon />,
            input: data,
            output:{
              data,
            }
          },
          consumeTime: block.consumeTime,
        }} />
      </div>
      <Json2PlotContentView
        data={data}
        width={width}
        height={height}
        onChartClick={handleChartClick}
      />
      
      {/* 弹窗 */}
      <Json2PlotModal
        open={isModalOpen}
        onClose={handleCloseModal}
        data={data}
        initialViewType={data.chartType}
      />
    </>
  );
};

export default Json2PlotBlock;
export { Json2PlotBlock };
