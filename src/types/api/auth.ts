// 1. 用户认证模块（/auth）

import type { User } from './user'

export interface SmsLoginRequest {
  phone: string
  code: string
  captchaToken?: string
  captchaSessionId?: string
  captchaSig?: string
  rememberDurationDays?: number
}

export interface PasswordLoginRequest {
  phone: string
  password: string
  rememberDurationDays?: number
}

export interface SendSmsCodeRequest {
  phone: string
  captchaToken?: string
  captchaSessionId?: string
  captchaSig?: string
  scene?: 'login' | 'register' | 'reset-password'
  provider?: 'aliyun'
  templateCode?: string
  signName?: string
  outId?: string
}

export interface CaptchaVerifyResult {
  captchaToken: string
  captchaSessionId: string
  captchaSig?: string
  scene: string
}

export interface RegisterRequest {
  phone: string
  code: string
  password?: string
  invitationCode?: string
  captchaToken?: string
  captchaSessionId?: string
  captchaSig?: string
  acceptTerms?: boolean
}

export interface LoginResponse {
  code: number
  msg: string
  data: {
    id: number
    username: string
    phone: string
    balance: number
    invite_code: string
    register_time: string
    last_login_time: string
    token: string
  }
}

export interface RegisterResponse extends LoginResponse {}

export interface AuthResponse {
  user: User
  tokens: {
    accessToken: string
    refreshToken: string
    expiresIn: number
  }
}

export interface RefreshTokenRequest {
  refreshToken: string
}

export interface WeChatLoginSession {
  sceneId: string
  qrCodeUrl: string
  expiresIn: number
  clientLaunchScheme?: string
  hint?: string
}

export interface WeChatLoginStatus {
  sceneId: string
  status: 'waiting' | 'scanned' | 'confirmed' | 'expired'
  message?: string
}

export interface WeChatConfirmRequest {
  sceneId: string
  rememberDurationDays?: number
}
