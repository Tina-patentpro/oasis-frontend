# 前端改进建议 - 优化后端对接

**文档版本**：1.0.0  
**更新日期**：2025-10-04  
**目标**：通过前端改进，降低后端开发难度，提升前后端对接效率

---

## 📋 目录

1. [类型系统完善](#类型系统完善)
2. [API服务层建立](#api服务层建立)
3. [数据格式标准化](#数据格式标准化)
4. [错误处理统一化](#错误处理统一化)
5. [Mock数据规范](#mock数据规范)
6. [开发工具优化](#开发工具优化)

---

## 🎯 一、类型系统完善

### 当前问题

- 类型定义不完整，缺少后端API响应类型
- 缺少请求参数类型定义
- 类型命名使用缩写（如 `k`, `t`, `pri`），不利于后端理解

### 改进方案

#### 1.1 创建完整的API类型定义

```typescript
// src/types/api.ts - 新建文件

// ==================== 通用响应类型 ====================
export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  timestamp: string
}

export interface ApiError {
  success: false
  error: {
    code: string
    message: string
    details?: any
  }
  timestamp: string
}

export interface PaginatedResponse<T> {
  items: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

// ==================== 用户相关 ====================
export interface User {
  id: number
  email: string
  username: string
  phone?: string
  avatarUrl?: string
  balance: number
  role: 'user' | 'admin'
  createdAt: string
  updatedAt: string
}

export interface UpdateUserRequest {
  username?: string
  phone?: string
  avatarUrl?: string
}

// ==================== 项目相关 ====================
export interface Project {
  id: number
  userId: number
  name: string
  description?: string
  status: 'active' | 'archived'
  sessionCount?: number
  createdAt: string
  updatedAt: string
}

export interface CreateProjectRequest {
  name: string
  description?: string
}

export interface UpdateProjectRequest {
  name?: string
  description?: string
  status?: 'active' | 'archived'
}

// ==================== 会话相关 ====================
export interface Session {
  id: number
  userId: number
  projectId?: number
  title: string
  toolType: string
  modelVersion: string
  status: 'draft' | 'completed'
  createdAt: string
  updatedAt: string
}

export interface SessionDetail extends Session {
  inputs: SessionInput[]
  outputs: SessionOutput[]
  chatMessages: ChatMessage[]
}

export interface SessionInput {
  id: number
  sessionId: number
  sectionKey: string
  content: string
  createdAt: string
  updatedAt: string
}

export interface SessionOutput {
  id: number
  sessionId: number
  content: string
  version: number
  tokensUsed?: number
  cost?: number
  createdAt: string
}

export interface CreateSessionRequest {
  projectId?: number
  title: string
  toolType: string
  modelVersion: string
}

export interface UpdateSessionInputsRequest {
  sections: Record<string, string>
}

// ==================== AI生成相关 ====================
export interface GenerateRequest {
  sessionId: number
  toolType: string
  modelVersion: string
  inputs: Record<string, string>
}

export interface GenerateResponse {
  generatedContent: string
  tokenUsed: number
  cost: number
}

export interface StreamEvent {
  type: 'start' | 'chunk' | 'complete' | 'error'
  content?: string
  message?: string
  fullContent?: string
}

// ==================== 聊天相关 ====================
export interface ChatMessage {
  id: number
  sessionId: number
  role: 'user' | 'assistant'
  content: string
  mode: 'general' | 'image' | 'focus'
  tokensUsed?: number
  cost?: number
  createdAt: string
}

export interface SendChatRequest {
  sessionId: number
  message: string
  mode: 'general' | 'image' | 'focus'
  attachments?: {
    type: 'file' | 'image'
    url: string
  }[]
}

// ==================== 文件相关 ====================
export interface FileUploadToken {
  accessKeyId: string
  accessKeySecret: string
  securityToken: string
  expiration: string
  bucket: string
  region: string
  key: string
}

export interface File {
  id: number
  userId: number
  sessionId?: number
  filename: string
  originalName: string
  fileType: 'image' | 'document' | 'other'
  mimeType: string
  size: number
  ossUrl: string
  ossKey: string
  createdAt: string
}

export interface ConfirmFileRequest {
  filename: string
  originalName: string
  fileType: 'image' | 'document' | 'other'
  mimeType: string
  size: number
  ossKey: string
  sessionId?: number
}

// ==================== 通知相关 ====================
export interface Notification {
  id: number
  userId: number
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  read: boolean
  createdAt: string
}

// ==================== 交易相关 ====================
export interface Transaction {
  id: number
  userId: number
  type: 'recharge' | 'consume' | 'bonus' | 'refund'
  amount: number
  balanceAfter: number
  description: string
  sessionId?: number
  paymentId?: string
  createdAt: string
}

export interface RechargeRequest {
  amount: number
  paymentMethod: 'alipay' | 'wechat'
}

// ==================== 推荐码相关 ====================
export interface ReferralCode {
  id: number
  userId: number
  code: string
  maxUsage: number
  usedCount: number
  rewardAmount: number
  createdAt: string
}

export interface ReferralRecord {
  id: number
  referralCodeId: number
  referrerUserId: number
  refereeUserId: number
  rewardAmount: number
  createdAt: string
}

export interface UseReferralCodeRequest {
  code: string
}

// ==================== CMS配置相关 ====================
export interface ModelCategory {
  id: string
  name: string
  description: string
  icon: string
  tools: string[]
  sortOrder: number
}

export interface Tool {
  id: string
  name: string
  category: string
  description: string
  versions: ToolVersion[]
  sortOrder: number
}

export interface ToolVersion {
  id: string
  name: string
  description: string
  costMultiplier: number
  features: string[]
}

export interface WorkflowStep {
  label: string
  description?: string
}

export interface InputSection {
  key: string
  label: string
  placeholder?: string
  supportsFileUpload: boolean
  supportsImageUpload: boolean
  required: boolean
}

export interface RechargePackage {
  id: string
  name: string
  amount: number
  bonusAmount: number
  description: string
  recommended: boolean
  sortOrder: number
}

export interface ChatMode {
  id: string
  name: string
  description: string
  pricing: {
    version: string
    pricePerMessage: number
  }
  features: string[]
}

// ==================== 查询参数 ====================
export interface ListSessionsParams {
  type?: 'independent' | 'all'
  projectId?: number
  page?: number
  pageSize?: number
}

export interface ListProjectsParams {
  status?: 'active' | 'archived'
  page?: number
  pageSize?: number
}

export interface ListTransactionsParams {
  type?: 'all' | 'recharge' | 'consume' | 'bonus' | 'refund'
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}

export interface ListNotificationsParams {
  read?: boolean
  page?: number
  pageSize?: number
}
```

#### 1.2 重构现有类型，使用完整命名

```typescript
// src/types/common.ts - 改进版

export interface Theme {
  background: string // 原 bg
  primary: string // 原 pri
  primaryHover: string // 原 priH
  name: string
}

export interface Destination {
  key: string // 原 k
  title: string // 原 t
}

// 其他保持不变...
```

---

## 🔌 二、API服务层建立

### 当前问题

- 缺少统一的API调用层
- API调用分散在各个组件中
- 缺少请求/响应拦截器
- 错误处理不统一

### 改进方案

#### 2.1 创建API客户端基础类

```typescript
// src/api/client.ts - 新建文件

import type { ApiResponse, ApiError } from '@/types/api'

class ApiClient {
  private baseURL: string
  private token: string | null = null

  constructor(baseURL: string = '/api') {
    this.baseURL = baseURL
    this.loadToken()
  }

  private loadToken() {
    this.token = localStorage.getItem('access_token')
  }

  public setToken(token: string) {
    this.token = token
    localStorage.setItem('access_token', token)
  }

  public clearToken() {
    this.token = null
    localStorage.removeItem('access_token')
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      })

      const data = await response.json()

      // 处理业务错误
      if (!data.success) {
        throw new ApiError(data.error.code, data.error.message, data.error.details)
      }

      return data.data as T
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }

      // 网络错误或其他错误
      throw new ApiError('NETWORK_ERROR', error instanceof Error ? error.message : 'Unknown error')
    }
  }

  public get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const queryString = params ? '?' + new URLSearchParams(this.cleanParams(params)).toString() : ''

    return this.request<T>(endpoint + queryString, {
      method: 'GET',
    })
  }

  public post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  public put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  public delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    })
  }

  // SSE流式请求
  public streamRequest(endpoint: string, options: RequestInit = {}): EventSource {
    const url = `${this.baseURL}${endpoint}`
    const eventSource = new EventSource(url)
    return eventSource
  }

  // POST方式的SSE（需要后端支持）
  public async postStream(
    endpoint: string,
    data: any,
    onMessage: (event: any) => void,
    onError?: (error: any) => void,
    onComplete?: () => void,
  ): Promise<void> {
    const url = `${this.baseURL}${endpoint}`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.token ? `Bearer ${this.token}` : '',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    if (!reader) {
      throw new Error('Response body is null')
    }

    try {
      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          onComplete?.()
          break
        }

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              onMessage(data)
            } catch (e) {
              console.error('Failed to parse SSE data:', e)
            }
          }
        }
      }
    } catch (error) {
      onError?.(error)
      throw error
    }
  }

  // 清理参数（移除undefined和null）
  private cleanParams(params: Record<string, any>): Record<string, string> {
    const cleaned: Record<string, string> = {}

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        cleaned[key] = String(value)
      }
    }

    return cleaned
  }
}

// 自定义错误类
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: any,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// 导出单例
export const apiClient = new ApiClient()
```

#### 2.2 创建各模块的API服务

```typescript
// src/api/services/auth.service.ts - 新建文件

import { apiClient } from '../client'
import type { User } from '@/types/api'

export const authService = {
  // 登录
  login: async (email: string, password: string) => {
    return apiClient.post<{
      user: User
      tokens: {
        accessToken: string
        refreshToken: string
        expiresIn: number
      }
    }>('/auth/login', { email, password })
  },

  // 注册
  register: async (email: string, username: string, password: string) => {
    return apiClient.post<{
      user: User
      tokens: {
        accessToken: string
        refreshToken: string
        expiresIn: number
      }
    }>('/auth/register', { email, username, password })
  },

  // 登出
  logout: async () => {
    return apiClient.post('/auth/logout')
  },

  // 刷新Token
  refreshToken: async (refreshToken: string) => {
    return apiClient.post<{
      accessToken: string
      refreshToken: string
      expiresIn: number
    }>('/auth/refresh', { refreshToken })
  },
}
```

```typescript
// src/api/services/user.service.ts - 新建文件

import { apiClient } from '../client'
import type { User, UpdateUserRequest, Transaction, ListTransactionsParams } from '@/types/api'

export const userService = {
  // 获取当前用户
  getCurrentUser: () => {
    return apiClient.get<User>('/users/me')
  },

  // 更新用户信息
  updateUser: (data: UpdateUserRequest) => {
    return apiClient.put<User>('/users/me', data)
  },

  // 上传头像
  uploadAvatar: (file: File) => {
    const formData = new FormData()
    formData.append('avatar', file)
    // 注意：这里需要特殊处理，因为是上传文件
    return fetch('/api/users/me/avatar', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('access_token')}`,
      },
      body: formData,
    }).then((res) => res.json())
  },

  // 获取余额
  getBalance: () => {
    return apiClient.get<{ balance: number }>('/users/me/balance')
  },

  // 获取使用记录
  getTransactions: (params?: ListTransactionsParams) => {
    return apiClient.get<{
      items: Transaction[]
      pagination: {
        page: number
        pageSize: number
        total: number
        totalPages: number
      }
    }>('/transactions', params)
  },

  // 修改密码
  changePassword: (oldPassword: string, newPassword: string) => {
    return apiClient.put('/users/me/password', { oldPassword, newPassword })
  },
}
```

```typescript
// src/api/services/project.service.ts - 新建文件

import { apiClient } from '../client'
import type {
  Project,
  CreateProjectRequest,
  UpdateProjectRequest,
  ListProjectsParams,
} from '@/types/api'

export const projectService = {
  // 获取项目列表
  list: (params?: ListProjectsParams) => {
    return apiClient.get<{
      items: Project[]
      pagination: {
        page: number
        pageSize: number
        total: number
        totalPages: number
      }
    }>('/projects', params)
  },

  // 创建项目
  create: (data: CreateProjectRequest) => {
    return apiClient.post<Project>('/projects', data)
  },

  // 快速创建项目
  quickCreate: (name: string, description?: string) => {
    return apiClient.post<Project>('/projects/quick-create', { name, description })
  },

  // 获取项目详情
  get: (id: number) => {
    return apiClient.get<Project>(`/projects/${id}`)
  },

  // 更新项目
  update: (id: number, data: UpdateProjectRequest) => {
    return apiClient.put<Project>(`/projects/${id}`, data)
  },

  // 删除项目
  delete: (id: number) => {
    return apiClient.delete(`/projects/${id}`)
  },
}
```

```typescript
// src/api/services/session.service.ts - 新建文件

import { apiClient } from '../client'
import type {
  Session,
  SessionDetail,
  CreateSessionRequest,
  UpdateSessionInputsRequest,
  ListSessionsParams,
} from '@/types/api'

export const sessionService = {
  // 获取会话列表
  list: (params?: ListSessionsParams) => {
    return apiClient.get<{
      items: Session[]
      pagination: {
        page: number
        pageSize: number
        total: number
        totalPages: number
      }
    }>('/sessions', params)
  },

  // 创建会话
  create: (data: CreateSessionRequest) => {
    return apiClient.post<Session>('/sessions', data)
  },

  // 获取会话详情
  get: (id: number) => {
    return apiClient.get<SessionDetail>(`/sessions/${id}`)
  },

  // 更新会话
  update: (id: number, data: { title?: string }) => {
    return apiClient.put<Session>(`/sessions/${id}`, data)
  },

  // 删除会话
  delete: (id: number) => {
    return apiClient.delete(`/sessions/${id}`)
  },

  // 重命名会话
  rename: (id: number, title: string) => {
    return apiClient.put(`/sessions/${id}/rename`, { title })
  },

  // 关联项目
  associateProject: (id: number, projectId: number) => {
    return apiClient.put(`/sessions/${id}/project`, { projectId })
  },

  // 保存输入
  saveInputs: (id: number, data: UpdateSessionInputsRequest) => {
    return apiClient.put(`/sessions/${id}/inputs`, data)
  },

  // 获取输出
  getOutput: (id: number) => {
    return apiClient.get(`/sessions/${id}/output`)
  },

  // 获取版本列表
  getVersions: (id: number) => {
    return apiClient.get(`/sessions/${id}/versions`)
  },

  // 导出会话
  export: (id: number, format: string = 'zip') => {
    return apiClient.get(`/sessions/${id}/export?format=${format}`)
  },
}
```

```typescript
// src/api/services/ai.service.ts - 新建文件

import { apiClient } from '../client'
import type { GenerateRequest, GenerateResponse, SendChatRequest, StreamEvent } from '@/types/api'

export const aiService = {
  // 生成内容（非流式）
  generate: (data: GenerateRequest) => {
    return apiClient.post<GenerateResponse>('/ai/generate', data)
  },

  // 生成内容（流式）
  generateStream: async (
    data: GenerateRequest,
    onMessage: (event: StreamEvent) => void,
    onError?: (error: any) => void,
    onComplete?: () => void,
  ) => {
    return apiClient.postStream('/ai/generate/stream', data, onMessage, onError, onComplete)
  },

  // AI对话（非流式）
  chat: (data: SendChatRequest) => {
    return apiClient.post('/ai/chat', data)
  },

  // AI对话（流式）
  chatStream: async (
    data: SendChatRequest,
    onMessage: (event: StreamEvent) => void,
    onError?: (error: any) => void,
    onComplete?: () => void,
  ) => {
    return apiClient.postStream('/ai/chat/stream', data, onMessage, onError, onComplete)
  },
}
```

```typescript
// src/api/services/file.service.ts - 新建文件

import { apiClient } from '../client'
import type { FileUploadToken, File, ConfirmFileRequest } from '@/types/api'

export const fileService = {
  // 获取上传凭证
  getUploadToken: (filename: string, fileType: string, sessionId?: number) => {
    return apiClient.post<FileUploadToken>('/files/upload-token', {
      filename,
      fileType,
      sessionId,
    })
  },

  // 确认上传
  confirmUpload: (data: ConfirmFileRequest) => {
    return apiClient.post<File>('/files/confirm', data)
  },

  // 获取文件列表
  list: (params?: { sessionId?: number; fileType?: string }) => {
    return apiClient.get<File[]>('/files', params)
  },

  // 删除文件
  delete: (id: number) => {
    return apiClient.delete(`/files/${id}`)
  },
}
```

```typescript
// src/api/services/cms.service.ts - 新建文件

import { apiClient } from '../client'
import type {
  ModelCategory,
  Tool,
  ToolVersion,
  WorkflowStep,
  InputSection,
  RechargePackage,
  ChatMode,
} from '@/types/api'

export const cmsService = {
  // 获取模型分类
  getModelCategories: () => {
    return apiClient.get<ModelCategory[]>('/cms/model-categories')
  },

  // 获取工具列表
  getTools: () => {
    return apiClient.get<Tool[]>('/cms/tools')
  },

  // 获取工具版本
  getToolVersions: (toolId: string) => {
    return apiClient.get<ToolVersion[]>(`/cms/tools/${toolId}/versions`)
  },

  // 获取工作流步骤
  getWorkflowSteps: (toolId: string) => {
    return apiClient.get<WorkflowStep[]>(`/cms/workflow-steps/${toolId}`)
  },

  // 获取输入章节配置
  getInputSections: (toolId: string) => {
    return apiClient.get<InputSection[]>(`/cms/tools/${toolId}/input-sections`)
  },

  // 获取充值套餐
  getRechargePackages: () => {
    return apiClient.get<RechargePackage[]>('/cms/recharge-packages')
  },

  // 获取对话模式
  getChatModes: () => {
    return apiClient.get<ChatMode[]>('/cms/chat-modes')
  },

  // 获取帮助文档
  getHelpDocs: () => {
    return apiClient.get('/cms/help-docs')
  },

  // 获取客服信息
  getCustomerService: () => {
    return apiClient.get('/cms/customer-service')
  },

  // 获取示例数据
  getSampleData: (toolId: string) => {
    return apiClient.get(`/cms/tools/${toolId}/sample-data`)
  },
}
```

```typescript
// src/api/index.ts - 导出所有服务

export { apiClient, ApiError } from './client'
export { authService } from './services/auth.service'
export { userService } from './services/user.service'
export { projectService } from './services/project.service'
export { sessionService } from './services/session.service'
export { aiService } from './services/ai.service'
export { fileService } from './services/file.service'
export { cmsService } from './services/cms.service'
```

---

## 📐 三、数据格式标准化

### 3.1 日期时间格式

```typescript
// src/utils/date.ts - 新建文件

// 统一使用ISO 8601格式
export const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toISOString()
}

