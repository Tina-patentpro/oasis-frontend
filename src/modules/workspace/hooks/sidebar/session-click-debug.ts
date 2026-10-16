import type { Session } from '@/types/api'

type SessionClickDebugEventDetail = {
  message: string
  detail: Record<string, unknown>
}

declare global {
  interface Window {
    __workspaceSessionClickDebugEvents?: SessionClickDebugEventDetail[]
  }
}

function isSessionClickDebugEnabled(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  try {
    return (
      window.localStorage.getItem('debugWorkspaceSessionClick') === '1' ||
      window.sessionStorage?.getItem('debugWorkspaceSessionClick') === '1'
    )
  } catch {
    return false
  }
}

export function logSessionClickDebug(message: string, detail: Record<string, unknown>): void {
  if (!isSessionClickDebugEnabled()) {
    return
  }
  const eventDetail = { message, detail }
  window.__workspaceSessionClickDebugEvents = window.__workspaceSessionClickDebugEvents ?? []
  window.__workspaceSessionClickDebugEvents.push(eventDetail)
  window.dispatchEvent(new CustomEvent('workspace:session-click-debug', { detail: eventDetail }))
}

export function logSessionClickDebugError(
  message: string,
  detail: Record<string, unknown>,
): void {
  const payload = { ...detail, source: 'session-click' }
  console.error(`[session-click-error] ${message}`, payload)
  logSessionClickDebug(`error:${message}`, payload)
}

export function summarizeSessionInput(inputs: Session['inputs']): string {
  if (!inputs) {
    return 'undefined'
  }
  try {
    if (Array.isArray(inputs)) {
      return `array(len=${inputs.length})`
    }
    if (typeof inputs === 'object') {
      return `object(keys=${Object.keys(inputs).length})`
    }
    return `${typeof inputs}:${String(inputs).slice(0, 100)}`
  } catch (error) {
    return `stringify-failed:${String(error)}`
  }
}
