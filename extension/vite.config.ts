import { defineConfig, build as viteBuild } from 'vite'
import { resolve } from 'path'
import type { Plugin } from 'vite'

// Content scripts를 개별 IIFE로 빌드하는 플러그인
// ES module import 없이 단일 파일로 번들 → manifest content_scripts + executeScript 모두 호환
const contentScriptEntries: Record<string, string> = {
  content: resolve(__dirname, 'src/content/index.ts'),
  'search-content': resolve(__dirname, 'src/content/search-content.ts'),
  'sc-content': resolve(__dirname, 'src/content/sc-form-filler.ts'),
  'br-content': resolve(__dirname, 'src/content/br-form-filler.ts'),
}

function buildContentScriptsPlugin(): Plugin {
  return {
    name: 'build-content-scripts-iife',
    async closeBundle() {
      for (const [name, entry] of Object.entries(contentScriptEntries)) {
        await viteBuild({
          configFile: false,
          build: {
            outDir: resolve(__dirname, 'dist'),
            emptyOutDir: false,
            rollupOptions: {
              input: { [name]: entry },
              output: {
                format: 'iife',
                entryFileNames: '[name].js',
              },
            },
            // content script는 소스맵/minify 메인 빌드와 동일 설정
            minify: true,
          },
          resolve: {
            alias: {
              '@shared': resolve(__dirname, 'src/shared'),
            },
          },
        })
      }
    },
  }
}

export default defineConfig({
  plugins: [buildContentScriptsPlugin()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/popup.html'),
        background: resolve(__dirname, 'src/background/service-worker.ts'),
        'bot-status': resolve(__dirname, 'src/pages/bot-status.html'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
    },
  },
})