export const parseDate = (dateString: string): Date => {
  return new Date(dateString)
}

// 显示格式化
export const formatDisplayDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
```

### 3.2 数字格式

```typescript
// src/utils/number.ts - 新建文件

// 金额格式化（保留2位小数）
export const formatCurrency = (amount: number): string => {
  return amount.toFixed(2)
}

// 文件大小格式化
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}
```

---

## 🚨 四、错误处理统一化

### 4.1 创建错误处理Hook

```typescript
// src/hooks/useApiError.ts - 新建文件

import { useState } from 'react'
import { ApiError } from '@/api'
import { useNotifications } from './useNotifications'

export interface ErrorState {
  code: string
  message: string
  details?: any
}

export const useApiError = () => {
  const [error, setError] = useState<ErrorState | null>(null)
  const { addNotification } = useNotifications()

  const handleError = (err: unknown) => {
    if (err instanceof ApiError) {
      const errorState: ErrorState = {
        code: err.code,
        message: err.message,
        details: err.details,
      }

      setError(errorState)

      // 根据错误类型显示不同的通知
      switch (err.code) {
        case 'AUTH_TOKEN_EXPIRED':
          addNotification({
            type: 'warning',
            title: '登录已过期',
            message: '请重新登录',
          })
          // 跳转到登录页
          window.location.href = '/login'
          break

        case 'AUTH_INSUFFICIENT_BALANCE':
          addNotification({
            type: 'error',
            title: '余额不足',
            message: '请先充值后再使用',
          })
          break

        case 'VALIDATION_ERROR':
          addNotification({
            type: 'error',
            title: '参数错误',
            message: err.message,
          })
          break

        default:
          addNotification({
            type: 'error',
            title: '操作失败',
            message: err.message,
          })
      }
    } else if (err instanceof Error) {
      setError({
        code: 'UNKNOWN_ERROR',
        message: err.message,
      })

      addNotification({
        type: 'error',
        title: '发生错误',
        message: err.message,
      })
    }
  }

  const clearError = () => {
    setError(null)
  }

  return {
    error,
    handleError,
    clearError,
  }
}
```

### 4.2 在组件中使用

```typescript
// 使用示例
import { userService } from '@/api';
import { useApiError } from '@/hooks/useApiError';

