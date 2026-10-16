import type {
  FileUploadToken,
  FileRecord,
  GetUploadTokenRequest,
  ConfirmFileRequest,
} from '@/types/api'

import { apiClient } from '../client'

const notSupported = (name: string): never => {
  throw new Error(`[FileService] Backend API not found in API接口文档-用户端.md: ${name}`)
}

interface FileRequestOptions {
  signal?: AbortSignal
}

interface CurrentFileListParams {
  page?: number
  pageSize?: number
  type?: string
  status?: string
  folder?: string
}

interface CurrentFileResponse {
  success: boolean
  data?: Record<string, unknown>
}

interface UpdateFileMetadataPayload {
  description?: string
  tags?: string[]
  permissions?: {
    canRead?: string[]
    canWrite?: string[]
    isPublic?: boolean
  }
}

interface UploadCurrentFileOptions {
  filename?: string
  projectId?: string
  description?: string
  isPublic?: boolean
  signal?: AbortSignal
}

interface UploadFilesBatchOptions {
  projectId?: string
  description?: string
  signal?: AbortSignal
}

interface CreateShareLinkPayload {
  expiresIn: number
  password?: string
  downloadLimit?: number
  allowPreview?: boolean
}

class FileService {
  /**
   * 文档未提供上传令牌接口
   */
  async getUploadToken(_data: GetUploadTokenRequest): Promise<FileUploadToken> {
    return notSupported('getUploadToken')
  }

  /**
   * 文档未提供上传确认接口
   */
  async confirmUpload(_data: ConfirmFileRequest): Promise<FileRecord> {
    return notSupported('confirmUpload')
  }

  /**
   * 上传文件（文档接口：POST /user/upload）
   */
  async uploadFile(file: File, sessionId?: number): Promise<FileRecord> {
    const formData = new FormData()
    formData.append('file', file)
    if (sessionId) {
      formData.append('sessionId', sessionId.toString())
    }

    const response = await apiClient.uploadFile<{
      url?: string
      saved_path?: string
      filename?: string
    }>('/user/upload', formData)
    const url = response?.url || response?.saved_path || ''

    return {
      id: Date.now(),
      userId: 0,
      sessionId,
      filename: response?.filename || file.name,
      originalName: file.name,
      fileType: file.type.startsWith('image/') ? 'image' : 'document',
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
      ossUrl: url,
      ossKey: url,
      createdAt: new Date().toISOString(),
    }
  }

  async uploadCurrentFile(
    file: File,
    options: UploadCurrentFileOptions = {},
  ): Promise<CurrentFileResponse> {
    const formData = new FormData()
    formData.append('file', file)
    if (options.filename) {
      formData.append('filename', options.filename)
    }
    if (options.projectId) {
      formData.append('projectId', options.projectId)
    }
    if (options.description) {
      formData.append('description', options.description)
    }
    if (typeof options.isPublic === 'boolean') {
      formData.append('isPublic', String(options.isPublic))
    }

    return apiClient.uploadFile<CurrentFileResponse>('/api/files', formData, {
      signal: options.signal,
    })
  }

  async uploadFilesBatch(
    files: File[],
    options: UploadFilesBatchOptions = {},
  ): Promise<CurrentFileResponse> {
    const formData = new FormData()
    files.forEach((file) => formData.append('files', file))
    if (options.projectId) {
      formData.append('projectId', options.projectId)
    }
    if (options.description) {
      formData.append('description', options.description)
    }

    return apiClient.uploadFile<CurrentFileResponse>('/api/files/batch', formData, {
      signal: options.signal,
    })
  }

  async getFiles(
    params: CurrentFileListParams = {},
    options?: FileRequestOptions,
  ): Promise<CurrentFileResponse> {
    return apiClient.get<CurrentFileResponse>('/api/files', params, undefined, {
      signal: options?.signal,
    })
  }

  async getFile(
    fileId: string | number,
    options?: FileRequestOptions,
  ): Promise<CurrentFileResponse> {
    return apiClient.get<CurrentFileResponse>(`/api/files/${fileId}`, undefined, undefined, {
      signal: options?.signal,
    })
  }

  async getFileMetadata(
    fileId: string | number,
    options?: FileRequestOptions,
  ): Promise<CurrentFileResponse> {
    return apiClient.get<CurrentFileResponse>(
      `/api/files/${fileId}/metadata`,
      undefined,
      undefined,
      { signal: options?.signal },
    )
  }

  async updateFileMetadata(
    fileId: string | number,
    payload: UpdateFileMetadataPayload,
    options?: FileRequestOptions,
  ): Promise<CurrentFileResponse> {
    return apiClient.patch<CurrentFileResponse, UpdateFileMetadataPayload>(
      `/api/files/${fileId}/metadata`,
      payload,
      undefined,
      { signal: options?.signal },
    )
  }

  async getFilePreview(
    fileId: string | number,
    options?: FileRequestOptions,
  ): Promise<CurrentFileResponse> {
    return apiClient.get<CurrentFileResponse>(
      `/api/files/${fileId}/preview`,
      undefined,
      undefined,
      { signal: options?.signal },
    )
  }

  async listShareLinks(
    fileId: string | number,
    options?: FileRequestOptions,
  ): Promise<CurrentFileResponse> {
    return apiClient.get<CurrentFileResponse>(`/api/files/${fileId}/share`, undefined, undefined, {
      signal: options?.signal,
    })
  }

  async createShareLink(
    fileId: string | number,
    payload: CreateShareLinkPayload,
    options?: FileRequestOptions,
  ): Promise<CurrentFileResponse> {
    return apiClient.post<CurrentFileResponse, CreateShareLinkPayload>(
      `/api/files/${fileId}/share`,
      payload,
      undefined,
      { signal: options?.signal },
    )
  }

  async revokeShareLink(
    fileId: string | number,
    shareId: string | number,
    options?: FileRequestOptions,
  ): Promise<void> {
    return apiClient.delete<void>(`/api/files/${fileId}/share/${shareId}`, undefined, {
      signal: options?.signal,
    })
  }

  /**
   * 文档未提供文件删除接口
   */
  async deleteFile(_id: number): Promise<void> {
    return notSupported('deleteFile')
  }

  /**
   * 文档未提供文件下载签名接口
   */
  async getDownloadUrl(_id: number): Promise<{ url: string; expiresIn: number }> {
    return notSupported('getDownloadUrl')
  }

  /**
   * 文档未提供批量删除接口
   */
  async batchDeleteFiles(_ids: number[]): Promise<void> {
    return notSupported('batchDeleteFiles')
  }
}

export const fileService = new FileService()
