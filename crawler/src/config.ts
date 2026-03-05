import 'dotenv/config'

type CrawlerConfig = {
  sentinelApiUrl: string
  serviceToken: string
  redis: {
    url: string
  }
  proxy: {
    host: string
    port: number
    username: string
    password: string
  }
  concurrency: number
  pageDelayMin: number
  pageDelayMax: number
  detailDelayMin: number
  detailDelayMax: number
  maxRetries: number
  screenshotWidth: number
  screenshotHeight: number
  googleChatWebhookUrl: string | null
}

const optionalEnv = (key: string, defaultValue: string): string => {
  return process.env[key] || defaultValue
}

const loadConfig = (): CrawlerConfig => {
  const missing: string[] = []

  const check = (key: string): string => {
    const value = process.env[key]
    if (!value) missing.push(key)
    return value ?? ''
  }

  const config: CrawlerConfig = {
    sentinelApiUrl: check('SENTINEL_API_URL'),
    serviceToken: check('SENTINEL_SERVICE_TOKEN'),
    redis: {
      url: process.env['REDIS_URL'] || check('UPSTASH_REDIS_URL'),
    },
    proxy: {
      host: check('BRIGHTDATA_PROXY_HOST'),
      port: Number(optionalEnv('BRIGHTDATA_PROXY_PORT', '33335')),
      username: check('BRIGHTDATA_PROXY_USER'),
      password: check('BRIGHTDATA_PROXY_PASS'),
    },
    concurrency: Number(optionalEnv('CRAWLER_CONCURRENCY', '3')),
    pageDelayMin: Number(optionalEnv('CRAWLER_PAGE_DELAY_MIN', '2000')),
    pageDelayMax: Number(optionalEnv('CRAWLER_PAGE_DELAY_MAX', '5000')),
    detailDelayMin: Number(optionalEnv('CRAWLER_DETAIL_DELAY_MIN', '1500')),
    detailDelayMax: Number(optionalEnv('CRAWLER_DETAIL_DELAY_MAX', '4000')),
    maxRetries: Number(optionalEnv('CRAWLER_MAX_RETRIES', '3')),
    screenshotWidth: 1280,
    screenshotHeight: 800,
    googleChatWebhookUrl: process.env['GOOGLE_CHAT_WEBHOOK_URL'] || null,
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.map((k) => `  - ${k}`).join('\n')}\n\nSee .env.example for reference.`,
    )
  }

  return config
}

export { loadConfig }
export type { CrawlerConfig }
