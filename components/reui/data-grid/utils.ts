import { CSSProperties } from "react"
import { Column } from "@tanstack/react-table"
import { cva } from "class-variance-authority"

export const headerCellSpacingVariants = cva("", {
  variants: {
    size: {
      dense: "px-2.5 h-9",
      default: "px-4",
    },
  },
  defaultVariants: {
    size: "default",
  },
})

export const bodyCellSpacingVariants = cva("", {
  variants: {
    size: {
      dense: "px-2.5 py-2",
      default: "px-4 py-2.5",
    },
  },
  defaultVariants: {
    size: "default",
  },
})

export function getPinningStyles<TData>(column: Column<TData>): CSSProperties {
  const isPinned = column.getIsPinned()
  return {
    left: isPinned === "left" ? `${column.getStart("left")}px` : undefined,
    right: isPinned === "right" ? `${column.getAfter("right")}px` : undefined,
    position: isPinned ? "sticky" : "relative",
    width: column.getSize(),
    zIndex: isPinned ? 1 : 0,
  }
}
