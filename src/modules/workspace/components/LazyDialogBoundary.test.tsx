import { describe, expect, jest, test } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { type ReactElement } from 'react'

import { LazyDialogBoundary } from './LazyDialogBoundary'

function BrokenDialog(): ReactElement {
  throw new Error('Failed to fetch dynamically imported module')
}

describe('LazyDialogBoundary', () => {
  test('shows a local reload fallback when a lazy dialog fails to load', async () => {
    const reload = jest.fn()

    render(
      <LazyDialogBoundary dialogName="设置面板" chunkName="SettingsPanel" onReload={reload}>
        <BrokenDialog />
      </LazyDialogBoundary>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('设置面板暂时无法打开')

    await userEvent.click(screen.getByRole('button', { name: '刷新页面' }))

    expect(reload).toHaveBeenCalledTimes(1)
  })
})
