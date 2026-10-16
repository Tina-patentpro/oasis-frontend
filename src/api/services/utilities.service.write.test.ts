import { beforeEach, describe, expect, jest, test } from '@jest/globals'

jest.mock('../client', () => ({
  apiClient: {
    patch: jest.fn(),
    put: jest.fn(),
  },
}))

import { apiClient } from '../client'
import { utilitiesService } from './utilities.service'

const mockPatch = apiClient.patch as jest.MockedFunction<typeof apiClient.patch>
const mockPut = apiClient.put as jest.MockedFunction<typeof apiClient.put>

describe('utilitiesService current utilities write endpoints', () => {
  beforeEach(() => {
    mockPatch.mockReset()
    mockPut.mockReset()
  })

  test('updateLayoutPreference calls current layout preference endpoint', async () => {
    mockPut.mockResolvedValue({ success: true })

    const payload = {
      sidebarCollapsed: true,
      density: 'compact' as const,
      panels: [{ id: 'right-panel', position: 'right', size: 320 }],
    }

    await utilitiesService.updateLayoutPreference(payload)

    expect(mockPut).toHaveBeenCalledWith('/api/utilities/preferences/layout', payload, undefined, {
      signal: undefined,
    })
  })

  test('updateVisibilityPreference calls current visibility preference endpoint', async () => {
    mockPatch.mockResolvedValue({ success: true })

    const payload = {
      modules: [{ id: 'workflow-history', visible: true, owner: 'user' }],
    }

    await utilitiesService.updateVisibilityPreference(payload)

    expect(mockPatch).toHaveBeenCalledWith(
      '/api/utilities/preferences/visibility',
      payload,
      undefined,
      { signal: undefined },
    )
  })

  test('updateTheme calls current theme endpoint', async () => {
    mockPut.mockResolvedValue({ success: true })

    await utilitiesService.updateTheme({ theme: 'dark' })

    expect(mockPut).toHaveBeenCalledWith('/api/utilities/theme', { theme: 'dark' }, undefined, {
      signal: undefined,
    })
  })

  test('updateTooltipSettings calls current tooltip settings endpoint', async () => {
    mockPatch.mockResolvedValue({ success: true })

    const payload = {
      enabled: false,
      dismissedIds: ['welcome-tip'],
      locale: 'zh-CN',
    }

    await utilitiesService.updateTooltipSettings(payload)

    expect(mockPatch).toHaveBeenCalledWith('/api/utilities/tooltips', payload, undefined, {
      signal: undefined,
    })
  })
})
