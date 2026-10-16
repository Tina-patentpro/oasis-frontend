import { create } from 'zustand'

interface UIStore {
  toast: string | null
  showToast: (message: string, durationMs?: number) => void
  hideToast: () => void
}

let toastTimeoutId: ReturnType<typeof setTimeout> | null = null

export const useUIStore = create<UIStore>()((set) => ({
  toast: null,

  showToast: (message, durationMs = 1600) => {
    if (toastTimeoutId) {
      clearTimeout(toastTimeoutId)
    }

    set({ toast: message })
    toastTimeoutId = setTimeout(() => {
      set({ toast: null })
      toastTimeoutId = null
    }, durationMs)
  },

  hideToast: () => {
    if (toastTimeoutId) {
      clearTimeout(toastTimeoutId)
      toastTimeoutId = null
    }
    set({ toast: null })
  },
}))
