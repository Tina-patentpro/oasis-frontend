import { describe, expect, it, jest } from '@jest/globals'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'

import { MAX_UPLOAD_FILE_SIZE_BYTES, MAX_UPLOAD_FILE_SIZE_MB } from '@/constants/uploadLimits'

import { FileUpload, isFileAccepted } from '../FileUpload'

describe('isFileAccepted', () => {
  const createFile = (name: string, type: string) => new File(['content'], name, { type })

  it('accepts every file by default', () => {
    const file = createFile('demo.txt', 'text/plain')
    expect(isFileAccepted(file, undefined)).toBe(true)
  })

  it('supports exact MIME type matching', () => {
    const file = createFile('image.png', 'image/png')
    expect(isFileAccepted(file, 'image/png')).toBe(true)
    expect(isFileAccepted(file, 'image/jpeg')).toBe(false)
  })

  it('supports wildcard MIME groups', () => {
    const file = createFile('photo.jpeg', 'image/jpeg')
    expect(isFileAccepted(file, 'image/*')).toBe(true)
    expect(isFileAccepted(file, 'application/*')).toBe(false)
  })

  it('supports extension matching', () => {
    const file = createFile('report.PDF', 'application/pdf')
    expect(isFileAccepted(file, '.pdf')).toBe(true)
    expect(isFileAccepted(file, '.docx')).toBe(false)
  })

  it('supports multiple accept values', () => {
    const file = createFile('audio.mp3', 'audio/mpeg')
    expect(isFileAccepted(file, 'image/png, audio/*')).toBe(true)
  })
})

