import React from 'react'
import { describe, expect, jest, test } from '@jest/globals'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import type { Project } from '@/types/api'

import { AssociateProjectDialog } from './AssociateProjectDialog'

jest.mock('@/components/ui/motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({
      children,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }) => (
      <div {...props}>{children}</div>
    ),
  },
}))

const projects: Project[] = [
  {
    id: 1,
    userId: 1,
    name: '网站测试1',
    status: 'active',
    sessionCount: 3,
    createdAt: '2026-03-09T08:00:00.000Z',
    updatedAt: '2026-03-09T08:00:00.000Z',
  },
  {
    id: 2,
    userId: 1,
    name: '网站测试3',
    status: 'active',
    sessionCount: 1,
    createdAt: '2026-03-09T08:00:00.000Z',
    updatedAt: '2026-03-09T08:00:00.000Z',
  },
]

function AssociateProjectDialogHarness({ onClose }: { onClose: () => void }) {
  const [isOpen, setIsOpen] = React.useState(true)

  return (
    <AssociateProjectDialog
      isOpen={isOpen}
      onClose={() => {
        onClose()
        setIsOpen(false)
      }}
      onCreateNewProject={jest.fn()}
      onSelectProject={jest.fn()}
      sessionName="会话A"
      projects={projects}
      backgroundColor="#ffffff"
    />
  )
}

describe('AssociateProjectDialog', () => {
  test('filters out the current project when transferring an associated session', () => {
    render(
      <AssociateProjectDialog
        isOpen
        onClose={jest.fn()}
        onCreateNewProject={jest.fn()}
        onSelectProject={jest.fn()}
        sessionName="会话A"
        projects={projects}
        backgroundColor="#ffffff"
        mode="transfer"
        excludeProjectId={1}
      />,
    )

    expect(screen.getByRole('heading', { name: '转移关联' })).not.toBeNull()
    expect(screen.queryByText('网站测试1')).toBeNull()
    expect(screen.getByText('网站测试3')).not.toBeNull()
  })

  test('keeps keyboard focus inside the dialog when tabbing past the last action', () => {
    render(
      <AssociateProjectDialog
        isOpen
        onClose={jest.fn()}
        onCreateNewProject={jest.fn()}
        onSelectProject={jest.fn()}
        sessionName="会话A"
        projects={projects}
        backgroundColor="#ffffff"
      />,
    )

    const dialog = screen.getByRole('dialog')
    const buttons = screen.getAllByRole('button')
    const firstButton = buttons[0]
    const lastButton = buttons[buttons.length - 1]

    lastButton.focus()
    fireEvent.keyDown(dialog, { key: 'Tab' })

    expect(firstButton).toHaveFocus()
  })

  test('uses targeted transitions and hides decorative icons from assistive technology', () => {
    render(
      <AssociateProjectDialog
        isOpen
        onClose={jest.fn()}
        onCreateNewProject={jest.fn()}
        onSelectProject={jest.fn()}
        sessionName="会话A"
        projects={projects}
        backgroundColor="#ffffff"
      />,
    )

    expect(screen.getByRole('button', { name: '创建新项目' })).toHaveClass(
      'transition-[border-color,background-color,color]',
    )
    expect(screen.getByRole('button', { name: /网站测试1/ })).toHaveClass(
      'transition-[border-color,background-color,color]',
    )
    expect(screen.getByRole('button', { name: '创建新项目' }).querySelector('svg')).toHaveAttribute(
      'aria-hidden',
      'true',
    )
  })

  test('prevents small screens from clipping long project lists', () => {
    render(
      <AssociateProjectDialog
        isOpen
        onClose={jest.fn()}
        onCreateNewProject={jest.fn()}
        onSelectProject={jest.fn()}
        sessionName="会话A"
        projects={projects}
        backgroundColor="#ffffff"
      />,
    )

    expect(screen.getByRole('dialog')).toHaveClass('max-h-[calc(100vh-2rem)]')
    expect(screen.getByRole('dialog')).toHaveClass('overflow-y-auto')
  })

  test('disables project actions and announces status while association is submitting', () => {
    const onSelectProject = jest.fn()
    render(
      <AssociateProjectDialog
        isOpen
        onClose={jest.fn()}
        onCreateNewProject={jest.fn()}
        onSelectProject={onSelectProject}
        sessionName="会话A"
        projects={projects}
        backgroundColor="#ffffff"
        isSubmitting
      />,
    )

    expect(screen.getByRole('status')).toHaveTextContent('正在处理关联，请稍候')
    expect(screen.getByRole('button', { name: '创建新项目' })).toBeDisabled()
    expect(screen.getByRole('button', { name: /网站测试1/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: '取消' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '创建新项目' })).toHaveClass(
      'disabled:cursor-not-allowed',
    )
    expect(screen.getByRole('button', { name: /网站测试1/ })).toHaveClass(
      'disabled:cursor-not-allowed',
    )
    expect(screen.getByRole('button', { name: '取消' })).toHaveClass('disabled:opacity-50')

    fireEvent.click(screen.getByRole('button', { name: /网站测试1/ }))

    expect(onSelectProject).not.toHaveBeenCalled()
  })

  test('closes with Escape and restores background scrolling', async () => {
    const onClose = jest.fn()
    const previousOverflow = document.body.style.overflow

    render(<AssociateProjectDialogHarness onClose={onClose} />)

    const dialog = screen.getByRole('dialog', { name: '关联项目' })
    expect(document.body).toHaveStyle({ overflow: 'hidden' })

    fireEvent.keyDown(dialog, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(1)
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: '关联项目' })).not.toBeInTheDocument()
    })
    expect(document.body.style.overflow).toBe(previousOverflow)
  })

  test('keeps dialog open when Escape is pressed while submitting', () => {
    const onClose = jest.fn()

    render(
      <AssociateProjectDialog
        isOpen
        onClose={onClose}
        onCreateNewProject={jest.fn()}
        onSelectProject={jest.fn()}
        sessionName="会话A"
        projects={projects}
        backgroundColor="#ffffff"
        isSubmitting
      />,
    )

    fireEvent.keyDown(screen.getByRole('dialog', { name: '关联项目' }), { key: 'Escape' })

    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: '关联项目' })).toBeInTheDocument()
  })
})
