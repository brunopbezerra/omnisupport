'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { HugeiconsIcon } from '@hugeicons/react'
import { Loading03Icon } from '@hugeicons/core-free-icons'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FormViewer } from '@/components/form-builder/form-viewer'
import type { FormViewerData } from '@/components/form-builder/form-viewer'
import type { FormField } from '@/types/forms'

const anonymousSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
)

interface OrgData {
  id: string
  ticket_prefix: string
  primary_color: string | null
}

export default function PublicFormPage() {
  const { orgSlug, formSlug } = useParams<{ orgSlug: string; formSlug: string }>()

  const [form, setForm] = useState<FormViewerData | null | undefined>(undefined)
  const [org, setOrg] = useState<OrgData | null>(null)

  useEffect(() => {
    async function load() {
      const { data: orgData } = await anonymousSupabase
        .from('organizations')
        .select('id, ticket_prefix, primary_color')
        .eq('slug', orgSlug)
        .single()

      if (!orgData) {
        setForm(null)
        return
      }

      const { data: formData } = await anonymousSupabase
        .from('forms')
        .select('*, form_fields(*), form_logic(*)')
        .eq('slug', formSlug)
        .eq('org_id', orgData.id)
        .eq('status', 'live')
        .maybeSingle()

      if (formData) {
        formData.form_fields = [...formData.form_fields].sort(
          (a: FormField, b: FormField) => a.order_index - b.order_index
        )
        setOrg(orgData)
      }

      setForm(formData ?? null)
    }
    load()
  }, [orgSlug, formSlug])

  if (form === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <HugeiconsIcon icon={Loading03Icon} className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (form === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Formulário não encontrado</CardTitle>
            <CardDescription>
              Este formulário não existe ou não está disponível no momento.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <FormViewer
        form={form}
        orgPrimaryColor={org?.primary_color}
        ticketPrefix={org?.ticket_prefix}
      />
    </div>
  )
}
