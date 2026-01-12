import type { EChartsOption } from 'echarts';
import { ChartDataSchema, ChartType } from '../../../../../types';

/**
 * 高对比度颜色调色板
 * 包含多种色相、亮度和饱和度，确保相邻颜色差异明显
 * 颜色按照色相环顺序排列，便于实现相邻区域颜色差异最大化
 */
const HIGH_CONTRAST_COLORS = [
  '#5470c6', // 蓝色
  '#91cc75', // 绿色
  '#fac858', // 黄色
  '#ee6666', // 红色
  '#73c0de', // 浅蓝色
  '#3ba272', // 深绿色
  '#fc8452', // 橙色
  '#9a60b4', // 紫色
  '#ea7ccc', // 粉色
  '#ff9f7f', // 珊瑚色
  '#ffdb5c', // 金黄色
  '#37a2da', // 天蓝色
  '#dd6b66', // 玫瑰色
  '#759aa0', // 青灰色
  '#e69d87', // 桃色
  '#8dc1a9', // 薄荷绿
  '#ffa07a', // 浅橙色
  '#20b2aa', // 浅海绿
  '#87ceeb', // 天蓝色
  '#da70d6', // 兰花紫
  '#cd5c5c', // 印度红
  '#4ecdc4', // 青绿色
  '#45b7d1', // 天空蓝
  '#f7b731', // 亮黄色
  '#eb3b5a', // 深红色
  '#2d3436', // 深灰色
  '#00b894', // 翡翠绿
  '#ff6b9d', // 粉红色
  '#c44569', // 深粉红
  '#6c5ce7', // 紫蓝色
];

/**
 * 获取优化后的颜色数组，确保相邻区域颜色差异明显
 * @param count 需要的颜色数量
 * @returns 颜色数组
 */
function getOptimizedColors(count: number): string[] {
  if (count <= 0) {
    return [];
  }

  const colorPaletteSize = HIGH_CONTRAST_COLORS.length;
  const colors: string[] = [];

  // 如果只需要一个颜色，直接返回
  if (count === 1) {
    return [HIGH_CONTRAST_COLORS[0]];
  }

  // 计算颜色索引的间隔，确保相邻颜色在色相环上分布均匀
  // 使用最大间隔分布，使相邻颜色差异最大化
  const step = Math.floor(colorPaletteSize / count);
  const indices: number[] = [];

  // 生成初始索引序列（按间隔分布）
  for (let i = 0; i < count; i++) {
    indices.push((i * step) % colorPaletteSize);
  }

  // 重新排列索引，使相邻索引差异最大化
  // 使用交替取首尾的策略，确保相邻索引差异大
  const optimizedIndices: number[] = [];
  const tempIndices = [...indices];
  
  // 交替从首尾取元素，确保相邻索引差异大
  let fromStart = true;
  while (tempIndices.length > 0) {
    if (fromStart) {
      optimizedIndices.push(tempIndices.shift()!);
    } else {
      optimizedIndices.push(tempIndices.pop()!);
    }
    fromStart = !fromStart;
  }

  // 如果数据项数量较少，进一步优化：确保首尾颜色也差异明显
  if (count <= colorPaletteSize / 2) {
    // 检查首尾颜色索引差异，如果太小则调整
    const firstIndex = optimizedIndices[0];
    const lastIndex = optimizedIndices[optimizedIndices.length - 1];
    const diff = Math.abs(firstIndex - lastIndex);
    
    // 如果首尾颜色索引差异小于调色板大小的一半，调整最后一个索引
    if (diff < colorPaletteSize / 2 && optimizedIndices.length > 1) {
      optimizedIndices[optimizedIndices.length - 1] = 
        (firstIndex + Math.floor(colorPaletteSize / 2)) % colorPaletteSize;
    }
  }

  // 生成最终颜色数组
  for (let i = 0; i < count; i++) {
    const colorIndex = optimizedIndices[i] % colorPaletteSize;
    colors.push(HIGH_CONTRAST_COLORS[colorIndex]);
  }

  return colors;
}

