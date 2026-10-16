import { afterEach, describe, expect, jest, test } from '@jest/globals'

const authLogoutMock = jest.fn(async () => undefined)
const clearTokenMock = jest.fn()
const setTokenMock = jest.fn()

jest.mock('@/api/client', () => ({
  apiClient: {
    clearToken: clearTokenMock,
    setToken: setTokenMock,
  },
}))

jest.mock('@/api/services', () => ({
  authService: {
    login: jest.fn(),
    loginWithSms: jest.fn(),
    logout: authLogoutMock,
    register: jest.fn(),
  },
  userService: {
    getUserDetail: jest.fn(),
  },
}))

import { useAsyncToolStore } from './useAsyncToolStore'
import { useAuthStore } from './useAuthStore'
import { useModelPreferenceStore } from './useModelPreferenceStore'
import { useUserStore } from './useUserStore'
import { useAsyncTaskStore } from '@/modules/workspace/stores'

describe('useAuthStore logout cleanup', () => {
  afterEach(() => {
    authLogoutMock.mockClear()
    clearTokenMock.mockClear()
    setTokenMock.mockClear()
    localStorage.clear()
    sessionStorage.clear()
    useAsyncToolStore.getState().clearAll()
    useAsyncTaskStore.getState().clearAll()
    useModelPreferenceStore.getState().reset()
    useUserStore.setState({
      phone: undefined,
      phoneManuallySet: false,
      profile: null,
    })
    useAuthStore.setState({
      accessToken: null,
      error: undefined,
      initialized: false,
      isAuthenticating: false,
      reauthMessage: undefined,
      reauthRequired: false,
      refreshToken: null,
      user: null,
    })
  })

  test('clears user-scoped stores when logging out', async () => {
    useAsyncToolStore.getState().setEndpointAsync('/api/tools/a', true)
    useModelPreferenceStore.getState().setToolVisibility('claims-generator', false)
    useAsyncTaskStore.getState().addAsyncTask({
      apiDetailId: 1,
      apiName: 'claims-generator',
      taskKey: 'task-a',
      folderId: 1,
      progressPercent: 25,
      currentStepName: '生成中',
      status: 'running',
      toolName: '权利要求生成',
    })
    useUserStore.getState().setPhone('13800000000')
    useUserStore.getState().setProfile({
      company: 'A 公司',
      customerNumber: 'C-001',
      email: 'a@example.com',
      id: 'user-a',
      name: '用户 A',
      phone: '13800000000',
    })
    useAuthStore.setState({
      accessToken: 'token-a',
      initialized: true,
    })

    await useAuthStore.getState().logout()

    expect(clearTokenMock).toHaveBeenCalled()
    expect(useAsyncToolStore.getState().asyncEndpointMap).toEqual({})
    expect(useAsyncTaskStore.getState().tasks).toEqual({})
    expect(useAsyncTaskStore.getState().daemonHeartbeatAt).toBeNull()
    expect(useModelPreferenceStore.getState().toolVisibility).toEqual({})
    expect(useUserStore.getState().profile).toBeNull()
    expect(useUserStore.getState().phone).toBeUndefined()
    expect(useUserStore.getState().phoneManuallySet).toBe(false)
  })
})
