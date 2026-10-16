import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import path from 'path'
import { readFileSync } from 'node:fs'

import { createSecurityCsp, createSecurityHeaders } from './src/config/security'

const splitEnvList = (value: string | undefined): string[] =>
  (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const packageJson = JSON.parse(
    readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'),
  ) as {
    version?: string
  }
  const apiBaseUrl = env.VITE_API_BASE_URL || 'http://localhost:3000'
  const apiProxyTarget = apiBaseUrl.replace(/\/api\/?$/, '')
  const isDevMode = mode === 'development'
  const cspSources = {
    apiBaseUrl,
    sentryDsn: env.VITE_SENTRY_DSN,
    imgOrigins: splitEnvList(env.VITE_CSP_IMG_ORIGINS || 'https://api.qrserver.com'),
    connectOrigins: splitEnvList(env.VITE_CSP_CONNECT_ORIGINS),
  }
  const cspForMode = createSecurityCsp({
    allowInlineScripts: isDevMode,
    includeLocalDevelopmentOrigins: isDevMode,
    sources: cspSources,
  })
  const appVersion =
    env.VITE_APP_VERSION?.trim() ||
    process.env.npm_package_version ||
    packageJson.version ||
    '0.0.0'

  return {
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
      'globalThis.__APP_VERSION__': JSON.stringify(appVersion),
    },
    plugins: [
      tsconfigPaths(),
      react(),
      {
        name: 'inject-csp-meta',
        transformIndexHtml(html) {
          const cspMetaTag = `<meta http-equiv="Content-Security-Policy" content="${cspForMode}" />`
          if (html.includes('http-equiv="Content-Security-Policy"')) {
            return html.replace(
              /<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/i,
              cspMetaTag,
            )
          }
          return html.replace('</head>', `    ${cspMetaTag}\n  </head>`)
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@modules': path.resolve(__dirname, './src/modules'),
        '@shared': path.resolve(__dirname, './src/components/shared'),
      },
    },
    esbuild: {
      drop: mode === 'production' ? ['console', 'debugger'] : [],
    },
    build: {
      target: 'es2020',
      // Keep Vite's decimal-kB warning aligned with the stricter
      // scripts/build/check-bundle-size.mjs gate, which enforces 600 KiB.
      chunkSizeWarningLimit: 620,
      rollupOptions: {
        input: path.resolve(__dirname, 'index.html'),
        output: {
          manualChunks(id) {
            const normalizedId = id.replace(/\\/g, '/')

            if (!normalizedId.includes('/node_modules/')) {
              if (normalizedId.includes('vite/preload-helper')) {
                return 'runtime-vendor'
              }
              return undefined
            }

            if (
              normalizedId.includes('/node_modules/react/') ||
              normalizedId.includes('/node_modules/react-dom/') ||
              normalizedId.includes('/node_modules/react-router-dom/') ||
              normalizedId.includes('/node_modules/scheduler/')
            ) {
              return 'react-core-vendor'
            }

            if (
              normalizedId.includes('/node_modules/framer-motion/') ||
              normalizedId.includes('/node_modules/lucide-react/')
            ) {
              return 'ui-vendor'
            }

            if (
              normalizedId.includes('/node_modules/react-markdown/') ||
              normalizedId.includes('/node_modules/react-syntax-highlighter/') ||
              normalizedId.includes('/node_modules/remark-gfm/') ||
              normalizedId.includes('/node_modules/remark-math/') ||
              normalizedId.includes('/node_modules/rehype-raw/') ||
              normalizedId.includes('/node_modules/rehype-katex/') ||
              normalizedId.includes('/node_modules/refractor/') ||
              normalizedId.includes('/node_modules/prismjs/') ||
              normalizedId.includes('/node_modules/katex/')
            ) {
              return 'markdown-vendor'
            }

            if (
              normalizedId.includes('/node_modules/d3/') ||
              /\/node_modules\/d3-[^/]+\//.test(normalizedId)
            ) {
              return 'diagram-d3-vendor'
            }

            if (normalizedId.includes('/node_modules/langium/')) {
              return 'diagram-langium-vendor'
            }

            if (
              normalizedId.includes('/node_modules/chevrotain/') ||
              normalizedId.includes('/node_modules/chevrotain-allstar/') ||
              normalizedId.includes('/node_modules/@chevrotain/')
            ) {
              return 'diagram-chevrotain-vendor'
            }

            if (normalizedId.includes('/node_modules/@mermaid-js/parser/')) {
              return 'diagram-parser-vendor'
            }

            if (
              normalizedId.includes('/node_modules/dagre-d3-es/') ||
              normalizedId.includes('/node_modules/dagre/') ||
              normalizedId.includes('/node_modules/graphlib/')
            ) {
              return 'diagram-layout-vendor'
            }

            if (
              normalizedId.includes('/node_modules/cytoscape-cose-bilkent/') ||
              normalizedId.includes('/node_modules/cytoscape-fcose/')
            ) {
              return 'diagram-graph-layout-vendor'
            }

            if (normalizedId.includes('/node_modules/cytoscape/')) {
              return 'diagram-graph-core-vendor'
            }

            if (normalizedId.includes('/node_modules/roughjs/')) {
              return 'diagram-rough-vendor'
            }

            if (normalizedId.includes('/node_modules/khroma/')) {
              return 'diagram-style-vendor'
            }

            if (
              normalizedId.includes('/node_modules/lodash-es/') ||
              normalizedId.includes('/node_modules/dayjs/') ||
              normalizedId.includes('/node_modules/marked/') ||
              normalizedId.includes('/node_modules/stylis/') ||
              normalizedId.includes('/node_modules/ts-dedent/') ||
              normalizedId.includes('/node_modules/es-toolkit/') ||
              normalizedId.includes('/node_modules/uuid/') ||
              normalizedId.includes('/node_modules/dompurify/') ||
              normalizedId.includes('/node_modules/@braintree/sanitize-url/') ||
              normalizedId.includes('/node_modules/@iconify/utils/') ||
              normalizedId.includes('/node_modules/@upsetjs/venn.js/')
            ) {
              return 'diagram-utils-vendor'
            }

            if (normalizedId.includes('/node_modules/mermaid/dist/mermaid.core.mjs')) {
              return 'diagram-core-vendor'
            }

            if (normalizedId.includes('/node_modules/mermaid/dist/chunks/mermaid.core/')) {
              return undefined
            }

            if (
              normalizedId.includes('/node_modules/mermaid/') ||
              normalizedId.includes('/node_modules/@mermaid-js/')
            ) {
              return 'diagram-vendor'
            }

            if (normalizedId.includes('/node_modules/zustand/')) {
              return 'state-vendor'
            }

            return undefined
          },
        },
      },
    },
    server: {
      host: '127.0.0.1',
      port: 5180,
      strictPort: false,
      open: '/',
      headers: createSecurityHeaders({
        allowInlineScripts: isDevMode,
        includeLocalDevelopmentOrigins: isDevMode,
        sources: cspSources,
      }),
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
        '/uploads': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
    },
    preview: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: false,
      headers: createSecurityHeaders({
        allowInlineScripts: isDevMode,
        includeLocalDevelopmentOrigins: isDevMode,
        sources: cspSources,
      }),
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
        '/uploads': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