/**
 * 格式化日期
 */
export function formatDate(value: any): string {
  if (typeof value === 'string') {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      
      if (hours === '00' && minutes === '00' && seconds === '00') {
        return `${year}-${month}-${day}`;
      }
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
  }
  return String(value);
}

/**
 * 验证数据是否可以转换为指定图表类型
 */
export function validateChartType(data: ChartDataSchema, targetType: ChartType): string | null {
  if (!data || typeof data !== 'object') {
    return '数据格式错误';
  }
  
  if (!Array.isArray(data.dimensions) || data.dimensions.length === 0) {
    return '数据不支持';
  }
  
  if (!Array.isArray(data.measures) || data.measures.length === 0) {
    return '数据不支持';
  }
  
  if (!Array.isArray(data.rows) || data.rows.length === 0) {
    return '数据不支持';
  }
  
  // 饼图和环形图需要至少1个维度和1个度量
  if (targetType === 'Pie' || targetType === 'Circle') {
    if (data.dimensions.length < 1 || data.measures.length < 1) {
      return '数据不支持';
    }
  }
  
  // 验证 rows 中的数据是否包含所有必要的字段
  const allFieldNames = new Set([
    ...data.dimensions.map(d => d.name),
    ...data.measures.map(m => m.name)
  ]);
  
  for (let i = 0; i < data.rows.length; i++) {
    const row = data.rows[i];
    for (const fieldName of allFieldNames) {
      if (!(fieldName in row)) {
        return '数据不支持';
      }
    }
  }
  
  return null;
}

/**
 * 转换为折线图配置
 */
