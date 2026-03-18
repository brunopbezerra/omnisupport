'use client'

import * as React from 'react'
import { format, subDays, startOfMonth, endOfMonth, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { HugeiconsIcon } from '@hugeicons/react'
import { Calendar03Icon } from '@hugeicons/core-free-icons'
import { type DateRange } from 'react-day-picker'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface DatePickerWithRangeProps {
  className?: string
  date: DateRange | undefined
  setDate: (date: DateRange | undefined) => void
}

export function DatePickerWithRange({
  className,
  date,
  setDate,
}: DatePickerWithRangeProps) {
  const [selectedPreset, setSelectedPreset] = React.useState<string>('30d')

  const presets = React.useMemo(() => [
    { label: 'Últimos 7 dias', value: '7d', getRange: () => ({ from: subDays(new Date(), 7), to: new Date() }) },
    { label: 'Últimos 30 dias', value: '30d', getRange: () => ({ from: subDays(new Date(), 30), to: new Date() }) },
    { label: 'Últimos 90 dias', value: '90d', getRange: () => ({ from: subDays(new Date(), 90), to: new Date() }) },
    { label: 'Mês atual', value: 'mtd', getRange: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
    { label: 'Personalizado', value: 'custom', getRange: () => undefined },
  ], [])

  const onPresetChange = (value: string) => {
    setSelectedPreset(value)
    const preset = presets.find((p) => p.value === value)
    if (preset && value !== 'custom') {
      const range = preset.getRange()
      setDate(range)
    }
  }

  // Effect to sync select value if date is changed externally
  React.useEffect(() => {
    if (!date?.from || !date?.to) {
      setSelectedPreset('custom')
      return
    }

    const matchingPreset = presets.find((p) => {
      const range = p.getRange()
      if (!range || !range.from || !range.to) return false
      return isSameDay(range.from, date.from!) && isSameDay(range.to, date.to!)
    })

    if (matchingPreset) {
      setSelectedPreset(matchingPreset.value)
    } else {
      setSelectedPreset('custom')
    }
  }, [date, presets])

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={'outline'}
            className={cn(
              'h-8 w-auto justify-start text-left font-normal rounded-full px-3 text-xs gap-2 border-muted-foreground/20 hover:border-primary/50 transition-colors',
              !date && 'text-muted-foreground'
            )}
          >
            <HugeiconsIcon icon={Calendar03Icon} className="size-3.5" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, 'dd LLL', { locale: ptBR })} -{' '}
                  {format(date.to, 'dd LLL, yyyy', { locale: ptBR })}
                </>
              ) : (
                format(date.from, 'dd LLL, yyyy', { locale: ptBR })
              )
            ) : (
              <span>Selecione uma data</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 rounded-2xl overflow-hidden border-muted-foreground/10 shadow-2xl" align="end">
          <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x">
            <div className="p-4 bg-muted/5 w-full md:w-48">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 px-3">
                Período
              </div>
              <div className="flex flex-col gap-1">
                {presets.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => onPresetChange(preset.value)}
                    className={cn(
                      'text-left px-3 py-2 text-xs rounded-lg transition-all',
                      selectedPreset === preset.value
                        ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                        : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-2 bg-background">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={(range) => {
                  setDate(range)
                  setSelectedPreset('custom')
                }}
                numberOfMonths={2}
                locale={ptBR}
                className="rounded-xl border-0"
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
