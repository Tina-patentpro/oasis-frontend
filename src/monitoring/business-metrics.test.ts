import { describe, expect, test } from '@jest/globals'

import { createBusinessMetricCollector } from './business-metrics'

describe('business metrics collector', () => {
  test('records workflow completion latency', () => {
    const collector = createBusinessMetricCollector()
    collector.track('workflow_complete', { latencyMs: 1800 })
    expect(collector.snapshot().workflow_complete.count).toBe(1)
  })

  test('records retry and UI recovery metrics with latest payloads', () => {
    const collector = createBusinessMetricCollector()

    collector.track('api_retry_success', { endpoint: '/api/workflows', attempts: 2 })
    collector.track('ui_recovery_success', { boundary: 'workspace' })
    collector.track('api_retry_success', { endpoint: '/api/projects', attempts: 1 })

    const snapshot = collector.snapshot()
    expect(snapshot.api_retry_success).toEqual({
      count: 2,
      latestPayload: { endpoint: '/api/projects', attempts: 1 },
    })
    expect(snapshot.ui_recovery_success).toEqual({
      count: 1,
      latestPayload: { boundary: 'workspace' },
    })
  })

  test('returns snapshots without exposing mutable collector state', () => {
    const collector = createBusinessMetricCollector()
    collector.track('workflow_complete', { latencyMs: 1800 })

    const snapshot = collector.snapshot()
    snapshot.workflow_complete.count = 99
    snapshot.workflow_complete.latestPayload = { latencyMs: 1 }

    expect(collector.snapshot().workflow_complete).toEqual({
      count: 1,
      latestPayload: { latencyMs: 1800 },
    })
  })
})
