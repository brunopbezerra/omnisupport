export type FieldType = 'text' | 'number' | 'select' | 'radio' | 'checkbox' | 'textarea'
export type FormStatus = 'draft' | 'live'
export type LogicOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'greater_than'
  | 'less_than'

export type FieldMask = 'none' | 'phone_br' | 'date' | 'url'

export interface FormSettings {
  // Branding
  header_image_url?: string
  logo_url?: string
  primary_color?: string
  footer_html?: string
  // Thank you page
  thank_you_title?: string
  thank_you_text?: string
  thank_you_image_url?: string
  // CTA & redirect
  cta_label?: string
  redirect_url?: string
  redirect_delay?: number // seconds; 0 / undefined = disabled
}

export interface FieldOption {
  id: string
  label: string
}

export interface FieldMapping {
  target?: 'subject' | 'customer_email' | 'category' | null
  category_id?: string | null
}

export interface FormField {
  id: string
  form_id: string
  label: string
  type: FieldType
  required: boolean
  order_index: number
  options: FieldOption[]
  mapping: FieldMapping
  hidden: boolean
  default_value?: string | null
  mask?: FieldMask | null
}

export interface FormLogic {
  id: string
  form_id: string
  source_field_id: string
  target_field_id: string
  operator: LogicOperator
  value: string
}

export interface Form {
  id: string
  org_id: string
  title: string
  slug: string
  status: FormStatus
  settings: FormSettings
  created_at: string
}

export interface FormWithStats extends Form {
  ticket_count: number
}
