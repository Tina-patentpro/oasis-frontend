import { describe, expect, it } from '@jest/globals'

import {
  buildFileUploadViewState,
  getChooseButtonClassName,
  getDropzoneClassName,
  getProgressLabel,
  getStatusCircleClassName,
  getStatusTextClassName,
  getUploadButtonClassName,
  markUploadAsError,
  markUploadAsSuccess,
  markUploadAsUploading,
} from '../view-state'
import type { UploadProgress } from '../types'

const createProgressItem = (overrides: Partial<UploadProgress> = {}): UploadProgress => ({
  file: new File(['content'], 'draft.pdf', { type: 'application/pdf' }),
  progress: 0,
  status: 'pending',
  ...overrides,
})

describe('file-upload view-state helpers', () => {
  it('builds pending confirmation state for queued files', () => {
    const state = buildFileUploadViewState({
      disabled: false,
      idleSelectionDisabled: false,
      idleSelectionLabel: '选择文件',
      uploadProgress: [createProgressItem()],
    })

    expect(state).toMatchObject({
      chooseButtonLabel: '重新选择',
      hasSelectedFiles: true,
      isPendingConfirmation: true,
      isSelectionDisabled: false,
      isUploadComplete: false,
      pendingHintId: 'file-upload-pending-hint',
      progressTitle: '待上传文件',
      shouldShowStatusSummary: false,
      totalProgress: 0,
      uploadButtonLabel: '点击确认上传',
    })
  })

  it('builds success state and keeps status summary visible', () => {
    const state = buildFileUploadViewState({
      disabled: false,
      idleSelectionDisabled: false,
      idleSelectionLabel: '选择文件',
      uploadProgress: [
        createProgressItem({ progress: 100, status: 'success' }),
        createProgressItem({
          file: new File(['content'], 'done.pdf', { type: 'application/pdf' }),
          progress: 100,
          status: 'success',
        }),
      ],
    })

    expect(state).toMatchObject({
      chooseButtonLabel: '继续选择文件',
      isPendingConfirmation: false,
      isUploadComplete: true,
      progressTitle: '已上传文件',
      shouldShowStatusSummary: true,
      totalProgress: 100,
    })
  })

  it('updates upload progress items through uploading, success and error states', () => {
    const initialItems = [createProgressItem(), createProgressItem({ progress: 20 })]

    const uploadingItems = markUploadAsUploading(initialItems)
    const successItems = markUploadAsSuccess(uploadingItems)
    const errorItems = markUploadAsError(new Error('网络错误'))(initialItems)

    expect(uploadingItems.map((item) => item.progress)).toEqual([10, 20])
    expect(uploadingItems.every((item) => item.status === 'uploading')).toBe(true)
    expect(successItems.every((item) => item.status === 'success' && item.progress === 100)).toBe(
      true,
    )
    expect(errorItems.every((item) => item.status === 'error' && item.error === '网络错误')).toBe(
      true,
    )
  })

  it('returns stable labels and class names for status display', () => {
    expect(getProgressLabel(createProgressItem())).toBe('待上传')
    expect(getProgressLabel(createProgressItem({ progress: 42, status: 'uploading' }))).toBe('42%')
    expect(getStatusCircleClassName('error')).toContain('bg-red-500')
    expect(getStatusTextClassName('success')).toContain('text-green-600')
    expect(getChooseButtonClassName(false)).toContain('border-blue-500')
    expect(getUploadButtonClassName(true, true)).toContain('upload-confirm-button--pending')
    expect(
      getDropzoneClassName({
        hasSelectedFiles: true,
        isDragging: false,
        isSelectionDisabled: true,
      }),
    ).toContain('cursor-not-allowed')
  })
})
