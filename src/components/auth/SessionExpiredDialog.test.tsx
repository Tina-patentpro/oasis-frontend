import React from 'react'
import { afterEach, describe, expect, jest, test } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

jest.mock('@/api/client', () => ({
  apiClient: {
    clearToken: jest.fn(),
    setToken: jest.fn(),
  },
}))

jest.mock('@/api/services', () => ({
  authService: {
    login: jest.fn(),
    loginWithSms: jest.fn(),
    logout: jest.fn(),
    register: jest.fn(),
  },
  userService: {
    getUserDetail: jest.fn(),
  },
}))

import { useAuthStore } from '@/stores/useAuthStore'

import { SessionExpiredDialog } from './SessionExpiredDialog'

describe('SessionExpiredDialog accessibility', () => {
  afterEach(() => {
    useAuthStore.setState({
      reauthRequired: false,
      reauthMessage: undefined,
    })
  })

  test('exposes the expired session prompt as a modal dialog', () => {
    useAuthStore.setState({
      reauthRequired: true,
      reauthMessage: '会话已过期，请重新登录。',
    })

    render(
      <MemoryRouter initialEntries={['/workspace']}>
        <SessionExpiredDialog />
      </MemoryRouter>,
    )

    expect(screen.getByRole('dialog', { name: '登录状态已失效' })).toBeInTheDocument()
    expect(screen.getByText('会话已过期，请重新登录。')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '重新登录' })).toBeInTheDocument()
  })
})