describe('FileUpload layout', () => {
  const getFileInput = (container: HTMLElement): HTMLInputElement | null =>
    container.querySelector('input[type="file"]')

  const selectFile = (container: HTMLElement, file: File) => {
    const fileInput = getFileInput(container)

    expect(fileInput).not.toBeNull()
    if (!fileInput) {
      return null
    }

    fireEvent.change(fileInput, { target: { files: [file] } })
    return fileInput
  }

  const createFileWithSize = (name: string, size: number): File => {
    const file = new File(['content'], name, {
      type: 'application/pdf',
    })
    Object.defineProperty(file, 'size', {
      configurable: true,
      value: size,
    })
    return file
  }

  it('keeps upload progress row shrinkable for long filenames', () => {
    const longFileName =
      'Form-P101-专利技术交底书模板(机械类-杆式减震器橡胶节点组装工装非常非常非常非常长的文件名).docx'
    const file = new File(['content'], longFileName, {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })

    const { container } = render(React.createElement(FileUpload, { showProgress: true }))
    if (!selectFile(container, file)) {
      return
    }

    const fileNameNode = screen.getByText(longFileName)
    const rowNode = fileNameNode.closest('div.border.rounded-lg')

    expect(rowNode).not.toBeNull()
    expect((rowNode as HTMLElement).className.includes('min-w-0')).toBe(true)
  })

  it('shows a warning when filename contains spaces or special characters', () => {
    const riskyFile = new File(['content'], 'demo file(1).pdf', {
      type: 'application/pdf',
    })

    const { container } = render(React.createElement(FileUpload, { showProgress: true }))
    if (!selectFile(container, riskyFile)) {
      return
    }

    const warningNode = screen.getByRole('status')
    expect(warningNode.textContent).toContain('文件名包含空格或特殊符号')
    expect(warningNode.textContent).toContain(riskyFile.name)
  })

  it('does not show a warning for safe filenames', () => {
    const safeFile = new File(['content'], 'demo_file-1.pdf', {
      type: 'application/pdf',
    })

    const { container } = render(React.createElement(FileUpload, { showProgress: true }))
    if (!selectFile(container, safeFile)) {
      return
    }

    expect(screen.queryByRole('status')).toBeNull()
  })

  it('keeps the warning container shrinkable for long risky filenames', () => {
    const longRiskyFileName =
      'Form-P101-专利技术交底书模板(机械类-杆式减震器橡胶节点组装工装非常非常非常非常长的风险文件名).docx'
    const riskyFile = new File(['content'], longRiskyFileName, {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })

    const { container } = render(React.createElement(FileUpload, { showProgress: true }))
    if (!selectFile(container, riskyFile)) {
      return
    }

    const warningNode = screen.getByRole('status')
    expect(warningNode.className.includes('break-words')).toBe(true)
  })

  it('uses queue-style copy for the drag area before upload begins', () => {
    const { container } = render(React.createElement(FileUpload, { showProgress: true }))

    expect(screen.queryByText('拖拽文件到此处加入待上传队列')).not.toBeNull()

    const dragArea = container.querySelector('.border-dashed')
    expect(dragArea).not.toBeNull()
    if (!dragArea) {
      return
    }

    fireEvent.dragOver(dragArea)

    expect(screen.queryByText('释放以加入待上传队列')).not.toBeNull()
  })

  it('keeps the multi-file helper copy aligned with the pending queue wording', () => {
    render(React.createElement(FileUpload, { showProgress: true, multiple: true }))

    expect(screen.queryByText('支持多文件加入待上传队列')).not.toBeNull()
  })

  it('does not render the green confirm button before any file is queued', () => {
    render(React.createElement(FileUpload, { showProgress: true }))

    expect(screen.queryByRole('button', { name: '请选择文件' })).toBeNull()
  })

  it('shows confirmation copy and pending status before upload starts', () => {
    const file = new File(['content'], '需求说明.pdf', {
      type: 'application/pdf',
    })

    const { container } = render(React.createElement(FileUpload, { showProgress: true }))
    if (!selectFile(container, file)) {
      return
    }

    const chooseButton = screen.getByRole('button', { name: '重新选择' })
    const confirmButton = screen.getByRole('button', { name: '点击确认上传' })

    expect(screen.queryByText('待上传文件')).not.toBeNull()
    expect(screen.queryByText('上传进度')).toBeNull()
    expect(screen.queryByText('0%')).toBeNull()
    expect(screen.queryByText('待上传')).not.toBeNull()
    expect(screen.queryByText('文件已选好，点击下方“点击确认上传”后才会开始上传')).not.toBeNull()
    expect(chooseButton.getAttribute('disabled')).toBeNull()
    const removeButton = screen.queryByRole('button', { name: '移除文件' })
    expect(removeButton).not.toBeNull()
    expect((removeButton as HTMLElement).className.includes('flex')).toBe(true)
    expect(confirmButton.className.includes('upload-confirm-button--pending')).toBe(true)
    expect(confirmButton.className.includes('ring-emerald-200')).toBe(true)
    expect(confirmButton.className.includes('shadow-emerald-200/60')).toBe(true)
  })

  it('groups warning and confirmation messages inside one notice block', () => {
    const riskyFile = new File(['content'], 'demo file(1).pdf', {
      type: 'application/pdf',
    })

    const { container } = render(React.createElement(FileUpload, { showProgress: true }))
    if (!selectFile(container, riskyFile)) {
      return
    }

    const messageGroup = screen.queryByTestId('upload-message-group')
    expect(messageGroup).not.toBeNull()
    expect(messageGroup?.textContent).toContain('文件名包含空格或特殊符号')
    expect(messageGroup?.textContent).toContain('点击下方“点击确认上传”后才会开始上传')
  })

  it('switches to uploading state immediately and then shows retry copy after failure', async () => {
    const file = new File(['content'], '交底书.pdf', {
      type: 'application/pdf',
    })
    let rejectUpload: ((reason?: unknown) => void) | undefined
    const onUpload = jest.fn(
      () =>
        new Promise<void>((_, reject) => {
          rejectUpload = reject
        }),
    )

    const { container } = render(
      React.createElement(FileUpload, {
        showProgress: true,
        onUpload,
      }),
    )

    if (!selectFile(container, file)) {
      return
    }

    fireEvent.click(screen.getByRole('button', { name: '点击确认上传' }))

    const uploadingButton = screen.getByRole('button', { name: '上传中...' })
    expect(uploadingButton.className.includes('upload-confirm-button--pending')).toBe(false)
    expect(screen.queryByText('上传进度')).not.toBeNull()
    expect(screen.queryByText('待上传文件')).toBeNull()
    expect(screen.queryByText('待上传')).toBeNull()
    expect(screen.queryByText('文件已选好，点击下方“点击确认上传”后才会开始上传')).toBeNull()

    rejectUpload?.(new Error('网络错误'))

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: '重新上传' })).not.toBeNull()
    })

    expect(screen.queryByText('网络错误')).not.toBeNull()
  })

  it('hides the confirm action after a successful upload and offers continue upload', async () => {
    const file = new File(['content'], '成功案例.pdf', {
      type: 'application/pdf',
    })
    const onUpload = jest.fn(async () => undefined)

    const { container } = render(
      React.createElement(FileUpload, {
        showProgress: true,
        onUpload,
      }),
    )

    if (!selectFile(container, file)) {
      return
    }

    fireEvent.click(screen.getByRole('button', { name: '点击确认上传' }))

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: '点击确认上传' })).toBeNull()
      expect(screen.queryByRole('button', { name: '上传中...' })).toBeNull()
      expect(screen.queryByRole('button', { name: '继续选择文件' })).not.toBeNull()
      expect(screen.queryByRole('button', { name: '移除文件' })).toBeNull()
      expect(screen.queryByText('已上传 1 个文件')).not.toBeNull()
    })
  })

  it('announces failed uploads as alerts', async () => {
    const file = new File(['content'], 'failed-upload.pdf', {
      type: 'application/pdf',
    })
    const onUpload = jest.fn(async () => {
      throw new Error('network failed')
    })

    const { container } = render(
      React.createElement(FileUpload, {
        showProgress: true,
        onUpload,
      }),
    )

    if (!selectFile(container, file)) {
      return
    }

    const confirmButton = container.querySelector('.upload-confirm-button--pending')
    expect(confirmButton).not.toBeNull()
    fireEvent.click(confirmButton as HTMLElement)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('network failed')
    })
  })

  it('shows a visible alert when a selected file exceeds the size limit', () => {
    const oversizedFile = new File(['content'], 'qa-too-large.pdf', {
      type: 'application/pdf',
    })

    const { container } = render(
      React.createElement(FileUpload, {
        maxSize: 1,
        showProgress: true,
      }),
    )

    if (!selectFile(container, oversizedFile)) {
      return
    }

    const alertNode = screen.getByRole('alert')
    expect(alertNode).toHaveTextContent('qa-too-large.pdf')
    expect(alertNode).toHaveTextContent('文件大小超过限制')
    expect(screen.queryByRole('button', { name: '点击确认上传' })).toBeNull()
  })

  it('uses the shared 10MB limit by default', () => {
    const oversizedFile = createFileWithSize(
      'default-too-large.pdf',
      MAX_UPLOAD_FILE_SIZE_BYTES + 1,
    )

    const { container } = render(React.createElement(FileUpload, { showProgress: true }))

    expect(screen.getByText(`• 最大文件大小: ${MAX_UPLOAD_FILE_SIZE_MB.toFixed(1)}MB`)).toBeTruthy()
    if (!selectFile(container, oversizedFile)) {
      return
    }

    const alertNode = screen.getByRole('alert')
    expect(alertNode).toHaveTextContent('default-too-large.pdf')
    expect(alertNode).toHaveTextContent(`文件大小超过限制 (${MAX_UPLOAD_FILE_SIZE_MB}MB)`)
  })

  it('announces successful uploads as status updates', async () => {
    const file = new File(['content'], 'successful-upload.pdf', {
      type: 'application/pdf',
    })
    const onUpload = jest.fn(async () => undefined)

    const { container } = render(
      React.createElement(FileUpload, {
        showProgress: true,
        onUpload,
      }),
    )

    if (!selectFile(container, file)) {
      return
    }

    const confirmButton = container.querySelector('.upload-confirm-button--pending')
    expect(confirmButton).not.toBeNull()
    fireEvent.click(confirmButton as HTMLElement)

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('1')
    })
  })

  it('disables new selection and ignores drag-drop when idle selection is disabled', () => {
    const onFileSelect = jest.fn()
    const blockedFile = new File(['content'], 'blocked.pdf', {
      type: 'application/pdf',
    })

    const { container } = render(
      React.createElement(FileUpload, {
        showProgress: true,
        idleSelectionLabel: '已达上传上限',
        idleSelectionDisabled: true,
        onFileSelect,
      }),
    )

    const chooseButton = screen.getByRole('button', { name: '已达上传上限' })
    expect(chooseButton.getAttribute('disabled')).not.toBeNull()

    const dragArea = container.querySelector('.border-dashed')
    expect(dragArea).not.toBeNull()
    if (!dragArea) {
      return
    }

    fireEvent.dragOver(dragArea)
    fireEvent.drop(dragArea, {
      dataTransfer: {
        files: [blockedFile],
      },
    })

    expect(onFileSelect).not.toHaveBeenCalled()
    expect(screen.queryByText('释放以加入待上传队列')).toBeNull()
  })
})
