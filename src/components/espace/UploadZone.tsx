import { useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { motion } from 'framer-motion'
import { CloudUpload } from 'lucide-react'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// UploadZone — drag & drop + parcourir. Lit les fichiers en dataURI et les
// transmet au parent (media.addMedia). Limite 8 Mo par fichier (V1 dataURI).
// ---------------------------------------------------------------------------

const MAX_FILE_BYTES = 8 * 1024 * 1024

export interface PendingUpload {
  key: string
  filename: string
  type: 'photo' | 'video'
  previewUrl: string
  progress: number
  error?: string
}

export default function UploadZone({
  onFiles,
  disabled,
}: {
  /** Reçoit les fichiers validés (dataURI). Le parent gère la mutation serveur. */
  onFiles: (files: { filename: string; type: 'photo' | 'video'; dataUri: string; previewUrl: string }[]) => void
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const readFiles = async (list: FileList | File[]) => {
    setError(null)
    const accepted: { filename: string; type: 'photo' | 'video'; dataUri: string; previewUrl: string }[] = []
    const rejected: string[] = []
    for (const file of Array.from(list)) {
      const isImage = file.type.startsWith('image/')
      const isVideo = file.type.startsWith('video/')
      if (!isImage && !isVideo) {
        rejected.push(file.name)
        continue
      }
      if (file.size > MAX_FILE_BYTES) {
        rejected.push(`${file.name} (> 8 Mo)`)
        continue
      }
      const dataUri = await new Promise<string>((resolve, rejectPromise) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(String(reader.result))
        reader.onerror = () => rejectPromise(new Error('read failed'))
        reader.readAsDataURL(file)
      })
      accepted.push({
        filename: file.name,
        type: isImage ? 'photo' : 'video',
        dataUri,
        previewUrl: isImage ? dataUri : '',
      })
    }
    if (rejected.length > 0) {
      setError(`Fichiers ignorés : ${rejected.join(', ')}`)
    }
    if (accepted.length > 0) onFiles(accepted)
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (disabled) return
    void readFiles(e.dataTransfer.files)
  }

  return (
    <div>
      <motion.button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled) setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        animate={{ scale: dragOver ? 1.02 : 1 }}
        transition={{ duration: 0.2 }}
        className={cn(
          'flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors',
          dragOver ? 'border-terracotta-500 bg-terracotta-500/5' : 'border-neutral-200 bg-white',
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-terracotta-400',
        )}
      >
        <span
          className={cn(
            'flex h-14 w-14 items-center justify-center rounded-full transition-colors',
            dragOver ? 'bg-terracotta-500 text-white' : 'bg-neutral-100 text-terracotta-500',
          )}
        >
          <CloudUpload size={24} />
        </span>
        <span className="text-[14px] font-medium text-ink">
          Glissez vos fichiers ou <span className="text-terracotta-500 underline underline-offset-4">parcourez</span>
        </span>
        <span className="text-[12px] text-neutral-500">
          Photos & vidéos — 8 Mo max par fichier
        </span>
      </motion.button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) void readFiles(e.target.files)
          e.target.value = ''
        }}
      />
      {error && <p className="mt-2 text-[12.5px] font-medium text-error">{error}</p>}
    </div>
  )
}
