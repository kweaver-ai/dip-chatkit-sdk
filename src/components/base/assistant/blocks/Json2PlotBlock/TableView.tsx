import React from 'react';
import type { ChartDataSchema } from '../../../../../types';

/**
 * TableView 组件的属性接口
 */
export interface TableViewProps {
  /** 图表数据 Schema */
  data: ChartDataSchema;
  /** 表格最大高度 */
  maxHeight?: string | number;
}

/**
 * TableView 组件
 * 纯表格渲染组件，负责渲染数据表格
 */
const TableView: React.FC<TableViewProps> = ({
  data,
  maxHeight = '400px',
}) => {
  const allColumns = [...data.dimensions, ...data.measures];
  
  return (
    <div className="w-full overflow-auto" style={{ maxHeight }}>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {allColumns.map((col, index) => (
              <th
                key={index}
                className="px-4 py-2 text-left font-medium text-gray-700 border-r border-gray-200 last:border-r-0"
              >
                {col.displayName}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className="border-b border-gray-200 hover:bg-gray-50"
            >
              {allColumns.map((col, colIndex) => (
                <td
                  key={colIndex}
                  className="px-4 py-2 text-gray-600 border-r border-gray-200 last:border-r-0"
                >
                  {typeof row[col.name] === 'number'
                    ? row[col.name].toLocaleString()
                    : String(row[col.name] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TableView;
