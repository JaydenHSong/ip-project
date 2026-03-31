// Design Ref: §2.1 shared/hooks — 안전장치 검증 훅
'use client'

import { useState, useCallback } from 'react'
import { checkGuardrails, type GuardrailResult } from '../../engine/guardrails'

type UseGuardrailsReturn = {
  check: (params: Parameters<typeof checkGuardrails>[0]) => GuardrailResult
  lastResult: GuardrailResult | null
  isBlocked: boolean
}

const useGuardrails = (): UseGuardrailsReturn => {
  const [lastResult, setLastResult] = useState<GuardrailResult | null>(null)

  const check = useCallback((params: Parameters<typeof checkGuardrails>[0]) => {
    const result = checkGuardrails(params)
    setLastResult(result)
    return result
  }, [])

  return {
    check,
    lastResult,
    isBlocked: lastResult?.blocked ?? false,
  }
}

export { useGuardrails }
