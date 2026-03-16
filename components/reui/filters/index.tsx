'use client'

import * as React from "react"
import { useMemo, useId } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Add01Icon } from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Kbd } from "@/components/ui/kbd"

import { FilterContext } from "./context"
import { DEFAULT_I18N } from "./constants"
import { Filter, FilterFieldsConfig, FilterI18nConfig } from "./types"
import { flattenFields, createFilter } from "./utils"
import { useFilterLogic } from "./hooks/use-filter-logic"
import { FiltersContent } from "./components/filters-content"
import { FilterSubmenuContent } from "./components/filter-submenu-content"

export * from "./types"
export * from "./utils"
export * from "./constants"

interface FiltersProps<T = unknown> {
  filters: Filter<T>[]
  fields: FilterFieldsConfig<T>
  onChange: (filters: Filter<T>[]) => void
  className?: string
  variant?: "solid" | "default"
  size?: "sm" | "default" | "lg"
  radius?: "default" | "full"
  i18n?: Partial<FilterI18nConfig>
  showSearchInput?: boolean
  trigger?: React.ReactNode
  allowMultiple?: boolean
  menuPopupClassName?: string
  enableShortcut?: boolean
  shortcutKey?: string
  shortcutLabel?: string
}

export function Filters<T = unknown>({
  filters,
  fields,
  onChange,
  className,
  variant = "default",
  size = "default",
  radius = "default",
  i18n,
  showSearchInput = true,
  trigger,
  allowMultiple = true,
  menuPopupClassName,
  enableShortcut = false,
  shortcutKey = "f",
  shortcutLabel = "F",
}: FiltersProps<T>) {
  const rootId = useId()
  const mergedI18n: FilterI18nConfig = {
    ...DEFAULT_I18N,
    ...i18n,
    operators: { ...DEFAULT_I18N.operators, ...i18n?.operators },
    placeholders: { ...DEFAULT_I18N.placeholders, ...i18n?.placeholders },
    validation: { ...DEFAULT_I18N.validation, ...i18n?.validation },
  }

  const {
    addFilterOpen, setAddFilterOpen,
    menuSearchInput, setMenuSearchInput,
    activeMenu, setActiveMenu,
    openSubMenu, setOpenSubMenu,
    highlightedIndex, setHighlightedIndex,
    sessionFilterIds, setSessionFilterIds,
    addFilter, updateFilter, removeFilter
  } = useFilterLogic({ filters, fields, onChange, enableShortcut, shortcutKey })

  const selectableFields = useMemo(() => {
    const flatFields = flattenFields(fields)
    return flatFields.filter((field) => {
      if (!field.key || field.type === "separator") return false
      if (allowMultiple) return true
      return !filters.some((filter) => filter.field === field.key)
    })
  }, [fields, filters, allowMultiple])

  const filteredFields = useMemo(() => {
    return selectableFields.filter((f) => !menuSearchInput || f.label?.toLowerCase().includes(menuSearchInput.toLowerCase()))
  }, [selectableFields, menuSearchInput])

  return (
    <FilterContext.Provider value={{ variant, size, radius, i18n: mergedI18n, className, trigger, allowMultiple }}>
      <div className={cn("flex flex-wrap items-center gap-2", className)}>
        {selectableFields.length > 0 && (
          <DropdownMenu
            open={addFilterOpen}
            onOpenChange={(open) => {
              setAddFilterOpen(open)
              if (!open) { setMenuSearchInput(""); setSessionFilterIds({}); }
              else { setActiveMenu("root"); }
            }}
          >
            <DropdownMenuTrigger asChild>
              {trigger || <Button variant="outline"><HugeiconsIcon icon={Add01Icon} className="mr-2 size-4" />{mergedI18n.addFilter}</Button>}
            </DropdownMenuTrigger>
            <DropdownMenuContent className={cn("w-[220px]", menuPopupClassName)} align="start">
              {showSearchInput && (
                <div className="relative p-1">
                  <Input
                    placeholder={mergedI18n.searchFields}
                    className="h-8 border-0 bg-transparent! focus-visible:ring-0"
                    value={menuSearchInput}
                    onChange={(e) => setMenuSearchInput(e.target.value)}
                  />
                  {enableShortcut && shortcutLabel && <Kbd className="absolute right-2 top-1/2 -translate-y-1/2">{shortcutLabel}</Kbd>}
                  <DropdownMenuSeparator />
                </div>
              )}
              <ScrollArea className="max-h-64">
                {filteredFields.length === 0 ? (
                  <div className="py-2 text-center text-sm text-muted-foreground">{mergedI18n.noFieldsFound}</div>
                ) : (
                  filteredFields.map((field, index) => {
                    const hasSubMenu = (field.type === "select" || field.type === "multiselect") && field.options?.length
                    if (hasSubMenu) {
                      const fieldKey = field.key as string
                      const sessionFilterId = sessionFilterIds[fieldKey]
                      const sessionFilter = sessionFilterId ? filters.find((f) => f.id === sessionFilterId) : null
                      return (
                        <DropdownMenuSub key={fieldKey} open={openSubMenu === fieldKey} onOpenChange={(open) => setOpenSubMenu(open ? fieldKey : null)}>
                          <DropdownMenuSubTrigger onMouseEnter={() => setHighlightedIndex(index)}>
                            {field.icon} <span>{field.label}</span>
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent className="w-[200px]">
                            <FilterSubmenuContent
                              field={field}
                              currentValues={sessionFilter?.values || []}
                              isMultiSelect={field.type === "multiselect"}
                              i18n={mergedI18n}
                              onToggle={(value, isSelected) => {
                                if (field.type === "multiselect") {
                                  const nextValues = isSelected ? (sessionFilter?.values.filter(v => v !== value) || []) : [...(sessionFilter?.values || []), value]
                                  if (sessionFilter) {
                                    if (nextValues.length === 0) {
                                      onChange(filters.filter(f => f.id !== sessionFilter.id))
                                      setSessionFilterIds(prev => ({ ...prev, [fieldKey]: "" }))
                                    } else {
                                      updateFilter(sessionFilter.id, { values: nextValues as T[] })
                                    }
                                  } else {
                                    const newF = createFilter<T>(fieldKey, field.defaultOperator || "is_any_of", nextValues as T[])
                                    onChange([...filters, newF])
                                    setSessionFilterIds(prev => ({ ...prev, [fieldKey]: newF.id }))
                                  }
                                } else {
                                  addFilter(fieldKey, [value as T])
                                }
                              }}
                            />
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                      )
                    }
                    return (
                      <DropdownMenuItem key={field.key} onClick={() => field.key && addFilter(field.key)}>
                        {field.icon} <span>{field.label}</span>
                      </DropdownMenuItem>
                    )
                  })
                )}
              </ScrollArea>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <FiltersContent filters={filters} fields={fields} onChange={onChange} />
      </div>
    </FilterContext.Provider>
  )
}
