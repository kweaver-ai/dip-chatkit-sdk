import { ChatMessage, BlockType, ToolCallData } from '../types'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkBreaks from 'remark-breaks'
import remarkRehype from 'remark-rehype'
import rehypeHighlight from 'rehype-highlight'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import rehypeStringify from 'rehype-stringify'

/**
 * 生成 Word 兼容的 HTML
 */
export const generateWordCompatibleHTML = (html: string): string => {
  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>Document</title>
<style>
body {
    font-family: "Microsoft YaHei", "Segoe UI", sans-serif;
    font-size: 10.5pt;
    line-height: 1.15;
    margin: 20px;
}
h1, h2, h3, h4, h5, h6 {
    font-weight: bold;
    margin-top: 12pt;
    margin-bottom: 6pt;
}
h1 { font-size: 18pt; }
h2 { font-size: 15pt; }
h3 { font-size: 13pt; }
h4 { font-size: 11pt; }
h5 { font-size: 10pt; }
h6 { font-size: 9pt; }
p {
    margin: 0 0 12pt 0;
    line-height: 1.15;
}
pre {
    background-color: #f5f5f5;
    border: 1px solid #ddd;
    padding: 8pt;
    font-family: Consolas, monospace;
    font-size: 9pt;
    margin: 12pt 0;
}
code {
    font-family: Consolas, monospace;
    background-color: #f5f5f5;
    padding: 2px 4px;
    font-size: 9pt;
}
table {
    border-collapse: collapse;
    width: 100%;
    margin: 12pt 0;
    border: 1px solid #ddd;
}
th, td {
    border: 1px solid #ddd;
    padding: 6pt 8pt;
    text-align: left;
}
th {
    background-color: #f2f2f2;
    font-weight: bold;
}
blockquote {
    border-left: 4px solid #3498db;
    padding-left: 12pt;
    margin: 12pt 0;
    color: #666;
    font-style: italic;
}
ul, ol {
    margin: 12pt 0;
    padding-left: 24pt;
}
li {
    margin-bottom: 4pt;
}
hr {
    border: none;
    border-top: 1px solid #ddd;
    margin: 12pt 0;
}
strong {
    font-weight: bold;
}
em {
    font-style: italic;
}
</style>
</head>
<body>
${html}
</body>
</html>`
}

/**
 * 从 ChatMessage 中提取 Markdown 格式的内容
 */
export const extractMarkdownContent = (message: ChatMessage): string => {
  if (Array.isArray(message.content)) {
    return message.content
      .map((block) => {
        if (block.type === BlockType.TEXT || block.type === BlockType.MARKDOWN) {
          return block.content as string
        }
        if (block.type === BlockType.TOOL) {
          try {
            // 提取工具块的输入和输出
            const toolContent = block.content as ToolCallData
            let text = ''
            
            // 添加工具标题/名称
            if (toolContent?.title || toolContent?.name) {
              text += `**${toolContent.title || toolContent.name}**\n\n`
            }
            
            // 处理 input（可能是字符串或其他类型）
            if (toolContent?.input !== undefined && toolContent.input !== null) {
              try {
                if (typeof toolContent.input === 'string') {
                  text += `**输入：**\n\n\`\`\`\n${toolContent.input}\n\`\`\`\n\n`
                } else {
                  text += `**输入：**\n\n\`\`\`json\n${JSON.stringify(toolContent.input, null, 2)}\n\`\`\`\n\n`
                }
              } catch (err) {
                // JSON.stringify 失败时跳过 input
                console.warn('工具 input 处理失败:', err)
              }
            }
            
            // 处理 output（可能是字符串、对象或其他类型）
            if (toolContent?.output !== undefined && toolContent.output !== null) {
              try {
                if (typeof toolContent.output === 'string') {
                  text += `**输出：**\n\n${toolContent.output}`
                } else if (toolContent.output && typeof toolContent.output === 'object') {
                  // 如果是对象，优先提取 data 数组，否则序列化整个对象
                  if (Array.isArray(toolContent.output.data)) {
                    text += `**输出：**\n\n\`\`\`json\n${JSON.stringify(toolContent.output.data, null, 2)}\n\`\`\``
                  } else {
                    text += `**输出：**\n\n\`\`\`json\n${JSON.stringify(toolContent.output, null, 2)}\n\`\`\``
                  }
                } else {
                  // 其他类型，转为字符串
                  text += `**输出：**\n\n${String(toolContent.output)}`
                }
              } catch (err) {
                // output 处理失败时跳过
                console.warn('工具 output 处理失败:', err)
              }
            }
            
            return text
          } catch (err) {
            // 工具块处理失败时跳过该工具，返回空字符串
            console.warn('工具块处理失败:', err)
            return ''
          }
        }
        return ''
      })
      .filter((text) => text.trim().length > 0)
      .join('\n\n')
  }
  return (message.content as unknown as string) || ''
}

