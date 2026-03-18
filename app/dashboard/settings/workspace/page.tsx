'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { useWorkspace, getContrastColor } from '@/components/providers/workspace-provider'
import { ImageCropUploader } from '@/components/image-crop-uploader'
import { ColorPickerContent } from '@/components/ui/color-picker'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes'
import { HugeiconsIcon } from '@hugeicons/react'
import { Delete02Icon } from '@hugeicons/core-free-icons'
import { redirect } from 'next/navigation'
import type { SlaMode } from '@/components/providers/workspace-provider'

// Fallback hex to seed the picker when user first sets a custom color
const DEFAULT_CUSTOM_COLOR = '#3ecf8e'

function TimeInput({
  id,
  value,
  onChange,
}: {
  id: string
  value: number
  onChange: (minutes: number) => void
}) {
  const hours = Math.floor(value / 60)
  const mins = value % 60
  return (
    <div className="flex items-center gap-2">
      <Input
        id={id}
        type="number"
        min={0}
        max={168}
        value={hours}
        onChange={e => onChange(Math.max(0, Number(e.target.value)) * 60 + mins)}
        className="w-20"
      />
      <span className="text-sm text-muted-foreground">h</span>
      <Input
        type="number"
        min={0}
        max={59}
        value={mins}
        onChange={e => onChange(hours * 60 + Math.min(59, Math.max(0, Number(e.target.value))))}
        className="w-20"
      />
      <span className="text-sm text-muted-foreground">min</span>
    </div>
  )
}

