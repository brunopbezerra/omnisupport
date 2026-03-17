'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Alert01Icon,
  Loading03Icon,
  ComputerIcon,
  SmartPhone01Icon,
} from '@hugeicons/core-free-icons'
import { supabase } from '@/lib/supabase/client'
import { useWorkspace } from '@/components/providers/workspace-provider'
import { FormViewer } from '@/components/form-builder/form-viewer'
import type { FormViewerData } from '@/components/form-builder/form-viewer'
import type { FormField } from '@/types/forms'

type Viewport = 'desktop' | 'mobile'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function FormPreviewPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const { currentUser, activeOrg } = useWorkspace()

  const [form, setForm] = useState<FormViewerData | null | undefined>(undefined)
  const [viewport, setViewport] = useState<Viewport>('desktop')

  // Access control
  useEffect(() => {
    if (currentUser && currentUser.role === 'agent') {
      router.replace('/dashboard')
    }
  }, [currentUser, router])

  // Fetch form using authenticated client — drafts are visible here
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('forms')
        .select('*, form_fields(*), form_logic(*)')
        .eq('id', id)
        .single()

      if (data) {
        data.form_fields = [...data.form_fields].sort(
          (a: FormField, b: FormField) => a.order_index - b.order_index
        )
      }

      setForm(data ?? null)
    }
    load()
  }, [id])

  return (
    <div className="-m-4 lg:-m-6 flex flex-col h-[calc(100%+2rem)] lg:h-[calc(100%+3rem)]">
      {/* ── Sandbox Banner ───────────────────────────────────────── */}
      <div className="sticky top-0 z-40 shrink-0 border-b bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <HugeiconsIcon
              icon={Alert01Icon}
              className="size-4 shrink-0 text-amber-700 dark:text-amber-400"
            />
            <span className="text-sm font-medium text-amber-800 dark:text-amber-300 truncate">
              Modo Preview
            </span>
            <span className="text-sm text-amber-600 dark:text-amber-500 hidden sm:inline">
              — As submissões não criam tickets reais.
            </span>
          </div>

          {/* Viewport toggle */}
          <div className="flex items-center gap-0.5 rounded-lg border border-amber-200 dark:border-amber-800 bg-white dark:bg-black/20 p-0.5 shrink-0">
            <button
              type="button"
              onClick={() => setViewport('desktop')}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                viewport === 'desktop'
                  ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-100'
                  : 'text-amber-600 hover:text-amber-900 dark:text-amber-500 dark:hover:text-amber-200'
              }`}
              aria-label="Desktop"
            >
              <HugeiconsIcon icon={ComputerIcon} className="size-3.5" />
              <span className="hidden sm:inline">Desktop</span>
            </button>
            <button
              type="button"
              onClick={() => setViewport('mobile')}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                viewport === 'mobile'
                  ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-100'
                  : 'text-amber-600 hover:text-amber-900 dark:text-amber-500 dark:hover:text-amber-200'
              }`}
              aria-label="Mobile"
            >
              <HugeiconsIcon icon={SmartPhone01Icon} className="size-3.5" />
              <span className="hidden sm:inline">Mobile</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto bg-background text-foreground">
        {form === undefined && (
          <div className="flex items-center justify-center h-full min-h-64">
            <HugeiconsIcon
              icon={Loading03Icon}
              className="size-8 animate-spin text-muted-foreground"
            />
          </div>
        )}

        {form === null && (
          <div className="flex items-center justify-center h-full min-h-64">
            <p className="text-sm text-muted-foreground">Formulário não encontrado.</p>
          </div>
        )}

        {form && (
          <div
            className={`transition-all duration-300 ${
              viewport === 'mobile'
                ? 'max-w-[375px] mx-auto ring-1 ring-border/60 min-h-full'
                : ''
            }`}
          >
            <FormViewer
              form={form}
              orgPrimaryColor={activeOrg?.primary_color}
              isPreview
            />
          </div>
        )}
      </div>
    </div>
  )
}
