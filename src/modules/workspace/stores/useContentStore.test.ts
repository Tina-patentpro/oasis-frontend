import { beforeEach, describe, expect, test } from '@jest/globals'

import { useContentStore } from './useContentStore'

const PREVIOUS_TOOL_PAGES = [
  { key: 'techField', label: '技术领域' },
  { key: 'background', label: '背景技术' },
]

const NEXT_TOOL_PAGES = [
  { key: 'claim', label: '权利要求书' },
  { key: 'techField', label: '技术领域' },
  { key: 'background', label: '背景技术' },
  { key: 'userInstruction', label: '用户指令' },
]

describe('useContentStore setPages', () => {
  beforeEach(() => {
    localStorage.clear()
    useContentStore.setState({
      hydrated: true,
      title: '',
      pages: PREVIOUS_TOOL_PAGES,
      inputPage: 'techField',
      inputSections: {
        techField: '旧工具里的技术领域',
        background: '旧工具里的背景技术',
      },
      inputHistory: [],
      generated: '',
      versions: [],
      isGenerating: false,
    })
  })

  test('keeps the current input page by default when the page still exists', () => {
    useContentStore.getState().setPages(NEXT_TOOL_PAGES)

    expect(useContentStore.getState().inputPage).toBe('techField')
  })

  test('can reset the active input page to the first ranked item when switching tools', () => {
    useContentStore.getState().setPages(NEXT_TOOL_PAGES, { preserveInputPage: false })

    const state = useContentStore.getState()

    expect(state.inputPage).toBe('claim')
    expect(state.pages.map((page) => page.key)).toEqual([
      'claim',
      'techField',
      'background',
      'userInstruction',
    ])
  })
})
