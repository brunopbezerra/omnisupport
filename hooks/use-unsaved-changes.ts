'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Guards against navigating away with unsaved changes.
 *
 * - Blocks browser-level navigation (refresh, close tab, address bar) via beforeunload.
 * - Intercepts in-app link clicks (capture phase) and shows a confirm dialog.
 *
 * Returns dialog state + handlers to wire up an <AlertDialog>.
 */
export function useUnsavedChanges(isDirty: boolean) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pendingHref, setPendingHref] = useState<string | null>(null)

  // Browser close / refresh / address-bar navigation
  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  // In-app link clicks (intercept all <a href> in capture phase)
  useEffect(() => {
    if (!isDirty) return
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as Element).closest('a[href]') as HTMLAnchorElement | null
      if (!anchor) return
      // Skip external links and same-page anchors
      const url = new URL(anchor.href, window.location.origin)
      if (url.origin !== window.location.origin) return
      if (url.pathname === window.location.pathname) return
      e.preventDefault()
      e.stopPropagation()
      setPendingHref(url.pathname + url.search + url.hash)
      setOpen(true)
    }
    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [isDirty])

  function confirm() {
    setOpen(false)
    if (pendingHref) router.push(pendingHref)
  }

  function cancel() {
    setOpen(false)
    setPendingHref(null)
  }

  return { open, confirm, cancel }
}
