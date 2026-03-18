'use client'

import { useEffect, useState, useCallback } from 'react'
import { arrayMove } from '@dnd-kit/sortable'
import { supabase } from '@/lib/supabase/client'
import type { FormField, FormLogic, FormStatus, FormSettings, FieldType } from '@/types/forms'

const CHOICE_TYPES: FieldType[] = ['select', 'radio', 'checkbox']

export function useFormBuilder(formId: string) {
  const [title, setTitle] = useState('')
  const [status, setStatus] = useState<FormStatus>('draft')
  const [settings, setSettings] = useState<FormSettings>({})
  const [formSlug, setFormSlug] = useState('')
  const [fields, setFields] = useState<FormField[]>([])
  const [logic, setLogic] = useState<FormLogic[]>([])
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      const { data: form } = await supabase
        .from('forms')
        .select('*')
        .eq('id', formId)
        .single()

      const { data: formFields } = await supabase
        .from('form_fields')
        .select('*')
        .eq('form_id', formId)
        .order('order_index', { ascending: true })

      const { data: formLogic } = await supabase
        .from('form_logic')
        .select('*')
        .eq('form_id', formId)

      if (form) {
        setTitle(form.title)
        setStatus(form.status)
        setSettings(form.settings ?? {})
        setFormSlug(form.slug)
      }
      setFields((formFields ?? []) as FormField[])
      setLogic((formLogic ?? []) as FormLogic[])
      setIsDirty(false)
      setIsLoading(false)
    }

    load()
  }, [formId])

  const addField = useCallback((type: FieldType) => {
    const newField: FormField = {
      id: crypto.randomUUID(),
      form_id: formId,
      label: '',
      type,
      required: false,
      order_index: 0,
      options: CHOICE_TYPES.includes(type) ? [{ id: crypto.randomUUID(), label: '' }] : [],
      mapping: {},
      hidden: false,
      default_value: null,
      mask: null,
    }
    setFields(prev => {
      const updated = [...prev, { ...newField, order_index: prev.length }]
      return updated
    })
    setSelectedFieldId(newField.id)
    setIsDirty(true)
  }, [formId])

  const addFieldAt = useCallback((type: FieldType, index?: number) => {
    const newField: FormField = {
      id: crypto.randomUUID(),
      form_id: formId,
      label: '',
      type,
      required: false,
      order_index: 0,
      options: CHOICE_TYPES.includes(type) ? [{ id: crypto.randomUUID(), label: '' }] : [],
      mapping: {},
      hidden: false,
      default_value: null,
      mask: null,
    }
    setFields(prev => {
      const insertAt = index !== undefined ? Math.max(0, Math.min(index, prev.length)) : prev.length
      const updated = [
        ...prev.slice(0, insertAt),
        { ...newField, order_index: insertAt },
        ...prev.slice(insertAt),
      ].map((f, i) => ({ ...f, order_index: i }))
      return updated
    })
    setSelectedFieldId(newField.id)
    setIsDirty(true)
  }, [formId])

  const updateField = useCallback(
    (id: string, patch: Partial<FormField>) => {
      setFields(prev => prev.map(f => (f.id === id ? { ...f, ...patch } : f)))
      setIsDirty(true)
    },
    []
  )

  const removeField = useCallback((id: string) => {
    setFields(prev => prev.filter(f => f.id !== id))
    setLogic(prev => prev.filter(l => l.source_field_id !== id && l.target_field_id !== id))
    setSelectedFieldId(prev => (prev === id ? null : prev))
    setIsDirty(true)
  }, [])

  const reorderFields = useCallback((activeId: string, overId: string) => {
    setFields(prev => {
      const reordered = arrayMove(
        prev,
        prev.findIndex(f => f.id === activeId),
        prev.findIndex(f => f.id === overId)
      )
      return reordered.map((f, i) => ({ ...f, order_index: i }))
    })
    setIsDirty(true)
  }, [])

  const selectField = useCallback((id: string) => {
    setSelectedFieldId(id)
  }, [])

  const addLogic = useCallback(
    (sourceFieldId: string, targetFieldId: string) => {
      const rule: FormLogic = {
        id: crypto.randomUUID(),
        form_id: formId,
        source_field_id: sourceFieldId,
        target_field_id: targetFieldId,
        operator: 'equals',
        value: '',
      }
      setLogic(prev => [...prev, rule])
      setIsDirty(true)
    },
    [formId]
  )

  const updateLogic = useCallback((id: string, patch: Partial<FormLogic>) => {
    setLogic(prev => prev.map(l => (l.id === id ? { ...l, ...patch } : l)))
    setIsDirty(true)
  }, [])

  const removeLogic = useCallback((id: string) => {
    setLogic(prev => prev.filter(l => l.id !== id))
    setIsDirty(true)
  }, [])

  const updateSettings = useCallback((patch: Partial<FormSettings>) => {
    setSettings(prev => ({ ...prev, ...patch }))
    setIsDirty(true)
  }, [])

  const saveStatus = useCallback(async (newStatus: FormStatus) => {
    setStatus(newStatus)
    await supabase.from('forms').update({ status: newStatus }).eq('id', formId)
  }, [formId])

  const save = useCallback(async () => {
    setIsSaving(true)
    try {
      await supabase
        .from('forms')
        .update({ title, status, settings })
        .eq('id', formId)

      await supabase.from('form_fields').delete().eq('form_id', formId)

      if (fields.length > 0) {
        await supabase.from('form_fields').insert(
          fields.map(f => ({
            id: f.id,
            form_id: formId,
            label: f.label,
            type: f.type,
            required: f.required,
            order_index: f.order_index,
            options: f.options,
            mapping: f.mapping,
            hidden: f.hidden ?? false,
            default_value: f.default_value ?? null,
            mask: f.mask ?? null,
          }))
        )
      }

      if (logic.length > 0) {
        await supabase.from('form_logic').insert(
          logic.map(l => ({
            id: l.id,
            form_id: formId,
            source_field_id: l.source_field_id,
            target_field_id: l.target_field_id,
            operator: l.operator,
            value: l.value,
          }))
        )
      }

      setIsDirty(false)
    } finally {
      setIsSaving(false)
    }
  }, [formId, title, status, settings, fields, logic])

  const selectedField = fields.find(f => f.id === selectedFieldId) ?? null

  return {
    title, setTitle,
    status, saveStatus,
    settings, updateSettings,
    formSlug,
    fields,
    logic,
    selectedFieldId,
    selectedField,
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
    updateLogic,
    removeLogic,
    save,
  }
}
