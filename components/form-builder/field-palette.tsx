'use client'

import { HugeiconsIcon } from '@hugeicons/react'
import {
  File01Icon,
  ArrowUpDownIcon,
  NoteEditIcon,
  ArrowDown01Icon,
  RadioButtonIcon,
  CheckmarkSquare02Icon,
  Add01Icon,
} from '@hugeicons/core-free-icons'
import { useDraggable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import type { IconSvgElement } from '@hugeicons/react'
import type { FieldType } from '@/types/forms'

interface FieldDef {
  type: FieldType
  label: string
  description: string
  icon: IconSvgElement
  iconBg: string
  iconColor: string
}

const BASIC_FIELDS: FieldDef[] = [
  {
    type: 'text',
    label: 'Texto',
    description: 'Resposta curta',
    icon: File01Icon,
    iconBg: 'bg-blue-100 dark:bg-blue-950',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  {
    type: 'number',
    label: 'Número',
    description: 'Valor numérico',
    icon: ArrowUpDownIcon,
    iconBg: 'bg-orange-100 dark:bg-orange-950',
    iconColor: 'text-orange-600 dark:text-orange-400',
  },
  {
    type: 'textarea',
    label: 'Área de Texto',
    description: 'Resposta longa',
    icon: NoteEditIcon,
    iconBg: 'bg-violet-100 dark:bg-violet-950',
    iconColor: 'text-violet-600 dark:text-violet-400',
  },
]

const SELECTION_FIELDS: FieldDef[] = [
  {
    type: 'select',
    label: 'Seleção',
    description: 'Menu suspenso',
    icon: ArrowDown01Icon,
    iconBg: 'bg-green-100 dark:bg-green-950',
    iconColor: 'text-green-600 dark:text-green-400',
  },
  {
    type: 'radio',
    label: 'Opção Única',
    description: 'Escolha uma opção',
    icon: RadioButtonIcon,
    iconBg: 'bg-pink-100 dark:bg-pink-950',
    iconColor: 'text-pink-600 dark:text-pink-400',
  },
  {
    type: 'checkbox',
    label: 'Caixas',
    description: 'Múltipla escolha',
    icon: CheckmarkSquare02Icon,
    iconBg: 'bg-amber-100 dark:bg-amber-950',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
]

// ─── Draggable palette item ───────────────────────────────────────────────────

interface DraggableFieldItemProps {
  def: FieldDef
  onAdd: (type: FieldType) => void
}

function DraggableFieldItem({ def, onAdd }: DraggableFieldItemProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${def.type}`,
    data: { fieldType: def.type, fromPalette: true },
  })

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        'group flex items-center gap-3 rounded-lg border border-transparent px-2 py-2 cursor-grab active:cursor-grabbing transition-all hover:border-border hover:bg-muted/50',
        isDragging && 'opacity-40'
      )}
    >
      {/* Colored icon */}
      <div className={cn('rounded-md p-1.5 shrink-0', def.iconBg)}>
        <HugeiconsIcon icon={def.icon} className={cn('size-4', def.iconColor)} />
      </div>

      {/* Label + description */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium leading-none">{def.label}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{def.description}</div>
      </div>

      {/* Add button */}
      <button
        type="button"
        onPointerDown={e => e.stopPropagation()}
        onClick={e => { e.stopPropagation(); onAdd(def.type) }}
        className="shrink-0 rounded-md p-1 opacity-0 group-hover:opacity-100 hover:bg-primary/10 hover:text-primary transition-all"
        aria-label={`Adicionar campo ${def.label}`}
      >
        <HugeiconsIcon icon={Add01Icon} className="size-3.5" />
      </button>
    </div>
  )
}

// ─── Palette group header ─────────────────────────────────────────────────────

function GroupLabel({ label }: { label: string }) {
  return (
    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-2 pt-1 pb-0.5">
      {label}
    </p>
  )
}

// ─── Main palette ─────────────────────────────────────────────────────────────

interface Props {
  onAdd: (type: FieldType) => void
}

export function FieldPalette({ onAdd }: Props) {
  return (
    <div className="space-y-3">
      <div>
        <GroupLabel label="Campos Básicos" />
        <div className="space-y-0.5">
          {BASIC_FIELDS.map(def => (
            <DraggableFieldItem key={def.type} def={def} onAdd={onAdd} />
          ))}
        </div>
      </div>

      <div>
        <GroupLabel label="Seleção" />
        <div className="space-y-0.5">
          {SELECTION_FIELDS.map(def => (
            <DraggableFieldItem key={def.type} def={def} onAdd={onAdd} />
          ))}
        </div>
      </div>

      <p className="px-2 text-[10px] text-muted-foreground italic leading-relaxed">
        Clique em <span className="font-medium">+</span> para adicionar ou arraste para o canvas.
      </p>
    </div>
  )
}
