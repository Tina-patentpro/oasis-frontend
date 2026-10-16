import { beforeEach, describe, expect, test } from '@jest/globals'

import { type ChatMode, useWorkspaceUIStore } from './useWorkspaceUIStore'

interface CompactStateCase {
  chatMode: ChatMode
  chatOpen: boolean
  showSidebar: boolean
  expected: {
    chatMode: ChatMode
    chatOpen: boolean
    showSidebar: boolean
  }
}

const compactNormalizationCases: CompactStateCase[] = [
  {
    showSidebar: true,
    chatMode: 'off',
    chatOpen: true,
    expected: { showSidebar: true, chatMode: 'off', chatOpen: false },
  },
  {
    showSidebar: true,
    chatMode: 'quarter',
    chatOpen: false,
    expected: { showSidebar: true, chatMode: 'off', chatOpen: false },
  },
  {
    showSidebar: true,
    chatMode: 'full',
    chatOpen: true,
    expected: { showSidebar: true, chatMode: 'off', chatOpen: false },
  },
  {
    showSidebar: false,
    chatMode: 'off',
    chatOpen: true,
    expected: { showSidebar: false, chatMode: 'off', chatOpen: false },
  },
  {
    showSidebar: false,
    chatMode: 'quarter',
    chatOpen: false,
    expected: { showSidebar: false, chatMode: 'full', chatOpen: true },
  },
  {
    showSidebar: false,
    chatMode: 'full',
    chatOpen: false,
    expected: { showSidebar: false, chatMode: 'full', chatOpen: true },
  },
]

describe('workspace useWorkspaceUIStore chat mode behavior', () => {
  beforeEach(() => {
    window.localStorage.clear()
    useWorkspaceUIStore.setState({
      layoutMode: 'auto',
      showSidebar: true,
      chatOpen: true,
      chatMode: 'quarter',
    })
  })

  test('switching chat mode to full closes left sidebar by default', () => {
    useWorkspaceUIStore.getState().setSidebarOpen(true)
    useWorkspaceUIStore.getState().setChatMode('full')

    const state = useWorkspaceUIStore.getState()
    expect(state.chatMode).toBe('full')
    expect(state.chatOpen).toBe(true)
    expect(state.showSidebar).toBe(false)
  })

  test('switching from full to quarter restores left sidebar', () => {
    useWorkspaceUIStore.getState().setChatMode('full')
    useWorkspaceUIStore.getState().setChatMode('quarter')

    const state = useWorkspaceUIStore.getState()
    expect(state.chatMode).toBe('quarter')
    expect(state.chatOpen).toBe(true)
    expect(state.showSidebar).toBe(true)
  })

  test('switching from full to off restores left sidebar', () => {
    useWorkspaceUIStore.getState().setChatMode('full')
    useWorkspaceUIStore.getState().setChatMode('off')

    const state = useWorkspaceUIStore.getState()
    expect(state.chatMode).toBe('off')
    expect(state.chatOpen).toBe(false)
    expect(state.showSidebar).toBe(true)
  })

  test('activates a workflow from full without reopening the compact sidebar', () => {
    useWorkspaceUIStore.getState().setChatMode('full')
    useWorkspaceUIStore.getState().activateSessionSurface('workflow', { compact: true })

    const state = useWorkspaceUIStore.getState()
    expect(state.chatMode).toBe('off')
    expect(state.chatOpen).toBe(false)
    expect(state.showSidebar).toBe(false)
  })

  test('opens a hidden chat in full mode on compact screens', () => {
    useWorkspaceUIStore.getState().setChatMode('off')
    useWorkspaceUIStore.getState().activateSessionSurface('chat', { compact: true })

    const state = useWorkspaceUIStore.getState()
    expect(state.chatMode).toBe('full')
    expect(state.chatOpen).toBe(true)
    expect(state.showSidebar).toBe(false)
  })

  test('activates compact workflow directly from quarter mode', () => {
    useWorkspaceUIStore.setState({ showSidebar: true, chatMode: 'quarter', chatOpen: true })

    useWorkspaceUIStore.getState().activateSessionSurface('workflow', { compact: true })

    expect(useWorkspaceUIStore.getState()).toMatchObject({
      showSidebar: false,
      chatMode: 'off',
      chatOpen: false,
    })
  })

  test('activates compact chat directly from quarter mode', () => {
    useWorkspaceUIStore.setState({ showSidebar: true, chatMode: 'quarter', chatOpen: true })

    useWorkspaceUIStore.getState().activateSessionSurface('chat', { compact: true })

    expect(useWorkspaceUIStore.getState()).toMatchObject({
      showSidebar: false,
      chatMode: 'full',
      chatOpen: true,
    })
  })

  test('opens a hidden chat in quarter mode on desktop', () => {
    useWorkspaceUIStore.getState().setChatMode('off')
    useWorkspaceUIStore.getState().activateSessionSurface('chat', { compact: false })

    const state = useWorkspaceUIStore.getState()
    expect(state.chatMode).toBe('quarter')
    expect(state.chatOpen).toBe(true)
    expect(state.showSidebar).toBe(true)
  })

  test.each(compactNormalizationCases)(
    'normalizes compact state atomically from sidebar=$showSidebar mode=$chatMode open=$chatOpen',
    ({ chatMode, chatOpen, showSidebar, expected }) => {
      useWorkspaceUIStore.setState({ chatMode, chatOpen, showSidebar })
      const emittedStates: Array<CompactStateCase['expected']> = []
      const unsubscribe = useWorkspaceUIStore.subscribe((state) => {
        emittedStates.push({
          chatMode: state.chatMode,
          chatOpen: state.chatOpen,
          showSidebar: state.showSidebar,
        })
      })

      useWorkspaceUIStore.getState().normalizeCompactSurface()
      unsubscribe()

      expect(useWorkspaceUIStore.getState()).toMatchObject(expected)
      expect(emittedStates).toEqual([expected])
    },
  )

  test.each([
    ['sidebar', { showSidebar: true, chatMode: 'off', chatOpen: false }],
    ['workflow', { showSidebar: false, chatMode: 'off', chatOpen: false }],
    ['chat', { showSidebar: false, chatMode: 'full', chatOpen: true }],
  ] as const)('commits the compact %s surface in one store update', (surface, expected) => {
    useWorkspaceUIStore.setState({ showSidebar: true, chatMode: 'quarter', chatOpen: true })
    const emittedStates: Array<CompactStateCase['expected']> = []
    const unsubscribe = useWorkspaceUIStore.subscribe((state) => {
      emittedStates.push({
        chatMode: state.chatMode,
        chatOpen: state.chatOpen,
        showSidebar: state.showSidebar,
      })
    })

    useWorkspaceUIStore.getState().setCompactSurface(surface)
    unsubscribe()

    expect(useWorkspaceUIStore.getState()).toMatchObject(expected)
    expect(emittedStates).toEqual([expected])
  })

  test('keeps user width preference separate from passive viewport adjustments', () => {
    useWorkspaceUIStore.getState().setChatWidth(612)
    expect(useWorkspaceUIStore.getState().preferredChatWidth).toBe(612)

    useWorkspaceUIStore.getState().setAutoAdjustedChatWidth(288)
    const state = useWorkspaceUIStore.getState()
    expect(state.chatWidth).toBe(288)
    expect(state.preferredChatWidth).toBe(612)
  })
})
