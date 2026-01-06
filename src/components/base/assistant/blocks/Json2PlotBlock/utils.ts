import type { EChartsOption } from 'echarts';
import { ChartDataSchema, ChartType } from '../../../../../types';

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
  const dimension = data.dimensions[0];
  const xAxisData = data.rows.map(row => formatDate(row[dimension.name]));
  
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
  
  const option: EChartsOption = {
    grid: {
      left: '10%',
      right: '15%',
      top: '10%',
      bottom: '10%',
    },
    tooltip: {
      trigger: 'axis',
    },
    legend: {
      data: data.measures.map(m => m.displayName),
      right: 0,
    },
    xAxis: {
      type: 'category',
      data: xAxisData,
      name: dimension.displayName,
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
  const dimension = data.dimensions[0];
  const xAxisData = data.rows.map(row => formatDate(row[dimension.name]));
  
  const series = data.measures.map(measure => ({
    name: measure.displayName,
    type: 'bar' as const,
    data: data.rows.map(row => row[measure.name]),
    barBorderRadius: [4, 4, 0, 0],
    barGap: '20%',
  }));
  
  const option: EChartsOption = {
    grid: {
      left: '10%',
      right: '15%',
      top: '10%',
      bottom: '10%',
    },
    tooltip: {
      trigger: 'axis',
    },
    legend: {
      data: data.measures.map(m => m.displayName),
      right: 0,
    },
    xAxis: {
      type: 'category',
      data: xAxisData,
      name: dimension.displayName,
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
  const dimension = data.dimensions[0];
  const measure = data.measures[0];
  
  const pieData = data.rows.map(row => ({
    name: String(row[dimension.name]),
    value: row[measure.name],
  }));
  
  const option: EChartsOption = {
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
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
  const dimension = data.dimensions[0];
  const measure = data.measures[0];
  
  const pieData = data.rows.map(row => ({
    name: String(row[dimension.name]),
    value: row[measure.name],
  }));
  
  const option: EChartsOption = {
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
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
