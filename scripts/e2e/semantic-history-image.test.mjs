import test from 'node:test'
import assert from 'node:assert/strict'

import {
  collectImageSourcesFromRecord,
  findTargetSession,
  findTargetSessions,
  getTitleOccurrenceIndexById,
  isProjectDetailUrl,
  isProjectListUrl,
  maskImageSource,
  parseCliArgs,
  printResult,
  validateRuntimeOptions,
} from './semantic-history-image.mjs'

test('requires either a token, storage state, or explicit unauthenticated mode', () => {
  const options = parseCliArgs(['--app-url', 'http://127.0.0.1:5173'], {})

  assert.throws(
    () => validateRuntimeOptions(options),
    /OASIS_E2E_ACCESS_TOKEN or OASIS_E2E_STORAGE_STATE/,
  )
})

test('allows explicit unauthenticated mode and parses project history options', () => {
  const options = parseCliArgs(
    [
      '--app-url',
      'http://127.0.0.1:5180/workspace',
      '--allow-unauthenticated',
      '--project-id',
      '193',
      '--project-title',
      '工学键盘',
      '--timeout-ms',
      '15000',
      '--screenshot',
      'output/e2e.png',
    ],
    {},
    'D:/repo',
  )

  assert.equal(options.allowUnauthenticated, true)
  assert.equal(options.projectId, '193')
  assert.equal(options.projectTitle, '工学键盘')
  assert.equal(options.timeoutMs, 15000)
  assert.match(options.screenshotPath, /output[\\/]e2e\.png$/)
  assert.doesNotThrow(() => validateRuntimeOptions(options))
})

test('recognizes real history list and detail backend routes', () => {
  assert.equal(
    isProjectListUrl('https://api.example.com/api/user/user/projectlist?page=1&limit=20'),
    true,
  )
  assert.equal(
    isProjectListUrl(
      'https://api.example.com/api/user/user/projectlist?page=1&limit=20&folder_id=193',
      '193',
    ),
    true,
  )
  assert.equal(
    isProjectListUrl(
      'https://api.example.com/api/user/user/projectlist?page=1&limit=20&folder_id=0',
      '193',
    ),
    false,
  )
  assert.equal(
    isProjectDetailUrl('https://api.example.com/api/user/user/projectdetail/123', '123'),
    true,
  )
  assert.equal(
    isProjectDetailUrl('https://api.example.com/api/user/user/projectdetail/999', '123'),
    false,
  )
})

test('selects semantic image chatflow sessions from real backend list payloads', () => {
  const target = findTargetSession(
    [
      {
        id: 101,
        name: '普通对话',
        type: 2,
        inputs: JSON.stringify({ type: 3, query: 'hello' }),
      },
      {
        id: 202,
        name: '语义生图：猫咪海报',
        type: 2,
        inputs: JSON.stringify({ type: '2', query: '画一只猫' }),
      },
    ],
    { sessionKeyword: '语义生图' },
  )

  assert.equal(target?.id, 202)
})

test('orders semantic image candidates ahead of semantic sessions without list images', () => {
  const targets = findTargetSessions(
    [
      {
        id: 101,
        name: '语义生图：无图记录',
        type: 2,
        inputs: JSON.stringify({ type: 2, query: 'old image prompt' }),
      },
      {
        id: 202,
        name: '语义生图：有图记录',
        type: 2,
        inputs: JSON.stringify({ type: 2, query: 'image prompt' }),
        file_url: '/files/tools/result.png?sign=1',
      },
    ],
    { sessionKeyword: '语义生图' },
  )

  assert.deepEqual(
    targets.map((item) => item.id),
    [202, 101],
  )
})

test('calculates the visible occurrence index for duplicate history titles', () => {
  const indexes = getTitleOccurrenceIndexById([
    { id: 101, name: '语义生图' },
    { id: 102, name: '工作聚焦' },
    { id: 103, name: '语义生图' },
  ])

  assert.equal(indexes.get(101), 0)
  assert.equal(indexes.get(103), 1)
})

test('collects image sources from history detail file_url and file_output fields', () => {
  const sources = collectImageSourcesFromRecord({
    file_url: '/files/tools/result.png?sign=1,/files/tools/report.docx?sign=2',
    file_output: [
      { url: '/files/tools/preview.webp?sign=3', type: 'image' },
      { url: '/files/tools/table.xlsx?sign=4', type: 'document' },
    ],
  })

  assert.deepEqual(sources, [
    '/files/tools/result.png?sign=1',
    '/files/tools/preview.webp?sign=3',
  ])
})

test('collects restored image sources from answer_text and response answer markdown', () => {
  const sources = collectImageSourcesFromRecord({
    answer_text: '![生成图](https://example.com/generated.png)',
    response: JSON.stringify({
      answer: '![响应图](https://example.com/from-response.webp)',
    }),
  })

  assert.deepEqual(sources, [
    'https://example.com/generated.png',
    'https://example.com/from-response.webp',
  ])
})

test('collects image sources from additional frontend-compatible detail fields', () => {
  const sources = collectImageSourcesFromRecord({
    answer: '![answer](https://example.com/answer.png?token=secret)',
    generatedContent: '![generated](https://example.com/generated.webp)',
    fileUrl: '/files/tools/file-url.png?sign=1',
    fileOutput: [{ downloadUrl: '/files/tools/download-url.jpg?sign=2', mimeType: 'image/jpeg' }],
    outputs: {
      image: { download_url: '/files/tools/from-outputs.png?sign=3', mime_type: 'image/png' },
    },
  })

  assert.deepEqual([...sources].sort(), [
    'https://example.com/answer.png?token=secret',
    'https://example.com/generated.webp',
    '/files/tools/file-url.png?sign=1',
    '/files/tools/download-url.jpg?sign=2',
    '/files/tools/from-outputs.png?sign=3',
  ].sort())
})

test('masks sensitive image source query parameters in printed results', () => {
  assert.equal(
    maskImageSource('https://example.com/files/result.png?token=secret&sign=abc'),
    'https://example.com/files/result.png?…',
  )

  const lines = []
  printResult(
    {
      title: '语义生图',
      sessionId: 123,
      detailUrl: 'https://example.com/api/user/user/projectdetail/123',
      imageSources: ['https://example.com/files/result.png?token=secret&sign=abc'],
      screenshotPath: 'output/result.png',
    },
    { log: (line) => lines.push(line) },
  )

  assert.equal(lines.some((line) => line.includes('token=secret')), false)
  assert.equal(lines.some((line) => line.includes('https://example.com/files/result.png?…')), true)
})
