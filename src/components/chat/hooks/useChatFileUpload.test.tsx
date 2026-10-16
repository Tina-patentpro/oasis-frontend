import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, jest, test } from '@jest/globals'

import { MAX_CHAT_FILE_SIZE, MAX_CHAT_FILE_SIZE_MB } from '@/constants/chatUpload'

import { useChatFileUpload } from './useChatFileUpload'

const originalDataTransfer = globalThis.DataTransfer

class DataTransferMock {
  private readonly filesArray: File[] = []

  readonly items = {
    add: (file: File) => {
      this.filesArray.push(file)
      return file
    },
  }

  get files(): FileList {
    const files = this.filesArray as unknown as FileList
    Object.defineProperty(files, 'item', {
      configurable: true,
      value: (index: number) => this.filesArray[index] ?? null,
    })
    return files
  }
}

function installDataTransferMock(): void {
  Object.defineProperty(globalThis, 'DataTransfer', {
    configurable: true,
    value: DataTransferMock,
  })
}

afterEach(() => {
  Object.defineProperty(globalThis, 'DataTransfer', {
    configurable: true,
    value: originalDataTransfer,
  })
})

function createDragEvent(
  currentTarget: HTMLElement,
  relatedTarget: EventTarget | null,
): React.DragEvent<HTMLElement> {
  return {
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
    currentTarget,
    relatedTarget,
  } as unknown as React.DragEvent<HTMLElement>
}

function createDropEvent(files: File[]): React.DragEvent<HTMLElement> {
  return {
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
    dataTransfer: {
      files,
    },
  } as unknown as React.DragEvent<HTMLElement>
}

function createFileInputChangeEvent(files: File[]): React.ChangeEvent<HTMLInputElement> {
  const input = document.createElement('input')
  Object.defineProperty(input, 'files', {
    configurable: true,
    value: files,
  })

  return {
    target: input,
  } as unknown as React.ChangeEvent<HTMLInputElement>
}

function createFileWithSize(name: string, size: number): File {
  const file = new File(['probe'], name, { type: 'application/pdf' })
  Object.defineProperty(file, 'size', {
    configurable: true,
    value: size,
  })
  return file
}