function convertToLineOption(data: ChartDataSchema): EChartsOption {
  const firstDimension = data.dimensions[0];
  const measure = data.measures[0];
  
  // 如果有多个维度，使用第二个维度作为系列
  if (data.dimensions.length > 1) {
    const secondDimension = data.dimensions[1];
    
    // 收集所有唯一的 X 轴值（第一个维度），数据已经是格式化后的，直接使用
    const xAxisValues = Array.from(new Set(data.rows.map(row => String(row[firstDimension.name])))).sort();
    
    // 收集所有唯一的系列值（第二个维度）
    const seriesValues = Array.from(new Set(data.rows.map(row => String(row[secondDimension.name])))).sort();
    
    // 创建数据映射：{ xValue: { seriesValue: measureValue } }
    const dataMap = new Map<string, Map<string, number>>();
    data.rows.forEach(row => {
      const xValue = String(row[firstDimension.name]);
      const seriesValue = String(row[secondDimension.name]);
      const measureValue = row[measure.name];
      
      if (!dataMap.has(xValue)) {
        dataMap.set(xValue, new Map());
      }
      dataMap.get(xValue)!.set(seriesValue, measureValue);
    });
    
    // 为每个系列创建折线数据
    const colors = getOptimizedColors(seriesValues.length);
    const series = seriesValues.map((seriesValue, index) => ({
      name: seriesValue,
      type: 'line' as const,
      smooth: true,
      lineStyle: { width: 2 },
      symbol: 'circle',
      symbolSize: 6,
      showSymbol: true,
      data: xAxisValues.map(xValue => {
        const seriesMap = dataMap.get(xValue);
        return seriesMap?.get(seriesValue) ?? null;
      }),
      itemStyle: {
        color: colors[index],
      },
    }));
    
    // 根据系列数量决定图例布局：超过8个时使用垂直布局放在右侧
    const legendItemCount = seriesValues.length;
    const useVerticalLegend = legendItemCount > 8;
    
    const option: EChartsOption = {
      color: colors,
      grid: {
        left: '10%',
        right: useVerticalLegend ? '20%' : '15%',
        top: '10%',
        bottom: useVerticalLegend ? '10%' : '15%',
      },
      tooltip: {
        trigger: 'axis',
      },
      legend: useVerticalLegend
        ? {
            data: seriesValues,
            orient: 'vertical',
            right: 10,
            top: 'center',
            type: 'scroll',
            pageButtonItemGap: 5,
            pageButtonGap: 10,
            pageButtonPosition: 'end',
            pageFormatter: '{current}/{total}',
            pageIconColor: '#666',
            pageIconInactiveColor: '#ccc',
            pageIconSize: 15,
            pageTextStyle: {
              color: '#333',
            },
          }
        : {
            data: seriesValues,
            top: 'top',
            left: 'center',
            type: 'scroll',
            pageButtonItemGap: 5,
            pageButtonGap: 10,
            pageButtonPosition: 'end',
            pageFormatter: '{current}/{total}',
            pageIconColor: '#666',
            pageIconInactiveColor: '#ccc',
            pageIconSize: 15,
            pageTextStyle: {
              color: '#333',
            },
          },
      xAxis: {
        type: 'category',
        data: xAxisValues,
        name: firstDimension.displayName,
      },
      yAxis: {
        type: 'value',
        name: measure.displayName,
      },
      series,
    };
    
    return option;
  }
  
  // 单维度情况：按 measures 创建系列，数据已经是格式化后的，直接使用
  const xAxisData = data.rows.map(row => String(row[firstDimension.name]));
  
  const series = data.measures.map(measure => ({
    name: measure.displayName,
    type: 'line' as const,
    smooth: true,
    lineStyle: { width: 2 },
    symbol: 'circle',
    symbolSize: 6,
    showSymbol: true,
    data: data.rows.map(row => row[measure.name]),
  }));
  
  const colors = getOptimizedColors(data.measures.length);
  
  const legendItemCount = data.measures.length;
  const useVerticalLegend = legendItemCount > 8;
  
  const option: EChartsOption = {
    color: colors,
    grid: {
      left: '10%',
      right: useVerticalLegend ? '20%' : '15%',
      top: '10%',
      bottom: useVerticalLegend ? '10%' : '15%',
    },
    tooltip: {
      trigger: 'axis',
    },
    legend: useVerticalLegend
      ? {
          data: data.measures.map(m => m.displayName),
          orient: 'vertical',
          right: 10,
          top: 'center',
          type: 'scroll',
          pageButtonItemGap: 5,
          pageButtonGap: 10,
          pageButtonPosition: 'end',
          pageFormatter: '{current}/{total}',
          pageIconColor: '#666',
          pageIconInactiveColor: '#ccc',
          pageIconSize: 15,
          pageTextStyle: {
            color: '#333',
          },
        }
      : {
          data: data.measures.map(m => m.displayName),
          top: 'top',
          left: 'center',
          type: 'scroll',
          pageButtonItemGap: 5,
          pageButtonGap: 10,
          pageButtonPosition: 'end',
          pageFormatter: '{current}/{total}',
          pageIconColor: '#666',
          pageIconInactiveColor: '#ccc',
          pageIconSize: 15,
          pageTextStyle: {
            color: '#333',
          },
        },
    xAxis: {
      type: 'category',
      data: xAxisData,
      name: firstDimension.displayName,
    },
    yAxis: {
      type: 'value',
    },
    series,
  };
  
  return option;
}

/**
 * 转换为柱状图配置
 */
