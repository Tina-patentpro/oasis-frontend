/* eslint-disable max-lines -- Centralized static accessibility audit intentionally keeps related guards together. */
import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, test } from '@jest/globals'

const SOURCE_ROOT = path.join(process.cwd(), 'src')

const isScannedFile = (fileName: string) =>
  (fileName.endsWith('.tsx') || fileName.endsWith('.jsx')) && !fileName.includes('.test.')

const findOpeningTagEnd = (source: string, startIndex: number) => {
  let quote = 0
  let braceDepth = 0

  for (let index = startIndex; index < source.length; index += 1) {
    const code = source.charCodeAt(index)
    const previousCode = source.charCodeAt(index - 1)

    if (quote) {
      if (code === quote && previousCode !== 92) {
        quote = 0
      }
      continue
    }

    if (code === 34 || code === 39 || code === 96) {
      quote = code
      continue
    }

    if (code === 123) {
      braceDepth += 1
      continue
    }

    if (code === 125) {
      braceDepth = Math.max(0, braceDepth - 1)
      continue
    }

    if (code === 62 && braceDepth === 0) {
      return index
    }
  }

  return -1
}

const collectScannedFiles = (directory: string): string[] =>
  fs.readdirSync(directory).flatMap((name) => {
    const filePath = path.join(directory, name)
    const stat = fs.statSync(filePath)

    if (stat.isDirectory()) {
      return collectScannedFiles(filePath)
    }

    return isScannedFile(name) ? [filePath] : []
  })

const lineLabel = (source: string, filePath: string, index: number) =>
  `${path.relative(process.cwd(), filePath)}:${source.slice(0, index).split('\n').length}`

const getOpeningTag = (source: string, startIndex: number) => {
  const tagEnd = findOpeningTagEnd(source, startIndex)
  return tagEnd < 0 ? '' : source.slice(startIndex, tagEnd + 1)
}

const findAttributeValueSource = (openingTag: string, attributeName: string) => {
  const match = new RegExp(`\\b${attributeName}\\s*=`).exec(openingTag)

  if (!match) {
    return ''
  }

  let valueStart = match.index + match[0].length

  while (openingTag[valueStart] === ' ') {
    valueStart += 1
  }

  const openingChar = openingTag[valueStart]

  if (openingChar === '"' || openingChar === "'") {
    const valueEnd = openingTag.indexOf(openingChar, valueStart + 1)
    return valueEnd < 0 ? openingTag.slice(valueStart) : openingTag.slice(valueStart, valueEnd + 1)
  }

  if (openingChar === '{') {
    let quote = 0
    let braceDepth = 0

    for (let index = valueStart; index < openingTag.length; index += 1) {
      const code = openingTag.charCodeAt(index)
      const previousCode = openingTag.charCodeAt(index - 1)

      if (quote) {
        if (code === quote && previousCode !== 92) {
          quote = 0
        }
        continue
      }

      if (code === 34 || code === 39 || code === 96) {
        quote = code
        continue
      }

      if (code === 123) {
        braceDepth += 1
        continue
      }

      if (code === 125) {
        braceDepth -= 1

        if (braceDepth === 0) {
          return openingTag.slice(valueStart, index + 1)
        }
      }
    }
  }

  const valueEnd = openingTag.slice(valueStart).search(/[\s>]/)
  return valueEnd < 0
    ? openingTag.slice(valueStart)
    : openingTag.slice(valueStart, valueStart + valueEnd)
}

const hasBlankTarget = (openingTag: string) =>
  findAttributeValueSource(openingTag, 'target').includes('_blank')

const hasSafeRelForBlankTarget = (openingTag: string) => {
  const relValue = findAttributeValueSource(openingTag, 'rel')

  return /\bnoopener\b/.test(relValue) && /\bnoreferrer\b/.test(relValue)
}

