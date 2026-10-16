/**
 * Stores per-endpoint async status derived from POST /apicategories/apidetail.
 * Keyed by api_endpoint so each model version has an independent is_async value.
 */
import { create } from 'zustand'

interface AsyncToolStore {
  /** Map of api_endpoint → isAsync (true if is_async === 1) */
  asyncEndpointMap: Record<string, boolean>
  setEndpointAsync: (endpoint: string, isAsync: boolean) => void
  /** Clear all entries — called on logout */
  clearAll: () => void
}

export const useAsyncToolStore = create<AsyncToolStore>((set) => ({
  asyncEndpointMap: {},
  setEndpointAsync: (endpoint, isAsync) =>
    set((state) => ({
      asyncEndpointMap: { ...state.asyncEndpointMap, [endpoint]: isAsync },
    })),
  clearAll: () => set({ asyncEndpointMap: {} }),
}))