function convertToColumnOption(data: ChartDataSchema): EChartsOption {
  const firstDimension = data.dimensions[0];
  const measure = data.measures[0];
  
  // 如果有多个维度，使用第二个维度作为系列
  if (data.dimensions.length > 1) {
    const secondDimension = data.dimensions[1];
    
    // 收集所有唯一的 X 轴值（第一个维度），数据已经是格式化后的，直接使用
    const xAxisValues = Array.from(new Set(data.rows.map(row => String(row[firstDimension.name])))).sort();
    
    // 收集所有唯一的系列值（第二个维度）
    const seriesValues = Array.from(new Set(data.rows.map(row => String(row[secondDimension.name])))).sort();
    
    // 创建数据映射：{ xValue: { seriesValue: measureValue } }
    const dataMap = new Map<string, Map<string, number>>();
    data.rows.forEach(row => {
      const xValue = String(row[firstDimension.name]);
      const seriesValue = String(row[secondDimension.name]);
      const measureValue = row[measure.name];
      
      if (!dataMap.has(xValue)) {
        dataMap.set(xValue, new Map());
      }
      dataMap.get(xValue)!.set(seriesValue, measureValue);
    });
    
    // 为每个系列创建柱状数据
    const colors = getOptimizedColors(seriesValues.length);
    const series = seriesValues.map((seriesValue, index) => ({
      name: seriesValue,
      type: 'bar' as const,
      barBorderRadius: [4, 4, 0, 0],
      data: xAxisValues.map(xValue => {
        const seriesMap = dataMap.get(xValue);
        return seriesMap?.get(seriesValue) ?? null;
      }),
      itemStyle: {
        color: colors[index],
      },
    }));
    
    // 根据系列数量决定图例布局：超过8个时使用垂直布局放在右侧
    const legendItemCount = seriesValues.length;
    const useVerticalLegend = legendItemCount > 8;
    
    const option: EChartsOption = {
      color: colors,
      grid: {
        left: '10%',
        right: useVerticalLegend ? '20%' : '15%',
        top: '10%',
        bottom: useVerticalLegend ? '10%' : '15%',
      },
      tooltip: {
        trigger: 'axis',
      },
      legend: useVerticalLegend
        ? {
            data: seriesValues,
            orient: 'vertical',
            right: 10,
            top: 'center',
            type: 'scroll',
            pageButtonItemGap: 5,
            pageButtonGap: 10,
            pageButtonPosition: 'end',
            pageFormatter: '{current}/{total}',
            pageIconColor: '#666',
            pageIconInactiveColor: '#ccc',
            pageIconSize: 15,
            pageTextStyle: {
              color: '#333',
            },
          }
        : {
            data: seriesValues,
            top: 'top',
            left: 'center',
            type: 'scroll',
            pageButtonItemGap: 5,
            pageButtonGap: 10,
            pageButtonPosition: 'end',
            pageFormatter: '{current}/{total}',
            pageIconColor: '#666',
            pageIconInactiveColor: '#ccc',
            pageIconSize: 15,
            pageTextStyle: {
              color: '#333',
            },
          },
      xAxis: {
        type: 'category',
        data: xAxisValues,
        name: firstDimension.displayName,
      },
      yAxis: {
        type: 'value',
        name: measure.displayName,
      },
      series,
    };
    
    return option;
  }
  
  // 单维度情况：按 measures 创建系列，数据已经是格式化后的，直接使用
  const xAxisData = data.rows.map(row => String(row[firstDimension.name]));
  
  const colors = getOptimizedColors(data.measures.length);
  const series = data.measures.map((measure, index) => ({
    name: measure.displayName,
    type: 'bar' as const,
    data: data.rows.map(row => row[measure.name]),
    barBorderRadius: [4, 4, 0, 0],
    barGap: '20%',
    itemStyle: {
      color: colors[index],
    },
  }));
  
  const legendItemCount = data.measures.length;
  const useVerticalLegend = legendItemCount > 8;
  
  const option: EChartsOption = {
    color: colors,
    grid: {
      left: '10%',
      right: useVerticalLegend ? '20%' : '15%',
      top: '10%',
      bottom: useVerticalLegend ? '10%' : '15%',
    },
    tooltip: {
      trigger: 'axis',
    },
    legend: useVerticalLegend
      ? {
          data: data.measures.map(m => m.displayName),
          orient: 'vertical',
          right: 10,
          top: 'center',
          type: 'scroll',
          pageButtonItemGap: 5,
          pageButtonGap: 10,
          pageButtonPosition: 'end',
          pageFormatter: '{current}/{total}',
          pageIconColor: '#666',
          pageIconInactiveColor: '#ccc',
          pageIconSize: 15,
          pageTextStyle: {
            color: '#333',
          },
        }
      : {
          data: data.measures.map(m => m.displayName),
          top: 'top',
          left: 'center',
          type: 'scroll',
          pageButtonItemGap: 5,
          pageButtonGap: 10,
          pageButtonPosition: 'end',
          pageFormatter: '{current}/{total}',
          pageIconColor: '#666',
          pageIconInactiveColor: '#ccc',
          pageIconSize: 15,
          pageTextStyle: {
            color: '#333',
          },
        },
    xAxis: {
      type: 'category',
      data: xAxisData,
      name: firstDimension.displayName,
    },
    yAxis: {
      type: 'value',
    },
    series,
  };
  
  return option;
}

