import React from 'react'

import '@testing-library/jest-dom'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, jest, test } from '@jest/globals'

import type { Attachment, Theme } from '@/types'

import { AttachmentBar } from './AttachmentBar'

jest.mock('../ui', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react')
  const { AttachBadge } =
    jest.requireActual<typeof import('../ui/badges/AttachBadge')>('../ui/badges/AttachBadge')

  return {
    Tooltip: ({ children }: { children: React.ReactNode }) =>
      ReactModule.createElement(ReactModule.Fragment, null, children),
    ActionBtn: ({
      children,
      ariaLabel,
      disabled,
      loading,
      onClick,
    }: {
      children: React.ReactNode
      ariaLabel?: string
      disabled?: boolean
      loading?: boolean
      onClick?: () => void
    }) =>
      ReactModule.createElement(
        'button',
        { type: 'button', 'aria-label': ariaLabel, disabled: disabled || loading, onClick },
        children,
      ),
    AttachBadge,
  }
})

const theme: Theme = {
  background: '#f5fff8',
  primary: '#32c787',
  primaryHover: '#2cab74',
  name: 'green',
}

const attachment: Attachment = {
  id: 'att-1',
  name: '技术交底书.pdf',
  type: 'file',
  size: 1024,
  file: new File(['content'], '技术交底书.pdf', { type: 'application/pdf' }),
}

