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
  DragDropVerticalIcon,
  Copy01Icon,
  PaintBoardIcon,
  Note01Icon,
} from '@hugeicons/core-free-icons'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AppearanceTab, SettingsTab } from '@/components/form-builder/appearance-tab'
import Link from 'next/link'
import {
  DndContext,
  closestCenter,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'

import { CANVAS_DROPPABLE_ID } from '@/components/form-builder/form-canvas'
import { useFormBuilder } from '@/hooks/use-form-builder'
import { useCategories } from '@/hooks/use-categories'
import { useWorkspace } from '@/components/providers/workspace-provider'
import { FieldPalette } from '@/components/form-builder/field-palette'
import { FormCanvas } from '@/components/form-builder/form-canvas'
import { FieldSettingsPanel } from '@/components/form-builder/field-settings-panel'
import { FormViewer } from '@/components/form-builder/form-viewer'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
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
import type { FieldType } from '@/types/forms'

type EditorTab = 'fields' | 'appearance' | 'settings'
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
  const [confirmPublish, setConfirmPublish] = useState(false)

  // Drag state for overlay
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activePaletteType, setActivePaletteType] = useState<FieldType | null>(null)

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
    addFieldAt,
    updateField,
    removeField,
    reorderFields,
    selectField,
    addLogic,
    removeLogic,
    updateLogic,
    save,
  } = useFormBuilder(id)

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor)
  )

  async function handleSave() {
    try {
      await save()
      toast.success('Formulário salvo')
    } catch {
      toast.error('Erro ao salvar formulário')
    }
  }

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

  function handleAddFromPalette(type: FieldType, index?: number) {
    if (index !== undefined) {
      addFieldAt(type, index)
    } else {
      addField(type)
    }
  }

  function handleDragStart(event: DragStartEvent) {
    const { active } = event
    setActiveId(active.id as string)
    if (active.data.current?.fromPalette) {
      setActivePaletteType(active.data.current.fieldType)
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    setActivePaletteType(null)
    if (!over) return

    const isFromPalette = active.data.current?.fromPalette === true
    const fieldType = active.data.current?.fieldType as FieldType | undefined

    if (isFromPalette && fieldType) {
      if (over.id === CANVAS_DROPPABLE_ID) {
        addField(fieldType)
      } else {
        // Dropped over an existing field — insert before it
        const overIndex = fields.findIndex(f => f.id === over.id)
        addFieldAt(fieldType, overIndex >= 0 ? overIndex : undefined)
      }
      return
    }

    // Reorder within canvas
    if (active.id !== over.id) {
      reorderFields(active.id as string, over.id as string)
    }
  }

  const previewData: FormViewerData = {
    id,
    org_id: activeOrg?.id ?? '',
    title,
    settings,
    form_fields: fields,
    form_logic: logic,
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
    <>
      {/* ── Full-height container ──────────────────────────────────────────── */}
      <div className="flex flex-col h-[calc(100vh-3.5rem)] -m-4 lg:-m-6 overflow-hidden bg-background">

        {/* ── Top bar ─────────────────────────────────────────────────────── */}
        {/* ── Top bar ─────────────────────────────────────────────────────── */}
        <header className="flex items-center gap-4 border-b px-4 py-2 shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 z-30">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/automations/forms"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground shrink-0"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} className="size-3.5" />
              Voltar
            </Link>

            <div className="h-4 w-px bg-border shrink-0" />

            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="h-8 text-sm font-semibold max-w-[220px] bg-transparent border-none px-2 shadow-none focus-visible:ring-1 focus-visible:ring-primary/20 hover:bg-muted/30 transition-colors"
              placeholder="Título do formulário"
            />
          </div>

          {/* Centered Tabs */}
          <div className="flex-1 flex justify-center">
            <Tabs value={activeTab} onValueChange={v => setActiveTab(v as EditorTab)}>
              <TabsList className="bg-muted/50 p-1 rounded-xl border h-10">
                <TabsTrigger 
                  value="fields" 
                  className="text-xs h-8 px-4 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground gap-1.5 transition-all font-medium"
                >
                  <HugeiconsIcon icon={Note01Icon} className="size-4" />
                  Campos
                </TabsTrigger>
                <TabsTrigger 
                  value="appearance" 
                  className="text-xs h-8 px-4 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground gap-1.5 transition-all font-medium"
                >
                  <HugeiconsIcon icon={PaintBoardIcon} className="size-4" />
                  Aparência
                </TabsTrigger>
                <TabsTrigger 
                  value="settings" 
                  className="text-xs h-8 px-4 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground gap-1.5 transition-all font-medium"
                >
                  <HugeiconsIcon icon={Settings01Icon} className="size-4" />
                  Configurações
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 mr-1">
              <Badge variant={status === 'live' ? 'success-muted' : 'outline'} className="text-[10px] font-bold uppercase tracking-tight py-0.5 px-2">
                {status === 'live' ? 'Publicado' : 'Rascunho'}
              </Badge>
              <Switch
                checked={status === 'live'}
                onCheckedChange={handleStatusToggle}
                className="scale-90"
              />
            </div>

            <div className="h-4 w-px bg-border shrink-0" />

            <div className="flex items-center gap-1.5 font-medium">
              {status === 'live' && formSlug && activeOrg?.slug && (
                <Button variant="ghost" size="sm" onClick={copyPublicUrl} className="text-xs h-8 px-2 hover:bg-primary/5 hover:text-primary transition-colors">
                  <HugeiconsIcon icon={Copy01Icon} className="size-3.5 mr-1.5" />
                  Link
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-8 px-2 hover:bg-primary/5 hover:text-primary transition-colors"
                onClick={() => setPreviewOpen(true)}
              >
                <HugeiconsIcon icon={EyeIcon} className="size-3.5 mr-1.5" />
                Preview
              </Button>

              <Button 
                size="sm" 
                className="h-8 px-4 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm transition-all active:scale-95" 
                onClick={handleSave} 
                disabled={!isDirty || isSaving}
              >
                {isSaving ? 'Salvando…' : 'Salvar'}
              </Button>
            </div>
          </div>
        </header>

        {/* ── 3-column editor area ─────────────────────────────────────────── */}
        <div className="grid grid-cols-[220px_1fr_340px] flex-1 min-h-0">

          {/* Left — field palette / appearance nav */}
          <aside className="border-r overflow-y-auto p-3">
            {activeTab === 'fields' && <FieldPalette onAdd={addField} />}

            {activeTab === 'appearance' && (
              <div className="space-y-1 pt-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-2 pb-0.5">
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

          {/* Center — canvas or appearance tab */}
          <div className="flex flex-col min-h-0">
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
                    ) : (
                      <FormCanvas
                        fields={fields}
                        logic={logic}
                        selectedFieldId={selectedFieldId}
                        onSelect={selectField}
                        onRemove={removeField}
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

                {activeTab === 'settings' && (
                  <SettingsTab
                    formId={id}
                    settings={settings}
                    onChange={updateSettings}
                  />
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Right — properties panel */}
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
      </div>

      {/* ── Preview Sheet ──────────────────────────────────────────────────── */}
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
              <Button variant="ghost" size="icon-sm">✕</Button>
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

      {/* ── Publish Confirmation ─────────────────────────────────────────────── */}
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

      {/* ── Draft Confirmation ───────────────────────────────────────────────── */}
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
                toast.success('Formulário revertido para rascunho')
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DragOverlay dropAnimation={null}>
        {activeId ? (
          <div className="w-[600px] opacity-90 cursor-grabbing scale-[1.02] transition-transform">
            <div className="rounded-2xl border bg-background p-6 shadow-[0_20px_50px_rgba(0,0,0,0.15)] ring-2 ring-primary relative overflow-hidden backdrop-blur-sm">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5 text-primary">
                  <HugeiconsIcon icon={DragDropVerticalIcon} className="size-4.5" />
                  <span className="text-xs font-bold uppercase tracking-widest">
                    {activePaletteType ? activePaletteType : 'Campo'}
                  </span>
                </div>
                <div className="px-2.5 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-tight">
                  Novo Campo
                </div>
              </div>
              <div className="h-12 w-full rounded-xl bg-muted/20 border-2 border-dashed border-primary/20 flex items-center px-4">
                <span className="text-xs font-medium text-primary/40 italic">Solte no canvas para adicionar</span>
              </div>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </>
    </DndContext>
  )
}
