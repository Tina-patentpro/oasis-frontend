import { describe, expect, test } from '@jest/globals'

import { normalizeMermaidBlocks } from './mermaid-blocks'

describe('normalizeMermaidBlocks', () => {
  test('wraps a bare flowchart block with a mermaid fence', () => {
    const source = ['前言', '', 'flowchart TD', '  A[开始] --> B[完成]', '', '后续说明'].join('\n')

    expect(normalizeMermaidBlocks(source)).toBe(
      [
        '前言',
        '',
        '```mermaid',
        'flowchart TD',
        '  A[开始] --> B[完成]',
        '```',
        '',
        '后续说明',
      ].join('\n'),
    )
  })

  test('keeps ordinary text after a bare flowchart outside the mermaid fence', () => {
    const source = ['flowchart TD', '  A[开始] --> B[完成]', '说明：这里是普通文字'].join('\n')

    expect(normalizeMermaidBlocks(source)).toBe(
      ['```mermaid', 'flowchart TD', '  A[开始] --> B[完成]', '```', '说明：这里是普通文字'].join(
        '\n',
      ),
    )
  })

  test('keeps markdown headings and lists after a bare flowchart outside the mermaid fence', () => {
    const source = ['flowchart TD', '  A[开始] --> B[完成]', '## 后续说明', '- 普通列表项'].join(
      '\n',
    )

    expect(normalizeMermaidBlocks(source)).toBe(
      [
        '```mermaid',
        'flowchart TD',
        '  A[开始] --> B[完成]',
        '```',
        '## 后续说明',
        '- 普通列表项',
      ].join('\n'),
    )
  })

  test('keeps English note text after a bare pie chart outside the mermaid fence', () => {
    const source = ['pie title Test', '"Alpha" : 10', 'Note: ordinary text'].join('\n')

    expect(normalizeMermaidBlocks(source)).toBe(
      ['```mermaid', 'pie title Test', '"Alpha" : 10', '```', 'Note: ordinary text'].join('\n'),
    )
  })

  test('keeps English note text after a bare gantt chart outside the mermaid fence', () => {
    const source = [
      'gantt',
      'title Timeline',
      'dateFormat YYYY-MM-DD',
      'section Build',
      'Task A :a1, 2026-04-30, 1d',
      'Note: ordinary text',
    ].join('\n')

    expect(normalizeMermaidBlocks(source)).toBe(
      [
        '```mermaid',
        'gantt',
        'title Timeline',
        'dateFormat YYYY-MM-DD',
        'section Build',
        'Task A :a1, 2026-04-30, 1d',
        '```',
        'Note: ordinary text',
      ].join('\n'),
    )
  })

  test('keeps English note text after a bare class diagram outside the mermaid fence', () => {
    const source = ['classDiagram', 'Animal : +int age', 'Note: ordinary text'].join('\n')

    expect(normalizeMermaidBlocks(source)).toBe(
      ['```mermaid', 'classDiagram', 'Animal : +int age', '```', 'Note: ordinary text'].join('\n'),
    )
  })

  test('keeps English note text after a bare state diagram outside the mermaid fence', () => {
    const source = ['stateDiagram-v2', '[*] --> Still', 'Note: ordinary text'].join('\n')

    expect(normalizeMermaidBlocks(source)).toBe(
      ['```mermaid', 'stateDiagram-v2', '[*] --> Still', '```', 'Note: ordinary text'].join('\n'),
    )
  })

  test('keeps English note text after a bare er diagram outside the mermaid fence', () => {
    const source = ['erDiagram', 'CUSTOMER ||--o{ ORDER : places', 'Note: ordinary text'].join('\n')

    expect(normalizeMermaidBlocks(source)).toBe(
      [
        '```mermaid',
        'erDiagram',
        'CUSTOMER ||--o{ ORDER : places',
        '```',
        'Note: ordinary text',
      ].join('\n'),
    )
  })

  test('keeps English note text after a bare mindmap outside the mermaid fence', () => {
    const source = ['mindmap', '  root((Root))', '    child', 'Note: ordinary text'].join('\n')

    expect(normalizeMermaidBlocks(source)).toBe(
      ['```mermaid', 'mindmap', '  root((Root))', '    child', '```', 'Note: ordinary text'].join(
        '\n',
      ),
    )
  })

  test('keeps English note text after a bare timeline outside the mermaid fence', () => {
    const source = [
      'timeline',
      'title Project History',
      '2026 : Launch',
      'Note: ordinary text',
    ].join('\n')

    expect(normalizeMermaidBlocks(source)).toBe(
      [
        '```mermaid',
        'timeline',
        'title Project History',
        '2026 : Launch',
        '```',
        'Note: ordinary text',
      ].join('\n'),
    )
  })

  test('keeps English note text after a bare journey outside the mermaid fence', () => {
    const source = [
      'journey',
      'title User Journey',
      'section Start',
      '  Login: 5: User',
      'Note: ordinary text',
    ].join('\n')

    expect(normalizeMermaidBlocks(source)).toBe(
      [
        '```mermaid',
        'journey',
        'title User Journey',
        'section Start',
        '  Login: 5: User',
        '```',
        'Note: ordinary text',
      ].join('\n'),
    )
  })

  test('keeps English note text after a bare git graph outside the mermaid fence', () => {
    const source = ['gitGraph', 'commit id: "init"', 'branch feature', 'Note: ordinary text'].join(
      '\n',
    )

    expect(normalizeMermaidBlocks(source)).toBe(
      [
        '```mermaid',
        'gitGraph',
        'commit id: "init"',
        'branch feature',
        '```',
        'Note: ordinary text',
      ].join('\n'),
    )
  })

  test('keeps English note text after a bare sequence diagram outside the mermaid fence', () => {
    const source = [
      'sequenceDiagram',
      'Alice->>Bob: Hello',
      'Note right of Bob: Mermaid note',
      'Note: ordinary text',
    ].join('\n')

    expect(normalizeMermaidBlocks(source)).toBe(
      [
        '```mermaid',
        'sequenceDiagram',
        'Alice->>Bob: Hello',
        'Note right of Bob: Mermaid note',
        '```',
        'Note: ordinary text',
      ].join('\n'),
    )
  })

  test('keeps English note text after a bare graph diagram outside the mermaid fence', () => {
    const source = ['graph LR', '  A[Start] --> B[Done]', 'Note: ordinary text'].join('\n')

    expect(normalizeMermaidBlocks(source)).toBe(
      ['```mermaid', 'graph LR', '  A[Start] --> B[Done]', '```', 'Note: ordinary text'].join('\n'),
    )
  })

  test('keeps ordinary English sentences that start with Mermaid keywords as text', () => {
    const source = [
      'Pie charts are useful for proportions.',
      'Gantt charts are useful for planning.',
      'Journey mapping helps product teams.',
      'Timeline planning keeps milestones clear.',
      'Mindmap ideas before implementation.',
    ].join('\n')

    expect(normalizeMermaidBlocks(source)).toBe(source)
  })

  test('keeps existing mermaid fenced blocks unchanged', () => {
    const source = ['```mermaid', 'flowchart TD', '  A --> B', '```'].join('\n')

    expect(normalizeMermaidBlocks(source)).toBe(source)
  })

  test('does not wrap mermaid-like text inside non-mermaid code fences', () => {
    const source = ['```text', 'flowchart TD', '  A --> B', '```'].join('\n')

    expect(normalizeMermaidBlocks(source)).toBe(source)
  })
})
