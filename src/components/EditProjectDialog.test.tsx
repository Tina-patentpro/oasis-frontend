import { describe, expect, jest, test } from '@jest/globals'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import type { Project } from '@/types/api'

import { EditProjectDialog } from './EditProjectDialog'

const baseProject: Project = {
  id: 101,
  userId: 1,
  name: '智能机器人导航系统',
  description: '旧描述',
  status: 'active',
  metadata: {},
  createdAt: '2026-05-01T00:00:00.000Z',
  updatedAt: '2026-05-01T00:00:00.000Z',
}

describe('EditProjectDialog', () => {
  test('submits through the fixed footer button and reports required field errors', async () => {
    const user = userEvent.setup()
    const onSave = jest.fn(
      async (
        _id: number,
        _data: { name: string; description?: string; metadata?: Record<string, string> },
      ) => {},
    )

    render(
      <EditProjectDialog
        isOpen
        onClose={jest.fn()}
        project={baseProject}
        onSave={onSave}
        themeColor="#10b981"
      />,
    )

    await user.click(screen.getByRole('button', { name: '保存' }))

    const customerNameInput = screen.getByLabelText(/客户名称/)
    expect(screen.getByRole('alert')).toHaveTextContent('客户名称不能为空')
    expect(customerNameInput).toHaveAttribute('aria-invalid', 'true')
    expect(customerNameInput).toHaveAttribute('aria-describedby', 'edit-project-error')
    expect(onSave).not.toHaveBeenCalled()

    await user.type(customerNameInput, '星矩机器人')
    await user.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    expect(onSave).toHaveBeenCalledWith(
      101,
      expect.objectContaining({
        name: '智能机器人导航系统',
        metadata: expect.objectContaining({ customerName: '星矩机器人' }),
      }),
    )
  })

  test('does not infer field errors from save failure message text', async () => {
    const user = userEvent.setup()
    const onSave = jest.fn(async () => {
      throw new Error('项目名称不能为空')
    })

    render(
      <EditProjectDialog
        isOpen
        onClose={jest.fn()}
        project={{
          ...baseProject,
          metadata: {
            customerName: '星矩机器人',
          },
        }}
        onSave={onSave}
        themeColor="#10b981"
      />,
    )

    await user.click(screen.getByRole('button', { name: '保存' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('项目名称不能为空')
    expect(screen.getByLabelText(/项目名称/)).not.toHaveAttribute('aria-invalid')
  })
})
