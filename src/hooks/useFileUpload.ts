import { useCallback, useMemo } from 'react'

import { isDevMode } from '@/config/dev-mode'
import { useFileHasher } from '@/workers/useFileHasher'

import type { Destination } from '../types'

const formatFingerprint = (hash: string): string => hash.slice(0, 8).toUpperCase()

export function useFileUpload(
  notify: (message: string) => void,
  destinations: ReadonlyArray<Destination>,
) {
  const labelByKey = useMemo(() => {
    const map = new Map<string, string>()
    destinations.forEach((dest) => map.set(dest.key, dest.title))
    return map
  }, [destinations])

  const { hashFiles, isSupported } = useFileHasher()

  const handleInputFiles = useCallback(
    (files: FileList, destKey: string, type: 'file' | 'image') => {
      if (!files.length) {
        return
      }

      const label = labelByKey.get(destKey) ?? '输入材料'
      notify(`${type === 'image' ? '图片' : '文件'}已添加到${label}`)

      if (!isSupported) {
        return
      }

      const fileArray = Array.from(files)
      hashFiles(fileArray)
        .then((results) => {
          const firstWithHash = results.find((item) => item.hash)
          if (firstWithHash?.hash) {
            notify(
              `已生成文件指纹：${firstWithHash.name} · ${formatFingerprint(firstWithHash.hash)}`,
            )
          }
        })
        .catch((error) => {
          if (isDevMode()) {
            console.warn('[file-upload] 生成文件指纹失败', error)
          }
        })
    },
    [hashFiles, isSupported, labelByKey, notify],
  )

  return {
    handleInputFiles,
  }
}