const hasVisibleFocusAlternative = (openingTag: string) =>
  openingTag.includes('chat-action-btn') ||
  /\bfocus(?:-visible)?:[^\s"'`}]*ring\b/.test(openingTag) ||
  /\bfocus(?:-visible)?:[^\s"'`}]*outline\b/.test(openingTag) ||
  /\bfocus(?:-visible)?:[^\s"'`}]*border\b/.test(openingTag) ||
  /\bfocus(?:-visible)?:[^\s"'`}]*bg\b/.test(openingTag) ||
  /\bfocus(?:-visible)?:[^\s"'`}]*text\b/.test(openingTag) ||
  /\bfocus(?:-visible)?:[^\s"'`}]*opacity\b/.test(openingTag)

const hasVisibleHiddenControlFocusProxy = (source: string, startIndex: number) => {
  const nearbySource = source.slice(Math.max(0, startIndex - 800), startIndex + 1200)

  return (
    /\bfocus-within:[^\s"'`}]*ring\b/.test(nearbySource) ||
    /\bfocus-within:[^\s"'`}]*outline\b/.test(nearbySource) ||
    /\bpeer-focus(?:-visible)?:[^\s"'`}]*ring\b/.test(nearbySource) ||
    /\bpeer-focus(?:-visible)?:[^\s"'`}]*outline\b/.test(nearbySource) ||
    /\bpeer-focus(?:-visible)?:[^\s"'`}]*border\b/.test(nearbySource)
  )
}

const hasAccessibleNameHook = (openingTag: string) =>
  openingTag.includes('aria-label=') ||
  openingTag.includes('aria-labelledby=') ||
  openingTag.includes('title=')

const hasAttribute = (openingTag: string, attributeName: string) =>
  new RegExp(`\\b${attributeName}\\s*=`).test(openingTag)

const getPairedElementInnerSource = (source: string, startIndex: number, tagName: string) => {
  const openingTagEnd = findOpeningTagEnd(source, startIndex)

  if (openingTagEnd < 0) {
    return ''
  }

  let depth = 1
  const escapedTagName = tagName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const tagPattern = new RegExp(`<\\/?${escapedTagName}\\b[^>]*>`, 'g')

  for (const match of source.slice(openingTagEnd + 1).matchAll(tagPattern)) {
    const absoluteIndex = openingTagEnd + 1 + match.index
    const matchedTag = match[0]

    if (matchedTag.startsWith(`</${tagName}`)) {
      depth -= 1

      if (depth === 0) {
        return source.slice(openingTagEnd + 1, absoluteIndex)
      }
    } else if (!matchedTag.endsWith('/>')) {
      depth += 1
    }
  }

  return ''
}

const getStaticText = (source: string) =>
  source
    .replace(/<[^>]+>/g, ' ')
    .replace(/\{[^}]*\}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const isSymbolOnlyText = (text: string) => text.length > 0 && !/[\p{L}\p{N}]/u.test(text)

const hasStaticIconElement = (source: string) =>
  /<(?:svg|[A-Z][A-Za-z0-9]*(?:Icon|Circle|Square|Triangle|Chevron|Arrow|Plus|Minus|X|Menu|Search|Upload|Download|Trash|Settings|Bell|User|File|Image|Edit|Save|Copy|Refresh|More|Eye|Lock|Key|Check))\b/.test(
    source,
  )

const hasDirectTrueAriaHidden = (openingTag: string) => {
  const ariaHiddenValue = findAttributeValueSource(openingTag, 'aria-hidden')

  return (
    ariaHiddenValue === '"true"' || ariaHiddenValue === "'true'" || ariaHiddenValue === '{true}'
  )
}

const hasFocusableTabIndex = (openingTag: string) => {
  const tabIndexValue =
    findAttributeValueSource(openingTag, 'tabIndex') ||
    findAttributeValueSource(openingTag, 'tabindex')

  return tabIndexValue.length > 0 && !/^-?["'{]?-1/.test(tabIndexValue)
}

const isNaturallyFocusableElement = (tagName: string, openingTag: string) =>
  tagName === 'button' ||
  tagName === 'input' ||
  tagName === 'select' ||
  tagName === 'textarea' ||
  (tagName === 'a' && openingTag.includes('href='))

const isFocusableElement = (tagName: string, openingTag: string) =>
  isNaturallyFocusableElement(tagName, openingTag) || hasFocusableTabIndex(openingTag)

const hasRole = (openingTag: string, roleName: string) => {
  const roleValue = findAttributeValueSource(openingTag, 'role')

  return new RegExp(`\\b${roleName}\\b`).test(roleValue)
}

const hasButtonRole = (openingTag: string) => hasRole(openingTag, 'button')

const hasKeyboardActivationHandler = (openingTag: string) =>
  openingTag.includes('onKeyDown=') ||
  openingTag.includes('onKeyUp=') ||
  openingTag.includes('onKeyPress=')

const CONTROL_TAG_PATTERN = /<(input|textarea|select)\b/g

const STRUCTURE_ROLES_THAT_NEED_NAMES = [
  'article',
  'group',
  'list',
  'listbox',
  'log',
  'region',
  'tabpanel',
  'toolbar',
]

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const extractStaticIdTokensFromAttributeValue = (attributeValue: string) => {
  const ids = new Set<string>()

  for (const match of attributeValue.matchAll(/["'`]([^"'`$]+)["'`]/g)) {
    match[1]
      .split(/\s+/)
      .filter(Boolean)
      .forEach((token) => {
        if (/^[A-Za-z][A-Za-z0-9_:-]*$/.test(token)) {
          ids.add(token)
        }
      })
  }

  return [...ids]
}

const hasStaticIdDefinition = (source: string, id: string) =>
  new RegExp(`\\bid\\s*=\\s*["']${escapeRegExp(id)}["']`).test(source)

const findUnnamedDialogElements = (filePath: string) => {
  const source = fs.readFileSync(filePath, 'utf8')
  const findings: string[] = []

  for (const match of source.matchAll(/<[^>]*role=\{?["']dialog["']\}?/g)) {
    const openingTag = getOpeningTag(source, match.index)
    const hasName =
      openingTag.includes('aria-label=') ||
      openingTag.includes('aria-labelledby=') ||
      openingTag.includes('labelledBy=')

    if (!hasName) {
      findings.push(lineLabel(source, filePath, match.index))
    }
  }

  return findings
}

const findUnnamedAccessibleDialogUsages = (filePath: string) => {
  const source = fs.readFileSync(filePath, 'utf8')
  const findings: string[] = []

  for (const match of source.matchAll(/<AccessibleDialog\b/g)) {
    const openingTag = getOpeningTag(source, match.index)
    const hasName = openingTag.includes('label=') || openingTag.includes('labelledBy=')

    if (!hasName) {
      findings.push(lineLabel(source, filePath, match.index))
    }
  }

  return findings
}

const findUnsafeBlankTargets = (filePath: string) => {
  const source = fs.readFileSync(filePath, 'utf8')
  const findings: string[] = []

  for (const match of source.matchAll(/<a\b/g)) {
    const openingTag = getOpeningTag(source, match.index)

    if (hasBlankTarget(openingTag) && !hasSafeRelForBlankTarget(openingTag)) {
      findings.push(lineLabel(source, filePath, match.index))
    }
  }

  return findings
}

const findImagesWithoutAlt = (filePath: string) => {
  const source = fs.readFileSync(filePath, 'utf8')
  const findings: string[] = []

  for (const match of source.matchAll(/<img\b/g)) {
    const openingTag = getOpeningTag(source, match.index)

    if (!openingTag.includes('alt=')) {
      findings.push(lineLabel(source, filePath, match.index))
    }
  }

  return findings
}

const findButtonsWithoutVisibleFocus = (filePath: string) => {
  const source = fs.readFileSync(filePath, 'utf8')
  const findings: string[] = []

  for (const match of source.matchAll(/<(?:motion\.)?button\b/g)) {
    const openingTag = getOpeningTag(source, match.index)

    if (openingTag.includes('focus:outline-none') && !hasVisibleFocusAlternative(openingTag)) {
      findings.push(lineLabel(source, filePath, match.index))
    }
  }

  return findings
}

const findSymbolOnlyButtonsWithoutAccessibleName = (filePath: string) => {
  const source = fs.readFileSync(filePath, 'utf8')
  const findings: string[] = []

  for (const match of source.matchAll(/<(?:motion\.)?button\b/g)) {
    const openingTag = getOpeningTag(source, match.index)
    const tagName = openingTag.startsWith('<motion.button') ? 'motion.button' : 'button'
    const innerSource = getPairedElementInnerSource(source, match.index, tagName)
    const staticText = getStaticText(innerSource)

    if (
      !innerSource.includes('{') &&
      isSymbolOnlyText(staticText) &&
      !hasAccessibleNameHook(openingTag)
    ) {
      findings.push(lineLabel(source, filePath, match.index))
    }
  }

  return findings
}

const findStaticIconOnlyButtonsWithoutAccessibleName = (filePath: string) => {
  const source = fs.readFileSync(filePath, 'utf8')
  const findings: string[] = []

  for (const match of source.matchAll(/<(?:motion\.)?button\b/g)) {
    const openingTag = getOpeningTag(source, match.index)
    const tagName = openingTag.startsWith('<motion.button') ? 'motion.button' : 'button'
    const innerSource = getPairedElementInnerSource(source, match.index, tagName)
    const staticText = getStaticText(innerSource)

    if (
      !innerSource.includes('{') &&
      staticText.length === 0 &&
      hasStaticIconElement(innerSource) &&
      !hasAccessibleNameHook(openingTag)
    ) {
      findings.push(lineLabel(source, filePath, match.index))
    }
  }

  return findings
}

const findFormControlsWithoutVisibleFocus = (filePath: string) => {
  const source = fs.readFileSync(filePath, 'utf8')
  const findings: string[] = []

  for (const match of source.matchAll(/<(?:input|textarea|select)\b/g)) {
    const openingTag = getOpeningTag(source, match.index)

    if (openingTag.includes('focus:outline-none') && !hasVisibleFocusAlternative(openingTag)) {
      findings.push(lineLabel(source, filePath, match.index))
    }
  }

  return findings
}

const findHiddenSelectableControlsWithoutVisibleFocusProxy = (filePath: string) => {
  const source = fs.readFileSync(filePath, 'utf8')
  const findings: string[] = []

  for (const match of source.matchAll(/<input\b/g)) {
    const openingTag = getOpeningTag(source, match.index)
    const inputType = findAttributeValueSource(openingTag, 'type')
    const isSelectable = /\b(?:checkbox|radio)\b/.test(inputType)

    if (
      isSelectable &&
      openingTag.includes('sr-only') &&
      !hasVisibleHiddenControlFocusProxy(source, match.index)
    ) {
      findings.push(lineLabel(source, filePath, match.index))
    }
  }

  return findings
}

const findFocusableElementsHiddenFromAssistiveTech = (filePath: string) => {
  const source = fs.readFileSync(filePath, 'utf8')
  const findings: string[] = []

  for (const match of source.matchAll(/<([a-z][a-z0-9-]*)\b/g)) {
    const tagName = match[1]
    const openingTag = getOpeningTag(source, match.index)

    if (hasDirectTrueAriaHidden(openingTag) && isFocusableElement(tagName, openingTag)) {
      findings.push(lineLabel(source, filePath, match.index))
    }
  }

  return findings
}

const findCustomButtonRolesWithoutKeyboardSupport = (filePath: string) => {
  const source = fs.readFileSync(filePath, 'utf8')
  const findings: string[] = []

  for (const match of source.matchAll(/<([a-z][a-z0-9-]*)\b/g)) {
    const tagName = match[1]
    const openingTag = getOpeningTag(source, match.index)

    if (
      tagName !== 'button' &&
      hasButtonRole(openingTag) &&
      (!hasFocusableTabIndex(openingTag) || !hasKeyboardActivationHandler(openingTag))
    ) {
      findings.push(lineLabel(source, filePath, match.index))
    }
  }

  return findings
}

const findTabRolesWithoutSemanticStateOrFocusSupport = (filePath: string) => {
  const source = fs.readFileSync(filePath, 'utf8')
  const findings: string[] = []

  for (const match of source.matchAll(/<([a-z][a-z0-9-]*)\b/g)) {
    const tagName = match[1]
    const openingTag = getOpeningTag(source, match.index)

    if (
      hasRole(openingTag, 'tab') &&
      (!hasAttribute(openingTag, 'aria-selected') ||
        !hasAttribute(openingTag, 'aria-controls') ||
        !hasAttribute(openingTag, 'id') ||
        !hasAttribute(openingTag, 'tabIndex') ||
        (!isNaturallyFocusableElement(tagName, openingTag) &&
          !hasKeyboardActivationHandler(openingTag)))
    ) {
      findings.push(lineLabel(source, filePath, match.index))
    }
  }

  return findings
}

const findOptionRolesWithoutSelectionStateOrFocusSupport = (filePath: string) => {
  const source = fs.readFileSync(filePath, 'utf8')
  const findings: string[] = []

  for (const match of source.matchAll(/<([a-z][a-z0-9-]*)\b/g)) {
    const tagName = match[1]
    const openingTag = getOpeningTag(source, match.index)

    if (
      hasRole(openingTag, 'option') &&
      (!hasAttribute(openingTag, 'aria-selected') || !isFocusableElement(tagName, openingTag))
    ) {
      findings.push(lineLabel(source, filePath, match.index))
    }
  }

  return findings
}

const findMenuRolesWithoutNameOrKeyboardSupport = (filePath: string) => {
  const source = fs.readFileSync(filePath, 'utf8')
  const findings: string[] = []

  for (const match of source.matchAll(/<([a-z][a-z0-9-]*)\b/g)) {
    const openingTag = getOpeningTag(source, match.index)

    if (
      hasRole(openingTag, 'menu') &&
      (!hasAccessibleNameHook(openingTag) || !hasKeyboardActivationHandler(openingTag))
    ) {
      findings.push(lineLabel(source, filePath, match.index))
    }
  }

  return findings
}

const findMenuItemRolesWithoutFocusOrCheckedState = (filePath: string) => {
  const source = fs.readFileSync(filePath, 'utf8')
  const findings: string[] = []

  for (const match of source.matchAll(/<([a-z][a-z0-9-]*)\b/g)) {
    const tagName = match[1]
    const openingTag = getOpeningTag(source, match.index)
    const isMenuItem = hasRole(openingTag, 'menuitem')
    const isMenuItemRadio = hasRole(openingTag, 'menuitemradio')

    if (
      (isMenuItem || isMenuItemRadio) &&
      (!isFocusableElement(tagName, openingTag) ||
        (isMenuItemRadio && !hasAttribute(openingTag, 'aria-checked')))
    ) {
      findings.push(lineLabel(source, filePath, match.index))
    }
  }

  return findings
}

const findNamedStructureRolesWithoutAccessibleName = (filePath: string) => {
  const source = fs.readFileSync(filePath, 'utf8')
  const findings: string[] = []

  for (const match of source.matchAll(/<([a-z][a-z0-9-]*)\b/g)) {
    const openingTag = getOpeningTag(source, match.index)

    if (
      STRUCTURE_ROLES_THAT_NEED_NAMES.some((roleName) => hasRole(openingTag, roleName)) &&
      !hasAccessibleNameHook(openingTag)
    ) {
      findings.push(lineLabel(source, filePath, match.index))
    }
  }

  return findings
}

const hasReadableFeedbackContent = (openingTag: string, innerSource: string) =>
  hasAccessibleNameHook(openingTag) ||
  getStaticText(innerSource).length > 0 ||
  innerSource.includes('{')

const findLiveFeedbackRolesWithoutReadableContent = (filePath: string) => {
  const source = fs.readFileSync(filePath, 'utf8')
  const findings: string[] = []

  for (const match of source.matchAll(/<([a-z][a-z0-9-]*)\b/g)) {
    const tagName = match[1]
    const openingTag = getOpeningTag(source, match.index)

    if (hasRole(openingTag, 'status') || hasRole(openingTag, 'alert')) {
      const innerSource = getPairedElementInnerSource(source, match.index, tagName)

      if (!hasReadableFeedbackContent(openingTag, innerSource)) {
        findings.push(lineLabel(source, filePath, match.index))
      }
    }
  }

  return findings
}

const findStaticDescribedByReferencesWithoutTargets = (filePath: string) => {
  const source = fs.readFileSync(filePath, 'utf8')
  const findings: string[] = []

  for (const match of source.matchAll(/<([A-Za-z][A-Za-z0-9.]*)\b/g)) {
    const openingTag = getOpeningTag(source, match.index)
    const describedByValue = findAttributeValueSource(openingTag, 'aria-describedby')
    const missingIds = extractStaticIdTokensFromAttributeValue(describedByValue).filter(
      (id) => !hasStaticIdDefinition(source, id),
    )

    if (missingIds.length > 0) {
      findings.push(`${lineLabel(source, filePath, match.index)} -> ${missingIds.join(', ')}`)
    }
  }

  return findings
}

const findInvalidControlsWithoutDescriptionHook = (filePath: string) => {
  const source = fs.readFileSync(filePath, 'utf8')
  const findings: string[] = []

  for (const match of source.matchAll(CONTROL_TAG_PATTERN)) {
    const openingTag = getOpeningTag(source, match.index)

    if (hasAttribute(openingTag, 'aria-invalid') && !hasAttribute(openingTag, 'aria-describedby')) {
      findings.push(lineLabel(source, filePath, match.index))
    }
  }

  return findings
}

const findBusyElementsWithoutReadableState = (filePath: string) => {
  const source = fs.readFileSync(filePath, 'utf8')
  const findings: string[] = []

  for (const match of source.matchAll(/<([a-z][a-z0-9-]*)\b/g)) {
    const tagName = match[1]
    const openingTag = getOpeningTag(source, match.index)

    if (hasAttribute(openingTag, 'aria-busy')) {
      const innerSource = getPairedElementInnerSource(source, match.index, tagName)

      if (!hasReadableFeedbackContent(openingTag, innerSource)) {
        findings.push(lineLabel(source, filePath, match.index))
      }
    }
  }

  return findings
}

describe('semantic accessibility and link safety', () => {
  const scannedFiles = collectScannedFiles(SOURCE_ROOT)

  test('all production dialogs expose an accessible name hook', () => {
    const findings = scannedFiles.flatMap((filePath) => [
      ...findUnnamedDialogElements(filePath),
      ...findUnnamedAccessibleDialogUsages(filePath),
    ])

    expect(findings).toEqual([])
  })

  test('new-window links opt out of opener access', () => {
    const findings = scannedFiles.flatMap(findUnsafeBlankTargets)

    expect(findings).toEqual([])
  })

  test('images expose alternative text hooks', () => {
    const findings = scannedFiles.flatMap(findImagesWithoutAlt)

    expect(findings).toEqual([])
  })

  test('buttons that remove the default outline provide a visible focus style', () => {
    const findings = scannedFiles.flatMap(findButtonsWithoutVisibleFocus)

    expect(findings).toEqual([])
  })

  test('symbol-only buttons expose an accessible name hook', () => {
    const findings = scannedFiles.flatMap(findSymbolOnlyButtonsWithoutAccessibleName)

    expect(findings).toEqual([])
  })

  test('static icon-only buttons expose an accessible name hook', () => {
    const findings = scannedFiles.flatMap(findStaticIconOnlyButtonsWithoutAccessibleName)

    expect(findings).toEqual([])
  })

  test('form controls that remove the default outline provide a visible focus style', () => {
    const findings = scannedFiles.flatMap(findFormControlsWithoutVisibleFocus)

    expect(findings).toEqual([])
  })

  test('hidden selectable controls expose a visible focus proxy', () => {
    const findings = scannedFiles.flatMap(findHiddenSelectableControlsWithoutVisibleFocusProxy)

    expect(findings).toEqual([])
  })

  test('focusable elements are not hidden from assistive technology', () => {
    const findings = scannedFiles.flatMap(findFocusableElementsHiddenFromAssistiveTech)

    expect(findings).toEqual([])
  })

  test('custom button roles provide keyboard support', () => {
    const findings = scannedFiles.flatMap(findCustomButtonRolesWithoutKeyboardSupport)

    expect(findings).toEqual([])
  })

  test('custom tab roles expose semantic state and focus support', () => {
    const findings = scannedFiles.flatMap(findTabRolesWithoutSemanticStateOrFocusSupport)

    expect(findings).toEqual([])
  })

  test('custom option roles expose selection state and focus support', () => {
    const findings = scannedFiles.flatMap(findOptionRolesWithoutSelectionStateOrFocusSupport)

    expect(findings).toEqual([])
  })

  test('custom menu roles expose a name and keyboard support', () => {
    const findings = scannedFiles.flatMap(findMenuRolesWithoutNameOrKeyboardSupport)

    expect(findings).toEqual([])
  })

  test('custom menu item roles expose focus and checked state when needed', () => {
    const findings = scannedFiles.flatMap(findMenuItemRolesWithoutFocusOrCheckedState)

    expect(findings).toEqual([])
  })

  test('named structure roles expose an accessible name hook', () => {
    const findings = scannedFiles.flatMap(findNamedStructureRolesWithoutAccessibleName)

    expect(findings).toEqual([])
  })

  test('live feedback roles expose readable feedback content', () => {
    const findings = scannedFiles.flatMap(findLiveFeedbackRolesWithoutReadableContent)

    expect(findings).toEqual([])
  })

  test('static aria-describedby references point to an existing id', () => {
    const findings = scannedFiles.flatMap(findStaticDescribedByReferencesWithoutTargets)

    expect(findings).toEqual([])
  })

  test('invalid form controls expose an error description hook', () => {
    const findings = scannedFiles.flatMap(findInvalidControlsWithoutDescriptionHook)

    expect(findings).toEqual([])
  })

  test('busy elements expose readable state context', () => {
    const findings = scannedFiles.flatMap(findBusyElementsWithoutReadableState)

    expect(findings).toEqual([])
  })
})
