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
import type { FormSettings } from '@/types/forms'

const MAX_FILE_SIZE_5MB = 5 * 1024 * 1024
const MAX_FILE_SIZE_2MB = 2 * 1024 * 1024

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
  previewClassName = 'w-full h-24 object-cover',
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

      onUploaded(publicUrl)
    } catch {
      setError('Erro ao fazer upload. Tente novamente.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      <p className="text-xs text-muted-foreground">{hint}</p>

      {currentUrl ? (
        <div className="relative rounded-md overflow-hidden border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={currentUrl} alt={label} className={previewClassName} />
          <button
            type="button"
            onClick={onRemoved}
            className="absolute top-1.5 right-1.5 rounded-md bg-background/80 backdrop-blur-sm p-1 hover:bg-destructive hover:text-destructive-foreground transition-colors"
            aria-label="Remover imagem"
          >
            <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
          </button>
        </div>
      ) : (
        <div
          className={`flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
            dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'
          }`}
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => {
            e.preventDefault()
            setDragOver(false)
            const file = e.dataTransfer.files[0]
            if (file) handleFile(file)
          }}
        >
          {uploading ? (
            <HugeiconsIcon icon={Loading03Icon} className="size-5 animate-spin text-muted-foreground" />
          ) : (
            <HugeiconsIcon icon={Image01Icon} className="size-5 text-muted-foreground" />
          )}
          <span className="text-xs text-muted-foreground">
            {uploading ? 'Enviando…' : 'Clique ou arraste uma imagem'}
          </span>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

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
  const hasRedirect = Boolean(settings.redirect_url || settings.redirect_delay)
  const [redirectEnabled, setRedirectEnabled] = useState(hasRedirect)

  return (
    <div className="space-y-6 py-2">
      {/* ── Branding ─────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={PaintBoardIcon} className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Aparência</h3>
        </div>

        <ImageUploader
          label="Logotipo"
          hint="Exibido dentro do card do formulário, acima do título. Máximo 2 MB."
          currentUrl={settings.logo_url}
          storagePath={`form-branding/${formId}/logo`}
          maxBytes={MAX_FILE_SIZE_2MB}
          previewClassName="mx-auto h-12 w-auto max-w-[160px] object-contain py-1"
          onUploaded={url => onChange({ logo_url: url })}
          onRemoved={() => onChange({ logo_url: undefined })}
        />

        <ImageUploader
          label="Imagem de cabeçalho"
          hint="Banner exibido no topo da página, acima do card. Proporção 3:1 recomendada."
          currentUrl={settings.header_image_url}
          storagePath={`form-branding/${formId}/banner`}
          onUploaded={url => onChange({ header_image_url: url })}
          onRemoved={() => onChange({ header_image_url: undefined })}
        />

        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Cor principal do formulário</Label>
          <p className="text-xs text-muted-foreground">
            Substitui a cor do Workspace somente neste formulário.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={settings.primary_color ?? '#000000'}
              onChange={e => onChange({ primary_color: e.target.value })}
              className="h-8 w-10 cursor-pointer rounded border border-input bg-transparent p-0.5"
            />
            <Input
              value={settings.primary_color ?? ''}
              onChange={e => onChange({ primary_color: e.target.value || undefined })}
              placeholder="#3b82f6"
              className="h-8 text-xs font-mono w-28"
              maxLength={7}
            />
            {settings.primary_color && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground"
                onClick={() => onChange({ primary_color: undefined })}
              >
                Redefinir
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Rodapé</Label>
          <p className="text-xs text-muted-foreground">
            HTML aceito. Use para avisos legais ou links de privacidade.
          </p>
          <textarea
            value={settings.footer_html ?? ''}
            onChange={e => onChange({ footer_html: e.target.value || undefined })}
            placeholder='<a href="/privacidade">Política de Privacidade</a>'
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </section>

      <div className="border-t" />

      {/* ── Thank You Page ────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={Tick02Icon} className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Página de Confirmação</h3>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Título</Label>
          <Input
            value={settings.thank_you_title ?? ''}
            onChange={e => onChange({ thank_you_title: e.target.value || undefined })}
            placeholder="Recebemos sua solicitação!"
            className="h-8 text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Mensagem</Label>
          <textarea
            value={settings.thank_you_text ?? ''}
            onChange={e => onChange({ thank_you_text: e.target.value || undefined })}
            placeholder="Entraremos em contato em breve."
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <ImageUploader
          label="Imagem de sucesso"
          hint="Ilustração ou ícone exibido na página de confirmação."
          currentUrl={settings.thank_you_image_url}
          storagePath={`form-branding/${formId}/success`}
          onUploaded={url => onChange({ thank_you_image_url: url })}
          onRemoved={() => onChange({ thank_you_image_url: undefined })}
        />
      </section>

      <div className="border-t" />

      {/* ── CTA & Redirect ────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={Link01Icon} className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Botão e Redirecionamento</h3>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Texto do botão de retorno</Label>
          <Input
            value={settings.cta_label ?? ''}
            onChange={e => onChange({ cta_label: e.target.value || undefined })}
            placeholder="Voltar para o início"
            className="h-8 text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium">URL do botão</Label>
          <Input
            value={settings.redirect_url ?? ''}
            onChange={e => onChange({ redirect_url: e.target.value || undefined })}
            placeholder="https://exemplo.com"
            className="h-8 text-xs"
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium">Redirecionar automaticamente</p>
            <p className="text-xs text-muted-foreground">
              Redireciona após o envio sem ação do usuário.
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
            <Label className="text-xs font-medium">Aguardar (segundos)</Label>
            <Input
              type="number"
              min={1}
              max={30}
              value={settings.redirect_delay ?? 5}
              onChange={e =>
                onChange({ redirect_delay: Math.max(1, parseInt(e.target.value) || 5) })
              }
              className="h-8 text-xs w-24"
            />
          </div>
        )}
      </section>
    </div>
  )
}
