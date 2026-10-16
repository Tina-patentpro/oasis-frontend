import { motion } from '@/components/ui/motion'
import React, { useEffect, useId, useState } from 'react'

import { AccessibleDialog } from './ui/feedback/AccessibleDialog'

// ==================== Types ====================
interface HelpSection {
  id: string
  title: string
  icon: string
}

interface HelpContent {
  title: string
  sections: {
    subtitle: string
    content: string[]
  }[]
}

type HelpSectionKey = string

interface ParsedHelpData {
  sections: HelpSection[]
  contentMap: Record<HelpSectionKey, HelpContent>
}

// ==================== Constants ====================
const HELP_DOC_URL = '/help/help-documentation.md'

// ==================== Helpers ====================
const parseHelpMarkdown = (markdown: string): ParsedHelpData => {
  const sections: HelpSection[] = []
  const contentMap: Record<HelpSectionKey, HelpContent> = {}

  const sectionMatches = [...markdown.matchAll(/^##\s+(.+)$/gm)]

  sectionMatches.forEach((match, index) => {
    const headerContent = match[1]?.trim() ?? ''
    const [id, title, icon = ''] = headerContent
      .split('|')
      .map((part) => part.trim())
      .filter(Boolean)

    if (!id || !title) {
      return
    }

    const sectionStart = match.index ?? 0
    const nextMatch = sectionMatches[index + 1]
    const sectionEnd = nextMatch?.index ?? markdown.length
    const sectionRaw = markdown.slice(sectionStart, sectionEnd)
    const firstNewlineIndex = sectionRaw.indexOf('\n')
    const sectionBody = firstNewlineIndex >= 0 ? sectionRaw.slice(firstNewlineIndex + 1).trim() : ''

    const subsectionBlocks = sectionBody
      .split(/\n(?=###\s+)/)
      .map((block) => block.trim())
      .filter((block) => block.startsWith('###'))

    const parsedSubsections = subsectionBlocks
      .map((block) => {
        const lines = block.split('\n')
        const subHeader = lines.shift()

        if (!subHeader) {
          return null
        }

        const subtitle = subHeader.replace(/^###\s+/, '').trim()
        if (!subtitle) {
          return null
        }

        const content: string[] = []

        lines.forEach((line) => {
          const trimmed = line.trim()

          if (!trimmed) {
            content.push('')
            return
          }

          if (/^[-*]\s*\d+\./.test(trimmed)) {
            content.push(trimmed.replace(/^[-*]\s*/, '').trim())
            return
          }

          if (/^[-*]/.test(trimmed)) {
            const indent = line.match(/^\s*/)?.[0].length ?? 0
            const bullet = indent >= 2 ? '◦' : '•'
            const text = trimmed.replace(/^[-*]\s*/, '').trim()
            content.push(`${bullet} ${text}`)
            return
          }

          content.push(trimmed)
        })

        return {
          subtitle,
          content,
        }
      })
      .filter((section): section is HelpContent['sections'][number] => Boolean(section))

    sections.push({ id, title, icon })
    contentMap[id] = {
      title,
      sections: parsedSubsections,
    }
  })

  return { sections, contentMap }
}

// ==================== Component ====================
interface HelpDocumentationProps {
  isOpen: boolean
  onClose: () => void
  themeColor: string
}

export const HelpDocumentation: React.FC<HelpDocumentationProps> = ({
  isOpen,
  onClose,
  themeColor,
}) => {
  const [sections, setSections] = useState<HelpSection[]>([])
  const [contentMap, setContentMap] = useState<Record<HelpSectionKey, HelpContent>>({})
  const [currentSection, setCurrentSection] = useState<HelpSectionKey | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const titleId = useId()

  useEffect(() => {
    let isMounted = true

    const loadHelpDocument = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch(HELP_DOC_URL)
        if (!response.ok) {
          throw new Error(`帮助文档加载失败（状态码：${response.status}）`)
        }

        const text = await response.text()
        if (!isMounted) {
          return
        }

        const parsed = parseHelpMarkdown(text)
        setSections(parsed.sections)
        setContentMap(parsed.contentMap)

        const firstSection = parsed.sections[0]
        if (firstSection) {
          setCurrentSection(firstSection.id)
        } else {
          setCurrentSection(null)
        }
      } catch (err) {
        if (!isMounted) {
          return
        }

        const message = err instanceof Error ? err.message : '帮助文档加载失败'
        setError(message)
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadHelpDocument()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!isOpen || sections.length === 0) {
      return
    }

    if (currentSection === null) {
      const firstSection = sections[0]
      if (firstSection) {
        setCurrentSection(firstSection.id)
      }
    }
  }, [isOpen, sections, currentSection])

  const content = currentSection ? contentMap[currentSection] : undefined
  const activeSectionMeta = currentSection
    ? sections.find((section) => section.id === currentSection)
    : undefined

  return (
    <AccessibleDialog
      isOpen={isOpen}
      onClose={onClose}
      labelledBy={titleId}
      className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex overflow-hidden relative"
    >
      {/* Left Sidebar */}
      <aside className="w-64 border-r bg-gray-50 p-4 flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h2 id={titleId} className="text-lg font-bold text-gray-900">
            帮助文档
          </h2>
          <motion.button
            onClick={onClose}
            className="h-8 w-8 rounded-lg hover:bg-gray-200 flex items-center justify-center text-gray-600"
            aria-label="关闭帮助文档"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            ✕
          </motion.button>
        </div>

        <nav className="space-y-1 flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="px-4 py-2 text-sm text-gray-500">正在加载…</div>
          ) : error ? (
            <div className="px-4 py-2 text-sm text-red-500">加载失败</div>
          ) : sections.length === 0 ? (
            <div className="px-4 py-2 text-sm text-gray-500">暂无帮助内容</div>
          ) : (
            sections.map((section) => {
              const isActive = currentSection === section.id
              return (
                <motion.button
                  key={section.id}
                  onClick={() => setCurrentSection(section.id)}
                  className={`w-full text-left px-4 py-2.5 rounded-lg flex items-center gap-3 transition-colors ${
                    isActive ? 'font-medium' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  style={
                    isActive
                      ? {
                          backgroundColor: `${themeColor}15`,
                          color: themeColor,
                        }
                      : {}
                  }
                  whileHover={{ scale: 1.02, x: 2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="text-xl">{section.icon}</span>
                  <span className="text-sm">{section.title}</span>
                </motion.button>
              )
            })
          )}
        </nav>

        <div className="mt-6 pt-6 border-t">
          <div className="text-xs text-gray-500 mb-2">需要帮助？</div>
          <motion.button
            className="w-full px-3 py-2 text-sm rounded-lg text-white"
            style={{ backgroundColor: themeColor }}
            whileHover={{ scale: 1.02, opacity: 0.9 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              onClose()
              window.dispatchEvent(new CustomEvent('openCustomerService'))
            }}
          >
            联系客服
          </motion.button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        <motion.div
          className="max-w-3xl"
          key={currentSection ?? (error ? 'error' : 'loading')}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {isLoading && <p className="text-gray-500">正在加载帮助文档，请稍候…</p>}

          {!isLoading && error && (
            <div
              className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg p-4"
              role="alert"
            >
              {error}
            </div>
          )}

          {!isLoading && !error && !content && <p className="text-gray-500">暂无帮助文档内容。</p>}

          {!isLoading && !error && content && (
            <>
              <div className="flex items-center gap-3 mb-2">
                {activeSectionMeta?.icon && (
                  <span className="text-3xl">{activeSectionMeta.icon}</span>
                )}
                <h1 className="text-3xl font-bold text-gray-900">{content.title}</h1>
              </div>
              <motion.div
                className="h-1 w-20 rounded"
                style={{ backgroundColor: themeColor }}
                initial={{ width: 0 }}
                animate={{ width: 80 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              />

              <div className="mt-8 space-y-8">
                {content.sections.map((section, index) => (
                  <motion.div
                    key={`${section.subtitle}-${index}`}
                    className="space-y-3"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                      <span
                        className="w-1.5 h-6 rounded"
                        style={{ backgroundColor: themeColor }}
                      ></span>
                      {section.subtitle}
                    </h2>
                    <div className="pl-4 space-y-2">
                      {section.content.map((line, lineIndex) => {
                        const trimmedLine = line.trim()

                        if (trimmedLine === '') {
                          return <div key={lineIndex} className="h-2"></div>
                        }

                        if (/^Q:/i.test(trimmedLine)) {
                          return (
                            <div key={lineIndex} className="font-medium text-gray-900 mt-3">
                              <span style={{ color: themeColor }}>Q:</span>{' '}
                              {trimmedLine.substring(2).trim()}
                            </div>
                          )
                        }

                        if (/^A:/i.test(trimmedLine)) {
                          return (
                            <div key={lineIndex} className="text-gray-700 leading-relaxed pl-4">
                              <span className="font-medium">A:</span>{' '}
                              {trimmedLine.substring(2).trim()}
                            </div>
                          )
                        }

                        if (/^\d+\./.test(trimmedLine)) {
                          const number = trimmedLine.match(/^\d+\./)?.[0] ?? ''
                          return (
                            <div
                              key={lineIndex}
                              className="flex items-start gap-2 text-gray-700 leading-relaxed"
                            >
                              <span className="font-medium" style={{ color: themeColor }}>
                                {number}
                              </span>
                              <span className="flex-1">{trimmedLine.replace(/^\d+\.\s*/, '')}</span>
                            </div>
                          )
                        }

                        if (trimmedLine.startsWith('•') || trimmedLine.startsWith('◦')) {
                          const isSecondary = trimmedLine.startsWith('◦')
                          return (
                            <div
                              key={lineIndex}
                              className={`flex items-start gap-2 text-gray-700 leading-relaxed ${
                                isSecondary ? 'pl-4' : ''
                              }`}
                            >
                              <span style={{ color: themeColor }}>{trimmedLine[0]}</span>
                              <span className="flex-1">{trimmedLine.substring(1).trim()}</span>
                            </div>
                          )
                        }

                        return (
                          <p key={lineIndex} className="text-gray-700 leading-relaxed">
                            {trimmedLine}
                          </p>
                        )
                      })}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Footer */}
              <motion.div
                className="mt-12 pt-8 border-t"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.4 }}
              >
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">💡</span>
                    <div>
                      <div className="text-sm font-medium text-blue-900 mb-1">提示</div>
                      <p className="text-sm text-blue-800 leading-relaxed">
                        如果您在使用过程中遇到任何问题，或者有任何建议，欢迎通过用户菜单中的“支持”功能联系我们。我们会持续改进产品，为您提供更好的体验。
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </motion.div>
      </main>
    </AccessibleDialog>
  )
}
