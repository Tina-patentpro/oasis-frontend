/* eslint-disable max-lines -- ChatPanel 右栏回归场景集中在此文件，后续可随组件继续拆分测试 */
import React from 'react'

import '@testing-library/jest-dom'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, jest, test } from '@jest/globals'

import type { ChatSession, Theme } from '@/types'

import { ChatPanel } from './ChatPanel'

const mockChatSearchState = {
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
}
let mockFileUploadMenuOpen = false
const mockContentRendererCalls: Array<{
  content: string
  onOasisActionFill?: (query: string) => void
}> = []

jest.mock('react-virtuoso', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react')
  const MockVirtuoso = ReactModule.forwardRef<HTMLDivElement, any>(
    (
      {
        data = [],
        itemContent,
        className,
        role,
        atBottomStateChange: _atBottomStateChange,
        followOutput: _followOutput,
        initialTopMostItemIndex: _initialTopMostItemIndex,
        ...rest
      },
      ref,
    ) =>
      ReactModule.createElement(
        'div',
        { ref, className, role, ...rest },
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
  const MockTooltip = ({
    children,
    inlineChild,
  }: {
    children: React.ReactNode
    inlineChild?: boolean
  }) => {
    if (!ReactModule.isValidElement(children)) {
      return ReactModule.createElement(ReactModule.Fragment, null, children)
    }

    return ReactModule.cloneElement(children as React.ReactElement<any>, {
      'data-tooltip-inline-child': inlineChild ? 'true' : undefined,
    })
  }
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

jest.mock('./chat/AttachmentBar', () => ({
  AttachmentBar: ({
    loading,
    readMenu,
    secondaryAction,
    onStartNewConversation,
  }: {
    loading?: boolean
    readMenu?: React.ReactNode
    secondaryAction?: React.ReactNode
    onStartNewConversation?: () => void
  }) => (
    <div>
      {readMenu}
      {secondaryAction}
      <button type="button" aria-label="新对话" disabled={loading} onClick={onStartNewConversation}>
        新对话
      </button>
      <button type="button" aria-label="模拟发送消息" disabled={loading}>
        发送
      </button>
    </div>
  ),
}))

jest.mock('./chat/InstructionLibraryPanel', () => ({
  InstructionLibraryPanel: ({ disabled }: { disabled?: boolean }) => (
    <button type="button" aria-label="打开指令库" disabled={disabled}>
      指令库
    </button>
  ),
}))

jest.mock('./chat/ReadMenu', () => ({
  ReadMenu: ({
    isDisabled,
    onReadFromGenerated,
    onReadFromHistory,
  }: {
    isDisabled?: boolean
    onReadFromGenerated?: () => void
    onReadFromHistory?: () => void
  }) => (
    <div>
      <button type="button" aria-label="读取资料并追加到输入框末尾" disabled={isDisabled}>
        读取
      </button>
      <button
        type="button"
        aria-label="读取中栏生成结果，并追加到输入框末尾"
        disabled={isDisabled}
        onClick={onReadFromGenerated}
      >
        读取中栏生成结果
      </button>
      <button
        type="button"
        aria-label="读取项目历史资料，并追加到输入框末尾"
        disabled={isDisabled}
        onClick={onReadFromHistory}
      >
        读取项目历史数据
      </button>
    </div>
  ),
}))

jest.mock('./chat/TypingIndicator', () => ({
  TypingIndicator: () => null,
}))

jest.mock('./chat/EmptyChatState', () => ({
  EmptyChatState: ({ onSuggestionClick }: { onSuggestionClick: (text: string) => void }) => (
    <button
      type="button"
      aria-label="插入到输入框开头：帮我提出对以下权利要求书的优化建议"
      onClick={() => onSuggestionClick('帮我提出对以下权利要求书的优化建议')}
    >
      帮我提出对以下权利要求书的优化建议
    </button>
  ),
}))

jest.mock('./ContentRenderer', () => ({
  ContentRenderer: ({
    content,
    renderMode,
    onOasisActionFill,
  }: {
    content: string
    renderMode?: string
    onOasisActionFill?: (query: string) => void
  }) => {
    mockContentRendererCalls.push({ content, onOasisActionFill })
    const actionQuery = '请根据技术交底书生成权利要求书。'

    return (
      <div data-testid="mock-chat-input-preview" data-render-mode={renderMode}>
        {content}
        {content.includes('```oasis-actions') ? (
          <button type="button" onClick={() => onOasisActionFill?.(actionQuery)}>
            生成权利要求书
          </button>
        ) : null}
      </div>
    )
  },
}))

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
  useChatSearch: () => mockChatSearchState,
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
      menuOpen: mockFileUploadMenuOpen,
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

function setTextareaMetrics(
  textarea: HTMLTextAreaElement,
  { scrollHeight, offsetHeight }: { scrollHeight: number; offsetHeight?: number },
) {
  Object.defineProperty(textarea, 'scrollHeight', {
    configurable: true,
    value: scrollHeight,
  })
  Object.defineProperty(textarea, 'offsetHeight', {
    configurable: true,
    value: offsetHeight ?? scrollHeight,
  })
}

const SPECIAL_CHAT_INPUT = [
  '行内公式：$E=mc^2$',
  '',
  '块级公式：',
  '\\[',
  '\\int_0^1 x^2\\, dx = \\frac{1}{3}',
  '\\]',
  '',
  '测试项 | 预期',
  '表格 | 自动预览',
  '',
  'flowchart TD',
  '  A[开始] --> B{是否正常}',
  '  B -->|是| C[完成]',
].join('\n')

describe('ChatPanel', () => {
  beforeEach(() => {
    mockChatSearchState.searchOpen = false
    mockChatSearchState.searchQuery = ''
    mockChatSearchState.searchCurrentIndex = 0
    mockChatSearchState.searchMatchCount = 0
    mockChatSearchState.openSearch = () => undefined
    mockChatSearchState.clearSearch = () => undefined
    mockChatSearchState.handleSearchNext = () => undefined
    mockChatSearchState.handleSearchPrev = () => undefined
    mockChatSearchState.handleSearchQueryChange = () => undefined
    mockChatSearchState.isMatch = () => false
    mockFileUploadMenuOpen = false
    mockContentRendererCalls.length = 0
  })

  test('exposes the chat panel as a named landmark', () => {
    render(<ChatPanel {...createProps()} />)

    expect(screen.getByRole('complementary', { name: '对话面板' })).toBeInTheDocument()
  })

  test('shows restored history message time from createdAt instead of numeric id', () => {
    const session: ChatSession = {
      input: '',
      attachments: [],
      messages: [
        {
          id: '31',
          role: 'user',
          content: '历史消息',
          createdAt: '2026-05-21T09:30:00',
        },
      ],
    }

    render(<ChatPanel {...createProps({ session })} />)

    expect(screen.getByText('09:30')).toBeInTheDocument()
  })

  test('labels search field, message log, attachment trigger, and busy footer states', () => {
    mockChatSearchState.searchOpen = true
    mockChatSearchState.searchQuery = '历史'

    render(<ChatPanel {...createProps({ loading: true })} />)

    const searchInput = screen.getByRole('textbox', { name: '搜索对话内容' })
    expect(searchInput).toBeInTheDocument()
    expect(searchInput).toHaveAttribute('name', 'chat-search')
    expect(searchInput).toHaveAttribute('autocomplete', 'off')
    expect(searchInput.parentElement).toHaveClass('focus-within:ring-2')
    expect(screen.getByRole('log', { name: '对话消息列表' })).toHaveAttribute('aria-live', 'polite')

    const attachmentButton = screen.getByRole('button', { name: '添加附件' })
    expect(attachmentButton).toHaveAttribute('aria-haspopup', 'dialog')
    expect(attachmentButton).toHaveAttribute('aria-expanded', 'false')
    expect(attachmentButton).not.toHaveAttribute('aria-controls')
    expect(attachmentButton).toBeDisabled()
    expect(screen.getByRole('textbox', { name: '对话输入框' })).toBeDisabled()
    const compactHeightButton = screen.getByRole('button', { name: '紧凑' })
    expect(compactHeightButton).toBeDisabled()
    expect(compactHeightButton).toHaveClass('disabled:cursor-not-allowed')
    expect(compactHeightButton).toHaveClass('disabled:opacity-60')
    expect(screen.getByRole('button', { name: '导出对话' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '打开指令库' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '模拟发送消息' })).toBeDisabled()

    expect(screen.getByLabelText('对话输入与操作区')).toHaveAttribute('aria-busy', 'true')
  })

  test('uses ordinary popup buttons for attachment actions instead of menu roles', () => {
    mockFileUploadMenuOpen = true

    render(<ChatPanel {...createProps()} />)

    const trigger = screen.getByRole('button', { name: '添加附件' })
    const dialog = screen.getByRole('dialog', { name: '添加附件' })

    expect(trigger).toHaveAttribute('aria-controls', dialog.id)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /添加照片或文件/ })).toHaveAttribute('type', 'button')
    expect(screen.getByRole('button', { name: /仅图片/ })).toHaveAttribute('type', 'button')
  })

  test('supports arrow, Home, and End keyboard navigation for chat tabs', () => {
    const setChatTab = jest.fn()
    render(
      <ChatPanel
        {...createProps({
          chatTab: 'focus',
          setChatTab,
          chatTabs: [
            { key: 'focus', label: '专利聚焦', hint: '聚焦模式' },
            { key: 'image', label: '图像生成', hint: '图像模式' },
            { key: 'general', label: '通用助手', hint: '通用模式' },
          ],
        })}
      />,
    )

    const activeTab = screen.getByRole('tab', { name: '专利聚焦' })
    const inactiveTab = screen.getByRole('tab', { name: '图像生成' })
    const panel = screen.getByRole('tabpanel')

    expect(activeTab).toHaveAttribute('tabIndex', '0')
    expect(inactiveTab).toHaveAttribute('tabIndex', '-1')
    expect(activeTab).toHaveAttribute('aria-controls', panel.id)
    expect(panel).toHaveAttribute('aria-labelledby', activeTab.id)

    fireEvent.keyDown(activeTab, { key: 'ArrowRight' })
    expect(setChatTab).toHaveBeenCalledWith('image')

    fireEvent.keyDown(activeTab, { key: 'End' })
    expect(setChatTab).toHaveBeenCalledWith('general')

    fireEvent.keyDown(activeTab, { key: 'Home' })
    expect(setChatTab).toHaveBeenCalledWith('focus')
  })

  test('keeps long associated project names from overflowing the footer', () => {
    const longProjectName = '这是一个非常非常非常长的项目名称用于验证底部不会溢出'

    render(
      <ChatPanel
        {...createProps({
          chatTab: 'focus',
          session: {
            input: '',
            attachments: [],
            associatedProjectId: 1,
            messages: [{ id: 'user-1', role: 'user', content: '内容' }],
          },
          projects: [
            {
              id: 1,
              userId: 1,
              name: longProjectName,
              status: 'active',
              sessionCount: 1,
              createdAt: '2026-03-09T08:00:00.000Z',
              updatedAt: '2026-03-09T08:00:00.000Z',
            },
          ],
        })}
      />,
    )

    const projectName = screen.getByText(longProjectName)

    expect(projectName).toHaveClass('truncate')
    expect(projectName).toHaveAttribute('title', longProjectName)
  })

  test('keeps associated project status before export action on one footer row', () => {
    const projectName = '工学键盘'

    render(
      <ChatPanel
        {...createProps({
          chatTab: 'focus',
          session: {
            input: '',
            attachments: [],
            associatedProjectId: 1,
            messages: [{ id: 'user-1', role: 'user', content: '内容' }],
          },
          projects: [
            {
              id: 1,
              userId: 1,
              name: projectName,
              status: 'active',
              sessionCount: 1,
              createdAt: '2026-03-09T08:00:00.000Z',
              updatedAt: '2026-03-09T08:00:00.000Z',
            },
          ],
        })}
      />,
    )

    const exportButton = screen.getByRole('button', { name: '导出对话' })
    const projectLabel = screen.getByText('关联到:')
    const footerRow = exportButton.closest('div')

    expect(footerRow).toContainElement(projectLabel)
    expect(footerRow).toContainElement(screen.getByText(projectName))
    expect(projectLabel.compareDocumentPosition(exportButton)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
    expect(exportButton).toHaveAttribute('data-tooltip-inline-child', 'true')
  })

  test('keeps the message area separated from the footer', () => {
    render(<ChatPanel {...createProps()} />)

    const panel = screen.getByRole('tabpanel')
    const textarea = screen.getByLabelText('对话输入框')
    const footer = textarea.closest('.shrink-0')
    if (!footer) {
      throw new Error('chat input footer not found')
    }

    expect(panel).toHaveClass('flex')
    expect(panel).toHaveClass('flex-col')
    expect(panel).toHaveClass('min-h-0')
    expect(panel).toHaveClass('overflow-hidden')
    expect(footer).toHaveClass('shrink-0')
  })

  test('shows textarea height preset buttons and keeps standard selected by default', () => {
    render(<ChatPanel {...createProps()} />)

    expect(screen.queryByText('输入框高度')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '紧凑' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '标准' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '展开' })).toBeInTheDocument()
  })

  test('changes the base height when the user clicks another preset', () => {
    render(<ChatPanel {...createProps()} />)

    const textarea = screen.getByLabelText('对话输入框') as HTMLTextAreaElement
    setTextareaMetrics(textarea, { scrollHeight: 96 })

    fireEvent.click(screen.getByRole('button', { name: '展开' }))

    expect(screen.getByRole('button', { name: '展开' })).toHaveAttribute('aria-pressed', 'true')
    expect(textarea.style.height).toBe('240px')
  })

  test('still auto grows when content exceeds the compact preset height', () => {
    render(<ChatPanel {...createProps()} />)

    const textarea = screen.getByLabelText('对话输入框') as HTMLTextAreaElement
    setTextareaMetrics(textarea, { scrollHeight: 96 })
    fireEvent.click(screen.getByRole('button', { name: '紧凑' }))

    setTextareaMetrics(textarea, { scrollHeight: 260 })
    fireEvent.change(textarea, { target: { value: '很长的输入内容'.repeat(40) } })

    expect(textarea.style.height).toBe('260px')
  })

  test('remembers the selected preset separately for each chat tab', () => {
    const { rerender } = render(<ChatPanel {...createProps()} />)

    const textarea = screen.getByLabelText('对话输入框') as HTMLTextAreaElement
    setTextareaMetrics(textarea, { scrollHeight: 96 })
    fireEvent.click(screen.getByRole('button', { name: '展开' }))
    expect(textarea.style.height).toBe('240px')

    rerender(
      <ChatPanel
        {...createProps({
          chatTab: 'image',
        })}
      />,
    )

    setTextareaMetrics(textarea, { scrollHeight: 96 })
    expect(screen.getByRole('button', { name: '标准' })).toHaveAttribute('aria-pressed', 'true')
    expect(textarea.style.height).toBe('150px')

    setTextareaMetrics(textarea, { scrollHeight: 60 })
    fireEvent.click(screen.getByRole('button', { name: '紧凑' }))
    expect(textarea.style.height).toBe('72px')

    rerender(<ChatPanel {...createProps()} />)

    setTextareaMetrics(textarea, { scrollHeight: 96 })
    expect(screen.getByRole('button', { name: '展开' })).toHaveAttribute('aria-pressed', 'true')
    expect(textarea.style.height).toBe('240px')
  })

  test('keeps the selected preset when the session changes in the same tab', () => {
    const { rerender } = render(<ChatPanel {...createProps()} />)

    const textarea = screen.getByLabelText('对话输入框') as HTMLTextAreaElement
    setTextareaMetrics(textarea, { scrollHeight: 96 })
    fireEvent.click(screen.getByRole('button', { name: '展开' }))
    expect(textarea.style.height).toBe('240px')

    const nextSession: ChatSession = {
      input: '新的会话输入',
      attachments: [],
      messages: [
        {
          id: 'user-2',
          role: 'user',
          content: '新的会话内容',
        },
      ],
      sessionId: 1002,
    }

    rerender(
      <ChatPanel
        {...createProps({
          session: nextSession,
        })}
      />,
    )

    setTextareaMetrics(textarea, { scrollHeight: 96 })
    expect(textarea.style.height).toBe('240px')
  })

  test('returns to the current preset height when content shrinks again', () => {
    render(<ChatPanel {...createProps()} />)

    const textarea = screen.getByLabelText('对话输入框') as HTMLTextAreaElement
    setTextareaMetrics(textarea, { scrollHeight: 96 })
    fireEvent.click(screen.getByRole('button', { name: '展开' }))

    setTextareaMetrics(textarea, { scrollHeight: 260 })
    fireEvent.change(textarea, { target: { value: '先输入很多内容'.repeat(20) } })

    setTextareaMetrics(textarea, { scrollHeight: 96 })
    fireEvent.change(textarea, { target: { value: '短内容' } })

    expect(textarea.style.height).toBe('240px')
  })

  test('keeps markdown editable by default and previews only after the user clicks preview', async () => {
    const session: ChatSession = {
      input: SPECIAL_CHAT_INPUT,
      attachments: [],
      messages: [{ id: 'user-1', role: 'user', content: '请继续生成内容' }],
    }

    render(<ChatPanel {...createProps({ session })} />)

    const textarea = screen.getByLabelText('对话输入框')
    fireEvent.blur(textarea)

    expect(screen.queryByTestId('mock-chat-input-preview')).not.toBeInTheDocument()
    expect(textarea).toHaveValue(SPECIAL_CHAT_INPUT)

    fireEvent.click(screen.getByRole('button', { name: '预览效果' }))

    const preview = await screen.findByTestId('mock-chat-input-preview')
    expect(preview).toHaveAttribute('data-render-mode', 'rich')
    expect(preview.textContent).toBe(SPECIAL_CHAT_INPUT)

    fireEvent.click(screen.getByRole('button', { name: '编辑 Markdown' }))

    expect(await screen.findByLabelText('对话输入框')).toHaveValue(SPECIAL_CHAT_INPUT)
  })

  test('keeps chat attachment, height, and markdown mode controls in one toolbar', () => {
    render(<ChatPanel {...createProps()} />)

    const toolbar = screen.getByLabelText('对话输入区工具栏')
    expect(toolbar).toContainElement(screen.getByRole('button', { name: '添加附件' }))
    expect(toolbar).toContainElement(screen.getByRole('group', { name: '输入框高度档位' }))
    expect(toolbar).toContainElement(screen.getByRole('group', { name: '对话输入框编辑模式' }))

    const textarea = screen.getByLabelText('对话输入框')
    expect(textarea).toHaveClass('pl-4')
    expect(textarea).not.toHaveClass('pl-14')
  })

  test('applies the selected height preset to the chat composer preview', async () => {
    const session: ChatSession = {
      input: SPECIAL_CHAT_INPUT,
      attachments: [],
      messages: [{ id: 'user-1', role: 'user', content: '请继续生成内容' }],
    }

    render(<ChatPanel {...createProps({ session })} />)

    fireEvent.click(screen.getByRole('button', { name: '展开' }))
    fireEvent.click(screen.getByRole('button', { name: '预览效果' }))

    const previewContent = await screen.findByTestId('mock-chat-input-preview')
    const preview = previewContent.closest('[aria-label="对话输入框预览内容"]')
    if (!preview) {
      throw new Error('chat input preview panel not found')
    }

    expect(preview).toHaveStyle({ height: '240px' })
  })

  test('keeps ordinary chat text editable instead of auto previewing it', () => {
    const session: ChatSession = {
      input: '普通聊天输入，不需要自动预览。',
      attachments: [],
      messages: [{ id: 'user-1', role: 'user', content: '请继续生成内容' }],
    }

    render(<ChatPanel {...createProps({ session })} />)

    fireEvent.blur(screen.getByLabelText('对话输入框'))

    expect(screen.queryByTestId('mock-chat-input-preview')).not.toBeInTheDocument()
    expect(screen.getByLabelText('对话输入框')).toHaveValue('普通聊天输入，不需要自动预览。')
  })

  test('fills chat input immediately when clicking oasis action button in assistant message', async () => {
    const onInputChange = jest.fn()
    const notify = jest.fn()
    const session: ChatSession = {
      input: '',
      attachments: [],
      messages: [
        { id: 'welcome', role: 'assistant', content: '欢迎' },
        {
          id: 'assistant-actions',
          role: 'assistant',
          content:
            '下一步：\n\n```oasis-actions\n' +
            JSON.stringify({
              actions: [
                {
                  id: 'generate_claims',
                  label: '生成权利要求书',
                  type: 'fill',
                  query: '请根据技术交底书生成权利要求书。',
                },
              ],
            }) +
            '\n```',
        },
      ],
    }

    render(<ChatPanel {...createProps({ session, onInputChange, notify })} />)

    fireEvent.click(await screen.findByRole('button', { name: '生成权利要求书' }))

    const textarea = screen.getByLabelText('对话输入框')
    expect(textarea).toHaveValue('请根据技术交底书生成权利要求书。')
    expect(onInputChange).toHaveBeenCalledWith('请根据技术交底书生成权利要求书。')
    expect(notify).toHaveBeenCalledWith('已插入到输入框开头，请检查后发送')
  })

  test('prepends oasis action button content to the existing chat input', async () => {
    const onInputChange = jest.fn()
    const notify = jest.fn()
    const session: ChatSession = {
      input: '已有草稿',
      attachments: [],
      messages: [
        { id: 'welcome', role: 'assistant', content: '欢迎' },
        {
          id: 'assistant-actions',
          role: 'assistant',
          content:
            '下一步：\n\n```oasis-actions\n' +
            JSON.stringify({
              actions: [
                {
                  id: 'generate_claims',
                  label: '生成权利要求书',
                  type: 'fill',
                  query: '请根据技术交底书生成权利要求书。',
                },
              ],
            }) +
            '\n```',
        },
      ],
    }

    render(<ChatPanel {...createProps({ session, onInputChange, notify })} />)

    fireEvent.click(await screen.findByRole('button', { name: '生成权利要求书' }))

    const textarea = screen.getByLabelText('对话输入框')
    expect(textarea).toHaveValue('请根据技术交底书生成权利要求书。\n\n已有草稿')
    expect(onInputChange).toHaveBeenCalledWith('请根据技术交底书生成权利要求书。\n\n已有草稿')
    expect(notify).toHaveBeenCalledWith('已插入到输入框开头，请检查后发送')
  })

  test('does not re-render assistant message content when only local chat input changes', async () => {
    const session: ChatSession = {
      sessionId: 123,
      input: '',
      attachments: [],
      messages: [
        {
          id: 'assistant-actions',
          role: 'assistant',
          content:
            '下一步：\n\n```oasis-actions\n' +
            JSON.stringify({
              actions: [
                {
                  id: 'generate_claims',
                  label: '生成权利要求书',
                  type: 'fill',
                  query: '请根据技术交底书生成权利要求书。',
                },
              ],
            }) +
            '\n```',
        },
      ],
    }

    render(<ChatPanel {...createProps({ session })} />)

    await screen.findByRole('button', { name: '生成权利要求书' })
    const initialRenderCount = mockContentRendererCalls.length
    const initialFillHandler =
      mockContentRendererCalls[mockContentRendererCalls.length - 1]?.onOasisActionFill

    fireEvent.change(screen.getByLabelText('对话输入框'), {
      target: { value: '只修改本地草稿' },
    })

    expect(mockContentRendererCalls.length).toBe(initialRenderCount)
    expect(mockContentRendererCalls[mockContentRendererCalls.length - 1]?.onOasisActionFill).toBe(
      initialFillHandler,
    )
  })

  test('prepends empty-state suggestion to the existing chat input', () => {
    const onInputChange = jest.fn()
    const notify = jest.fn()
    const session: ChatSession = {
      input: '已有草稿',
      attachments: [],
      messages: [{ id: 'welcome', role: 'assistant', content: '欢迎使用' }],
    }

    render(<ChatPanel {...createProps({ chatTab: 'focus', session, onInputChange, notify })} />)

    fireEvent.click(
      screen.getByRole('button', {
        name: '插入到输入框开头：帮我提出对以下权利要求书的优化建议',
      }),
    )

    const textarea = screen.getByRole('textbox', { name: '对话输入框' })
    expect(textarea).toHaveValue('帮我提出对以下权利要求书的优化建议\n\n已有草稿')
    expect(onInputChange).toHaveBeenLastCalledWith('帮我提出对以下权利要求书的优化建议\n\n已有草稿')
    expect(notify).toHaveBeenCalledWith('已插入到输入框开头，请检查后发送')
  })

  test('syncs the latest draft before reading generated content', () => {
    let latestInput = ''
    const onInputChange = jest.fn((value: string) => {
      latestInput = value
    })
    const readFromGenerated = jest.fn(() => {
      expect(latestInput).toBe('刚输入但还没等到同步的内容')
    })

    render(<ChatPanel {...createProps({ onInputChange, readFromGenerated })} />)

    const textarea = screen.getByRole('textbox', { name: '对话输入框' })
    fireEvent.change(textarea, { target: { value: '刚输入但还没等到同步的内容' } })
    fireEvent.click(screen.getByRole('button', { name: '读取中栏生成结果，并追加到输入框末尾' }))

    expect(readFromGenerated).toHaveBeenCalledTimes(1)
    expect(onInputChange).toHaveBeenLastCalledWith('刚输入但还没等到同步的内容')
  })

  test('keeps Enter sending behavior in the chat composer', () => {
    const sendChat = jest.fn()

    render(<ChatPanel {...createProps({ sendChat })} />)

    fireEvent.keyDown(screen.getByLabelText('对话输入框'), {
      key: 'Enter',
      keyCode: 13,
    })

    expect(sendChat).toHaveBeenCalledTimes(1)
  })

  test('sends the latest local input when Enter is pressed immediately after typing', () => {
    const sendChat = jest.fn()

    render(<ChatPanel {...createProps({ sendChat })} />)

    const textarea = screen.getByLabelText('对话输入框')
    fireEvent.change(textarea, { target: { value: '刚输入的新内容' } })
    fireEvent.keyDown(textarea, {
      key: 'Enter',
      keyCode: 13,
    })

    expect(sendChat).toHaveBeenCalledWith('刚输入的新内容')
  })

  test('limits chat composer text length before syncing drafts', () => {
    jest.useFakeTimers()
    const onInputChange = jest.fn()
    const oversizedInput = 'a'.repeat(20005)

    try {
      render(<ChatPanel {...createProps({ onInputChange })} />)

      const textarea = screen.getByRole('textbox', { name: '对话输入框' })
      fireEvent.change(textarea, { target: { value: oversizedInput } })

      expect(textarea).toHaveAttribute('maxLength', '20000')
      expect(textarea).toHaveValue('a'.repeat(20000))

      act(() => {
        jest.advanceTimersByTime(300)
      })

      expect(onInputChange).toHaveBeenLastCalledWith('a'.repeat(20000))
    } finally {
      jest.useRealTimers()
    }
  })

  test('does not emit stale debounced input after immediate send', () => {
    jest.useFakeTimers()
    const sendChat = jest.fn()
    const onInputChange = jest.fn()

    try {
      render(<ChatPanel {...createProps({ onInputChange, sendChat })} />)

      const textarea = screen.getByLabelText('对话输入框')
      fireEvent.change(textarea, { target: { value: '马上发送的内容' } })
      fireEvent.keyDown(textarea, {
        key: 'Enter',
        keyCode: 13,
      })

      expect(sendChat).toHaveBeenCalledWith('马上发送的内容')
      expect(onInputChange).toHaveBeenCalledTimes(1)
      expect(onInputChange).toHaveBeenLastCalledWith('马上发送的内容')

      act(() => {
        jest.advanceTimersByTime(300)
      })

      expect(onInputChange).toHaveBeenCalledTimes(1)
    } finally {
      jest.useRealTimers()
    }
  })

  test('clears pending draft sync when switching to another empty session', () => {
    jest.useFakeTimers()
    const onInputChange = jest.fn()
    const firstSession: ChatSession = {
      input: '',
      attachments: [],
      sessionId: 101,
      messages: [{ id: 'first', role: 'assistant', content: '第一个会话' }],
    }
    const secondSession: ChatSession = {
      input: '',
      attachments: [],
      sessionId: 202,
      messages: [{ id: 'second', role: 'assistant', content: '第二个会话' }],
    }

    try {
      const { rerender } = render(
        <ChatPanel {...createProps({ session: firstSession, onInputChange })} />,
      )

      const textarea = screen.getByLabelText('对话输入框')
      fireEvent.change(textarea, { target: { value: '旧会话未同步草稿' } })

      rerender(<ChatPanel {...createProps({ session: secondSession, onInputChange })} />)

      expect(screen.getByLabelText('对话输入框')).toHaveValue('')

      act(() => {
        jest.advanceTimersByTime(300)
      })

      expect(onInputChange).not.toHaveBeenCalledWith('旧会话未同步草稿')
    } finally {
      jest.useRealTimers()
    }
  })

  test('asks for confirmation before starting a new conversation with an unsent draft in an initial session', () => {
    const onStartNewConversation = jest.fn()
    const onInputChange = jest.fn()
    const initialSession: ChatSession = {
      input: '',
      attachments: [],
      messages: [{ id: 'welcome', role: 'assistant', content: '欢迎使用' }],
    }

    render(
      <ChatPanel
        {...createProps({ session: initialSession, onInputChange, onStartNewConversation })}
      />,
    )

    const textarea = screen.getByLabelText('对话输入框')
    fireEvent.change(textarea, { target: { value: '还没发送的草稿' } })
    fireEvent.click(screen.getByRole('button', { name: '新对话' }))

    expect(screen.getByRole('dialog', { name: '开始新对话？' })).toBeInTheDocument()
    expect(onStartNewConversation).not.toHaveBeenCalled()
    expect(onInputChange).not.toHaveBeenCalledWith('')
    expect(textarea).toHaveValue('还没发送的草稿')

    fireEvent.click(screen.getByRole('button', { name: '取消' }))

    expect(onStartNewConversation).not.toHaveBeenCalled()
    expect(textarea).toHaveValue('还没发送的草稿')
  })

  test('returns focus to the search button when closing search', () => {
    const clearSearch = jest.fn<() => undefined>(() => undefined)
    mockChatSearchState.searchOpen = true
    mockChatSearchState.searchQuery = '回复'
    mockChatSearchState.clearSearch = clearSearch
    const searchableSession: ChatSession = {
      input: '',
      attachments: [],
      messages: [
        { id: 'user-1', role: 'user', content: '请继续生成内容' },
        { id: 'assistant-1', role: 'assistant', content: '助手回复' },
      ],
    }

    render(<ChatPanel {...createProps({ session: searchableSession })} />)

    const searchButton = screen.getByRole('button', { name: '搜索对话' })
    fireEvent.click(screen.getByRole('button', { name: '关闭搜索' }))

    expect(clearSearch).toHaveBeenCalled()
    expect(searchButton).toHaveFocus()
  })
})
