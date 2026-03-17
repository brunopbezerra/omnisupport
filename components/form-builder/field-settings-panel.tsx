'use client'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { OptionsEditor } from './options-editor'
import { LogicEditor } from './logic-editor'
import type { FormField, FormLogic, FieldMapping } from '@/types/forms'
import type { Category } from '@/app/dashboard/data-table'

const CHOICE_TYPES: FormField['type'][] = ['select', 'radio', 'checkbox']

interface Props {
  field: FormField | null
  allFields: FormField[]
  logic: FormLogic[]
  categories: Category[]
  onUpdate: (patch: Partial<FormField>) => void
  onAddLogic: (sourceFieldId: string, targetFieldId: string) => void
  onRemoveLogic: (id: string) => void
  onUpdateLogic: (id: string, patch: Partial<FormLogic>) => void
}

export function FieldSettingsPanel({
  field,
  allFields,
  logic,
  categories,
  onUpdate,
  onAddLogic,
  onRemoveLogic,
  onUpdateLogic,
}: Props) {
  if (!field) {
    return (
      <div className="flex h-full items-center justify-center text-center">
        <p className="text-sm text-muted-foreground">
          Selecione um campo para editar suas propriedades.
        </p>
      </div>
    )
  }

  function handleMappingChange(patch: Partial<FieldMapping>) {
    onUpdate({ mapping: { ...field!.mapping, ...patch } })
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold mb-3">Propriedades do Campo</h3>

        <div className="space-y-3">
          {/* Label */}
          <div className="space-y-1.5">
            <Label className="text-xs">Rótulo</Label>
            <Input
              value={field.label}
              onChange={e => onUpdate({ label: e.target.value })}
              placeholder="Nome do campo"
              className="h-8 text-sm"
            />
          </div>

          {/* Required */}
          <div className="flex items-center justify-between">
            <Label className="text-xs">Obrigatório</Label>
            <Switch
              checked={field.required}
              onCheckedChange={v => onUpdate({ required: v })}
            />
          </div>
        </div>
      </div>

      {/* Options */}
      {CHOICE_TYPES.includes(field.type) && (
        <>
          <Separator />
          <div>
            <h3 className="text-sm font-semibold mb-3">Opções</h3>
            <OptionsEditor
              options={field.options}
              onChange={opts => onUpdate({ options: opts })}
            />
          </div>
        </>
      )}

      {/* Mapping */}
      <Separator />
      <div>
        <h3 className="text-sm font-semibold mb-3">Mapeamento</h3>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Campo do ticket</Label>
            <Select
              value={field.mapping.target ?? 'none'}
              onValueChange={v =>
                handleMappingChange({ target: v === 'none' ? null : (v as FieldMapping['target']) })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Nenhum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" className="text-xs">Nenhum</SelectItem>
                <SelectItem value="subject" className="text-xs">Assunto</SelectItem>
                <SelectItem value="customer_email" className="text-xs">E-mail do cliente</SelectItem>
                <SelectItem value="category" className="text-xs">Categoria</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {field.mapping.target === 'category' && (
            <div className="space-y-1.5">
              <Label className="text-xs">Categoria</Label>
              <Select
                value={field.mapping.category_id ?? ''}
                onValueChange={v => handleMappingChange({ category_id: v || null })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Logic */}
      <Separator />
      <div>
        <h3 className="text-sm font-semibold mb-3">Lógica Condicional</h3>
        <LogicEditor
          field={field}
          allFields={allFields}
          logic={logic}
          onAdd={onAddLogic}
          onRemove={onRemoveLogic}
          onUpdate={onUpdateLogic}
        />
      </div>
    </div>
  )
}
