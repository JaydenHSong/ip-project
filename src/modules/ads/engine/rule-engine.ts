// AD Optimizer — Rule Engine
// Design Ref: §2.1 engine/rule-engine.ts — IF/THEN 규칙 실행기

import type { RuleCondition, RuleEvaluation } from './types'

type RuleDefinition = {
  id: string
  name: string
  conditions: RuleCondition[]
  action: string
  action_params: Record<string, unknown>
}

type MetricRow = {
  id: string
  [key: string]: unknown
}

const evaluateCondition = (condition: RuleCondition, value: number): boolean => {
  switch (condition.operator) {
    case 'gt':  return value > condition.value
    case 'gte': return value >= condition.value
    case 'lt':  return value < condition.value
    case 'lte': return value <= condition.value
    case 'eq':  return value === condition.value
    case 'between':
      return condition.value2 !== undefined
        ? value >= condition.value && value <= condition.value2
        : false
    default: return false
  }
}

const evaluateRule = (rule: RuleDefinition, rows: MetricRow[]): RuleEvaluation => {
  const matched_ids: string[] = []

  for (const row of rows) {
    const allMatch = rule.conditions.every((cond) => {
      const val = row[cond.metric]
      if (typeof val !== 'number') return false
      return evaluateCondition(cond, val)
    })

    if (allMatch) {
      matched_ids.push(row.id)
    }
  }

  return {
    rule_id: rule.id,
    matched: matched_ids.length > 0,
    affected_count: matched_ids.length,
    affected_ids: matched_ids,
    action: rule.action,
    action_params: rule.action_params,
  }
}

export { evaluateRule, evaluateCondition }
export type { RuleDefinition, MetricRow }