/**
 * 转换为饼图配置
 */
function convertToPieOption(data: ChartDataSchema): EChartsOption {
  const firstDimension = data.dimensions[0];
  const measure = data.measures[0];
  
  // 如果有多个维度，使用第二个维度作为饼图数据项，并聚合数值
  if (data.dimensions.length > 1) {
    const secondDimension = data.dimensions[1];
    
    // 收集所有唯一的系列值（第二个维度）
    const seriesValues = Array.from(new Set(data.rows.map(row => String(row[secondDimension.name])))).sort();
    
    // 创建数据映射：{ seriesValue: totalValue }
    const dataMap = new Map<string, number>();
    data.rows.forEach(row => {
      const seriesValue = String(row[secondDimension.name]);
      const measureValue = row[measure.name] || 0;
      
      const currentValue = dataMap.get(seriesValue) || 0;
      dataMap.set(seriesValue, currentValue + measureValue);
    });
    
    // 获取优化后的颜色数组，参考柱状图的颜色方案
    const colors = getOptimizedColors(seriesValues.length);
    
    // 为每个系列创建饼图数据
    const pieData = seriesValues.map((seriesValue, index) => {
      const value = dataMap.get(seriesValue) || 0;
      return {
        name: seriesValue,
        value,
        itemStyle: {
          color: colors[index],
        },
      };
    });
    
    const option: EChartsOption = {
      color: colors,
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)',
      },
      legend: {
        orient: 'vertical',
        right: 10,
        top: 'center',
        type: pieData.length > 10 ? 'scroll' : 'plain',
        pageButtonItemGap: 5,
        pageButtonGap: 10,
        pageButtonPosition: 'end',
        pageFormatter: '{current}/{total}',
        pageIconColor: '#666',
        pageIconInactiveColor: '#ccc',
        pageIconSize: 15,
        pageTextStyle: {
          color: '#333',
        },
      },
      series: [
        {
          name: measure.displayName,
          type: 'pie' as const,
          radius: '70%',
          data: pieData,
          emphasis: {
            scale: true,
            scaleSize: 5,
          },
          label: {
            show: true,
            position: 'outside',
            formatter: '{b}: {c} ({d}%)',
          },
          labelLine: {
            show: true,
          },
        },
      ],
    };
    
    return option;
  }
  
  // 单维度情况：使用第一个维度
  const colors = getOptimizedColors(data.rows.length);
  
  // 为每个数据项添加颜色配置
  const pieData = data.rows.map((row, index) => ({
    name: String(row[firstDimension.name]),
    value: row[measure.name],
    itemStyle: {
      color: colors[index % colors.length],
    },
  }));
  
  const option: EChartsOption = {
    color: colors,
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
      type: pieData.length > 10 ? 'scroll' : 'plain',
      pageButtonItemGap: 5,
      pageButtonGap: 10,
      pageButtonPosition: 'end',
      pageFormatter: '{current}/{total}',
      pageIconColor: '#666',
      pageIconInactiveColor: '#ccc',
      pageIconSize: 15,
      pageTextStyle: {
        color: '#333',
      },
    },
    series: [
      {
        name: measure.displayName,
        type: 'pie' as const,
        radius: '70%',
        data: pieData,
        emphasis: {
          scale: true,
          scaleSize: 5,
        },
        label: {
          show: true,
          position: 'outside',
          formatter: '{b}: {c} ({d}%)',
        },
        labelLine: {
          show: true,
        },
      },
    ],
  };
  
  return option;
}

/**
 * 转换为环形图配置
 */
