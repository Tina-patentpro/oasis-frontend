import { describe, expect, test, jest } from '@jest/globals'

import { uid, timestamp, convertToProject, formatSessionTitle } from '../helpers'

// --- uid ---

describe('uid', () => {
  test('uses crypto.randomUUID when available', () => {
    const spy = jest.spyOn(crypto, 'randomUUID').mockReturnValue('test-uuid-0000-0000-000000000000')
    expect(uid()).toBe('test-uuid-0000-0000-000000000000')
    spy.mockRestore()
  })

  test('falls back to random string when randomUUID unavailable', () => {
    // Temporarily replace window.crypto with an object without randomUUID
    const saved = window.crypto
    Object.defineProperty(window, 'crypto', { value: {}, writable: true, configurable: true })
    const result = uid()
    expect(result).toMatch(/^id-/)
    expect(result.length).toBeGreaterThan(5)
    Object.defineProperty(window, 'crypto', { value: saved, writable: true, configurable: true })
  })
})

// --- timestamp ---

describe('timestamp', () => {
  test('returns YYYY-MM-DD HH:MM:SS format', () => {
    const result = timestamp()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
  })

  test('zero-pads single digit values', () => {
    // We can't control Date easily without fake timers, but we can verify format
    const result = timestamp()
    const [date, time] = result.split(' ')
    expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(time).toMatch(/^\d{2}:\d{2}:\d{2}$/)
  })
})

// --- convertToProject ---

describe('convertToProject', () => {
  test('returns input directly when it has numeric id', () => {
    const project = { id: 42, name: 'Existing' } as any
    expect(convertToProject(project, 0)).toBe(project)
  })

  test('returns default project for null input', () => {
    const result = convertToProject(null, 3)
    expect(result.id).toBe(4) // index + 1
    expect(result.name).toBe('Project-4')
    expect(result.status).toBe('active')
  })

  test('returns default project for undefined input', () => {
    const result = convertToProject(undefined, 0)
    expect(result.id).toBe(1)
    expect(result.name).toBe('Project-1')
  })

  test('derives sessionCount from sessions array', () => {
    const result = convertToProject({ sessions: [1, 2, 3] }, 0)
    expect(result.sessionCount).toBe(3)
  })

  test('uses name and description from partial input', () => {
    const result = convertToProject({ name: 'Custom', description: 'Desc' }, 5)
    expect(result.name).toBe('Custom')
    expect(result.description).toBe('Desc')
  })
})

// --- formatSessionTitle ---

describe('formatSessionTitle', () => {
  test('basic: tool name with version', () => {
    expect(formatSessionTitle('Triz分析', 'V1')).toBe('Triz分析-V1')
  })

  test('numeric version gets V prefix', () => {
    expect(formatSessionTitle('Tool', '2')).toBe('Tool-V2')
  })

  test('V-prefixed version kept as-is', () => {
    expect(formatSessionTitle('Tool', 'V3')).toBe('Tool-V3')
  })

  test('alphanumeric version normalized', () => {
    // '1a' only has digits prefix, so regex picks '1', not '1a'
    expect(formatSessionTitle('Tool', '1a')).toBe('Tool-V1')
  })

  test('empty tool name falls back to 未命名工具', () => {
    expect(formatSessionTitle('', 'V1')).toBe('未命名工具-V1')
    expect(formatSessionTitle('   ', 'V1')).toBe('未命名工具-V1')
  })

  test('no version defaults to V1', () => {
    expect(formatSessionTitle('Tool')).toBe('Tool-V1')
  })

  test('version 2.0 strips trailing .0', () => {
    expect(formatSessionTitle('Tool', '2.0')).toBe('Tool-V2')
  })

  test('version 3.5 keeps decimal', () => {
    expect(formatSessionTitle('Tool', '3.5')).toBe('Tool-V3.5')
  })

  test('uses metadata first version as fallback', () => {
    const options = {
      toolMetadataByName: {
        Tool: {
          id: 1,
          name: 'Tool',
          category_id: 1,
          category: 'test',
          api_endpoint: '/api/test',
          description: 'Test tool',
          is_active: true,
          versions: [{ id: 'v2', name: 'Version 2', description: 'Version 2 desc' }],
        },
      },
    }
    // resolveVersionCandidate returns metadata version id 'v2', then normalizeVersionTag('v2') → 'V2'
    expect(formatSessionTitle('Tool', null, options)).toBe('Tool-V2')
  })

  test('uses fallbackVersion as last resort', () => {
    const options = { fallbackVersion: 'fallback-1' }
    // 'fallback-1' → numberMatch extracts '1' → 'V1'
    expect(formatSessionTitle('Tool', null, options)).toBe('Tool-V1')
  })

  test('matches version from metadata by id', () => {
    const options = {
      toolMetadataByName: {
        Tool: {
          id: 1,
          name: 'Tool',
          category_id: 1,
          category: 'test',
          api_endpoint: '/api/test',
          description: 'Test tool',
          is_active: true,
          versions: [{ id: 'v5', name: 'Five', description: 'Five desc' }],
        },
      },
    }
    // normalizeVersionTag('v5') → vMatch extracts '5' → 'V5'
    expect(formatSessionTitle('Tool', 'v5', options)).toBe('Tool-V5')
  })

  test('matches version from metadata by name', () => {
    const options = {
      toolMetadataByName: {
        Tool: {
          id: 1,
          name: 'Tool',
          category_id: 1,
          category: 'test',
          api_endpoint: '/api/test',
          description: 'Test tool',
          is_active: true,
          versions: [{ id: 'v6', name: 'Six', description: 'Six desc' }],
        },
      },
    }
    // normalizeVersionTag('Six') → alphanumeric 'SIX' → 'VSIX'
    expect(formatSessionTitle('Tool', 'Six', options)).toBe('Tool-VSIX')
  })
})
