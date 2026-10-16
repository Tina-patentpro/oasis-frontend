import { describe, expect, jest, test } from '@jest/globals'
import { render, screen, waitFor } from '@testing-library/react'

jest.mock('react-markdown', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react')

  const MockReactMarkdown = ({ children, components }: any) => {
    const source = String(children ?? '')
    const mermaidMatch = source.match(/```mermaid\n([\s\S]*?)```/)
    if (!mermaidMatch) {
      return ReactModule.createElement('p', null, source)
    }

    return components.code({
      inline: false,
      className: 'language-mermaid',
      children: mermaidMatch[1],
    })
  }

  return {
    __esModule: true,
    default: MockReactMarkdown,
  }
})

jest.mock('rehype-katex', () => ({}))
jest.mock('rehype-sanitize', () => {
  const plugin = () => ({})
  return Object.assign(plugin, { default: plugin })
})
jest.mock('remark-gfm', () => ({}))
jest.mock('remark-math', () => ({}))

jest.mock('react-syntax-highlighter', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react')
  const MockSyntaxHighlighter = ({ children, language }: any) =>
    ReactModule.createElement('pre', { 'data-language': language }, children)

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

jest.mock('@/config/runtime-env', () => ({
  getViteApiBaseUrl: jest.fn(() => 'https://api.example.com/api'),
}))

jest.mock('./MermaidChart', () => {
  throw new Error('Failed to fetch dynamically imported module: /assets/MermaidChart.js')
})

import { ContentRenderer } from './index'

describe('ContentRenderer Mermaid chunk boundary', () => {
  test('falls back to Mermaid source when the MermaidChart chunk fails to load', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)

    render(<ContentRenderer content={'```mermaid\ngraph TD\nA[输入] --> B[输出]\n```'} />)

    await waitFor(() => {
      expect(screen.getByText('Mermaid 图表组件加载失败，已显示源码。')).toBeInTheDocument()
    })
    expect(screen.getByText(/A\[输入\] --> B\[输出\]/)).toBeInTheDocument()

    consoleSpy.mockRestore()
  })
})
