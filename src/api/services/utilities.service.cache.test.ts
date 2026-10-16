import { beforeEach, describe, expect, jest, test } from '@jest/globals'

jest.mock('../client', () => ({
  apiClient: {
    post: jest.fn(),
  },
}))

import { apiClient } from '../client'
import { utilitiesService } from './utilities.service'

const mockPost = apiClient.post as jest.MockedFunction<typeof apiClient.post>

describe('utilitiesService current cache endpoint', () => {
  beforeEach(() => {
    mockPost.mockReset()
  })

  test('clearUserCache calls current cache clear endpoint without request body', async () => {
    mockPost.mockResolvedValue(undefined)

    await utilitiesService.clearUserCache()

    expect(mockPost).toHaveBeenCalledWith('/api/utilities/cache/clear', undefined, undefined, {
      signal: undefined,
    })
  })
})
