'use client'

import * as React from "react"
import { useState, useRef, useEffect, useMemo, useId } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ButtonGroupText } from "@/components/ui/button-group"
import { useFilterContext } from "../context"
import { FilterFieldConfig, FilterOption } from "../types"
import { FilterInput } from "./filter-input"

interface SelectOptionsPopoverProps<T = unknown> {
  field: FilterFieldConfig<T>
  values: T[]
  onChange: (values: T[]) => void
  onClose?: () => void
  inline?: boolean
}

function SelectOptionsPopover<T = unknown>({
  field,
  values,
  onChange,
  onClose,
  inline = false,
}: SelectOptionsPopoverProps<T>) {
  const [open, setOpen] = useState(false)
  const [searchInput, setSearchInput] = useState("")
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const context = useFilterContext()
  const baseId = useId()

  useEffect(() => {
    setHighlightedIndex(-1)
  }, [searchInput, open])

  const isMultiSelect = field.type === "multiselect" || values.length > 1
  const effectiveValues = (field.value !== undefined ? (field.value as T[]) : values) || []
  const selectedOptions = field.options?.filter((opt) => effectiveValues.includes(opt.value)) || []
  const unselectedOptions = field.options?.filter((opt) => !effectiveValues.includes(opt.value)) || []
  const filteredUnselectedOptions = unselectedOptions.filter((opt) =>
    opt.label.toLowerCase().includes(searchInput.toLowerCase())
  )
  const allFilteredOptions = useMemo(() => [...selectedOptions, ...filteredUnselectedOptions], [selectedOptions, filteredUnselectedOptions])

  const handleClose = () => {
    setOpen(false)
    onClose?.()
  }

  const renderMenuContent = () => (
    <>
      {field.searchable !== false && (
        <>
          <Input
            ref={inputRef}
            placeholder={context.i18n.placeholders.searchField(field.label || "")}
            className="border-0 bg-transparent! px-2 text-sm shadow-none focus-visible:ring-0"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault()
                setHighlightedIndex((prev) => (prev < allFilteredOptions.length - 1 ? prev + 1 : 0))
              } else if (e.key === "ArrowUp") {
                e.preventDefault()
                setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : allFilteredOptions.length - 1))
              } else if (e.key === "Enter" && highlightedIndex >= 0) {
                const opt = allFilteredOptions[highlightedIndex]
                if (opt) {
                  const isSelected = effectiveValues.includes(opt.value as T)
                  const next = isSelected 
                    ? effectiveValues.filter(v => v !== opt.value)
                    : isMultiSelect ? [...effectiveValues, opt.value] : [opt.value]
                  onChange(next as T[])
                  if (!isMultiSelect) handleClose()
                }
              }
            }}
          />
          <DropdownMenuSeparator />
        </>
      )}
      <ScrollArea className="max-h-64">
        <DropdownMenuGroup className="px-1">
          {allFilteredOptions.map((option, index) => (
            <DropdownMenuCheckboxItem
              key={String(option.value)}
              checked={effectiveValues.includes(option.value as T)}
              onCheckedChange={() => {
                const isSelected = effectiveValues.includes(option.value as T)
                const next = isSelected 
                  ? effectiveValues.filter(v => v !== option.value)
                  : isMultiSelect ? [...effectiveValues, option.value] : [option.value]
                onChange(next as T[])
                if (!isMultiSelect) handleClose()
              }}
            >
              <div className="flex items-center gap-2">
                {option.icon}
                <span className="truncate">{option.label}</span>
              </div>
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
      </ScrollArea>
    </>
  )

  if (inline) return <div className="w-full">{renderMenuContent()}</div>

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size={context.size}>
          {selectedOptions.length === 0 ? context.i18n.select : (selectedOptions.length === 1 ? selectedOptions[0].label : `${selectedOptions.length} ${context.i18n.selectedCount}`)}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[200px] px-0">
        {renderMenuContent()}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function FilterValueSelector<T = unknown>({
  field,
  values,
  onChange,
  operator,
  autoFocus,
}: {
  field: FilterFieldConfig<T>
  values: T[]
  onChange: (values: T[]) => void
  operator: string
  autoFocus?: boolean
}) {
  if (operator === "empty" || operator === "not_empty") return null
  if (field.customRenderer) {
    return (
      <ButtonGroupText className="hover:bg-accent text-start whitespace-nowrap outline-hidden">
        {field.customRenderer({ field, values, onChange, operator })}
      </ButtonGroupText>
    )
  }
  if (field.type === "text") {
    return (
      <FilterInput
        type="text"
        value={(values[0] as string) || ""}
        onChange={(e) => onChange([e.target.value] as T[])}
        placeholder={field.placeholder}
        field={field}
        autoFocus={autoFocus}
      />
    )
  }
  return <SelectOptionsPopover field={field} values={values} onChange={onChange} />
}
