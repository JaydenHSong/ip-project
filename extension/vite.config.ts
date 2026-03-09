import { defineConfig, build as viteBuild } from 'vite'
import { resolve } from 'path'
import { readFileSync, writeFileSync, readdirSync } from 'fs'
import type { Plugin } from 'vite'

// Chrome Extension에서는 crossorigin 속성이 CSP 위반으로 스크립트 로딩을 차단함
// Vite가 자동 삽입하는 crossorigin + modulepreload를 제거하는 플러그인
function stripCrossoriginPlugin(): Plugin {
  return {
    name: 'strip-crossorigin',
    closeBundle() {
      const distDir = resolve(__dirname, 'dist')
      const htmlFiles = readdirSync(distDir).filter((f) => f.endsWith('.html'))
      // dist/src/ 하위 HTML도 처리
      const srcDir = resolve(distDir, 'src')
      try {
        const walkHtml = (dir: string): string[] => {
          const results: string[] = []
          for (const entry of readdirSync(dir, { withFileTypes: true })) {
            if (entry.isDirectory()) results.push(...walkHtml(resolve(dir, entry.name)))
            else if (entry.name.endsWith('.html')) results.push(resolve(dir, entry.name))
          }
          return results
        }
        htmlFiles.push(...walkHtml(srcDir).map((p) => p.replace(distDir + '/', '')))
      } catch { /* src dir may not exist */ }

      for (const file of htmlFiles) {
        const fullPath = resolve(distDir, file)
        let html = readFileSync(fullPath, 'utf-8')
        // crossorigin 속성 제거
        html = html.replace(/\s+crossorigin/g, '')
        // modulepreload → preload (Chrome Extension 호환)
        html = html.replace(/rel="modulepreload"/g, 'rel="preload" as="script"')
        writeFileSync(fullPath, html)
      }
    },
  }
}

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
  plugins: [stripCrossoriginPlugin(), buildContentScriptsPlugin()],
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