function convertToCircleOption(data: ChartDataSchema): EChartsOption {
  const firstDimension = data.dimensions[0];
  const measure = data.measures[0];
  
  // 如果有多个维度，使用第二个维度作为环形图数据项，并聚合数值
  if (data.dimensions.length > 1) {
    const secondDimension = data.dimensions[1];
    
    // 收集所有唯一的系列值（第二个维度）
    const seriesValues = Array.from(new Set(data.rows.map(row => String(row[secondDimension.name])))).sort();
    
    // 创建数据映射：{ seriesValue: totalValue }
    const dataMap = new Map<string, number>();
    data.rows.forEach(row => {
      const seriesValue = String(row[secondDimension.name]);
      const measureValue = row[measure.name] || 0;
      
      const currentValue = dataMap.get(seriesValue) || 0;
      dataMap.set(seriesValue, currentValue + measureValue);
    });
    
    // 获取优化后的颜色数组，参考柱状图的颜色方案
    const colors = getOptimizedColors(seriesValues.length);
    
    // 为每个系列创建环形图数据
    const pieData = seriesValues.map((seriesValue, index) => {
      const value = dataMap.get(seriesValue) || 0;
      return {
        name: seriesValue,
        value,
        itemStyle: {
          color: colors[index],
        },
      };
    });
    
    const option: EChartsOption = {
      color: colors,
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)',
      },
      legend: {
        orient: 'vertical',
        right: 10,
        top: 'center',
        type: pieData.length > 10 ? 'scroll' : 'plain',
        pageButtonItemGap: 5,
        pageButtonGap: 10,
        pageButtonPosition: 'end',
        pageFormatter: '{current}/{total}',
        pageIconColor: '#666',
        pageIconInactiveColor: '#ccc',
        pageIconSize: 15,
        pageTextStyle: {
          color: '#333',
        },
      },
      series: [
        {
          name: measure.displayName,
          type: 'pie' as const,
          radius: ['40%', '70%'],
          data: pieData,
          emphasis: {
            scale: true,
            scaleSize: 5,
          },
          label: {
            show: true,
            position: 'outside',
            formatter: '{b}: {c} ({d}%)',
          },
          labelLine: {
            show: true,
          },
        },
      ],
    };
    
    return option;
  }
  
  // 单维度情况：使用第一个维度
  const colors = getOptimizedColors(data.rows.length);
  
  // 为每个数据项添加颜色配置
  const pieData = data.rows.map((row, index) => ({
    name: String(row[firstDimension.name]),
    value: row[measure.name],
    itemStyle: {
      color: colors[index % colors.length],
    },
  }));
  
  const option: EChartsOption = {
    color: colors,
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
      type: pieData.length > 10 ? 'scroll' : 'plain',
      pageButtonItemGap: 5,
      pageButtonGap: 10,
      pageButtonPosition: 'end',
      pageFormatter: '{current}/{total}',
      pageIconColor: '#666',
      pageIconInactiveColor: '#ccc',
      pageIconSize: 15,
      pageTextStyle: {
        color: '#333',
      },
    },
    series: [
      {
        name: measure.displayName,
        type: 'pie' as const,
        radius: ['40%', '70%'],
        data: pieData,
        emphasis: {
          scale: true,
          scaleSize: 5,
        },
        label: {
          show: true,
          position: 'outside',
          formatter: '{b}: {c} ({d}%)',
        },
        labelLine: {
          show: true,
        },
      },
    ],
  };
  
  return option;
}

/**
 * 转换 ChartDataSchema 到 ECharts Option
 */
export function convertToEChartsOption(data: ChartDataSchema, chartType: ChartType): EChartsOption | null {
  const error = validateChartType(data, chartType);
  if (error) {
    return null;
  }
  
  try {
    switch (chartType) {
      case 'Line':
        return convertToLineOption(data);
      case 'Column':
        return convertToColumnOption(data);
      case 'Pie':
        return convertToPieOption(data);
      case 'Circle':
        return convertToCircleOption(data);
      default:
        return null;
    }
  } catch (error) {
    console.error('数据转换失败:', error);
    return null;
  }
}
