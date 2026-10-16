import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ContentPage {
  key: string
  label: string
}

interface SetPagesOptions {
  preserveInputPage?: boolean
}

const DEFAULT_CONTENT_PAGES: ContentPage[] = [
  { key: 'overview', label: '技术交底书概要' },
  { key: 'background', label: '背景技术' },
  { key: 'solution', label: '技术方案' },
  { key: 'benefit', label: '有益效果' },
  { key: 'example', label: '实施例' },
  { key: 'drawing', label: '附图说明' },
]

interface Version {
  id: string
  time: string
  text: string
}

interface ContentStore {
  hydrated: boolean
  // 标题
  title: string
  setTitle: (title: string) => void

  // 输入页签定义
  pages: ContentPage[]
  setPages: (pages: ContentPage[], options?: SetPagesOptions) => void

  // 当前输入页
  inputPage: string
  setInputPage: (page: string) => void

  // 输入章节内容
  inputSections: Record<string, string>
  setInputSection: (page: string, content: string) => void
  resetInputSections: () => void

  // 输入历史（用于撤销）
  inputHistory: Array<Record<string, string>>
  saveInputHistory: () => void
  undoInputSections: () => void

  // 生成的内容
  generated: string
  setGenerated: (content: string) => void

  // 版本历史
  versions: Version[]
  addVersion: (version: Version) => void
  clearVersions: () => void

  // 差异显示

  // 生成状态
  isGenerating: boolean
  setIsGenerating: (generating: boolean) => void
}

export const useContentStore = create<ContentStore>()(
  persist(
    (set) => ({
      hydrated: typeof window === 'undefined',
      title: '',
      setTitle: (title) => set({ title }),

      pages: [...DEFAULT_CONTENT_PAGES],
      setPages: (pages, options) =>
        set((state) => {
          if (!pages) {
            return state
          }

          if (pages.length === 0) {
            const isAlreadyEmpty =
              state.pages.length === 0 &&
              state.inputPage === '' &&
              Object.keys(state.inputSections).length === 0
            if (isAlreadyEmpty) {
              return state
            }
            return {
              pages: [],
              inputSections: {},
              inputPage: '',
            }
          }

          const isSameLength = state.pages.length === pages.length
          const isSameOrder = isSameLength
            ? state.pages.every((page, index) => {
                const next = pages[index]
                return page && next && page.key === next.key && page.label === next.label
              })
            : false

          if (isSameLength && isSameOrder) {
            return state
          }

          const nextSections: Record<string, string> = {}
          pages.forEach((page) => {
            nextSections[page.key] = state.inputSections[page.key] ?? ''
          })

          const preserveInputPage = options?.preserveInputPage ?? true
          const nextInputPage =
            preserveInputPage && pages.some((page) => page.key === state.inputPage)
              ? state.inputPage
              : (pages[0]?.key ?? state.inputPage)

          return {
            pages: [...pages],
            inputSections: nextSections,
            inputPage: nextInputPage,
          }
        }),
      inputPage: DEFAULT_CONTENT_PAGES[0]?.key || 'overview',
      setInputPage: (page) => set({ inputPage: page }),

      inputSections: Object.fromEntries(DEFAULT_CONTENT_PAGES.map((p) => [p.key, ''])),
      setInputSection: (page, content) =>
        set((state) => ({
          inputSections: { ...state.inputSections, [page]: content },
        })),
      resetInputSections: () =>
        set((state) => ({
          inputSections: Object.fromEntries(state.pages.map((p) => [p.key, ''])),
        })),

      inputHistory: [] as Array<Record<string, string>>,
      saveInputHistory: () =>
        set((state) => ({
          inputHistory: [...state.inputHistory, { ...state.inputSections }].slice(-10), // 只保留最近10个历史
        })),
      undoInputSections: () =>
        set((state) => {
          if (state.inputHistory.length === 0) return state
          const newHistory = [...state.inputHistory]
          const previousState = newHistory.pop()
          return {
            inputSections: previousState || state.inputSections,
            inputHistory: newHistory,
          }
        }),

      generated: '',
      setGenerated: (content) => set({ generated: content }),

      versions: [] as Version[],
      addVersion: (version) => set((state) => ({ versions: [...state.versions, version] })),
      clearVersions: () => set({ versions: [] }),

      isGenerating: false,
      setIsGenerating: (generating) => set({ isGenerating: generating }),
    }),
    {
      name: 'content-storage',
      partialize: (state) => ({
        title: state.title,
        pages: state.pages,
        inputPage: state.inputPage,
        inputSections: state.inputSections,
        // 不持久化生成的内容和版本历史，刷新后显示为空
        // generated: state.generated,
        // versions: state.versions,
        // showDiff: state.showDiff,
      }),
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          console.error('Failed to rehydrate workspace content store', error)
        }
        queueMicrotask(() => {
          // 刷新后清空生成内容
          useContentStore.setState({
            hydrated: true,
            generated: '',
            versions: [],
          })
        })
      },
    },
  ),
)
