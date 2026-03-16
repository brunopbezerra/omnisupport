'use client'

import * as React from "react"
import { createContext, useContext } from "react"
import { FilterI18nConfig } from "./types"
import { DEFAULT_I18N } from "./constants"

export interface FilterContextValue {
  variant: "solid" | "default"
  size: "sm" | "default" | "lg"
  radius: "default" | "full"
  i18n: FilterI18nConfig
  className?: string
  showSearchInput?: boolean
  trigger?: React.ReactNode
  allowMultiple?: boolean
}

export const FilterContext = createContext<FilterContextValue>({
  variant: "default",
  size: "default",
  radius: "default",
  i18n: DEFAULT_I18N,
  className: undefined,
  showSearchInput: true,
  trigger: undefined,
  allowMultiple: true,
})

export const useFilterContext = () => useContext(FilterContext)
