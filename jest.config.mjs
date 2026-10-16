/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.(test|spec).+(ts|tsx|js)', '**/?(*.)+(spec|test).+(ts|tsx|js)'],
  testPathIgnorePatterns: ['/node_modules/', '/__tests__/setup.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react-jsx',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
        },
      },
    ],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^rehype-katex$': '<rootDir>/src/__tests__/mocks/markdown-plugin.ts',
    '^rehype-sanitize$': '<rootDir>/src/__tests__/mocks/markdown-plugin.ts',
    '^remark-gfm$': '<rootDir>/src/__tests__/mocks/markdown-plugin.ts',
    '^remark-math$': '<rootDir>/src/__tests__/mocks/markdown-plugin.ts',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/vite-env.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/__tests__/**',
  ],
  coverageThreshold: {
    // Audited integer floors from the 1.0.5 pre-release baseline. Keep these
    // machine-enforced so later changes cannot silently lower coverage.
    global: {
      branches: 62,
      functions: 69,
      lines: 74,
      statements: 73,
    },
  },
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
  testTimeout: 10000,
}

export default config
