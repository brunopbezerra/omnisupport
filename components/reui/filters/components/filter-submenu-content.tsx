'use client'

import * as React from "react"
import { useState, useRef, useEffect, useMemo, useId } from "react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenuCheckboxItem,
  DropdownMenuGroup,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { FilterFieldConfig, FilterI18nConfig } from "../types"

interface FilterSubmenuContentProps<T = unknown> {
  field: FilterFieldConfig<T>
  currentValues: T[]
  isMultiSelect: boolean
  onToggle: (value: T, isSelected: boolean) => void
  i18n: FilterI18nConfig
  isActive?: boolean
  onActive?: () => void
  onBack?: () => void
  onClose?: () => void
}

export function FilterSubmenuContent<T = unknown>({
  field,
  currentValues,
  isMultiSelect,
  onToggle,
  i18n,
  isActive,
  onActive,
  onBack,
  onClose,
}: FilterSubmenuContentProps<T>) {
  const [searchInput, setSearchInput] = useState("")
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const baseId = useId()

  const filteredOptions = useMemo(() => {
    return field.options?.filter((option) => {
      if (currentValues.includes(option.value)) return true
      if (!searchInput) return true
      return option.label.toLowerCase().includes(searchInput.toLowerCase())
    }) || []
  }, [field.options, searchInput, currentValues])

  useEffect(() => { if (isActive && filteredOptions.length > 0) setHighlightedIndex(0) }, [isActive, filteredOptions.length])

  return (
    <div className="flex flex-col" onMouseEnter={onActive}>
      {field.searchable !== false && (
        <>
          <Input
            ref={inputRef}
            placeholder={i18n.placeholders.searchField(field.label || "")}
            className="h-8 rounded-none border-0 bg-transparent! px-2 text-sm shadow-none focus-visible:ring-0"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault()
                setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0))
              } else if (e.key === "ArrowUp") {
                e.preventDefault()
                setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1))
              } else if (e.key === "ArrowLeft") {
                e.preventDefault()
                onBack?.()
              } else if (e.key === "Enter" && highlightedIndex >= 0) {
                const opt = filteredOptions[highlightedIndex]
                if (opt) {
                  onToggle(opt.value as T, currentValues.includes(opt.value))
                  if (!isMultiSelect) onBack?.()
                }
              }
            }}
          />
          <DropdownMenuSeparator />
        </>
      )}
      <ScrollArea className="max-h-64">
        {filteredOptions.length === 0 ? (
          <div className="text-muted-foreground py-2 text-center text-sm">{i18n.noResultsFound}</div>
        ) : (
          <DropdownMenuGroup>
            {filteredOptions.map((option, index) => (
              <DropdownMenuCheckboxItem
                key={String(option.value)}
                checked={currentValues.includes(option.value)}
                onCheckedChange={() => onToggle(option.value as T, currentValues.includes(option.value))}
              >
                <div className="flex items-center gap-2">
                  {option.icon}
                  <span className="truncate">{option.label}</span>
                </div>
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuGroup>
        )}
      </ScrollArea>
    </div>
  )
}
