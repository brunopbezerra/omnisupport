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
import { cn } from '@/lib/utils'
import { OptionsEditor } from './options-editor'
import { LogicEditor } from './logic-editor'
import type { FormField, FormLogic, FieldMapping, FieldMask } from '@/types/forms'
import type { Category } from '@/app/dashboard/data-table'

const CHOICE_TYPES: FormField['type'][] = ['select', 'radio', 'checkbox']

const MASK_OPTIONS: { value: FieldMask; label: string }[] = [
  { value: 'none', label: 'Nenhuma' },
  { value: 'phone_br', label: 'Telefone (BR)' },
  { value: 'date', label: 'Data (DD/MM/AAAA)' },
  { value: 'url', label: 'URL' },
]

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
      <div className="flex h-full items-center justify-center text-center px-4">
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

      {/* ── Propriedades básicas ───────────────────────── */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Propriedades
        </h3>
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
            <div>
              <Label className="text-xs">Obrigatório</Label>
            </div>
            <Switch
              checked={field.required}
              onCheckedChange={v => onUpdate({ required: v })}
            />
          </div>

          {/* Hidden */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs">Oculto</Label>
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                Não exibido ao usuário final
              </p>
            </div>
            <Switch
              checked={field.hidden ?? false}
              onCheckedChange={v => onUpdate({ hidden: v })}
            />
          </div>

          {/* Default value (shown when hidden is on) */}
          {field.hidden && (
            <div className="space-y-1.5">
              <Label className="text-xs">Valor padrão</Label>
              <Input
                value={field.default_value ?? ''}
                onChange={e => onUpdate({ default_value: e.target.value || null })}
                placeholder="Valor enviado na submissão"
                className="h-8 text-sm"
              />
            </div>
          )}

          {/* Mask — only for text fields */}
          {field.type === 'text' && (
            <div className="space-y-1.5">
              <Label className="text-xs">Máscara / Formato</Label>
              <Select
                value={field.mask ?? 'none'}
                onValueChange={v => onUpdate({ mask: v === 'none' ? null : (v as FieldMask) })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MASK_OPTIONS.map(m => (
                    <SelectItem key={m.value} value={m.value} className="text-xs">
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* ── Options (select / radio / checkbox) ───────── */}
      {CHOICE_TYPES.includes(field.type) && (
        <>
          <Separator />
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Opções
            </h3>
            <OptionsEditor
              options={field.options}
              onChange={opts => onUpdate({ options: opts })}
            />
          </div>
        </>
      )}

      {/* ── Mapping ───────────────────────────────────── */}
      <Separator />
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Mapeamento
        </h3>
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

      {/* ── Conditional logic (pastel highlight) ──────── */}
      <Separator />
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Lógica Condicional
        </h3>
        <div className={cn(
          "rounded-lg transition-all",
          logic.some(r => r.target_field_id === field.id) 
            ? "p-4 bg-primary/5 border border-primary/10 shadow-sm mb-4" 
            : "p-0 border-none"
        )}>
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
    </div>
  )
}
