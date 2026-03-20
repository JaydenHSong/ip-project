import type { LogEntry } from './types/index.js'

// 구조화 로그 (JSON stdout, Railway/Docker 로그 수집 호환)
const log = (
  level: LogEntry['level'],
  module: string,
  message: string,
  extra?: Partial<Pick<LogEntry, 'campaignId' | 'asin' | 'error' | 'duration'>>,
): void => {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    module,
    message,
    ...extra,
  }

  const output = JSON.stringify(entry)

  switch (level) {
    case 'error':
      process.stderr.write(output + '\n')
      break
    default:
      process.stdout.write(output + '\n')
      break
  }
}

export { log }
