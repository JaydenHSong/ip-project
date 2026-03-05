import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createAdminClient } from '@/lib/supabase/admin'
import Anthropic from '@anthropic-ai/sdk'

const ANALYSIS_PROMPT = `You are an AI analyst for a web crawler system that scrapes Amazon product listings.

Below are crawler logs from the past week. Analyze them and provide actionable insights.

Focus on:
1. **Success vs Failure patterns**: Which personas/configurations succeeded? Which failed?
2. **Successful persona analysis**: If any crawl succeeded, what persona settings (typing speed, scroll behavior, dwell time) worked? Recommend creating variations of successful personas.
3. **Failure root causes**: Timeout? CAPTCHA? Bot detection? Proxy issues?
4. **Proxy performance**: Are proxy connections working? Any IP bans?
5. **Timing patterns**: Do certain times of day work better?
6. **Recommendations**: Specific, actionable changes to improve success rate.

For successful personas, provide exact parameter ranges to branch out from (e.g., "typing delay 180-450ms worked, try creating variants at 150-500ms and 200-400ms").

IMPORTANT: Respond with ONLY a JSON object:
{
  "summary": "1-2 sentence summary",
  "success_rate": number (0-100),
  "total_jobs": number,
  "successful_jobs": number,
  "insights": [
    {
      "type": "success_pattern" | "failure_pattern" | "proxy_issue" | "timing" | "persona_analysis",
      "title": "short title",
      "detail": "detailed explanation",
      "priority": "high" | "medium" | "low"
    }
  ],
  "successful_personas": [
    {
      "name": "persona name",
      "config": { "typing": "...", "scroll": "...", "dwell": "..." },
      "success_count": number,
      "recommended_variants": [
        { "name": "variant name", "changes": "what to change" }
      ]
    }
  ],
  "recommendations": [
    {
      "action": "what to do",
      "reason": "why",
      "priority": "high" | "medium" | "low",
      "category": "persona" | "proxy" | "timing" | "navigation" | "config"
    }
  ],
  "metrics": {
    "avg_duration_ms": number,
    "timeout_rate": number,
    "captcha_rate": number,
    "proxy_error_rate": number
  }
}`

// POST /api/ai/learn-crawler — 크롤러 로그 AI 분석 (주 1회)
export const POST = withAuth(async (req) => {
  const body = await req.json() as { days?: number }
  const days = body.days ?? 7

  const supabase = createAdminClient()

  // 분석 기간
  const periodEnd = new Date()
  const periodStart = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  // 크롤러 로그 조회
  const { data: logs, error: logError } = await supabase
    .from('crawler_logs')
    .select('*')
    .gte('created_at', periodStart.toISOString())
    .lte('created_at', periodEnd.toISOString())
    .order('created_at', { ascending: false })
    .limit(500)

  if (logError) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: logError.message } },
      { status: 500 },
    )
  }

  if (!logs || logs.length === 0) {
    return NextResponse.json({
      message: 'No crawler logs found for the specified period',
      period: { start: periodStart.toISOString(), end: periodEnd.toISOString() },
    })
  }

  // 이전 학습 기록 조회 (컨텍스트용)
  const { data: prevLearnings } = await supabase
    .from('ai_learning_records')
    .select('summary, recommendations, metrics')
    .eq('category', 'crawler')
    .order('created_at', { ascending: false })
    .limit(3)

  // 로그를 Claude에게 전달
  const logsForAi = logs.map((l) => ({
    type: l.type,
    keyword: l.keyword,
    marketplace: l.marketplace,
    listings_found: l.listings_found,
    listings_sent: l.listings_sent,
    errors: l.errors,
    captchas: l.captchas,
    duration_ms: l.duration_ms,
    message: l.message,
    error_code: l.error_code,
    created_at: l.created_at,
  }))

  const prevContext = prevLearnings && prevLearnings.length > 0
    ? `\n\nPrevious analysis results (for context):\n${JSON.stringify(prevLearnings.map((p) => p.summary), null, 2)}`
    : ''

  const apiKey = process.env['ANTHROPIC_API_KEY']
  if (!apiKey) {
    return NextResponse.json(
      { error: { code: 'CONFIG_ERROR', message: 'ANTHROPIC_API_KEY not configured' } },
      { status: 503 },
    )
  }

  const client = new Anthropic({ apiKey })

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `${ANALYSIS_PROMPT}\n\nCrawler logs (${logs.length} entries, past ${days} days):\n${JSON.stringify(logsForAi, null, 2)}${prevContext}`,
      },
    ],
  })

  const textBlock = response.content.find((b) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    return NextResponse.json(
      { error: { code: 'AI_ERROR', message: 'No text response from Claude' } },
      { status: 500 },
    )
  }

  // JSON 파싱
  const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return NextResponse.json(
      { error: { code: 'AI_ERROR', message: 'Could not parse AI response as JSON' } },
      { status: 500 },
    )
  }

  const analysis = JSON.parse(jsonMatch[0]) as {
    summary: string
    insights: unknown[]
    recommendations: unknown[]
    metrics: Record<string, unknown>
    successful_personas?: unknown[]
  }

  // DB에 학습 기록 저장
  const { data: record, error: insertError } = await supabase
    .from('ai_learning_records')
    .insert({
      category: 'crawler',
      source: 'crawler_logs',
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      summary: analysis.summary,
      insights: analysis.insights,
      recommendations: analysis.recommendations,
      metrics: {
        ...analysis.metrics,
        successful_personas: analysis.successful_personas ?? [],
        logs_analyzed: logs.length,
      },
      model: 'claude-haiku-4-5-20251001',
      tokens_used: response.usage.input_tokens + response.usage.output_tokens,
    })
    .select('id')
    .single()

  if (insertError) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: insertError.message } },
      { status: 500 },
    )
  }

  return NextResponse.json({
    learning_record_id: record.id,
    ...analysis,
    period: {
      start: periodStart.toISOString(),
      end: periodEnd.toISOString(),
      logs_analyzed: logs.length,
    },
  })
}, ['owner', 'admin'])
