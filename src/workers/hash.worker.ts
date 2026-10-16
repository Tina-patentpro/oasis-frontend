/// <reference lib="webworker" />

const ctx = self as unknown as {
  addEventListener: typeof addEventListener
  postMessage: typeof postMessage
}

const arrayBufferToHex = (buffer: ArrayBuffer): string =>
  Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('')

ctx.addEventListener('message', async (event: MessageEvent<{ id: string; file: File }>) => {
  const { id, file } = event.data

  try {
    const buffer = await file.arrayBuffer()
    const subtle = crypto?.subtle
    if (!subtle || typeof subtle.digest !== 'function') {
      throw new Error('SUBTLE_CRYPTO_UNAVAILABLE')
    }

    const digest = await subtle.digest('SHA-256', buffer)
    ctx.postMessage({
      id,
      hash: arrayBufferToHex(digest),
      name: file.name,
      size: file.size,
      type: file.type,
    })
  } catch (error) {
    ctx.postMessage({
      id,
      error:
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : 'HASH_COMPUTE_FAILED',
      name: file.name,
      size: file.size,
      type: file.type,
    })
  }
})

export {}
