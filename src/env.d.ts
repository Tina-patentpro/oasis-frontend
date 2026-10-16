/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_EMAILJS_SERVICE_ID?: string
  readonly VITE_EMAILJS_TEMPLATE_ID?: string
  readonly VITE_EMAILJS_PUBLIC_KEY?: string
  readonly VITE_APP_VERSION?: string
  readonly VITE_SENTRY_DSN?: string
  readonly VITE_SENTRY_ENV?: string
  readonly VITE_SENTRY_TRACES_SAMPLE_RATE?: string
  readonly VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE?: string
  readonly VITE_SENTRY_REPLAYS_ERROR_SAMPLE_RATE?: string
  readonly VITE_ENABLE_WEB_VITALS?: string
  readonly VITE_MONITORING_TAGS?: string
  readonly VITE_ALIYUN_CAPTCHA_APP_KEY?: string
  readonly VITE_ALIYUN_CAPTCHA_SCRIPT_URL?: string
  readonly VITE_ALIYUN_CAPTCHA_MOCK?: string
  readonly VITE_ALIYUN_CAPTCHA_MODE?: 'popup' | 'dialog' | 'float'
  readonly VITE_CSP_IMG_ORIGINS?: string
  readonly VITE_CSP_CONNECT_ORIGINS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare const __APP_VERSION__: string
