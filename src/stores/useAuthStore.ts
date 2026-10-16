import { create } from 'zustand'

import { apiClient } from '@/api/client'
import { setUnauthorizedHandler } from '@/api/core/auth-refresh'
import { getAccessToken as getStoredAccessToken } from '@/api/core/token-storage'
import { authService, userService } from '@/api/services'
import {
  mergeUserDetailWithFallback,
  normalizeUser,
  stripSensitiveFieldsForStorage,
} from '@/utils/auth-user-normalization'
import {
  safeReadLocalStorageJson,
  safeRemoveLocalStorageItem,
  safeSetLocalStorageJson,
} from '@/utils/safe-storage'
import type {
  AuthResponse,
  LoginRequest,
  SmsLoginRequest,
  RegisterRequest,
  User,
} from '@/types/api'
import { useAsyncTaskStore } from '@/modules/workspace/stores'
import { useAsyncToolStore } from './useAsyncToolStore'
import { useModelPreferenceStore } from './useModelPreferenceStore'
import { useUserStore } from './useUserStore'

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  initialized: boolean
  isAuthenticating: boolean
  error?: string
  reauthRequired: boolean
  reauthMessage?: string
  initialize: () => Promise<void>
  login: (payload: LoginRequest) => Promise<User>
  loginWithSms: (payload: SmsLoginRequest) => Promise<User>
  register: (payload: RegisterRequest) => Promise<User>
  logout: () => Promise<void>
  refreshSession: () => Promise<void>
  setUser: (user: User | null) => void
  clearError: () => void
  forceLogout: (reason?: string) => void
  clearReauth: () => void
}

const persistAuthResponse = (response: AuthResponse) => {
  // Token 交由 token-storage 统一管理（会话级持久化 + 严格校验）。
  apiClient.setToken(response.tokens.accessToken)
  const normalizedUser = normalizeUser(response.user)
  if (normalizedUser) {
    safeSetLocalStorageJson('user', stripSensitiveFieldsForStorage(normalizedUser))
    // 同步手机号到 useUserStore（若用户未手动修改则自动填入）
    useUserStore.getState().syncFromAuth(normalizedUser.phone)
  } else {
    safeRemoveLocalStorageItem('user')
  }
}

