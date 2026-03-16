'use client'

import * as React from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Add01Icon, Cancel01Icon, Tick01Icon } from '@hugeicons/core-free-icons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase/client'
import { useTheme } from 'next-themes'
import type { Category } from '@/app/dashboard/data-table'

interface CategorySelectorProps {
  ticketId: string
  selectedCategories: Category[]
  onCategoriesChange: (categories: Category[]) => void
  overflowLimit?: number
}

export const getCategoryStyles = (color: string, theme: string | undefined) => {
  const match = color.match(/hsl\((\d+),/)
  const hue = match ? match[1] : '0'
  const isDark = theme === 'dark'

  return {
    backgroundColor: isDark ? `hsl(${hue}, 60%, 15%)` : `hsl(${hue}, 80%, 95%)`,
    color: isDark ? `hsl(${hue}, 70%, 75%)` : `hsl(${hue}, 80%, 30%)`,
    borderColor: isDark ? `hsl(${hue}, 60%, 25%)` : `hsl(${hue}, 80%, 85%)`,
  }
}

import { useCategories } from '@/hooks/use-categories'

export function CategorySelector({
  ticketId,
  selectedCategories,
  onCategoriesChange,
  overflowLimit,
}: CategorySelectorProps) {
  const { theme } = useTheme()
  const [open, setOpen] = React.useState(false)
  const [overflowOpen, setOverflowOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState('')
  const { categories: allCategories } = useCategories()
  const [isLoading, setIsLoading] = React.useState(false)
  const closeTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
    setOverflowOpen(true)
  }

  const handleMouseLeave = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setOverflowOpen(false)
    }, 200) // Small delay to allow moving mouse into popover
  }

  React.useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current)
    }
  }, [])

  const generateColor = () => {
    // Array of 12 vibrant hues that tend to work well with contrast adjustments
    const hues = [
      210, // Blue
      280, // Purple
      330, // Pink
      10,  // Red
      30,  // Orange
      45,  // Amber
      80,  // Lime
      140, // Emerald
      170, // Teal
      190, // Cyan
      230, // Indigo
      255, // Violet
    ]
    const hue = hues[Math.floor(Math.random() * hues.length)]
    // We store a slightly more saturated/dark version as the base
    return `hsl(${hue}, 75%, 45%)`
  }

  const handleCreateCategory = async () => {
    if (!inputValue.trim()) return

    setIsLoading(true)
    try {
      const color = generateColor()
      const { data, error } = await supabase
        .from('categories')
        .insert([{ name: inputValue, color }])
        .select()
        .single()

      if (error) throw error

      if (data) {
        handleToggleCategory(data)
      }
      setInputValue('')
    } catch (error) {
      console.error('Erro ao criar categoria:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleCategory = async (category: Category) => {
    const isSelected = selectedCategories.some(c => c.id === category.id)

    try {
      if (isSelected) {
        const { error } = await supabase
          .from('ticket_categories')
          .delete()
          .eq('ticket_id', ticketId)
          .eq('category_id', category.id)

        if (error) throw error
        onCategoriesChange(selectedCategories.filter(c => c.id !== category.id))
      } else {
        const { error } = await supabase
          .from('ticket_categories')
          .insert([{ ticket_id: ticketId, category_id: category.id }])

        if (error) throw error
        onCategoriesChange([...selectedCategories, category])
      }
    } catch (error) {
      console.error('Erro ao alternar categoria:', error)
    }
  }

  const displayLimit = overflowLimit ?? selectedCategories.length
  const displayCategories = selectedCategories.slice(0, displayLimit)
  const overflowCategories = selectedCategories.slice(displayLimit)

  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {displayCategories.map(category => {
        const styles = getCategoryStyles(category.color, theme)
        return (
          <Badge
            key={category.id}
            variant="secondary"
            className="pl-2 pr-1 h-6 gap-1 group transition-all duration-200 border cursor-default"
            style={styles}
            onClick={(e) => e.stopPropagation()}
          >
            {category.name}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleCategory(category);
              }}
              className="rounded-full hover:bg-foreground/10 p-0.5 transition-colors"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
            </button>
          </Badge>
        )
      })}

      {overflowCategories.length > 0 && (
        <Popover open={overflowOpen} onOpenChange={setOverflowOpen}>
          <PopoverTrigger asChild>
            <Badge
              variant="secondary"
              className="h-6 px-2 cursor-pointer hover:bg-secondary/20 transition-colors border-dashed"
              onClick={(e) => e.stopPropagation()}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              +{overflowCategories.length}
            </Badge>
          </PopoverTrigger>
          <PopoverContent 
            className="w-auto p-2" 
            align="start"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div className="flex flex-wrap gap-1.5 max-w-[240px]">
              {overflowCategories.map(category => {
                const styles = getCategoryStyles(category.color, theme)
                return (
                  <Badge
                    key={category.id}
                    variant="secondary"
                    className="pl-2 pr-1 h-6 gap-1 group transition-all duration-200 border cursor-default"
                    style={styles}
                  >
                    {category.name}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleCategory(category);
                      }}
                      className="rounded-full hover:bg-foreground/10 p-0.5 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
                    </button>
                  </Badge>
                )
              })}
            </div>
          </PopoverContent>
        </Popover>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-6 w-6 rounded-full p-0 border-dashed"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <HugeiconsIcon icon={Add01Icon} className="size-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[200px] p-0" 
          align="start"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Command>
            <CommandInput
              placeholder="Buscar ou criar..."
              value={inputValue}
              onValueChange={setInputValue}
              onClick={(e) => e.stopPropagation()}
            />
            <CommandList>
              <CommandEmpty>
                <div className="p-2 text-sm">
                  Nenhuma categoria encontrada.
                  <Button
                    variant="link"
                    className="p-0 h-auto font-normal ml-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCreateCategory();
                    }}
                    disabled={isLoading}
                  >
                    Criar "{inputValue}"
                  </Button>
                </div>
              </CommandEmpty>
              <CommandGroup heading="Categorias">
                {allCategories.map(category => {
                  const isSelected = selectedCategories.some(c => c.id === category.id)
                  return (
                    <CommandItem
                      key={category.id}
                      onSelect={() => handleToggleCategory(category)}
                      className="flex items-center justify-between"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="size-2 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        {category.name}
                      </div>
                      {isSelected && <HugeiconsIcon icon={Tick01Icon} className="size-3.5" />}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
