import { describe, expect, jest, test } from '@jest/globals'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { OasisActionsBlock } from './OasisActionsBlock'
import type { OasisActionsPayload } from './oasis-actions'

const payload: OasisActionsPayload = {
  version: '1.0',
  title: '下一步可以选择：',
  description: '点击后会填入输入框。',
  layout: 'grid',
  actions: [
    {
      id: 'generate_claims',
      label: '生成权利要求书',
      type: 'fill',
      query: '请根据技术交底书生成权利要求书。',
    },
    {
      id: 'save_attachment',
      label: '保存附件',
      type: 'confirm_fill',
      query: '请将本轮附件保存为技术交底书最终版。',
      confirmText: '确认保存？',
    },
  ],
}

describe('OasisActionsBlock', () => {
  test('renders title, description and actions as an ordered list', () => {
    render(<OasisActionsBlock payload={payload} onFill={jest.fn()} />)

    expect(screen.getByText('下一步可以选择：')).toBeInTheDocument()
    expect(screen.getByText('点击后会填入输入框。')).toBeInTheDocument()
    expect(screen.getByRole('list', { name: '下一步可以选择：' })).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(payload.actions.length)
    expect(screen.getByRole('button', { name: '生成权利要求书' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '保存附件' })).toBeInTheDocument()
  })

  test('makes fill actions look clickable without adding an extra text line', () => {
    render(<OasisActionsBlock payload={payload} onFill={jest.fn()} />)

    const button = screen.getByRole('button', { name: '生成权利要求书' })

    expect(button).toHaveAttribute('title', '点击后插入到输入框开头：生成权利要求书')
    expect(button).toHaveClass('cursor-pointer')
    expect(button).toHaveClass('border-emerald-200')
    expect(button).toHaveClass('bg-white')
    expect(button.querySelector('[aria-hidden="true"]')).toHaveTextContent('＋')
  })

  test('fill action calls onFill with query', async () => {
    const user = userEvent.setup()
    const onFill = jest.fn()
    render(<OasisActionsBlock payload={payload} onFill={onFill} />)

    await user.click(screen.getByRole('button', { name: '生成权利要求书' }))

    expect(onFill).toHaveBeenCalledWith('请根据技术交底书生成权利要求书。')
  })

  test('confirm_fill asks for in-page confirmation before filling', async () => {
    const user = userEvent.setup()
    const confirmSpy = jest.spyOn(window, 'confirm')
    const onFill = jest.fn()
    render(<OasisActionsBlock payload={payload} onFill={onFill} />)

    await user.click(screen.getByRole('button', { name: '保存附件' }))

    expect(confirmSpy).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: '确认填入输入框' })).toBeInTheDocument()
    expect(screen.getByText('确认保存？')).toBeInTheDocument()
    expect(onFill).not.toHaveBeenCalled()

    await user.click(
      within(screen.getByRole('dialog', { name: '确认填入输入框' })).getByRole('button', {
        name: '确认填入',
      }),
    )

    expect(onFill).toHaveBeenCalledWith('请将本轮附件保存为技术交底书最终版。')

    confirmSpy.mockRestore()
  })

  test('confirm_fill uses default in-page confirmation text when confirmText is missing', async () => {
    const user = userEvent.setup()
    const onFill = jest.fn()
    render(
      <OasisActionsBlock
        payload={{
          version: '1.0',
          title: '确认操作',
          actions: [
            {
              id: 'confirm_default',
              label: '确认填入',
              type: 'confirm_fill',
              query: '请确认后填入。',
            },
          ],
        }}
        onFill={onFill}
      />,
    )

    await user.click(screen.getByRole('button', { name: '确认填入' }))

    expect(screen.getByRole('dialog', { name: '确认填入输入框' })).toBeInTheDocument()
    expect(screen.getByText('确认执行该操作？')).toBeInTheDocument()

    await user.click(
      within(screen.getByRole('dialog', { name: '确认填入输入框' })).getByRole('button', {
        name: '确认填入',
      }),
    )

    expect(onFill).toHaveBeenCalledWith('请确认后填入。')
  })

  test('confirm_fill does not fill when cancelled', async () => {
    const user = userEvent.setup()
    const onFill = jest.fn()
    render(<OasisActionsBlock payload={payload} onFill={onFill} />)

    await user.click(screen.getByRole('button', { name: '保存附件' }))
    await user.click(screen.getByRole('button', { name: '取消' }))

    expect(onFill).not.toHaveBeenCalled()
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: '确认填入输入框' })).not.toBeInTheDocument()
    })
  })

  test('disabled action shows disabledReason and cannot be clicked', async () => {
    const user = userEvent.setup()
    const onFill = jest.fn()
    render(
      <OasisActionsBlock
        payload={{
          version: '1.0',
          title: '附件操作',
          actions: [
            {
              id: 'needs_attachment',
              label: '基于附件生成',
              type: 'fill',
              query: '请基于附件生成权利要求书。',
              disabledReason: '请先上传附件',
            },
          ],
        }}
        onFill={onFill}
      />,
    )

    const button = screen.getByRole('button', { name: '基于附件生成' })
    expect(button).toBeDisabled()
    expect(screen.getByText('请先上传附件')).toBeInTheDocument()

    await user.click(button)
    expect(onFill).not.toHaveBeenCalled()
  })

  test('explains why actions are disabled when no fill handler is available', () => {
    render(<OasisActionsBlock payload={payload} />)

    const button = screen.getByRole('button', { name: '生成权利要求书' })

    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('title', '当前区域暂不支持填入输入框')
  })
})
