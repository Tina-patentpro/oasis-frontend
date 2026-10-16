import type { ComponentProps, ReactNode } from 'react'

import { describe, expect, jest, test } from '@jest/globals'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { InputSection } from './InputSection'
import { getInputSectionPanelId, getInputSectionTabId } from './input-section/a11y'

jest.mock('@/styles/inputSectionHeader.css', () => ({}))

jest.mock('../../hooks/useClickOutside', () => ({
  useClickOutside: jest.fn(),
}))

jest.mock('../ui', () => ({
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

jest.mock('../ui/FileUpload', () => ({
  FileUpload: () => <div data-testid="mock-file-upload" />,
}))

jest.mock('./input-section/InputSectionHeader', () => ({
  InputSectionHeader: () => <div data-testid="mock-input-section-header" />,
}))

jest.mock('../ContentRenderer', () => ({
  ContentRenderer: ({ content, renderMode }: { content: string; renderMode?: string }) => (
    <div data-testid="mock-input-preview" data-render-mode={renderMode}>
      {content}
    </div>
  ),
}))

jest.mock('@/stores', () => ({
  useThemeStore: (
    selector: (state: { currentTheme: { primary: string; primaryHover: string } }) => unknown,
  ) =>
    selector({
      currentTheme: {
        primary: '#10b981',
        primaryHover: '#059669',
      },
    }),
}))

function createProps(
  overrides: Partial<ComponentProps<typeof InputSection>> = {},
): ComponentProps<typeof InputSection> {
  return {
    inputPage: 'attachment',
    inputSections: {},
    layoutMode: 'auto' as const,
    appliedLayout: 'horizontal',
    contentPages: [{ key: 'attachment', label: '附件' }],
    destinations: [],
    onInputPageChange: jest.fn(),
    onInputChange: jest.fn(),
    onLayoutModeChange: jest.fn(),
    onFileUpload: jest.fn(async () => undefined),
    onReadHistory: jest.fn(),
    onCopyInput: jest.fn(),
    onClearAll: jest.fn(),
    onStartNewSession: jest.fn(),
    startNewSessionDisabled: false,
    startNewSessionTooltip: '',
    onQuickCreateProject: jest.fn(),
    projects: [],
    selectedProjectId: null,
    onProjectChange: jest.fn(),
    sectionDefinitions: {
      attachment: {
        key: 'attachment',
        label: '附件',
        inputMode: 'file' as const,
        isMultiFile: true,
        supportsFileUpload: true,
        supportsImageUpload: false,
        required: false,
      },
    },
    apiDetail: {
      id: 1,
      input_schema: [
        {
          type: 'file_list',
          cn_name: '附件',
          en_name: 'attachment',
          content: '',
        },
      ],
    },
    ...overrides,
  }
}

const SPECIAL_MARKDOWN_INPUT = [
  '行内公式：\\(E=mc^2\\)',
  '',
  '块级公式：',
  '\\[',
  '\\int_0^1 x^2\\, dx = \\frac{1}{3}',
  '\\]',
  '',
  '| 测试项 | 预期 |',
  '| --- | --- |',
  '| 表格 | 保持源码 |',
  '',
  'flowchart TD',
  '  A[开始] --> B{是否正常}',
  '  B -->|是| C[完成]',
].join('\n')

function createTextProps(
  overrides: Partial<ComponentProps<typeof InputSection>> = {},
): ComponentProps<typeof InputSection> {
  return createProps({
    inputPage: 'prompt',
    inputSections: {},
    contentPages: [{ key: 'prompt', label: '输入材料' }],
    sectionDefinitions: {
      prompt: {
        key: 'prompt',
        label: '输入材料',
        inputMode: 'text' as const,
        isMultiFile: false,
        supportsFileUpload: false,
        supportsImageUpload: false,
        required: false,
      },
    },
    apiDetail: {
      id: 1,
      input_schema: [
        {
          type: 'text',
          cn_name: '输入材料',
          en_name: 'prompt',
          content: '',
        },
      ],
    },
    ...overrides,
  })
}

describe('InputSection', () => {
  test('labels the active input panel for input page tabs', () => {
    render(<InputSection {...createProps()} />)

    const panel = screen.getByRole('tabpanel')

    expect(panel).toHaveAttribute('id', getInputSectionPanelId('attachment'))
    expect(panel).toHaveAttribute('aria-labelledby', getInputSectionTabId('attachment'))
  })

  test('calls project download file picker when clicking read action', async () => {
    const user = userEvent.setup()
    const props = createProps()

    render(<InputSection {...props} />)

    expect(screen.getByRole('button', { name: '读取' })).toHaveAttribute('type', 'button')
    expect(screen.getByRole('button', { name: '复制文本' })).toHaveAttribute('type', 'button')
    expect(screen.getByRole('button', { name: '清空' })).toHaveAttribute('type', 'button')

    await user.click(screen.getByRole('button', { name: '读取' }))

    expect(screen.queryByTestId('current-param-file-input')).toBeNull()
    expect(props.onReadHistory).toHaveBeenCalledWith('attachment')
    expect(props.onFileUpload).not.toHaveBeenCalled()
  })

  test('shows replace label when multi-file input is already full', () => {
    const fullValue = JSON.stringify(
      Array.from({ length: 5 }, (_item, index) => ({
        url: `https://example.com/uploads/${index + 1}.docx`,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })),
    )

    render(
      <InputSection
        {...createProps({
          inputSections: {
            attachment: fullValue,
          },
        })}
      />,
    )

    expect(screen.getByRole('button', { name: '选择替换文件' })).toBeTruthy()
  })

  test('labels uploaded file remove buttons and keeps them focus visible', () => {
    render(
      <InputSection
        {...createProps({
          inputSections: {
            attachment: JSON.stringify([
              {
                url: 'https://example.com/uploads/example.docx',
                name: 'example.docx',
                mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              },
            ]),
          },
        })}
      />,
    )

    const removeButton = screen.getByRole('button', { name: '移除文件：example.docx' })
    expect(removeButton).toHaveClass('focus-visible:ring-2')
    expect(removeButton).toHaveClass('focus:opacity-100')
  })

  test('preserves formula, table and mermaid source while editing text input', () => {
    const props = createTextProps()

    render(<InputSection {...props} />)

    fireEvent.change(screen.getByRole('textbox', { name: '输入材料内容' }), {
      target: { value: SPECIAL_MARKDOWN_INPUT },
    })

    expect(props.onInputChange).toHaveBeenLastCalledWith('prompt', SPECIAL_MARKDOWN_INPUT)
  })

  test('keeps markdown editable by default and previews input material only after clicking preview', async () => {
    const user = userEvent.setup()

    render(
      <InputSection
        {...createTextProps({
          inputSections: {
            prompt: SPECIAL_MARKDOWN_INPUT,
          },
        })}
      />,
    )

    expect(screen.queryByRole('button', { name: '预览' })).toBeNull()
    expect(screen.queryByRole('button', { name: '编辑' })).toBeNull()

    fireEvent.blur(screen.getByRole('textbox', { name: '输入材料内容' }))
    expect(screen.queryByTestId('mock-input-preview')).toBeNull()
    expect(screen.getByRole('textbox', { name: '输入材料内容' })).toHaveValue(
      SPECIAL_MARKDOWN_INPUT,
    )

    await user.click(screen.getByRole('button', { name: '预览效果' }))

    const preview = await screen.findByTestId('mock-input-preview')
    expect(preview).toHaveAttribute('data-render-mode', 'rich')
    expect(preview.textContent).toBe(SPECIAL_MARKDOWN_INPUT)

    await user.click(screen.getByRole('button', { name: '编辑 Markdown' }))
    expect(screen.getByRole('textbox', { name: '输入材料内容' })).toHaveValue(
      SPECIAL_MARKDOWN_INPUT,
    )
  })

  test('returns to markdown editing after previewed input is cleared and refilled', async () => {
    const user = userEvent.setup()
    const { rerender } = render(
      <InputSection
        {...createTextProps({
          inputSections: {
            prompt: SPECIAL_MARKDOWN_INPUT,
          },
        })}
      />,
    )

    await user.click(screen.getByRole('button', { name: '预览效果' }))
    expect(await screen.findByTestId('mock-input-preview')).toBeInTheDocument()

    rerender(
      <InputSection
        {...createTextProps({
          inputSections: {
            prompt: '',
          },
        })}
      />,
    )

    expect(screen.getByRole('textbox', { name: '输入材料内容' })).toHaveValue('')

    rerender(
      <InputSection
        {...createTextProps({
          inputSections: {
            prompt: SPECIAL_MARKDOWN_INPUT,
          },
        })}
      />,
    )

    expect(screen.queryByTestId('mock-input-preview')).toBeNull()
    expect(screen.getByRole('textbox', { name: '输入材料内容' })).toHaveValue(
      SPECIAL_MARKDOWN_INPUT,
    )
  })

  test('keeps ordinary text editable instead of auto previewing it', () => {
    render(
      <InputSection
        {...createTextProps({
          inputSections: {
            prompt: '普通文本，不包含公式或图表。',
          },
        })}
      />,
    )

    fireEvent.blur(screen.getByRole('textbox', { name: '输入材料内容' }))

    expect(screen.queryByTestId('mock-input-preview')).toBeNull()
    expect(screen.getByRole('textbox', { name: '输入材料内容' })).toHaveValue(
      '普通文本，不包含公式或图表。',
    )
  })
})
