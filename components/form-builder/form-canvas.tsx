'use client'

import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useDndContext, useDroppable } from '@dnd-kit/core'
import { SortableFieldCard } from './sortable-field-card'
import type { FormField, FormLogic } from '@/types/forms'

export const CANVAS_DROPPABLE_ID = 'form-canvas'

// ─── Compute field depth from logic rules ─────────────────────────────────────
// A field is at depth N if it depends on a field at depth N-1.
// Fields with no incoming rules = depth 0.

export function computeFieldDepths(
  fields: FormField[],
  logic: FormLogic[]
): Map<string, number> {
  const depths = new Map<string, number>()

  // Build set of target field IDs (fields that have at least one condition rule)
  const parentOf = new Map<string, string>() // targetId -> sourceId
  for (const rule of logic) {
    // Use first rule for each field to determine its parent
    if (!parentOf.has(rule.target_field_id)) {
      parentOf.set(rule.target_field_id, rule.source_field_id)
    }
  }

  // BFS/DFS to compute depth
  function getDepth(fieldId: string, visited = new Set<string>()): number {
    if (depths.has(fieldId)) return depths.get(fieldId)!
    if (visited.has(fieldId)) return 0 // cycle guard
    visited.add(fieldId)
    const parent = parentOf.get(fieldId)
    if (!parent) {
      depths.set(fieldId, 0)
      return 0
    }
    const d = getDepth(parent, visited) + 1
    depths.set(fieldId, Math.min(d, 3)) // cap at 3 levels
    return depths.get(fieldId)!
  }

  for (const f of fields) getDepth(f.id)
  return depths
}

// ─── Drop zone (empty canvas) ─────────────────────────────────────────────────

function CanvasDropZone() {
  const { setNodeRef, isOver } = useDroppable({ id: CANVAS_DROPPABLE_ID })
  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg border-2 border-dashed transition-colors py-20 flex flex-col items-center justify-center text-center gap-2 ${
        isOver ? 'border-primary bg-primary/5' : 'border-border'
      }`}
    >
      <p className={`text-sm font-medium ${isOver ? 'text-primary' : 'text-muted-foreground'}`}>
        {isOver ? 'Solte para adicionar' : 'Nenhum campo ainda'}
      </p>
      <p className="text-xs text-muted-foreground/70">
        Arraste um tipo da barra lateral ou clique em +
      </p>
    </div>
  )
}

// ─── Droppable canvas wrapper (for non-empty state) ───────────────────────────

function DroppableCanvasArea({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver, active } = useDroppable({ id: CANVAS_DROPPABLE_ID })
  const dnd = useDndContext()
  const isDraggingFromPalette = dnd.active?.data.current?.fromPalette === true
  
  return (
    <div
      ref={setNodeRef}
      className={`space-y-2 min-h-32 rounded-lg transition-colors pb-8 ${
        isOver && isDraggingFromPalette ? 'ring-2 ring-primary/30 bg-primary/[0.02]' : ''
      }`}
    >
      {children}
    </div>
  )
}

// ─── Main canvas ──────────────────────────────────────────────────────────────

interface Props {
  fields: FormField[]
  logic: FormLogic[]
  selectedFieldId: string | null
  onSelect: (id: string) => void
  onRemove: (id: string) => void
}

export function FormCanvas({ fields, logic, selectedFieldId, onSelect, onRemove }: Props) {
  const depths = computeFieldDepths(fields, logic)

  if (fields.length === 0) {
    return <CanvasDropZone />
  }

  return (
    <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
      <DroppableCanvasArea>
        {fields.map(f => {
          const depth = depths.get(f.id) ?? 0
          const dnd = useDndContext()
          const isOverThis = dnd.over?.id === f.id
          const isDraggingFromPalette = dnd.active?.data.current?.fromPalette === true

          return (
            <div
              key={f.id}
              style={{ paddingLeft: depth > 0 ? `${depth * 20}px` : undefined }}
              className="relative"
            >
              {/* Drop Indicator (above) */}
              {isOverThis && isDraggingFromPalette && (
                <div className="absolute -top-1 left-0 right-0 h-1 bg-primary rounded-full z-10 shadow-sm animate-pulse" />
              )}
              
              {/* Indent connector line */}
              {depth > 0 && (
                <div
                  className="absolute top-0 bottom-0 border-l-2 border-dashed border-primary/25 pointer-events-none"
                  style={{ left: `${(depth - 1) * 20 + 8}px` }}
                />
              )}
              <SortableFieldCard
                field={f}
                isSelected={f.id === selectedFieldId}
                onSelect={onSelect}
                onRemove={onRemove}
              />
            </div>
          )
        })}
      </DroppableCanvasArea>
    </SortableContext>
  )
}
