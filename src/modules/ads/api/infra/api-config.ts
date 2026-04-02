// Design Ref: §6.4 — Feature flag + environment config
// Plan SC: SC-01 Mock↔Real 무중단 전환

export const adsConfig = {
  isEnabled: () => process.env.AMAZON_ADS_ENABLED === 'true',
  isStreamEnabled: () => Boolean(process.env.AMAZON_STREAM_SQS_URL),
  isSpApiEnabled: () => Boolean(process.env.AMAZON_SP_API_REFRESH_TOKEN_US),

  ads: {
    baseUrl: 'https://advertising-api.amazon.com',
    clientId: process.env.AMAZON_CLIENT_ID ?? '',
    clientSecret: process.env.AMAZON_CLIENT_SECRET ?? '',
    redirectUri: process.env.AMAZON_ADS_REDIRECT_URI ?? '',
  },

  spApi: {
    baseUrl: 'https://sellingpartnerapi-na.amazon.com',
    tokenUrl: 'https://api.amazon.com/auth/o2/token',
  },

  stream: {
    sqsUrl: process.env.AMAZON_STREAM_SQS_URL ?? '',
    secret: process.env.AMAZON_STREAM_SECRET ?? '',
  },

  rateLimit: {
    maxRate: 10,
    burstSize: 10,
    targetUtilization: 0.6,
  },

  retry: {
    maxRetries: 4,
    baseDelay: 1000,
    maxDelay: 32000,
    retryableStatuses: [429, 500, 502, 503, 504],
  },
} as const
