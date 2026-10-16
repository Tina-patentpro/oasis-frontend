import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'

jest.mock('../client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    uploadFile: jest.fn(),
  },
}))

import { apiClient } from '../client'
import { ApiError } from '../errors'
import { aiService } from './ai.service'

const mockUploadFile = apiClient.uploadFile as unknown as {
  mockReset: () => void
  mockResolvedValue: (value: unknown) => void
  mockRejectedValueOnce: (error: unknown) => void
  mock: { calls: unknown[][] }
}

describe('AIService.uploadFile', () => {
  let consoleErrorSpy: jest.SpiedFunction<typeof console.error>

  beforeEach(() => {
    mockUploadFile.mockReset()
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  test('uploads with multipart field name file and returns saved_path', async () => {
    mockUploadFile.mockResolvedValue({
      saved_path: 'https://example.com/uploads/a.docx',
    })

    const file = new File(['hello'], 'a.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })

    const result = await aiService.uploadFile(file)

    expect(result).toBe('https://example.com/uploads/a.docx')
    expect(mockUploadFile).toHaveBeenCalledTimes(1)

    const [endpoint, formData] = mockUploadFile.mock.calls[0] as [string, FormData]
    expect(endpoint).toBe('/user/upload')

    const uploaded = formData.get('file')
    expect(uploaded).toBeInstanceOf(File)
    expect((uploaded as File).name).toBe('a.docx')
  })

  test('does not retry with short filename when long-name upload fails', async () => {
    const longName = `${'long_file_name_'.repeat(10)}.docx`
    const file = new File(['hello world'], longName, {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })

    mockUploadFile.mockRejectedValueOnce(new ApiError('HTTP Error 500', 'HTTP_ERROR', 500))
    mockUploadFile.mockRejectedValueOnce(new Error('SHOULD_NOT_RETRY'))

    await expect(aiService.uploadFile(file)).rejects.toThrow('HTTP Error 500')
    expect(mockUploadFile).toHaveBeenCalledTimes(1)

    const [, formData] = mockUploadFile.mock.calls[0] as [string, FormData]
    const uploadedFile = formData.get('file') as File
    expect(uploadedFile.name).toBe(longName)
  })

  test('does not retry for short filename errors', async () => {
    const file = new File(['hello'], 'short.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })

    mockUploadFile.mockRejectedValueOnce(new Error('UPLOAD_ERROR'))

    await expect(aiService.uploadFile(file)).rejects.toThrow('UPLOAD_ERROR')
    expect(mockUploadFile).toHaveBeenCalledTimes(1)
  })

  test('does not log the raw upload response when the file path is missing', async () => {
    const sensitiveMarker = 'private-upload-response-marker'
    const file = new File(['hello'], 'missing.docx')
    mockUploadFile.mockResolvedValue({ diagnostic: sensitiveMarker })

    await expect(aiService.uploadFile(file)).rejects.toThrow('上传失败：未返回文件路径')

    const consoleOutput = consoleErrorSpy.mock.calls.flat().join(' ')
    expect(consoleErrorSpy.mock.calls.every((call) => call.length === 1)).toBe(true)
    expect(consoleOutput).not.toContain(sensitiveMarker)
  })

  test('does not log raw upload error details while preserving the rejection', async () => {
    const sensitiveMarker = 'private-upload-error-marker'
    const file = new File(['hello'], 'error.docx')
    mockUploadFile.mockRejectedValueOnce(new Error(sensitiveMarker))

    await expect(aiService.uploadFile(file)).rejects.toThrow(sensitiveMarker)

    const consoleOutput = consoleErrorSpy.mock.calls.flat().join(' ')
    expect(consoleErrorSpy).toHaveBeenCalledWith('[AIService] 文件上传失败')
    expect(consoleErrorSpy.mock.calls.every((call) => call.length === 1)).toBe(true)
    expect(consoleOutput).not.toContain(sensitiveMarker)
  })
})
