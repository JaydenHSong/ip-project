import type { BrowserFingerprint, Marketplace } from '../types/index.js'

// 실제 브라우저 User-Agent 풀
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
] as const

// 실제 모니터 해상도 풀
const VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1536, height: 864 },
  { width: 1680, height: 1050 },
  { width: 2560, height: 1440 },
] as const

// 마켓플레이스별 locale/timezone 매핑
const MARKETPLACE_LOCALE: Record<Marketplace, { locale: string; timezone: string }> = {
  US: { locale: 'en-US', timezone: 'America/New_York' },
  UK: { locale: 'en-GB', timezone: 'Europe/London' },
  JP: { locale: 'ja-JP', timezone: 'Asia/Tokyo' },
  DE: { locale: 'de-DE', timezone: 'Europe/Berlin' },
  FR: { locale: 'fr-FR', timezone: 'Europe/Paris' },
  IT: { locale: 'it-IT', timezone: 'Europe/Rome' },
  ES: { locale: 'es-ES', timezone: 'Europe/Madrid' },
  CA: { locale: 'en-CA', timezone: 'America/Toronto' },
  MX: { locale: 'es-MX', timezone: 'America/Mexico_City' },
  AU: { locale: 'en-AU', timezone: 'Australia/Sydney' },
}

const WEBGL_VENDORS = ['Intel Inc.', 'Google Inc.', 'NVIDIA Corporation'] as const
const WEBGL_RENDERERS = [
  'Intel Iris OpenGL Engine',
  'ANGLE (Intel, Intel(R) UHD Graphics 630, OpenGL 4.1)',
  'ANGLE (NVIDIA, NVIDIA GeForce GTX 1650, OpenGL 4.5)',
  'ANGLE (Intel, Intel(R) Iris(R) Plus Graphics, OpenGL 4.1)',
] as const

const PLATFORMS = ['Win32', 'MacIntel', 'Linux x86_64'] as const

const randomItem = <T>(arr: readonly T[]): T => {
  return arr[Math.floor(Math.random() * arr.length)]!
}

// 랜덤 Fingerprint 생성
const generateFingerprint = (marketplace: Marketplace): BrowserFingerprint => {
  const localeInfo = MARKETPLACE_LOCALE[marketplace]

  return {
    userAgent: randomItem(USER_AGENTS),
    viewport: randomItem(VIEWPORTS),
    locale: localeInfo.locale,
    timezone: localeInfo.timezone,
    platform: randomItem(PLATFORMS),
    webglVendor: randomItem(WEBGL_VENDORS),
    webglRenderer: randomItem(WEBGL_RENDERERS),
  }
}

export { generateFingerprint }