export default function WorkspaceSettingsPage() {
  const { currentUser, activeOrg, activeOrgId, loading, refetchOrg } = useWorkspace()

  const [saved, setSaved] = useState(() => ({
    name: activeOrg?.name ?? '',
    slug: activeOrg?.slug ?? '',
    primaryColor: activeOrg?.primary_color ?? null as string | null,
    logoUrl: activeOrg?.logo_url ?? null as string | null,
    targetFirstResponse: activeOrg?.target_first_response_time ?? 240,
    targetResolution: activeOrg?.target_resolution_time ?? 1440,
    slaMode: (activeOrg?.sla_mode ?? 'calendar') as SlaMode,
  }))
  const [name, setName] = useState(() => activeOrg?.name ?? '')
  const [slug, setSlug] = useState(() => activeOrg?.slug ?? '')
  const [primaryColor, setPrimaryColor] = useState<string | null>(() => activeOrg?.primary_color ?? null)
  const [logoUrl, setLogoUrl] = useState<string | null>(() => activeOrg?.logo_url ?? null)
  const [targetFirstResponse, setTargetFirstResponse] = useState(() => activeOrg?.target_first_response_time ?? 240)
  const [targetResolution, setTargetResolution] = useState(() => activeOrg?.target_resolution_time ?? 1440)
  const [slaMode, setSlaMode] = useState<SlaMode>(() => activeOrg?.sla_mode ?? 'calendar')
  const [isSaving, setIsSaving] = useState(false)
  const isSuperAdmin = currentUser?.role === 'super-admin'

  useEffect(() => {
    if (!loading && currentUser && currentUser.role === 'agent') {
      redirect('/dashboard')
    }
  }, [loading, currentUser])

  // Sync form + saved snapshot when activeOrg updates
  useEffect(() => {
    if (activeOrg) {
      const snap = {
        name: activeOrg.name,
        slug: activeOrg.slug,
        primaryColor: activeOrg.primary_color ?? null,
        logoUrl: activeOrg.logo_url ?? null,
        targetFirstResponse: activeOrg.target_first_response_time,
        targetResolution: activeOrg.target_resolution_time,
        slaMode: activeOrg.sla_mode,
      }
      setName(snap.name)
      setSlug(snap.slug)
      setPrimaryColor(snap.primaryColor)
      setLogoUrl(snap.logoUrl)
      setTargetFirstResponse(snap.targetFirstResponse)
      setTargetResolution(snap.targetResolution)
      setSlaMode(snap.slaMode)
      setSaved(snap)
    }
  }, [activeOrg])

  // Live color preview — null means restore system defaults
  useEffect(() => {
    const root = document.documentElement.style
    if (primaryColor) {
      const fg = getContrastColor(primaryColor)
      root.setProperty('--primary', primaryColor)
      root.setProperty('--primary-foreground', fg)
      root.setProperty('--sidebar-primary', primaryColor)
      root.setProperty('--sidebar-primary-foreground', fg)
    } else {
      root.removeProperty('--primary')
      root.removeProperty('--primary-foreground')
      root.removeProperty('--sidebar-primary')
      root.removeProperty('--sidebar-primary-foreground')
    }
  }, [primaryColor])

  // ─── Dirty detection ────────────────────────────────────────
  const isDirty = useMemo(() => {
    const cleanLogo = logoUrl ? logoUrl.split('?t=')[0] : null
    return (
      name !== saved.name ||
      slug !== saved.slug ||
      primaryColor !== saved.primaryColor ||
      cleanLogo !== saved.logoUrl ||
      targetFirstResponse !== saved.targetFirstResponse ||
      targetResolution !== saved.targetResolution ||
      slaMode !== saved.slaMode
    )
  }, [name, slug, primaryColor, logoUrl, targetFirstResponse, targetResolution, slaMode, saved])

  const { open, confirm, cancel } = useUnsavedChanges(isDirty)

  // ─── Save ────────────────────────────────────────────────────
  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!activeOrgId) return
    setIsSaving(true)
    try {
      const persistedLogoUrl = logoUrl ? logoUrl.split('?t=')[0] : null

      if (slug.trim() !== saved.slug) {
        await supabase
          .from('organization_slug_redirects')
          .insert({ old_slug: saved.slug, organization_id: activeOrgId })
          .throwOnError()
      }

      const { error } = await supabase
        .from('organizations')
        .update({
          name: name.trim(),
          slug: slug.trim(),
          primary_color: primaryColor,
          logo_url: persistedLogoUrl,
          target_first_response_time: targetFirstResponse,
          target_resolution_time: targetResolution,
          sla_mode: slaMode,
        })
        .eq('id', activeOrgId)

      if (error) throw error

      await refetchOrg()
      toast.success('Workspace salvo com sucesso.')
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao salvar.')
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) return null

  return (
    <>
      <form onSubmit={handleSave} className="max-w-2xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Configurações do Workspace</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Gerencie as informações e configurações da sua organização.
            </p>
          </div>
          <Button type="submit" disabled={!isDirty || isSaving} className="shrink-0">
            {isSaving ? 'Salvando…' : 'Salvar alterações'}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informações gerais</CardTitle>
            <CardDescription>Nome e slug público do workspace.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="org-name">Nome</Label>
              <Input
                id="org-name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Minha Empresa"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-slug">Slug</Label>
              <Input
                id="org-slug"
                value={slug}
                onChange={e => isSuperAdmin ? setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-')) : undefined}
                readOnly={!isSuperAdmin}
                className={!isSuperAdmin ? 'bg-muted cursor-default' : undefined}
                placeholder="minha-empresa"
                required
              />
              <p className="text-xs text-muted-foreground">
                Usado na URL do formulário público:{' '}
                <span className="font-mono">/{slug || 'slug'}</span>
                {!isSuperAdmin && (
                  <> — <span className="text-warning-muted-foreground">Apenas super admins podem alterar o slug.</span></>
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Identidade visual</CardTitle>
            <CardDescription>
              Logo e cor primária aplicados na interface do workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">

            {/* Logo */}
            <div className="space-y-2">
              <Label>Logo do workspace</Label>
              {activeOrgId && (
                <ImageCropUploader
                  value={logoUrl}
                  onChange={setLogoUrl}
                  storagePath={`${activeOrgId}/logo`}
                  label="Logo do workspace"
                  shape="square"
                  fallback={name?.slice(0, 2).toUpperCase() || '??'}
                />
              )}
              {logoUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive gap-1.5 px-0"
                  onClick={() => setLogoUrl(null)}
                >
                  <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
                  Remover logo
                </Button>
              )}
            </div>

            {/* Primary color */}
            <div className="space-y-2">
              <Label>Cor primária</Label>
              <Popover>
                <div className="flex items-center gap-3 rounded-lg border border-dashed p-3">
                  <div
                    className="size-7 rounded-md shrink-0 border border-border/40"
                    style={{ background: primaryColor ?? 'var(--primary)' }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium font-mono">
                      {primaryColor ?? 'Cor padrão do sistema'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {primaryColor ? 'Cor personalizada ativa' : 'Nenhuma cor personalizada definida'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {primaryColor && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                        onClick={() => setPrimaryColor(null)}
                      >
                        Resetar
                      </Button>
                    )}
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" size="sm">
                        Personalizar
                      </Button>
                    </PopoverTrigger>
                  </div>
                </div>
                <PopoverContent className="w-96 p-3 space-y-3" align="end">
                  <ColorPickerContent
                    value={primaryColor ?? DEFAULT_CUSTOM_COLOR}
                    onChange={setPrimaryColor}
                  />
                </PopoverContent>
              </Popover>
            </div>

          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Metas de atendimento</CardTitle>
            <CardDescription>
              Defina os tempos-alvo para medir a performance da sua equipe.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Contagem de horas</Label>
              <div className="flex rounded-lg border overflow-hidden w-fit">
                {(['calendar', 'business'] as const).map((mode, i) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setSlaMode(mode)}
                    className={cn(
                      'px-4 py-1.5 text-sm transition-colors',
                      i > 0 && 'border-l',
                      slaMode === mode
                        ? 'bg-primary text-primary-foreground font-medium'
                        : 'hover:bg-muted text-muted-foreground',
                    )}
                  >
                    {mode === 'calendar' ? 'Dias corridos' : 'Dias úteis'}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {slaMode === 'business'
                  ? 'Seg–Sex, 09h–18h UTC. Os tempos são calculados apenas dentro do horário comercial.'
                  : 'O tempo é contado continuamente, 24h por dia, 7 dias por semana.'}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="target-first-response">Primeira resposta</Label>
              <TimeInput
                id="target-first-response"
                value={targetFirstResponse}
                onChange={setTargetFirstResponse}
              />
              <p className="text-xs text-muted-foreground">
                Tempo máximo esperado até o agente responder pela primeira vez.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="target-resolution">Resolução</Label>
              <TimeInput
                id="target-resolution"
                value={targetResolution}
                onChange={setTargetResolution}
              />
              <p className="text-xs text-muted-foreground">
                Tempo máximo esperado para encerrar um chamado.
              </p>
            </div>
          </CardContent>
        </Card>
      </form>

      <AlertDialog open={open}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterações não salvas</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem alterações que ainda não foram salvas. Se sair agora, elas serão perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancel}>Continuar editando</AlertDialogCancel>
            <AlertDialogAction onClick={confirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sair sem salvar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
