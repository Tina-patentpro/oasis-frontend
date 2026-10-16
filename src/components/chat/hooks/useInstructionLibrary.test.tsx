import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, jest, test } from '@jest/globals'

import { instructionService } from '@/api/services/instruction.service'

import { useInstructionLibrary } from './useInstructionLibrary'

jest.mock('@/api/services/instruction.service', () => ({
  instructionService: {
    getInstructionListWithOptions: jest.fn(),
    createInstruction: jest.fn(),
    deleteInstruction: jest.fn(),
  },
}))

const mockedGetInstructionList =
  instructionService.getInstructionListWithOptions as jest.MockedFunction<
    typeof instructionService.getInstructionListWithOptions
  >
const mockedCreateInstruction = instructionService.createInstruction as jest.MockedFunction<
  typeof instructionService.createInstruction
>
const mockedDeleteInstruction = instructionService.deleteInstruction as jest.MockedFunction<
  typeof instructionService.deleteInstruction
>

function createDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error?: unknown) => void
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve
    reject = innerReject
  })
  return { promise, resolve, reject }
}

function renderInstructionLibrary(namespace = 'general') {
  return renderHook(() =>
    useInstructionLibrary({
      enabled: true,
      namespace,
      onSelectInstruction: jest.fn(),
    }),
  )
}

