import { beforeEach, describe, expect, jest, test } from '@jest/globals'

jest.mock('../client', () => ({
  apiClient: {
    post: jest.fn(),
  },
}))

import { apiClient } from '../client'
import { workflowsService } from './workflows.service'

const mockPost = apiClient.post as jest.MockedFunction<typeof apiClient.post>

describe('workflowsService current workflow write endpoints', () => {
  beforeEach(() => {
    mockPost.mockReset()
  })

  test('executeWorkflow calls current workflow execution endpoint', async () => {
    mockPost.mockResolvedValue({ success: true, data: { executionId: 'execution-1' } })

    const payload = {
      inputs: {
        caseTitle: '协作机器人阻尼结构改进',
        problemStatement: '生成独立与从属权利要求',
      },
      attachments: [
        {
          field: 'techReport',
          fileId: 'file-123',
          fileName: 'report.pdf',
          mimeType: 'application/pdf',
        },
      ],
      projectId: 'project-1',
      presetId: 'preset-1',
      metadata: {
        triggeredFrom: 'workspace',
      },
    }

    await workflowsService.executeWorkflow('workflow-1', payload)

    expect(mockPost).toHaveBeenCalledWith('/api/workflows/workflow-1/execute', payload, undefined, {
      signal: undefined,
    })
  })

  test('createWorkflowChain calls current workflow chain creation endpoint', async () => {
    mockPost.mockResolvedValue({ success: true, data: { id: 'chain-1' } })

    const payload = {
      name: '专利撰写链',
      description: '权利要求生成后自动进入说明书写作',
      visibility: 'team' as const,
      steps: [
        { workflowId: 'wf-patent-draft' },
        {
          workflowId: 'wf-specification',
          mapping: [
            {
              targetField: 'draftInput',
              source: 'prev.outputs.dependentClaims',
              transform: 'trim',
            },
          ],
        },
      ],
    }

    await workflowsService.createWorkflowChain(payload)

    expect(mockPost).toHaveBeenCalledWith('/api/workflow-chains', payload, undefined, {
      signal: undefined,
    })
  })
})
