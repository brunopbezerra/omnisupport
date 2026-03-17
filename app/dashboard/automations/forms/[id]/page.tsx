'use client'

import { use, useState } from 'react'
import { toast } from 'sonner'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowLeft01Icon,
  Settings01Icon,
  LayoutTopIcon,
  EyeIcon,
  ComputerIcon,
  SmartPhone01Icon,
  Alert01Icon,
  Copy01Icon,
} from '@hugeicons/core-free-icons'
import Link from 'next/link'
import { useFormBuilder } from '@/hooks/use-form-builder'
import { useCategories } from '@/hooks/use-categories'
import { useWorkspace } from '@/components/providers/workspace-provider'
import { FieldPalette } from '@/components/form-builder/field-palette'
import { FormCanvas } from '@/components/form-builder/form-canvas'
import { FieldSettingsPanel } from '@/components/form-builder/field-settings-panel'
import { AppearanceTab } from '@/components/form-builder/appearance-tab'
import { FormViewer } from '@/components/form-builder/form-viewer'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Sheet,
  SheetContent,
  SheetClose,
} from '@/components/ui/sheet'
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
import type { FormViewerData } from '@/components/form-builder/form-viewer'

type EditorTab = 'fields' | 'appearance'
type Viewport = 'desktop' | 'mobile'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function FormEditorPage({ params }: PageProps) {
  const { id } = use(params)
  const { categories } = useCategories()
  const { activeOrg } = useWorkspace()

  const [activeTab, setActiveTab] = useState<EditorTab>('fields')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [viewport, setViewport] = useState<Viewport>('desktop')
  const [confirmDraft, setConfirmDraft] = useState(false)

  const {
    title, setTitle,
    status, saveStatus,
    settings, updateSettings,
    formSlug,
    fields,
    logic,
    selectedField,
    selectedFieldId,
    isDirty,
    isSaving,
    isLoading,
    addField,
    updateField,
    removeField,
    reorderFields,
    selectField,
    addLogic,
    removeLogic,
    updateLogic,
    save,
  } = useFormBuilder(id)

  async function handleSave() {
    try {
      await save()
      toast.success('Formulário salvo')
    } catch {
      toast.error('Erro ao salvar formulário')
    }
  }

  const [confirmPublish, setConfirmPublish] = useState(false)

  function handleStatusToggle(checked: boolean) {
    if (!checked && status === 'live') {
      setConfirmDraft(true)
    } else if (checked && status === 'draft') {
      setConfirmPublish(true)
    }
  }

  function copyPublicUrl() {
    if (!activeOrg?.slug || !formSlug) return
    navigator.clipboard.writeText(`${window.location.origin}/f/${activeOrg.slug}/${formSlug}`)
    toast.success('URL copiada')
  }

  // Build preview data from current (possibly unsaved) editor state
  const previewData: FormViewerData = {
    id,
    org_id: activeOrg?.id ?? '',
    title,
    settings,
    form_fields: fields,
    form_logic: logic,
  }

  return (
    <>
      <div className="grid grid-cols-[240px_1fr_300px] h-full -m-4 lg:-m-6">
        {/* Left — field palette / back link */}
        <aside className="border-r overflow-y-auto p-4">
          <div className="mb-4">
            <Link
              href="/dashboard/automations/forms"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} className="size-3.5" />
              Voltar
            </Link>
          </div>

          {activeTab === 'fields' && <FieldPalette onAdd={addField} />}

          {activeTab === 'appearance' && (
            <div className="space-y-1 pt-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">
                Editor
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('fields')}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <HugeiconsIcon icon={LayoutTopIcon} className="size-3.5" />
                Campos do formulário
              </button>
            </div>
          )}
        </aside>

        {/* Center — tabbed content */}
        <div className="flex flex-col min-h-0">
          {/* Header */}
          <header className="flex items-center gap-3 border-b px-4 py-3 shrink-0">
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="h-8 text-sm font-medium max-w-xs"
              placeholder="Título do formulário"
            />

            {/* Tab selector */}
            <div className="flex items-center gap-0.5 rounded-lg border bg-muted/40 p-0.5">
              <button
                type="button"
                onClick={() => setActiveTab('fields')}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  activeTab === 'fields'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <HugeiconsIcon icon={LayoutTopIcon} className="size-3.5" />
                Campos
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('appearance')}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  activeTab === 'appearance'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <HugeiconsIcon icon={Settings01Icon} className="size-3.5" />
                Aparência
              </button>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <Badge variant={status === 'live' ? 'success-muted' : 'outline'}>
                {status === 'live' ? 'Publicado' : 'Rascunho'}
              </Badge>
              <Switch
                checked={status === 'live'}
                onCheckedChange={handleStatusToggle}
              />

              {/* Copy URL — only when live */}
              {status === 'live' && formSlug && activeOrg?.slug && (
                <Button variant="outline" size="sm" onClick={copyPublicUrl} className="text-xs">
                  <HugeiconsIcon icon={Copy01Icon} className="size-3.5 mr-1.5" />
                  Copiar URL
                </Button>
              )}

              {/* Preview sheet trigger */}
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setPreviewOpen(true)}
              >
                <HugeiconsIcon icon={EyeIcon} className="size-3.5 mr-1.5" />
                Preview
              </Button>

              <Button size="sm" onClick={handleSave} disabled={!isDirty || isSaving}>
                {isSaving ? 'Salvando…' : 'Salvar'}
              </Button>
            </div>
          </header>

          {/* Tab content */}
          <ScrollArea className="flex-1">
            <div className="p-4">
              {activeTab === 'fields' && (
                <>
                  {isLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-20 w-full" />
                      <Skeleton className="h-20 w-full" />
                      <Skeleton className="h-20 w-full" />
                    </div>
                  ) : fields.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center gap-2">
                      <p className="text-sm font-medium">Nenhum campo ainda</p>
                      <p className="text-xs text-muted-foreground">
                        Clique em um tipo de campo na barra lateral para adicionar.
                      </p>
                    </div>
                  ) : (
                    <FormCanvas
                      fields={fields}
                      selectedFieldId={selectedFieldId}
                      onSelect={selectField}
                      onRemove={removeField}
                      onReorder={reorderFields}
                    />
                  )}
                </>
              )}

              {activeTab === 'appearance' && (
                <AppearanceTab
                  formId={id}
                  settings={settings}
                  onChange={updateSettings}
                />
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right — settings panel */}
        <aside className="border-l overflow-y-auto p-4">
          {activeTab === 'fields' ? (
            <FieldSettingsPanel
              field={selectedField}
              allFields={fields}
              logic={logic}
              categories={categories}
              onUpdate={patch => selectedFieldId && updateField(selectedFieldId, patch)}
              onAddLogic={addLogic}
              onRemoveLogic={removeLogic}
              onUpdateLogic={updateLogic}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-40 gap-2 text-center">
              <HugeiconsIcon icon={Settings01Icon} className="size-8 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">
                Configure a aparência e confirmação no painel central.
              </p>
            </div>
          )}
        </aside>
      </div>

      {/* ── Preview Sheet ──────────────────────────────────────── */}
      <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
        <SheetContent
          side="right"
          showCloseButton={false}
          style={{ width: '90vw', maxWidth: '90vw' }}
          className="p-0 flex flex-col gap-0"
        >
          {/* Sheet top bar */}
          <div className="flex items-center gap-3 border-b px-4 py-3 shrink-0">
            <span className="text-sm font-medium truncate flex-1">
              Preview — {title || 'Formulário'}
            </span>

            {/* Viewport toggle */}
            <div className="flex items-center gap-0.5 rounded-lg border bg-muted/40 p-0.5">
              <button
                type="button"
                onClick={() => setViewport('desktop')}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  viewport === 'desktop'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <HugeiconsIcon icon={ComputerIcon} className="size-3.5" />
                Desktop
              </button>
              <button
                type="button"
                onClick={() => setViewport('mobile')}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  viewport === 'mobile'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <HugeiconsIcon icon={SmartPhone01Icon} className="size-3.5" />
                Mobile
              </button>
            </div>

            <SheetClose asChild>
              <Button variant="ghost" size="icon-sm">
                <HugeiconsIcon icon={Alert01Icon} className="size-4 hidden" />
                ✕
              </Button>
            </SheetClose>
          </div>

          {/* Sandbox banner */}
          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 px-4 py-2 shrink-0">
            <HugeiconsIcon
              icon={Alert01Icon}
              className="size-4 shrink-0 text-amber-700 dark:text-amber-400"
            />
            <p className="text-xs text-amber-800 dark:text-amber-300">
              <span className="font-medium">Modo Preview</span>
              {' '}— as submissões não criam tickets reais.
            </p>
          </div>

          {/* Form content */}
          <div className="flex-1 overflow-auto bg-background text-foreground">
            <div
              className={`transition-all duration-300 ${
                viewport === 'mobile'
                  ? 'max-w-[375px] mx-auto ring-1 ring-border/60 min-h-full'
                  : ''
              }`}
            >
              {previewOpen && (
                <FormViewer
                  key={String(previewOpen)}
                  form={previewData}
                  orgPrimaryColor={activeOrg?.primary_color}
                  isPreview
                />
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Publish Confirmation Dialog ────────────────────────── */}
      <AlertDialog open={confirmPublish} onOpenChange={setConfirmPublish}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publicar formulário?</AlertDialogTitle>
            <AlertDialogDescription>
              O formulário ficará disponível publicamente e poderá receber submissões imediatamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await saveStatus('live')
                setConfirmPublish(false)
                toast.success('Formulário publicado', {
                  description: 'O formulário já está disponível para receber submissões.',
                })
              }}
            >
              Publicar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Draft Confirmation Dialog ──────────────────────────── */}
      <AlertDialog open={confirmDraft} onOpenChange={setConfirmDraft}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tornar formulário rascunho?</AlertDialogTitle>
            <AlertDialogDescription>
              O formulário ficará indisponível para os usuários imediatamente. Os tickets já
              criados não serão afetados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await saveStatus('draft')
                setConfirmDraft(false)
                toast.success('Formulário revertido para rascunho', {
                  description: 'O formulário não está mais disponível publicamente.',
                })
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
