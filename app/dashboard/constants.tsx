'use client'

import * as React from 'react'
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Tick02Icon,
  HourglassIcon,
  CustomerService01Icon,
  Mail01Icon,
  LegalDocumentIcon,
  HashtagIcon,
  LabelIcon,
  UserIcon,
  Layers01Icon,
  Calendar03Icon,
} from "@hugeicons/core-free-icons"
import type { FilterFieldConfig, FilterI18nConfig } from '@/components/reui/filters'
import { DatePickerWithRange } from '@/components/date-picker-with-range'

export const PT_BR_I18N: FilterI18nConfig = {
  addFilter: "Filtrar",
  searchFields: "Buscar filtros...",
  noFieldsFound: "Nenhum filtro encontrado.",
  noResultsFound: "Nenhum resultado encontrado.",
  select: "Selecionar...",
  true: "Verdadeiro",
  false: "Falso",
  min: "Mín",
  max: "Máx",
  to: "até",
  typeAndPressEnter: "Digite e pressione Enter",
  selected: "selecionado",
  selectedCount: "selecionados",
  percent: "%",
  defaultCurrency: "R$",
  defaultColor: "#000000",
  addFilterTitle: "Adicionar filtro",
  operators: {
    is: "é",
    isNot: "não é",
    isAnyOf: "é um de",
    isNotAnyOf: "não é um de",
    includesAll: "inclui todos",
    excludesAll: "exclui todos",
    before: "antes de",
    after: "depois de",
    between: "entre",
    notBetween: "não entre",
    contains: "contém",
    notContains: "não contém",
    startsWith: "começa com",
    endsWith: "termina com",
    isExactly: "é exatamente",
    equals: "igual a",
    notEquals: "diferente de",
    greaterThan: "maior que",
    lessThan: "menor que",
    overlaps: "sobrepõe",
    includes: "inclui",
    excludes: "exclui",
    includesAllOf: "inclui todos de",
    includesAnyOf: "inclui qualquer um de",
    empty: "está vazio",
    notEmpty: "não está vazio",
  },
  placeholders: {
    enterField: (fieldType) => `Digite ${fieldType}...`,
    selectField: "Selecionar...",
    searchField: (fieldName) => `Buscar ${fieldName.toLowerCase()}...`,
    enterKey: "Digite a chave...",
    enterValue: "Digite o valor...",
  },
  helpers: {
    formatOperator: (operator) => operator.replace(/_/g, " "),
  },
  validation: {
    invalidEmail: "Formato de e-mail inválido",
    invalidUrl: "Formato de URL inválido",
    invalidTel: "Formato de telefone inválido",
    invalid: "Formato inválido",
  },
}

export const filterFields: FilterFieldConfig[] = [
  {
    key: "ref_token",
    label: "Ticket ID",
    icon: <HugeiconsIcon icon={HashtagIcon} className="size-3.5" />,
    type: "text",
    placeholder: "Ticket ID...",
    defaultOperator: "contains",
  },
  {
    key: "customer_email",
    label: "Cliente",
    icon: <HugeiconsIcon icon={Mail01Icon} className="size-3.5" />,
    type: "text",
    placeholder: "cliente@exemplo.com",
    defaultOperator: "contains",
  },
  {
    key: "subject",
    label: "Assunto",
    icon: <HugeiconsIcon icon={LegalDocumentIcon} className="size-3.5" />,
    type: "text",
    placeholder: "Assunto...",
    defaultOperator: "contains",
  },
  {
    key: "categories",
    label: "Categorias",
    icon: <HugeiconsIcon icon={Layers01Icon} className="size-3.5" />,
    type: "select",
    options: [], // To be populated
  },
  {
    key: "assigned_to",
    label: "Responsável",
    icon: <HugeiconsIcon icon={UserIcon} className="size-3.5" />,
    type: "select",
    options: [], // To be populated
  },
  {
    key: "status",
    label: "Status",
    icon: <HugeiconsIcon icon={LabelIcon} className="size-3.5" />,
    type: "select",
    options: [
      { value: "open", label: "Aberto", icon: <HugeiconsIcon icon={HourglassIcon} className="size-3 text-warning" /> },
      { value: "in_progress", label: "Em andamento", icon: <HugeiconsIcon icon={CustomerService01Icon} className="size-3 text-info" /> },
      { value: "resolved", label: "Resolvido", icon: <HugeiconsIcon icon={Tick02Icon} className="size-3 text-success" /> },
    ],
  },
  {
    key: "created_at",
    label: "Data de criação",
    icon: <HugeiconsIcon icon={Calendar03Icon} className="size-3.5" />,
    type: "custom",
    defaultOperator: "between",
    customRenderer: ({ values, onChange, operator }) => {
      const isRange = operator === "between" || operator === "not_between"
      return (
        <DatePickerWithRange 
          values={values as string[]} 
          onChange={onChange as any} 
          isRange={isRange} 
        />
      )
    }
  },
]

export const statusMap: Record<string, { label: string; icon: React.ReactNode; variant: 'default' | 'secondary' | 'outline' | 'warning-muted' | 'success-muted' | 'info-muted' }> = {
  open: { label: 'Aberto', icon: <HugeiconsIcon icon={HourglassIcon} className="size-3" />, variant: 'warning-muted' },
  in_progress: { label: 'Em andamento', icon: <HugeiconsIcon icon={CustomerService01Icon} className="size-3" />, variant: 'info-muted' },
  resolved: { label: 'Resolvido', icon: <HugeiconsIcon icon={Tick02Icon} className="size-3" />, variant: 'success-muted' },
}
