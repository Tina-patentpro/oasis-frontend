import { apiClient } from '../client'

interface UtilitiesRequestOptions {
  signal?: AbortSignal
}

interface ReleaseNotesParams {
  from?: string
  to?: string
}

interface HelpArticlesParams {
  category?: string
  locale?: string
}

interface LayoutPreferencePayload {
  sidebarCollapsed?: boolean
  panels?: Array<Record<string, unknown>>
  density?: 'comfortable' | 'compact'
}

interface VisibilityPreferencePayload {
  modules?: Array<Record<string, unknown>>
}

interface ThemePreferencePayload {
  theme: 'light' | 'dark' | 'system'
}

interface TooltipSettingsPayload {
  enabled?: boolean
  dismissedIds?: string[]
  locale?: string
}

interface ExportUserDataPayload {
  format: 'json' | 'csv' | 'zip'
  maskSensitive?: boolean
}

interface UtilitiesApiResponse {
  success: boolean
  data?: Record<string, unknown> | Array<Record<string, unknown>>
}

class UtilitiesService {
  async getDataExportStatus(
    taskId: string,
    options?: UtilitiesRequestOptions,
  ): Promise<UtilitiesApiResponse> {
    return apiClient.get<UtilitiesApiResponse>(
      `/api/utilities/export/data/${taskId}`,
      undefined,
      undefined,
      {
        signal: options?.signal,
      },
    )
  }

  async clearUserCache(options?: UtilitiesRequestOptions): Promise<void> {
    return apiClient.post<void, undefined>('/api/utilities/cache/clear', undefined, undefined, {
      signal: options?.signal,
    })
  }

  async exportUserData(
    payload: ExportUserDataPayload,
    options?: UtilitiesRequestOptions,
  ): Promise<UtilitiesApiResponse> {
    return apiClient.post<UtilitiesApiResponse, ExportUserDataPayload>(
      '/api/utilities/export/data',
      payload,
      undefined,
      { signal: options?.signal },
    )
  }

  async getReleaseNotes(
    params: ReleaseNotesParams = {},
    options?: UtilitiesRequestOptions,
  ): Promise<UtilitiesApiResponse> {
    return apiClient.get<UtilitiesApiResponse>('/api/utilities/release-notes', params, undefined, {
      signal: options?.signal,
    })
  }

  async listHelpArticles(
    params: HelpArticlesParams = {},
    options?: UtilitiesRequestOptions,
  ): Promise<UtilitiesApiResponse> {
    return apiClient.get<UtilitiesApiResponse>('/api/utilities/help-articles', params, undefined, {
      signal: options?.signal,
    })
  }

  async getLayoutPreference(options?: UtilitiesRequestOptions): Promise<UtilitiesApiResponse> {
    return apiClient.get<UtilitiesApiResponse>(
      '/api/utilities/preferences/layout',
      undefined,
      undefined,
      {
        signal: options?.signal,
      },
    )
  }

  async getVisibilityPreference(options?: UtilitiesRequestOptions): Promise<UtilitiesApiResponse> {
    return apiClient.get<UtilitiesApiResponse>(
      '/api/utilities/preferences/visibility',
      undefined,
      undefined,
      {
        signal: options?.signal,
      },
    )
  }

  async getTooltipSettings(options?: UtilitiesRequestOptions): Promise<UtilitiesApiResponse> {
    return apiClient.get<UtilitiesApiResponse>('/api/utilities/tooltips', undefined, undefined, {
      signal: options?.signal,
    })
  }

  async updateLayoutPreference(
    payload: LayoutPreferencePayload,
    options?: UtilitiesRequestOptions,
  ): Promise<UtilitiesApiResponse> {
    return apiClient.put<UtilitiesApiResponse, LayoutPreferencePayload>(
      '/api/utilities/preferences/layout',
      payload,
      undefined,
      { signal: options?.signal },
    )
  }

  async updateVisibilityPreference(
    payload: VisibilityPreferencePayload,
    options?: UtilitiesRequestOptions,
  ): Promise<UtilitiesApiResponse> {
    return apiClient.patch<UtilitiesApiResponse, VisibilityPreferencePayload>(
      '/api/utilities/preferences/visibility',
      payload,
      undefined,
      { signal: options?.signal },
    )
  }

  async updateTheme(
    payload: ThemePreferencePayload,
    options?: UtilitiesRequestOptions,
  ): Promise<UtilitiesApiResponse> {
    return apiClient.put<UtilitiesApiResponse, ThemePreferencePayload>(
      '/api/utilities/theme',
      payload,
      undefined,
      { signal: options?.signal },
    )
  }

  async updateTooltipSettings(
    payload: TooltipSettingsPayload,
    options?: UtilitiesRequestOptions,
  ): Promise<UtilitiesApiResponse> {
    return apiClient.patch<UtilitiesApiResponse, TooltipSettingsPayload>(
      '/api/utilities/tooltips',
      payload,
      undefined,
      { signal: options?.signal },
    )
  }
}

export const utilitiesService = new UtilitiesService()
