import { describe, expect, jest, test } from '@jest/globals'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import userEvent from '@testing-library/user-event'

jest.mock('@/components/ui/motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) =>
      React.createElement('div', props, children),
  },
}))

import { LocalHistoryFilesDialog } from '../LocalHistoryFilesDialog'

describe('LocalHistoryFilesDialog', () => {
  test('shows individual downloadable files instead of grouping by session', () => {
    render(
      React.createElement(LocalHistoryFilesDialog, {
        isOpen: true,
        onClose: jest.fn(),
        onConfirm: jest.fn(),
        themeColor: '#10b981',
        sessions: [
          {
            id: 586,
            userId: 1,
            projectId: 9,
            title: '技术背景研究报告',
            toolType: 'workflow',
            modelVersion: 'fast',
            status: 'completed',
            createdAt: '2026-03-22 10:05:00',
            updatedAt: '2026-03-22 10:05:00',
            type: 1,
            answer_text: '正文摘要',
            file_url: '',
            file_output: [
              {
                filename: '技术背景研究报告.docx',
                url: '/files/tools/tech-landscape.docx?sign=1',
                mime_type:
                  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              },
              {
                filename: '技术背景研究报告-附录.docx',
                url: '/files/tools/tech-landscape-appendix.docx?sign=2',
                mime_type:
                  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              },
            ],
            api_name: '技术背景研究报告-Basic-1.0.1',
          },
        ],
      }),
    )

    expect(screen.getByText('选择要读取的项目下载文件')).toBeTruthy()
    expect(screen.queryByText('当前项目暂无可读取的项目下载文件')).toBeNull()
    expect(screen.getByText('技术背景研究报告.docx')).toBeTruthy()
    expect(screen.getByText('技术背景研究报告-附录.docx')).toBeTruthy()
    expect(screen.getAllByText('文档附件')).toHaveLength(2)
    expect(screen.getByText(/共 2 项/)).toBeTruthy()

    const selectAllCheckbox = screen.getByRole('checkbox', { name: '全选当前页' })
    const visibleBox = selectAllCheckbox.nextElementSibling

    expect(selectAllCheckbox).toHaveClass('peer')
    expect(visibleBox).toHaveClass('peer-focus-visible:ring-2')
    expect(visibleBox).toHaveStyle({ '--tw-ring-color': '#10b981' })
  })

  test('confirms only the selected file items from a multi-file session', async () => {
    const user = userEvent.setup()
    const onConfirm = jest.fn()
    const onClose = jest.fn()

    render(
      React.createElement(LocalHistoryFilesDialog, {
        isOpen: true,
        onClose,
        onConfirm,
        themeColor: '#10b981',
        sessions: [
          {
            id: 586,
            userId: 1,
            projectId: 9,
            title: '技术背景研究报告',
            toolType: 'workflow',
            modelVersion: 'fast',
            status: 'completed',
            createdAt: '2026-03-22 10:05:00',
            updatedAt: '2026-03-22 10:05:00',
            type: 1,
            answer_text: '正文摘要',
            file_url: '',
            file_output: [
              {
                filename: '技术背景研究报告.docx',
                url: '/files/tools/tech-landscape.docx?sign=1',
                mime_type:
                  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              },
              {
                filename: '技术背景研究报告-附录.docx',
                url: '/files/tools/tech-landscape-appendix.docx?sign=2',
                mime_type:
                  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              },
            ],
            api_name: '技术背景研究报告-Basic-1.0.1',
          },
        ],
      }),
    )

    await user.click(screen.getByText('技术背景研究报告-附录.docx'))
    await user.click(screen.getByRole('button', { name: '确认读取' }))

    expect(onConfirm).toHaveBeenCalledWith(
      ['技术背景研究报告-附录.docx'],
      [
        expect.objectContaining({
          url: '/files/tools/tech-landscape-appendix.docx?sign=2',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          name: '技术背景研究报告-附录.docx',
        }),
      ],
    )
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  test('lets keyboard users focus file rows and toggle them with Space', async () => {
    render(
      React.createElement(LocalHistoryFilesDialog, {
        isOpen: true,
        onClose: jest.fn(),
        onConfirm: jest.fn(),
        themeColor: '#10b981',
        sessions: [
          {
            id: 586,
            userId: 1,
            projectId: 9,
            title: '技术背景研究报告',
            toolType: 'workflow',
            modelVersion: 'fast',
            status: 'completed',
            createdAt: '2026-03-22 10:05:00',
            updatedAt: '2026-03-22 10:05:00',
            type: 1,
            answer_text: '正文摘要',
            file_url: '',
            file_output: [
              {
                filename: '技术背景研究报告.docx',
                url: '/files/tools/tech-landscape.docx?sign=1',
                mime_type:
                  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              },
            ],
            api_name: '技术背景研究报告-Basic-1.0.1',
          },
        ],
      }),
    )

    const row = screen.getByRole('checkbox', { name: /技术背景研究报告\.docx/ })
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '关闭项目下载文件选择弹窗' })).toHaveFocus(),
    )
    row.focus()
    expect(row).toHaveFocus()
    expect(row).toHaveAttribute('aria-checked', 'false')

    fireEvent.keyDown(row, { key: ' ', code: 'Space' })
    expect(screen.getByRole('checkbox', { name: /技术背景研究报告\.docx/ })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })
})
