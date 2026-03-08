import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DEFAULT_DEV_SERVER_PORT = 5183

const parseDevServerPort = (rawPort) => {
  const normalizedPort = rawPort || String(DEFAULT_DEV_SERVER_PORT)
  const parsedPort = Number(normalizedPort)

  if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
    return DEFAULT_DEV_SERVER_PORT
  }

  return parsedPort
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const envDir = path.resolve(__dirname, '..')
  const env = loadEnv(mode, envDir, '')
  const rawPort = env.VITE_DEV_SERVER_PORT || env.OPENWHISPR_DEV_SERVER_PORT
  const devServerPort = parseDevServerPort(rawPort)

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'write-runtime-env',
        writeBundle() {
          const runtimeEnv = {
            VITE_OPENWHISPR_API_URL: env.VITE_OPENWHISPR_API_URL || '',
          }
          fs.writeFileSync(
            path.resolve(__dirname, 'dist', 'runtime-env.json'),
            JSON.stringify(runtimeEnv)
          )
        },
      },
    ],
    base: './', // Use relative paths for file:// protocol in Electron
    envDir, // Load .env from project root
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
    server: {
      port: devServerPort,
      strictPort: true,
      host: '127.0.0.1', // Use IP address instead of localhost for Neon Auth CORS
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      rollupOptions: {
        external: [
          'electron',
          'fs',
          'path',
          'child_process',
          'https',
          'http',
          'crypto',
          'os',
          'stream',
          'util',
          'zlib',
          'tar',
          'unzipper',
          '@aws-sdk/client-s3'
        ],
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/lucide-react')) {
              return 'vendor-icons'
            }

            if (
              id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/scheduler/')
            ) {
              return 'vendor-react'
            }

            if (
              id.includes('node_modules/i18next/') ||
              id.includes('node_modules/react-i18next/')
            ) {
              return 'vendor-i18n'
            }

            if (id.includes('node_modules/zustand/')) {
              return 'vendor-state'
            }

            const localeMatch = id.match(/\/src\/locales\/([^/]+)\//)
            if (localeMatch?.[1]) {
              return `locale-${localeMatch[1].toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
            }

            if (
              id.includes('/src/locales/prompts.ts') ||
              id.includes('/src/locales/translations.ts')
            ) {
              return 'vendor-locales-core'
            }
          },
        },
      }
    }
  }
})