describe('useInstructionLibrary', () => {
  beforeEach(() => {
    localStorage.clear()
    mockedGetInstructionList.mockReset()
    mockedCreateInstruction.mockReset()
    mockedDeleteInstruction.mockReset()
  })

  test('marks API instructions as custom only when can_delete is true', async () => {
    mockedGetInstructionList.mockResolvedValue({
      total: 2,
      item: [
        {
          id: 101,
          type: 3,
          title: '可删除提示词',
          content: '这条提示词来自用户创建。',
          is_new: 0,
          created_at: '2026-05-21T10:00:00.000Z',
          can_delete: true,
        },
        {
          id: 102,
          type: 3,
          title: '系统提示词',
          content: '这条提示词来自系统模板。',
          is_new: 0,
          created_at: '2026-05-21T10:00:00.000Z',
          can_delete: false,
        },
      ],
    })

    const { result } = renderInstructionLibrary()

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.instructionLibrary).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'api-101', canDelete: true }),
        expect.objectContaining({ key: 'api-102', canDelete: false }),
      ]),
    )
  })

  test('keeps API instructions without delete fields non-custom by default', async () => {
    mockedGetInstructionList.mockResolvedValue({
      total: 1,
      item: [
        {
          id: 201,
          type: 3,
          title: '未标记提示词',
          content: '接口没有返回删除权限字段。',
          is_new: 0,
          created_at: '2026-05-21T10:00:00.000Z',
        },
      ],
    })

    const { result } = renderInstructionLibrary()

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.instructionLibrary).toEqual(
      expect.arrayContaining([expect.objectContaining({ key: 'api-201', canDelete: false })]),
    )
  })

  test('uses is_custom as a compatibility fallback when can_delete is absent', async () => {
    mockedGetInstructionList.mockResolvedValue({
      total: 1,
      item: [
        {
          id: 301,
          type: 3,
          title: '兼容提示词',
          content: '接口使用 is_custom 字段。',
          is_new: 0,
          created_at: '2026-05-21T10:00:00.000Z',
          is_custom: true,
        },
      ],
    })

    const { result } = renderInstructionLibrary()

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.instructionLibrary).toEqual(
      expect.arrayContaining([expect.objectContaining({ key: 'api-301', canDelete: true })]),
    )
  })

  test('keeps a newly created API instruction deletable after reloading when API returns can_delete', async () => {
    mockedGetInstructionList.mockResolvedValueOnce({ total: 0, item: [] }).mockResolvedValueOnce({
      total: 1,
      item: [
        {
          id: 401,
          type: 3,
          title: '新建提示词',
          content: '这是刚新建的提示词。',
          is_new: 0,
          created_at: '2026-05-21T10:00:00.000Z',
          can_delete: true,
        },
      ],
    })
    mockedCreateInstruction.mockResolvedValue({ id: 401 })
    mockedDeleteInstruction.mockResolvedValue(undefined)

    const { result } = renderInstructionLibrary()

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    act(() => {
      result.current.setNewInstruction({
        title: '新建提示词',
        content: '这是刚新建的提示词。',
      })
    })

    await act(async () => {
      await result.current.handleInstructionCreate()
    })

    await waitFor(() =>
      expect(result.current.instructionLibrary).toEqual(
        expect.arrayContaining([expect.objectContaining({ key: 'api-401', canDelete: true })]),
      ),
    )

    await act(async () => {
      result.current.handleInstructionDelete('api-401')
    })

    await waitFor(() => expect(mockedDeleteInstruction).toHaveBeenCalledWith(401))
  })

  test('ignores legacy local cached instructions because backend is the only source', async () => {
    localStorage.setItem(
      'instruction-library-general',
      JSON.stringify([
        {
          key: 'local-legacy',
          title: '旧本地提示词',
          description: '旧缓存里的本地提示词。',
          content: '旧缓存里的本地提示词。',
          isCustom: true,
        },
      ]),
    )
    mockedGetInstructionList.mockResolvedValue({
      total: 1,
      item: [
        {
          id: 401,
          type: 3,
          title: '接口提示词',
          content: '接口返回的可删除提示词。',
          is_new: 0,
          created_at: '2026-05-21T10:00:00.000Z',
          can_delete: true,
        },
      ],
    })

    const { result } = renderInstructionLibrary()
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.instructionLibrary).toEqual([
      expect.objectContaining({ key: 'api-401', canDelete: true }),
    ])
    expect(result.current.instructionLibrary).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ key: 'local-legacy' })]),
    )
  })

  test('keeps the instruction list empty when backend returns no instructions', async () => {
    localStorage.setItem(
      'instruction-library-general',
      JSON.stringify([
        {
          key: 'local-legacy',
          title: '旧本地提示词',
          description: '旧缓存里的本地提示词。',
          content: '旧缓存里的本地提示词。',
          isCustom: true,
        },
      ]),
    )
    mockedGetInstructionList.mockResolvedValue({ total: 0, item: [] })

    const { result } = renderInstructionLibrary()
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.instructionLibrary).toEqual([])
    expect(result.current.loadError).toBe('')
  })

  test('reports load failure without falling back to local cached instructions', async () => {
    localStorage.setItem(
      'instruction-library-general',
      JSON.stringify([
        {
          key: 'local-legacy',
          title: '旧本地提示词',
          description: '旧缓存里的本地提示词。',
          content: '旧缓存里的本地提示词。',
          isCustom: true,
        },
      ]),
    )
    mockedGetInstructionList.mockRejectedValue(new Error('network error'))

    const { result } = renderInstructionLibrary()
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.instructionLibrary).toEqual([])
    expect(result.current.loadError).toBe('提示词加载失败，请稍后重试')
  })

  test('reloads instructions from backend when requested after a load failure', async () => {
    mockedGetInstructionList
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce({
        total: 1,
        item: [
          {
            id: 601,
            type: 3,
            title: '重试后的提示词',
            content: '重新加载后来自后端。',
            is_new: 0,
            created_at: '2026-05-21T10:00:00.000Z',
            can_delete: false,
          },
        ],
      })

    const { result } = renderInstructionLibrary()
    await waitFor(() => expect(result.current.loadError).toBe('提示词加载失败，请稍后重试'))

    await act(async () => {
      await result.current.reloadInstructions()
    })

    expect(result.current.loadError).toBe('')
    expect(result.current.instructionLibrary).toEqual(
      expect.arrayContaining([expect.objectContaining({ key: 'api-601', canDelete: false })]),
    )
  })

  test('keeps an instruction visible when backend delete fails', async () => {
    mockedGetInstructionList.mockResolvedValue({
      total: 1,
      item: [
        {
          id: 701,
          type: 3,
          title: '删除失败提示词',
          content: '后端删除失败时仍应保留。',
          is_new: 0,
          created_at: '2026-05-21T10:00:00.000Z',
          can_delete: true,
        },
      ],
    })
    mockedDeleteInstruction.mockRejectedValue(new Error('delete failed'))

    const { result } = renderInstructionLibrary()
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.handleInstructionDelete('api-701')
    })

    expect(result.current.instructionLibrary).toEqual(
      expect.arrayContaining([expect.objectContaining({ key: 'api-701' })]),
    )
    expect(result.current.operationError).toBe('删除提示词失败，请稍后重试')
  })

  test('clears the delete error after a successful backend reload', async () => {
    mockedGetInstructionList
      .mockResolvedValueOnce({
        total: 1,
        item: [
          {
            id: 801,
            type: 3,
            title: '删除失败提示词',
            content: '第一次加载的提示词。',
            is_new: 0,
            created_at: '2026-05-21T10:00:00.000Z',
            can_delete: true,
          },
        ],
      })
      .mockResolvedValueOnce({
        total: 1,
        item: [
          {
            id: 802,
            type: 3,
            title: '重新加载后的提示词',
            content: '重新加载来自后端。',
            is_new: 0,
            created_at: '2026-05-21T10:00:00.000Z',
            can_delete: false,
          },
        ],
      })
    mockedDeleteInstruction.mockRejectedValue(new Error('delete failed'))

    const { result } = renderInstructionLibrary()
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.handleInstructionDelete('api-801')
    })

    expect(result.current.operationError).toBe('删除提示词失败，请稍后重试')

    await act(async () => {
      await result.current.reloadInstructions()
    })

    expect(result.current.operationError).toBe('')
    expect(result.current.instructionLibrary).toEqual(
      expect.arrayContaining([expect.objectContaining({ key: 'api-802' })]),
    )
  })

  test('exposes the instruction key currently being deleted', async () => {
    const deferred = createDeferred<void>()
    mockedGetInstructionList.mockResolvedValue({
      total: 1,
      item: [
        {
          id: 901,
          type: 3,
          title: '正在删除提示词',
          content: '删除接口未返回前应锁定这条提示词。',
          is_new: 0,
          created_at: '2026-05-21T10:00:00.000Z',
          can_delete: true,
        },
      ],
    })
    mockedDeleteInstruction.mockImplementation(() => deferred.promise)

    const { result } = renderInstructionLibrary()
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    let deletePromise!: Promise<void>
    act(() => {
      deletePromise = result.current.handleInstructionDelete('api-901')
    })

    await waitFor(() => expect(result.current.deletingInstructionKey).toBe('api-901'))

    await act(async () => {
      deferred.resolve(undefined)
      await deletePromise
    })

    expect(result.current.deletingInstructionKey).toBeNull()
  })

  test('exposes create loading state and ignores duplicate create requests', async () => {
    const createRequest = createDeferred<{ id: number }>()
    mockedGetInstructionList.mockResolvedValue({ total: 0, item: [] })
    mockedCreateInstruction.mockImplementation(() => createRequest.promise as any)

    const { result } = renderInstructionLibrary()
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    act(() => {
      result.current.setNewInstruction({
        title: '保存中的提示词',
        content: '保存期间不允许重复提交。',
      })
    })

    let createPromise!: Promise<void>
    act(() => {
      createPromise = result.current.handleInstructionCreate() as unknown as Promise<void>
    })

    await waitFor(() => expect(result.current.isCreatingInstruction).toBe(true))

    act(() => {
      result.current.handleInstructionCreate()
    })

    expect(mockedCreateInstruction).toHaveBeenCalledTimes(1)

    await act(async () => {
      createRequest.resolve({ id: 1001 })
      await createPromise
    })

    await waitFor(() => expect(result.current.isCreatingInstruction).toBe(false))
  })

  test('closes the instruction popup with Escape and returns focus to the trigger', async () => {
    mockedGetInstructionList.mockResolvedValue({ total: 0, item: [] })
    const trigger = document.createElement('button')
    document.body.appendChild(trigger)

    const { result } = renderInstructionLibrary()
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    Object.defineProperty(result.current.instructionBtnRef, 'current', {
      value: trigger,
      configurable: true,
    })

    act(() => {
      result.current.toggleInstruction()
    })

    expect(result.current.instructionOpen).toBe(true)

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })

    expect(result.current.instructionOpen).toBe(false)
    expect(trigger).toHaveFocus()

    trigger.remove()
  })
})
