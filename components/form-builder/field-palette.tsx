'use client'

import { HugeiconsIcon } from '@hugeicons/react'
import {
  File01Icon,
  ArrowUpDownIcon,
  FileEditIcon,
  ArrowDown01Icon,
  Tick01Icon,
  CheckmarkCircle01Icon,
} from '@hugeicons/core-free-icons'
import { Button } from '@/components/ui/button'
import type { IconSvgElement } from '@hugeicons/react'
import type { FieldType } from '@/types/forms'

interface FieldDef {
  type: FieldType
  label: string
  description: string
  icon: IconSvgElement
}

const FIELD_TYPES: FieldDef[] = [
  { type: 'text',     label: 'Texto',         description: 'Resposta curta',        icon: File01Icon },
  { type: 'number',   label: 'Número',        description: 'Valor numérico',        icon: ArrowUpDownIcon },
  { type: 'textarea', label: 'Área de Texto', description: 'Resposta longa',        icon: FileEditIcon },
  { type: 'select',   label: 'Seleção',       description: 'Menu suspenso',         icon: ArrowDown01Icon },
  { type: 'radio',    label: 'Opção Única',   description: 'Escolha uma opção',     icon: Tick01Icon },
  { type: 'checkbox', label: 'Caixas',        description: 'Múltipla escolha',      icon: CheckmarkCircle01Icon },
]

interface Props {
  onAdd: (type: FieldType) => void
}

export function FieldPalette({ onAdd }: Props) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Campos
      </p>
      {FIELD_TYPES.map(def => (
        <Button
          key={def.type}
          variant="ghost"
          className="w-full justify-start h-auto py-2 px-3 gap-2.5 text-left"
          onClick={() => onAdd(def.type)}
        >
          <HugeiconsIcon icon={def.icon} className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <div className="text-sm font-medium">{def.label}</div>
            <div className="text-xs text-muted-foreground">{def.description}</div>
          </div>
        </Button>
      ))}
    </div>
  )
}
