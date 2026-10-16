import { useState } from 'react'

import '@testing-library/jest-dom'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, jest, test } from '@jest/globals'

import type { Attachment, Theme } from '@/types'

import { AttachmentBar } from './AttachmentBar'
import { useChatFileUpload } from './hooks/useChatFileUpload'

jest.mock('../ui', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react')
  const { AttachBadge } =
    jest.requireActual<typeof import('../ui/badges/AttachBadge')>('../ui/badges/AttachBadge')

  return {
    Tooltip: ({ children }: { children: React.ReactNode }) =>
      ReactModule.createElement(ReactModule.Fragment, null, children),
    ActionBtn: ({
      children,
      ariaLabel,
      disabled,
      loading,
      onClick,
    }: {
      children: React.ReactNode
      ariaLabel?: string
      disabled?: boolean
      loading?: boolean
      onClick?: () => void
    }) =>
      ReactModule.createElement(
        'button',
        { type: 'button', 'aria-label': ariaLabel, disabled: disabled || loading, onClick },
        children,
      ),
    AttachBadge,
  }
})

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

const theme: Theme = {
  background: '#f5fff8',
  primary: '#32c787',
  primaryHover: '#2cab74',
  name: 'green',
}

function AttachmentUploadHarness({ onSendChat }: { onSendChat: () => void }) {
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const notify = jest.fn()
  const { handleFileInputChange } = useChatFileUpload({
    notify,
    onAddAttachment: (files, type) => {
      setAttachments((prev) => [
        ...prev,
        ...Array.from(files ?? []).map((file) => ({
          id: `attachment-${file.name}`,
          type,
          name: file.name,
          size: file.size,
          file,
        })),
      ])
    },
  })

  return (
    <>
      <input
        aria-label="选择对话附件"
        type="file"
        multiple
        onChange={handleFileInputChange}
      />
      <AttachmentBar
        panelWidth={640}
        attachments={attachments}
        onRemoveAttachment={() => undefined}
        readMenu={<button type="button">读取</button>}
        secondaryAction={null}
        chatInput=""
        onClearChat={() => undefined}
        onSendChat={onSendChat}
        onStartNewConversation={() => undefined}
        theme={theme}
        loading={false}
      />
    </>
  )
}

describe('AttachmentUploadFlow', () => {
  test('shows a selected document attachment and enables sending without text input', async () => {
    installDataTransferMock()
    const onSendChat = jest.fn()
    const file = new File(['REAL_RETEST_UPLOAD_PROBE_0728'], 'real_retest_upload_probe_0728.txt', {
      type: 'text/plain',
    })

    render(<AttachmentUploadHarness onSendChat={onSendChat} />)

    fireEvent.change(screen.getByLabelText('选择对话附件'), {
      target: { files: [file] },
    })

    expect(await screen.findByText(/real_retest_upload_probe_0728\.txt/)).toBeInTheDocument()
    const sendButton = screen.getByRole('button', { name: '发送消息' })
    await waitFor(() => expect(sendButton).toBeEnabled())

    fireEvent.click(sendButton)

    expect(onSendChat).toHaveBeenCalledTimes(1)
  })
})
