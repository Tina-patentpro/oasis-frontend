import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type FC,
} from 'react'
import { createPortal } from 'react-dom'
import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter'
import type { SyntaxHighlighterProps } from 'react-syntax-highlighter'
import oneDark from 'react-syntax-highlighter/dist/esm/styles/prism/one-dark'
import prismBash from 'react-syntax-highlighter/dist/esm/languages/prism/bash'
import prismDiff from 'react-syntax-highlighter/dist/esm/languages/prism/diff'
import prismJavaScript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript'
import prismJson from 'react-syntax-highlighter/dist/esm/languages/prism/json'
import prismMarkdown from 'react-syntax-highlighter/dist/esm/languages/prism/markdown'
import prismMarkup from 'react-syntax-highlighter/dist/esm/languages/prism/markup'
import prismPython from 'react-syntax-highlighter/dist/esm/languages/prism/python'
import prismSql from 'react-syntax-highlighter/dist/esm/languages/prism/sql'
import prismTsx from 'react-syntax-highlighter/dist/esm/languages/prism/tsx'
import prismTypeScript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript'
import prismYaml from 'react-syntax-highlighter/dist/esm/languages/prism/yaml'
import rehypeKatex from 'rehype-katex'
import rehypeSanitize from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'

import 'katex/dist/katex.min.css'
import './styles.css'

import { AccessibleDialog } from '@/components/ui/feedback/AccessibleDialog'
import { ComponentErrorBoundary } from '@/components/error-boundaries/ComponentErrorBoundary'
import { stripThinkingContent } from '@/utils/chatContentSanitizer'

import { transformContentUrl } from './content-url-transform'
import { normalizeMathDelimiters } from './math-delimiters'
import { normalizeMermaidBlocks } from './mermaid-blocks'
import { OasisActionsBlock } from './OasisActionsBlock'
import { parseOasisActionsPayload } from './oasis-actions'
import { contentSanitizeSchema } from './sanitize-schema'

const LazyMermaidChart = lazy(() =>
  import('./MermaidChart')
    .then((module) => ({
      default: module.MermaidChart,
    }))
    .catch((error) => {
      console.error('[ContentRenderer] Failed to load MermaidChart chunk', {
        stage: 'content-renderer-mermaid-chart-import',
        chunk: './MermaidChart',
        errorName: error instanceof Error ? error.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
        error,
      })
      throw error
    }),
)

const resolveRehypeSanitize = () => {
  const plugin = rehypeSanitize as unknown
  if (typeof plugin === 'function') {
    return plugin
  }
  if (
    plugin &&
    typeof plugin === 'object' &&
    'default' in plugin &&
    typeof plugin.default === 'function'
  ) {
    return plugin.default
  }
  return () => ({})
}

function isExternalHref(href?: string): boolean {
  const normalizedHref = href?.trim() ?? ''

  return /^https?:\/\//i.test(normalizedHref) || normalizedHref.startsWith('//')
}

SyntaxHighlighter.registerLanguage('bash', prismBash)
SyntaxHighlighter.registerLanguage('shell', prismBash)
SyntaxHighlighter.registerLanguage('sh', prismBash)
SyntaxHighlighter.registerLanguage('diff', prismDiff)
SyntaxHighlighter.registerLanguage('javascript', prismJavaScript)
SyntaxHighlighter.registerLanguage('js', prismJavaScript)
SyntaxHighlighter.registerLanguage('json', prismJson)
SyntaxHighlighter.registerLanguage('markdown', prismMarkdown)
SyntaxHighlighter.registerLanguage('md', prismMarkdown)
SyntaxHighlighter.registerLanguage('markup', prismMarkup)
SyntaxHighlighter.registerLanguage('html', prismMarkup)
SyntaxHighlighter.registerLanguage('xml', prismMarkup)
SyntaxHighlighter.registerLanguage('python', prismPython)
SyntaxHighlighter.registerLanguage('py', prismPython)
SyntaxHighlighter.registerLanguage('sql', prismSql)
SyntaxHighlighter.registerLanguage('tsx', prismTsx)
SyntaxHighlighter.registerLanguage('typescript', prismTypeScript)
SyntaxHighlighter.registerLanguage('ts', prismTypeScript)
SyntaxHighlighter.registerLanguage('yaml', prismYaml)
SyntaxHighlighter.registerLanguage('yml', prismYaml)

