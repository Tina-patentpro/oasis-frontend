import React from 'react'
import { describe, expect, jest, test } from '@jest/globals'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { OutputSection } from './OutputSection'

const mockContentRendererCalls: string[] = []

jest.mock('@/styles/outputSectionHeader.css', () => ({}))

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

jest.mock('../../hooks/useClickOutside', () => ({
  useClickOutside: jest.fn(),
}))

jest.mock('../ContentRenderer', () => ({
  ContentRenderer: ({ content }: { content: string }) => {
    mockContentRendererCalls.push(content)
    return <div>{content}</div>
  },
}))

jest.mock('../ui', () => ({
  ActionBtn: ({
    children,
    disabled,
    onClick,
    ariaLabel,
    className,
    tooltip,
  }: {
    children: React.ReactNode
    disabled?: boolean
    onClick: () => void
    ariaLabel?: string
    className?: string
    tooltip?: string
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={className}
      data-tooltip={tooltip}
    >
      {children}
    </button>
  ),
  LoadingSpinner: () => <div data-testid="loading-spinner" />,
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

const createProps = (overrides: Record<string, unknown> = {}) => ({
  generated: '',
  isGenerating: false,
  generationStatus: 'idle' as const,
  renderMode: 'rich' as const,
  appliedLayout: 'horizontal' as const,
  canGenerate: true,
  generateDisabled: false,
  isAsyncWorkflow: false,
  themeColor: '#10b981',
  downloadableCount: 0,
  onGenerate: jest.fn(),
  onCopy: jest.fn(),
  onDownload: jest.fn(),
  onNextStep: jest.fn(),
  onRenderModeChange: jest.fn(),
  performanceMetrics: {
    token: null as string | null,
    responseMs: null as number | null,
    interfaceMs: null as number | null,
    firstFrameMs: null as number | null,
    renderMs: null as number | null,
    setGeneratedAtMs: null as number | null,
  },
  onFirstFrameMeasured: jest.fn(),
  onRenderMeasured: jest.fn(),
  ...overrides,
})

describe('OutputSection', () => {
  test('keeps the default empty state when idle and nothing has been generated', () => {
    render(<OutputSection {...(createProps() as React.ComponentProps<typeof OutputSection>)} />)

    expect(screen.getByText(/暂无生成内容/)).toBeTruthy()
  })

  test('skips content renderer rerender when parent rerenders with the same props', async () => {
    mockContentRendererCalls.length = 0
    const props = createProps({ generated: '这是生成内容' }) as React.ComponentProps<
      typeof OutputSection
    >
    const Parent = () => {
      const [rerenderCount, setRerenderCount] = React.useState(0)
      return (
        <>
          <button type="button" onClick={() => setRerenderCount((count) => count + 1)}>
            父组件重渲染 {rerenderCount}
          </button>
          <OutputSection {...props} />
        </>
      )
    }

    render(<Parent />)

    expect(await screen.findByText('这是生成内容')).toBeTruthy()
    await waitFor(() => expect(mockContentRendererCalls.length).toBeGreaterThan(0))
    await new Promise((resolve) => setTimeout(resolve, 0))
    const initialRenderCount = mockContentRendererCalls.length

    fireEvent.click(screen.getByRole('button', { name: /父组件重渲染/ }))

    expect(mockContentRendererCalls.length).toBe(initialRenderCount)
  })

  test('disables download button when there is generated text but no downloadable files', () => {
    render(
      <OutputSection
        {...(createProps({
          generated: '这是生成内容',
          downloadableCount: 0,
        }) as React.ComponentProps<typeof OutputSection>)}
      />,
    )

    expect((screen.getByRole('button', { name: '下载文件' }) as HTMLButtonElement).disabled).toBe(
      true,
    )
  })

  test('uses menu semantics for render mode picker and keeps option buttons non-submit', () => {
    render(
      <OutputSection
        {...(createProps({
          generated: '这是生成内容',
        }) as React.ComponentProps<typeof OutputSection>)}
      />,
    )

    const trigger = screen.getByRole('button', { name: '富文本' })

    expect(trigger).toHaveAttribute('type', 'button')
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).not.toHaveAttribute('aria-controls')

    fireEvent.click(trigger)

    const menu = screen.getByRole('menu', { name: '选择生成结果呈现方式' })
    const richOption = screen.getByRole('menuitemradio', { name: '富文本' })
    const sourceOption = screen.getByRole('menuitemradio', { name: '源码' })

    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(trigger).toHaveAttribute('aria-controls', menu.id)
    expect(richOption).toHaveAttribute('type', 'button')
    expect(richOption).toHaveAttribute('aria-checked', 'true')
    expect(sourceOption).toHaveAttribute('type', 'button')
    expect(sourceOption).toHaveAttribute('aria-checked', 'false')
    expect(richOption).toHaveFocus()

    fireEvent.keyDown(menu, { key: 'ArrowDown' })
    expect(sourceOption).toHaveFocus()

    fireEvent.keyDown(menu, { key: 'Home' })
    expect(richOption).toHaveFocus()

    fireEvent.keyDown(menu, { key: 'End' })
    expect(sourceOption).toHaveFocus()

    fireEvent.keyDown(menu, { key: 'Escape' })
    expect(screen.queryByRole('menu', { name: '选择生成结果呈现方式' })).toBeNull()
    expect(trigger).toHaveFocus()
  })

  test('enables download button when downloadable files exist', () => {
    render(
      <OutputSection
        {...(createProps({
          generated: '这是生成内容',
          downloadableCount: 2,
        }) as React.ComponentProps<typeof OutputSection>)}
      />,
    )

    expect((screen.getByRole('button', { name: '下载文件' }) as HTMLButtonElement).disabled).toBe(
      false,
    )
    expect(screen.getByText('下载 (2)')).toBeTruthy()
  })

  test('shows async guidance markdown while an async workflow is waiting in queue', () => {
    render(
      <OutputSection
        {...(createProps({
          generated:
            '## 异步任务执行指引\n\n1. 你可以继续填写其他参数或切换到其他工具，无需停留在当前页面等待。',
          generationStatus: 'queued',
          isAsyncWorkflow: true,
        }) as React.ComponentProps<typeof OutputSection>)}
      />,
    )

    expect(screen.getByText(/异步任务执行指引/)).toBeTruthy()
    expect(screen.getByText(/无需停留在当前页面等待/)).toBeTruthy()
    expect(screen.queryByText('任务已提交，正在排队')).toBeNull()
  })

  test('shows async guidance markdown while an async workflow is generating', () => {
    render(
      <OutputSection
        {...(createProps({
          generated:
            '## 异步任务执行指引\n\n1. 任务完成后会在通知中心提示，并自动刷新对应会话列表。',
          generationStatus: 'running',
          isAsyncWorkflow: true,
        }) as React.ComponentProps<typeof OutputSection>)}
      />,
    )

    expect(screen.getByText(/异步任务执行指引/)).toBeTruthy()
    expect(screen.getByText(/通知中心提示/)).toBeTruthy()
    expect(screen.queryByText('生成中，请稍候')).toBeNull()
  })

  test('shows sync waiting guidance while a sync workflow is generating', () => {
    render(
      <OutputSection
        {...(createProps({
          isGenerating: true,
          generationStatus: 'running',
          isAsyncWorkflow: false,
        }) as React.ComponentProps<typeof OutputSection>)}
      />,
    )

    expect(screen.getByText('正在生成，请耐心等待')).toBeTruthy()
    expect(screen.getByText('当前为同步工作流，请等待本次生成结束后再开启新会话')).toBeTruthy()
  })

  test('uses sync-specific generate tooltip when generation is disabled for a sync workflow', () => {
    render(
      <OutputSection
        {...(createProps({
          isGenerating: true,
          generationStatus: 'running',
          generateDisabled: true,
          isAsyncWorkflow: false,
        }) as React.ComponentProps<typeof OutputSection>)}
      />,
    )

    expect(screen.getByRole('button', { name: '生成内容' }).getAttribute('data-tooltip')).toBe(
      '当前会话正在生成中，请等待完成后再开启新会话',
    )
  })
})
