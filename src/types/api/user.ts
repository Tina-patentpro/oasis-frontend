// 2. 用户信息模块（/user）

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

export interface ChangePasswordRequest {
  oldPassword: string
  newPassword: string
}

export interface FileUploadToken {
  accessKeyId: string
  accessKeySecret: string
  securityToken: string
  expiration: string
  bucket: string
  region: string
  key: string
}

export interface FileRecord {
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

export interface GetUploadTokenRequest {
  filename: string
  fileType: 'image' | 'document' | 'other'
  sessionId?: number
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

export interface FileUploadResponse {
  filename: string
  content_type: string
  file_size: number
  saved_path: string
  message: string
}

export interface UserDetail {
  username: string
  avatar: string
  phone: string
  email: string
  balance: number
  invite_code: string
}

export interface UserDataStats {
  workflow_count: number
  chatflow_count: number
  folder_count: number
  total_count: number
}

export interface ClearUserDataResult {
  workflow_count: number
  folder_count: number
  total_count: number
}
