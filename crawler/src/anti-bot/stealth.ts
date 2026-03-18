import type { Browser, BrowserContext } from 'playwright'
import type { BrowserFingerprint, ProxyConfig } from '../types/index.js'
import { getRandomUA } from '../br-auth/ua-pool.js'

// Playwright 브라우저 Stealth 설정
// webdriver 프로퍼티 숨기기, navigator.plugins 위장 등
const applyStealthSettings = async (context: BrowserContext): Promise<void> => {
  await context.addInitScript(() => {
    // navigator.webdriver 숨기기
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    })

    // chrome.runtime 위장
    const win = window as unknown as Record<string, unknown>
    win['chrome'] = {
      runtime: {
        connect: () => {},
        sendMessage: () => {},
      },
      csi: () => {},
      loadTimes: () => {},
    }

    // navigator.plugins 위장 (빈 배열 방지)
    Object.defineProperty(navigator, 'plugins', {
      get: () => [
        { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
        { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
        { name: 'Native Client', filename: 'internal-nacl-plugin' },
      ],
    })

    // navigator.languages 위장
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en'],
    })

    // navigator.hardwareConcurrency 위장 (봇은 보통 1~2)
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      get: () => [4, 8, 12, 16][Math.floor(Math.random() * 4)],
    })

    // navigator.deviceMemory 위장
    Object.defineProperty(navigator, 'deviceMemory', {
      get: () => [4, 8, 16][Math.floor(Math.random() * 3)],
    })

    // navigator.maxTouchPoints 위장 (데스크톱)
    Object.defineProperty(navigator, 'maxTouchPoints', {
      get: () => 0,
    })

    // navigator.connection 위장
    Object.defineProperty(navigator, 'connection', {
      get: () => ({
        effectiveType: '4g',
        rtt: 50,
        downlink: 10,
        saveData: false,
      }),
    })

    // permissions.query 위장
    const originalQuery = window.navigator.permissions.query.bind(
      window.navigator.permissions,
    )
    window.navigator.permissions.query = (parameters: PermissionDescriptor) => {
      if (parameters.name === 'notifications') {
        return Promise.resolve({ state: 'denied' } as PermissionStatus)
      }
      return originalQuery(parameters)
    }

    // WebGL 렌더러 정보 위장
    const getParameter = WebGLRenderingContext.prototype.getParameter
    WebGLRenderingContext.prototype.getParameter = function (parameter: number) {
      // UNMASKED_VENDOR_WEBGL
      if (parameter === 37445) {
        return 'Intel Inc.'
      }
      // UNMASKED_RENDERER_WEBGL
      if (parameter === 37446) {
        return 'Intel Iris OpenGL Engine'
      }
      return getParameter.call(this, parameter)
    }

    // Notification.permission 위장
    Object.defineProperty(Notification, 'permission', {
      get: () => 'default',
    })

    // 자동화 도구 탐지 변수 제거
    const automationProps = [
      '_phantom', '__nightmare', '_selenium', 'callPhantom',
      '_Recaptcha', 'domAutomation', 'domAutomationController',
    ]
    for (const prop of automationProps) {
      delete (window as unknown as Record<string, unknown>)[prop]
    }
  })
}

// Stealth + Fingerprint + Proxy가 적용된 브라우저 컨텍스트 생성
const createStealthContext = async (
  browser: Browser,
  fingerprint: BrowserFingerprint,
  proxy?: ProxyConfig,
): Promise<BrowserContext> => {
  const contextOptions: Record<string, unknown> = {
    userAgent: fingerprint.userAgent,
    viewport: fingerprint.viewport,
    locale: fingerprint.locale,
    timezoneId: fingerprint.timezone,
    permissions: [],
    javaScriptEnabled: true,
    ignoreHTTPSErrors: true,
    extraHTTPHeaders: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': `${fingerprint.locale},en;q=0.9`,
      'Accept-Encoding': 'gzip, deflate, br',
      'Sec-Ch-Ua': getRandomUA().secChUa,
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
    },
  }

  if (proxy) {
    contextOptions['proxy'] = {
      server: `${proxy.protocol}://${proxy.host}:${proxy.port}`,
      username: proxy.username,
      password: proxy.password,
    }
  }

  const context = await browser.newContext(contextOptions)
  await applyStealthSettings(context)

  return context
}

export { applyStealthSettings, createStealthContext }
