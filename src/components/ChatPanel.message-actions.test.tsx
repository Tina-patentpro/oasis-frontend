import React from 'react'

import '@testing-library/jest-dom'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, jest, test } from '@jest/globals'

import type { ChatSession, Theme } from '@/types'

import { ChatPanel } from './ChatPanel'

jest.mock('react-virtuoso', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react')
  const MockVirtuoso = ReactModule.forwardRef<HTMLDivElement, any>(
    ({ data = [], itemContent, className, role }, ref) =>
      ReactModule.createElement(
        'div',
        { ref, className, role },
        data.map((item: any, index: number) =>
          ReactModule.createElement(
            'div',
            { key: item.id ?? index },
            typeof itemContent === 'function' ? itemContent(index, item) : null,
          ),
        ),
      ),
  )
  MockVirtuoso.displayName = 'MockVirtuoso'

  return {
    Virtuoso: MockVirtuoso,
  }
})

jest.mock('./ui', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react')
  const MockTooltip = ({ children }: { children: React.ReactNode }) =>
    ReactModule.createElement(ReactModule.Fragment, null, children)
  MockTooltip.displayName = 'MockTooltip'

  return {
    Tooltip: MockTooltip,
  }
})

jest.mock('./error-boundaries', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react')
  const MockErrorBoundary = ({ children }: { children: React.ReactNode }) =>
    ReactModule.createElement(ReactModule.Fragment, null, children)
  MockErrorBoundary.displayName = 'MockErrorBoundary'

  return {
    ComponentErrorBoundary: MockErrorBoundary,
  }
})

jest.mock('./chat/AttachmentBar', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react')
  const MockAttachmentBar = ({
    onClearChat,
    onStartNewConversation,
    secondaryAction,
    readMenu,
  }: {
    onClearChat?: () => void
    onStartNewConversation?: () => void
    secondaryAction?: React.ReactNode
    readMenu?: React.ReactNode
  }) =>
    ReactModule.createElement(
      'div',
      null,
      ReactModule.createElement(
        'button',
        { type: 'button', onClick: onClearChat, 'aria-label': '触发清空对话' },
        '触发清空对话',
      ),
      ReactModule.createElement(
        'button',
        { type: 'button', onClick: onStartNewConversation, 'aria-label': '触发开始新对话' },
        '触发开始新对话',
      ),
      ReactModule.createElement(
        'div',
        { 'data-testid': 'attachment-bar-secondary-action' },
        secondaryAction,
      ),
      ReactModule.createElement('div', { 'data-testid': 'attachment-bar-read-menu' }, readMenu),
    )
  MockAttachmentBar.displayName = 'MockAttachmentBar'

  return {
    AttachmentBar: MockAttachmentBar,
  }
})

jest.mock('./chat/InstructionLibraryPanel', () => ({
  InstructionLibraryPanel: () => null,
}))

jest.mock('./chat/ReadMenu', () => ({
  ReadMenu: () => null,
}))

jest.mock('./chat/TypingIndicator', () => ({
  TypingIndicator: () => null,
}))

jest.mock('./chat/EmptyChatState', () => ({
  EmptyChatState: () => null,
}))

jest.mock('./ContentRenderer', () => ({
  ContentRenderer: ({ content }: { content: string }) => <div>{content}</div>,
}))

jest.mock('./AssociateProjectDialog', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react')
  const MockAssociateProjectDialog = ({ isOpen }: { isOpen: boolean }) =>
    isOpen
      ? ReactModule.createElement(
          'div',
          { role: 'dialog', 'aria-label': '关联项目弹窗' },
          '关联项目弹窗',
        )
      : null
  MockAssociateProjectDialog.displayName = 'MockAssociateProjectDialog'

  return {
    AssociateProjectDialog: MockAssociateProjectDialog,
  }
})

jest.mock('../hooks/useClickOutside', () => ({
  useClickOutside: () => undefined,
}))

jest.mock('./chat/hooks/useInstructionLibrary', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react')
  return {
    useInstructionLibrary: () => ({
      instructionOpen: false,
      instructionLibrary: [],
      isLoading: false,
      instructionListHeight: 240,
      showInstructionForm: false,
      newInstruction: { title: '', content: '' },
      instructionBtnRef: ReactModule.createRef(),
      instructionAddBtnRef: ReactModule.createRef(),
      instructionPanelRef: ReactModule.createRef(),
      toggleInstruction: () => undefined,
      toggleInstructionForm: () => undefined,
      handleInstructionSelect: () => undefined,
      handleInstructionDelete: () => undefined,
      handleInstructionCreate: () => undefined,
      handleInstructionCancel: () => undefined,
      validationError: '',
      loadError: '',
      operationError: '',
      deletingInstructionKey: null,
      isCreatingInstruction: false,
      reloadInstructions: () => undefined,
      startInstructionResize: () => undefined,
      handleInstructionResizeKeyDown: () => undefined,
      setNewInstruction: () => undefined,
    }),
  }
})

jest.mock('./chat/hooks/useReadMenu', () => ({
  useReadMenu: () => ({
    isReadDisabled: false,
    toggleReadMenu: () => undefined,
  }),
}))

jest.mock('./chat/hooks/useChatSearch', () => ({
  useChatSearch: () => ({
    searchOpen: false,
    searchQuery: '',
    searchCurrentIndex: 0,
    searchMatchCount: 0,
    openSearch: () => undefined,
    clearSearch: () => undefined,
    handleSearchNext: () => undefined,
    handleSearchPrev: () => undefined,
    handleSearchQueryChange: () => undefined,
    isMatch: () => false,
  }),
}))

