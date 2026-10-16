import React from 'react'
import type { ComponentProps, RefObject } from 'react'

import { Step } from '@/components/ui'
import { LeftSidebar, InputSection, OutputSection } from '@/components/workspace'
import type { Theme } from '@/types'
import type { WorkflowStep } from '@/types/api'

interface WorkspaceMainLayoutProps {
  layoutRef: RefObject<HTMLDivElement | null>
  middleRef: RefObject<HTMLDivElement | null>
  appliedLayout: 'horizontal' | 'vertical' | 'contrast'
  showSidebar: boolean
  showContent: boolean
  leftSidebarProps: ComponentProps<typeof LeftSidebar>
  inputSectionProps: ComponentProps<typeof InputSection>
  outputSectionProps: ComponentProps<typeof OutputSection>
  workflowSteps: WorkflowStep[]
  currentTheme: Theme
  isAsync?: boolean
}

export const WorkspaceMainLayout: React.FC<WorkspaceMainLayoutProps> = ({
  layoutRef,
  middleRef,
  appliedLayout,
  showSidebar,
  showContent,
  leftSidebarProps,
  inputSectionProps,
  outputSectionProps,
  workflowSteps,
  currentTheme,
  isAsync,
}) => {
  if (!showSidebar && !showContent) {
    return null
  }

  const isVerticalLayout = appliedLayout === 'vertical'

  const containerClass = showContent
    ? 'flex-1 flex min-h-0 overflow-hidden bg-white'
    : 'flex flex-none min-h-0 bg-white'

  const mainClass = showContent
    ? 'flex-1 min-w-0 min-h-0 flex relative'
    : 'flex items-stretch min-h-0'

  return (
    <div ref={layoutRef} className={containerClass}>
      <main className={mainClass}>
        {showSidebar && <LeftSidebar {...leftSidebarProps} />}

        {showContent && (
          <section
            id="workspace-workflow-surface"
            aria-label="工作流工作区"
            tabIndex={-1}
            className={`flex flex-col flex-1 min-h-0 ${
              isVerticalLayout ? 'overflow-y-auto' : 'overflow-hidden'
            } p-6 bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--theme-primary)]`}
          >
            {!isAsync && workflowSteps && workflowSteps.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm mb-8">
                <div className="flex items-center gap-3">
                  {workflowSteps.map((step, index) => {
                    const status = step.status ?? (index === 0 ? 'active' : 'pending')
                    return (
                      <React.Fragment key={step.label}>
                        <Step
                          i={index + 1}
                          txt={step.label}
                          status={status}
                          color={currentTheme.primary}
                        />
                        {index < workflowSteps.length - 1 && <div className="w-6 step-separator" />}
                      </React.Fragment>
                    )
                  })}
                </div>
              </div>
            )}

            <div
              ref={middleRef}
              className={`flex ${
                appliedLayout === 'horizontal' || appliedLayout === 'contrast'
                  ? 'flex-1 min-h-0 flex-row gap-6'
                  : 'flex-1 min-h-0 flex-col gap-6'
              }`}
            >
              <InputSection {...inputSectionProps} />
              <OutputSection {...outputSectionProps} />
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

WorkspaceMainLayout.displayName = 'WorkspaceMainLayout'
