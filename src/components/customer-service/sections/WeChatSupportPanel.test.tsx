import React from 'react'
import { describe, expect, jest, test } from '@jest/globals'
import { fireEvent, render, screen } from '@testing-library/react'

import { WeChatSupportPanel } from './WeChatSupportPanel'

jest.mock('@/components/ui/motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
}))

describe('WeChatSupportPanel', () => {
  test('shows real fallback contact paths instead of a fake qr code when the qr image fails', () => {
    render(<WeChatSupportPanel themeColor="#10b981" />)

    fireEvent.error(screen.getByAltText('微信客服二维码'))

    expect(screen.queryByAltText('微信客服二维码')).toBeNull()
    expect(screen.getByRole('alert')).toHaveTextContent('二维码加载失败')
    expect(screen.getByText('oasis-support')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '发送邮件给客服' })).toHaveAttribute(
      'href',
      'mailto:contact@oasisintwrite.com',
    )
  })
})
