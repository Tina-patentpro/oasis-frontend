import React from 'react'
import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { RewardSuggestionDialog } from './RewardSuggestionDialog'

type SuggestionPayload = {
  title: string
  content: string
  url: string
  contact_information: string
}

const mockCreateSuggestion = jest.fn<(data: SuggestionPayload) => Promise<unknown>>()
const mockUploadFile = jest.fn<(file: File) => Promise<{ saved_path: string }>>()
const mockSetPhone = jest.fn()

jest.mock('@/components/ui/motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
    button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
      <button {...props}>{children}</button>
    ),
  },
}))

jest.mock('../api/services/user.service', () => ({
  userService: {
    createSuggestion: (...args: [SuggestionPayload]) => mockCreateSuggestion(...args),
    uploadFile: (...args: [File]) => mockUploadFile(...args),
  },
}))

jest.mock('../stores', () => ({
  useAuthStore: (selector: (state: { user: { phone: string } | null }) => unknown) =>
    selector({ user: { phone: '13800000000' } }),
  useUserStore: (selector: (state: { phone: string; setPhone: typeof mockSetPhone }) => unknown) =>
    selector({
      phone: '',
      setPhone: mockSetPhone,
    }),
}))

function RewardSuggestionDialogHarness({ onClose }: { onClose: () => void }) {
  const [isOpen, setIsOpen] = React.useState(true)

  return (
    <RewardSuggestionDialog
      isOpen={isOpen}
      onClose={() => {
        onClose()
        setIsOpen(false)
      }}
      onSubmitted={jest.fn()}
      themeColor="#10b981"
    />
  )
}

describe('RewardSuggestionDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCreateSuggestion.mockResolvedValue({})
    mockUploadFile.mockResolvedValue({ saved_path: '/mock/image.png' })
  })

  test('accepts suggestion content with 5 chars', async () => {
    const user = userEvent.setup()

    render(
      <RewardSuggestionDialog
        isOpen
        onClose={jest.fn()}
        onSubmitted={jest.fn()}
        themeColor="#10b981"
      />,
    )

    await user.type(screen.getByLabelText('建议标题'), '功能建议')
    await user.type(screen.getByLabelText('建议内容'), '非常好用呀')
    await user.clear(screen.getByLabelText('联系方式'))
    await user.type(screen.getByLabelText('联系方式'), 'wx123')
    await user.click(screen.getByRole('button', { name: '提交建议' }))

    await waitFor(() => {
      expect(mockCreateSuggestion).toHaveBeenCalledWith({
        title: '功能建议',
        content: '非常好用呀',
        url: '',
        contact_information: 'wx123',
      })
    })
  })

  test('shows validation error when suggestion content is shorter than 5 chars', async () => {
    const user = userEvent.setup()

    render(
      <RewardSuggestionDialog
        isOpen
        onClose={jest.fn()}
        onSubmitted={jest.fn()}
        themeColor="#10b981"
      />,
    )

    await user.type(screen.getByLabelText('建议标题'), '功能建议')
    await user.type(screen.getByLabelText('建议内容'), '很好用啊')
    await user.clear(screen.getByLabelText('联系方式'))
    await user.type(screen.getByLabelText('联系方式'), 'wx123')
    await user.click(screen.getByRole('button', { name: '提交建议' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        '建议内容请至少描述 5 个字，方便我们理解您的需求。',
      )
    })
    expect(screen.getByRole('form', { name: '提交有奖建议' })).toHaveAccessibleDescription(
      '建议内容请至少描述 5 个字，方便我们理解您的需求。',
    )
    expect(mockCreateSuggestion).not.toHaveBeenCalled()
  })

  test('keeps visible focus styles on suggestion fields', () => {
    render(
      <RewardSuggestionDialog
        isOpen
        onClose={jest.fn()}
        onSubmitted={jest.fn()}
        themeColor="#10b981"
      />,
    )

    const fields = [
      screen.getByLabelText('建议标题'),
      screen.getByLabelText('建议内容'),
      screen.getByLabelText('联系方式'),
    ]

    fields.forEach((field) => {
      expect(field).toHaveClass('focus:ring-2')
      expect(field).toHaveClass('focus:ring-emerald-200')
      expect(field).toHaveClass('focus:border-emerald-500')
    })
  })

  test('closes with Escape and restores background scrolling', async () => {
    const onClose = jest.fn()
    const previousOverflow = document.body.style.overflow

    render(<RewardSuggestionDialogHarness onClose={onClose} />)

    const dialog = screen.getByRole('dialog', { name: '有奖建议征集' })
    expect(document.body).toHaveStyle({ overflow: 'hidden' })

    fireEvent.keyDown(dialog, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(1)
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: '有奖建议征集' })).not.toBeInTheDocument()
    })
    expect(document.body.style.overflow).toBe(previousOverflow)
  })
})
