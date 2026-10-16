import { useUIStore } from '@/stores/useUIStore'

export function GlobalToast() {
  const toast = useUIStore((state) => state.toast)

  if (!toast) {
    return null
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed inset-x-4 top-[calc(env(safe-area-inset-top)+11rem)] bottom-auto z-[300] max-w-sm rounded-xl bg-gray-900 px-4 py-3 text-sm text-white shadow-xl sm:inset-x-auto sm:top-auto sm:bottom-4 sm:right-4"
    >
      {toast}
    </div>
  )
}
