import React from 'react'

import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { describe, expect, jest, test } from '@jest/globals'

import type { Theme } from '@/types'

import { AttachmentBar } from './AttachmentBar'

jest.mock('../ui', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react')

  return {
    Tooltip: ({ children }: { children: React.ReactNode }) =>
      ReactModule.createElement(ReactModule.Fragment, null, children),
    ActionBtn: ({
      children,
      ariaLabel,
      disabled,
      onClick,
    }: {
      children: React.ReactNode
      ariaLabel?: string
      disabled?: boolean
      onClick?: () => void
    }) =>
      ReactModule.createElement(
        'button',
        { type: 'button', 'aria-label': ariaLabel, disabled, onClick },
        children,
      ),
    AttachBadge: ({ att }: { att: { name?: string; id: string } }) =>
      ReactModule.createElement('span', null, att.name ?? att.id),
  }
})

const theme: Theme = {
  background: '#f5fff8',
  primary: '#32c787',
  primaryHover: '#2cab74',
  name: 'green',
}

function renderBar(overrides: { panelWidth: number; secondaryAction?: React.ReactNode }) {
  return render(
    <AttachmentBar
      panelWidth={overrides.panelWidth}
      attachments={[]}
      onRemoveAttachment={() => undefined}
      readMenu={<button type="button">读取</button>}
      secondaryAction={overrides.secondaryAction ?? null}
      chatInput="已有输入"
      onClearChat={() => undefined}
      onSendChat={() => undefined}
      onStartNewConversation={() => undefined}
      theme={theme}
      loading={false}
    />,
  )
}

const singleSecondary = (
  <button key="library" type="button">
    指令库Ⅲ
  </button>
)

const multiSecondary = [
  <button key="associate" type="button">
    关联项目
  </button>,
  <button key="library" type="button">
    指令库
  </button>,
]

/* ------------------------------------------------------------------ */
/*  Main Flow: page narrow → bar stays single row → narrower → wraps  */
/*             → page restore → bar returns to single row             */
/* ------------------------------------------------------------------ */
describe('Main Flow: responsive width transition', () => {
  test('single secondary stays on main row when width is still sufficient (500px)', () => {
    renderBar({ panelWidth: 500, secondaryAction: singleSecondary })

    const middleActions = screen.getByTestId('attachment-bar-secondary-actions')
    expect(middleActions.className).not.toContain('basis-full')
    expect(middleActions.className).toContain('order-2')
  })

  test('single secondary stays on main row at the exact breakpoint edge (503px)', () => {
    // availableWidth = 503 - 24 = 479, just below 480 compact threshold
    renderBar({ panelWidth: 503, secondaryAction: singleSecondary })

    const middleActions = screen.getByTestId('attachment-bar-secondary-actions')
    // Single secondary: even in compact, no basis-full
    expect(middleActions.className).not.toContain('basis-full')
  })

  test('single secondary stays on main row just above breakpoint (505px)', () => {
    // availableWidth = 505 - 24 = 481, just above 480 → normal layout
    renderBar({ panelWidth: 505, secondaryAction: singleSecondary })

    const middleActions = screen.getByTestId('attachment-bar-secondary-actions')
    expect(middleActions.className).not.toContain('basis-full')
    // Normal layout: should have flex-1 and justify-center
    expect(middleActions.className).toContain('flex-1')
    expect(middleActions.className).toContain('justify-center')
  })

  test('re-rendering from wide → narrow → wide restores single-row layout', () => {
    // Phase 1: wide (640px) — normal three-section layout
    const { rerender } = renderBar({ panelWidth: 640, secondaryAction: singleSecondary })
    let middleActions = screen.getByTestId('attachment-bar-secondary-actions')
    expect(middleActions.className).not.toContain('basis-full')
    expect(middleActions.className).toContain('flex-1')

    // Phase 2: narrow (400px) — compact, single secondary still on main row
    rerender(
      <AttachmentBar
        panelWidth={400}
        attachments={[]}
        onRemoveAttachment={() => undefined}
        readMenu={<button type="button">读取</button>}
        secondaryAction={singleSecondary}
        chatInput="已有输入"
        onClearChat={() => undefined}
        onSendChat={() => undefined}
        onStartNewConversation={() => undefined}
        theme={theme}
        loading={false}
      />,
    )
    middleActions = screen.getByTestId('attachment-bar-secondary-actions')
    expect(middleActions.className).not.toContain('basis-full')
    // Compact layout: no flex-1, no justify-center
    expect(middleActions.className).not.toContain('flex-1')

    // Phase 3: restore to wide (640px) — should return to normal layout
    rerender(
      <AttachmentBar
        panelWidth={640}
        attachments={[]}
        onRemoveAttachment={() => undefined}
        readMenu={<button type="button">读取</button>}
        secondaryAction={singleSecondary}
        chatInput="已有输入"
        onClearChat={() => undefined}
        onSendChat={() => undefined}
        onStartNewConversation={() => undefined}
        theme={theme}
        loading={false}
      />,
    )
    middleActions = screen.getByTestId('attachment-bar-secondary-actions')
    expect(middleActions.className).not.toContain('basis-full')
    expect(middleActions.className).toContain('flex-1')
    expect(middleActions.className).toContain('justify-center')
  })
})