const clearStoredSession = () => {
  // 清除 token-storage 中的 token（包含内存态与持久化态）
  apiClient.clearToken()
  safeRemoveLocalStorageItem('user')
  useAsyncToolStore.getState().clearAll()
  useAsyncTaskStore.getState().clearAll()
  useModelPreferenceStore.getState().reset()
  useUserStore.getState().reset()
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  initialized: false,
  isAuthenticating: false,
  error: undefined,
  reauthRequired: false,
  reauthMessage: undefined,

  async initialize() {
    if (get().initialized) {
      return
    }

    const accessToken = getStoredAccessToken()
    // 后端不支持 refresh token，状态层固定为 null
    const refreshToken: string | null = null

    if (!accessToken) {
      clearStoredSession()
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        initialized: true,
        error: undefined,
        reauthRequired: false,
        reauthMessage: undefined,
      })
      return
    }

    // 先从localStorage读取用户信息作为初始显示（快速响应）
    const cachedUser = normalizeUser(safeReadLocalStorageJson('user'))

    // 设置 token 并立即完成初始化，避免首屏路由被 /user/detail 阻塞。
    apiClient.setToken(accessToken)
    set({
      user: cachedUser,
      accessToken,
      refreshToken,
      initialized: true,
      error: undefined,
      reauthRequired: false,
      reauthMessage: undefined,
    })

    // 在后台刷新用户详情（包括余额），不阻塞路由。
    try {
      const detail = await userService.getUserDetail()
      if (get().accessToken !== accessToken) {
        return
      }
      const fetchedUser = mergeUserDetailWithFallback(detail, get().user ?? cachedUser)
      if (!fetchedUser) {
        return
      }
      // 更新localStorage中的用户信息
      safeSetLocalStorageJson('user', stripSensitiveFieldsForStorage(fetchedUser))
      // 同步手机号到 useUserStore
      useUserStore.getState().syncFromAuth(fetchedUser.phone)
      set({
        user: fetchedUser,
        accessToken,
        refreshToken,
        error: undefined,
        reauthRequired: false,
        reauthMessage: undefined,
      })
    } catch (error) {
      console.error('[auth] 获取最新用户信息失败', error)
      if (get().accessToken !== accessToken) {
        return
      }
      // 保留当前会话，由 401 统一回收，避免网络抖动导致误登出。
      set((state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        initialized: true,
        error: undefined,
        reauthRequired: state.reauthRequired,
        reauthMessage: state.reauthMessage,
      }))
    }
  },

  async login(payload: LoginRequest) {
    set({ isAuthenticating: true, error: undefined })
    try {
      const response = await authService.login(payload)
      const normalizedUser = normalizeUser(response.user)
      if (!normalizedUser) {
        throw new Error('登录响应缺少有效用户信息')
      }
      persistAuthResponse(response)
      set({
        user: normalizedUser,
        accessToken: response.tokens.accessToken,
        refreshToken: null,
        isAuthenticating: false,
        error: undefined,
        initialized: true,
        reauthRequired: false,
        reauthMessage: undefined,
      })
      return normalizedUser
    } catch (error) {
      const message = error instanceof Error ? error.message : '登录失败，请稍后重试'
      set({ isAuthenticating: false, error: message })
      throw error
    }
  },

  async loginWithSms(payload: SmsLoginRequest) {
    set({ isAuthenticating: true, error: undefined })
    try {
      const response = await authService.loginWithSms(payload)
      const normalizedUser = normalizeUser(response.user)
      if (!normalizedUser) {
        throw new Error('登录响应缺少有效用户信息')
      }
      persistAuthResponse(response)
      set({
        user: normalizedUser,
        accessToken: response.tokens.accessToken,
        refreshToken: null,
        isAuthenticating: false,
        error: undefined,
        initialized: true,
        reauthRequired: false,
        reauthMessage: undefined,
      })
      return normalizedUser
    } catch (error) {
      const message = error instanceof Error ? error.message : '登录失败，请稍后重试'
      set({ isAuthenticating: false, error: message })
      throw error
    }
  },

  async register(payload: RegisterRequest) {
    set({ isAuthenticating: true, error: undefined })
    try {
      const response = await authService.register(payload)
      const normalizedUser = normalizeUser(response.user)
      if (!normalizedUser) {
        throw new Error('注册响应缺少有效用户信息')
      }
      persistAuthResponse(response)
      set({
        user: normalizedUser,
        accessToken: response.tokens.accessToken,
        refreshToken: null,
        isAuthenticating: false,
        error: undefined,
        initialized: true,
        reauthRequired: false,
        reauthMessage: undefined,
      })
      return normalizedUser
    } catch (error) {
      const message = error instanceof Error ? error.message : '注册失败，请稍后重试'
      set({ isAuthenticating: false, error: message })
      throw error
    }
  },

  async logout() {
    try {
      await authService.logout()
    } catch (error) {
      console.warn('[auth] 调用登出接口失败，已忽略', error)
    } finally {
      clearStoredSession()
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        error: undefined,
        initialized: true,
        isAuthenticating: false,
        reauthRequired: false,
        reauthMessage: undefined,
      })
    }
  },

  async refreshSession() {
    // 后端不支持 token 刷新，直接强制登出
    // Backend does not support token refresh, force logout directly
    console.warn('[auth] Token refresh is not supported by backend, forcing logout')
    get().forceLogout('登录状态已过期，请重新登录')
  },

  setUser(user: User | null) {
    const normalizedUser = user ? normalizeUser(user) : null
    set((state) => ({
      user: normalizedUser,
      error: undefined,
      accessToken: state.accessToken,
      refreshToken: state.refreshToken,
      reauthRequired: false,
      reauthMessage: undefined,
    }))
    if (normalizedUser) {
      safeSetLocalStorageJson('user', stripSensitiveFieldsForStorage(normalizedUser))
      useUserStore.getState().syncFromAuth(normalizedUser.phone)
    } else {
      safeRemoveLocalStorageItem('user')
    }
  },

  clearError() {
    set({ error: undefined })
  },

  forceLogout(reason = '登录状态已过期，请重新登录') {
    clearStoredSession()
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      error: undefined,
      initialized: true,
      isAuthenticating: false,
      reauthRequired: true,
      reauthMessage: reason,
    })
  },

  clearReauth() {
    set({
      reauthRequired: false,
      reauthMessage: undefined,
    })
  },
}))

setUnauthorizedHandler((reason) => {
  useAuthStore.getState().forceLogout(reason)
})

export const selectIsAuthenticated = (state: AuthState) => Boolean(state.accessToken)
