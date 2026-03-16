'use client'

import { useState, useCallback, useMemo, useEffect } from "react"
import { Filter, FilterFieldsConfig } from "../types"
import { getFieldsMap, createFilter } from "../utils"

interface UseFilterLogicProps<T = unknown> {
  filters: Filter<T>[]
  fields: FilterFieldsConfig<T>
  onChange: (filters: Filter<T>[]) => void
  enableShortcut?: boolean
  shortcutKey?: string
}

export function useFilterLogic<T = unknown>({
  filters,
  fields,
  onChange,
  enableShortcut,
  shortcutKey = "f",
}: UseFilterLogicProps<T>) {
  const [addFilterOpen, setAddFilterOpen] = useState(false)
  const [menuSearchInput, setMenuSearchInput] = useState("")
  const [activeMenu, setActiveMenu] = useState<string>("root")
  const [openSubMenu, setOpenSubMenu] = useState<string | null>(null)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [lastAddedFilterId, setLastAddedFilterId] = useState<string | null>(null)
  const [sessionFilterIds, setSessionFilterIds] = useState<Record<string, string>>({})

  const fieldsMap = useMemo(() => getFieldsMap(fields), [fields])

  useEffect(() => {
    if (!enableShortcut) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === shortcutKey.toLowerCase() && !addFilterOpen && !(document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement)) {
        e.preventDefault()
        setAddFilterOpen(true)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [enableShortcut, shortcutKey, addFilterOpen])

  useEffect(() => { setHighlightedIndex(-1) }, [menuSearchInput])
  useEffect(() => { if (!addFilterOpen) setOpenSubMenu(null) }, [addFilterOpen])

  const updateFilter = useCallback((filterId: string, updates: Partial<Filter<T>>) => {
    onChange(filters.map((f) => f.id === filterId ? { ...f, ...updates, values: (updates.operator === "empty" || updates.operator === "not_empty") ? [] as T[] : (updates.values || f.values) } : f))
  }, [filters, onChange])

  const removeFilter = useCallback((filterId: string) => {
    onChange(filters.filter((f) => f.id !== filterId))
  }, [filters, onChange])

  const addFilter = useCallback((fieldKey: string, initialValues?: T[]) => {
    const field = fieldsMap[fieldKey]
    if (field?.key) {
      const defaultValues = initialValues || (field.type === "text" ? [""] as unknown as T[] : [])
      const newFilter = createFilter<T>(fieldKey, field.defaultOperator || (field.type === "multiselect" ? "is_any_of" : "is"), defaultValues)
      setLastAddedFilterId(newFilter.id)
      onChange([...filters, newFilter])
      setAddFilterOpen(false)
      setMenuSearchInput("")
    }
  }, [fieldsMap, filters, onChange])

  return {
    addFilterOpen, setAddFilterOpen,
    menuSearchInput, setMenuSearchInput,
    activeMenu, setActiveMenu,
    openSubMenu, setOpenSubMenu,
    highlightedIndex, setHighlightedIndex,
    lastAddedFilterId, setLastAddedFilterId,
    sessionFilterIds, setSessionFilterIds,
    fieldsMap,
    addFilter, updateFilter, removeFilter
  }
}
