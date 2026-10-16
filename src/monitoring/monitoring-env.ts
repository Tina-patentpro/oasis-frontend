export interface MonitoringEnv {
  isDev: boolean
  sentryDsn: string | undefined
  sentryEnvironment: string
  shouldEnableWebVitals: boolean
  tagsRaw: string | undefined
  tracesSampleRate: number
  replaysSessionSampleRate: number
  replaysErrorSampleRate: number
}

const toNumber = (value: string | undefined, fallback: number): number => {
  if (value === undefined) return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function getMonitoringEnv(): MonitoringEnv {
  const env = import.meta.env

  return {
    isDev: env.DEV,
    sentryDsn: env.VITE_SENTRY_DSN?.trim(),
    sentryEnvironment: env.VITE_SENTRY_ENV ?? env.MODE,
    shouldEnableWebVitals: env.VITE_ENABLE_WEB_VITALS !== 'false',
    tagsRaw: env.VITE_MONITORING_TAGS,
    tracesSampleRate: toNumber(env.VITE_SENTRY_TRACES_SAMPLE_RATE, 0.1),
    replaysSessionSampleRate: toNumber(env.VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE, 0.0),
    replaysErrorSampleRate: toNumber(env.VITE_SENTRY_REPLAYS_ERROR_SAMPLE_RATE, 1.0),
  }
}
