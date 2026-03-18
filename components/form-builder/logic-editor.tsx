'use client'

import { HugeiconsIcon } from '@hugeicons/react'
import { Add01Icon, Cancel01Icon } from '@hugeicons/core-free-icons'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { FormField, FormLogic, LogicOperator } from '@/types/forms'

const CHOICE_TYPES: FormField['type'][] = ['select', 'radio', 'checkbox']

const BASE_OPERATORS: { value: LogicOperator; label: string }[] = [
  { value: 'equals', label: 'é igual a' },
  { value: 'not_equals', label: 'não é igual a' },
  { value: 'contains', label: 'contém' },
]

const NUMERIC_OPERATORS: { value: LogicOperator; label: string }[] = [
  { value: 'greater_than', label: 'é maior que' },
  { value: 'less_than', label: 'é menor que' },
]

function getOperatorsForField(field: FormField | undefined) {
  if (field?.type === 'number') return [...BASE_OPERATORS, ...NUMERIC_OPERATORS]
  return BASE_OPERATORS
}

function wouldCreateCycle(
  sourceId: string,
  targetId: string,
  existingRules: FormLogic[]
): boolean {
  const graph = new Map<string, Set<string>>()
  for (const rule of existingRules) {
    if (!graph.has(rule.source_field_id)) graph.set(rule.source_field_id, new Set())
    graph.get(rule.source_field_id)!.add(rule.target_field_id)
  }
  const visited = new Set<string>()
  const stack = [targetId]
  while (stack.length) {
    const node = stack.pop()!
    if (node === sourceId) return true
    if (visited.has(node)) continue
    visited.add(node)
    const neighbors = graph.get(node)
    if (neighbors) stack.push(...neighbors)
  }
  return false
}

interface Props {
  field: FormField
  allFields: FormField[]
  logic: FormLogic[]
  onAdd: (sourceFieldId: string, targetFieldId: string) => void
  onRemove: (id: string) => void
  onUpdate: (id: string, patch: Partial<FormLogic>) => void
}

export function LogicEditor({ field, allFields, logic, onAdd, onRemove, onUpdate }: Props) {
  const rules = logic.filter(r => r.target_field_id === field.id)
  const sourceOptions = allFields.filter(f => f.id !== field.id)

  function handleAdd() {
    if (sourceOptions.length === 0) return
    const defaultSource = sourceOptions[0]
    if (wouldCreateCycle(defaultSource.id, field.id, logic)) return
    onAdd(defaultSource.id, field.id)
  }

  return (
    <div className="space-y-2">
      {rules.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Nenhuma regra. Este campo será sempre exibido.
        </p>
      )}

      {rules.map(rule => {
        const sourceField = allFields.find(f => f.id === rule.source_field_id)
        const availableOperators = getOperatorsForField(sourceField)
        const currentOpValid = availableOperators.some(o => o.value === rule.operator)
        const isChoiceSource = sourceField && CHOICE_TYPES.includes(sourceField.type)
        const sourceOptions_ = sourceField?.options ?? []

        return (
          <div key={rule.id} className="space-y-1.5 rounded-md border border-border/50 bg-background/60 p-2">
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs text-muted-foreground font-medium">Mostrar se</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-6 text-muted-foreground hover:text-destructive"
                onClick={() => onRemove(rule.id)}
                aria-label="Remover regra"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
              </Button>
            </div>

            {/* Source field selector */}
            <Select
              value={rule.source_field_id}
              onValueChange={v => {
                const newSource = allFields.find(f => f.id === v)
                const newOps = getOperatorsForField(newSource)
                const opStillValid = newOps.some(o => o.value === rule.operator)
                onUpdate(rule.id, {
                  source_field_id: v,
                  operator: opStillValid ? rule.operator : newOps[0].value,
                  value: '',
                })
              }}
            >
              <SelectTrigger className="h-7 text-xs w-full overflow-hidden">
                <SelectValue placeholder="Campo de origem" className="truncate" />
              </SelectTrigger>
              <SelectContent>
                {sourceOptions.map(f => (
                  <SelectItem key={f.id} value={f.id} className="text-xs">
                    {f.label || '(sem título)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Operator selector */}
            <Select
              value={currentOpValid ? rule.operator : availableOperators[0].value}
              onValueChange={v => onUpdate(rule.id, { operator: v as LogicOperator })}
            >
              <SelectTrigger className="h-7 text-xs w-full overflow-hidden">
                <SelectValue className="truncate" />
              </SelectTrigger>
              <SelectContent>
                {availableOperators.map(op => (
                  <SelectItem key={op.value} value={op.value} className="text-xs">
                    {op.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Value — smart select for choice fields, free input otherwise */}
            {isChoiceSource && sourceOptions_.length > 0 ? (
              <Select
                value={rule.value}
                onValueChange={v => onUpdate(rule.id, { value: v })}
              >
                <SelectTrigger className="h-7 text-xs w-full overflow-hidden">
                  <SelectValue placeholder="Selecione um valor..." className="truncate" />
                </SelectTrigger>
                <SelectContent>
                  {sourceOptions_.map(opt => (
                    <SelectItem key={opt.id} value={opt.label} className="text-xs">
                      {opt.label || '(sem label)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={rule.value}
                onChange={e => onUpdate(rule.id, { value: e.target.value })}
                placeholder="Valor"
                className="h-7 text-xs"
              />
            )}
          </div>
        )
      })}

      {sourceOptions.length > 0 && (() => {
        const defaultSource = sourceOptions[0]
        const hasCycle = wouldCreateCycle(defaultSource.id, field.id, logic)

        return (
          <div className="space-y-1">
            {hasCycle && (
              <p className="text-xs text-destructive">
                Não é possível adicionar esta regra — criaria uma dependência circular.
              </p>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full h-7 text-xs"
              onClick={handleAdd}
              disabled={hasCycle}
            >
              <HugeiconsIcon icon={Add01Icon} className="size-3.5 mr-1" />
              Adicionar regra
            </Button>
          </div>
        )
      })()}
    </div>
  )
}
