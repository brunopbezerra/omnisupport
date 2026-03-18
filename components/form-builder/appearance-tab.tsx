'use client'

import { useRef, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Image01Icon,
  Delete02Icon,
  Loading03Icon,
  Link01Icon,
  PaintBoardIcon,
  Tick02Icon,
} from '@hugeicons/core-free-icons'
import { supabase } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import type { FormSettings } from '@/types/forms'

import { ColorPickerContent } from '@/components/ui/color-picker'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { getContrastColor } from '@/components/providers/workspace-provider'

const MAX_FILE_SIZE_5MB = 5 * 1024 * 1024
const MAX_FILE_SIZE_2MB = 2 * 1024 * 1024

const DEFAULT_FORM_COLOR = '#3b82f6'

interface ImageUploaderProps {
  label: string
  hint: string
  currentUrl?: string
  storagePath: string
  maxBytes?: number
  previewClassName?: string
  onUploaded: (url: string) => void
  onRemoved: () => void
}

function ImageUploader({
  label,
  hint,
  currentUrl,
  storagePath,
  maxBytes = MAX_FILE_SIZE_5MB,
  previewClassName = 'w-full h-32 object-contain',
  onUploaded,
  onRemoved,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')

  const maxLabel = maxBytes >= MAX_FILE_SIZE_5MB ? '5 MB' : '2 MB'

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('Apenas imagens são aceitas.')
      return
    }
    if (file.size > maxBytes) {
      setError(`Arquivo muito grande. Máximo ${maxLabel}.`)
      return
    }

    setError('')
    setUploading(true)
    try {
      const { data, error: uploadError } = await supabase.storage
        .from('workspaces')
        .upload(storagePath, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('workspaces')
        .getPublicUrl(data.path)

      // Append timestamp to bust cache if the path is the same
      onUploaded(`${publicUrl}?t=${Date.now()}`)
    } catch {
      setError('Erro ao fazer upload. Tente novamente.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">{label}</Label>
          <p className="text-[10px] text-muted-foreground">{hint}</p>
        </div>

        {currentUrl && (
          <div className="flex items-center gap-1">
            <Button 
              type="button" 
              variant="ghost" 
              size="sm" 
              className="h-7 px-2 rounded-lg text-[10px] font-bold uppercase tracking-tight hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              onClick={() => inputRef.current?.click()}
            >
              <HugeiconsIcon icon={Image01Icon} className="size-3.5 mr-1.5" />
              Alterar
            </Button>
            <Button 
              type="button" 
              variant="ghost" 
              size="sm" 
              className="h-7 px-2 rounded-lg text-[10px] font-bold uppercase tracking-tight text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors"
              onClick={onRemoved}
            >
              <HugeiconsIcon icon={Delete02Icon} className="size-3.5 mr-1.5" />
              Remover
            </Button>
          </div>
        )}
      </div>

      <div 
        className={cn(
          "relative rounded-2xl border-2 border-dashed transition-all duration-300 overflow-hidden",
          dragOver ? "border-primary bg-primary/5 scale-[0.99]" : "border-border hover:border-primary/40 hover:bg-muted/30",
          currentUrl ? "border-solid border-border" : "cursor-pointer"
        )}
        onClick={() => !currentUrl && inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); !currentUrl && setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
          e.preventDefault()
          setDragOver(false)
          if (currentUrl) return
          const file = e.dataTransfer.files[0]
          if (file) handleFile(file)
        }}
      >
        {currentUrl ? (
          <div className="relative">
            {/* Checkerboard background for transparency */}
            <div 
              className="absolute inset-0 opacity-[0.03] dark:opacity-[0.1]"
              style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '12px 12px' }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={currentUrl} 
              alt={label} 
              className={cn(previewClassName, "relative z-10 mx-auto p-6")} 
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 p-10 text-center">
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-150 animate-pulse" />
              <div className="relative size-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
                {uploading ? (
                  <HugeiconsIcon icon={Loading03Icon} className="size-6 animate-spin text-primary" />
                ) : (
                  <HugeiconsIcon icon={Image01Icon} className="size-6 text-primary" />
                )}
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold text-foreground block">
                {uploading ? 'Fazendo Upload…' : 'Arraste ou clique para enviar'}
              </span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="flex items-center gap-1.5 text-[10px] font-bold text-destructive px-1">
          <HugeiconsIcon icon={Delete02Icon} className="size-3" />
          {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}

interface Props {
  formId: string
  settings: FormSettings
  onChange: (patch: Partial<FormSettings>) => void
}

export function AppearanceTab({ formId, settings, onChange }: Props) {
  const primaryColor = settings.primary_color

  return (
    <div className="space-y-6 py-2">
      <section className="space-y-6">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={PaintBoardIcon} className="size-4 text-primary" />
          <h3 className="text-sm font-semibold tracking-tight">Identidade Visual</h3>
        </div>

        <ImageUploader
          label="Banner de Cabeçalho"
          hint="Banner exibido no topo da página. Proporção 3:1 recomendada."
          currentUrl={settings.header_image_url}
          previewClassName="h-64 object-contain scale-[1.02]"
          storagePath={`form-branding/${formId}/banner`}
          onUploaded={url => onChange({ header_image_url: url })}
          onRemoved={() => onChange({ header_image_url: undefined })}
        />

        <ImageUploader
          label="Logotipo"
          hint="Exibido dentro do card do formulário. Recomendado fundo transparente."
          currentUrl={settings.logo_url}
          previewClassName="h-32 w-auto"
          storagePath={`form-branding/${formId}/logo`}
          maxBytes={MAX_FILE_SIZE_2MB}
          onUploaded={url => onChange({ logo_url: url })}
          onRemoved={() => onChange({ logo_url: undefined })}
        />

        {/* Professional Color Picker */}
        <div className="space-y-3">
          <Label className="text-xs font-semibold">Cor principal do formulário</Label>
          <Popover>
            <div className="flex items-center gap-3 rounded-xl border border-dashed p-3 bg-muted/20">
              <div
                className="size-8 rounded-lg shrink-0 border border-black/10 shadow-sm"
                style={{ background: primaryColor ?? 'var(--primary)' }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold font-mono tracking-tight uppercase">
                  {primaryColor ?? 'Cor Padrão'}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {primaryColor ? 'Substituindo cor do workspace' : 'Usando identidade da empresa'}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {primaryColor && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[10px] font-bold uppercase text-muted-foreground hover:text-destructive"
                    onClick={() => onChange({ primary_color: undefined })}
                  >
                    Resetar
                  </Button>
                )}
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="h-7 text-[10px] font-bold uppercase">
                    Personalizar
                  </Button>
                </PopoverTrigger>
              </div>
            </div>
            <PopoverContent className="w-80 p-3 space-y-3" align="end">
              <ColorPickerContent
                value={primaryColor ?? DEFAULT_FORM_COLOR}
                onChange={val => onChange({ primary_color: val })}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <div className="flex flex-col gap-0.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Rodapé personalizado</Label>
            <p className="text-[10px] text-muted-foreground tracking-tight">Suporta tags HTML para links de privacidade ou avisos legais.</p>
          </div>
          <textarea
            value={settings.footer_html ?? ''}
            onChange={e => onChange({ footer_html: e.target.value || undefined })}
            placeholder="Adicione texto ou HTML para o rodapé..."
            rows={4}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
          />
        </div>
      </section>
    </div>
  )
}

interface SettingsProps {
  formId: string
  settings: FormSettings
  onChange: (patch: Partial<FormSettings>) => void
}

export function SettingsTab({ formId, settings, onChange }: SettingsProps) {
  const [redirectEnabled, setRedirectEnabled] = useState(Boolean(settings.redirect_url || settings.redirect_delay))

  return (
    <div className="space-y-8 py-2">
      {/* ── Thank You Page ────────────────────────────────────── */}
      <section className="space-y-5">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={Tick02Icon} className="size-4 text-primary" />
          <h3 className="text-sm font-semibold tracking-tight">Página de Confirmação</h3>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Título de Sucesso</Label>
            <Input
              value={settings.thank_you_title ?? ''}
              onChange={e => onChange({ thank_you_title: e.target.value || undefined })}
              placeholder="Recebemos sua solicitação!"
              className="h-9 rounded-xl text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Mensagem</Label>
            <textarea
              value={settings.thank_you_text ?? ''}
              onChange={e => onChange({ thank_you_text: e.target.value || undefined })}
              placeholder="Entraremos em contato em breve."
              rows={3}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
            />
          </div>

          <ImageUploader
            label="Ilustração de Sucesso"
            hint="Imagem exibida após o envio."
            currentUrl={settings.thank_you_image_url}
            storagePath={`form-branding/${formId}/success`}
            onUploaded={url => onChange({ thank_you_image_url: url })}
            onRemoved={() => onChange({ thank_you_image_url: undefined })}
          />
        </div>
      </section>

      <div className="border-t border-dashed" />

      {/* ── CTA & Redirect ────────────────────────────────────── */}
      <section className="space-y-5">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={Link01Icon} className="size-4 text-primary" />
          <h3 className="text-sm font-semibold tracking-tight">Botão e Redirecionamento</h3>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Texto do botão de retorno</Label>
            <Input
              value={settings.cta_label ?? ''}
              onChange={e => onChange({ cta_label: e.target.value || undefined })}
              placeholder="Voltar para o início"
              className="h-9 rounded-xl text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">URL de Redirecionamento</Label>
            <Input
              value={settings.redirect_url ?? ''}
              onChange={e => onChange({ redirect_url: e.target.value || undefined })}
              placeholder="https://seu-site.com/sucesso"
              className="h-9 rounded-xl text-sm"
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/20">
            <div>
              <p className="text-xs font-bold uppercase tracking-tight">Redirecionar automaticamente</p>
              <p className="text-[10px] text-muted-foreground">
                Redireciona após o envio sem precisar de um clique.
              </p>
            </div>
            <Switch
              checked={redirectEnabled}
              onCheckedChange={enabled => {
                setRedirectEnabled(enabled)
                if (!enabled) onChange({ redirect_delay: undefined })
              }}
            />
          </div>

          {redirectEnabled && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tempo de espera (segundos)</Label>
              <Input
                type="number"
                min={1}
                max={30}
                value={settings.redirect_delay ?? 5}
                onChange={e =>
                  onChange({ redirect_delay: Math.max(1, parseInt(e.target.value) || 5) })
                }
                className="h-9 rounded-xl text-sm w-32"
              />
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
