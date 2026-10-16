import type { Metric } from 'web-vitals'

type SentryMetricClient = {
  captureMessage: (
    message: string,
    options: {
      level: 'info'
      tags: Record<string, string>
      extra: Record<string, unknown>
    },
  ) => void
}

export type WebVitalsModule = Pick<
  typeof import('web-vitals'),
  'onCLS' | 'onFID' | 'onLCP' | 'onFCP' | 'onINP' | 'onTTFB'
>

export type WebVitalsReporter = (metric: Metric) => void

export function createWebVitalsSentryReporter({
  getSentry,
  isSentryReady,
}: {
  getSentry: () => SentryMetricClient | null
  isSentryReady: () => boolean
}): WebVitalsReporter {
  return (metric: Metric) => {
    const sentry = getSentry()
    if (!isSentryReady() || !sentry) {
      return
    }

    sentry.captureMessage(`web-vital:${metric.name}`, {
      level: 'info',
      tags: {
        metric_name: metric.name,
        metric_rating: metric.rating,
      },
      extra: {
        value: metric.value,
        delta: metric.delta,
        id: metric.id,
        navigationType: metric.navigationType,
      },
    })
  }
}

export function registerWebVitalsCallbacks(
  webVitals: WebVitalsModule,
  reporter: WebVitalsReporter,
): void {
  webVitals.onCLS(reporter)
  webVitals.onFID(reporter)
  webVitals.onLCP(reporter)
  webVitals.onFCP(reporter)
  webVitals.onINP(reporter)
  webVitals.onTTFB(reporter)
}