function MyComponent() {
  const { handleError } = useApiError();
  const [loading, setLoading] = useState(false);

  const fetchUser = async () => {
    setLoading(true);
    try {
      const user = await userService.getCurrentUser();
      // 处理数据...
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    // JSX...
  );
}
```

---

## 🎭 五、Mock数据规范

### 5.1 创建Mock数据生成器

```typescript
// src/mocks/generators.ts - 新建文件

import type { User, Project, Session } from '@/types/api'

// Mock用户数据
export const mockUser = (): User => ({
  id: 1,
  email: 'user@example.com',
  username: 'TestUser',
  phone: 'YOUR_PHONE_HERE',
  avatarUrl: 'https://via.placeholder.com/150',
  balance: 100.5,
  role: 'user',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
})

// Mock项目数据
export const mockProject = (): Project => ({
  id: 1,
  userId: 1,
  name: '智能机器人底盘',
  description: '项目描述',
  status: 'active',
  sessionCount: 5,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
})

// Mock会话数据
export const mockSession = (): Session => ({
  id: 1,
  userId: 1,
  projectId: 1,
  title: 'Sample · UAV Route',
  toolType: '技术交底书完善',
  modelVersion: 'Basic 1.1',
  status: 'draft',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
})

// 生成多条数据
export const mockList = <T>(generator: () => T, count: number = 5): T[] => {
  return Array.from({ length: count }, generator)
}
```

### 5.2 Mock服务拦截器（开发环境使用）

```typescript
// src/mocks/handlers.ts - 新建文件

import { rest } from 'msw'
import { mockUser, mockProject, mockSession, mockList } from './generators'

export const handlers = [
  // 用户相关
  rest.get('/api/users/me', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: mockUser(),
        timestamp: new Date().toISOString(),
      }),
    )
  }),

  // 项目列表
  rest.get('/api/projects', (req, res, ctx) => {
    const page = Number(req.url.searchParams.get('page')) || 1
    const pageSize = Number(req.url.searchParams.get('pageSize')) || 20

    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          items: mockList(mockProject, 10),
          pagination: {
            page,
            pageSize,
            total: 100,
            totalPages: 5,
          },
        },
        timestamp: new Date().toISOString(),
      }),
    )
  }),

  // 会话列表
  rest.get('/api/sessions', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          items: mockList(mockSession, 10),
          pagination: {
            page: 1,
            pageSize: 20,
            total: 50,
            totalPages: 3,
          },
        },
        timestamp: new Date().toISOString(),
      }),
    )
  }),

  // AI生成（流式）
  rest.post('/api/ai/generate/stream', async (req, res, ctx) => {
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        // 模拟流式响应
        const chunks = [
          { type: 'start', message: '开始生成...' },
          { type: 'chunk', content: '# 技术方案\n\n' },
          { type: 'chunk', content: '本发明涉及...' },
          { type: 'complete', fullContent: '完整内容...' },
        ]

        let index = 0
        const interval = setInterval(() => {
          if (index >= chunks.length) {
            clearInterval(interval)
            controller.close()
            return
          }

          const data = `data: ${JSON.stringify(chunks[index])}\n\n`
          controller.enqueue(encoder.encode(data))
          index++
        }, 500)
      },
    })

    return res(ctx.status(200), ctx.set('Content-Type', 'text/event-stream'), ctx.body(stream))
  }),
]
```

```typescript
// src/mocks/browser.ts - 新建文件

