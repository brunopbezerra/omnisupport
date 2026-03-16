'use client'

import * as React from "react"
import { useMemo, useCallback } from "react"
import { cn } from "@/lib/utils"
import { ButtonGroup, ButtonGroupText } from "@/components/ui/button-group"
import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"
import { useFilterContext } from "../context"
import { Filter, FilterFieldsConfig, FilterFieldConfig, FilterFieldGroup } from "../types"
import { FilterOperatorDropdown } from "./filter-operator-dropdown"
import { FilterValueSelector } from "./filter-value-selector"

const isFieldGroup = <T = unknown,>(item: FilterFieldConfig<T> | FilterFieldGroup<T>): item is FilterFieldGroup<T> => "fields" in item && Array.isArray(item.fields)
const isGroupLevelField = <T = unknown,>(field: FilterFieldConfig<T>): boolean => Boolean(field.group && field.fields)
const flattenFields = <T = unknown,>(fields: FilterFieldsConfig<T>): FilterFieldConfig<T>[] => {
  return fields.reduce<FilterFieldConfig<T>[]>((acc, item) => {
    if (isFieldGroup(item)) return [...acc, ...item.fields]
    if (isGroupLevelField(item)) return [...acc, ...item.fields!]
    return [...acc, item]
  }, [])
}
const getFieldsMap = <T = unknown,>(fields: FilterFieldsConfig<T>): Record<string, FilterFieldConfig<T>> => {
  const flatFields = flattenFields(fields)
  return flatFields.reduce((acc, field) => {
    if (field.key) acc[field.key] = field
    return acc
  }, {} as Record<string, FilterFieldConfig<T>>)
}

export function FiltersContent<T = unknown>({
  filters,
  fields,
  onChange,
}: {
  filters: Filter<T>[]
  fields: FilterFieldsConfig<T>
  onChange: (filters: Filter<T>[]) => void
}) {
  const context = useFilterContext()
  const fieldsMap = useMemo(() => getFieldsMap(fields), [fields])

  const updateFilter = useCallback((filterId: string, updates: Partial<Filter<T>>) => {
    onChange(filters.map((f) => f.id === filterId ? { ...f, ...updates, values: (updates.operator === "empty" || updates.operator === "not_empty") ? [] as T[] : (updates.values || f.values) } : f))
  }, [filters, onChange])

  const removeFilter = useCallback((filterId: string) => {
    onChange(filters.filter((f) => f.id !== filterId))
  }, [filters, onChange])

  return (
    <div className={cn("flex flex-wrap items-center gap-2", context.className)}>
      {filters.map((filter) => {
        const field = fieldsMap[filter.field]
        if (!field) return null
        return (
          <ButtonGroup key={filter.id}>
            <ButtonGroupText>{field.icon}{field.label}</ButtonGroupText>
            <FilterOperatorDropdown field={field} operator={filter.operator} values={filter.values} onChange={(op) => updateFilter(filter.id, { operator: op })} />
            <FilterValueSelector field={field} values={filter.values} onChange={(vals) => updateFilter(filter.id, { values: vals })} operator={filter.operator} />
            <Button variant="outline" size="icon-sm" onClick={() => removeFilter(filter.id)}><XIcon className="size-3.5" /></Button>
          </ButtonGroup>
        )
      })}
    </div>
  )
}
