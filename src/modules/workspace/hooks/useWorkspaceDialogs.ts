import { useCallback, useMemo, useState } from 'react'

import type { SettingsPage } from '@/components/settings/constants'
import type { ConfirmDialogState } from '@/types'

import { useWorkspaceUIStore } from '../stores'

const INITIAL_CONFIRM_STATE: ConfirmDialogState = {
  isOpen: false,
  title: '',
  message: '',
  onConfirm: null,
}

export interface SettingsDialogController extends DialogController {
  openPage: (page: SettingsPage) => void
}

export interface HistoryDialogController extends DialogController {
  open: (options?: { projectId?: number; type?: string; title?: string }) => void
  setOpen: (open: boolean) => void
  options: { projectId?: number; type?: string; title?: string } | null
}

interface WorkspaceDialogsResult {
  toast: string | null
  notify: (message: string) => void
  confirmDialog: ConfirmDialogState
  showConfirm: (title: string, message: string, onConfirm: () => void) => void
  hideConfirm: () => void
  downloadDialog: {
    isOpen: boolean
    open: (options?: { exportType?: string }) => void
    close: () => void
    options: { exportType?: string } | null
  }
  settings: SettingsDialogController
  releaseNotes: DialogController
  help: DialogController
  customerService: DialogController
  rewardSuggestion: DialogController
  quickCreateProject: DialogController
  history: DialogController & {
    open: (options?: { projectId?: number; type?: string; title?: string }) => void
    setOpen: (open: boolean) => void
    options: { projectId?: number; type?: string; title?: string } | null
  }
  localHistory: DialogController & {
    open: (options?: {
      projectId?: number
      title?: string
      sessions?: import('@/types/api').Session[]
    }) => void
    setOpen: (open: boolean) => void
    options: {
      projectId?: number
      title?: string
      sessions?: import('@/types/api').Session[]
    } | null
  }
  settingsPage: SettingsPage
}

export interface DialogController {
  isOpen: boolean
  open: () => void
  close: () => void
}

export function useWorkspaceDialogs(): WorkspaceDialogsResult {
  const {
    toast,
    showToast,
    settingsOpen,
    setSettingsOpen,
    settingsPage,
    setSettingsPage,
    releaseNotesOpen,
    setReleaseNotesOpen,
    helpOpen,
    setHelpOpen,
    customerServiceOpen,
    setCustomerServiceOpen,
    rewardSuggestionOpen,
    setRewardSuggestionOpen,
    quickCreateProjectOpen,
    setQuickCreateProjectOpen,
    historyDialogOpen,
    setHistoryDialogOpen,
    historyDialogOptions,
    setHistoryDialogOptions,
    localHistoryFilesDialogOpen,
    setLocalHistoryFilesDialogOpen,
    localHistoryFilesDialogOptions,
    setLocalHistoryFilesDialogOptions,
  } = useWorkspaceUIStore()

  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false)
  const [downloadDialogOptions, setDownloadDialogOptions] = useState<{
    exportType?: string
  } | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>(INITIAL_CONFIRM_STATE)

  const showConfirm = useCallback((title: string, message: string, onConfirm: () => void) => {
    setConfirmDialog({ isOpen: true, title, message, onConfirm })
  }, [])

  const hideConfirm = useCallback(() => {
    setConfirmDialog(INITIAL_CONFIRM_STATE)
  }, [])

  const notify = useCallback(
    (message: string) => {
      showToast(message)
    },
    [showToast],
  )

  const createController = useCallback(
    (isOpen: boolean, setter: (open: boolean) => void): DialogController => ({
      isOpen,
      open: () => setter(true),
      close: () => setter(false),
    }),
    [],
  )

  const settings = useMemo<SettingsDialogController>(
    () => ({
      ...createController(settingsOpen, setSettingsOpen),
      openPage: (page: SettingsPage) => {
        setSettingsPage(page)
        setSettingsOpen(true)
      },
    }),
    [createController, setSettingsOpen, setSettingsPage, settingsOpen],
  )
  const help = useMemo(
    () => createController(helpOpen, setHelpOpen),
    [createController, helpOpen, setHelpOpen],
  )
  const releaseNotes = useMemo(
    () => createController(releaseNotesOpen, setReleaseNotesOpen),
    [createController, releaseNotesOpen, setReleaseNotesOpen],
  )
  const customerService = useMemo(
    () => createController(customerServiceOpen, setCustomerServiceOpen),
    [createController, customerServiceOpen, setCustomerServiceOpen],
  )
  const rewardSuggestion = useMemo(
    () => createController(rewardSuggestionOpen, setRewardSuggestionOpen),
    [createController, rewardSuggestionOpen, setRewardSuggestionOpen],
  )
  const quickCreateProject = useMemo(
    () => createController(quickCreateProjectOpen, setQuickCreateProjectOpen),
    [createController, quickCreateProjectOpen, setQuickCreateProjectOpen],
  )
  const history = useMemo(() => {
    return {
      isOpen: historyDialogOpen,
      open: (options?: { projectId?: number; type?: string; title?: string }) => {
        setHistoryDialogOptions(options || null)
        setHistoryDialogOpen(true)
      },
      close: () => {
        setHistoryDialogOpen(false)
        setHistoryDialogOptions(null)
      },
      setOpen: setHistoryDialogOpen,
      options: historyDialogOptions,
    }
  }, [historyDialogOpen, setHistoryDialogOpen, setHistoryDialogOptions, historyDialogOptions])

  const localHistory = useMemo(() => {
    return {
      isOpen: localHistoryFilesDialogOpen,
      open: (options?: {
        projectId?: number
        title?: string
        sessions?: import('@/types/api').Session[]
      }) => {
        setLocalHistoryFilesDialogOptions(options || null)
        setLocalHistoryFilesDialogOpen(true)
      },
      close: () => {
        setLocalHistoryFilesDialogOpen(false)
        setLocalHistoryFilesDialogOptions(null)
      },
      setOpen: setLocalHistoryFilesDialogOpen,
      options: localHistoryFilesDialogOptions,
    }
  }, [
    localHistoryFilesDialogOpen,
    setLocalHistoryFilesDialogOpen,
    setLocalHistoryFilesDialogOptions,
    localHistoryFilesDialogOptions,
  ])

  const downloadDialog = useMemo(
    () => ({
      isOpen: downloadDialogOpen,
      open: (options?: { exportType?: string }) => {
        setDownloadDialogOptions(options || null)
        setDownloadDialogOpen(true)
      },
      close: () => {
        setDownloadDialogOpen(false)
        setDownloadDialogOptions(null)
      },
      options: downloadDialogOptions,
    }),
    [downloadDialogOpen, downloadDialogOptions],
  )

  return {
    toast,
    notify,
    confirmDialog,
    showConfirm,
    hideConfirm,
    downloadDialog,
    settings,
    releaseNotes,
    help,
    customerService,
    rewardSuggestion,
    quickCreateProject,
    history,
    localHistory,
    settingsPage,
  }
}
