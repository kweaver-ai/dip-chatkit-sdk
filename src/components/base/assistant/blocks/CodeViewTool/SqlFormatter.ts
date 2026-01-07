import { format } from 'sql-formatter-plush';

/**
 * SQL 格式化选项
 */
export interface SqlFormatOptions {
  /** 缩进字符，默认为2个空格 */
  indent?: string;
  /** 是否大写关键字，默认为true */
  uppercase?: boolean;
  /** SQL 语言类型，默认为 'sql' */
  language?: string;
}

/**
 * 格式化 SQL 代码
 * 
 * @param sql - 需要格式化的 SQL 代码
 * @param options - 格式化选项
 * @returns 格式化后的 SQL 代码，格式化失败时返回原始代码
 * 
 * @example
 * ```typescript
 * const formatted = formatSql('SELECT * FROM users WHERE id=1');
 * ```
 */
export const formatSql = (sql: string, options?: SqlFormatOptions): string => {
  if (!sql || typeof sql !== 'string') {
    return sql || '';
  }

  try {
    const defaultOptions = {
      indent: '  ', // 2个空格
      language: 'sql',
      uppercase: true,
      ...options,
    };

    return format(sql, {
      indent: defaultOptions.indent,
      language: defaultOptions.language as any,
      uppercase: defaultOptions.uppercase,
    });
  } catch (error) {
    // 格式化失败时返回原代码
    console.warn('SQL格式化失败:', error);
    return sql;
  }
};
