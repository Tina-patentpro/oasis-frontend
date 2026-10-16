import React from 'react'
import { describe, expect, jest, test } from '@jest/globals'
import { fireEvent, render, screen } from '@testing-library/react'

import type { InputSectionHeaderProps } from './types'
import { getInputSectionPanelId, getInputSectionTabId } from './a11y'
import { InputSectionHeader } from './InputSectionHeader'

jest.mock('../../ui', () => ({
  Tooltip: ({
    children,
    content,
    inlineChild,
    className,
  }: {
    children: React.ReactNode
    content: React.ReactNode
    inlineChild?: boolean
    className?: string
  }) => (
    <div
      data-testid="tooltip-wrapper"
      data-tooltip={typeof content === 'string' ? content : ''}
      data-inline-child={inlineChild ? 'true' : 'false'}
      className={className}
    >
      {children}
    </div>
  ),
}))

const createProps = (overrides: Record<string, unknown> = {}): InputSectionHeaderProps => ({
  currentApiField: null,
  selectedProjectId: null as number | null,
  projects: [] as unknown[] as InputSectionHeaderProps['projects'],
  onProjectChange: jest.fn(),
  onQuickCreateProject: jest.fn(),
  onStartNewSession: jest.fn(),
  startNewSessionDisabled: false,
  startNewSessionTooltip: '在不切换当前工具的前提下，开始一个新会话并清空输入与输出',
  layoutMode: 'auto',
  onLayoutModeChange: jest.fn(),
  contentPages: [{ key: 'userInstruction', label: '用户指令' }],
  inputPage: 'userInstruction',
  inputSections: {},
  onInputPageChange: jest.fn(),
  baseActionStyle: {},
  ...overrides,
})

