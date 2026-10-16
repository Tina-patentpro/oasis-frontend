import { type MutableRefObject, useEffect, useRef } from 'react'

import {
  areProjectOrdersEqual,
  shouldPersistReconciledProjectOrder,
  shouldPromoteAnonymousProjectOrder,
} from './filtering'
import type { ProjectOrderState } from './project-reorder-control'

interface ProjectOrderLifecycleParams {
  anonymousOrderChangedInSessionRef: MutableRefObject<boolean>
  anonymousProjectOrderKey: string
  clearProjectOrderForUser: (key: string) => void
  currentUserProjectOrderKey: string
  previousProjectOrderKeyRef: MutableRefObject<string>
  projectOrderByUser: Record<string, ProjectOrderState | undefined>
  projectTotal: number
  projectTotalPages: number
  rawProjectCount: number
  reconciledProjectOrder: ProjectOrderState
  setProjectOrderForUser: (key: string, order: ProjectOrderState) => void
  storedProjectOrder: ProjectOrderState | null
}

export function useProjectOrderLifecycle({
  anonymousOrderChangedInSessionRef,
  anonymousProjectOrderKey,
  clearProjectOrderForUser,
  currentUserProjectOrderKey,
  previousProjectOrderKeyRef,
  projectOrderByUser,
  projectTotal,
  projectTotalPages,
  rawProjectCount,
  reconciledProjectOrder,
  setProjectOrderForUser,
  storedProjectOrder,
}: ProjectOrderLifecycleParams): void {
  const skipNextReconciledPersistRef = useRef(false)

  useEffect(() => {
    const previousKey = previousProjectOrderKeyRef.current
    previousProjectOrderKeyRef.current = currentUserProjectOrderKey

    const switchedFromAnonymousToUser =
      previousKey === anonymousProjectOrderKey &&
      currentUserProjectOrderKey !== anonymousProjectOrderKey
    if (!switchedFromAnonymousToUser || !anonymousOrderChangedInSessionRef.current) {
      return
    }

    const anonymousOrder = projectOrderByUser[anonymousProjectOrderKey] ?? null
    const userOrder = projectOrderByUser[currentUserProjectOrderKey] ?? null
    const shouldPromote = shouldPromoteAnonymousProjectOrder({
      switchedFromAnonymousToUser,
      anonymousOrderChangedInSession: anonymousOrderChangedInSessionRef.current,
      userOrder,
      anonymousOrder,
    })
    if (anonymousOrder && shouldPromote) {
      setProjectOrderForUser(currentUserProjectOrderKey, anonymousOrder)
      skipNextReconciledPersistRef.current = true
    }
    if (anonymousOrder) {
      clearProjectOrderForUser(anonymousProjectOrderKey)
    }
    anonymousOrderChangedInSessionRef.current = false
  }, [
    anonymousOrderChangedInSessionRef,
    anonymousProjectOrderKey,
    clearProjectOrderForUser,
    currentUserProjectOrderKey,
    previousProjectOrderKeyRef,
    projectOrderByUser,
    setProjectOrderForUser,
  ])

  useEffect(() => {
    if (skipNextReconciledPersistRef.current) {
      skipNextReconciledPersistRef.current = false
      return
    }
    if (
      !shouldPersistReconciledProjectOrder({
        projectTotalPages,
        projectTotal,
        rawProjectCount,
      })
    ) {
      return
    }
    if (areProjectOrdersEqual(storedProjectOrder, reconciledProjectOrder)) {
      return
    }
    setProjectOrderForUser(currentUserProjectOrderKey, reconciledProjectOrder)
  }, [
    currentUserProjectOrderKey,
    projectTotal,
    projectTotalPages,
    rawProjectCount,
    reconciledProjectOrder,
    setProjectOrderForUser,
    storedProjectOrder,
  ])
}
