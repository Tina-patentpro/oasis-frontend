import { describe, expect, it } from '@jest/globals'

import {
  buildFileNameWarning,
  buildValidationResult,
  createPendingUploadProgress,
  getRiskyFileNames,
  selectValidFiles,
} from '../validation'

describe('file-upload validation helpers', () => {
  it('rejects files that exceed the max size', () => {
    const file = new File(['123456'], 'draft.pdf', { type: 'application/pdf' })

    expect(buildValidationResult(file, 'application/pdf', 5)).toEqual({
      error: '文件大小超过限制 (0MB)',
      isValid: false,
    })
  })

  it('collects max-file and validation errors separately from valid files', () => {
    const files = {
      0: new File(['ok'], 'ok.pdf', { type: 'application/pdf' }),
      1: new File(['bad'], 'bad.txt', { type: 'text/plain' }),
      2: new File(['extra'], 'extra.pdf', { type: 'application/pdf' }),
      item: (_index: number): File | null => null,
      length: 3,
    } as unknown as FileList

    const result = selectValidFiles(files, 2, (file) =>
      buildValidationResult(file, 'application/pdf', 100),
    )

    expect(result.validFiles.map((file) => file.name)).toEqual(['ok.pdf'])
    expect(result.errors).toEqual([
      'bad.txt: 不支持的文件类型：text/plain',
      '最多只能选择 2 个文件',
    ])
  })

  it('creates one warning string for unique risky file names only', () => {
    const files = [
      new File(['a'], 'demo file(1).pdf', { type: 'application/pdf' }),
      new File(['b'], 'demo file(1).pdf', { type: 'application/pdf' }),
      new File(['c'], 'safe_file.pdf', { type: 'application/pdf' }),
    ]

    expect(getRiskyFileNames(files)).toEqual(['demo file(1).pdf'])
    expect(buildFileNameWarning(getRiskyFileNames(files))).toBe(
      '文件名包含空格或特殊符号，可能导致生成失败，建议先改名后再上传：demo file(1).pdf',
    )
  })

  it('creates pending progress items with zero progress', () => {
    const files = [new File(['a'], 'draft.pdf', { type: 'application/pdf' })]

    expect(createPendingUploadProgress(files)).toEqual([
      {
        file: files[0],
        progress: 0,
        status: 'pending',
      },
    ])
  })
})
