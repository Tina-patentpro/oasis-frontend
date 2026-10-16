/**
 * 认证服务
 * 处理用户登录、注册、令牌刷新等认证相关功能
 */

import type {
  LoginRequest,
  SmsLoginRequest,
  PasswordLoginRequest,
  RegisterRequest,
  AuthResponse,
  ChangePasswordRequest,
  SendSmsCodeRequest,
  User,
} from '@/types/api'
import {
  safeReadLocalStorageJson,
  safeRemoveLocalStorageItem,
  safeSetLocalStorageJson,
} from '@/utils/safe-storage'
import { stripSensitiveFieldsForStorage } from '@/utils/auth-user-normalization'

import { apiClient } from '../client'
import { getAccessToken as getStoredAccessToken } from '../core/token-storage'
import { createResponseValidator, isRecord } from '../validation'

interface AuthLoginResponse {
  id: number
  username: string
  phone: string
  balance: number
  invite_code: string
  register_time: string
  last_login_time: string
  token: string
}

interface InvitationValidationResponse {
  success: boolean
  data?: Record<string, unknown>
}

interface VerifyRegistrationPayload {
  email: string
  code: string
}

interface ResendVerificationCodePayload {
  email: string
}

interface AuthContractResponse {
  success: boolean
  data?: Record<string, unknown>
}

const isAuthLoginResponse = (payload: unknown): payload is AuthLoginResponse =>
  isRecord(payload) &&
  typeof payload['id'] === 'number' &&
  typeof payload['username'] === 'string' &&
  typeof payload['phone'] === 'string' &&
  typeof payload['balance'] === 'number' &&
  typeof payload['invite_code'] === 'string' &&
  typeof payload['register_time'] === 'string' &&
  typeof payload['last_login_time'] === 'string' &&
  typeof payload['token'] === 'string'

const validateAuthLoginResponse = createResponseValidator<AuthLoginResponse>(
  isAuthLoginResponse,
  'auth login',
)

const storeTokens = (response: AuthResponse) => {
  const { accessToken } = response.tokens
  apiClient.setToken(accessToken)
  safeSetLocalStorageJson('user', stripSensitiveFieldsForStorage(response.user))
}

const clearTokens = () => {
  apiClient.clearToken()
  safeRemoveLocalStorageItem('user')
}

class AuthService {
  /**
   * 密码登录
   */
  async loginWithPassword(data: PasswordLoginRequest): Promise<AuthResponse> {
    // 调用新的密码登录接口
    // apiClient会自动提取data字段，所以loginResponse就是{code, msg, data}中的data
    const loginResponse = await apiClient.post<AuthLoginResponse>(
      '/auth/pwdlogin',
      {
        phone: data.phone,
        password: data.password,
      },
      validateAuthLoginResponse,
    )

    const accessToken = typeof loginResponse.token === 'string' ? loginResponse.token.trim() : ''
    if (!accessToken) {
      throw new Error('[AuthService] /auth/pwdlogin 响应缺少 token')
    }

    // 将新的响应格式转换为AuthResponse
    const user: User = {
      id: loginResponse.id,
      email: '', // 新接口不返回email，使用空字符串
      username: loginResponse.username,
      phone: loginResponse.phone,
      balance: loginResponse.balance,
      role: 'user', // 默认为普通用户
      createdAt: loginResponse.register_time,
      updatedAt: loginResponse.last_login_time,
    }

    const authResponse: AuthResponse = {
      user,
      tokens: {
        accessToken,
        refreshToken: '', // 新接口不返回refreshToken，使用空字符串
        expiresIn: 3600, // 默认1小时过期
      },
    }

    storeTokens(authResponse)
    return authResponse
  }

  /**
   * 手机验证码登录
   */
  async loginWithSms(data: SmsLoginRequest): Promise<AuthResponse> {
    // 调用新的短信登录接口
    // apiClient会自动提取data字段，所以loginResponse就是{code, msg, data}中的data
    const loginResponse = await apiClient.post<AuthLoginResponse>(
      '/auth/login',
      {
        phone: data.phone,
        code: data.code,
      },
      validateAuthLoginResponse,
    )

    const accessToken = typeof loginResponse.token === 'string' ? loginResponse.token.trim() : ''
    if (!accessToken) {
      throw new Error('[AuthService] /auth/login 响应缺少 token')
    }

    // 将新的响应格式转换为AuthResponse
    const user: User = {
      id: loginResponse.id,
      email: '', // 新接口不返回email，使用空字符串
      username: loginResponse.username,
      phone: loginResponse.phone,
      balance: loginResponse.balance,
      role: 'user', // 默认为普通用户
      createdAt: loginResponse.register_time,
      updatedAt: loginResponse.last_login_time,
    }

    const authResponse: AuthResponse = {
      user,
      tokens: {
        accessToken,
        refreshToken: '', // 新接口不返回refreshToken，使用空字符串
        expiresIn: 3600, // 默认1小时过期
      },
    }

    storeTokens(authResponse)
    return authResponse
  }

