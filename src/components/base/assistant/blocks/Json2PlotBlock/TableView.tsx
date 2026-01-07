import React, { useState, useMemo, useEffect } from 'react';
import type { ChartDataSchema } from '../../../../../types';

/**
 * TableView 组件的属性接口
 */
export interface TableViewProps {
  /** 图表数据 Schema */
  data: ChartDataSchema;
  /** 表格最大高度 */
  maxHeight?: string | number;
  /** 是否启用分页，默认 false */
  pagination?: boolean;
  /** 每页显示条数，默认 10 */
  pageSize?: number;
}


/**
 * 下拉箭头图标组件
 */
const DropdownIcon: React.FC = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      opacity="0.25"
      d="M9.36 3H8.481C8.421 3 8.365 3.0293 8.329 3.07734L5 7.6664L1.671 3.07734C1.636 3.0293 1.579 3 1.52 3H0.641C0.565 3 0.52 3.08672 0.565 3.14883L4.697 8.8453C4.847 9.0516 5.154 9.0516 5.302 8.8453L9.435 3.14883C9.48 3.08672 9.436 3 9.36 3Z"
      fill="black"
    />
  </svg>
);

/**
 * TableView 组件
 * 纯表格渲染组件，负责渲染数据表格
 */
const TableView: React.FC<TableViewProps> = ({
  data,
  maxHeight = '400px',
  pagination = false,
  pageSize = 10,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageSize, setCurrentPageSize] = useState(pageSize);
  const [isPageSizeDropdownOpen, setIsPageSizeDropdownOpen] = useState(false);

  // 同步 pageSize prop 的变化
  useEffect(() => {
    setCurrentPageSize(pageSize);
    setCurrentPage(1); // 重置到第一页
  }, [pageSize]);

  const allColumns = [...data.dimensions, ...data.measures];
  
  // 计算总页数
  const totalPages = useMemo(() => {
    if (!pagination) {
      return 1;
    }
    return Math.ceil(data.rows.length / currentPageSize);
  }, [data.rows.length, pagination, currentPageSize]);

  // 当总页数变化时，如果当前页超出范围，重置到第一页
  useEffect(() => {
    if (pagination && currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [pagination, totalPages, currentPage]);
  
  // 计算分页数据
  const paginatedData = useMemo(() => {
    if (!pagination) {
      return data.rows;
    }
    
    const startIndex = (currentPage - 1) * currentPageSize;
    const endIndex = startIndex + currentPageSize;
    return data.rows.slice(startIndex, endIndex);
  }, [data.rows, pagination, currentPage, currentPageSize]);

  // 生成页码数组（最多显示7个页码）
  const pageNumbers = useMemo(() => {
    if (!pagination || totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    const pages: number[] = [];
    if (currentPage <= 4) {
      // 前几页：显示 1, 2, 3, 4, 5, ..., totalPages
      for (let i = 1; i <= 5; i++) {
        pages.push(i);
      }
      pages.push(-1); // 占位符表示省略号
      pages.push(totalPages);
    } else if (currentPage >= totalPages - 3) {
      // 后几页：显示 1, ..., totalPages-4, totalPages-3, totalPages-2, totalPages-1, totalPages
      pages.push(1);
      pages.push(-1);
      for (let i = totalPages - 4; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // 中间页：显示 1, ..., currentPage-1, currentPage, currentPage+1, ..., totalPages
      pages.push(1);
      pages.push(-1);
      for (let i = currentPage - 1; i <= currentPage + 1; i++) {
        pages.push(i);
      }
      pages.push(-1);
      pages.push(totalPages);
    }
    return pages;
  }, [pagination, totalPages, currentPage]);

  // 处理页码变化
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      setCurrentPage(page);
    }
  };

  // 处理每页条数变化
  const handlePageSizeChange = (size: number) => {
    setCurrentPageSize(size);
    setCurrentPage(1); // 重置到第一页
    setIsPageSizeDropdownOpen(false);
  };

  // 每页条数选项
  const pageSizeOptions = [10, 20, 50, 100];

  return (
    <div className="w-full flex flex-col min-h-0">
      {/* 表格区域 */}
      <div className="w-full overflow-x-auto overflow-y-auto flex-1 min-h-0" style={{ maxHeight }}>
        <table className="w-full border-collapse text-sm min-w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {allColumns.map((col, index) => (
                <th
                  key={index}
                  className="px-4 py-2 text-left font-medium text-gray-700 border-r border-gray-200 last:border-r-0 whitespace-nowrap"
                >
                  {col.displayName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="border-b border-gray-200 hover:bg-gray-50"
              >
                {allColumns.map((col, colIndex) => {
                  const cellValue = typeof row[col.name] === 'number'
                    ? row[col.name].toLocaleString()
                    : String(row[col.name] ?? '');
                  return (
                    <td
                      key={colIndex}
                      className="px-4 py-2 text-gray-600 border-r border-gray-200 last:border-r-0 whitespace-nowrap overflow-hidden text-ellipsis"
                      title={cellValue}
                    >
                      {cellValue}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 分页组件 */}
      {pagination && totalPages > 0 && (
        <div className="flex items-center justify-end mt-4 pt-4 border-t border-gray-200 gap-4 flex-shrink-0">
          {/* 左侧：上一页按钮和页码 */}
          <div className="flex items-center gap-2">
            {/* 上一页按钮 */}
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="flex items-center justify-center w-[22px] h-[22px] rounded border border-[#1677FF] bg-white hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:border-gray-300"
              aria-label="上一页"
            >
              {"<"}
            </button>

            {/* 页码按钮 */}
            <div className="flex items-center gap-1">
              {pageNumbers.map((page, index) => {
                if (page === -1) {
                  // 省略号（三个小圆点）
                  return (
                    <span key={`ellipsis-${index}`} className="px-1 flex items-center gap-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-300 inline-block" />
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-300 inline-block" />
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-300 inline-block" />
                    </span>
                  );
                }
                
                const isActive = page === currentPage;
                return (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`w-[22px] h-[22px] rounded border text-sm font-medium transition-colors flex items-center justify-center ${
                      isActive
                        ? 'bg-white border-[#1677FF] text-[#1677FF]'
                        : 'bg-transparent border-transparent text-black text-opacity-85 hover:bg-gray-50'
                    }`}
                    aria-label={`第 ${page} 页`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {page}
                  </button>
                );
              })}
            </div>

            {/* 下一页按钮 */}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="flex items-center justify-center w-[22px] h-[22px] rounded border border-[#1677FF] bg-white hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:border-gray-300"
              aria-label="下一页"
            >
              {">"}
            </button>
          </div>

          {/* 右侧：每页条数选择器 */}
          <div className="relative">
            <button
              onClick={() => setIsPageSizeDropdownOpen(!isPageSizeDropdownOpen)}
              className="flex items-center gap-1 px-3 h-6 rounded border border-black border-opacity-15 bg-white hover:bg-gray-50 text-sm text-gray-900"
              aria-label="每页条数"
            >
              <span className="text-black text-opacity-85">{currentPageSize}条/页</span>
              <DropdownIcon />
            </button>

            {/* 下拉菜单 */}
            {isPageSizeDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsPageSizeDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-1 w-20 bg-white border border-gray-200 rounded shadow-lg z-20">
                  {pageSizeOptions.map((size) => (
                    <button
                      key={size}
                      onClick={() => handlePageSizeChange(size)}
                      className={`w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50 first:rounded-t last:rounded-b ${
                        currentPageSize === size
                          ? 'bg-gray-50 text-blue-600'
                          : 'text-gray-700'
                      }`}
                    >
                      {size}条/页
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TableView;
