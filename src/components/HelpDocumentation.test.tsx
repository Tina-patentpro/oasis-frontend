import React from 'react'
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { HelpDocumentation } from './HelpDocumentation'

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

const helpMarkdown = `
## getting-started | 快速开始 | 🚀

### 第一步
- 1. 打开工作区
- 2. 选择功能
`

function HelpDocumentationHarness({ onClose }: { onClose: () => void }) {
  const [isOpen, setIsOpen] = React.useState(true)

  return (
    <HelpDocumentation
      isOpen={isOpen}
      onClose={() => {
        onClose()
        setIsOpen(false)
      }}
      themeColor="#10b981"
    />
  )
}

describe('HelpDocumentation', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    global.fetch = jest.fn<typeof fetch>(
      async () =>
        ({
          ok: true,
          text: async () => helpMarkdown,
        }) as unknown as Response,
    )
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  test('loads help content inside an accessible dialog', async () => {
    render(<HelpDocumentation isOpen onClose={jest.fn()} themeColor="#10b981" />)

    expect(screen.getByRole('dialog', { name: '帮助文档' })).toHaveAttribute('aria-modal', 'true')
    expect(await screen.findByRole('button', { name: '🚀 快速开始' })).toBeInTheDocument()
    expect(screen.getByText('第一步')).toBeInTheDocument()
  })

  test('announces help document loading errors as alerts', async () => {
    global.fetch = jest.fn<typeof fetch>(
      async () =>
        ({
          ok: false,
          status: 500,
        }) as unknown as Response,
    )

    render(<HelpDocumentation isOpen onClose={jest.fn()} themeColor="#10b981" />)

    expect(await screen.findByRole('alert')).toHaveTextContent('帮助文档加载失败（状态码：500）')
  })

  test('closes with Escape and restores background scrolling', async () => {
    const onClose = jest.fn()
    const previousOverflow = document.body.style.overflow

    render(<HelpDocumentationHarness onClose={onClose} />)

    const dialog = screen.getByRole('dialog', { name: '帮助文档' })
    expect(document.body).toHaveStyle({ overflow: 'hidden' })

    fireEvent.keyDown(dialog, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(1)
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: '帮助文档' })).not.toBeInTheDocument()
    })
    expect(document.body.style.overflow).toBe(previousOverflow)
  })
})
