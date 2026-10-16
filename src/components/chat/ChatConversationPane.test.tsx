import React from 'react'

import '@testing-library/jest-dom'
import { describe, expect, jest, test } from '@jest/globals'
import { fireEvent, render, screen } from '@testing-library/react'

import type { ChatSession, Theme } from '@/types'

import { ChatConversationPane } from './ChatConversationPane'

jest.mock('react-virtuoso', () => {
  const MockVirtuoso = React.forwardRef<HTMLDivElement, any>(
    ({ data = [], itemContent, ...props }, ref) => (
      <div ref={ref} {...props}>
        {data.map((item: any, index: number) => (
          <div key={item.id}>{itemContent(index, item)}</div>
        ))}
      </div>
    ),
  )
  MockVirtuoso.displayName = 'MockVirtuoso'

  return {
    Virtuoso: MockVirtuoso,
  }
})

jest.mock('../error-boundaries', () => ({
  ComponentErrorBoundary: ({ children }: { children: React.ReactNode }) => children,
}))

jest.mock('../ui', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => children,
}))

jest.mock('../ContentRenderer', () => ({
  ContentRenderer: ({ content }: { content: string }) => <div>{content}</div>,
}))

const theme: Theme = {
  background: '#eff6ff',
  primary: '#93c5fd',
  primaryHover: '#60a5fa',
  primaryForeground: '#111827',
  name: 'blue',
}

const session: ChatSession = {
  input: '',
  attachments: [],
  messages: [{ id: 'user-1', role: 'user', content: '搜索内容' }],
}

function renderPane(overrides: Partial<React.ComponentProps<typeof ChatConversationPane>> = {}) {
  return render(
    <ChatConversationPane
      chatTab="general"
      loading={false}
      currentTheme={theme}
      searchOpen
      searchQuery="搜索"
      onSearchQueryChange={jest.fn()}
      onSearchPrev={jest.fn()}
      onSearchNext={jest.fn()}
      onSearchClose={jest.fn()}
      searchMatchCount={2}
      searchCurrentIndex={0}
      session={session}
      virtuosoRef={React.createRef()}
      onBottomStateChange={jest.fn()}
      isMatch={() => false}
      onCopyMessage={jest.fn()}
      onRegenerate={jest.fn()}
      onSuggestionClick={jest.fn()}
      onOasisActionFill={jest.fn()}
      showScrollButton
      scrollButtonStyle={{ backgroundColor: theme.primary, color: theme.primaryForeground }}
      onScrollToBottom={jest.fn()}
      {...overrides}
    />,
  )
}

describe('ChatConversationPane', () => {
  test('announces search result count changes politely', () => {
    renderPane()

    expect(screen.getByText('1/2')).toHaveAttribute('aria-live', 'polite')
    expect(screen.getByText('1/2')).toHaveAttribute('aria-atomic', 'true')
  })

  test('keeps small search and scroll controls easy to tap and readable', () => {
    renderPane()

    expect(screen.getByRole('button', { name: '上一个匹配' })).toHaveClass('min-h-8')
    expect(screen.getByRole('button', { name: '下一个匹配' })).toHaveClass('min-w-8')
    expect(screen.getByRole('button', { name: '关闭搜索' })).toHaveClass('min-h-8')
    expect(screen.getByRole('button', { name: '回到底部' })).toHaveStyle({
      color: theme.primaryForeground,
    })
  })

  test('offers a cancel action while the assistant is generating', () => {
    const onCancelChatRequest = jest.fn()
    renderPane({ loading: true, searchOpen: false, onCancelChatRequest })

    fireEvent.click(screen.getByRole('button', { name: '取消生成' }))

    expect(onCancelChatRequest).toHaveBeenCalledTimes(1)
  })

  test('uses a distinct waiting color for the assistant generating banner', () => {
    renderPane({ loading: true, searchOpen: false })

    const generatingStatus = screen.getByRole('status', {
      name: 'AI 正在生成回复，请稍候…',
    })

    expect(generatingStatus).toHaveClass('bg-amber-50')
    expect(generatingStatus).toHaveClass('text-amber-900')
    expect(generatingStatus).not.toHaveStyle({ backgroundColor: theme.primary })
  })

  test('renders restored assistant-only history instead of empty state', () => {
    renderPane({
      searchOpen: false,
      session: {
        input: '',
        attachments: [],
        sessionId: 3002,
        messages: [
          {
            id: 'assistant-1',
            role: 'assistant',
            content: '已生成图片\n\n![mock-image.png](<data:image/png;base64,abc>)',
          },
        ],
      },
    })

    expect(screen.getByText(/已生成图片/)).toBeInTheDocument()
    expect(screen.queryByText('开始对话')).not.toBeInTheDocument()
  })

  test('keeps assistant-only greeting as empty state before a history session is loaded', () => {
    renderPane({
      searchOpen: false,
      session: {
        input: '',
        attachments: [],
        messages: [
          {
            id: 'assistant-greeting',
            role: 'assistant',
            content: '早上好，请告诉我当前任务。',
          },
        ],
      },
    })

    expect(screen.getByText('开始对话')).toBeInTheDocument()
    expect(screen.queryByText(/早上好/)).not.toBeInTheDocument()
  })

  test('closes search with Escape from the search box', () => {
    const onSearchClose = jest.fn()
    renderPane({ onSearchClose })

    fireEvent.keyDown(screen.getByRole('textbox', { name: '搜索对话内容' }), { key: 'Escape' })

    expect(onSearchClose).toHaveBeenCalledTimes(1)
  })
})
