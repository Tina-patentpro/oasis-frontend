import React from 'react'
import { describe, expect, test } from '@jest/globals'
import { render, screen } from '@testing-library/react'

import { GlobalLayout } from './GlobalLayout'

describe('GlobalLayout', () => {
  test('does not create a second main landmark around page content', () => {
    render(
      <GlobalLayout headerVisible={false} customHeader={null}>
        <main id="main-content" tabIndex={-1}>
          页面内容
        </main>
      </GlobalLayout>,
    )

    expect(screen.getAllByRole('main')).toHaveLength(1)
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content')
  })
})
