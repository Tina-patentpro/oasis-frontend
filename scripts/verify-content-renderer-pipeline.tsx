import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ReactMarkdown from 'react-markdown'
import rehypeKatex from 'rehype-katex'
import rehypeSanitize from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'

import { transformContentUrl } from '../src/components/ContentRenderer/content-url-transform'
import { normalizeMathDelimiters } from '../src/components/ContentRenderer/math-delimiters'
import { contentSanitizeSchema } from '../src/components/ContentRenderer/sanitize-schema'

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

const source = normalizeMathDelimiters(`
[危险链接](javascript:alert(1))

$$E=mc^2$$

| 项 | 值 |
| --- | --- |
| a | b |
`)

const html = renderToStaticMarkup(
  <ReactMarkdown
    remarkPlugins={[remarkGfm, remarkMath]}
    rehypePlugins={[rehypeKatex, rehypeSanitize(contentSanitizeSchema) as never]}
    urlTransform={transformContentUrl}
  >
    {source}
  </ReactMarkdown>,
)

assert(!html.includes('javascript:alert'), 'unsafe javascript link survived markdown pipeline')
assert(
  transformContentUrl('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==', 'src', {
    tagName: 'img',
  }) === '',
  'unsafe data html image URL survived ContentRenderer URL transform',
)
assert(html.includes('class="katex"'), 'KaTeX math was not rendered by the real plugin pipeline')
assert(html.includes('<table>'), 'GFM table was not rendered by the real plugin pipeline')
assert(html.includes('<td>a</td>'), 'GFM table body was not rendered by the real plugin pipeline')

console.log('CONTENT_RENDERER_PIPELINE_OK')
