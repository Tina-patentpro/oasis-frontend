import { APP_VERSION } from '@/constants/appMeta'
import { businessMetricCollector } from './business-metrics'
import { registerGlobalErrorHandlers } from './global-error-handlers'
import { getMonitoringEnv } from './monitoring-env'
import { sanitizeSentryEvent } from './sentry-scrubbing'
import { createWebVitalsSentryReporter, registerWebVitalsCallbacks } from './web-vitals'

type SentryModule = typeof import('@sentry/browser')

interface ReportErrorContext {
  componentStack?: string
  tags?: Record<string, string>
  extra?: Record<string, unknown>
}

let sentry: SentryModule | null = null
let sentryInitialized = false
let globalErrorHandlersRegistered = false

const sendMetric = createWebVitalsSentryReporter({
  getSentry: () => sentry,
  isSentryReady: () => sentryInitialized,
})

export const initBusinessMetrics = (): void => {
  if (typeof window === 'undefined') {
    return
  }
  ;(window as Window & { __BUSINESS_METRICS__?: unknown }).__BUSINESS_METRICS__ =
    businessMetricCollector
}

export const initMonitoring = async (): Promise<void> => {
  const env = getMonitoringEnv()

  if (typeof window !== 'undefined' && !globalErrorHandlersRegistered) {
    registerGlobalErrorHandlers(reportError)
    globalErrorHandlersRegistered = true
  }

  const tasks: Array<Promise<void>> = []

  if (env.sentryDsn) {
    tasks.push(
      import('@sentry/browser')
        .then(async (Sentry) => {
          sentry = Sentry
          const integrations = []
          if (typeof Sentry.browserTracingIntegration === 'function') {
            integrations.push(Sentry.browserTracingIntegration())
          }
          if (typeof Sentry.replayIntegration === 'function') {
            integrations.push(
              Sentry.replayIntegration({
                blockAllMedia: true,
                maskAllInputs: true,
                maskAllText: true,
              }),
            )
          }

          const release = APP_VERSION.trim()

          Sentry.init({
            dsn: env.sentryDsn,
            environment: env.sentryEnvironment,
            integrations,
            tracesSampleRate: env.tracesSampleRate,
            replaysSessionSampleRate: env.replaysSessionSampleRate,
            replaysOnErrorSampleRate: env.replaysErrorSampleRate,
            ...(release ? { release } : {}),
            beforeSend(event) {
              try {
                return sanitizeSentryEvent(event)
              } catch {
                return null
              }
            },
          })

          if (env.tagsRaw) {
            try {
              const tags = JSON.parse(env.tagsRaw) as Record<string, string>
              Object.entries(tags).forEach(([key, value]) => {
                if (typeof value === 'string') {
                  Sentry.setTag(key, value)
                }
              })
            } catch (error) {
              if (env.isDev) {
                console.warn('[monitoring] VITE_MONITORING_TAGS 解析失败', error)
              }
            }
          }

          sentryInitialized = true
        })
        .catch((error) => {
          if (env.isDev) {
            console.warn('[monitoring] 初始化 Sentry 失败', error)
          }
        }),
    )
  }

  if (env.shouldEnableWebVitals) {
    tasks.push(
      import('web-vitals')
        .then((webVitals) => {
          registerWebVitalsCallbacks(webVitals, sendMetric)
        })
        .catch((error) => {
          if (env.isDev) {
            console.warn('[monitoring] 加载 web-vitals 失败', error)
          }
        }),
    )
  }

  if (tasks.length > 0) {
    await Promise.all(tasks)
  }
}

export const reportError = (error: Error, context?: ReportErrorContext): void => {
  if (sentryInitialized && sentry) {
    sentry.captureException(error, {
      tags: context?.tags,
      extra: context?.extra,
      contexts: context?.componentStack
        ? {
            react: { componentStack: context.componentStack },
          }
        : undefined,
    })
  } else if (getMonitoringEnv().isDev) {
    console.error('[monitoring] 捕获到错误但 Sentry 未初始化', error, context)
  }
}
