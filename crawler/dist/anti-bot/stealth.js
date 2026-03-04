// Playwright 브라우저 Stealth 설정
// webdriver 프로퍼티 숨기기, navigator.plugins 위장 등
const applyStealthSettings = async (context) => {
    await context.addInitScript(() => {
        // navigator.webdriver 숨기기
        Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined,
        });
        // chrome.runtime 위장
        const win = window;
        win['chrome'] = {
            runtime: {
                connect: () => { },
                sendMessage: () => { },
            },
        };
        // navigator.plugins 위장 (빈 배열 방지)
        Object.defineProperty(navigator, 'plugins', {
            get: () => [
                { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
                { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
                { name: 'Native Client', filename: 'internal-nacl-plugin' },
            ],
        });
        // navigator.languages 위장
        Object.defineProperty(navigator, 'languages', {
            get: () => ['en-US', 'en'],
        });
        // permissions.query 위장
        const originalQuery = window.navigator.permissions.query.bind(window.navigator.permissions);
        window.navigator.permissions.query = (parameters) => {
            if (parameters.name === 'notifications') {
                return Promise.resolve({ state: 'denied' });
            }
            return originalQuery(parameters);
        };
        // WebGL 렌더러 정보 위장
        const getParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function (parameter) {
            // UNMASKED_VENDOR_WEBGL
            if (parameter === 37445) {
                return 'Intel Inc.';
            }
            // UNMASKED_RENDERER_WEBGL
            if (parameter === 37446) {
                return 'Intel Iris OpenGL Engine';
            }
            return getParameter.call(this, parameter);
        };
    });
};
// Stealth + Fingerprint + Proxy가 적용된 브라우저 컨텍스트 생성
const createStealthContext = async (browser, fingerprint, proxy) => {
    const contextOptions = {
        userAgent: fingerprint.userAgent,
        viewport: fingerprint.viewport,
        locale: fingerprint.locale,
        timezoneId: fingerprint.timezone,
        permissions: [],
        javaScriptEnabled: true,
        ignoreHTTPSErrors: true,
    };
    if (proxy) {
        contextOptions['proxy'] = {
            server: `${proxy.protocol}://${proxy.host}:${proxy.port}`,
            username: proxy.username,
            password: proxy.password,
        };
    }
    const context = await browser.newContext(contextOptions);
    await applyStealthSettings(context);
    return context;
};
export { applyStealthSettings, createStealthContext };
//# sourceMappingURL=stealth.js.map