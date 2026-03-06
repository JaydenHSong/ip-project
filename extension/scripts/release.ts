#!/usr/bin/env npx tsx
// Extension 릴리즈 자동화
// 사용법: pnpm ext:release
// 동작: 빌드 → zip → Supabase Storage 업로드 → DB INSERT

import { execSync } from 'child_process'
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, cpSync } from 'fs'
import { resolve, join } from 'path'
import { createClient } from '@supabase/supabase-js'

const ROOT = resolve(__dirname, '..')
const DIST = join(ROOT, 'dist')
const MANIFEST = join(ROOT, 'manifest.json')
const TMP = join(ROOT, '.release-tmp')
const BUCKET = 'extensions'

const run = (cmd: string, cwd = ROOT): string => {
  return execSync(cmd, { cwd, encoding: 'utf-8', stdio: 'pipe' })
}

const main = async (): Promise<void> => {
  // 1. manifest에서 버전 읽기
  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf-8'))
  const version: string = manifest.version
  console.log(`\n📦 Releasing Sentinel Extension v${version}\n`)

  // 2. 체인지로그 입력 (args에서 읽기)
  const changesArg = process.argv.slice(2).join(' ')
  const changes = changesArg
    ? changesArg.split('|').map((s) => s.trim()).filter(Boolean)
    : [`v${version} release`]
  console.log(`📝 Changes: ${changes.join(', ')}`)

  // 3. 빌드
  console.log('\n🔨 Building...')
  run('node_modules/.bin/vite build')
  console.log('✅ Build complete')

  // 4. zip 생성
  console.log('\n📁 Creating zip...')
  if (existsSync(TMP)) rmSync(TMP, { recursive: true })
  const extDir = join(TMP, 'sentinel-extension')
  mkdirSync(join(extDir, 'chunks'), { recursive: true })
  mkdirSync(join(extDir, 'assets', 'icons'), { recursive: true })

  // 파일 복사
  const filesToCopy = [
    'popup.js', 'background.js', 'content.js',
    'sc-content.js', 'search-content.js', 'bot-status.js',
  ]
  for (const f of filesToCopy) {
    const src = join(DIST, f)
    if (existsSync(src)) cpSync(src, join(extDir, f))
  }

  // chunks
  const chunksDir = join(DIST, 'chunks')
  if (existsSync(chunksDir)) cpSync(chunksDir, join(extDir, 'chunks'), { recursive: true })

  // HTML
  const popupHtml = join(DIST, 'src', 'popup', 'popup.html')
  if (existsSync(popupHtml)) cpSync(popupHtml, join(extDir, 'popup.html'))
  const botHtml = join(DIST, 'src', 'pages', 'bot-status.html')
  if (existsSync(botHtml)) cpSync(botHtml, join(extDir, 'bot-status.html'))

  // CSS
  const popupCss = join(DIST, 'assets', 'popup.css')
  if (existsSync(popupCss)) cpSync(popupCss, join(extDir, 'assets', 'popup.css'))
  const botCss = join(DIST, 'assets', 'bot-status.css')
  if (existsSync(botCss)) cpSync(botCss, join(extDir, 'assets', 'bot-status.css'))

  // Icons
  cpSync(join(ROOT, 'assets', 'icons'), join(extDir, 'assets', 'icons'), { recursive: true })

  // Manifest
  cpSync(MANIFEST, join(extDir, 'manifest.json'))

  const zipName = `sentinel-extension-v${version}.zip`
  const zipPath = join(TMP, zipName)
  run(`zip -r "${zipPath}" sentinel-extension/`, TMP)
  console.log(`✅ ${zipName} created`)

  // 5. Supabase 연결
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    console.error('\n❌ Missing env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
    console.error('   Set them in .env.local or export before running')
    rmSync(TMP, { recursive: true })
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  // 6. Storage 업로드
  console.log('\n☁️  Uploading to Supabase Storage...')
  const zipBuffer = readFileSync(zipPath)
  const storagePath = `v${version}/${zipName}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, zipBuffer, {
      contentType: 'application/zip',
      upsert: true,
    })

  if (uploadError) {
    console.error(`❌ Upload failed: ${uploadError.message}`)
    rmSync(TMP, { recursive: true })
    process.exit(1)
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
  const downloadUrl = urlData.publicUrl
  console.log(`✅ Uploaded: ${downloadUrl}`)

  // 7. DB INSERT
  console.log('\n💾 Inserting release record...')
  const { error: dbError } = await supabase
    .from('extension_releases')
    .upsert({
      version,
      download_url: downloadUrl,
      changes,
      released_at: new Date().toISOString(),
    }, { onConflict: 'version' })

  if (dbError) {
    console.error(`❌ DB insert failed: ${dbError.message}`)
    rmSync(TMP, { recursive: true })
    process.exit(1)
  }
  console.log('✅ Release recorded in DB')

  // 8. public/downloads에도 복사 (fallback)
  const publicDir = resolve(ROOT, '..', 'public', 'downloads')
  if (existsSync(publicDir)) {
    cpSync(zipPath, join(publicDir, zipName))
    console.log(`✅ Copied to public/downloads/${zipName}`)
  }

  // 정리
  rmSync(TMP, { recursive: true })

  console.log(`\n🎉 Sentinel Extension v${version} released!\n`)
}

main().catch((err) => {
  console.error('❌ Release failed:', err)
  if (existsSync(TMP)) rmSync(TMP, { recursive: true })
  process.exit(1)
})
