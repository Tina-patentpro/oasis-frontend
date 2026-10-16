import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, jest, test } from '@jest/globals'

import { useWorkspaceUIStore } from '../stores'
import { useWorkspaceNavigation } from './useWorkspaceNavigation'

const mockSetTheme = jest.fn()
const mockThemeStoreState = {
  theme: 'green',
  currentTheme: {
    background: '#ecfdf5',
    primary: '#6ee7b7',
    primaryHover: '#34d399',
    primaryForeground: '#111827',
    primaryText: '#047857',
    name: '浅绿',
  },
  setTheme: mockSetTheme,
}

jest.mock('@/components/workspace', () => ({
  NavigationBar: () => null,
}))

jest.mock('@/app/providers/NotificationProvider', () => ({
  useNotificationCenter: () => ({ unreadCount: 0 }),
}))

jest.mock('@/stores', () => ({
  useThemeStore: (selector: (state: typeof mockThemeStoreState) => unknown) =>
    selector(mockThemeStoreState),
}))

const navigationParams = {
  onSuggestionClick: jest.fn(),
  onOpenSettingsPage: jest.fn(),
  onReleaseNotesClick: jest.fn(),
  onHelpClick: jest.fn(),
  onCustomerServiceClick: jest.fn(),
}

function installMatchMedia(initialMatches: boolean) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>()
  const mediaQueryList = {
    matches: initialMatches,
    media: '(max-width: 639px)',
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn((_type: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.add(listener)
    }),
    removeEventListener: jest.fn(
      (_type: string, listener: (event: MediaQueryListEvent) => void) => {
        listeners.delete(listener)
      },
    ),
    dispatchEvent: jest.fn(),
  }

  window.matchMedia = jest.fn((query: string) => {
    expect(query).toBe('(max-width: 639px)')
    return mediaQueryList as unknown as MediaQueryList
  })

  return {
    setMatches(matches: boolean) {
      mediaQueryList.matches = matches
      const event = { matches, media: mediaQueryList.media } as MediaQueryListEvent
      listeners.forEach((listener) => listener(event))
    },
  }
}

describe('useWorkspaceNavigation compact surface coordination', () => {
  beforeEach(() => {
    window.localStorage.clear()
    useWorkspaceUIStore.setState({
      hydrated: true,
      layoutMode: 'auto',
      showSidebar: true,
      chatMode: 'off',
      chatOpen: false,
    })
  })

  test('normalizes a persisted Full + sidebar state when compact navigation mounts', async () => {
    installMatchMedia(true)
    useWorkspaceUIStore.setState({ showSidebar: true, chatMode: 'full', chatOpen: true })

    const { result } = renderHook(() => useWorkspaceNavigation(navigationParams))

    await waitFor(() => {
      expect(useWorkspaceUIStore.getState()).toMatchObject({
        showSidebar: true,
        chatMode: 'off',
        chatOpen: false,
      })
    })
    expect(result.current.isCompact).toBe(true)
  })

  test.each([
    {
      persisted: { showSidebar: true, chatMode: 'full' as const, chatOpen: true },
      expected: { showSidebar: true, chatMode: 'off', chatOpen: false },
    },
    {
      persisted: { showSidebar: false, chatMode: 'quarter' as const, chatOpen: true },
      expected: { showSidebar: false, chatMode: 'full', chatOpen: true },
    },
  ])('derives a canonical compact surface on the first render for $persisted', ({ persisted, expected }) => {
    installMatchMedia(true)
    useWorkspaceUIStore.setState(persisted)
    const renderSnapshots: Array<{
      showSidebar: boolean
      chatMode: string
      chatOpen: boolean
    }> = []

    renderHook(() => {
      const navigation = useWorkspaceNavigation(navigationParams)
      renderSnapshots.push({
        showSidebar: navigation.showSidebar,
        chatMode: navigation.navigationBarProps.chatMode,
        chatOpen: navigation.chatOpen,
      })
      return navigation
    })

    expect(renderSnapshots[0]).toEqual(expected)
  })

  test('normalizes newly hydrated state through the same compact action', async () => {
    installMatchMedia(true)
    useWorkspaceUIStore.setState({ hydrated: false })
    renderHook(() => useWorkspaceNavigation(navigationParams))

    act(() => {
      useWorkspaceUIStore.setState({
        hydrated: true,
        showSidebar: false,
        chatMode: 'quarter',
        chatOpen: false,
      })
    })

    await waitFor(() => {
      expect(useWorkspaceUIStore.getState()).toMatchObject({
        showSidebar: false,
        chatMode: 'full',
        chatOpen: true,
      })
    })
  })

  test('normalizes desktop state when the media query enters compact mode', async () => {
    const media = installMatchMedia(false)
    const { result } = renderHook(() => useWorkspaceNavigation(navigationParams))
    act(() => {
      useWorkspaceUIStore.setState({ showSidebar: false, chatMode: 'quarter', chatOpen: false })
      media.setMatches(true)
    })

    await waitFor(() => {
      expect(useWorkspaceUIStore.getState()).toMatchObject({
        showSidebar: false,
        chatMode: 'full',
        chatOpen: true,
      })
    })
    expect(result.current.isCompact).toBe(true)
  })

  test('maps compact navigation actions to atomic sidebar, workflow and chat surfaces', () => {
    installMatchMedia(true)
    const { result } = renderHook(() => useWorkspaceNavigation(navigationParams))

    act(() => result.current.navigationBarProps.onToggleSidebar())
    expect(useWorkspaceUIStore.getState()).toMatchObject({
      showSidebar: false,
      chatMode: 'off',
      chatOpen: false,
    })

    act(() => result.current.navigationBarProps.onToggleSidebar())
    expect(useWorkspaceUIStore.getState()).toMatchObject({
      showSidebar: true,
      chatMode: 'off',
      chatOpen: false,
    })

    act(() => result.current.navigationBarProps.onChangeChatMode('full'))
    expect(useWorkspaceUIStore.getState()).toMatchObject({
      showSidebar: false,
      chatMode: 'full',
      chatOpen: true,
    })

    act(() => result.current.navigationBarProps.onChangeChatMode('off'))
    expect(useWorkspaceUIStore.getState()).toMatchObject({
      showSidebar: false,
      chatMode: 'off',
      chatOpen: false,
    })
  })

  test('preserves existing desktop navigation callbacks', () => {
    installMatchMedia(false)
    const { result } = renderHook(() => useWorkspaceNavigation(navigationParams))

    act(() => result.current.navigationBarProps.onChangeChatMode('full'))
    expect(useWorkspaceUIStore.getState()).toMatchObject({
      showSidebar: false,
      chatMode: 'full',
      chatOpen: true,
    })

    act(() => result.current.navigationBarProps.onChangeChatMode('quarter'))
    expect(useWorkspaceUIStore.getState()).toMatchObject({
      showSidebar: true,
      chatMode: 'quarter',
      chatOpen: true,
    })
  })
})
