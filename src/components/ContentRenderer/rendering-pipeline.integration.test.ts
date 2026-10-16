import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

import { describe, expect, test } from '@jest/globals'

describe('ContentRenderer real markdown rendering pipeline', () => {
  test('renders unsafe links, math, and tables through the real markdown plugins', () => {
    const projectRoot = join(__dirname, '..', '..', '..')
    const tsxCli = join(projectRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs')
    const scriptPath = join(projectRoot, 'scripts', 'verify-content-renderer-pipeline.tsx')

    const output = execFileSync(process.execPath, [tsxCli, scriptPath], {
      cwd: projectRoot,
      encoding: 'utf8',
    })

    expect(output).toContain('CONTENT_RENDERER_PIPELINE_OK')
    expect(output.trim()).toBe('CONTENT_RENDERER_PIPELINE_OK')
    expect(output).not.toContain('Error:')
  })
})
