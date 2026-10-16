/**
 * 用户服务
 * 处理用户信息管理
 */

import type {
  User,
  UpdateUserRequest,
  FileUploadResponse,
  CreateUserSuggestionRequest,
  CreateUserSuggestionResponse,
  UserDetail,
  InviteConfig,
  UserInviteListResponse,
  UserInviteListParams,
  UserDataStats,
  ClearUserDataResult,
} from '@/types/api'
import {
  mergeUserDetailWithFallback,
  normalizeUser,
  stripSensitiveFieldsForStorage,
} from '@/utils/auth-user-normalization'
import { safeReadLocalStorageJson, safeSetLocalStorageJson } from '@/utils/safe-storage'

import { apiClient } from '../client'
import { isRecord } from '../validation'

function isUserDetailLike(value: unknown): value is UserDetail {
  return (
    isRecord(value) && typeof value['username'] === 'string' && typeof value['balance'] === 'number'
  )
}

interface CurrentUserProfileResponse {
  success: boolean
  data?: Record<string, unknown>
}

interface UserPreferencesResponse {
  success: boolean
  data?: Record<string, unknown>
}

interface CurrentUserProfilePayload {
  displayName?: string
  avatarUrl?: string
  locale?: string
  timezone?: string
  phone?: string
  metadata?: Record<string, unknown>
}

interface UserPreferencesPayload {
  theme?: 'light' | 'dark' | 'system'
  language?: string
  dateFormat?: string
  notification?: {
    email?: boolean
    sms?: boolean
    inApp?: boolean
  }
  accessibility?: {
    fontScale?: number
    highContrast?: boolean
  }
}

class UserService {
  private readCachedUser(): User | null {
    return normalizeUser(safeReadLocalStorageJson('user'))
  }

  /**
   * 获取当前用户信息
   * @deprecated 请使用 getUserDetail() 代替
   */
  async getCurrentUser(options?: { signal?: AbortSignal }): Promise<User> {
    const detail = await this.getUserDetail(options)
    const merged = mergeUserDetailWithFallback(detail, this.readCachedUser())
    if (!merged) {
      throw new Error('[UserService] /user/detail 响应缺少用户ID，无法构建用户信息')
    }
    return merged
  }

  /**
   * 更新用户信息
   */
  async updateUser(data: UpdateUserRequest): Promise<User> {
    await apiClient.post<{ code: number; msg: string }>('/user/update', {
      username: data.username || '',
      phone: data.phone || '',
      email: '',
      avatar: data.avatarUrl || '',
    })

    const detail = await this.getUserDetail()
    const mapped = mergeUserDetailWithFallback(detail, this.readCachedUser())
    if (!mapped) {
      throw new Error('[UserService] 更新用户后无法构建有效用户信息')
    }

    safeSetLocalStorageJson('user', stripSensitiveFieldsForStorage(mapped))
    return mapped
  }

  /**
   * 上传头像
   */
  async uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
    const formData = new FormData()
    formData.append('file', file)

    const uploadResponse = await apiClient.uploadFile<{ url?: string; saved_path?: string }>(
      '/user/upload',
      formData,
    )
    const avatarUrl = uploadResponse?.url || uploadResponse?.saved_path || ''
    if (!avatarUrl) {
      throw new Error('上传头像失败：后端未返回URL')
    }

    const detail = await this.getUserDetail()
    await apiClient.post<{ code: number; msg: string }>('/user/update', {
      avatar: avatarUrl,
      username: detail.username || '',
      phone: detail.phone || '',
      email: detail.email || '',
    })

