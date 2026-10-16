import { describe, expect, jest, test } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { GroupPanel, ModelPanel, ToolPanel } from './panels'

describe('model preference panels accessibility', () => {
  test('uses a real button for group row selection and a separate checkbox for visibility', async () => {
    const user = userEvent.setup()
    const onSetActiveGroup = jest.fn()
    const onToggleGroup = jest.fn()

    render(
      <GroupPanel
        availableTabs={[{ k: 'patent', t: '专利工具', tools: ['权利要求书'] }]}
        currentTab={{ k: 'patent', t: '专利工具', tools: ['权利要求书'] }}
        groupVisibility={{ patent: true }}
        enabledGroupCount={1}
        isLoading={false}
        onSetActiveGroup={onSetActiveGroup}
        onToggleGroup={onToggleGroup}
      />,
    )

    await user.click(screen.getByRole('button', { name: /专利工具/ }))
    expect(onSetActiveGroup).toHaveBeenCalledWith('patent')

    await user.click(screen.getByRole('checkbox'))
    expect(onToggleGroup).toHaveBeenCalledWith('patent')
    expect(onSetActiveGroup).toHaveBeenCalledTimes(1)
  })

  test('uses a real button for tool row selection and a separate checkbox for visibility', async () => {
    const user = userEvent.setup()
    const onSetActiveTool = jest.fn()
    const onToggleTool = jest.fn()

    render(
      <ToolPanel
        toolsForCurrentGroup={['权利要求书']}
        enabledToolsCount={1}
        activeTool="权利要求书"
        toolVisibility={{ 权利要求书: true }}
        toolMetadataByName={{
          权利要求书: { name: '权利要求书', description: '生成权利要求书', versions: [] },
        }}
        onSetActiveTool={onSetActiveTool}
        onToggleTool={onToggleTool}
      />,
    )

    await user.click(screen.getByRole('button', { name: '权利要求书' }))
    expect(onSetActiveTool).toHaveBeenCalledWith('权利要求书')

    await user.click(screen.getByRole('checkbox'))
    expect(onToggleTool).toHaveBeenCalledWith('权利要求书')
    expect(onSetActiveTool).toHaveBeenCalledTimes(1)
  })

  test('disables bulk model actions with visible disabled affordance when no models exist', async () => {
    const user = userEvent.setup()
    const onToggleAllModels = jest.fn()

    render(
      <ModelPanel
        modelOptions={[]}
        visibleModels={{}}
        visibleModelCount={0}
        allModelsSelected={true}
        onToggleModel={jest.fn()}
        onToggleAllModels={onToggleAllModels}
      />,
    )

    const selectAll = screen.getByRole('button', { name: '全选' })
    const hideAll = screen.getByRole('button', { name: '全部隐藏' })

    expect(selectAll).toBeDisabled()
    expect(hideAll).toBeDisabled()
    expect(selectAll).toHaveClass('disabled:cursor-not-allowed')
    expect(hideAll).toHaveClass('disabled:opacity-50')

    await user.click(selectAll)
    await user.click(hideAll)

    expect(onToggleAllModels).not.toHaveBeenCalled()
  })
})
