import React from 'react'

import '@testing-library/jest-dom'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, jest, test } from '@jest/globals'

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
    clearChatButtonRef,
    newConversationButtonRef,
  }: {
    onClearChat?: () => void
    onStartNewConversation?: () => void
    secondaryAction?: React.ReactNode
    readMenu?: React.ReactNode
    clearChatButtonRef?: React.RefObject<HTMLButtonElement | null>
    newConversationButtonRef?: React.RefObject<HTMLButtonElement | null>
  }) => {
    const secondaryItems = ReactModule.Children.toArray(secondaryAction ?? null)

    return ReactModule.createElement(
      'div',
      null,
      ReactModule.createElement(
        'button',
        {
          ref: clearChatButtonRef,
          type: 'button',
          onClick: onClearChat,
          'aria-label': '触发清空对话',
        },
        '触发清空对话',
      ),
      ReactModule.createElement(
        'button',
        {
          ref: newConversationButtonRef,
          type: 'button',
          onClick: onStartNewConversation,
          'aria-label': '触发开始新对话',
        },
        '触发开始新对话',
      ),
      secondaryItems.map((item, index) =>
        ReactModule.createElement(
          'div',
          { key: `secondary-${index}`, 'data-testid': 'attachment-bar-secondary-slot' },
          item,
        ),
      ),
      ReactModule.createElement('div', { 'data-testid': 'attachment-bar-read-menu' }, readMenu),
    )
  }
  MockAttachmentBar.displayName = 'MockAttachmentBar'

  return {
    AttachmentBar: MockAttachmentBar,
  }
})

jest.mock('./chat/InstructionLibraryPanel', () => ({
  InstructionLibraryPanel: ({ label }: { label: string }) => <button type="button">{label}</button>,
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

describe('ChatPanel overlays', () => {
  test('renders footer secondary actions as separate slots on non-general tabs', () => {
    render(
      <ChatPanel
        {...createProps({
          chatTab: 'focus',
        })}
      />,
    )

    const secondarySlots = screen.getAllByTestId('attachment-bar-secondary-slot')

    expect(secondarySlots).toHaveLength(2)
    expect(within(secondarySlots[0]).getByRole('button', { name: '关联项目' })).toBeInTheDocument()
    expect(within(secondarySlots[1]).getByRole('button', { name: '指令库Ⅰ' })).toBeInTheDocument()
  })

  test('shows the associate project action for non-general tabs and opens the dialog', async () => {
    render(
      <ChatPanel
        {...createProps({
          chatTab: 'focus',
        })}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '关联项目' }))

    expect(await screen.findByRole('dialog', { name: '关联项目弹窗' })).toBeInTheDocument()
  })

  test('confirms before starting a new conversation when there is unsent input', () => {
    const onStartNewConversation = jest.fn()
    const onInputChange = jest.fn()

    render(
      <ChatPanel
        {...createProps({
          onStartNewConversation,
          onInputChange,
          session: {
            input: '还有没发送的内容',
            attachments: [],
            messages: [
              {
                id: 'user-1',
                role: 'user',
                content: '第一条消息',
              },
              {
                id: 'assistant-1',
                role: 'assistant',
                content: '助手回复',
              },
            ],
          },
        })}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '触发开始新对话' }))

    const dialog = screen.getByRole('dialog', { name: '开始新对话？' })
    expect(dialog).toBeInTheDocument()
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(document.body).toHaveStyle({ overflow: 'hidden' })
    const descriptionId = dialog.getAttribute('aria-describedby')
    expect(descriptionId).toBeTruthy()
    expect(document.getElementById(descriptionId ?? '')).toHaveTextContent(
      '当前输入框中有未发送的内容，确定要开始新对话吗？',
    )
    expect(onStartNewConversation).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: '确定' }))

    expect(onStartNewConversation).toHaveBeenCalledTimes(1)
    expect(onInputChange).toHaveBeenCalledWith('')
  })

  test('only clears the conversation after the user confirms', () => {
    const clearChat = jest.fn()
    const onInputChange = jest.fn()

    render(
      <ChatPanel
        {...createProps({
          clearChat,
          onInputChange,
        })}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '触发清空对话' }))

    expect(screen.getByRole('dialog', { name: '确认清空对话？' })).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: '确认清空对话？' })).toHaveAttribute(
      'aria-modal',
      'true',
    )
    expect(document.body).toHaveStyle({ overflow: 'hidden' })

    fireEvent.click(screen.getByRole('button', { name: '取消' }))

    expect(clearChat).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: '触发清空对话' }))
    fireEvent.click(screen.getByRole('button', { name: '确认清空' }))

    expect(clearChat).toHaveBeenCalledTimes(1)
    expect(onInputChange).toHaveBeenCalledWith('')
  })

  test('returns focus to the clear trigger after canceling the confirmation dialog', () => {
    render(<ChatPanel {...createProps()} />)

    const clearTrigger = screen.getByRole('button', { name: '触发清空对话' })
    clearTrigger.focus()
    fireEvent.click(clearTrigger)
    fireEvent.click(screen.getByRole('button', { name: '取消' }))

    expect(clearTrigger).toHaveFocus()
  })

  test('returns focus to the new conversation trigger after canceling the confirmation dialog', () => {
    render(
      <ChatPanel
        {...createProps({
          session: {
            input: '未发送草稿',
            attachments: [],
            messages: [{ id: 'welcome', role: 'assistant', content: '欢迎' }],
          },
        })}
      />,
    )

    const newConversationTrigger = screen.getByRole('button', { name: '触发开始新对话' })
    newConversationTrigger.focus()
    fireEvent.click(newConversationTrigger)
    fireEvent.click(screen.getByRole('button', { name: '取消' }))

    expect(newConversationTrigger).toHaveFocus()
  })
})
