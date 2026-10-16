import { describe, expect, jest, test } from '@jest/globals'
import { fireEvent, render, screen } from '@testing-library/react'
import type { ComponentProps, ReactNode } from 'react'

import { InstructionLibraryPanel } from './InstructionLibraryPanel'

jest.mock('../ui', () => ({
  Tooltip: ({ children, content }: { children: ReactNode; content: ReactNode }) => (
    <>
      {children}
      <span data-testid="tooltip-content">{content}</span>
    </>
  ),
}))

const theme = {
  background: '#f5fff8',
  primary: '#32c787',
  primaryHover: '#2cab74',
  name: 'green',
}

function renderInstructionLibraryPanel(
  overrides: Partial<ComponentProps<typeof InstructionLibraryPanel>> = {},
) {
  const props = {
    label: '指令库Ⅰ',
    instructionOpen: true,
    instructionLibrary: [
      {
        key: 'claim-template',
        title: '权利要求模板',
        description: '用于优化权利要求书',
        content: '请优化以下权利要求书。',
        isCustom: true,
      },
    ],
    isLoading: false,
    instructionListHeight: 240,
    showInstructionForm: false,
    newInstruction: { title: '', content: '' },
    instructionBtnRef: { current: null },
    instructionAddBtnRef: { current: null },
    instructionPanelRef: { current: null },
    toggleInstruction: jest.fn(),
    toggleInstructionForm: jest.fn(),
    onInstructionSelect: jest.fn(),
    onInstructionDelete: jest.fn(),
    onInstructionCreate: jest.fn(),
    onInstructionCancel: jest.fn(),
    onInstructionChange: jest.fn(),
    validationError: '',
    loadError: '',
    operationError: '',
    deletingInstructionKey: null,
    isCreatingInstruction: false,
    onInstructionReload: jest.fn(),
    startInstructionResize: jest.fn(),
    handleInstructionResizeKeyDown: jest.fn(),
    theme,
  }

  render(<InstructionLibraryPanel {...props} {...overrides} />)
  return props
}

