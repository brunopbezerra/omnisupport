'use client'

import { useCallback, useRef, useState } from 'react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { HugeiconsIcon } from '@hugeicons/react'
import { Loading03Icon, CloudUploadIcon } from '@hugeicons/core-free-icons'

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const MAX_BYTES = 2 * 1024 * 1024

interface ImageCropUploaderProps {
  value: string | null
  onChange: (url: string) => void
  /** Storage path without extension, e.g. "{org_id}/logo" or "{org_id}/avatars/{user_id}" */
  storagePath: string
  label: string
  shape?: 'round' | 'square'
  /** Fallback text shown in the preview when no image is set */
  fallback?: string
}

/** Crops the source image to the given pixel area and returns a WebP Blob. */
async function getCroppedBlob(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = pixelCrop.width
      canvas.height = pixelCrop.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height,
      )
      canvas.toBlob(
        blob => {
          if (blob) resolve(blob)
          else reject(new Error('Canvas toBlob failed'))
        },
        'image/webp',
        0.9,
      )
    }
    image.onerror = reject
    image.src = imageSrc
  })
}

export function ImageCropUploader({
  value,
  onChange,
  storagePath,
  label,
  shape = 'round',
  fallback = '?',
}: ImageCropUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  // Crop modal state
  const [rawDataUrl, setRawDataUrl] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)

  // Upload state
  const [uploading, setUploading] = useState(false)

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels)
  }, [])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    // Reset input so the same file can be re-selected
    e.target.value = ''

    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Formato inválido. Use PNG, JPG ou WEBP.')
      return
    }
    if (file.size > MAX_BYTES) {
      toast.error('Imagem muito grande. Máximo 2 MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setRawDataUrl(reader.result as string)
      setCrop({ x: 0, y: 0 })
      setZoom(1)
    }
    reader.readAsDataURL(file)
  }

  async function handleCropSave() {
    if (!rawDataUrl || !croppedAreaPixels) return
    setUploading(true)
    try {
      const blob = await getCroppedBlob(rawDataUrl, croppedAreaPixels)
      const path = `${storagePath}.webp`

      const { error: uploadError } = await supabase.storage
        .from('workspaces')
        .upload(path, blob, { upsert: true, contentType: 'image/webp' })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('workspaces').getPublicUrl(path)
      // Append cache-buster so browser fetches the new image immediately
      const publicUrl = `${data.publicUrl}?t=${Date.now()}`

      onChange(publicUrl)
      setRawDataUrl(null)
      toast.success('Imagem salva com sucesso.')
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao enviar imagem.')
    } finally {
      setUploading(false)
    }
  }

  function handleCancel() {
    setRawDataUrl(null)
  }

  const isRound = shape === 'round'

  return (
    <div className="flex items-center gap-4">
      {/* Preview */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative shrink-0 group focus-visible:outline-none"
        aria-label={`Alterar ${label}`}
      >
        {isRound ? (
          <Avatar className="size-16">
            <AvatarImage src={value ?? ''} alt={label} />
            <AvatarFallback className="text-lg">{fallback}</AvatarFallback>
          </Avatar>
        ) : (
          <div className="size-16 rounded-lg overflow-hidden bg-muted border border-border flex items-center justify-center">
            {value ? (
              <img src={value} alt={label} className="size-full object-cover" />
            ) : (
              <HugeiconsIcon icon={CloudUploadIcon} className="size-6 text-muted-foreground" />
            )}
          </div>
        )}
        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
          <HugeiconsIcon icon={CloudUploadIcon} className="size-4 text-white" />
        </div>
      </button>

      {/* Label + trigger button */}
      <div className="space-y-1">
        <Label className="text-sm">{label}</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
        >
          Alterar imagem
        </Button>
        <p className="text-xs text-muted-foreground">PNG, JPG ou WEBP · máx 2 MB</p>
      </div>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Crop Dialog */}
      <Dialog open={!!rawDataUrl} onOpenChange={open => { if (!open) handleCancel() }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Recortar imagem</DialogTitle>
          </DialogHeader>

          {rawDataUrl && (
            <div className="space-y-4">
              {/* Crop area */}
              <div className="relative h-72 w-full bg-muted rounded-lg overflow-hidden">
                <Cropper
                  image={rawDataUrl}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape={isRound ? 'round' : 'rect'}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              </div>

              {/* Zoom slider */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Zoom</Label>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={zoom}
                  onChange={e => setZoom(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleCancel} disabled={uploading}>
              Cancelar
            </Button>
            <Button onClick={handleCropSave} disabled={uploading}>
              {uploading ? (
                <>
                  <HugeiconsIcon icon={Loading03Icon} className="size-4 animate-spin" />
                  Salvando…
                </>
              ) : (
                'Recortar e salvar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
