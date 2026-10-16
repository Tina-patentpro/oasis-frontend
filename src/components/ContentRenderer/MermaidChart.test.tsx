import React from 'react'
import { describe, expect, jest, test } from '@jest/globals'
import { render, screen, waitFor } from '@testing-library/react'

import { MermaidChart, sanitizeSvgOutput } from './MermaidChart'

const mermaidInitializeMock = jest.fn()
const mermaidParseMock = jest.fn(async () => undefined)
const mermaidRenderMock = jest.fn(async () => ({
  svg: '<svg><a xlink:href="javascript:alert(1)">click</a></svg>',
}))

jest.mock('mermaid', () => ({
  __esModule: true,
  default: {
    initialize: mermaidInitializeMock,
    parse: mermaidParseMock,
    render: mermaidRenderMock,
  },
}))

describe('MermaidChart security', () => {
  test('does not return raw svg when DOMPurify is unavailable', () => {
    const originalDOMPurify = window.DOMPurify
    delete window.DOMPurify

    try {
      expect(sanitizeSvgOutput('<svg><text>unsafe fallback</text></svg>')).toBe('')
    } finally {
      window.DOMPurify = originalDOMPurify
    }
  })

  test('sanitizes svg payload containing javascript urls', async () => {
    const { container } = render(<MermaidChart chart={'graph TD; A-->B;'} />)

    await screen.findByText('click')
    const anchor = container.querySelector('a')
    const href = anchor?.getAttribute('href') ?? anchor?.getAttribute('xlink:href')
    expect(href).toBeNull()
    expect(container.innerHTML).not.toMatch(/javascript:/i)
    expect(mermaidInitializeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        flowchart: expect.objectContaining({
          htmlLabels: false,
        }),
        htmlLabels: false,
        securityLevel: 'strict',
      }),
    )
  })

  test('does not reveal raw chart source when Mermaid rendering fails', async () => {
    mermaidParseMock.mockRejectedValueOnce(new Error('Parse error'))
    const sensitiveChart = 'graph TD; A[客户手机号 13800000000] --> B[输出]'

    render(<MermaidChart chart={sensitiveChart} />)

    await screen.findByText(/图表渲染失败/)
    await waitFor(() => {
      expect(screen.queryByText(/客户手机号 13800000000/)).not.toBeInTheDocument()
    })
    expect(screen.queryByText('查看图表源码')).not.toBeInTheDocument()
  })
})
