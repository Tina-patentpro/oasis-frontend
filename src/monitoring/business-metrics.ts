export type MetricName = 'workflow_complete' | 'api_retry_success' | 'ui_recovery_success'

interface MetricBucket {
  count: number
  latestPayload?: Record<string, unknown>
}

interface BusinessMetricCollector {
  track: (name: MetricName, payload: Record<string, unknown>) => void
  snapshot: () => Record<MetricName, MetricBucket>
}

export function createBusinessMetricCollector(): BusinessMetricCollector {
  const data: Record<MetricName, MetricBucket> = {
    workflow_complete: { count: 0 },
    api_retry_success: { count: 0 },
    ui_recovery_success: { count: 0 },
  }

  return {
    track(name: MetricName, payload: Record<string, unknown>) {
      data[name].count += 1
      data[name].latestPayload = payload
    },
    snapshot() {
      return {
        workflow_complete: { ...data.workflow_complete },
        api_retry_success: { ...data.api_retry_success },
        ui_recovery_success: { ...data.ui_recovery_success },
      }
    },
  }
}

export const businessMetricCollector = createBusinessMetricCollector()
