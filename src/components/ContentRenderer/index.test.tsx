import { describe, expect, jest, test } from '@jest/globals'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

jest.mock('react-markdown', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react')

  const appendInlineText = (value: string, children: any[], keyPrefix: string, components: any) => {
    const inlineCodePattern = /`([^`]+)`/g
    let lastIndex = 0
    let inlineMatch: RegExpExecArray | null

    while ((inlineMatch = inlineCodePattern.exec(value)) !== null) {
      const textBefore = value.slice(lastIndex, inlineMatch.index)
      if (textBefore) {
        children.push(textBefore)
      }

      const codeText = inlineMatch[1]
      children.push(
        components?.code
          ? components.code({
              key: `inline-code-${keyPrefix}-${inlineMatch.index}`,
              children: codeText,
            })
          : ReactModule.createElement(
              'code',
              { key: `inline-code-${keyPrefix}-${inlineMatch.index}` },
              codeText,
            ),
      )
      lastIndex = inlineCodePattern.lastIndex
    }

    const remainingText = value.slice(lastIndex)
    if (remainingText) {
      children.push(remainingText)
    }
  }

  const renderParagraph = (text: string, key: string, components: any, urlTransform?: any) => {
    const markdownLinkPattern = /(!?)\[([^\]]*)\]\((?:<([^>]+)>|([^)]+))\)/g
    const children = []
    let lastIndex = 0
    let markdownMatch: RegExpExecArray | null

    while ((markdownMatch = markdownLinkPattern.exec(text)) !== null) {
      const textBefore = text.slice(lastIndex, markdownMatch.index)
      if (textBefore) {
        appendInlineText(textBefore, children, `${key}-${markdownMatch.index}`, components)
      }

      const isImage = markdownMatch[1] === '!'
      const label = markdownMatch[2]
      const url = markdownMatch[3] ?? markdownMatch[4]

      if (isImage) {
        const imageUrl =
          typeof urlTransform === 'function' ? urlTransform(url, 'src', { tagName: 'img' }) : url

        children.push(
          components?.img
            ? components.img({ key: `img-${markdownMatch.index}`, src: imageUrl, alt: label })
            : ReactModule.createElement('img', {
                key: `img-${markdownMatch.index}`,
                src: imageUrl,
                alt: label,
              }),
        )
      } else {
        const linkUrl =
          typeof urlTransform === 'function' ? urlTransform(url, 'href', { tagName: 'a' }) : url

        children.push(
          components?.a
            ? components.a({ key: `link-${markdownMatch.index}`, href: linkUrl, children: label })
            : ReactModule.createElement(
                'a',
                {
                  key: `link-${markdownMatch.index}`,
                  href: linkUrl,
                },
                label,
              ),
        )
      }

      lastIndex = markdownLinkPattern.lastIndex
    }

    const remainingText = text.slice(lastIndex)
    if (remainingText) {
      appendInlineText(remainingText, children, `${key}-remaining`, components)
    }

    return ReactModule.createElement('p', { key }, children)
  }

  const MockReactMarkdown = ({ children, components, urlTransform }: any) => {
    const source = String(children ?? '')
    if (source.includes('__THROW_MARKDOWN_AST__')) {
      throw new Error('network while parsing markdown ast')
    }
    const nodes = []
    const fencePattern = /```([^\n]*)\n([\s\S]*?)```/g
    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = fencePattern.exec(source)) !== null) {
      const textBefore = source.slice(lastIndex, match.index).trim()
      if (textBefore) {
        nodes.push(renderParagraph(textBefore, `text-${match.index}`, components, urlTransform))
      }

      const language = match[1].trim()
      const code = match[2]
      const codeNode = components?.code
        ? components.code({
            inline: false,
            className: language ? `language-${language}` : undefined,
            children: code,
          })
        : ReactModule.createElement('code', null, code)

      nodes.push(
        ReactModule.createElement(ReactModule.Fragment, { key: `code-${match.index}` }, codeNode),
      )
      lastIndex = fencePattern.lastIndex
    }

    const textAfter = source.slice(lastIndex).trim()
    if (textAfter) {
      nodes.push(renderParagraph(textAfter, 'text-after', components, urlTransform))
    }

    return ReactModule.createElement(ReactModule.Fragment, null, nodes)
  }

  return {
    __esModule: true,
    default: MockReactMarkdown,
  }
})

jest.mock('rehype-katex', () => ({}), { virtual: true })
jest.mock(
  'rehype-sanitize',
  () => ({
    __esModule: true,
    default: () => ({}),
  }),
  { virtual: true },
)
jest.mock('remark-gfm', () => ({}), { virtual: true })
jest.mock('remark-math', () => ({}), { virtual: true })

jest.mock('react-syntax-highlighter', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react')
  const MockSyntaxHighlighter = ({ children, language }: any) =>
    ReactModule.createElement(
      'pre',
      {
        'data-language': language,
        'data-testid': 'syntax-block',
      },
      children,
    )

  MockSyntaxHighlighter.registerLanguage = jest.fn()

  return {
    PrismLight: MockSyntaxHighlighter,
  }
})

jest.mock('react-syntax-highlighter/dist/esm/styles/prism/one-dark', () => ({}))
jest.mock('react-syntax-highlighter/dist/esm/languages/prism/bash', () => ({}))
jest.mock('react-syntax-highlighter/dist/esm/languages/prism/diff', () => ({}))
jest.mock('react-syntax-highlighter/dist/esm/languages/prism/javascript', () => ({}))
jest.mock('react-syntax-highlighter/dist/esm/languages/prism/json', () => ({}))
jest.mock('react-syntax-highlighter/dist/esm/languages/prism/markdown', () => ({}))
jest.mock('react-syntax-highlighter/dist/esm/languages/prism/markup', () => ({}))
jest.mock('react-syntax-highlighter/dist/esm/languages/prism/python', () => ({}))
jest.mock('react-syntax-highlighter/dist/esm/languages/prism/sql', () => ({}))
jest.mock('react-syntax-highlighter/dist/esm/languages/prism/tsx', () => ({}))
jest.mock('react-syntax-highlighter/dist/esm/languages/prism/typescript', () => ({}))
jest.mock('react-syntax-highlighter/dist/esm/languages/prism/yaml', () => ({}))

jest.mock('./MermaidChart', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react')

  return {
    MermaidChart: ({ chart }: { chart: string }) =>
      ReactModule.createElement('div', { 'data-testid': 'mermaid-chart' }, chart),
  }
})

jest.mock('@/config/runtime-env', () => ({
  getViteApiBaseUrl: jest.fn(() => 'https://api.example.com/api'),
}))

import { ContentRenderer } from './index'

describe('ContentRenderer oasis-actions integration', () => {
  test('renders oasis-actions code block as action buttons', async () => {
    const user = userEvent.setup()
    const onFill = jest.fn()

    render(
      <ContentRenderer
        content={
          '请选择：\n\n```oasis-actions\n' +
          JSON.stringify({
            version: '1.0',
            title: '下一步',
            actions: [
              {
                id: 'generate_claims',
                label: '生成权利要求书',
                type: 'fill',
                query: '请生成权利要求书。',
              },
            ],
          }) +
          '\n```'
        }
        onOasisActionFill={onFill}
      />,
    )

    await user.click(screen.getByRole('button', { name: '生成权利要求书' }))

    expect(onFill).toHaveBeenCalledWith('请生成权利要求书。')
  })

  test('falls back to code block for invalid oasis-actions JSON', () => {
    render(<ContentRenderer content={'```oasis-actions\n{bad json\n```'} />)

    expect(screen.getByTestId('syntax-block')).toHaveAttribute('data-language', 'oasis-actions')
    expect(screen.getByText('{bad json')).toBeInTheDocument()
  })

  test('normal code blocks still render as code', () => {
    render(<ContentRenderer content={'```json\n{"hello":"world"}\n```'} />)

    expect(screen.getByTestId('syntax-block')).toHaveAttribute('data-language', 'json')
    expect(screen.getByText('{"hello":"world"}')).toBeInTheDocument()
  })

  test('renders inline code inside rich text without creating a pre block', () => {
    render(<ContentRenderer content={'关键字段：`project_id` 应保持稳定。'} />)

    expect(screen.getByText('project_id')).toBeInTheDocument()
    expect(screen.queryByTestId('syntax-block')).not.toBeInTheDocument()
  })

  test('renders Mermaid fenced code with MermaidChart instead of a generic code block', async () => {
    render(
      <ContentRenderer
        content={[
          '```mermaid',
          'flowchart TD',
          '  A[开始] --> B[真实输入]',
          '  B --> C[页面渲染]',
          '```',
        ].join('\n')}
      />,
    )

    expect(await screen.findByTestId('mermaid-chart')).toHaveTextContent('flowchart TD')
    expect(screen.queryByTestId('syntax-block')).not.toBeInTheDocument()
  })

  test('does not render action buttons when one message contains multiple oasis-actions blocks', () => {
    const firstBlock = JSON.stringify({
      version: '1.0',
      title: '第一组',
      actions: [{ id: 'first', label: '第一组按钮', type: 'fill', query: '第一组指令。' }],
    })
    const secondBlock = JSON.stringify({
      version: '1.0',
      title: '第二组',
      actions: [{ id: 'second', label: '第二组按钮', type: 'fill', query: '第二组指令。' }],
    })

    render(
      <ContentRenderer
        content={`请选择：\n\n\`\`\`oasis-actions\n${firstBlock}\n\`\`\`\n\n\`\`\`oasis-actions\n${secondBlock}\n\`\`\``}
        onOasisActionFill={jest.fn()}
      />,
    )

    expect(screen.queryByRole('button', { name: '第一组按钮' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '第二组按钮' })).not.toBeInTheDocument()
    expect(screen.getAllByTestId('syntax-block')).toHaveLength(2)
  })

  test('source render mode does not turn oasis-actions into buttons', () => {
    render(
      <ContentRenderer
        content={
          '```oasis-actions\n' +
          JSON.stringify({
            version: '1.0',
            title: '下一步',
            actions: [
              {
                id: 'generate_claims',
                label: '生成权利要求书',
                type: 'fill',
                query: '请生成权利要求书。',
              },
            ],
          }) +
          '\n```'
        }
        onOasisActionFill={jest.fn()}
        renderMode="source"
      />,
    )

    expect(screen.queryByRole('button', { name: '生成权利要求书' })).not.toBeInTheDocument()
    expect(screen.getByText(/```oasis-actions/)).toBeInTheDocument()
  })

  test('hides thinking content regardless of think tag casing', () => {
    render(<ContentRenderer content={'<THINK>内部推理</THINK>\n最终正文'} />)

    expect(screen.getByText('最终正文')).toBeInTheDocument()
    expect(screen.queryByText('内部推理')).not.toBeInTheDocument()
  })

  test('renders restored markdown images with relative and https URLs', () => {
    render(
      <ContentRenderer
        content={
          '![生成图片](</files/tools/result.png?timestamp=1&sign=2>)\n\n' +
          '![远程图片](<https://example.com/result.webp>)'
        }
      />,
    )

    expect(screen.getByRole('img', { name: '生成图片' })).toHaveAttribute(
      'src',
      'https://api.example.com/files/tools/result.png?timestamp=1&sign=2',
    )
    expect(screen.getByRole('img', { name: '远程图片' })).toHaveAttribute(
      'src',
      'https://example.com/result.webp',
    )
  })

  test('opens restored images from the keyboard and exposes a close button', async () => {
    const user = userEvent.setup()
    const previousOverflow = document.body.style.overflow

    render(<ContentRenderer content={'![生成图片](<https://example.com/result.webp>)'} />)

    const previewButton = screen.getByRole('button', { name: '打开图片预览：生成图片' })

    previewButton.focus()
    await user.keyboard('{Enter}')

    expect(screen.getByRole('dialog', { name: '图片全屏预览' })).toBeInTheDocument()
    expect(document.body).toHaveStyle({ overflow: 'hidden' })
    const closePreviewButton = screen.getByRole('button', { name: '关闭图片预览' })

    closePreviewButton.focus()
    await user.keyboard('{Tab}')
    expect(closePreviewButton).toHaveFocus()

    await user.keyboard('{Shift>}{Tab}{/Shift}')
    expect(closePreviewButton).toHaveFocus()

    await user.keyboard('{Escape}')

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: '图片全屏预览' })).not.toBeInTheDocument()
    })
    await waitFor(() => expect(previewButton).toHaveFocus())
    expect(document.body.style.overflow).toBe(previousOverflow)
  })

  test('opens uppercase HTTPS and protocol-relative links in a new tab safely', () => {
    render(
      <ContentRenderer
        content={'[大写链接](<HTTPS://example.com/a>)\n\n[协议相对链接](<//example.com/b>)'}
      />,
    )

    const uppercaseLink = screen.getByRole('link', { name: '大写链接' })
    const protocolRelativeLink = screen.getByRole('link', { name: '协议相对链接' })

    expect(uppercaseLink).toHaveAttribute('target', '_blank')
    expect(uppercaseLink).toHaveAttribute('rel', 'noopener noreferrer')
    expect(protocolRelativeLink).toHaveAttribute('target', '_blank')
    expect(protocolRelativeLink).toHaveAttribute('rel', 'noopener noreferrer')
  })

  test('shows a local markdown fallback when markdown AST rendering fails', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)

    render(<ContentRenderer content={'__THROW_MARKDOWN_AST__\n\n原始 Markdown 源码'} />)

    expect(screen.getByText('Markdown 渲染失败，已显示源码。')).toBeInTheDocument()
    expect(screen.getByText('network while parsing markdown ast')).toBeInTheDocument()
    expect(screen.getByText(/原始 Markdown 源码/)).toBeInTheDocument()

    consoleSpy.mockRestore()
  })
})