/**
 * 从 Markdown 内容中提取纯文本内容
 */
export const extractTextContent = (markdown: string): string => {
  // 简单去除 Markdown 标记，转换为纯文本
  return markdown
    .replace(/```[\s\S]*?```/g, '') // 移除代码块
    .replace(/`([^`]+)`/g, '$1') // 移除行内代码
    .replace(/#{1,6}\s+/g, '') // 移除标题标记
    .replace(/\*\*([^*]+)\*\*/g, '$1') // 移除粗体
    .replace(/\*([^*]+)\*/g, '$1') // 移除斜体
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // 移除链接
    .replace(/^\s*[-*+]\s+/gm, '') // 移除列表标记
    .replace(/^\s*\d+\.\s+/gm, '') // 移除有序列表标记
    .trim()
}

/**
 * 将 Markdown 转换为 HTML
 */
export const markdownToHtml = async (markdown: string): Promise<string> => {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkBreaks)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeHighlight)
    .use(rehypeKatex)
    // @ts-expect-error - rehype-stringify types may not match exactly
    .use(rehypeStringify, { allowDangerousHtml: true })

  const result = await processor.process(markdown)
  return String(result)
}

/**
 * 复制消息内容（支持富文本和纯文本）
 * @param message ChatMessage 对象
 * @returns Promise<boolean> 复制是否成功
 */
export const copyMessageContent = async (message: ChatMessage): Promise<boolean> => {
  const markdown = extractMarkdownContent(message)
  if (!markdown.trim()) {
    return false
  }

  try {
    // 将 Markdown 转换为 HTML
    const html = await markdownToHtml(markdown)
    const wordHTML = generateWordCompatibleHTML(html)

    // 创建 HTML Blob
    const htmlBlob = new Blob([wordHTML], { type: 'text/html' })

    // 创建纯文本 Blob 作为降级方案
    const textContent = extractTextContent(markdown)
    const textBlob = new Blob([textContent], { type: 'text/plain' })

    // 尝试使用现代 Clipboard API 复制富文本
    if (
      navigator.clipboard &&
      window.isSecureContext &&
      window.ClipboardItem
    ) {
      try {
        const clipboardItem = new ClipboardItem({
          'text/html': htmlBlob,
          'text/plain': textBlob,
        })
        await navigator.clipboard.write([clipboardItem])
        return true
      } catch (err) {
        // 如果 ClipboardItem 失败，降级到纯文本复制
        console.warn('富文本复制失败，降级到纯文本复制:', err)
      }
    }

    // 降级方案：复制纯文本
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(textContent)
      return true
    }

    // 最后降级方案：使用传统方法
    const textArea = document.createElement('textarea')
    textArea.value = textContent
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    try {
      const success = document.execCommand('copy')
      document.body.removeChild(textArea)
      return success
    } catch (err) {
      document.body.removeChild(textArea)
      console.error('复制失败:', err)
      return false
    }
  } catch (error) {
    console.error('复制失败:', error)
    return false
  }
}