import { setupWorker } from 'msw'
import { handlers } from './handlers'

export const worker = setupWorker(...handlers)
```

```typescript
// src/main.tsx - 修改

import { worker } from './mocks/browser'

// 仅在开发环境启用Mock
if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === 'true') {
  worker.start({
    onUnhandledRequest: 'bypass',
  })
}

// 其他代码...
```

---

## 🛠️ 六、开发工具优化

### 6.1 环境变量配置

```bash
# .env.development
VITE_API_BASE_URL=/api
VITE_USE_MOCK=true
VITE_ENABLE_DEVTOOLS=true

# .env.production
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_USE_MOCK=false
VITE_ENABLE_DEVTOOLS=false

# .env.staging
VITE_API_BASE_URL=https://api-staging.yourdomain.com
VITE_USE_MOCK=false
VITE_ENABLE_DEVTOOLS=true
```

### 6.2 API文档生成

````typescript
// scripts/generate-api-docs.ts - 新建文件

import fs from 'fs'
import path from 'path'

/**
 * 从类型定义自动生成API文档
 * 供后端开发人员参考
 */

const generateApiDocs = () => {
  const apiTypes = fs.readFileSync(path.join(__dirname, '../src/types/api.ts'), 'utf-8')

  // 提取接口定义
  const interfaceRegex = /export interface (\w+) {([^}]*)}/g
  const interfaces: any[] = []

  let match
  while ((match = interfaceRegex.exec(apiTypes)) !== null) {
    interfaces.push({
      name: match[1],
      fields: match[2],
    })
  }

  // 生成Markdown文档
  let markdown = '# API类型定义文档\n\n'
  markdown += '> 此文档由前端类型定义自动生成，供后端开发参考\n\n'
  markdown += `生成时间：${new Date().toLocaleString()}\n\n`
  markdown += '---\n\n'

  interfaces.forEach((iface) => {
    markdown += `## ${iface.name}\n\n`
    markdown += '```typescript\n'
    markdown += `interface ${iface.name} {${iface.fields}}\n`
    markdown += '```\n\n'
  })

  fs.writeFileSync(path.join(__dirname, '../docs/API-TYPES.md'), markdown)

  console.log('✅ API文档已生成：docs/API-TYPES.md')
}

