'use client'

import { CSSProperties } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { HugeiconsIcon } from '@hugeicons/react'
import { 
  Delete02Icon, 
  Drag01Icon,
  File01Icon,
  ArrowUpDownIcon,
  NoteEditIcon,
  ArrowDown01Icon,
  RadioButtonIcon,
  CheckmarkSquare02Icon,
} from '@hugeicons/core-free-icons'
import type { IconSvgElement } from '@hugeicons/react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { FormField } from '@/types/forms'

const FIELD_LABELS: Record<FormField['type'], { label: string; icon: IconSvgElement }> = {
  text: { label: 'Texto', icon: File01Icon },
  number: { label: 'Número', icon: ArrowUpDownIcon },
  textarea: { label: 'Área de Texto', icon: NoteEditIcon },
  select: { label: 'Seleção', icon: ArrowDown01Icon },
  radio: { label: 'Opção Única', icon: RadioButtonIcon },
  checkbox: { label: 'Caixas', icon: CheckmarkSquare02Icon },
}

function FieldPreview({ field }: { field: FormField }) {
  if (field.type === 'textarea') {
    return <Textarea disabled placeholder={field.label || 'Área de texto...'} className="resize-none h-16 text-xs" />
  }
  if (field.type === 'select') {
    return (
      <select disabled className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-muted-foreground">
        <option>{field.label || 'Selecione...'}</option>
      </select>
    )
  }
  if (field.type === 'radio' || field.type === 'checkbox') {
    const inputType = field.type === 'radio' ? 'radio' : 'checkbox'
    const opts = field.options.length > 0 ? field.options : [{ id: '0', label: 'Opção' }]
    return (
      <div className="space-y-1">
        {opts.slice(0, 3).map(opt => (
          <label key={opt.id} className="flex items-center gap-2 text-xs text-muted-foreground">
            <input type={inputType} disabled className="accent-primary" />
            {opt.label || 'Opção'}
          </label>
        ))}
      </div>
    )
  }
  return (
    <Input
      disabled
      placeholder={field.label || 'Campo de texto...'}
      type={field.type === 'number' ? 'number' : 'text'}
      className="text-xs"
    />
  )
}

interface Props {
  field: FormField
  isSelected: boolean
  onSelect: (id: string) => void
  onRemove: (id: string) => void
}

export function SortableFieldCard({ field, isSelected, onSelect, onRemove }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
  })

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
    position: 'relative',
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onSelect(field.id)}
      className={cn(
        'group rounded-lg border bg-card p-3 cursor-pointer transition-colors',
        isSelected ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-muted-foreground/40'
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="mt-0.5 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0"
          {...attributes}
          {...listeners}
          onClick={e => e.stopPropagation()}
          aria-label="Arrastar campo"
        >
          <HugeiconsIcon icon={Drag01Icon} className="size-4" />
        </button>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm font-medium truncate">{field.label || '(sem título)'}</span>
              {field.required && (
                <span className="text-destructive text-xs shrink-0">*</span>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Badge
                className="text-[10px] font-semibold uppercase tracking-tight py-0.5 px-2 border-none flex items-center gap-1 bg-muted text-muted-foreground hover:bg-muted"
              >
                <HugeiconsIcon icon={FIELD_LABELS[field.type].icon} className="size-3" />
                {FIELD_LABELS[field.type].label}
              </Badge>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-1.5 rounded-md text-[9px] font-bold uppercase tracking-tight text-destructive hover:bg-destructive/10 hover:text-destructive transition-all shrink-0"
                onClick={e => { e.stopPropagation(); onRemove(field.id) }}
                aria-label="Remover campo"
              >
                <HugeiconsIcon icon={Delete02Icon} className="size-3 mr-1" />
                Remover
              </Button>
            </div>
          </div>

          <FieldPreview field={field} />
        </div>
      </div>
    </div>
  )
}
