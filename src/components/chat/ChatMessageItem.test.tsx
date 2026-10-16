import { describe, expect, jest, test } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'

import type { Message, Theme } from '../../types'
import { MessageItem } from './ChatMessageItem'

jest.mock('../error-boundaries', () => ({
  ComponentErrorBoundary: ({ children }: { children: ReactNode }) => children,
}))

jest.mock('../ui', () => ({
  Tooltip: ({ children }: { children: ReactNode }) => children,
}))

jest.mock('../ContentRenderer', () => ({
  ContentRenderer: ({
    content,
    onOasisActionFill,
  }: {
    content?: string
    onOasisActionFill?: (query: string) => void
  }) => {
    const imageMatch = content?.match(/!\[([^\]]*)\]\(([^)]+)\)/)
    if (imageMatch) {
      return <img alt={imageMatch[1]} src={imageMatch[2]} />
    }

    return (
      <button type="button" onClick={() => onOasisActionFill?.('请继续处理。')}>
        填入指令
      </button>
    )
  },
}))

const theme: Theme = {
  background: '#f5fff8',
  primary: '#32c787',
  primaryHover: '#2cab74',
  name: 'green',
}

const oasisActionContent = `\`\`\`oasis-actions
{
  "version": "1.0",
  "title": "请选择下一步",
  "actions": [
    {
      "id": "fill-query",
      "label": "填入指令",
      "type": "fill",
      "query": "请继续处理。"
    }
  ]
}
\`\`\``

const message: Message = {
  id: 'assistant-1',
  role: 'assistant',
  content: oasisActionContent,
  createdAt: '2026-05-22T10:00:00.000Z',
}

describe('MessageItem', () => {
  test('uses theme foreground color for user message bubbles', () => {
    render(
      <MessageItem
        message={{ id: 'user-1', role: 'user', content: '浅色主题消息' }}
        theme={{ ...theme, primary: '#93c5fd', primaryForeground: '#111827' }}
      />,
    )

    expect(screen.getByText('浅色主题消息').parentElement).toHaveStyle({
      backgroundColor: '#93c5fd',
      color: '#111827',
    })
  })

  test('uses the latest oasis action fill callback after rerendering', async () => {
    const user = userEvent.setup()
    const firstFill = jest.fn()
    const latestFill = jest.fn()

    const { rerender } = render(
      <MessageItem message={message} theme={theme} onOasisActionFill={firstFill} />,
    )

    await screen.findByRole('button', { name: '填入指令' })

    rerender(<MessageItem message={message} theme={theme} onOasisActionFill={latestFill} />)

    await user.click(screen.getByRole('button', { name: '填入指令' }))

    expect(firstFill).not.toHaveBeenCalled()
    expect(latestFill).toHaveBeenCalledWith('请继续处理。')
  })

  test('renders markdown image content in assistant messages', () => {
    render(
      <MessageItem
        message={{
          id: 'assistant-image',
          role: 'assistant',
          content: '![生成图片](https://example.com/generated.png)',
        }}
        theme={theme}
      />,
    )

    expect(screen.getByRole('img', { name: '生成图片' })).toHaveAttribute(
      'src',
      'https://example.com/generated.png',
    )
  })

  test('copies assistant messages without hidden thinking content', async () => {
    const user = userEvent.setup()
    const onCopy = jest.fn()

    render(
      <MessageItem
        message={{
          id: 'assistant-think',
          role: 'assistant',
          content: '<think>内部推理</think>\n\n最终正文',
        }}
        theme={theme}
        onCopy={onCopy}
      />,
    )

    await user.click(screen.getByRole('button', { name: '复制' }))

    expect(onCopy).toHaveBeenCalledWith('最终正文')
    expect(onCopy).not.toHaveBeenCalledWith(expect.stringContaining('内部推理'))
  })

  test('announces assistant generation failures as alerts', () => {
    render(
      <MessageItem
        message={{
          id: 'assistant-error',
          role: 'assistant',
          content: '抱歉，生成中断。',
        }}
        theme={theme}
        hasError
        errorMessage="网络异常，请重试"
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('网络异常，请重试')
  })
})
