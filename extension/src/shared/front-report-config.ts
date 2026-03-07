// V01-V19 front-end reportability check (shared between SW and content script)
// V01-V03 redirect to separate IP form — not automatable from product page

const NON_FRONT_REPORTABLE = new Set(['V01', 'V02', 'V03'])

export const isFrontReportable = (violationCode: string): boolean =>
  !NON_FRONT_REPORTABLE.has(violationCode)
