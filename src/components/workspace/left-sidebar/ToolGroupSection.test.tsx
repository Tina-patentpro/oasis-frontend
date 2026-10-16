import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, jest, test } from '@jest/globals'

import { ToolGroupSection } from './ToolGroupSection'

jest.mock('@/stores', () => ({
  useAsyncToolStore: (selector: (state: any) => unknown) =>
    selector({
      asyncEndpointMap: {
        '/api/slow': true,
      },
    }),
  useThemeStore: (selector: (state: any) => unknown) =>
    selector({
      currentTheme: {
        primary: '#10b981',
        primaryHover: '#059669',
      },
    }),
}))

jest.mock('../../ui', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

function renderToolGroupSection(options?: { showVersionInfo?: boolean }) {
  return render(
    <ToolGroupSection
      tab="workspace"
      tabs={[{ k: 'workspace', t: '工作区', tools: ['工具A'] } as any]}
      tool={{ name: '工具A', ver: 'v2' } as any}
      currentTab={{ k: 'workspace', t: '工作区', tools: ['工具A'] } as any}
      showVersionInfo={options?.showVersionInfo ?? false}
      modelVersions={[
        { id: 'v1', name: '模型 A', apiEndpoint: '/api/fast' },
        { id: 'v2', name: '模型 B', apiEndpoint: '/api/slow' },
        { id: 'v3', name: '模型 C', apiEndpoint: '/api/fast' },
      ]}
      selectedVersionValue="v2"
      activeToolMetadata={undefined}
      toolMetadataByName={{}}
      makePillStyle={() => ({})}
      onTabChange={jest.fn()}
      onToolChange={jest.fn()}
      onToolVersionChange={jest.fn()}
      onVersionInfoToggle={jest.fn()}
    />,
  )
}

describe('ToolGroupSection model selector', () => {
  afterEach(() => {
    jest.useRealTimers()
  })

  test('supports listbox keyboard navigation and returns focus after Escape', () => {
    jest.useFakeTimers()
    renderToolGroupSection()

    const trigger = screen.getByRole('button', { name: /模型 B/ })

    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    act(() => {
      jest.runOnlyPendingTimers()
    })

    const listbox = screen.getByRole('listbox', { name: '选择模型版本' })
    const optionA = screen.getByRole('option', { name: /模型 A/ })
    const optionB = screen.getByRole('option', { name: /模型 B/ })
    const optionC = screen.getByRole('option', { name: /模型 C/ })

    expect(trigger).toHaveAttribute('aria-controls', listbox.id)
    expect(optionB).toHaveFocus()

    fireEvent.keyDown(listbox, { key: 'ArrowDown' })
    expect(optionC).toHaveFocus()

    fireEvent.keyDown(listbox, { key: 'Home' })
    expect(optionA).toHaveFocus()

    fireEvent.keyDown(listbox, { key: 'End' })
    expect(optionC).toHaveFocus()

    fireEvent.keyDown(listbox, { key: 'Escape' })

    expect(screen.queryByRole('listbox', { name: '选择模型版本' })).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  test('links the model info disclosure button to the rendered panel', () => {
    renderToolGroupSection({ showVersionInfo: true })

    const trigger = screen.getByRole('button', { name: '模型说明' })
    const panelId = trigger.getAttribute('aria-controls')

    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(panelId).toBeTruthy()
    expect(document.getElementById(panelId as string)).not.toBeNull()
  })
})
