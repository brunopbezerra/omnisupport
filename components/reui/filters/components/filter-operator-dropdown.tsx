'use client'

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Tick01Icon } from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useFilterContext } from "../context"
import { FilterFieldConfig, FilterOperator, FilterI18nConfig } from "../types"
import { createOperatorsFromI18n } from "../constants"

interface FilterOperatorDropdownProps<T = unknown> {
  field: FilterFieldConfig<T>
  operator: string
  values: T[]
  onChange: (operator: string) => void
}

const getOperatorsForField = <T = unknown,>(
  field: FilterFieldConfig<T>,
  values: T[],
  i18n: FilterI18nConfig
): FilterOperator[] => {
  if (field.operators) return field.operators
  const operators = createOperatorsFromI18n(i18n)
  let fieldType = field.type || "select"
  if (fieldType === "select" && values.length > 1) fieldType = "multiselect"
  if (fieldType === "multiselect" || field.type === "multiselect") return operators.multiselect
  return operators[fieldType] || operators.select
}

export function FilterOperatorDropdown<T = unknown>({
  field,
  operator,
  values,
  onChange,
}: FilterOperatorDropdownProps<T>) {
  const context = useFilterContext()
  const operators = getOperatorsForField(field, values, context.i18n)
  const operatorLabel = operators.find((op) => op.value === operator)?.label || context.i18n.helpers.formatOperator(operator)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size={context.size} className="text-muted-foreground hover:text-foreground">
          {operatorLabel}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-fit min-w-fit">
        {operators.map((op) => (
          <DropdownMenuItem
            key={op.value}
            onClick={() => onChange(op.value)}
            className="flex items-center justify-between"
          >
            <span>{op.label}</span>
            <HugeiconsIcon icon={Tick01Icon} className={cn("text-primary ms-auto", op.value === operator ? "opacity-100" : "opacity-0")} />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
