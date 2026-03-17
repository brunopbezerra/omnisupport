import { useMemo } from 'react'
import type { FormField, FormLogic } from '@/types/forms'

function evaluateRule(
  operator: FormLogic['operator'],
  actual: string,
  expected: string
): boolean {
  switch (operator) {
    case 'equals':
      return actual.toLowerCase() === expected.toLowerCase()
    case 'not_equals':
      return actual.toLowerCase() !== expected.toLowerCase()
    case 'contains':
      return actual.toLowerCase().includes(expected.toLowerCase())
    case 'greater_than':
      return parseFloat(actual) > parseFloat(expected)
    case 'less_than':
      return parseFloat(actual) < parseFloat(expected)
    default:
      return true
  }
}

function buildVisibilityMap(
  fields: FormField[],
  logic: FormLogic[],
  values: Record<string, string>
): Record<string, boolean> {
  const map: Record<string, boolean> = {}

  for (const field of fields) {
    const rules = logic.filter(r => r.target_field_id === field.id)
    if (rules.length === 0) {
      map[field.id] = true
      continue
    }
    map[field.id] = rules.every(rule => {
      // If the source field is itself hidden, treat its value as empty
      const sourceVisible = map[rule.source_field_id] ?? true
      const actual = sourceVisible ? (values[rule.source_field_id] ?? '') : ''
      return evaluateRule(rule.operator, actual, rule.value)
    })
  }

  return map
}

export function useFormLogic(
  fields: FormField[],
  logic: FormLogic[],
  values: Record<string, string>
): Record<string, boolean> {
  return useMemo(
    () => buildVisibilityMap(fields, logic, values),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fields, logic, JSON.stringify(values)]
  )
}

export function clearHiddenValues(
  values: Record<string, string>,
  visibilityMap: Record<string, boolean>,
  fields: FormField[]
): Record<string, string> {
  const result: Record<string, string> = {}
  for (const field of fields) {
    if (visibilityMap[field.id]) {
      result[field.id] = values[field.id] ?? ''
    }
  }
  return result
}
