import type { ReactNode } from 'react'

import { describe, expect, jest, test } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import {
  SUPPORTED_DOCUMENT_FORMAT_LABEL,
  SUPPORTED_IMAGE_FORMAT_LABEL,
} from '@/config/attachmentFormats'
import { InputSectionActions } from './InputSectionActions'

jest.mock('../../ui', () => ({
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

describe('InputSectionActions', () => {
  test('shows grouped guidance in non-contrast layout', () => {
    render(
      <InputSectionActions
        canTriggerReadAction={false}
        onTriggerReadAction={jest.fn()}
        readActionLabel="读取"
        readActionTooltip="仅在文件或图片参数下可用"
        onCopyInput={jest.fn()}
        onClearAll={jest.fn()}
        appliedLayout="auto"
        baseActionStyle={{}}
      />,
    )

    expect(screen.getByText('快捷操作')).toBeTruthy()
    expect(screen.getByText('生成提醒')).toBeTruthy()
    expect(screen.getByText('支持格式')).toBeTruthy()
    expect(screen.getByText(/Ctrl\/Command \+ Enter/)).toBeTruthy()
    expect(screen.getByText(/Ctrl\/Command \+ Shift \+ C/)).toBeTruthy()
    expect(screen.getByText(/Ctrl\/Command \+ Z/)).toBeTruthy()
    expect(screen.getByText('生成过程中，“生成”按钮会暂时变灰，避免重复点击。')).toBeTruthy()
    expect(screen.getByText('同步任务完成后，会在当前会话里恢复可用。')).toBeTruthy()
    expect(screen.getByText('异步任务请先点击“新会话”，再开始下一轮生成。')).toBeTruthy()
    expect(screen.getByText(SUPPORTED_DOCUMENT_FORMAT_LABEL)).toBeTruthy()
    expect(screen.getByText(SUPPORTED_IMAGE_FORMAT_LABEL)).toBeTruthy()
  })

  test('keeps read button disabled for text parameters', async () => {
    const user = userEvent.setup()
    const onTriggerReadAction = jest.fn()

    render(
      <InputSectionActions
        canTriggerReadAction={false}
        onTriggerReadAction={onTriggerReadAction}
        readActionLabel="读取"
        readActionTooltip="仅在文件或图片参数下可用"
        onCopyInput={jest.fn()}
        onClearAll={jest.fn()}
        appliedLayout="auto"
        baseActionStyle={{}}
      />,
    )

    const readButton = screen.getByRole('button', { name: '读取' })
    expect((readButton as HTMLButtonElement).disabled).toBe(true)
    expect(readButton).toHaveAccessibleDescription('仅在文件或图片参数下可用')

    await user.click(readButton)
    expect(onTriggerReadAction).not.toHaveBeenCalled()
  })

  test('enables read button for file or image parameters', async () => {
    const user = userEvent.setup()
    const onTriggerReadAction = jest.fn()

    render(
      <InputSectionActions
        canTriggerReadAction={true}
        onTriggerReadAction={onTriggerReadAction}
        readActionLabel="读取"
        readActionTooltip="从当前项目的下载文件中选择并导入到当前参数"
        onCopyInput={jest.fn()}
        onClearAll={jest.fn()}
        appliedLayout="auto"
        baseActionStyle={{}}
      />,
    )

    const readButton = screen.getByRole('button', { name: '读取' })
    expect((readButton as HTMLButtonElement).disabled).toBe(false)

    await user.click(readButton)
    expect(onTriggerReadAction).toHaveBeenCalledTimes(1)
  })

  test('shows replace label when upload limit is reached', () => {
    render(
      <InputSectionActions
        canTriggerReadAction={true}
        onTriggerReadAction={jest.fn()}
        readActionLabel="选择替换文件"
        readActionTooltip="已达上限，本次会从项目下载文件中替换当前已选文件"
        onCopyInput={jest.fn()}
        onClearAll={jest.fn()}
        appliedLayout="auto"
        baseActionStyle={{}}
      />,
    )

    expect(screen.getByRole('button', { name: '选择替换文件' })).toBeTruthy()
  })
})