jest.mock('./chat/hooks/useChatFileUpload', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react')
  return {
    useChatFileUpload: () => ({
      handleDragOver: () => undefined,
      handleDragLeave: () => undefined,
      handleDrop: () => undefined,
      handlePaste: () => undefined,
      menuBtnRef: ReactModule.createRef(),
      toggleMenu: () => undefined,
      menuOpen: false,
      menuRef: ReactModule.createRef(),
      handleAttach: () => undefined,
      fileInputRef: ReactModule.createRef(),
      handleFileInputChange: () => undefined,
      imageInputRef: ReactModule.createRef(),
      handleImageInputChange: () => undefined,
      isDragOver: false,
    }),
  }
})

jest.mock('./chat/hooks/useChatExport', () => ({
  useChatExport: () => ({
    handleExportChat: () => undefined,
  }),
}))

const theme: Theme = {
  background: '#f5fff8',
  primary: '#32c787',
  primaryHover: '#2cab74',
  name: 'green',
}

const originalClipboard = navigator.clipboard

function createProps(overrides: Partial<React.ComponentProps<typeof ChatPanel>> = {}) {
  const session: ChatSession = {
    input: '初始输入内容',
    attachments: [],
    messages: [
      {
        id: 'user-1',
        role: 'user',
        content: '请继续生成内容',
      },
    ],
  }

  return {
    width: 420,
    chatTab: 'general' as const,
    setChatTab: () => undefined,
    session,
    onInputChange: () => undefined,
    onAddAttachment: () => undefined,
    onRemoveAttachment: () => undefined,
    loading: false,
    sendChat: () => undefined,
    clearChat: () => undefined,
    readMenuOpen: false,
    readMenuBtnRef: React.createRef<HTMLButtonElement>(),
    readMenuRef: React.createRef<HTMLDivElement>(),
    setReadMenuOpen: () => undefined,
    readFromGenerated: () => undefined,
    readFromHistory: () => undefined,
    currentTheme: theme,
    projects: [],
    onProjectChange: () => undefined,
    onQuickCreateProject: () => undefined,
    onStartNewConversation: () => undefined,
    notify: () => undefined,
    onRegenerateChat: () => undefined,
    ...overrides,
  }
}

function createSession(
  messages: ChatSession['messages'],
  overrides: Partial<ChatSession> = {},
): ChatSession {
  return {
    input: '',
    attachments: [],
    messages,
    ...overrides,
  }
}

function formatExpectedMessageTime(timestampId: string): string {
  const date = new Date(Number(timestampId))
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

describe('ChatPanel message actions', () => {
  afterEach(() => {
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: originalClipboard,
    })
  })

  test('copies assistant message content and notifies after success', async () => {
    const writeText: jest.MockedFunction<(text: string) => Promise<void>> = jest.fn(
      async (_text: string) => undefined,
    )
    const notify = jest.fn()
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })

    render(
      <ChatPanel
        {...createProps({
          notify,
          session: createSession([
            {
              id: 'user-1',
              role: 'user',
              content: '请总结',
            },
            {
              id: 'assistant-1',
              role: 'assistant',
              content: '这是助手回复',
            },
          ]),
        })}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '复制' }))

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('这是助手回复')
    })
    expect(notify).toHaveBeenCalledWith('已复制到剪贴板')
  })

  test('shows retry for the failed last assistant message and triggers regenerate', () => {
    const onRegenerateChat = jest.fn()

    render(
      <ChatPanel
        {...createProps({
          onRegenerateChat,
          chatError: '生成失败，请重试',
          session: createSession([
            {
              id: 'user-1',
              role: 'user',
              content: '请继续',
            },
            {
              id: 'assistant-1',
              role: 'assistant',
              content: '失败的助手回复',
            },
          ]),
        })}
      />,
    )

    expect(screen.getByText('生成失败，请重试')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '重试' }))

    expect(onRegenerateChat).toHaveBeenCalledTimes(1)
  })

  test('shows regenerate only for the last assistant message', () => {
    const onRegenerateChat = jest.fn()

    render(
      <ChatPanel
        {...createProps({
          onRegenerateChat,
          session: createSession([
            {
              id: 'user-1',
              role: 'user',
              content: '先来一版',
            },
            {
              id: 'assistant-1',
              role: 'assistant',
              content: '第一版回复',
            },
            {
              id: 'assistant-2',
              role: 'assistant',
              content: '第二版回复',
            },
          ]),
        })}
      />,
    )

    const regenerateButtons = screen.getAllByRole('button', { name: '重新生成' })
    expect(regenerateButtons).toHaveLength(1)

    fireEvent.click(regenerateButtons[0])

    expect(onRegenerateChat).toHaveBeenCalledTimes(1)
  })

  test('keeps the timestamp visible for user messages', () => {
    const userMessageTimestamp = '1704067200000'

    render(
      <ChatPanel
        {...createProps({
          session: createSession([
            {
              id: userMessageTimestamp,
              role: 'user',
              content: '请保留这条用户消息的时间',
            },
          ]),
        })}
      />,
    )

    expect(screen.getByText(formatExpectedMessageTime(userMessageTimestamp))).toBeInTheDocument()
  })
})
