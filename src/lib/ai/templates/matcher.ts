// 위반유형별 템플릿 매칭 — report_templates 테이블에서 최적 템플릿 로드
// Schema: violation_types TEXT[], body TEXT, is_default BOOLEAN, usage_count INTEGER

import { createClient } from '@/lib/supabase/server'
import { isDemoMode } from '@/lib/demo'
import { DEMO_TEMPLATES } from '@/lib/demo/templates'

const findBestTemplate = async (
  violationType: string | null,
): Promise<string | null> => {
  if (!violationType) return null

  // 데모 모드: 메모리 데이터에서 매칭
  if (isDemoMode()) {
    const match = DEMO_TEMPLATES.find(
      (t) => t.violation_types.includes(violationType) && t.is_default,
    )
    if (match) return match.body

    const fallback = DEMO_TEMPLATES.find((t) =>
      t.violation_types.includes(violationType),
    )
    return fallback?.body ?? null
  }

  // Supabase: 위반유형 배열 매칭, is_default 우선, usage_count 순
  const supabase = await createClient()
  const { data } = await supabase
    .from('report_templates')
    .select('body')
    .contains('violation_types', [violationType])
    .order('is_default', { ascending: false })
    .order('usage_count', { ascending: false })
    .limit(1)
    .single()

  return data?.body ?? null
}

export { findBestTemplate }
