const INPUT_APPEND_SEPARATOR = '\n\n'

export function appendToChatInput(currentInput: string, incomingText: string): string {
  const current = currentInput.trimEnd()
  const incoming = incomingText.trim()

  if (!incoming) {
    return currentInput
  }

  if (!current.trim()) {
    return incoming
  }

  return `${current}${INPUT_APPEND_SEPARATOR}${incoming}`
}

export function prependToChatInput(currentInput: string, incomingText: string): string {
  const incoming = incomingText.trim()

  if (!incoming) {
    return currentInput
  }

  if (!currentInput.trim()) {
    return incoming
  }

  return `${incoming}${INPUT_APPEND_SEPARATOR}${currentInput}`
}

export function joinReadableSnippets(snippets: string[]): string {
  return snippets
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .join(INPUT_APPEND_SEPARATOR)
}