generateApiDocs()
````

### 6.3 TypeScript配置优化

```json
// tsconfig.json - 添加路径映射
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/api": ["src/api"],
      "@/components": ["src/components"],
      "@/hooks": ["src/hooks"],
      "@/types": ["src/types"],
      "@/utils": ["src/utils"],
      "@/stores": ["src/stores"]
    }
  }
}
```

```typescript
// vite.config.ts - 添加别名配置
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

---

## 📋 实施清单

### 第一阶段：基础设施（1-2天）

- [ ] 创建完整的API类型定义文件 `src/types/api.ts`
- [ ] 创建API客户端基础类 `src/api/client.ts`
- [ ] 重构现有类型定义，使用完整命名
- [ ] 配置TypeScript路径映射

### 第二阶段：API服务层（2-3天）

- [ ] 创建各模块的API服务
  - [ ] auth.service.ts
  - [ ] user.service.ts
  - [ ] project.service.ts
  - [ ] session.service.ts
  - [ ] ai.service.ts
  - [ ] file.service.ts
  - [ ] cms.service.ts
- [ ] 创建统一错误处理Hook
- [ ] 创建数据格式化工具

### 第三阶段：Mock和测试（1-2天）

- [ ] 安装MSW库
- [ ] 创建Mock数据生成器
- [ ] 创建Mock服务拦截器
- [ ] 配置开发环境启用Mock

### 第四阶段：文档和工具（1天）

- [ ] 生成API文档脚本
- [ ] 创建环境变量配置
- [ ] 编写开发指南文档

---

## 🎯 预期收益

### 对后端开发的帮助

1. **清晰的API契约**：完整的TypeScript类型定义即是API文档
2. **减少沟通成本**：类型定义即规范，无需额外文档
3. **降低错误率**：类型系统帮助前后端保持一致
4. **提前Mock**：前端可独立开发，不依赖后端进度

### 对前端开发的帮助

1. **类型安全**：完整的类型检查
2. **代码提示**：IDE自动补全
3. **统一规范**：API调用、错误处理标准化
4. **易于维护**：集中管理API调用逻辑

---

## 📚 补充说明

### 关键原则

1. **类型先行**：先定义类型，再编写代码
2. **契约清晰**：前后端通过类型定义沟通
3. **分层明确**：API层、业务层、UI层职责分离
4. **错误统一**：标准化的错误码和错误处理

### 后续优化

1. 考虑使用OpenAPI/Swagger规范
2. 考虑使用tRPC实现类型安全的RPC调用
3. 考虑使用GraphQL Code Generator自动生成类型
4. 添加API请求/响应日志记录

---

## 📊 七、项目管理页面API需求（新增）

### 7.1 项目字段动态配置

**前端需求**：

- 项目支持动态字段，字段配置由CMS管理
- 字段存储在Project.metadata中
- 支持6种字段类型：text、textarea、number、date、datetime、select

**后端API要求**：

#### 获取项目字段配置

```
GET /api/projects/field-config
Response: {
  success: true,
  data: {
    groups: [
      {
        key: 'client',
        label: '客户信息',
        fields: [
          {
            key: 'clientName',
            label: '客户名称',
            type: 'text',
            required: true,
            placeholder: '请输入客户名称'
          },
          {
            key: 'contactPerson',
            label: '联系人',
            type: 'text',
            required: false
          }
        ]
      },
      {
        key: 'basic',
        label: '基础信息',
        fields: [...]
      }
    ]
  }
}
```

#### 更新项目（支持metadata）

```
PUT /api/projects/:id
Request: {
  name?: string,
  description?: string,
  metadata?: {
    clientName: string,
    contactPerson: string,
    // 其他动态字段...
  }
}
Response: {
  success: true,
  data: Project
}
```

### 7.2 项目详情页数据

#### 获取项目详情（含统计）

```
GET /api/projects/:id/detail
Response: {
  success: true,
  data: {
    project: Project,
    stats: {
      sessionCount: number,
      fileCount: number,
      patentCount: number,
      dataCount: number
    },
    recentActivities: Activity[]
  }
}
```

#### 获取项目运行记录

```
GET /api/projects/:id/activities
Query: {
  page?: number,
  pageSize?: number,
  type?: 'workflow' | 'file_generate' | 'patent_search' | 'term_validation'
}
Response: {
  success: true,
  data: {
    items: [
      {
        id: string,
        tool: string,  // 工具+模型名称，如"交底书撰写助手 · Claude 3.5 Sonnet"
        time: string,  // ISO 8601格式
        version: string  // 版本号，如"v1", "v2"
      }
    ],
    pagination: {...}
  }
}
```

#### 获取项目生成文件

```
GET /api/projects/:id/files
Query: {
  page?: number,
  pageSize?: number,
  type?: string
}
Response: {
  success: true,
  data: {
    items: [
      {
        id: string,
        name: string,
        tool: string,
        version: string,
        time: string,
        size: string  // 如"1.4 MB"
      }
    ],
    pagination: {...}
  }
}
```

#### 获取项目主要数据

```
GET /api/projects/:id/data
Query: {
  page?: number,
  pageSize?: number
}
Response: {
  success: true,
  data: {
    items: [
      {
        id: string,
        name: string,  // 参数名称，如"术语字典 (JSON)"
        tool: string,
        version: string,
        time: string,
        size: string
      }
    ],
    pagination: {...}
  }
}
```

#### 获取项目专利检索结果

```
GET /api/projects/:id/patents
Query: {
  page?: number,
  pageSize?: number,
  source?: string
}
Response: {
  success: true,
  data: {
    items: [
      {
        id: string,
        title: string,
        snippet: string,  // 摘要片段
        grantTime: string,
        size: string
      }
    ],
    pagination: {...}
  }
}
```

### 7.3 项目导出功能

#### 快速导出（选择数据类型）

```
POST /api/projects/:id/export
Request: {
  types: ['history', 'files', 'data', 'patents', 'metadata'],
  format: 'zip'
}
Response: {
  success: true,
  data: {
    downloadUrl: string,  // 下载链接
    expiresAt: string     // 链接过期时间
  }
}
```

#### 精确导出（选择具体数据项）

```
POST /api/projects/:id/export/selected
Request: {
  items: ['history-1', 'file-2', 'data-1', 'patent-2'],  // 数据项ID数组
  format: 'zip'
}
Response: {
  success: true,
  data: {
    downloadUrl: string,
    expiresAt: string
  }
}
```

### 7.4 前端类型定义（已添加）

```typescript
// src/types/api.ts