    return { avatarUrl }
  }

  /**
   * 上传文件（通用上传接口）
   */
  async uploadFile(file: File): Promise<FileUploadResponse> {
    const formData = new FormData()
    formData.append('file', file)

    // 使用 apiClient.uploadFile 方法来处理 FormData
    return await apiClient.uploadFile<FileUploadResponse>('/user/upload', formData)
  }

  /**
   * 创建用户建议
   */
  async createSuggestion(data: CreateUserSuggestionRequest): Promise<CreateUserSuggestionResponse> {
    return await apiClient.post<CreateUserSuggestionResponse>('/usersuggestion/create', data)
  }

  /**
   * 获取用户详情
   */
  async getUserDetail(options?: { signal?: AbortSignal }): Promise<UserDetail> {
    const response = await apiClient.get<unknown>('/user/detail', undefined, undefined, {
      signal: options?.signal,
    })
    if (!isUserDetailLike(response)) {
      throw new Error('无效的用户详情响应')
    }
    return response
  }

  async getCurrentUserProfile(options?: {
    signal?: AbortSignal
  }): Promise<CurrentUserProfileResponse> {
    return await apiClient.get<CurrentUserProfileResponse>('/api/users/me', undefined, undefined, {
      signal: options?.signal,
    })
  }

  async getUserPreferences(options?: { signal?: AbortSignal }): Promise<UserPreferencesResponse> {
    return await apiClient.get<UserPreferencesResponse>(
      '/api/users/me/preferences',
      undefined,
      undefined,
      {
        signal: options?.signal,
      },
    )
  }

  async updateCurrentUserProfile(
    payload: CurrentUserProfilePayload,
    options?: { signal?: AbortSignal },
  ): Promise<CurrentUserProfileResponse> {
    return await apiClient.patch<CurrentUserProfileResponse, CurrentUserProfilePayload>(
      '/api/users/me',
      payload,
      undefined,
      { signal: options?.signal },
    )
  }

  async updateUserPreferences(
    payload: UserPreferencesPayload,
    options?: { signal?: AbortSignal },
  ): Promise<UserPreferencesResponse> {
    return await apiClient.put<UserPreferencesResponse, UserPreferencesPayload>(
      '/api/users/me/preferences',
      payload,
      undefined,
      { signal: options?.signal },
    )
  }

  /**
   * 更新用户详情
   */
  async updateUserDetail(data: {
    avatar?: string
    username?: string
    phone?: string
    email?: string
  }): Promise<{ code: number; msg: string }> {
    return await apiClient.post<{ code: number; msg: string }>('/user/update', data)
  }

  /**
   * 获取用户邀请列表
   */
  async getUserInviteList(
    params: UserInviteListParams,
    options?: { signal?: AbortSignal },
  ): Promise<UserInviteListResponse> {
    return await apiClient.get<UserInviteListResponse>('/user/userinviteslist', params, undefined, {
      signal: options?.signal,
    })
  }

  /**
   * 获取邀请配置
   * 按 API接口文档-用户端.md：GET /user/user/inviteconfig
   */
  async getInviteConfig(options?: { signal?: AbortSignal }): Promise<InviteConfig> {
    return await apiClient.get<InviteConfig>('/user/user/inviteconfig', undefined, undefined, {
      signal: options?.signal,
    })
  }

  /**
   * 修改密码
   */
  async updatePassword(data: {
    password: string
    newpasssword: string
    truepassword: string
  }): Promise<{ code: number; msg: string }> {
    return await apiClient.post<{ code: number; msg: string }>('/user/updatepwd', data)
  }

  /**
   * 获取用户数据统计
   * GET /user/user/data/stats
   */
  async getUserDataStats(options?: { signal?: AbortSignal }): Promise<UserDataStats> {
    return await apiClient.get<UserDataStats>('/user/user/data/stats', undefined, undefined, {
      signal: options?.signal,
    })
  }

  /**
   * 导出用户数据
   * GET /user/user/data/export
   */
  async exportUserData(options?: { signal?: AbortSignal }): Promise<Blob> {
    const { exportUserDataFile } = await import('./user-export.service')
    return await exportUserDataFile(options)
  }

  /**
   * 清空用户数据
   * POST /user/user/data/clear
   */
  async clearUserData(): Promise<ClearUserDataResult> {
    return await apiClient.post<ClearUserDataResult>('/user/user/data/clear', {})
  }
}

export const userService = new UserService()
