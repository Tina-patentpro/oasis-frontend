import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, jest, test } from '@jest/globals'

const mockUseFileHasher = jest.fn()

jest.mock('@/workers/useFileHasher', () => ({
  useFileHasher: () => mockUseFileHasher(),
}))

jest.mock('@/config/dev-mode', () => ({
  isDevMode: () => false,
}))

import { useFileUpload } from './useFileUpload'

function createFileList(files: File[]): FileList {
  return Object.assign(files, {
    item: (index: number) => files[index] ?? null,
  }) as unknown as FileList
}

describe('useFileUpload', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseFileHasher.mockReturnValue({
      hashFiles: jest.fn(),
      isSupported: true,
    })
  })

  test('ignores empty file selections', () => {
    const notify = jest.fn()
    const hashFiles = jest.fn()
    mockUseFileHasher.mockReturnValue({
      hashFiles,
      isSupported: true,
    })
    const { result } = renderHook(() =>
      useFileUpload(notify, [{ key: 'materials', title: '参考资料' }]),
    )

    act(() => {
      result.current.handleInputFiles(createFileList([]), 'materials', 'file')
    })

    expect(notify).not.toHaveBeenCalled()
    expect(hashFiles).not.toHaveBeenCalled()
  })

  test('notifies upload destination and generated fingerprint when hashing succeeds', async () => {
    const notify = jest.fn()
    const file = new File(['hello'], 'demo.txt', { type: 'text/plain' })
    const hashFiles = jest.fn<(files: File[]) => Promise<Array<{ name: string; hash: string }>>>(
      async () => [
        {
          name: 'demo.txt',
          hash: 'abcdef1234567890',
        },
      ],
    )
    mockUseFileHasher.mockReturnValue({
      hashFiles,
      isSupported: true,
    })
    const { result } = renderHook(() =>
      useFileUpload(notify, [{ key: 'materials', title: '参考资料' }]),
    )

    act(() => {
      result.current.handleInputFiles(createFileList([file]), 'materials', 'file')
    })

    expect(notify).toHaveBeenCalledWith('文件已添加到参考资料')
    expect(hashFiles).toHaveBeenCalledWith([file])
    await waitFor(() => {
      expect(notify).toHaveBeenCalledWith('已生成文件指纹：demo.txt · ABCDEF12')
    })
  })

  test('skips hashing when the browser does not support it', () => {
    const notify = jest.fn()
    const hashFiles = jest.fn()
    const file = new File(['hello'], 'demo.txt', { type: 'text/plain' })
    mockUseFileHasher.mockReturnValue({
      hashFiles,
      isSupported: false,
    })
    const { result } = renderHook(() =>
      useFileUpload(notify, [{ key: 'image', title: '图片槽位' }]),
    )

    act(() => {
      result.current.handleInputFiles(createFileList([file]), 'image', 'image')
    })

    expect(notify).toHaveBeenCalledWith('图片已添加到图片槽位')
    expect(hashFiles).not.toHaveBeenCalled()
  })
})