describe('AttachmentBar', () => {
  test('allows sending when an attachment is present even if the text input is empty', () => {
    const onSendChat = jest.fn()

    render(
      <AttachmentBar
        panelWidth={640}
        attachments={[attachment]}
        onRemoveAttachment={() => undefined}
        readMenu={<button type="button">读取</button>}
        secondaryAction={null}
        chatInput=""
        onClearChat={() => undefined}
        onSendChat={onSendChat}
        onStartNewConversation={() => undefined}
        theme={theme}
        loading={false}
      />,
    )

    const sendButton = screen.getByRole('button', { name: '发送消息' })
    expect(sendButton).toBeEnabled()

    fireEvent.click(sendButton)

    expect(onSendChat).toHaveBeenCalledTimes(1)
  })

  test('renders clear three-section layout when secondary actions exist', () => {
    render(
      <AttachmentBar
        panelWidth={640}
        attachments={[]}
        onRemoveAttachment={() => undefined}
        readMenu={<button type="button">读取</button>}
        secondaryAction={[
          <button key="associate" type="button">
            关联项目
          </button>,
          <button key="library" type="button">
            指令库
          </button>,
        ]}
        chatInput="已有输入"
        onClearChat={() => undefined}
        onSendChat={() => undefined}
        onStartNewConversation={() => undefined}
        theme={theme}
        loading={false}
      />,
    )

    const leftTools = screen.getByTestId('attachment-bar-left-tools')
    const middleActions = screen.getByTestId('attachment-bar-secondary-actions')
    const sendActions = screen.getByTestId('attachment-bar-send-actions')

    expect(within(leftTools).getByRole('button', { name: '读取' })).toBeInTheDocument()
    expect(within(leftTools).getByRole('button', { name: '清空对话' })).toBeInTheDocument()
    expect(within(middleActions).getByRole('button', { name: '关联项目' })).toBeInTheDocument()
    expect(within(middleActions).getByRole('button', { name: '指令库' })).toBeInTheDocument()
    expect(within(sendActions).getByRole('button', { name: '新对话' })).toBeInTheDocument()
    expect(within(sendActions).getByRole('button', { name: '发送消息' })).toBeInTheDocument()
  })

  test('disables attachment removal while chat response is loading', () => {
    const onRemoveAttachment = jest.fn()

    render(
      <AttachmentBar
        panelWidth={480}
        attachments={[attachment]}
        onRemoveAttachment={onRemoveAttachment}
        readMenu={null}
        secondaryAction={null}
        chatInput="请分析附件"
        onClearChat={() => undefined}
        onSendChat={() => undefined}
        onStartNewConversation={() => undefined}
        theme={theme}
        loading
      />,
    )

    const removeButton = screen.getByRole('button', {
      name: '生成中暂不能移除 技术交底书.pdf',
    })
    expect(removeButton).toBeDisabled()

    fireEvent.click(removeButton)

    expect(onRemoveAttachment).not.toHaveBeenCalled()
  })

  test('omits the middle action zone when there are no secondary actions', () => {
    render(
      <AttachmentBar
        panelWidth={640}
        attachments={[]}
        onRemoveAttachment={() => undefined}
        readMenu={<button type="button">读取</button>}
        secondaryAction={null}
        chatInput="已有输入"
        onClearChat={() => undefined}
        onSendChat={() => undefined}
        onStartNewConversation={() => undefined}
        theme={theme}
        loading={false}
      />,
    )

    expect(screen.queryByTestId('attachment-bar-secondary-actions')).not.toBeInTheDocument()
    expect(screen.getByTestId('attachment-bar-left-tools')).toBeInTheDocument()
    expect(screen.getByTestId('attachment-bar-send-actions')).toBeInTheDocument()
  })

  test('moves secondary actions onto a dedicated row when the panel is narrow', () => {
    render(
      <AttachmentBar
        panelWidth={420}
        attachments={[]}
        onRemoveAttachment={() => undefined}
        readMenu={<button type="button">读取</button>}
        secondaryAction={[
          <button key="associate" type="button">
            关联项目
          </button>,
          <button key="library" type="button">
            指令库
          </button>,
        ]}
        chatInput="已有输入"
        onClearChat={() => undefined}
        onSendChat={() => undefined}
        onStartNewConversation={() => undefined}
        theme={theme}
        loading={false}
      />,
    )

    expect(screen.getByTestId('attachment-bar-left-tools').className).toContain('order-1')
    expect(screen.getByTestId('attachment-bar-send-actions').className).toContain('order-2')
    expect(screen.getByTestId('attachment-bar-secondary-actions').className).toContain('basis-full')
    expect(screen.getByTestId('attachment-bar-secondary-actions').className).toContain('order-3')
  })

  test('keeps a single secondary action on the main row in compact layout', () => {
    render(
      <AttachmentBar
        panelWidth={500}
        attachments={[]}
        onRemoveAttachment={() => undefined}
        readMenu={<button type="button">读取</button>}
        secondaryAction={[
          <button key="associate" type="button">
            关联项目
          </button>,
        ]}
        chatInput="已有输入"
        onClearChat={() => undefined}
        onSendChat={() => undefined}
        onStartNewConversation={() => undefined}
        theme={theme}
        loading={false}
      />,
    )

    expect(screen.getByTestId('attachment-bar-secondary-actions').className).not.toContain(
      'basis-full',
    )
    expect(screen.getByTestId('attachment-bar-secondary-actions').className).toContain('order-2')
    expect(screen.getByTestId('attachment-bar-send-actions').className).toContain('order-3')
  })

  test('keeps a single secondary action on the main row even on very narrow widths', () => {
    render(
      <AttachmentBar
        panelWidth={390}
        attachments={[]}
        onRemoveAttachment={() => undefined}
        readMenu={<button type="button">读取</button>}
        secondaryAction={[
          <button key="library" type="button">
            指令库Ⅲ
          </button>,
        ]}
        chatInput="已有输入"
        onClearChat={() => undefined}
        onSendChat={() => undefined}
        onStartNewConversation={() => undefined}
        theme={theme}
        loading={false}
      />,
    )

    expect(screen.getByTestId('attachment-bar-left-tools').className).not.toContain('basis-full')
    expect(screen.getByTestId('attachment-bar-secondary-actions').className).toContain('order-2')
    expect(screen.getByTestId('attachment-bar-secondary-actions').className).not.toContain(
      'basis-full',
    )
    expect(screen.getByTestId('attachment-bar-send-actions').className).toContain('order-3')
  })
})