/* ------------------------------------------------------------------ */
/*  Boundary 1: general tab — single middle button (指令库Ⅲ)           */
/*  Must NOT prematurely fall to an isolated second row               */
/* ------------------------------------------------------------------ */
describe('Boundary 1: general tab single middle button', () => {
  test('single button stays on main row at 500px — does NOT create isolated second row', () => {
    renderBar({ panelWidth: 500, secondaryAction: singleSecondary })

    const leftTools = screen.getByTestId('attachment-bar-left-tools')
    const middleActions = screen.getByTestId('attachment-bar-secondary-actions')
    const sendActions = screen.getByTestId('attachment-bar-send-actions')

    // All three sections share the same visual row
    // left: order-1, middle: order-2, send: order-3
    expect(leftTools.className).toContain('order-1')
    expect(middleActions.className).toContain('order-2')
    expect(middleActions.className).not.toContain('basis-full')
    expect(sendActions.className).toContain('order-3')
  })

  test('single button stays on main row even at 390px — no isolated second row', () => {
    renderBar({ panelWidth: 390, secondaryAction: singleSecondary })

    const middleActions = screen.getByTestId('attachment-bar-secondary-actions')
    expect(middleActions.className).not.toContain('basis-full')
    expect(middleActions.className).toContain('order-2')
  })

  test('single button stays on main row at MIN_CHAT_PANEL_WIDTH (360px)', () => {
    renderBar({ panelWidth: 360, secondaryAction: singleSecondary })

    const middleActions = screen.getByTestId('attachment-bar-secondary-actions')
    expect(middleActions.className).not.toContain('basis-full')
  })

  test('no secondary at all — middle zone is omitted, left and send are adjacent', () => {
    renderBar({ panelWidth: 400, secondaryAction: null })

    expect(screen.queryByTestId('attachment-bar-secondary-actions')).not.toBeInTheDocument()
    expect(screen.getByTestId('attachment-bar-left-tools')).toBeInTheDocument()
    expect(screen.getByTestId('attachment-bar-send-actions')).toBeInTheDocument()
  })
})

/* ------------------------------------------------------------------ */
/*  Boundary 2: non-general tab — multiple middle buttons              */
/*  Compact: stack to second row; wide: restore to single row          */
/* ------------------------------------------------------------------ */
describe('Boundary 2: non-general tab multiple middle buttons', () => {
  test('multiple secondary actions stack onto dedicated row when narrow', () => {
    renderBar({ panelWidth: 420, secondaryAction: multiSecondary })

    const leftTools = screen.getByTestId('attachment-bar-left-tools')
    const middleActions = screen.getByTestId('attachment-bar-secondary-actions')
    const sendActions = screen.getByTestId('attachment-bar-send-actions')

    // shouldStackSecondaryRow = true (compact + >1 items)
    expect(leftTools.className).toContain('order-1')
    expect(sendActions.className).toContain('order-2')
    expect(middleActions.className).toContain('basis-full')
    expect(middleActions.className).toContain('order-3')
  })

  test('multiple secondary actions return to single row when width restored', () => {
    const { rerender } = renderBar({ panelWidth: 420, secondaryAction: multiSecondary })

    // Verify stacked
    let middleActions = screen.getByTestId('attachment-bar-secondary-actions')
    expect(middleActions.className).toContain('basis-full')

    // Restore width
    rerender(
      <AttachmentBar
        panelWidth={640}
        attachments={[]}
        onRemoveAttachment={() => undefined}
        readMenu={<button type="button">读取</button>}
        secondaryAction={multiSecondary}
        chatInput="已有输入"
        onClearChat={() => undefined}
        onSendChat={() => undefined}
        onStartNewConversation={() => undefined}
        theme={theme}
        loading={false}
      />,
    )

    middleActions = screen.getByTestId('attachment-bar-secondary-actions')
    expect(middleActions.className).not.toContain('basis-full')
    expect(middleActions.className).toContain('flex-1')
    expect(middleActions.className).toContain('justify-center')
  })

  test('multiple secondary actions at breakpoint boundary (504px) — still normal layout', () => {
    // availableWidth = 504 - 24 = 480, NOT < 480 → normal
    renderBar({ panelWidth: 504, secondaryAction: multiSecondary })

    const middleActions = screen.getByTestId('attachment-bar-secondary-actions')
    expect(middleActions.className).not.toContain('basis-full')
  })

  test('multiple secondary actions at breakpoint boundary (503px) — switches to compact stacking', () => {
    // availableWidth = 503 - 24 = 479, < 480 → compact + >1 items → stack
    renderBar({ panelWidth: 503, secondaryAction: multiSecondary })

    const middleActions = screen.getByTestId('attachment-bar-secondary-actions')
    expect(middleActions.className).toContain('basis-full')
  })
})

