import { describe, expect, jest, test } from '@jest/globals'
import { fireEvent, render, screen, within } from '@testing-library/react'

import type { ChatMode } from '@/modules/workspace/stores'

import { ChatModeSwitch } from './ChatModeSwitch'

jest.mock('@/components/ui', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

const theme = {
  name: '测试主题',
  background: '#ffffff',
  primary: '#10b981',
  primaryHover: '#059669',
}

function renderSwitch(chatMode: ChatMode, onChangeChatMode = jest.fn()) {
  render(
    <ChatModeSwitch
      chatMode={chatMode}
      chatModeHint="测试模式"
      activeSegmentLeft={
        chatMode === 'off' ? '0%' : chatMode === 'quarter' ? '33.333333%' : '66.666667%'
      }
      currentTheme={theme}
      isDarkTheme={false}
      onChangeChatMode={onChangeChatMode}
    />,
  )

  return onChangeChatMode
}

describe('ChatModeSwitch responsive options', () => {
  test('renders a real two-option compact switch and a three-option desktop switch', () => {
    renderSwitch('off')

    const compact = screen.getByTestId('compact-chat-mode-switch')
    const desktop = screen.getByTestId('desktop-chat-mode-switch')

    expect(within(compact).getAllByRole('button')).toHaveLength(2)
    expect(within(compact).queryByRole('button', { name: '设置对话栏为 On' })).not.toBeInTheDocument()
    expect(within(desktop).getAllByRole('button')).toHaveLength(3)
  })

  test.each([
    ['off', 'translateX(0%)'],
    ['full', 'translateX(100%)'],
  ] as const)('uses a 50%% compact indicator for %s', (chatMode, transform) => {
    renderSwitch(chatMode)

    expect(screen.getByTestId('compact-chat-mode-indicator')).toHaveStyle({
      width: '50%',
      transform,
    })
  })

  test('keeps exactly one compact option active for a stale quarter value', () => {
    renderSwitch('quarter')

    const pressed = within(screen.getByTestId('compact-chat-mode-switch')).getAllByRole('button', {
      pressed: true,
    })
    expect(pressed).toHaveLength(1)
    expect(pressed[0]).toHaveAccessibleName('设置对话栏为 Full')
  })

  test('keeps the desktop three-segment position and forwards compact actions', () => {
    const onChangeChatMode = renderSwitch('quarter')
    const compact = screen.getByTestId('compact-chat-mode-switch')

    expect(screen.getByTestId('desktop-chat-mode-indicator')).toHaveStyle({
      width: '33.333333%',
      left: '33.333333%',
    })
    fireEvent.click(within(compact).getByRole('button', { name: '设置对话栏为 Off' }))
    fireEvent.click(within(compact).getByRole('button', { name: '设置对话栏为 Full' }))

    expect(onChangeChatMode).toHaveBeenNthCalledWith(1, 'off')
    expect(onChangeChatMode).toHaveBeenNthCalledWith(2, 'full')
  })
})
