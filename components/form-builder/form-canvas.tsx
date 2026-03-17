'use client'

import { useId } from 'react'
import {
  DndContext,
  closestCenter,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { SortableFieldCard } from './sortable-field-card'
import type { FormField } from '@/types/forms'

interface Props {
  fields: FormField[]
  selectedFieldId: string | null
  onSelect: (id: string) => void
  onRemove: (id: string) => void
  onReorder: (activeId: string, overId: string) => void
}

export function FormCanvas({ fields, selectedFieldId, onSelect, onRemove, onReorder }: Props) {
  const id = useId()

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor)
  )

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (over && active.id !== over.id) {
      onReorder(active.id as string, over.id as string)
    }
  }

  return (
    <DndContext
      id={id}
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {fields.map(f => (
            <SortableFieldCard
              key={f.id}
              field={f}
              isSelected={f.id === selectedFieldId}
              onSelect={onSelect}
              onRemove={onRemove}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
