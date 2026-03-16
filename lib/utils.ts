import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Returns the WCAG-compliant foreground color for a given hex background.
 * Uses gamma-corrected relative luminance (WCAG 2.1).
 * Threshold 0.179 guarantees ≥ 4.5:1 contrast ratio.
 */
export function getContrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255

  const toLinear = (v: number) =>
    v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)

  const luminance =
    0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)

  return luminance > 0.179 ? '#09090b' : '#ffffff'
}

/**
 * Returns a hover variant of a hex color:
 * – darkens light colors by 10% lightness
 * – lightens dark colors by 12% lightness
 */
export function getPrimaryHover(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0, s = 0
  let l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }

  const isLight = getContrastColor(hex) === '#09090b'
  l = isLight ? Math.max(0, l - 0.1) : Math.min(1, l + 0.12)

  const hue2rgb = (p: number, q: number, t: number): number => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }

  let rOut: number, gOut: number, bOut: number
  if (s === 0) {
    rOut = gOut = bOut = l
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    rOut = hue2rgb(p, q, h + 1 / 3)
    gOut = hue2rgb(p, q, h)
    bOut = hue2rgb(p, q, h - 1 / 3)
  }

  return (
    '#' +
    [rOut, gOut, bOut]
      .map(v => Math.round(v * 255).toString(16).padStart(2, '0'))
      .join('')
  )
}
