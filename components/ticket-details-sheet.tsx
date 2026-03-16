'use client'

import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet'
import type { Ticket } from '@/app/dashboard/data-table'
import { TicketDetailsContent } from './ticket-details-content'

interface TicketDetailsSheetProps {
  ticket: Ticket | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TicketDetailsSheet({ ticket, open, onOpenChange }: TicketDetailsSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[600px] flex flex-col sm:p-8">
        <TicketDetailsContent 
          ticket={ticket} 
          onClose={() => onOpenChange(false)} 
        />
      </SheetContent>
    </Sheet>
  )
}
