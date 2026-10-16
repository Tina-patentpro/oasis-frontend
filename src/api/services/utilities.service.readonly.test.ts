import { beforeEach, describe, expect, jest, test } from '@jest/globals'

jest.mock('../client', () => ({
  apiClient: {
    get: jest.fn(),
  },
}))

import { apiClient } from '../client'
import { utilitiesService } from './utilities.service'

const mockGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>

describe('utilitiesService read-only utilities endpoints', () => {
  beforeEach(() => {
    mockGet.mockReset()
  })

  test('getDataExportStatus calls export status endpoint', async () => {
    mockGet.mockResolvedValue({ success: true, data: { taskId: 'task-1' } })

    await utilitiesService.getDataExportStatus('task-1')

    expect(mockGet).toHaveBeenCalledWith(
      '/api/utilities/export/data/task-1',
      undefined,
      undefined,
      {
        signal: undefined,
      },
    )
  })

  test('getReleaseNotes calls release notes endpoint with version filters', async () => {
    mockGet.mockResolvedValue({ success: true, data: [] })

    await utilitiesService.getReleaseNotes({
      from: '1.0.0',
      to: '1.0.4',
    })

    expect(mockGet).toHaveBeenCalledWith(
      '/api/utilities/release-notes',
      {
        from: '1.0.0',
        to: '1.0.4',
      },
      undefined,
      { signal: undefined },
    )
  })

  test('listHelpArticles calls help articles endpoint with filters', async () => {
    mockGet.mockResolvedValue({ success: true, data: [] })

    await utilitiesService.listHelpArticles({
      category: 'getting-started',
      locale: 'zh-CN',
    })

    expect(mockGet).toHaveBeenCalledWith(
      '/api/utilities/help-articles',
      {
        category: 'getting-started',
        locale: 'zh-CN',
      },
      undefined,
      { signal: undefined },
    )
  })

  test('getLayoutPreference calls layout preference endpoint', async () => {
    mockGet.mockResolvedValue({ success: true, data: { density: 'comfortable' } })

    await utilitiesService.getLayoutPreference()

    expect(mockGet).toHaveBeenCalledWith(
      '/api/utilities/preferences/layout',
      undefined,
      undefined,
      { signal: undefined },
    )
  })

  test('getVisibilityPreference calls visibility preference endpoint', async () => {
    mockGet.mockResolvedValue({ success: true, data: { modules: [] } })

    await utilitiesService.getVisibilityPreference()

    expect(mockGet).toHaveBeenCalledWith(
      '/api/utilities/preferences/visibility',
      undefined,
      undefined,
      { signal: undefined },
    )
  })

  test('getTooltipSettings calls tooltip settings endpoint', async () => {
    mockGet.mockResolvedValue({ success: true, data: { enabled: true } })

    await utilitiesService.getTooltipSettings()

    expect(mockGet).toHaveBeenCalledWith('/api/utilities/tooltips', undefined, undefined, {
      signal: undefined,
    })
  })
})
