'use client'

import Color from 'color'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  ColorPicker as KiboColorPicker,
  ColorPickerEyeDropper,
  ColorPickerFormat,
  ColorPickerHue,
  ColorPickerOutput,
  ColorPickerSelection,
} from '@/components/kibo-ui/color-picker'
import { cn } from '@/lib/utils'

interface ColorPickerContentProps {
  value: string
  onChange: (value: string) => void
}

/** Just the picker UI — use inside your own PopoverContent. */
export function ColorPickerContent({ value, onChange }: ColorPickerContentProps) {
  function handleChange(rgba: Parameters<typeof Color.rgb>[0]) {
    const arr = rgba as [number, number, number, number]
    const hex = Color.rgb(arr[0], arr[1], arr[2]).hex().toLowerCase()
    onChange(hex)
  }

  return (
    <KiboColorPicker value={value} onChange={handleChange}>
      <ColorPickerSelection className="h-36 w-full" />
      <ColorPickerHue />
      <div className="flex items-center gap-2">
        <ColorPickerEyeDropper />
        <ColorPickerFormat className="flex-1" />
        <ColorPickerOutput />
      </div>
    </KiboColorPicker>
  )
}

interface ColorPickerProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

/** Self-contained picker with a swatch+hex trigger button. */
export function ColorPicker({ value, onChange, className }: ColorPickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex h-9 w-40 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-mono shadow-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
            className
          )}
        >
          <span
            className="size-4 rounded-sm border border-border/60 shrink-0"
            style={{ background: value }}
          />
          {value}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-3 space-y-3" align="start">
        <ColorPickerContent value={value} onChange={onChange} />
      </PopoverContent>
    </Popover>
  )
}
