import { useState, useEffect, useRef } from 'react'

import type { Project, Session, HistoryDataItem } from '@/types/api'
import { sessionService, historyService } from '@/api/services'

interface SessionManagementCallbacks {
  onRenameSession?: (sessionId: number, title: string) => Promise<void>
  onDeleteSession?: (sessionId: number) => Promise<void>
  onAssociateProject?: (session: Session, projectId: number) => Promise<void>
  onDissociateProject?: (session: Session) => Promise<void>
  onExportSession?: (sessionId: number) => Promise<void>
  onHistorySearchCompleted?: (items: HistoryDataItem[]) => void
  onHistoryInject?: (item: HistoryDataItem) => void
}

export function useSessionManagement(
  notify: (message: string) => void,
  showConfirm: (title: string, message: string, onConfirm: () => void) => void,
  hideConfirm: () => void,
  setQuickCreateProjectOpen: (open: boolean) => void,
  callbacks: SessionManagementCallbacks = {},
) {
  const [sessionMenuOpen, setSessionMenuOpen] = useState<number | null>(null)
  const [renamingSessionId, setRenamingSessionId] = useState<number | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const sessionMenuRefs = useRef<
    Record<number, { btnRef: HTMLButtonElement | null; menuRef: HTMLDivElement | null }>
  >({})

  // Associate project dialog
  const [associateProjectDialogOpen, setAssociateProjectDialogOpen] = useState(false)
  const [currentSessionToAssociate, setCurrentSessionToAssociate] = useState<Session | null>(null)
  const [isAssociatingProject, setIsAssociatingProject] = useState(false)

  // Close session menu when clicking outside
  useEffect(() => {
    if (!sessionMenuOpen) return

    const handleClickOutside = (e: MouseEvent): void => {
      const refs = sessionMenuRefs.current[sessionMenuOpen]
      if (refs && refs.btnRef && refs.menuRef) {
        if (!refs.btnRef.contains(e.target as Node) && !refs.menuRef.contains(e.target as Node)) {
          setSessionMenuOpen(null)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [sessionMenuOpen])

  const handleRenameSession = (session: Session): void => {
    setRenamingSessionId(session.id)
    setRenameValue(session.title)
    setSessionMenuOpen(null)
  }

  const confirmRename = async (): Promise<void> => {
    if (renamingSessionId === null) {
      return
    }

    const trimmed = renameValue.trim()
    if (!trimmed) {
      return
    }

    try {
      if (callbacks.onRenameSession) {
        await callbacks.onRenameSession(renamingSessionId, trimmed)
      }
      notify(`会话已重命名为"${trimmed}"`)
    } catch (error) {
      console.error('会话重命名失败:', error)
      notify('会话重命名失败，请稍后重试')
      return
    } finally {
      setRenamingSessionId(null)
      setRenameValue('')
    }
  }

  const cancelRename = (): void => {
    setRenamingSessionId(null)
    setRenameValue('')
  }

  const handleAssociateProject = (session: Session): void => {
    setCurrentSessionToAssociate(session)
    setSessionMenuOpen(null)
    setAssociateProjectDialogOpen(true)
  }

  const handleProjectSelect = async (project: Project): Promise<boolean> => {
    if (currentSessionToAssociate === null) {
      notify('未找到待关联会话，请重新从会话菜单进入关联项目')
      setAssociateProjectDialogOpen(false)
      setCurrentSessionToAssociate(null)
      return false
    }

    const currentSession = currentSessionToAssociate
    setIsAssociatingProject(true)

    try {
      if (callbacks.onAssociateProject) {
        await callbacks.onAssociateProject(currentSession, project.id)
      }
      notify(
        `会话"${currentSession.title}"已${
          typeof currentSession.projectId === 'number' ? '转移关联到' : '关联到'
        }项目"${project.name}"`,
      )
      setAssociateProjectDialogOpen(false)
      setCurrentSessionToAssociate(null)
      return true
    } catch (error) {
      console.error('关联项目失败:', error)
      notify('关联项目失败，请稍后重试')
      return false
    } finally {
      setIsAssociatingProject(false)
    }
  }

  const handleCreateNewProject = (): void => {
    setAssociateProjectDialogOpen(false)
    setQuickCreateProjectOpen(true)
  }

  const handleExportSession = async (session: Session): Promise<void> => {
    setSessionMenuOpen(null)

    try {
      if (callbacks.onExportSession) {
        await callbacks.onExportSession(session.id)
        return
      }

      const detailedSession = await sessionService.getSession(session.id)
      const { exportSessions } = await import('@/utils/exportUtils')
      const exportTask = await exportSessions([detailedSession], {
        format: 'zip',
        compress: true,
        includeAttachments: true,
      })
      if (exportTask.status !== 'completed') {
        throw new Error(exportTask.error || '导出文件生成失败')
      }

      notify(`会话"${session.title}"导出成功`)
    } catch (error) {
      console.error('导出会话失败:', error)
      notify('导出会话失败，请稍后重试')
    }
  }

  // 历史数据相关
  const [historySearchKeyword, setHistorySearchKeyword] = useState('')
  const [historySearchType, setHistorySearchType] = useState('')
  const [historySearchDateFrom, setHistorySearchDateFrom] = useState('')
  const [historySearchDateTo, setHistorySearchDateTo] = useState('')
  const historySearchSort: 'date' | 'title' | 'type' = 'date'
  const historySearchSortOrder: 'asc' | 'desc' = 'desc'
  const [historySearchLoading, setHistorySearchLoading] = useState(false)
  const [historySearchError, setHistorySearchError] = useState<unknown>(null)
  const [historySearchResults, setHistorySearchResults] = useState<HistoryDataItem[]>([])
  const [lastInjectedHistory, setLastInjectedHistory] = useState<HistoryDataItem | null>(null)

  const handleHistorySearch = async (
    keyword: string,
    type?: string,
    dateFrom?: string,
    dateTo?: string,
  ) => {
    setHistorySearchKeyword(keyword)
    if (type) setHistorySearchType(type)
    if (dateFrom) setHistorySearchDateFrom(dateFrom)
    if (dateTo) setHistorySearchDateTo(dateTo)

    setHistorySearchLoading(true)
    setHistorySearchError(null)

    try {
      const response = await historyService.searchHistoryData({
        keyword,
        type,
        dateFrom,
        dateTo,
        page: 1,
        pageSize: 50,
        sortBy: historySearchSort,
        sortOrder: historySearchSortOrder,
      })

      const results = response.items ?? []
      setHistorySearchResults(results)
      callbacks.onHistorySearchCompleted?.(results)

      if (results.length > 0) {
        notify(`找到 ${results.length} 条历史记录`)
      } else {
        notify('未找到匹配的历史记录')
      }
    } catch (error) {
      console.error('搜索历史数据失败:', error)
      setHistorySearchError(error)
      setHistorySearchResults([])
      notify('搜索历史数据失败，请稍后重试')
    } finally {
      setHistorySearchLoading(false)
    }
  }

  const handleHistoryInject = (item: HistoryDataItem) => {
    setLastInjectedHistory(item)
    if (callbacks.onHistoryInject) {
      callbacks.onHistoryInject(item)
    }
    notify('Injected "' + item.title + '" into input area')
  }

  const handleDissociateProject = (session: Session): void => {
    setSessionMenuOpen(null)
    showConfirm(
      '取消关联',
      `确定要取消会话"${session.title}"与项目的关联吗？取消后该会话将移至独立会话列表。`,
      async () => {
        try {
          if (callbacks.onDissociateProject) {
            await callbacks.onDissociateProject(session)
          }
          notify(`会话"${session.title}"已取消项目关联`)
        } catch (error) {
          console.error('取消关联项目失败:', error)
          notify('取消关联项目失败，请稍后重试')
        } finally {
          hideConfirm()
        }
      },
    )
  }

  const handleDeleteSession = (session: Session): void => {
    setSessionMenuOpen(null)
    showConfirm('删除会话', `确定要删除会话"${session.title}"吗？此操作不可撤销。`, async () => {
      try {
        if (callbacks.onDeleteSession) {
          await callbacks.onDeleteSession(session.id)
        }
        notify(`会话"${session.title}"已删除`)
      } catch (error) {
        console.error('删除会话失败:', error)
        notify('删除会话失败，请稍后重试')
      } finally {
        hideConfirm()
      }
    })
  }

  return {
    sessionMenuOpen,
    setSessionMenuOpen,
    renamingSessionId,
    renameValue,
    setRenameValue,
    sessionMenuRefs,
    associateProjectDialogOpen,
    setAssociateProjectDialogOpen,
    currentSessionToAssociate,
    currentSessionProjectId: currentSessionToAssociate?.projectId ?? null,
    isAssociatingProject,
    currentSessionTitle: currentSessionToAssociate?.title ?? '',
    handleRenameSession,
    confirmRename,
    cancelRename,
    handleAssociateProject,
    handleDissociateProject,
    handleProjectSelect,
    handleCreateNewProject,
    handleExportSession,
    handleDeleteSession,
    historySearchState: {
      keyword: historySearchKeyword,
      type: historySearchType,
      dateFrom: historySearchDateFrom,
      dateTo: historySearchDateTo,
      sortBy: historySearchSort,
      sortOrder: historySearchSortOrder,
      loading: historySearchLoading,
      error: historySearchError,
      results: historySearchResults,
      lastInjected: lastInjectedHistory,
    },
    handleHistorySearch,
    handleHistoryInject,
  }
}
