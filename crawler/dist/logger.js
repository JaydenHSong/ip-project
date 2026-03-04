// 구조화 로그 (JSON stdout, Railway/Docker 로그 수집 호환)
const log = (level, module, message, extra) => {
    const entry = {
        timestamp: new Date().toISOString(),
        level,
        module,
        message,
        ...extra,
    };
    const output = JSON.stringify(entry);
    switch (level) {
        case 'error':
            process.stderr.write(output + '\n');
            break;
        default:
            process.stdout.write(output + '\n');
            break;
    }
};
export { log };
//# sourceMappingURL=logger.js.map