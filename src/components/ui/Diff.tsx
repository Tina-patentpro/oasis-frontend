import { memo } from 'react'

import { NL } from '../../constants'

interface DiffProps {
  oldText: string
  newText: string
}

export const Diff = memo<DiffProps>(({ oldText, newText }) => {
  const prev = (oldText || '').split(NL)
  const curr = (newText || '').split(NL)
  const len = Math.max(prev.length, curr.length)

  return (
    <div>
      <div className="text-xs text-gray-500 mb-2">左:上一版本 右:当前版本</div>
      {Array.from({ length: len }).map((_, i) => {
        const oldLine = prev[i] || ''
        const newLine = curr[i] || ''
        const changed = oldLine !== newLine
        return (
          <div
            key={i}
            className={'grid grid-cols-2 gap-2 text-sm rounded ' + (changed ? 'bg-amber-50' : '')}
          >
            <pre className="border border-gray-200 rounded p-2 whitespace-pre-wrap">{oldLine}</pre>
            <pre className="border border-gray-200 rounded p-2 whitespace-pre-wrap">{newLine}</pre>
          </div>
        )
      })}
    </div>
  )
})

Diff.displayName = 'Diff'
