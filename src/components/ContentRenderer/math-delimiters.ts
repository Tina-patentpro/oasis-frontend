const FENCED_CODE_BLOCK_MARKER_REGEX = /^\s*(```|~~~)/

function replaceMathDelimitersInText(text: string): string {
  return text
    .replace(/\\\[/g, () => '$$')
    .replace(/\\\]/g, () => '$$')
    .replace(/\\\(/g, '$')
    .replace(/\\\)/g, '$')
}

function replaceMathDelimitersOutsideInlineCode(line: string): string {
  let result = ''
  let index = 0

  while (index < line.length) {
    const tickStart = line.indexOf('`', index)

    if (tickStart === -1) {
      result += replaceMathDelimitersInText(line.slice(index))
      break
    }

    result += replaceMathDelimitersInText(line.slice(index, tickStart))

    let tickEnd = tickStart
    while (line[tickEnd] === '`') {
      tickEnd += 1
    }

    const marker = line.slice(tickStart, tickEnd)
    const inlineCodeEnd = line.indexOf(marker, tickEnd)

    if (inlineCodeEnd === -1) {
      result += line.slice(tickStart)
      break
    }

    result += line.slice(tickStart, inlineCodeEnd + marker.length)
    index = inlineCodeEnd + marker.length
  }

  return result
}

export function normalizeMathDelimiters(content: string): string {
  const lines = content.split('\n')
  let isInFencedCodeBlock = false

  return lines
    .map((line) => {
      if (FENCED_CODE_BLOCK_MARKER_REGEX.test(line)) {
        isInFencedCodeBlock = !isInFencedCodeBlock
        return line
      }

      if (isInFencedCodeBlock) {
        return line
      }

      return replaceMathDelimitersOutsideInlineCode(line)
    })
    .join('\n')
}