// 项目字段配置
export type ProjectFieldType = 'text' | 'textarea' | 'number' | 'date' | 'datetime' | 'select'

export interface ProjectFieldConfig {
  key: string
  label: string
  type: ProjectFieldType
  required?: boolean
  placeholder?: string
  options?: { label: string; value: string }[]
  group: 'client' | 'basic'
}

export interface ProjectFieldGroup {
  key: string
  label: string
  fields: ProjectFieldConfig[]
}

// 扩展Project类型
export interface Project {
  id: number
  name: string
  description?: string
  metadata?: Record<string, any> // 动态字段数据
  // ... 其他字段
}
```

### 7.5 实施说明

**前端已完成**：

- ✅ EditProjectDialog组件（支持动态字段编辑）
- ✅ ExportSelectionDialog组件（选择导出）
- ✅ ProjectPage组件优化（Tab展示和选择导出）
- ✅ 项目字段配置文件（projectFields.ts）
- ✅ 相关Hooks（useProjectDetail, useProjectStats）

**后端需要实现**：

1. Project表添加metadata字段（JSON类型）
2. 项目字段配置接口（可从CMS读取或硬编码）
3. 项目详情页各tab的数据接口
4. 项目导出功能（两种模式）

**数据要求**：

- 所有时间使用ISO 8601格式
- 文件大小使用易读格式（KB、MB）
- 工具+模型名称组合显示
- 版本号格式统一（如v1、v2）

---

**文档维护者**：前端开发团队  
**最后更新**：2025-10-04