  /**
   * 统一登录入口（兼容旧代码）
   */
  async login(data: LoginRequest): Promise<AuthResponse> {
    if ('code' in data) {
      return this.loginWithSms(data)
    }
    return this.loginWithPassword(data)
  }

  /**
   * 发送短信验证码
   */
  async sendSmsCode(data: SendSmsCodeRequest): Promise<void> {
    // 新API只需要phone参数
    await apiClient.post('/auth/send', { phone: data.phone })
  }

  /**
   * 用户注册
   */
  async register(data: RegisterRequest): Promise<AuthResponse> {
    // 调用新的注册接口
    // apiClient会自动提取data字段，所以registerResponse就是{code, msg, data}中的data
    const registerResponse = await apiClient.post<AuthLoginResponse>(
      '/auth/register',
      {
        phone: data.phone,
        code: data.code,
        password: data.password,
        invite_code: data.invitationCode,
      },
      validateAuthLoginResponse,
    )

    const accessToken =
      typeof registerResponse.token === 'string' ? registerResponse.token.trim() : ''
    if (!accessToken) {
      throw new Error('[AuthService] /auth/register 响应缺少 token')
    }

    // 将新的响应格式转换为AuthResponse
    const user: User = {
      id: registerResponse.id,
      email: '', // 新接口不返回email，使用空字符串
      username: registerResponse.username,
      phone: registerResponse.phone,
      balance: registerResponse.balance,
      role: 'user', // 默认为普通用户
      createdAt: registerResponse.register_time,
      updatedAt: registerResponse.last_login_time,
    }

    const authResponse: AuthResponse = {
      user,
      tokens: {
        accessToken,
        refreshToken: '', // 新接口不返回refreshToken，使用空字符串
        expiresIn: 3600, // 默认1小时过期
      },
    }

    storeTokens(authResponse)
    return authResponse
  }

  async validateInvitationCode(
    code: string,
    options?: { signal?: AbortSignal },
  ): Promise<InvitationValidationResponse> {
    return apiClient.get<InvitationValidationResponse>(
      `/api/auth/invitations/${code}`,
      undefined,
      undefined,
      { signal: options?.signal },
    )
  }

  async verifyRegistration(
    payload: VerifyRegistrationPayload,
    options?: { signal?: AbortSignal },
  ): Promise<AuthContractResponse> {
    return apiClient.post<AuthContractResponse, VerifyRegistrationPayload>(
      '/api/auth/register/verify',
      payload,
      undefined,
      { signal: options?.signal },
    )
  }

  async resendVerificationCode(
    payload: ResendVerificationCodePayload,
    options?: { signal?: AbortSignal },
  ): Promise<AuthContractResponse> {
    return apiClient.post<AuthContractResponse, ResendVerificationCodePayload>(
      '/api/auth/register/resend',
      payload,
      undefined,
      { signal: options?.signal },
    )
  }

  /**
   * 用户登出
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout')
    } finally {
      clearTokens()
    }
  }

  /**
   * 修改密码
   */
  async changePassword(data: ChangePasswordRequest): Promise<void> {
    await apiClient.post('/user/updatepwd', {
      password: data.oldPassword,
      newpasssword: data.newPassword,
      truepassword: data.newPassword, // 使用新密码作为确认密码
    })
  }

  /**
   * 获取当前用户信息
   */
  getCurrentUser() {
    return safeReadLocalStorageJson<User>('user')
  }

  /**
   * 获取访问令牌
   */
  getAccessToken(): string | null {
    return getStoredAccessToken()
  }

  /**
   * 获取刷新令牌
   */
  getRefreshToken(): string | null {
    return null
  }

  /**
   * 检查是否已登录
   */
  isAuthenticated(): boolean {
    return !!this.getAccessToken()
  }
}

export const authService = new AuthService()
