// UA Pool — 최신 Chrome UA + Sec-Ch-Ua 동기화
// Security Critical: Chrome/120 (2년 구버전) → 최신 Chrome으로 업데이트
// UA와 Sec-Ch-Ua 헤더 버전이 반드시 일치해야 함 (불일치 = 봇 시그널)

const CHROME_VERSIONS = ['134', '135', '136'] as const

type UAConfig = {
  userAgent: string
  secChUa: string
}

let cachedUA: UAConfig | null = null

export const getRandomUA = (): UAConfig => {
  if (cachedUA) return cachedUA
  const version = CHROME_VERSIONS[Math.floor(Math.random() * CHROME_VERSIONS.length)]
  cachedUA = {
    userAgent: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version}.0.0.0 Safari/537.36`,
    secChUa: `"Chromium";v="${version}", "Google Chrome";v="${version}", "Not.A/Brand";v="99"`,
  }
  return cachedUA
}

// 브라우저 재시작 시 새 UA 선택
export const resetUA = (): void => {
  cachedUA = null
}