describe('useChatFileUpload', () => {
  test('adds selected regular files as file attachments', () => {
    installDataTransferMock()
    const notify = jest.fn()
    const onAddAttachment = jest.fn()
    const file = new File(['probe'], 'real_retest_upload_probe_0728.txt', {
      type: 'text/plain',
    })
    const { result } = renderHook(() =>
      useChatFileUpload({
        onAddAttachment,
        notify,
      }),
    )

    act(() => {
      result.current.handleFileInputChange(createFileInputChangeEvent([file]))
    })

    expect(onAddAttachment).toHaveBeenCalledTimes(1)
    const firstCall = onAddAttachment.mock.calls[0] as [FileList, 'file']
    expect(firstCall[0].item(0)?.name).toBe('real_retest_upload_probe_0728.txt')
    expect(firstCall[1]).toBe('file')
    expect(notify).not.toHaveBeenCalled()
  })

  test.each([
    'probe.txt',
    'probe.md',
    'probe.pdf',
    'probe.html',
    'probe.xls',
    'probe.xlsx',
    'probe.doc',
    'probe.docx',
    'probe.csv',
    'probe.ppt',
    'probe.pptx',
    'probe.xml',
  ])('accepts documented document attachment format: %s', (filename) => {
    installDataTransferMock()
    const notify = jest.fn()
    const onAddAttachment = jest.fn()
    const file = new File(['probe'], filename)
    const { result } = renderHook(() =>
      useChatFileUpload({
        onAddAttachment,
        notify,
      }),
    )

    act(() => {
      result.current.handleFileInputChange(createFileInputChangeEvent([file]))
    })

    expect(onAddAttachment).toHaveBeenCalledTimes(1)
    const firstCall = onAddAttachment.mock.calls[0] as [FileList, 'file']
    expect(firstCall[0].item(0)?.name).toBe(filename)
    expect(firstCall[1]).toBe('file')
    expect(notify).not.toHaveBeenCalled()
  })

  test.each(['probe.jpg', 'probe.jpeg', 'probe.png', 'probe.gif', 'probe.webp', 'probe.svg'])(
    'accepts documented image attachment extension even without browser MIME: %s',
    (filename) => {
      installDataTransferMock()
      const notify = jest.fn()
      const onAddAttachment = jest.fn()
      const file = new File(['probe'], filename)
      const { result } = renderHook(() =>
        useChatFileUpload({
          onAddAttachment,
          notify,
        }),
      )

      act(() => {
        result.current.handleFileInputChange(createFileInputChangeEvent([file]))
      })

      expect(onAddAttachment).toHaveBeenCalledTimes(1)
      expect(notify).not.toHaveBeenCalled()
    },
  )

  test('rejects document files selected through the image-only input', () => {
    installDataTransferMock()
    const notify = jest.fn()
    const onAddAttachment = jest.fn()
    const file = new File(['probe'], 'not-an-image.txt', {
      type: 'text/plain',
    })
    const { result } = renderHook(() =>
      useChatFileUpload({
        onAddAttachment,
        notify,
      }),
    )

    act(() => {
      result.current.handleImageInputChange(createFileInputChangeEvent([file]))
    })

    expect(onAddAttachment).not.toHaveBeenCalled()
    expect(notify).toHaveBeenCalledWith('文件"not-an-image.txt"的类型不支持')
  })

  test('keeps drag overlay visible when moving between children inside the drop zone', () => {
    const dropZone = document.createElement('div')
    const child = document.createElement('button')
    const outside = document.createElement('div')
    dropZone.appendChild(child)

    const { result } = renderHook(() =>
      useChatFileUpload({
        onAddAttachment: jest.fn(),
        notify: jest.fn(),
      }),
    )

    act(() => {
      result.current.handleDragOver(createDragEvent(dropZone, null))
    })

    expect(result.current.isDragOver).toBe(true)

    act(() => {
      result.current.handleDragLeave(createDragEvent(dropZone, child))
    })

    expect(result.current.isDragOver).toBe(true)

    act(() => {
      result.current.handleDragLeave(createDragEvent(dropZone, outside))
    })

    expect(result.current.isDragOver).toBe(false)
  })

  test('notifies users when selected files exceed the upload count limit', () => {
    const notify = jest.fn()
    const onAddAttachment = jest.fn()
    const files = Array.from(
      { length: 6 },
      (_, index) => new File(['file'], `file-${index + 1}.txt`, { type: 'text/plain' }),
    )
    const { result } = renderHook(() =>
      useChatFileUpload({
        onAddAttachment,
        notify,
      }),
    )

    act(() => {
      result.current.handleDrop(createDropEvent(files))
    })

    expect(notify).toHaveBeenCalledWith('最多上传5个文件，已保留前5个')
  })

  test('rejects selected files larger than the shared 10MB upload limit', () => {
    const notify = jest.fn()
    const onAddAttachment = jest.fn()
    const file = createFileWithSize('too-large.pdf', MAX_CHAT_FILE_SIZE + 1)
    const { result } = renderHook(() =>
      useChatFileUpload({
        onAddAttachment,
        notify,
      }),
    )

    act(() => {
      result.current.handleFileInputChange(createFileInputChangeEvent([file]))
    })

    expect(onAddAttachment).not.toHaveBeenCalled()
    expect(notify).toHaveBeenCalledWith(`文件"too-large.pdf"超过${MAX_CHAT_FILE_SIZE_MB}MB大小限制`)
  })

  test('closes the attachment popup with Escape and returns focus to the trigger', () => {
    const trigger = document.createElement('button')
    document.body.appendChild(trigger)

    const { result } = renderHook(() =>
      useChatFileUpload({
        onAddAttachment: jest.fn(),
        notify: jest.fn(),
      }),
    )

    Object.defineProperty(result.current.menuBtnRef, 'current', {
      value: trigger,
      configurable: true,
    })

    act(() => {
      result.current.toggleMenu()
    })

    expect(result.current.menuOpen).toBe(true)

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })

    expect(result.current.menuOpen).toBe(false)
    expect(trigger).toHaveFocus()

    trigger.remove()
  })

  test('moves focus to the first available attachment action when the popup opens', () => {
    const menu = document.createElement('div')
    const firstAction = document.createElement('button')
    const secondAction = document.createElement('button')
    firstAction.textContent = '添加照片或文件'
    secondAction.textContent = '仅图片'
    menu.append(firstAction, secondAction)
    document.body.appendChild(menu)

    const { result } = renderHook(() =>
      useChatFileUpload({
        onAddAttachment: jest.fn(),
        notify: jest.fn(),
      }),
    )

    Object.defineProperty(result.current.menuRef, 'current', {
      value: menu,
      configurable: true,
    })

    act(() => {
      result.current.toggleMenu()
    })

    expect(firstAction).toHaveFocus()

    menu.remove()
  })
})
