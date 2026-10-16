import React from 'react'
import { describe, expect, jest, test, beforeEach } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { SessionExpiryBanner } from './SessionExpiryBanner'

const mockNavigate = jest.fn()
const mockUseLocation = jest.fn<() => { pathname: string }>()
const mockUseAuthStore = jest.fn()
const mockGetAccessTokenRemainingMs = jest.fn<() => number | null>()

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => mockUseLocation(),
}))

jest.mock('@/stores/useAuthStore', () => ({
  useAuthStore: (selector: (state: { accessToken: string | null }) => unknown) =>
    mockUseAuthStore(selector),
}))

jest.mock('@/api/core/token-storage', () => ({
  getAccessTokenRemainingMs: () => mockGetAccessTokenRemainingMs(),
}))

describe('SessionExpiryBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseLocation.mockReturnValue({ pathname: '/workspace' })
    mockUseAuthStore.mockImplementation(
      (selector: (state: { accessToken: string | null }) => unknown) =>
        selector({ accessToken: 'token-123' }),
    )
  })

  test('shows banner when session is within 5-minute warning window', () => {
    mockGetAccessTokenRemainingMs.mockReturnValue(4 * 60 * 1000)

    render(<SessionExpiryBanner />)

    expect(screen.queryByText(/登录状态即将过期/)).not.toBeNull()
    expect(screen.queryByRole('button', { name: '重新登录' })).not.toBeNull()
  })

  test('does not show banner when remaining time is over 5 minutes', () => {
    mockGetAccessTokenRemainingMs.mockReturnValue(10 * 60 * 1000)

    render(<SessionExpiryBanner />)

    expect(screen.queryByText(/登录状态即将过期/)).toBeNull()
  })

  test('does not show banner on auth routes', () => {
    mockUseLocation.mockReturnValue({ pathname: '/auth/login' })
    mockGetAccessTokenRemainingMs.mockReturnValue(2 * 60 * 1000)

    render(<SessionExpiryBanner />)

    expect(screen.queryByText(/登录状态即将过期/)).toBeNull()
  })

  test('can dismiss reminder for current token lifecycle', async () => {
    const user = userEvent.setup()
    mockGetAccessTokenRemainingMs.mockReturnValue(2 * 60 * 1000)

    const { rerender } = render(<SessionExpiryBanner />)

    await user.click(screen.getByRole('button', { name: '稍后提醒' }))
    expect(screen.queryByText(/登录状态即将过期/)).toBeNull()

    rerender(<SessionExpiryBanner />)

    expect(screen.queryByText(/登录状态即将过期/)).toBeNull()
  })

  test('navigates to auth page when clicking relogin', async () => {
    const user = userEvent.setup()
    mockGetAccessTokenRemainingMs.mockReturnValue(2 * 60 * 1000)

    render(<SessionExpiryBanner />)

    await user.click(screen.getByRole('button', { name: '重新登录' }))
    expect(mockNavigate).toHaveBeenCalledWith('/auth', expect.objectContaining({ replace: true }))
  })
})