describe('InstructionLibraryPanel', () => {
  test('keeps the delete control outside the insert button', () => {
    renderInstructionLibraryPanel()

    const insertButton = screen.getByRole('button', { name: /权利要求模板/ })
    const deleteButton = screen.getByRole('button', { name: '删除' })

    expect(insertButton).not.toContainElement(deleteButton)
  })

  test('shows delete only for custom instructions', () => {
    renderInstructionLibraryPanel({
      instructionLibrary: [
        {
          key: 'api-claim-template',
          title: '默认权利要求模板',
          description: '系统提供的模板',
          content: '请优化默认模板。',
          isCustom: false,
        },
      ],
    })

    expect(screen.queryByRole('button', { name: '删除' })).not.toBeInTheDocument()
  })

  test('labels the custom instruction form and associates validation errors', () => {
    renderInstructionLibraryPanel({
      showInstructionForm: true,
      validationError: '请填写标题和内容',
    })

    const titleInput = screen.getByRole('textbox', { name: '提示词标题' })
    const contentInput = screen.getByRole('textbox', { name: '提示词内容' })
    const error = screen.getByText('请填写标题和内容')

    expect(titleInput).toHaveAttribute('name', 'instruction-title')
    expect(contentInput).toHaveAttribute('name', 'instruction-content')
    expect(titleInput).toHaveAttribute('aria-describedby', error.id)
    expect(contentInput).toHaveAttribute('aria-describedby', error.id)
    expect(error).toHaveAttribute('aria-live', 'polite')
  })

  test('explains instructions are inserted at the input start', () => {
    renderInstructionLibraryPanel({ showInstructionForm: true })

    expect(screen.getByText('打开常用提示词，快速插入到输入框开头')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('输入提示词内容，会插入到输入框开头')).toBeInTheDocument()
    expect(screen.getByText('点击后插入到输入框开头')).toBeInTheDocument()
  })

  test('exposes the list resize handle to keyboard users', () => {
    const handleInstructionResizeKeyDown = jest.fn()
    renderInstructionLibraryPanel({ handleInstructionResizeKeyDown })

    const resizeHandle = screen.getByRole('separator', { name: '调整提示词列表高度' })

    expect(resizeHandle.tagName).toBe('DIV')
    expect(resizeHandle).toHaveAttribute('aria-valuemin', '240')
    expect(resizeHandle).toHaveAttribute('aria-valuemax', '520')
    expect(resizeHandle).toHaveAttribute('aria-valuenow', '240')
    expect(resizeHandle).toHaveAttribute('tabindex', '0')

    fireEvent.keyDown(resizeHandle, { key: 'ArrowUp' })

    expect(handleInstructionResizeKeyDown).toHaveBeenCalledTimes(1)
  })

  test('moves focus into the panel when opened and returns focus with Escape', () => {
    const props = renderInstructionLibraryPanel()

    const trigger = screen.getByRole('button', { name: '打开指令库' })
    const panel = screen.getByRole('dialog', { name: '指令库Ⅰ' })

    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog')
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(trigger).toHaveAttribute('aria-controls', panel.id)
    expect(screen.getByRole('button', { name: '自定义提示词' })).toHaveFocus()

    fireEvent.keyDown(panel, { key: 'Escape' })

    expect(props.toggleInstruction).toHaveBeenCalledTimes(1)
    expect(trigger).toHaveFocus()
  })

  test('shows an empty state when backend returns no instructions', () => {
    renderInstructionLibraryPanel({ instructionLibrary: [] })

    expect(screen.getByText('暂无可用提示词')).toBeInTheDocument()
  })

  test('shows load error and allows retrying backend loading', () => {
    const onInstructionReload = jest.fn()
    renderInstructionLibraryPanel({
      instructionLibrary: [],
      loadError: '提示词加载失败，请稍后重试',
      onInstructionReload,
    })

    expect(screen.getByText('提示词加载失败，请稍后重试')).toHaveAttribute('aria-live', 'polite')

    fireEvent.click(screen.getByRole('button', { name: '重新加载提示词' }))

    expect(onInstructionReload).toHaveBeenCalledTimes(1)
  })

  test('announces instruction load errors as alerts', () => {
    renderInstructionLibraryPanel({
      instructionLibrary: [],
      loadError: 'load failed',
    })

    expect(screen.getByRole('alert')).toHaveTextContent('load failed')
  })

  test('announces instruction operation errors as alerts', () => {
    renderInstructionLibraryPanel({
      operationError: '删除提示词失败，请稍后重试',
    })

    expect(screen.getByRole('alert')).toHaveTextContent('删除提示词失败，请稍后重试')
  })

  test('shows a disabled deleting state for the instruction being removed', () => {
    const onInstructionDelete = jest.fn()
    renderInstructionLibraryPanel({
      deletingInstructionKey: 'claim-template',
      onInstructionDelete,
    })

    const deletingButton = screen.getByRole('button', { name: '删除中…' })

    expect(deletingButton).toBeDisabled()
    fireEvent.click(deletingButton)
    expect(onInstructionDelete).not.toHaveBeenCalled()
  })

  test('disables the custom instruction form while a new instruction is being saved', () => {
    const onInstructionCreate = jest.fn()
    const onInstructionCancel = jest.fn()
    renderInstructionLibraryPanel({
      showInstructionForm: true,
      isCreatingInstruction: true,
      newInstruction: {
        title: '保存中的提示词',
        content: '保存期间不允许重复提交。',
      },
      onInstructionCreate,
      onInstructionCancel,
    })

    expect(screen.getByRole('textbox', { name: '提示词标题' })).toBeDisabled()
    expect(screen.getByRole('textbox', { name: '提示词内容' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '取消' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '取消' })).toHaveClass('disabled:cursor-not-allowed')

    const savingButton = screen.getByRole('button', { name: '保存中…' })
    expect(savingButton).toBeDisabled()
    expect(savingButton).toHaveAttribute('aria-busy', 'true')
    expect(savingButton).toHaveClass('disabled:opacity-50')

    fireEvent.click(savingButton)
    expect(onInstructionCreate).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '取消' }))
    expect(onInstructionCancel).not.toHaveBeenCalled()
  })

  test('uses the theme foreground color when the library trigger is open', () => {
    renderInstructionLibraryPanel({
      theme: { ...theme, primary: '#93c5fd', primaryForeground: '#111827' },
    })

    expect(screen.getByRole('button', { name: '打开指令库' })).toHaveStyle({
      '--chat-btn-color': '#111827',
    })
  })

  test('can be disabled while the chat is loading', () => {
    renderInstructionLibraryPanel({ disabled: true })

    const trigger = screen.getByRole('button', { name: '打开指令库' })

    expect(trigger).toBeDisabled()
    expect(trigger).not.toHaveAttribute('aria-controls')
  })

  test('keeps disabled instruction actions visually disabled while unavailable', () => {
    renderInstructionLibraryPanel({
      disabled: true,
      loadError: '提示词加载失败，请稍后重试',
    })

    expect(screen.getByRole('button', { name: /权利要求模板/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /权利要求模板/ })).toHaveClass(
      'disabled:cursor-not-allowed',
    )
    expect(screen.getByRole('button', { name: '重新加载提示词' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '重新加载提示词' })).toHaveClass(
      'disabled:opacity-50',
    )
    expect(screen.getByRole('button', { name: '删除' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '删除' })).toHaveClass('disabled:cursor-not-allowed')
  })

  test('does not expose a dangling panel control relation while closed', () => {
    renderInstructionLibraryPanel({ instructionOpen: false })

    const trigger = screen.getByRole('button', { name: '打开指令库' })

    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).not.toHaveAttribute('aria-controls')
    expect(screen.queryByRole('dialog', { name: '指令库Ⅰ' })).not.toBeInTheDocument()
  })
})
