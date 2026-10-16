import type { ComponentType, ReactNode } from 'react'
import { describe, expect, jest, test } from '@jest/globals'
import { fireEvent, render, screen } from '@testing-library/react'

import type { Session } from '@/types/api'

import { VirtualSessionList } from './VirtualSessionList'

jest.mock('react-virtuoso', () => ({
  Virtuoso: ({
    data = [],
    itemContent,
    components,
    computeItemKey,
  }: {
    data?: unknown[]
    itemContent: (index: number, item: unknown) => ReactNode
    components?: { Footer?: ComponentType }
    computeItemKey?: (index: number, item: unknown) => React.Key
  }) => {
    const Footer = components?.Footer

    return (
      <div data-testid="virtual-session-list">
        {data.map((item, index) => {
          const key = computeItemKey ? computeItemKey(index, item) : index
          return (
            <div key={key} data-item-key={String(key)}>
              {itemContent(index, item)}
            </div>
          )
        })}
        {Footer ? <Footer /> : null}
      </div>
    )
  },
}))

function createSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 1,
    userId: 1,
    title: '会话',
    toolType: 'chat',
    modelVersion: 'standard',
    status: 'completed',
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('VirtualSessionList', () => {
  test('keeps short lists on the normal render path', () => {
    const sessions = [createSession({ id: 1, title: '短列表 1' })]

    render(
      <VirtualSessionList
        sessions={sessions}
        variant="standalone"
        renderSessionItem={(session, variant) => (
          <div key={session.id}>{`${variant}:${session.title}`}</div>
        )}
        footer={<button type="button">加载更多</button>}
      />,
    )

    expect(screen.queryByTestId('virtual-session-list')).not.toBeInTheDocument()
    expect(screen.getByText('standalone:短列表 1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '加载更多' })).toBeInTheDocument()
  })

  test('uses virtualization for long lists and keeps footer actions clickable', () => {
    const onLoadMore = jest.fn()
    const sessions = Array.from({ length: 31 }, (_, index) =>
      createSession({ id: index + 1, title: `长列表 ${index + 1}` }),
    )

    render(
      <VirtualSessionList
        sessions={sessions}
        variant="project"
        renderSessionItem={(session, variant) => (
          <div key={session.id}>{`${variant}:${session.title}`}</div>
        )}
        footer={
          <button type="button" onClick={onLoadMore}>
            加载更多
          </button>
        }
      />,
    )

    expect(screen.getByTestId('virtual-session-list')).toBeInTheDocument()
    expect(screen.getByText('project:长列表 31')).toBeInTheDocument()
    expect(screen.getByText('project:长列表 31').closest('[data-item-key]')).toHaveAttribute(
      'data-item-key',
      '31',
    )

    fireEvent.click(screen.getByRole('button', { name: '加载更多' }))

    expect(onLoadMore).toHaveBeenCalledTimes(1)
  })
})
