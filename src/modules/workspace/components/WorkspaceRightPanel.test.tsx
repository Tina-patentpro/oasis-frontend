import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fireEvent, render, screen } from '@testing-library/react'
import { useState, type ComponentProps } from 'react'

import { WorkspaceRightPanel } from './WorkspaceRightPanel'

jest.mock('@/components/ChatPanel', () => ({
  ChatPanel: ({ width }: { width: number }) => <div data-testid="chat-panel">{width}</div>,
}))

const chatPanelProps = {} as ComponentProps<typeof import('@/components/ChatPanel').ChatPanel>

function setWindowWidth(width: number): void {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  })
}

beforeEach(() => {
  setWindowWidth(1400)
})

describe('WorkspaceRightPanel', () => {
  function StatefulWorkspaceRightPanel() {
    const [chatWidth, setChatWidth] = useState(420)

    return (
      <WorkspaceRightPanel
        chatOpen
        chatMode="quarter"
        chatWidth={chatWidth}
        showSidebar
        onStartResize={jest.fn()}
        onKeyboardResize={(delta) => setChatWidth((currentWidth) => currentWidth + delta)}
        chatPanelProps={chatPanelProps}
      />
    )
  }

  test('keeps a named focus target mounted outside the lazy chat boundary', async () => {
    render(
      <WorkspaceRightPanel
        chatOpen
        chatMode="full"
        chatWidth={420}
        showSidebar={false}
        onStartResize={jest.fn()}
        onKeyboardResize={jest.fn()}
        chatPanelProps={chatPanelProps}
      />,
    )

    const chatSurface = screen.getByRole('region', { name: '对话工作区' })

    expect(chatSurface).toHaveAttribute('id', 'workspace-chat-surface')
    expect(chatSurface).toHaveAttribute('tabindex', '-1')
    expect(chatSurface).toHaveClass('focus-visible:ring-2')
    expect(chatSurface).toContainElement(await screen.findByTestId('chat-panel'))
  })

  test('allows keyboard resizing when the quarter chat panel is open', () => {
    const onKeyboardResize = jest.fn()
    setWindowWidth(1400)

    render(
      <WorkspaceRightPanel
        chatOpen
        chatMode="quarter"
        chatWidth={420}
        showSidebar
        onStartResize={jest.fn()}
        onKeyboardResize={onKeyboardResize}
        chatPanelProps={chatPanelProps}
      />,
    )

    const resizeHandle = screen.getByRole('separator', { name: '调整对话框宽度' })
    expect(resizeHandle).toHaveAttribute('aria-valuemax')
    expect(resizeHandle).toHaveAttribute(
      'aria-keyshortcuts',
      'ArrowLeft ArrowRight PageUp PageDown Home End',
    )

    fireEvent.keyDown(resizeHandle, { key: 'ArrowLeft' })
    fireEvent.keyDown(resizeHandle, { key: 'ArrowRight' })
    fireEvent.keyDown(resizeHandle, { key: 'PageUp' })
    fireEvent.keyDown(resizeHandle, { key: 'PageDown' })
    fireEvent.keyDown(resizeHandle, { key: 'Home' })
    fireEvent.keyDown(resizeHandle, { key: 'End' })

    expect(onKeyboardResize).toHaveBeenNthCalledWith(1, 24)
    expect(onKeyboardResize).toHaveBeenNthCalledWith(2, -24)
    expect(onKeyboardResize).toHaveBeenNthCalledWith(3, 120)
    expect(onKeyboardResize).toHaveBeenNthCalledWith(4, -120)
    expect(onKeyboardResize).toHaveBeenNthCalledWith(5, -60)
    expect(onKeyboardResize).toHaveBeenNthCalledWith(6, 88)
  })

  test('updates rendered width and aria value after keyboard resizing flows through parent state', async () => {
    setWindowWidth(1400)

    render(<StatefulWorkspaceRightPanel />)

    const resizeHandle = screen.getByRole('separator', { name: '调整对话框宽度' })
    expect(await screen.findByTestId('chat-panel')).toHaveTextContent('420')
    expect(resizeHandle).toHaveAttribute('aria-valuenow', '420')

    fireEvent.keyDown(resizeHandle, { key: 'End' })

    expect(await screen.findByTestId('chat-panel')).toHaveTextContent('508')
    expect(resizeHandle).toHaveAttribute('aria-valuenow', '508')
    expect(resizeHandle).toHaveAttribute('aria-valuetext', '508 像素')

    fireEvent.keyDown(resizeHandle, { key: 'Home' })

    expect(await screen.findByTestId('chat-panel')).toHaveTextContent('360')
    expect(resizeHandle).toHaveAttribute('aria-valuenow', '360')
    expect(resizeHandle).toHaveAttribute('aria-valuetext', '360 像素')
  })

  test('hides the resize handle when the real quarter limit has no adjustable range', async () => {
    setWindowWidth(1000)

    render(
      <WorkspaceRightPanel
        chatOpen
        chatMode="quarter"
        chatWidth={420}
        showSidebar
        onStartResize={jest.fn()}
        onKeyboardResize={jest.fn()}
        chatPanelProps={chatPanelProps}
      />,
    )

    expect(screen.queryByRole('separator', { name: '调整对话框宽度' })).not.toBeInTheDocument()
    expect(await screen.findByTestId('chat-panel')).toHaveTextContent('360')
  })

  test('keeps full mode chat width inside the visible area when the left sidebar is still shown', async () => {
    setWindowWidth(1200)

    render(
      <WorkspaceRightPanel
        chatOpen
        chatMode="full"
        chatWidth={1168}
        showSidebar
        onStartResize={jest.fn()}
        onKeyboardResize={jest.fn()}
        chatPanelProps={chatPanelProps}
      />,
    )

    expect(screen.queryByRole('separator', { name: '调整对话框宽度' })).not.toBeInTheDocument()
    expect(await screen.findByTestId('chat-panel')).toHaveTextContent('848')
  })

  test('shrinks full mode to the compact viewport width', async () => {
    setWindowWidth(320)

    render(
      <WorkspaceRightPanel
        chatOpen
        chatMode="full"
        chatWidth={453}
        showSidebar={false}
        onStartResize={jest.fn()}
        onKeyboardResize={jest.fn()}
        chatPanelProps={chatPanelProps}
      />,
    )

    expect(screen.queryByRole('separator', { name: '调整对话框宽度' })).not.toBeInTheDocument()
    expect(await screen.findByTestId('chat-panel')).toHaveTextContent('288')
  })

  test('does not mount stale quarter chat content on compact screens', () => {
    setWindowWidth(320)

    render(
      <WorkspaceRightPanel
        chatOpen
        chatMode="quarter"
        chatWidth={453}
        showSidebar={false}
        onStartResize={jest.fn()}
        onKeyboardResize={jest.fn()}
        chatPanelProps={chatPanelProps}
      />,
    )

    expect(screen.queryByRole('separator', { name: '调整对话框宽度' })).not.toBeInTheDocument()
    expect(screen.queryByTestId('chat-panel')).not.toBeInTheDocument()
  })

  test('does not mount full chat while the compact sidebar is authoritative', () => {
    setWindowWidth(375)

    render(
      <WorkspaceRightPanel
        chatOpen
        chatMode="full"
        chatWidth={453}
        showSidebar
        onStartResize={jest.fn()}
        onKeyboardResize={jest.fn()}
        chatPanelProps={chatPanelProps}
      />,
    )

    expect(screen.queryByRole('separator', { name: '调整对话框宽度' })).not.toBeInTheDocument()
    expect(screen.queryByTestId('chat-panel')).not.toBeInTheDocument()
  })

  test('starts resizing from touch devices when the quarter chat panel is open', () => {
    const onStartResize = jest.fn()

    render(
      <WorkspaceRightPanel
        chatOpen
        chatMode="quarter"
        chatWidth={420}
        showSidebar
        onStartResize={onStartResize}
        onKeyboardResize={jest.fn()}
        chatPanelProps={chatPanelProps}
      />,
    )

    fireEvent.touchStart(screen.getByRole('separator', { name: '调整对话框宽度' }), {
      touches: [{ clientX: 320 }],
    })

    expect(onStartResize).toHaveBeenCalledTimes(1)
  })

  test('marks the resize handle as a touch drag area', () => {
    render(
      <WorkspaceRightPanel
        chatOpen
        chatMode="quarter"
        chatWidth={420}
        showSidebar
        onStartResize={jest.fn()}
        onKeyboardResize={jest.fn()}
        chatPanelProps={chatPanelProps}
      />,
    )

    expect(screen.getByRole('separator', { name: '调整对话框宽度' })).toHaveClass('touch-none')
  })

  test('provides a visible status while the chat panel chunk is loading', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/modules/workspace/components/WorkspaceRightPanel.tsx'),
      'utf8',
    )

    expect(source).not.toContain('fallback={null}')
    expect(source).toContain('正在加载对话面板…')
    expect(source).toContain('role="status"')
  })
})
