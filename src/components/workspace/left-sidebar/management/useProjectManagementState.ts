import { useCallback, useEffect, useRef, useState } from 'react'

import type { Project, UpdateProjectRequest } from '@/types/api'
import { createRecoveryQueue } from '@/modules/workspace/hooks/sidebar/recovery-queue'

interface UseProjectManagementStateArgs {
  onProjectUpdate: (projectId: number, updates: UpdateProjectRequest) => Promise<unknown>
}

export function useProjectManagementState({ onProjectUpdate }: UseProjectManagementStateArgs) {
  const recoveryQueueRef = useRef(createRecoveryQueue())
  const [pendingRecoveryCount, setPendingRecoveryCount] = useState(0)
  const [manualExpandedProjects, setManualExpandedProjects] = useState<Record<number, boolean>>({})

  const [editingProjectNameId, setEditingProjectNameId] = useState<number | null>(null)
  const [editingProjectCustomerId, setEditingProjectCustomerId] = useState<number | null>(null)
  const [projectNameDrafts, setProjectNameDrafts] = useState<Record<number, string>>({})
  const [projectCustomerDrafts, setProjectCustomerDrafts] = useState<Record<number, string>>({})
  const projectNameInputRefs = useRef<Record<number, HTMLInputElement | null>>({})
  const projectCustomerInputRefs = useRef<Record<number, HTMLInputElement | null>>({})

  const [projectMenuOpen, setProjectMenuOpen] = useState<number | null>(null)
  const projectCardRefs = useRef<Record<number, HTMLDivElement | null>>({})

  const syncRecoveryCount = useCallback(() => {
    setPendingRecoveryCount(recoveryQueueRef.current.size())
  }, [])

  const getDefaultProjectExpanded = useCallback((_projectId: number) => false, [])

  const toggleProjectExpanded = useCallback((projectId: number) => {
    setManualExpandedProjects((prev) => ({
      ...prev,
      [projectId]: !prev[projectId],
    }))
  }, [])

  const clearExpandedProjects = useCallback(() => {
    setManualExpandedProjects({})
  }, [])

  const beginProjectNameEdit = useCallback((project: Project) => {
    setProjectNameDrafts((prev) => ({
      ...prev,
      [project.id]: prev[project.id] ?? project.name,
    }))
    setEditingProjectNameId(project.id)
  }, [])

  const cancelProjectNameEdit = useCallback((projectId: number) => {
    setProjectNameDrafts((prev) => {
      const next = { ...prev }
      delete next[projectId]
      return next
    })
    setEditingProjectNameId((current) => (current === projectId ? null : current))
  }, [])

  const commitProjectNameEdit = useCallback(
    async (project: Project) => {
      const draft = (projectNameDrafts[project.id] ?? project.name).trim()
      if (!draft) {
        setProjectNameDrafts((prev) => ({ ...prev, [project.id]: project.name }))
        setEditingProjectNameId(null)
        return
      }
      if (draft === project.name) {
        setEditingProjectNameId(null)
        return
      }
      try {
        await onProjectUpdate(project.id, { name: draft })
        setProjectNameDrafts((prev) => {
          const next = { ...prev }
          delete next[project.id]
          return next
        })
        setEditingProjectNameId(null)
      } catch (error) {
        recoveryQueueRef.current.enqueue({
          id: `project-name-${project.id}`,
          run: async () => {
            await onProjectUpdate(project.id, { name: draft })
            return true
          },
        })
        syncRecoveryCount()
        console.error('更新项目名称失败', error)
      }
    },
    [onProjectUpdate, projectNameDrafts, syncRecoveryCount],
  )

  const beginProjectCustomerEdit = useCallback((project: Project) => {
    const metadataCustomer =
      typeof project.metadata?.['customerName'] === 'string'
        ? (project.metadata?.['customerName'] as string)
        : ''
    const nextValue = project.customerName ?? metadataCustomer
    setProjectCustomerDrafts((prev) => ({
      ...prev,
      [project.id]: prev[project.id] ?? nextValue,
    }))
    setEditingProjectCustomerId(project.id)
  }, [])

  const cancelProjectCustomerEdit = useCallback((projectId: number) => {
    setProjectCustomerDrafts((prev) => {
      const next = { ...prev }
      delete next[projectId]
      return next
    })
    setEditingProjectCustomerId((current) => (current === projectId ? null : current))
  }, [])

  const commitProjectCustomerEdit = useCallback(
    async (project: Project) => {
      const metadataCustomer =
        typeof project.metadata?.['customerName'] === 'string'
          ? (project.metadata?.['customerName'] as string)
          : ''
      const fallback = project.customerName ?? metadataCustomer
      const draft = (projectCustomerDrafts[project.id] ?? fallback).trim()
      const current = fallback.trim()
      if (!draft) {
        setProjectCustomerDrafts((prev) => ({ ...prev, [project.id]: current }))
        setEditingProjectCustomerId(null)
        return
      }
      if (draft === current) {
        setEditingProjectCustomerId(null)
        return
      }
      try {
        await onProjectUpdate(project.id, {
          customerName: draft,
          metadata: { customerName: draft },
        })
        setProjectCustomerDrafts((prev) => {
          const next = { ...prev }
          delete next[project.id]
          return next
        })
        setEditingProjectCustomerId(null)
      } catch (error) {
        recoveryQueueRef.current.enqueue({
          id: `project-customer-${project.id}`,
          run: async () => {
            await onProjectUpdate(project.id, {
              customerName: draft,
              metadata: { customerName: draft },
            })
            return true
          },
        })
        syncRecoveryCount()
        console.error('更新客户名称失败', error)
      }
    },
    [onProjectUpdate, projectCustomerDrafts, syncRecoveryCount],
  )

  const retryNextRecovery = useCallback(async () => {
    try {
      const retried = await recoveryQueueRef.current.retryNext()
      syncRecoveryCount()
      return retried
    } catch (error) {
      console.error('重试失败操作失败', error)
      syncRecoveryCount()
      return null
    }
  }, [syncRecoveryCount])

  useEffect(() => {
    if (projectMenuOpen === null) {
      return
    }

    const handleClickOutside = (event: MouseEvent) => {
      const container = projectCardRefs.current[projectMenuOpen]
      if (container && !container.contains(event.target as Node)) {
        setProjectMenuOpen(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [projectMenuOpen])

  useEffect(() => {
    if (editingProjectNameId !== null) {
      const input = projectNameInputRefs.current[editingProjectNameId]
      input?.focus()
      input?.select()
    }
  }, [editingProjectNameId])

  useEffect(() => {
    if (editingProjectCustomerId !== null) {
      const input = projectCustomerInputRefs.current[editingProjectCustomerId]
      input?.focus()
      input?.select()
    }
  }, [editingProjectCustomerId])

  const setProjectNameInputRef = useCallback((projectId: number, el: HTMLInputElement | null) => {
    projectNameInputRefs.current[projectId] = el
  }, [])

  const setProjectCustomerInputRef = useCallback(
    (projectId: number, el: HTMLInputElement | null) => {
      projectCustomerInputRefs.current[projectId] = el
    },
    [],
  )

  const setProjectCardRef = useCallback((projectId: number, el: HTMLDivElement | null) => {
    projectCardRefs.current[projectId] = el
  }, [])

  return {
    manualExpandedProjects,
    clearExpandedProjects,
    getDefaultProjectExpanded,
    toggleProjectExpanded,
    editingProjectNameId,
    editingProjectCustomerId,
    projectNameDrafts,
    projectCustomerDrafts,
    setProjectNameDrafts,
    setProjectCustomerDrafts,
    projectNameInputRefs,
    projectCustomerInputRefs,
    setProjectNameInputRef,
    setProjectCustomerInputRef,
    beginProjectNameEdit,
    cancelProjectNameEdit,
    commitProjectNameEdit,
    beginProjectCustomerEdit,
    cancelProjectCustomerEdit,
    commitProjectCustomerEdit,
    projectMenuOpen,
    setProjectMenuOpen,
    projectCardRefs,
    setProjectCardRef,
    pendingRecoveryCount,
    retryNextRecovery,
  }
}
