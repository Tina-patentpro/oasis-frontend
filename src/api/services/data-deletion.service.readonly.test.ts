import { beforeEach, describe, expect, jest, test } from '@jest/globals'

jest.mock('../client', () => ({
  apiClient: {
    get: jest.fn(),
  },
}))

import { apiClient } from '../client'
import { dataDeletionService } from './data-deletion.service'

const mockGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>

describe('dataDeletionService read-only data deletion endpoints', () => {
  beforeEach(() => {
    mockGet.mockReset()
  })

  test('listDeletionRequests calls deletion requests endpoint with filters', async () => {
    mockGet.mockResolvedValue({ success: true, data: { items: [] } })

    await dataDeletionService.listDeletionRequests({
      requesterId: 'user-1',
      targetId: 'target-1',
      type: 'data',
      status: 'pending',
      page: 1,
      pageSize: 20,
    })

    expect(mockGet).toHaveBeenCalledWith(
      '/api/data-deletion/requests',
      {
        requesterId: 'user-1',
        targetId: 'target-1',
        type: 'data',
        status: 'pending',
        page: 1,
        pageSize: 20,
      },
      undefined,
      { signal: undefined },
    )
  })

  test('getDeletionRequestDetail calls deletion request detail endpoint', async () => {
    mockGet.mockResolvedValue({ success: true, data: { id: 'request-1' } })

    await dataDeletionService.getDeletionRequestDetail('request-1')

    expect(mockGet).toHaveBeenCalledWith(
      '/api/data-deletion/requests/request-1',
      undefined,
      undefined,
      { signal: undefined },
    )
  })

  test('getDeletionProof calls deletion proof endpoint', async () => {
    mockGet.mockResolvedValue({ success: true, data: { proofId: 'proof-1' } })

    await dataDeletionService.getDeletionProof('request-1')

    expect(mockGet).toHaveBeenCalledWith(
      '/api/data-deletion/requests/request-1/proof',
      undefined,
      undefined,
      { signal: undefined },
    )
  })

  test('listDeletionPolicies calls deletion policies endpoint with pagination', async () => {
    mockGet.mockResolvedValue({ success: true, data: { items: [] } })

    await dataDeletionService.listDeletionPolicies({
      page: 1,
      pageSize: 20,
    })

    expect(mockGet).toHaveBeenCalledWith(
      '/api/data-deletion/policies',
      {
        page: 1,
        pageSize: 20,
      },
      undefined,
      { signal: undefined },
    )
  })

  test('getDeletionAuditLogs calls deletion audit endpoint with pagination', async () => {
    mockGet.mockResolvedValue({ success: true, data: { items: [] } })

    await dataDeletionService.getDeletionAuditLogs({
      page: 1,
      pageSize: 20,
    })

    expect(mockGet).toHaveBeenCalledWith(
      '/api/data-deletion/audit',
      {
        page: 1,
        pageSize: 20,
      },
      undefined,
      { signal: undefined },
    )
  })
})
