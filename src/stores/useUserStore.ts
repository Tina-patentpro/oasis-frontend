import { create } from 'zustand'

import {
  safeReadLocalStorageJson,
  safeRemoveLocalStorageItem,
  safeSetLocalStorageJson,
} from '@/utils/safe-storage'

interface UserProfile {
  id: string
  email: string
  phone?: string
  company?: string
  customerNumber: string
  name: string
}

interface UserStore {
  profile: UserProfile | null
  setProfile: (profile: UserProfile) => void
  /** 当前已知的手机号（来自 Auth 或用户手动输入） */
  phone: string | undefined
  /** 用户是否主动手动修改过手机号（手动修改后不再跟随 Auth 覆盖） */
  phoneManuallySet: boolean
  /** 用户手动设置手机号；调用后将不再被 syncFromAuth 覆盖 */
  setPhone: (phone: string) => void
  /** 由 useAuthStore 在用户信息更新后调用，仅在未手动设置时同步 */
  syncFromAuth: (phone: string | undefined) => void
  /** 清理用户侧缓存 — called on logout */
  reset: () => void
}

const STORAGE_KEY = 'workspace-user'

export const useUserStore = create<UserStore>((set, get) => ({
  profile: (() => {
    return safeReadLocalStorageJson<UserProfile>(STORAGE_KEY)
  })(),
  setProfile: (profile) =>
    set(() => {
      safeSetLocalStorageJson(STORAGE_KEY, profile)
      return { profile }
    }),

  phone: undefined,
  phoneManuallySet: false,

  setPhone(phone) {
    set({ phone, phoneManuallySet: true })
  },

  syncFromAuth(phone) {
    if (get().phoneManuallySet) return
    set({ phone })
  },

  reset() {
    safeRemoveLocalStorageItem(STORAGE_KEY)
    set({
      phone: undefined,
      phoneManuallySet: false,
      profile: null,
    })
  },
}))