const OASIS_ACTIONS_FENCE_PATTERN = /^[ \t]*```oasis-actions[^\S\r\n]*\r?\n/gm

function countOasisActionsBlocks(value: string): number {
  return Array.from(value.matchAll(OASIS_ACTIONS_FENCE_PATTERN)).length
}

interface ContentRendererProps {
  content: string
  className?: string
  renderMode?: 'rich' | 'source'
  onOasisActionFill?: (query: string) => void
}

export const ContentRenderer: FC<ContentRendererProps> = ({
  content,
  className = '',
  renderMode = 'rich',
  onOasisActionFill,
}) => {
  type MarkdownCodeProps = ComponentPropsWithoutRef<'code'> & { inline?: boolean }
  type SyntaxTheme = Record<string, CSSProperties>
  const syntaxTheme = oneDark as SyntaxTheme

  const [fullscreenSrc, setFullscreenSrc] = useState<string | null>(null)
  const fullscreenCloseButtonRef = useRef<HTMLButtonElement | null>(null)
  const fullscreenTriggerRef = useRef<HTMLButtonElement | null>(null)

  const closeFullscreen = useCallback(() => {
    setFullscreenSrc(null)
    fullscreenTriggerRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!fullscreenSrc) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        closeFullscreen()
      }
    }
    // Register in capture phase to ensure priority over other Escape handlers
    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [fullscreenSrc, closeFullscreen])

  useEffect(() => {
    if (!fullscreenSrc) return

    const frameId = requestAnimationFrame(() => {
      fullscreenCloseButtonRef.current?.focus()
    })

    return () => {
      cancelAnimationFrame(frameId)
    }
  }, [fullscreenSrc])

  const cleanedContent = useMemo(() => {
    if (!content) return ''
    return stripThinkingContent(content)
  }, [content])

  const processedContent = useMemo(
    () => normalizeMathDelimiters(normalizeMermaidBlocks(cleanedContent)),
    [cleanedContent],
  )
  const oasisActionsBlockCount = useMemo(
    () => countOasisActionsBlocks(processedContent),
    [processedContent],
  )

  const components = useMemo<Components>(() => {
    const renderCode = ({
      inline,
      className: codeClassName,
      children,
      style: _style,
      ...props
    }: MarkdownCodeProps) => {
      const match = /language-([^\s]+)/.exec(codeClassName ?? '')
      const codeContent = String(children ?? '').replace(/\n$/, '')
      const language = match ? match[1] : ''

      if (!inline && language === 'oasis-actions' && oasisActionsBlockCount === 1) {
        const payload = parseOasisActionsPayload(codeContent)
        if (payload) {
          return <OasisActionsBlock payload={payload} onFill={onOasisActionFill} />
        }
      }

      if (language === 'mermaid') {
        return (
          <ComponentErrorBoundary
            componentName="MermaidChart"
            errorStage="content-renderer-mermaid-chart-import"
            chunkName="./MermaidChart"
            fallbackComponent={() => (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <div className="mb-2 font-medium">Mermaid 图表组件加载失败，已显示源码。</div>
                <pre className="code-block whitespace-pre-wrap break-words">{codeContent}</pre>
              </div>
            )}
          >
            <Suspense
              fallback={
                <pre className="code-block whitespace-pre-wrap break-words">
                  {String(children ?? '')}
                </pre>
              }
            >
              <LazyMermaidChart chart={codeContent} />
            </Suspense>
          </ComponentErrorBoundary>
        )
      }

      if (inline || !language) {
        return (
          <code className={codeClassName ?? ''} {...props}>
            {children}
          </code>
        )
      }

      return (
        <SyntaxHighlighter
          style={syntaxTheme as SyntaxHighlighterProps['style']}
          language={language || 'text'}
          PreTag="pre"
          className="code-block"
          showLineNumbers={!inline && codeContent.split('\n').length > 5}
          wrapLines
          {...props}
        >
          {codeContent}
        </SyntaxHighlighter>
      )
    }

    return {
      code: renderCode as Components['code'],
      table({ children, ...props }) {
        return (
          <div className="table-wrapper">
            <table {...props}>{children}</table>
          </div>
        )
      },
      img({ src, alt, ...props }) {
        const imageAlt = alt ?? ''
        const previewLabel = imageAlt ? `打开图片预览：${imageAlt}` : '打开图片预览'

        return (
          <button
            type="button"
            className="content-image-button"
            aria-label={previewLabel}
            disabled={!src}
            onClick={(e) => {
              if (src) {
                e.stopPropagation()
                fullscreenTriggerRef.current = e.currentTarget
                setFullscreenSrc(src)
              }
            }}
          >
            <img
              src={src ?? ''}
              alt={imageAlt}
              width={800}
              height={600}
              loading="lazy"
              className="content-image"
              {...props}
            />
          </button>
        )
      },
      a({ href, children, ...props }) {
        const isExternal = isExternalHref(href)
        return (
          <a
            href={href}
            target={isExternal ? '_blank' : undefined}
            rel={isExternal ? 'noopener noreferrer' : undefined}
            {...props}
          >
            {children}
          </a>
        )
      },
    } satisfies Components
  }, [syntaxTheme, oasisActionsBlockCount, onOasisActionFill])

  if (!cleanedContent || cleanedContent === '') {
    return (
      <div className={`content-renderer ${className}`}>
        <div className="content-renderer-empty">
          <div className="empty-icon">📝</div>
          <div className="empty-text">暂无生成内容</div>
          <div className="empty-hint">点击“生成”按钮开始创作</div>
        </div>
      </div>
    )
  }

  if (renderMode === 'source') {
    return (
      <div className={`content-renderer ${className}`}>
        <pre className="source-view">{cleanedContent}</pre>
      </div>
    )
  }

  return (
    <div className={`content-renderer ${className}`}>
      <div className="markdown-body">
        <ComponentErrorBoundary
          componentName="MarkdownAST"
          errorStage="content-renderer-markdown-ast"
          fallbackComponent={({ error }) => (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <div className="mb-2 font-medium">Markdown 渲染失败，已显示源码。</div>
              <div className="mb-2 text-xs text-amber-700">{error.message}</div>
              <pre className="code-block whitespace-pre-wrap break-words">{processedContent}</pre>
            </div>
          )}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex, resolveRehypeSanitize()(contentSanitizeSchema) as never]}
            urlTransform={transformContentUrl}
            components={components}
          >
            {processedContent}
          </ReactMarkdown>
        </ComponentErrorBoundary>
      </div>
      {fullscreenSrc &&
        createPortal(
          <AccessibleDialog
            isOpen={Boolean(fullscreenSrc)}
            onClose={closeFullscreen}
            label="图片全屏预览"
            initialFocusRef={fullscreenCloseButtonRef}
            wrapperClassName="image-fullscreen-overlay"
            overlayClassName="bg-transparent"
            className="contents"
          >
            <button
              ref={fullscreenCloseButtonRef}
              type="button"
              className="image-fullscreen-close"
              aria-label="关闭图片预览"
              onClick={(e) => {
                e.stopPropagation()
                closeFullscreen()
              }}
            >
              ×
            </button>
            <img
              src={fullscreenSrc}
              alt="全屏预览"
              width={1600}
              height={1200}
              className="image-fullscreen"
              onClick={(e) => e.stopPropagation()}
            />
          </AccessibleDialog>,
          document.body,
        )}
    </div>
  )
}
