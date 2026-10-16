import { describe, expect, test } from '@jest/globals'

import { rankSections } from './priority'

describe('rankSections', () => {
  test('puts required fields before optional fields', () => {
    const fields = [
      { key: 'b', required: false },
      { key: 'a', required: true },
    ]
    expect(rankSections(fields).map((f) => f.key)).toEqual(['a', 'b'])
  })

  test('keeps stable order within same required level', () => {
    const fields = [
      { key: 'a', required: true },
      { key: 'b', required: true },
      { key: 'c', required: false },
    ]
    expect(rankSections(fields).map((f) => f.key)).toEqual(['a', 'b', 'c'])
  })
})
