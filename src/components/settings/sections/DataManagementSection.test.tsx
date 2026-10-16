import { render, screen } from '@testing-library/react'
import { describe, expect, jest, test } from '@jest/globals'

import { DataManagementSection } from './DataManagementSection'

describe('DataManagementSection', () => {
  test('announces export progress as a status update', () => {
    render(
      <DataManagementSection
        onExportDataClick={jest.fn()}
        onExportWorkflowClick={jest.fn()}
        onDeleteAllDataClick={jest.fn()}
        isExportingAllData
        exportAllDataProgressText="正在打包数据，请稍候"
      />,
    )

    expect(screen.getByRole('status')).toHaveTextContent('正在打包数据，请稍候')
    expect(screen.getByRole('button', { name: /导出中/ })).toBeDisabled()
  })

  test('describes the irreversible delete-all action to assistive technology', () => {
    render(
      <DataManagementSection
        onExportDataClick={jest.fn()}
        onExportWorkflowClick={jest.fn()}
        onDeleteAllDataClick={jest.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: '删除所有数据' })).toHaveAccessibleDescription(
      /永久删除您的所有数据/,
    )
  })
})
