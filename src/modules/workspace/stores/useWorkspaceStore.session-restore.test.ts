import { beforeEach, describe, expect, test } from '@jest/globals'

import { useWorkspaceStore } from './useWorkspaceStore'

type RestoreStore = ReturnType<typeof useWorkspaceStore.getState> & {
  activeSessionRestoreOwner?: symbol | null
  sessionRestoreCommitRevision?: number
  beginSessionRestore?: (createCancel: (owner: symbol) => () => void) => symbol
  finishSessionRestore?: (owner: symbol, committed: boolean) => void
  setToolForSessionRestore?: (
    owner: symbol,
    tool: { name: string; ver: string },
  ) => void
  clearPendingSessionRestoreTool?: (owner: symbol) => void
}

function restoreStore(): RestoreStore {
  return useWorkspaceStore.getState() as RestoreStore
}

function beginTestRestore(): symbol {
  return restoreStore().beginSessionRestore!((owner) => () => {
    restoreStore().finishSessionRestore!(owner, false)
  })
}

describe('useWorkspaceStore session restore ownership', () => {
  beforeEach(() => {
    window.localStorage.clear()
    useWorkspaceStore.setState({
      hydrated: true,
      tab: 'tab-x',
      tool: { name: '工具 X' as any, ver: 'v1' },
      isSessionOutputRestoring: false,
      activeSessionRestoreOwner: null,
      activeSessionRestoreCancel: null,
      sessionRestoreCommitRevision: 0,
      pendingSessionRestoreToolKey: null,
      pendingSessionRestoreToolOwner: null,
    })
  })

  test('ordinary setTool never infers session-restore origin from the global loading flag', () => {
    useWorkspaceStore.setState({ isSessionOutputRestoring: true })

    useWorkspaceStore.getState().setTool({ name: '人工工具' as any, ver: 'v2' })

    expect(useWorkspaceStore.getState().pendingSessionRestoreToolKey).toBeNull()
  })

  test('ordinary setTool clears a pending marker instead of inheriting an active restore owner', () => {
    const owner = beginTestRestore()
    restoreStore().setToolForSessionRestore!(owner, {
      name: '会话工具',
      ver: 'v3',
    })

    useWorkspaceStore.getState().setTool({ name: '人工工具' as any, ver: 'v4' })

    expect(useWorkspaceStore.getState()).toMatchObject({
      tool: { name: '人工工具', ver: 'v4' },
      pendingSessionRestoreToolKey: null,
      pendingSessionRestoreToolOwner: null,
    })
    restoreStore().finishSessionRestore!(owner, false)
  })

  test('ordinary setTool synchronously cancels and rolls back before applying manual intent', () => {
    const order: string[] = []
    const owner = restoreStore().beginSessionRestore!((leaseOwner) => () => {
      order.push('cancel')
      restoreStore().setTabForSessionRestore(leaseOwner, 'tab-x')
      restoreStore().setToolForSessionRestore!(leaseOwner, { name: '工具 X', ver: 'v1' })
      restoreStore().finishSessionRestore!(leaseOwner, false)
    })
    restoreStore().setTabForSessionRestore(owner, 'tab-a')
    restoreStore().setToolForSessionRestore!(owner, { name: '工具 A', ver: 'v2' })

    useWorkspaceStore.getState().setTool({ name: '人工工具' as any, ver: 'manual' })
    order.push('manual-returned')

    expect(order).toEqual(['cancel', 'manual-returned'])
    expect(useWorkspaceStore.getState()).toMatchObject({
      tab: 'tab-x',
      tool: { name: '人工工具', ver: 'manual' },
      activeSessionRestoreOwner: null,
      activeSessionRestoreCancel: null,
      pendingSessionRestoreToolKey: null,
      pendingSessionRestoreToolOwner: null,
    })
  })

  test('ordinary setTab synchronously cancels first and preserves the rollback marker', () => {
    const order: string[] = []
    const owner = restoreStore().beginSessionRestore!((leaseOwner) => () => {
      order.push('cancel')
      restoreStore().setTabForSessionRestore(leaseOwner, 'tab-x')
      restoreStore().setToolForSessionRestore!(leaseOwner, { name: '工具 X', ver: 'v1' })
      restoreStore().finishSessionRestore!(leaseOwner, false)
    })
    restoreStore().setTabForSessionRestore(owner, 'tab-a')
    restoreStore().setToolForSessionRestore!(owner, { name: '工具 A', ver: 'v2' })

    useWorkspaceStore.getState().setTab('manual-tab')
    order.push('manual-returned')

    expect(order).toEqual(['cancel', 'manual-returned'])
    expect(useWorkspaceStore.getState()).toMatchObject({
      tab: 'manual-tab',
      tool: { name: '工具 X', ver: 'v1' },
      activeSessionRestoreOwner: null,
      activeSessionRestoreCancel: null,
      pendingSessionRestoreToolKey: '工具 X::v1',
      pendingSessionRestoreToolOwner: owner,
    })
  })

  test('only the matching lease can mark a restored tool and finish the active restore', () => {
    const store = restoreStore()
    expect(store.beginSessionRestore).toEqual(expect.any(Function))
    expect(store.setToolForSessionRestore).toEqual(expect.any(Function))
    expect(store.finishSessionRestore).toEqual(expect.any(Function))

    const owner = beginTestRestore()
    const staleOwner = Symbol('stale restore')
    restoreStore().setToolForSessionRestore!(staleOwner, {
      name: '错误工具',
      ver: 'v0',
    })
    expect(useWorkspaceStore.getState().tool.name).toBe('工具 X')

    restoreStore().setToolForSessionRestore!(owner, {
      name: '会话工具',
      ver: 'v3',
    })
    expect(useWorkspaceStore.getState()).toMatchObject({
      tool: { name: '会话工具', ver: 'v3' },
      pendingSessionRestoreToolKey: '会话工具::v3',
      isSessionOutputRestoring: true,
    })

    restoreStore().finishSessionRestore!(staleOwner, false)
    expect(restoreStore().activeSessionRestoreOwner).toBe(owner)
    expect(useWorkspaceStore.getState().isSessionOutputRestoring).toBe(true)

    restoreStore().finishSessionRestore!(owner, false)
    expect(restoreStore().activeSessionRestoreOwner).toBeNull()
    expect(useWorkspaceStore.getState().isSessionOutputRestoring).toBe(false)
    expect(useWorkspaceStore.getState().pendingSessionRestoreToolKey).toBe('会话工具::v3')
    restoreStore().clearPendingSessionRestoreTool!(owner)
    expect(useWorkspaceStore.getState().pendingSessionRestoreToolKey).toBeNull()
  })

  test('an old instance cannot clear or commit a lease acquired by a remounted instance', () => {
    const store = restoreStore()
    expect(store.beginSessionRestore).toEqual(expect.any(Function))
    expect(store.finishSessionRestore).toEqual(expect.any(Function))

    const oldOwner = beginTestRestore()
    const newOwner = beginTestRestore()
    const baselineRevision = restoreStore().sessionRestoreCommitRevision

    restoreStore().finishSessionRestore!(oldOwner, true)
    expect(restoreStore().activeSessionRestoreOwner).toBe(newOwner)
    expect(restoreStore().sessionRestoreCommitRevision).toBe(baselineRevision)
    expect(useWorkspaceStore.getState().isSessionOutputRestoring).toBe(true)

    restoreStore().finishSessionRestore!(newOwner, true)
    expect(restoreStore().activeSessionRestoreOwner).toBeNull()
    expect(restoreStore().sessionRestoreCommitRevision).toBe((baselineRevision ?? 0) + 1)
    expect(useWorkspaceStore.getState().isSessionOutputRestoring).toBe(false)
  })

  test('an old owner cannot clear the pending restore origin written by a new owner', () => {
    const oldOwner = beginTestRestore()
    restoreStore().setToolForSessionRestore!(oldOwner, {
      name: '旧会话工具',
      ver: 'v1',
    })
    const newOwner = beginTestRestore()
    restoreStore().setToolForSessionRestore!(newOwner, {
      name: '新会话工具',
      ver: 'v2',
    })

    restoreStore().clearPendingSessionRestoreTool!(oldOwner)
    expect(useWorkspaceStore.getState().pendingSessionRestoreToolKey).toBe('新会话工具::v2')

    restoreStore().clearPendingSessionRestoreTool!(newOwner)
    expect(useWorkspaceStore.getState().pendingSessionRestoreToolKey).toBeNull()
  })
})
