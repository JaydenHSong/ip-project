// 페이지 스크린샷 캡처 (JPEG, base64)
// 2MB 초과 시 quality 단계 하향 (80 → 60 → 40)
const captureScreenshot = async (page, width, height) => {
    await page.setViewportSize({ width, height });
    const qualities = [80, 60, 40];
    const MAX_SIZE = 2 * 1024 * 1024; // 2MB
    for (const quality of qualities) {
        const buffer = await page.screenshot({
            type: 'jpeg',
            quality,
            fullPage: false,
        });
        if (buffer.length <= MAX_SIZE) {
            return buffer.toString('base64');
        }
    }
    // 최저 quality로도 2MB 초과 시 그대로 반환
    const buffer = await page.screenshot({
        type: 'jpeg',
        quality: 30,
        fullPage: false,
    });
    return buffer.toString('base64');
};
export { captureScreenshot };
//# sourceMappingURL=screenshot.js.map