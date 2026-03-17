import http from 'node:http'
import { createClient } from '@supabase/supabase-js'
import { config } from './config.js'
import { fetchProductInfo } from './scraper.js'

const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey)

// ─── Health check server ───
const server = http.createServer(async (req, res) => {
  // Health check
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true, service: 'sentinel-fetch' }))
    return
  }

  // POST /fetch — 상품 정보 수집
  if (req.method === 'POST' && req.url === '/fetch') {
    // Auth check
    const token = req.headers['x-service-token']
    if (config.serviceToken && token !== config.serviceToken) {
      res.writeHead(401, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Unauthorized' }))
      return
    }

    try {
      const body = await readBody(req)
      const { listing_id, asin, marketplace } = JSON.parse(body) as {
        listing_id: string
        asin: string
        marketplace: string
      }

      if (!listing_id || !asin) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'listing_id and asin are required' }))
        return
      }

      // 즉시 응답 — 크롤링은 백그라운드
      res.writeHead(202, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true, status: 'fetching' }))

      // 백그라운드에서 크롤링 + DB 업데이트
      processFetch(listing_id, asin, marketplace ?? 'US').catch((err) => {
        console.error(`[fetch] Background error for ${asin}:`, err)
      })
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Internal error' }))
    }
    return
  }

  res.writeHead(404)
  res.end('Not Found')
})

server.listen(config.port, () => {
  console.log(`[sentinel-fetch] listening on :${config.port}`)
})

// ─── Background fetch + DB update ───
const processFetch = async (listingId: string, asin: string, marketplace: string) => {
  console.log(`[fetch] Starting for ${asin} (${marketplace})`)

  // Mark as fetching
  await supabase
    .from('listings')
    .update({ fetch_status: 'fetching', fetch_error: null })
    .eq('id', listingId)

  try {
    const result = await fetchProductInfo(asin, marketplace)

    // Update listings table
    await supabase
      .from('listings')
      .update({
        title: result.title ?? undefined,
        seller_name: result.seller_name ?? undefined,
        brand: result.brand ?? undefined,
        description: result.description ?? undefined,
        bullet_points: result.bullet_points.length > 0 ? result.bullet_points : undefined,
        images: result.images.length > 0 ? result.images : undefined,
        price_amount: result.price_amount ?? undefined,
        price_currency: result.price_currency ?? undefined,
        rating: result.rating ?? undefined,
        review_count: result.review_count ?? undefined,
        category: result.category ?? undefined,
        fetch_status: 'completed',
        last_fetched_at: new Date().toISOString(),
        fetch_error: null,
      })
      .eq('id', listingId)

    // Update listing_snapshot on related reports
    const snapshot = {
      asin,
      title: result.title,
      marketplace,
      seller_name: result.seller_name,
    }
    await supabase
      .from('reports')
      .update({ listing_snapshot: snapshot })
      .eq('listing_id', listingId)

    console.log(`[fetch] Completed for ${asin}: "${result.title?.slice(0, 50)}"`)
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error'
    console.error(`[fetch] Failed for ${asin}:`, errorMsg)

    await supabase
      .from('listings')
      .update({
        fetch_status: 'failed',
        last_fetched_at: new Date().toISOString(),
        fetch_error: errorMsg,
      })
      .eq('id', listingId)
  }
}

// ─── Utils ───
const readBody = (req: http.IncomingMessage): Promise<string> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks).toString()))
    req.on('error', reject)
  })
