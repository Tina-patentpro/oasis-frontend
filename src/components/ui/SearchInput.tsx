import React, { useState, useCallback, memo } from 'react'
import { SearchIcon, XIcon } from 'lucide-react'

interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: string
  onChange: (value: string) => void
  onSearch?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  showClearButton?: boolean
  debounceMs?: number
  variant?: 'default' | 'workspace'
}

/**
 * 搜索输入组件
 * 支持防抖、清空、实时搜索等功能
 */
const SearchInputComponent: React.FC<SearchInputProps> = ({
  value,
  onChange,
  onSearch,
  placeholder = '搜索…',
  disabled = false,
  className = '',
  showClearButton = true,
  debounceMs = 300,
  variant = 'default',
  ...inputProps
}) => {
  const [inputValue, setInputValue] = useState(value)

  // 防抖处理
  const debounceTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)
  const lastLocalValueRef = React.useRef(value)

  const handleInputChange = useCallback(
    (newValue: string) => {
      lastLocalValueRef.current = newValue
      setInputValue(newValue)
      onChange(newValue)

      // 清除之前的防抖定时器
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }

      // 设置新的防抖定时器
      debounceTimeoutRef.current = setTimeout(() => {
        onSearch?.(newValue)
      }, debounceMs)
    },
    [onChange, onSearch, debounceMs],
  )

  const handleClear = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
      debounceTimeoutRef.current = null
    }
    setInputValue('')
    lastLocalValueRef.current = ''
    onChange('')
    onSearch?.('')
  }, [onChange, onSearch])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current)
          debounceTimeoutRef.current = null
        }
        onSearch?.(inputValue)
      }
    },
    [onSearch, inputValue],
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleInputChange(e.target.value)
    },
    [handleInputChange],
  )

  React.useEffect(() => {
    if (value !== lastLocalValueRef.current && debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
      debounceTimeoutRef.current = null
    }
    lastLocalValueRef.current = value
    setInputValue(value)
  }, [value])

  React.useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [])

  const isWorkspaceVariant = variant === 'workspace'
  const inputClassName = isWorkspaceVariant
    ? `w-full rounded-2xl border px-12 pr-11 py-3 text-[15px] font-medium transition-[background-color,border-color,color,box-shadow,opacity,transform] duration-200 focus:outline-none ${
        disabled
          ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-500'
          : 'border-emerald-200/80 bg-gradient-to-b from-white to-emerald-50/30 text-slate-700 placeholder:text-slate-400 shadow-[0_1px_2px_rgba(15,23,42,0.06)] hover:border-emerald-300 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100'
      }`
    : `w-full rounded-lg border border-gray-300 pl-10 pr-10 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
        disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
      }`
  const iconWrapClassName = isWorkspaceVariant
    ? 'absolute left-3 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full border border-emerald-100 bg-white text-slate-400 pointer-events-none'
    : 'absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none'
  const clearButtonClassName = isWorkspaceVariant
    ? 'absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-transparent bg-white/90 p-1 text-slate-400 shadow-sm transition hover:border-emerald-200 hover:text-emerald-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2'
    : 'absolute right-3 top-1/2 -translate-y-1/2 rounded-full text-gray-500 hover:text-gray-600 focus:outline-none focus:text-gray-600 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2'

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={inputClassName}
          aria-label={inputProps['aria-label'] ?? placeholder}
          {...inputProps}
        />

        {/* 搜索图标 */}
        <div className={iconWrapClassName}>
          <SearchIcon className="w-5 h-5" />
        </div>

        {/* 清空按钮 */}
        {showClearButton && inputValue && !disabled && (
          <button
            onClick={handleClear}
            className={clearButtonClassName}
            aria-label="清空搜索"
            type="button"
          >
            <XIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 加载状态指示器 */}
      {disabled && (
        <div
          className={`absolute inset-0 flex items-center justify-center rounded-lg ${
            isWorkspaceVariant ? 'bg-white/70 backdrop-blur-[1px]' : 'bg-white bg-opacity-75'
          }`}
        >
          <div
            className={`animate-spin rounded-full h-5 w-5 border-b-2 border-t-transparent ${
              isWorkspaceVariant ? 'border-emerald-500' : 'border-blue-500'
            }`}
          ></div>
        </div>
      )}
    </div>
  )
}

export const SearchInput = memo(SearchInputComponent)
SearchInput.displayName = 'SearchInput'
