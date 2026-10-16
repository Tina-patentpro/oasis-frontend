#!/usr/bin/env node

import {
  DEV_TOOLING_EXCEPTION,
  REACT_ROUTER_EXCEPTION,
  runFullAudit,
} from './audit-production.mjs'

try {
  const result = runFullAudit()
  if (result.allowedAdvisories.length === 0) {
    console.log('[audit:full:ci] PASS: no high or critical findings.')
  } else {
    console.log(
      `[audit:full:ci] PASS with guarded contextual exceptions: ${result.allowedAdvisories.join(', ')}`,
    )
    console.log(
      `[audit:full:ci] React Router review by ${REACT_ROUTER_EXCEPTION.expiresOn}; dev-tooling review by ${DEV_TOOLING_EXCEPTION.expiresOn}.`,
    )
  }
} catch (error) {
  console.error(`[audit:full:ci] FAIL: ${error.message}`)
  process.exitCode = 1
}
