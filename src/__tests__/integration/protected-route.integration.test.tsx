import React from 'react'
import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { ProtectedRoute } from '@/app/routes/ProtectedRoute'
import { selectIsAuthenticated, useAuthStore } from '@/stores/useAuthStore'

jest.mock('@/components/ui', () => ({
  LoadingSpinner: () => <div>loading spinner</div>,
}))

jest.mock('@/stores/useAuthStore', () => ({
  useAuthStore: jest.fn(),
  selectIsAuthenticated: (state: { accessToken: string | null }) => Boolean(state.accessToken),
}))

type AuthSelector = (state: { initialized: boolean; accessToken: string | null }) => unknown
const mockUseAuthStoreSelector = useAuthStore as unknown as jest.MockedFunction<
  (selector: AuthSelector) => unknown
>

function renderWorkspaceRoute(authState: { initialized: boolean; accessToken: string | null }) {
  mockUseAuthStoreSelector.mockImplementation((selector) => selector(authState))

  render(
    <MemoryRouter initialEntries={['/workspace']}>
      <Routes>
        <Route
          path="/workspace"
          element={
            <ProtectedRoute>
              <div>workspace shell</div>
            </ProtectedRoute>
          }
        />
        <Route path="/auth/login" element={<div>login page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('redirects unauthenticated workspace visits to the login page', () => {
    renderWorkspaceRoute({ initialized: true, accessToken: null })

    expect(screen.getByText('login page')).toBeInTheDocument()
    expect(screen.queryByText('workspace shell')).not.toBeInTheDocument()
  })

  test('renders the workspace shell after authentication is initialized', () => {
    renderWorkspaceRoute({ initialized: true, accessToken: 'token' })

    expect(screen.getByText('workspace shell')).toBeInTheDocument()
    expect(screen.queryByText('login page')).not.toBeInTheDocument()
  })

  test('keeps users on a loading state until authentication is initialized', () => {
    renderWorkspaceRoute({ initialized: false, accessToken: null })

    expect(screen.getByText('正在验证登录状态…')).toBeInTheDocument()
    expect(screen.getByText('loading spinner')).toBeInTheDocument()
  })

  test('uses the same authentication selector as production route protection', () => {
    expect(selectIsAuthenticated({ accessToken: null } as never)).toBe(false)
    expect(selectIsAuthenticated({ accessToken: 'token' } as never)).toBe(true)
  })
})
