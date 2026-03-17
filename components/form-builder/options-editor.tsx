'use client'

import { HugeiconsIcon } from '@hugeicons/react'
import { Add01Icon, Cancel01Icon } from '@hugeicons/core-free-icons'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { FieldOption } from '@/types/forms'

interface Props {
  options: FieldOption[]
  onChange: (opts: FieldOption[]) => void
}

export function OptionsEditor({ options, onChange }: Props) {
  function addOption() {
    onChange([...options, { id: crypto.randomUUID(), label: '' }])
  }

  function updateOption(id: string, label: string) {
    onChange(options.map(o => (o.id === id ? { ...o, label } : o)))
  }

  function removeOption(id: string) {
    onChange(options.filter(o => o.id !== id))
  }

  return (
    <div className="space-y-2">
      {options.map(opt => (
        <div key={opt.id} className="flex items-center gap-2">
          <Input
            value={opt.label}
            onChange={e => updateOption(opt.id, e.target.value)}
            placeholder="Rótulo da opção"
            className="h-8 text-sm"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => removeOption(opt.id)}
            aria-label="Remover opção"
          >
            <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
          </Button>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full h-8 text-xs"
        onClick={addOption}
      >
        <HugeiconsIcon icon={Add01Icon} className="size-3.5 mr-1" />
        Adicionar opção
      </Button>
    </div>
  )
}