/* ------------------------------------------------------------------ */
/*  Boundary 3: width helpers — user drag vs. viewport resize         */
/* ------------------------------------------------------------------ */
describe('Boundary 3: compact breakpoint edge cases', () => {
  test('container class transitions between compact and normal at breakpoint', () => {
    const { container, rerender } = renderBar({
      panelWidth: 505,
      secondaryAction: singleSecondary,
    })
    // Normal: items-center
    let barContainer = container.querySelector('.flex.w-full')
    expect(barContainer?.className).toContain('items-center')
    expect(barContainer?.className).not.toContain('items-start')

    // Compact: items-start
    rerender(
      <AttachmentBar
        panelWidth={400}
        attachments={[]}
        onRemoveAttachment={() => undefined}
        readMenu={<button type="button">读取</button>}
        secondaryAction={singleSecondary}
        chatInput="已有输入"
        onClearChat={() => undefined}
        onSendChat={() => undefined}
        onStartNewConversation={() => undefined}
        theme={theme}
        loading={false}
      />,
    )
    barContainer = container.querySelector('.flex.w-full')
    expect(barContainer?.className).toContain('items-start')

    // Back to normal
    rerender(
      <AttachmentBar
        panelWidth={505}
        attachments={[]}
        onRemoveAttachment={() => undefined}
        readMenu={<button type="button">读取</button>}
        secondaryAction={singleSecondary}
        chatInput="已有输入"
        onClearChat={() => undefined}
        onSendChat={() => undefined}
        onStartNewConversation={() => undefined}
        theme={theme}
        loading={false}
      />,
    )
    barContainer = container.querySelector('.flex.w-full')
    expect(barContainer?.className).toContain('items-center')
    expect(barContainer?.className).not.toContain('items-start')
  })

  test('left tools flex-1 only when stacking secondary row', () => {
    // Multi secondary, narrow → shouldStackSecondaryRow → left gets flex-1
    const { rerender } = renderBar({ panelWidth: 400, secondaryAction: multiSecondary })
    let leftTools = screen.getByTestId('attachment-bar-left-tools')
    expect(leftTools.className).toContain('flex-1')

    // Single secondary, same width → shouldStackSecondaryRow is false → no flex-1
    rerender(
      <AttachmentBar
        panelWidth={400}
        attachments={[]}
        onRemoveAttachment={() => undefined}
        readMenu={<button type="button">读取</button>}
        secondaryAction={singleSecondary}
        chatInput="已有输入"
        onClearChat={() => undefined}
        onSendChat={() => undefined}
        onStartNewConversation={() => undefined}
        theme={theme}
        loading={false}
      />,
    )
    leftTools = screen.getByTestId('attachment-bar-left-tools')
    expect(leftTools.className).not.toContain('flex-1')
  })

  test('send actions get ml-auto for right alignment in all layouts', () => {
    const { rerender } = renderBar({ panelWidth: 640, secondaryAction: multiSecondary })
    let sendActions = screen.getByTestId('attachment-bar-send-actions')
    expect(sendActions.className).toContain('ml-auto')

    rerender(
      <AttachmentBar
        panelWidth={400}
        attachments={[]}
        onRemoveAttachment={() => undefined}
        readMenu={<button type="button">读取</button>}
        secondaryAction={multiSecondary}
        chatInput="已有输入"
        onClearChat={() => undefined}
        onSendChat={() => undefined}
        onStartNewConversation={() => undefined}
        theme={theme}
        loading={false}
      />,
    )
    sendActions = screen.getByTestId('attachment-bar-send-actions')
    expect(sendActions.className).toContain('ml-auto')
  })
})
