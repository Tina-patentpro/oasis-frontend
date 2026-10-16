import js from '@eslint/js'
import globals from 'globals'
import tseslint from '@typescript-eslint/eslint-plugin'
import tseslintParser from '@typescript-eslint/parser'
import reactPlugin from 'eslint-plugin-react'
import reactHooksPlugin from 'eslint-plugin-react-hooks'

export default [
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        React: 'readonly', // Add React global for React 19
        NodeJS: 'readonly',
        // Additional TypeScript and Web API globals
        RequestInit: 'readonly',
        HeadersInit: 'readonly',
        Response: 'readonly',
        Request: 'readonly',
        Headers: 'readonly',
        URLSearchParams: 'readonly',
        FormData: 'readonly',
        AbortController: 'readonly',
        EventSource: 'readonly',
        TextDecoder: 'readonly',
        Blob: 'readonly',
        FileReader: 'readonly',
        File: 'readonly',
        CustomEvent: 'readonly',
        KeyboardEvent: 'readonly',
        MouseEvent: 'readonly',
        ResizeObserver: 'readonly',
        crypto: 'readonly',
        TextEncoder: 'readonly',
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  js.configs.recommended,
  reactPlugin.configs.flat.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tseslintParser,
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'react-hooks': reactHooksPlugin,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-empty-object-type': 'off',
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off', // Not needed in React 19
      // Reduce severity of hooks rules for React 19 compatibility
      ...Object.fromEntries(
        Object.entries(reactHooksPlugin.configs.recommended.rules).map(([key, value]) => [
          key,
          typeof value === 'object' ? { ...value, 0: 'warn' } : 'warn',
        ]),
      ), // Add React Hooks rules as warnings, not errors
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'max-lines': [
        'warn',
        {
          max: 500,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
      complexity: ['warn', 30],
    },
  },
  {
    // 历史高复杂度函数：先冻结告警，后续结合业务拆解
    files: [
      'src/api/services/ai.service.ts',
      'src/modules/workspace/hooks/content-sections/generation-actions.ts',
      'src/components/workspace/left-sidebar/management/ProjectCard.tsx',
    ],
    rules: {
      complexity: 'off',
    },
  },
  {
    // JSX ref props passed to child components - React 19 refs rule false positive
    files: ['src/components/ChatPanel.tsx', 'src/components/DownloadFilesDialog.tsx'],
    rules: {
      'react-hooks/refs': 'off',
    },
  },
  {
    ignores: [
      'dist',
      'node_modules',
      '**/*.d.ts',
      'coverage',
      'scripts',
      '.worktrees',
      '.agent',
      '.gstack',
    ],
  },
]
