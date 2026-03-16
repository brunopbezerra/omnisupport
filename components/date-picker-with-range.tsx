"use client"

import * as React from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerWithRangeProps {
  className?: string
  values: string[]
  onChange: (values: string[]) => void
  isRange?: boolean
}

export function DatePickerWithRange({
  className,
  values,
  onChange,
  isRange = true,
}: DatePickerWithRangeProps) {
  const dateRange: DateRange | undefined = isRange ? {
    from: values[0] ? new Date(values[0]) : undefined,
    to: values[1] ? new Date(values[1]) : undefined,
  } : undefined

  const singleDate = !isRange && values[0] ? new Date(values[0]) : undefined

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            size="sm"
            className={cn(
              "h-7 justify-start text-left font-normal border-none bg-transparent hover:bg-accent/50",
              !values[0] && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-3.5 w-3.5" />
            {isRange ? (
              dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "dd/MM/yy", { locale: ptBR })} -{" "}
                    {format(dateRange.to, "dd/MM/yy", { locale: ptBR })}
                  </>
                ) : (
                  format(dateRange.from, "dd/MM/yy", { locale: ptBR })
                )
              ) : (
                <span>Selecionar datas</span>
              )
            ) : (
              singleDate ? format(singleDate, "dd/MM/yy", { locale: ptBR }) : <span>Selecionar data</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          {isRange ? (
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={(range) => {
                const newValues = [
                  range?.from ? format(range.from, "yyyy-MM-dd") : "",
                  range?.to ? format(range.to, "yyyy-MM-dd") : "",
                ]
                onChange(newValues)
              }}
              numberOfMonths={2}
              locale={ptBR}
            />
          ) : (
            <Calendar
              mode="single"
              selected={singleDate}
              onSelect={(date) => {
                onChange([date ? format(date, "yyyy-MM-dd") : ""])
              }}
              initialFocus
              locale={ptBR}
            />
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}
