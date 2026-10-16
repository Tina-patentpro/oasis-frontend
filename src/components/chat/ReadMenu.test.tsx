import React from 'react'

import '@testing-library/jest-dom'
import { describe, expect, jest, test } from '@jest/globals'
import { fireEvent, render, screen } from '@testing-library/react'

import { ReadMenu } from './ReadMenu'

jest.mock('../ui', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => children,
}))

const theme = {
  background: '#f5fff8',
  primary: '#32c787',
  primaryHover: '#2cab74',
  name: 'green',
}

describe('ReadMenu', () => {
  test('uses ordinary popup buttons instead of menu roles', () => {
    render(
      <ReadMenu
        isOpen
        isDisabled={false}
        onToggle={jest.fn()}
        buttonRef={React.createRef<HTMLButtonElement>()}
        menuRef={React.createRef<HTMLDivElement>()}
        onReadFromGenerated={jest.fn()}
        onReadFromHistory={jest.fn()}
        theme={theme}
      />,
    )

    const trigger = screen.getByRole('button', { name: '读取资料并追加到输入框末尾' })
    const popup = screen.getByRole('dialog', { name: '读取资料并追加到输入框末尾' })

    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog')
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(trigger).toHaveAttribute('aria-controls', popup.id)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '读取中栏生成结果，并追加到输入框末尾' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '读取项目历史资料，并追加到输入框末尾' }),
    ).toBeInTheDocument()
  })

  test('hides open popup actions while disabled', () => {
    const disabledReason = '当前会话暂不支持读取资料，请切换到专利生成或语义生图。'

    render(
      <ReadMenu
        isOpen
        isDisabled
        disabledReason={disabledReason}
        onToggle={jest.fn()}
        buttonRef={React.createRef<HTMLButtonElement>()}
        menuRef={React.createRef<HTMLDivElement>()}
        onReadFromGenerated={jest.fn()}
        onReadFromHistory={jest.fn()}
        theme={theme}
      />,
    )

    const trigger = screen.getByRole('button', { name: '读取资料并追加到输入框末尾' })

    expect(trigger).toBeDisabled()
    expect(trigger).toHaveAttribute('title', disabledReason)
    expect(trigger).toHaveAccessibleDescription(disabledReason)
    expect(screen.getByText(disabledReason)).toBeVisible()
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).not.toHaveAttribute('aria-controls')
    expect(
      screen.queryByRole('dialog', { name: '读取资料并追加到输入框末尾' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: '读取中栏生成结果，并追加到输入框末尾' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: '读取项目历史资料，并追加到输入框末尾' }),
    ).not.toBeInTheDocument()
  })

  test('does not expose a dangling popup control relation while closed', () => {
    render(
      <ReadMenu
        isOpen={false}
        isDisabled={false}
        onToggle={jest.fn()}
        buttonRef={React.createRef<HTMLButtonElement>()}
        menuRef={React.createRef<HTMLDivElement>()}
        onReadFromGenerated={jest.fn()}
        onReadFromHistory={jest.fn()}
        theme={theme}
      />,
    )

    const trigger = screen.getByRole('button', { name: '读取资料并追加到输入框末尾' })

    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).not.toHaveAttribute('aria-controls')
    expect(
      screen.queryByRole('dialog', { name: '读取资料并追加到输入框末尾' }),
    ).not.toBeInTheDocument()
  })

  test('keeps generated reading available while disabling project history without an associated project', () => {
    const disabledReason = '请先关联项目后读取项目历史资料。'

    render(
      <ReadMenu
        isOpen
        isDisabled={false}
        onToggle={jest.fn()}
        buttonRef={React.createRef<HTMLButtonElement>()}
        menuRef={React.createRef<HTMLDivElement>()}
        onReadFromGenerated={jest.fn()}
        onReadFromHistory={jest.fn()}
        historyDisabled
        historyDisabledReason={disabledReason}
        theme={theme}
      />,
    )

    expect(
      screen.getByRole('button', { name: '读取中栏生成结果，并追加到输入框末尾' }),
    ).toBeEnabled()
    const historyButton = screen.getByRole('button', {
      name: '读取项目历史资料，并追加到输入框末尾',
    })
    expect(historyButton).toBeDisabled()
    expect(historyButton).toHaveAccessibleDescription(disabledReason)
  })

  test('closes the read popup with Escape and returns focus to the trigger', () => {
    const onClose = jest.fn()
    const buttonRef = React.createRef<HTMLButtonElement>()

    render(
      <ReadMenu
        isOpen
        isDisabled={false}
        onToggle={jest.fn()}
        onClose={onClose}
        buttonRef={buttonRef}
        menuRef={React.createRef<HTMLDivElement>()}
        onReadFromGenerated={jest.fn()}
        onReadFromHistory={jest.fn()}
        theme={theme}
      />,
    )

    const trigger = screen.getByRole('button', { name: '读取资料并追加到输入框末尾' })
    const popup = screen.getByRole('dialog', { name: '读取资料并追加到输入框末尾' })

    fireEvent.keyDown(popup, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(trigger).toHaveFocus()
  })

  test('moves focus to the first available popup action when opened', () => {
    render(
      <ReadMenu
        isOpen
        isDisabled={false}
        onToggle={jest.fn()}
        buttonRef={React.createRef<HTMLButtonElement>()}
        menuRef={React.createRef<HTMLDivElement>()}
        onReadFromGenerated={jest.fn()}
        onReadFromHistory={jest.fn()}
        historyDisabled
        historyDisabledReason="请先关联项目后读取项目历史资料。"
        theme={theme}
      />,
    )

    expect(
      screen.getByRole('button', { name: '读取中栏生成结果，并追加到输入框末尾' }),
    ).toHaveFocus()
  })
})
