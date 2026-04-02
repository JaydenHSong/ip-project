// Design Ref: §6.2 — Exponential backoff with jitter
// Plan SC: SC-07 Sync 실패 자동 복구

import { adsConfig } from './api-config'

export type RetryOptions = {
  maxRetries: number
  baseDelay: number
  maxDelay: number
  retryableStatuses: number[]
}

export class RetryableError extends Error {
  constructor(
    message: string,
    public status: number,
    public retryAfter?: number,
  ) {
    super(message)
    this.name = 'RetryableError'
  }
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: Partial<RetryOptions>,
): Promise<T> {
  const opts: RetryOptions = {
    maxRetries: options?.maxRetries ?? adsConfig.retry.maxRetries,
    baseDelay: options?.baseDelay ?? adsConfig.retry.baseDelay,
    maxDelay: options?.maxDelay ?? adsConfig.retry.maxDelay,
    retryableStatuses: options?.retryableStatuses ?? [...adsConfig.retry.retryableStatuses],
  }

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))

      if (attempt === opts.maxRetries) break

      // Only retry on retryable errors
      if (err instanceof RetryableError) {
        if (!opts.retryableStatuses.includes(err.status)) break

        // Use Retry-After header if available (429)
        const delay = err.retryAfter
          ? err.retryAfter * 1000
          : calculateDelay(attempt, opts.baseDelay, opts.maxDelay)

        await sleep(delay)
      } else {
        // Non-RetryableError: don't retry
        break
      }
    }
  }

  throw lastError
}

function calculateDelay(attempt: number, baseDelay: number, maxDelay: number): number {
  // Exponential backoff with jitter
  const exponential = baseDelay * Math.pow(2, attempt)
  const jitter = Math.random() * baseDelay
  return Math.min(exponential + jitter, maxDelay)
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