describe('InputSectionHeader', () => {
  test('keeps the split-pane toolbar labels horizontal and opts compact buttons out of stretching', () => {
    render(
      <InputSectionHeader
        {...(createProps({
          currentApiField: { cn_name: '技术方案' },
          selectedProjectId: 1,
          projects: [{ id: 1, name: '较长的项目名称用于分栏排版回归' }],
        }) as React.ComponentProps<typeof InputSectionHeader>)}
      />,
    )

    const title = screen.getByText('输入材料 - 技术方案')
    const projectSelect = screen.getByRole('combobox', { name: '选择关联项目' })
    const quickCreateButton = screen.getByRole('button', { name: '新建项目' })
    const newSessionButton = screen.getByRole('button', { name: '新会话' })
    const layoutSelect = screen.getByRole('combobox', { name: '选择布局模式' })

    expect(title).toHaveClass('input-section-header__title')
    expect(title.parentElement).toHaveClass('input-section-header')
    expect(projectSelect).toHaveClass('w-full', 'min-w-0')
    expect(projectSelect.closest('[data-tooltip]')).toHaveClass('input-section-header__project')
    expect(quickCreateButton.closest('[data-tooltip]')).toHaveAttribute('data-inline-child', 'true')
    expect(newSessionButton.closest('[data-tooltip]')).toHaveAttribute('data-inline-child', 'true')
    expect(newSessionButton).toHaveClass('shrink-0', 'whitespace-nowrap')
    expect(layoutSelect.closest('[data-tooltip]')).toHaveClass('input-section-header__layout')
  })

  test('uses the input pane as the responsive layout container', () => {
    render(
      <InputSectionHeader
        {...(createProps() as React.ComponentProps<typeof InputSectionHeader>)}
      />,
    )

    const title = screen.getByText('输入材料')
    const layoutSelect = screen.getByRole('combobox', { name: '选择布局模式' })
    const projectSelect = screen.getByRole('combobox', { name: '选择关联项目' })
    const header = title.parentElement
    const actions = projectSelect.closest('[data-tooltip]')?.parentElement

    expect(header).toHaveClass('input-section-header')
    expect(header?.parentElement).toHaveClass('input-section-header-container')
    expect(actions).toHaveClass('input-section-header__actions')
    expect(layoutSelect).toHaveClass('max-w-full')
  })

  test('renders all input pages directly without collapsing them', () => {
    render(
      <InputSectionHeader
        {...(createProps({
          contentPages: [
            { key: 'required', label: '必填参数' },
            { key: 'optional', label: '可选参数' },
          ],
          inputPage: 'required',
          inputSections: { required: '', optional: '' },
        }) as React.ComponentProps<typeof InputSectionHeader>)}
      />,
    )

    expect(screen.queryByText('展开高级项 (1)')).toBeNull()
    expect(screen.queryByText('收起高级项')).toBeNull()
    expect(screen.getByRole('tab', { name: /必填参数输入页面/ })).toBeTruthy()
    expect(screen.getByRole('tab', { name: /可选参数输入页面/ })).toBeTruthy()
  })

  test('links input tabs to panels and supports keyboard navigation', () => {
    const onInputPageChange = jest.fn()
    render(
      <InputSectionHeader
        {...(createProps({
          contentPages: [
            { key: 'required', label: '必填参数' },
            { key: 'optional', label: '可选参数' },
            { key: 'notes', label: '补充说明' },
          ],
          inputPage: 'required',
          inputSections: { required: '', optional: '已有内容', notes: '' },
          onInputPageChange,
        }) as React.ComponentProps<typeof InputSectionHeader>)}
      />,
    )

    const requiredTab = screen.getByRole('tab', { name: /必填参数输入页面/ })
    const optionalTab = screen.getByRole('tab', { name: /可选参数输入页面/ })
    const notesTab = screen.getByRole('tab', { name: /补充说明输入页面/ })

    expect(requiredTab).toHaveAttribute('type', 'button')
    expect(requiredTab).toHaveAttribute('id', getInputSectionTabId('required'))
    expect(requiredTab).toHaveAttribute('aria-controls', getInputSectionPanelId('required'))
    expect(requiredTab).toHaveAttribute('tabindex', '0')
    expect(optionalTab).toHaveAttribute('tabindex', '-1')

    fireEvent.keyDown(requiredTab, { key: 'ArrowRight' })
    expect(onInputPageChange).toHaveBeenLastCalledWith('optional')
    expect(optionalTab).toHaveFocus()

    fireEvent.keyDown(optionalTab, { key: 'End' })
    expect(onInputPageChange).toHaveBeenLastCalledWith('notes')
    expect(notesTab).toHaveFocus()

    fireEvent.keyDown(notesTab, { key: 'Home' })
    expect(onInputPageChange).toHaveBeenLastCalledWith('required')
    expect(requiredTab).toHaveFocus()
  })

  test('keeps header action buttons from submitting surrounding forms', () => {
    render(
      <InputSectionHeader
        {...(createProps({
          contentPages: [],
          tabsLoadError: '标签页加载失败',
          onRetryLoadTabs: jest.fn(),
        }) as React.ComponentProps<typeof InputSectionHeader>)}
      />,
    )

    expect(screen.getByRole('button', { name: '新建项目' })).toHaveAttribute('type', 'button')
    expect(screen.getByRole('button', { name: '新会话' })).toHaveAttribute('type', 'button')
    expect(screen.getByRole('button', { name: '重试加载标签页' })).toHaveAttribute('type', 'button')
  })

  test('disables the new-session button and shows sync waiting guidance when requested', () => {
    render(
      <InputSectionHeader
        {...(createProps({
          startNewSessionDisabled: true,
          startNewSessionTooltip: '同步工作流正在生成中，请等待结束后再开启新会话',
        }) as React.ComponentProps<typeof InputSectionHeader>)}
      />,
    )

    const newSessionButton = screen.getByRole('button', { name: '新会话' }) as HTMLButtonElement
    expect(newSessionButton.disabled).toBe(true)
    expect(newSessionButton.parentElement?.getAttribute('data-tooltip')).toBe(
      '同步工作流正在生成中，请等待结束后再开启新会话',
    )
  })

  test('calls onStartNewSession when clicking the new-session button', () => {
    const onStartNewSession = jest.fn()

    render(
      <InputSectionHeader
        {...(createProps({
          onStartNewSession,
        }) as React.ComponentProps<typeof InputSectionHeader>)}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '新会话' }))
    expect(onStartNewSession).toHaveBeenCalledTimes(1)
  })

  test('keeps the new-session button enabled when async workflows allow parallel work', () => {
    render(
      <InputSectionHeader
        {...(createProps({
          startNewSessionDisabled: false,
          startNewSessionTooltip: '在不切换当前工具的前提下，开始一个新会话并清空输入与输出',
        }) as React.ComponentProps<typeof InputSectionHeader>)}
      />,
    )

    const newSessionButton = screen.getByRole('button', { name: '新会话' }) as HTMLButtonElement
    expect(newSessionButton.disabled).toBe(false)
  })

  test('keeps the placeholder hidden from the project options list', () => {
    render(
      <InputSectionHeader
        {...(createProps({
          projects: [
            { id: 1, name: '网站测试1' },
            { id: 2, name: '网站测试3' },
          ],
        }) as React.ComponentProps<typeof InputSectionHeader>)}
      />,
    )

    const projectSelect = screen.getByRole('combobox', { name: '选择关联项目' })
    const placeholder = projectSelect.querySelector('option[value=""]') as HTMLOptionElement | null

    expect(placeholder).not.toBeNull()
    expect(placeholder?.hidden).toBe(true)
    expect(placeholder?.disabled).toBe(true)
    expect(placeholder?.textContent).toBe('🔗 关联项目')
    expect(screen.queryByRole('option', { name: '🔗 关联项目' })).toBeNull()
    expect(screen.getByRole('option', { name: '网站测试1' })).toBeTruthy()
    expect(screen.getByRole('option', { name: '网站测试3' })).toBeTruthy()
  })

  test('shows all projects and allows clearing the association after a project is selected', () => {
    const onProjectChange = jest.fn()

    render(
      <InputSectionHeader
        {...(createProps({
          selectedProjectId: 1,
          onProjectChange,
          projects: [
            { id: 1, name: '网站测试1' },
            { id: 2, name: '网站测试3' },
          ],
        }) as React.ComponentProps<typeof InputSectionHeader>)}
      />,
    )

    const projectSelect = screen.getByRole('combobox', {
      name: '选择关联项目',
    }) as HTMLSelectElement

    expect(screen.getByRole('option', { name: '取消关联项目' })).toBeTruthy()
    expect(screen.getByRole('option', { name: '网站测试1' })).toBeTruthy()
    expect(screen.getByRole('option', { name: '网站测试3' })).toBeTruthy()

    fireEvent.change(projectSelect, { target: { value: '' } })
    expect(onProjectChange).toHaveBeenCalledWith(null)

    fireEvent.change(projectSelect, { target: { value: '2' } })
    expect(onProjectChange).toHaveBeenCalledWith(2)
  })
})
