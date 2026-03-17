import 'dotenv/config'

export const config = {
  port: Number(process.env['PORT'] ?? '8080'),
  serviceToken: process.env['SERVICE_TOKEN'] ?? '',
  browserWs: process.env['BRIGHTDATA_BROWSER_WS'] ?? '',
  supabaseUrl: process.env['SUPABASE_URL'] ?? '',
  supabaseServiceKey: process.env['SUPABASE_SERVICE_KEY'] ?? '',
  gotoTimeout: 30_000,
  cooldownMinutes: 5,
}

const missing = Object.entries(config)
  .filter(([k, v]) => k !== 'port' && k !== 'gotoTimeout' && k !== 'cooldownMinutes' && !v)
  .map(([k]) => k)

if (missing.length > 0) {
  console.warn(`[config] Missing env vars: ${missing.join(', ')}`)
}
