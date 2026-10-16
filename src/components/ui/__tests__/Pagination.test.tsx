import { describe, expect, jest, test } from '@jest/globals'
import { fireEvent, render, screen } from '@testing-library/react'

import { Pagination } from '../Pagination'

describe('Pagination', () => {
  test('uses non-submit buttons for page navigation and changes pages', () => {
    const onPageChange = jest.fn()

    render(
      <Pagination
        currentPage={2}
        totalPages={4}
        pageSize={10}
        total={35}
        onPageChange={onPageChange}
        showPageSizeSelector={false}
      />,
    )

    const firstButton = screen.getByRole('button', { name: '第一页' })
    const previousButton = screen.getByRole('button', { name: '上一页' })
    const pageThreeButton = screen.getByRole('button', { name: '3' })
    const nextButton = screen.getByRole('button', { name: '下一页' })
    const lastButton = screen.getByRole('button', { name: '最后一页' })

    for (const button of [firstButton, previousButton, pageThreeButton, nextButton, lastButton]) {
      expect(button).toHaveAttribute('type', 'button')
    }

    fireEvent.click(pageThreeButton)
    fireEvent.click(nextButton)
    fireEvent.click(firstButton)

    expect(onPageChange).toHaveBeenNthCalledWith(1, 3)
    expect(onPageChange).toHaveBeenNthCalledWith(2, 3)
    expect(onPageChange).toHaveBeenNthCalledWith(3, 1)
  })

  test('labels the page size selector for assistive technology', () => {
    const onPageSizeChange = jest.fn()

    render(
      <Pagination
        currentPage={1}
        totalPages={3}
        pageSize={10}
        total={25}
        onPageChange={jest.fn()}
        onPageSizeChange={onPageSizeChange}
      />,
    )

    const pageSizeSelect = screen.getByRole('combobox', { name: '每页条数' })
    expect(pageSizeSelect).toHaveValue('10')

    fireEvent.change(pageSizeSelect, { target: { value: '20' } })

    expect(onPageSizeChange).toHaveBeenCalledWith(20)
  })
})
