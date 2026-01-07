import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import { formatSql } from './SqlFormatter';

/**
 * CodeViewTool 组件的属性接口
 */
export interface CodeViewToolProps {
  /** 代码内容 */
  code: string;
  /** 代码语言类型（python、sql、javascript等） */
  language?: string;
  /** 编辑器宽度 */
  width?: string | number;
  /** 编辑器高度 */
  height?: string | number;
  /** 自定义样式类名 */
  className?: string;
}

/**
 * 自动识别代码语言
 * 
 * @param code - 代码内容
 * @returns 识别出的语言类型
 */
const detectLanguage = (code: string): string => {
  if (!code || typeof code !== 'string') {
    return 'python';
  }

  const trimmedCode = code.trim().toUpperCase();

  // SQL 识别规则
  if (
    /SELECT\s+/i.test(trimmedCode) ||
    /FROM\s+/i.test(trimmedCode) ||
    /WHERE\s+/i.test(trimmedCode) ||
    /INSERT\s+INTO/i.test(trimmedCode) ||
    /UPDATE\s+/i.test(trimmedCode) ||
    /DELETE\s+FROM/i.test(trimmedCode)
  ) {
    return 'sql';
  }

  // Python 识别规则
  if (
    /def\s+\w+\s*\(/.test(code) ||
    /import\s+\w+/.test(code) ||
    /from\s+\w+\s+import/.test(code) ||
    /print\s*\(/.test(code)
  ) {
    return 'python';
  }

  // JSON 识别规则
  if (
    (/^\{[\s\S]*\}$/.test(code.trim()) || /^\[[\s\S]*\]$/.test(code.trim())) &&
    /"[\w]+"\s*:/.test(code)
  ) {
    try {
      JSON.parse(code.trim());
      return 'json';
    } catch {
      // 不是有效的 JSON
    }
  }

  // JavaScript/TypeScript 识别规则
  if (
    /function\s+\w+\s*\(/.test(code) ||
    /const\s+\w+\s*=/.test(code) ||
    /let\s+\w+\s*=/.test(code) ||
    /var\s+\w+\s*=/.test(code)
  ) {
    return 'javascript';
  }

  // 默认返回 python
  return 'python';
};

/**
 * 将普通代码字符串包装成 Markdown fenced code block（安全处理反引号）
 */
const toFencedMarkdown = (code: string, language: string): string => {
  const src = code ?? '';
  // 找到代码中连续反引号的最大长度，保证 fence 比它多 1
  const matches = src.match(/`+/g);
  const maxTicks = matches ? Math.max(...matches.map((m) => m.length)) : 0;
  const fence = '`'.repeat(Math.max(3, maxTicks + 1));
  return `${fence}${language || ''}\n${src}\n${fence}`;
};

/**
 * CodeViewTool 组件
 * 用于在 ToolDrawer 中展示代码（Python、SQL等）的代码查看组件
 */
const CodeViewTool: React.FC<CodeViewToolProps> = ({
  code = '',
  language,
  width = '100%',
  height = '400px',
  className = '',
}) => {
  // 确定使用的语言
  const detectedLanguage = useMemo(() => {
    return language || detectLanguage(code);
  }, [code, language]);

  // 格式化代码（如果是 SQL）
  const formattedCode = useMemo(() => {
    if (detectedLanguage === 'sql' && code) {
      return formatSql(code);
    }
    return code || '';
  }, [code, detectedLanguage]);

  const markdown = useMemo(
    () => toFencedMarkdown(formattedCode, detectedLanguage),
    [formattedCode, detectedLanguage]
  );

  return (
    <div
      className={className}
      role="textbox"
      aria-label={`代码编辑器 - ${detectedLanguage}`}
      aria-readonly="true"
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        position: 'relative',
        overflow: 'auto',
      }}
    >
      <ReactMarkdown
        rehypePlugins={[rehypeHighlight]}
        components={{
          pre: ({ children, className: preClassName, ...props }) => {
            // 保留 highlight.js 添加的 hljs 类名
            const classes = preClassName 
              ? `${preClassName} m-0 text-sm leading-relaxed font-mono`
              : 'm-0 text-sm leading-relaxed font-mono';
            return (
              <pre {...props} className={classes}>
                {children}
              </pre>
            );
          },
          code: ({ children, className: codeClassName, ...props }) => {
            // 如果是代码块（有 className），保留 highlight.js 的所有类名
            // 如果是行内代码（无 className），使用默认样式
            if (codeClassName) {
              return (
                <code {...props} className={codeClassName}>
                  {children}
                </code>
              );
            }
            return (
              <code {...props} className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-sm font-mono">
                {children}
              </code>
            );
          },
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
};

export default CodeViewTool;
