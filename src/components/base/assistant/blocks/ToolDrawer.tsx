import React, { useEffect, useState, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeViewTool } from './CodeViewTool';
import TableView from './Json2PlotBlock/TableView';
import Json2PlotContentView from './Json2PlotBlock/Json2PlotContentView';
import type { ChartDataSchema, Dimension, Measure } from '../../../../types';

/**
 * ToolDrawer 组件的属性接口
 */
export interface ToolDrawerProps {
  /** 抽屉是否打开 */
  isOpen: boolean;
  /** 关闭抽屉的回调函数 */
  onClose: () => void;
  /** 工具名称 */
  toolName: string;
  /** 工具标题 */
  toolTitle: string;
  /** 工具图标 */
  toolIcon?: string | React.ReactNode;
  /** 工具输入参数 */
  input?: any;
  /** 工具输出结果 */
  output?: any;
}

/**
 * ToolDrawer 组件
 * 用于展示工具调用的详细信息（输入和输出）的抽屉组件
 */
const ToolDrawer: React.FC<ToolDrawerProps> = ({
  isOpen,
  onClose,
  toolName,
  toolTitle,
  toolIcon,
  input,
  output,
}) => {
  // 拖拽相关状态
  const [topHeight, setTopHeight] = useState<number>(50); // 初始高度百分比（默认50%，即输入输出区域一样高）
  const [isDragging, setIsDragging] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const resizeHandleRef = useRef<HTMLDivElement>(null);

  // 处理 ESC 键关闭抽屉
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // 防止背景滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // 拖拽处理函数
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !contentRef.current) return;

      const contentRect = contentRef.current.getBoundingClientRect();
      const contentTop = contentRect.top;
      const contentHeight = contentRect.height;

      // 鼠标相对于内容区域的位置（考虑滚动位置）
      const scrollTop = contentRef.current.scrollTop;
      const mouseY = e.clientY - contentTop + scrollTop;

      // 计算输入区域的高度（从内容顶部到鼠标位置）
      const inputHeight = mouseY;
      
      // 限制在合理范围内，确保每个区域至少 300px
      const minHeightPx = 300;
      const dragHandleHeight = 16; // 拖拽组件高度
      
      // 计算新的高度百分比（基于内容区域）
      const newTopHeight = (inputHeight / contentHeight) * 100;
      
      // 限制拖拽范围
      if (contentHeight >= minHeightPx * 2 + dragHandleHeight) {
        // 内容区域足够大，限制每个区域至少300px
        const minHeightPercent = (minHeightPx / contentHeight) * 100;
        const maxHeightPercent = 100 - (minHeightPx / contentHeight) * 100;
        const clampedHeight = Math.max(minHeightPercent, Math.min(maxHeightPercent, newTopHeight));
        setTopHeight(clampedHeight);
      } else {
        // 内容区域较小，允许自由拖拽但限制在合理范围内
        const clampedHeight = Math.max(10, Math.min(90, newTopHeight));
        setTopHeight(clampedHeight);
      }
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 监听拖拽事件
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  /**
   * 渲染工具图标
   */
  const renderIcon = () => {
    if (!toolIcon) {
      return null;
    }

    if (typeof toolIcon === 'string') {
      return (
        <img
          src={toolIcon}
          alt={toolName}
          className="w-5 h-5"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      );
    }

    return <div className="w-5 h-5">{toolIcon}</div>;
  };

  /**
   * 格式化显示数据
   * 如果是对象或数组，转换为格式化的 JSON 字符串
   */
  const formatData = (data: any): string => {
    if (data === null || data === undefined) {
      return '';
    }
    if (typeof data === 'string') {
      return data;
    }
    try {
      return JSON.stringify(data, null, 2);
    } catch (e) {
      return String(data);
    }
  };

  /**
   * 判断是否为代码执行工具
   */
  const isExecuteCodeTool = (): boolean => {
    return toolName === 'execute_code';
  };

  /**
   * 判断是否为 Text2SQL 工具
   */
  const isText2SqlTool = (): boolean => {
    return toolName === 'text2sql';
  };


  /**
   * 判断是否为 JSON2Plot 工具
   */
  const isJson2PlotTool = (): boolean => {
    return toolName === 'json2plot';
  };

  /**
   * 渲染代码输入（使用 CodeViewTool）
   */
  const renderCodeInput = (code: string): React.ReactNode => {
    return (
      <CodeViewTool
        code={code}
        language="python"
        width="100%"
        height="100%"
        className="border border-gray-200 rounded-lg"
      />
    );
  };

  /**
   * 渲染代码输出（Markdown 格式）
   */
  const renderCodeOutput = (output: string): React.ReactNode => {
    return (
      <div className="markdown-block prose prose-sm max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {output}
        </ReactMarkdown>
      </div>
    );
  };

  /**
   * 渲染 SQL 输入（使用 CodeViewTool）
   */
  const renderSqlInput = (query: string): React.ReactNode => {
    return (
      <CodeViewTool
        code={query}
        language="sql"
        width="100%"
        height="100%"
        className="border border-gray-200 rounded-lg"
      />
    );
  };

  /**
   * 渲染 JSON2Plot 输入（将对象格式化为 JSON 字符串）
   */
  const renderJson2PlotInput = (input: any): React.ReactNode => {
    // 将输入对象格式化为 JSON 字符串
    const jsonString = typeof input === 'string' 
      ? input 
      : JSON.stringify(input, null, 2);
    
    return (
      <CodeViewTool
        code={jsonString}
        language="json"
        width="100%"
        height="100%"
        className="border border-gray-200 rounded-lg"
      />
    );
  };

  /**
   * 将 SQL 输出数据转换为 ChartDataSchema 格式
   */
  const convertDataToChartSchema = (data: any[]): ChartDataSchema | null => {
    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }

    const firstRow = data[0];
    if (!firstRow || typeof firstRow !== 'object') {
      return null;
    }

    // 收集所有行的所有字段名（去重）
    const allKeys = new Set<string>();
    data.forEach((row) => {
      if (row && typeof row === 'object') {
        Object.keys(row).forEach((key) => allKeys.add(key));
      }
    });

    const dimensions: Dimension[] = [];
    const measures: Measure[] = [];

    // 遍历所有字段，检查所有行的值类型来判断是维度还是度量
    allKeys.forEach((key) => {
      let numberCount = 0;
      let totalCount = 0;
      let hasBoolean = false;
      let hasDate = false;
      let sampleValue: any = null;

      // 统计所有行中该字段的类型
      data.forEach((row) => {
        if (row && typeof row === 'object' && key in row) {
          const value = row[key];
          totalCount++;
          
          if (sampleValue === null) {
            sampleValue = value;
          }

          if (typeof value === 'number' && !isNaN(value)) {
            numberCount++;
          } else if (typeof value === 'boolean') {
            hasBoolean = true;
          } else if (
            value instanceof Date ||
            (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value))
          ) {
            hasDate = true;
          }
        }
      });

      // 如果所有行的该字段都是数字，则认为是度量
      // 否则认为是维度
      if (totalCount > 0 && numberCount === totalCount) {
        measures.push({
          name: key,
          displayName: key,
          dataType: 'number',
        });
      } else {
        // 推断维度数据类型
        let dataType: 'string' | 'number' | 'date' | 'boolean' = 'string';
        if (hasBoolean) {
          dataType = 'boolean';
        } else if (hasDate) {
          dataType = 'date';
        } else if (sampleValue !== null && typeof sampleValue === 'number') {
          dataType = 'number';
        }
        
        dimensions.push({
          name: key,
          displayName: key,
          dataType,
        });
      }
    });

    return {
      chartType: 'Line', // TableView 不需要 chartType，但类型要求必须有
      dimensions,
      measures,
      rows: data,
    };
  };

  /**
   * 渲染 SQL 输出（包括 SQL 语句、数据表格等）
   */
  const renderSqlOutput = (output: any): React.ReactNode => {
    if (!output || typeof output !== 'object') {
      return <div className="text-sm text-gray-500">暂无数据</div>;
    }
    console.log('output', output);

    // 转换数据为 ChartDataSchema 格式
    const chartData = output.data && Array.isArray(output.data) && output.data.length > 0
      ? convertDataToChartSchema(output.data)
      : null;

    return (
      <div className="space-y-4">
        {/* 标题和消息 */}
        {output.title && (
          <div className="text-base font-semibold text-gray-900">{output.title}</div>
        )}
        {output.message && (
          <div className="text-sm text-gray-700">{output.message}</div>
        )}

        {/* SQL 语句 */}
        {output.sql && (
          <div>
            <h4 className="text-sm font-bold text-gray-900 mb-2">SQL 语句</h4>
            <div className="border border-gray-200 rounded-lg overflow-hidden" style={{ height: '300px' }}>
              <CodeViewTool
                code={typeof output.sql === 'string' ? output.sql : String(output.sql)}
                language="sql"
                width="100%"
                height="100%"
              />
            </div>
          </div>
        )}

        {/* 数据源引用 */}
        {output.cites && Array.isArray(output.cites) && output.cites.length > 0 && (
          <div>
            <h4 className="text-sm font-bold text-gray-900 mb-2">数据源</h4>
            <div className="space-y-2">
              {output.cites.map((cite: any, index: number) => (
                <div key={index} className="text-sm text-gray-600">
                  <span className="font-medium">{cite.name || cite.id}</span>
                  {cite.description && <span className="ml-2 text-gray-500">({cite.description})</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 数据描述 */}
        {output.dataDesc && (
          <div className="text-sm text-gray-600">
            {output.dataDesc.return_records_num !== undefined && (
              <span>返回记录数: {output.dataDesc.return_records_num}</span>
            )}
            {output.dataDesc.real_records_num !== undefined && (
              <span className="ml-4">实际记录数: {output.dataDesc.real_records_num}</span>
            )}
          </div>
        )}

        {/* 数据表格 - 使用 TableView 组件 */}
        {chartData && (
          <div>
            <h4 className="text-sm font-bold text-gray-900 mb-2">查询结果</h4>
            <div className="border border-gray-200 rounded-lg p-4">
              <TableView
                data={chartData}
                maxHeight="400px"
                pagination={true}
                pageSize={10}
              />
            </div>
          </div>
        )}

        {/* 解释信息 */}
        {output.explanation && (
          <div>
            <h4 className="text-sm font-bold text-gray-900 mb-2">解释信息</h4>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap break-words font-mono">
                {JSON.stringify(output.explanation, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderJson2PlotOutput = (output: any): React.ReactNode => {
    // 检查 output 结构，支持两种格式：
    // 1. output.data 包含 ChartDataSchema
    // 2. output 直接是 ChartDataSchema
    const chartData: ChartDataSchema = output?.data;
    
    if (!chartData || !chartData.rows || chartData.rows.length === 0) {
      return (
        <div className="flex items-center justify-center text-gray-500 p-4">
          暂无数据
        </div>
      );
    }

    return (
      <Json2PlotContentView
        data={chartData}
        width="100%"
        height="400px"
      />
    );
  };

  // 判断是否有输入和输出
  const hasInput = input !== undefined && input !== null;
  const hasOutput = output !== undefined && output !== null;
  const hasBoth = hasInput && hasOutput;
  

  // 渲染输入内容
  const renderInputContent = () => {
    if (!hasInput) return null;

    if (isExecuteCodeTool()) {
      return (
        <div className="h-full flex flex-col">
          <h3 className="text-sm font-bold text-gray-900 mb-3">输入</h3>
          <div className="flex-1 overflow-hidden">
            {renderCodeInput(input)}
          </div>
        </div>
      );
    }

    if (isText2SqlTool()) {
      return (
        <div className="h-full flex flex-col">
          <h3 className="text-sm font-bold text-gray-900 mb-3">查询输入</h3>
          <div className="flex-1 overflow-hidden">
            {renderSqlInput(input)}
          </div>
        </div>
      );
    }

    if (isJson2PlotTool()) {
      return (
        <div className="h-full flex flex-col">
          <h3 className="text-sm font-bold text-gray-900 mb-3">输入</h3>
          <div className="flex-1 overflow-hidden">
            {renderJson2PlotInput(input)}
          </div>
        </div>
      );
    }
    return (
      <div className="h-full flex flex-col">
        <h3 className="text-sm font-bold text-gray-900 mb-3">输入</h3>
        <div className="flex-1 overflow-y-auto">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <pre className="text-sm text-gray-700 whitespace-pre-wrap break-words font-mono">
              {formatData(input)}
            </pre>
          </div>
        </div>
      </div>
    );
  };

  // 渲染输出内容
  const renderOutputContent = () => {
    if (!hasOutput) return null;

    if (isExecuteCodeTool()) {
      return (
        <div className="h-full flex flex-col">
          <h3 className="text-sm font-bold text-gray-900 mb-3">输出</h3>
          <div className="flex-1 overflow-y-auto">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-x-auto">
              {renderCodeOutput(typeof output === 'string' ? output : formatData(output))}
            </div>
          </div>
        </div>
      );
    }

    if (isText2SqlTool()) {
      return renderSqlOutput(output);
    }

    if (isJson2PlotTool()) {
      return renderJson2PlotOutput(output);
    }

    return (
      <div className="h-full flex flex-col">
        <h3 className="text-sm font-bold text-gray-900 mb-3">输出</h3>
        <div className="flex-1 overflow-y-auto">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <pre className="text-sm text-gray-700 whitespace-pre-wrap break-words font-mono">
              {formatData(output)}
            </pre>
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* 遮罩层 */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* 抽屉内容 */}
      <div
        ref={drawerRef}
        className="fixed right-0 top-0 bottom-0 w-[600px] max-w-[90vw] bg-white shadow-xl z-50 flex flex-col animate-slide-in-right"
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            {renderIcon()}
            <h2 className="text-lg font-semibold text-gray-900">{toolTitle}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            aria-label="关闭"
          >
            <svg
              className="w-5 h-5 text-gray-500"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M18 6L6 18M6 6L18 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* 内容区域 - 根据是否有输入输出决定布局 */}
        <div
          ref={contentRef}
          className="flex-1 flex flex-col overflow-y-auto px-6 py-4"
          style={{
            minHeight: hasBoth ? '616px' : '300px', // 两个区域最小高度300px + 拖拽组件16px = 616px
          }}
        >
          {hasBoth ? (
            <>
              {/* 输入区域 */}
              <div
                className="flex-shrink-0"
                style={{
                  height: `${topHeight}%`,
                  minHeight: '300px',
                }}
              >
                {renderInputContent()}
              </div>

              {/* 拖拽分割线 - 参考Figma设计 */}
              <div
                ref={resizeHandleRef}
                onMouseDown={handleMouseDown}
                className="flex-shrink-0 w-full h-4 flex items-center justify-center cursor-ns-resize relative group"
                style={{
                  padding: '6px 0',
                }}
              >
                <div className="flex flex-col items-center justify-center gap-1">
                  <div className="w-4 h-px bg-black opacity-60" />
                  <div className="w-4 h-px bg-black opacity-60" />
                </div>
              </div>

              {/* 输出区域 */}
              <div
                className="flex-shrink-0"
                style={{
                  height: `${100 - topHeight}%`,
                  minHeight: '300px',
                }}
              >
                {renderOutputContent()}
              </div>
            </>
          ) : hasInput ? (
            /* 只有输入 */
            <div className="flex-shrink-0 flex-1" style={{ minHeight: '300px' }}>
              {renderInputContent()}
            </div>
          ) : hasOutput ? (
            /* 只有输出 */
            <div className="flex-shrink-0 flex-1" style={{ minHeight: '300px' }}>
              {renderOutputContent()}
            </div>
          ) : (
            /* 无数据 */
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-gray-400 py-8">暂无数据</div>
            </div>
          )}
        </div>
      </div>

      {/* 添加滑入动画的样式 */}
      <style>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </>
  );
};

export default ToolDrawer;
