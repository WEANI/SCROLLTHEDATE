import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react'
import { Check, Copy, Download, Mail, MessageCircle, Phone } from 'lucide-react'

// ---------------------------------------------------------------------------
// QrShare — QR du faire-part + copie du lien + kit de partage
// (WhatsApp / SMS / email, message pré-rempli éditable).
// ---------------------------------------------------------------------------

export default function QrShare({
  url,
  shareMessage,
  onMessageChange,
}: {
  url: string
  shareMessage: string
  onMessageChange?: (value: string) => void
}) {
  const [copied, setCopied] = useState(false)
  const canvasWrapRef = useRef<HTMLDivElement>(null)
  const svgWrapRef = useRef<HTMLDivElement>(null)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const input = document.createElement('input')
      input.value = url
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      input.remove()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadPng = () => {
    const canvas = canvasWrapRef.current?.querySelector('canvas')
    if (!canvas) return
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = 'faire-part-qr.png'
    a.click()
  }

  const downloadSvg = () => {
    const svg = svgWrapRef.current?.querySelector('svg')
    if (!svg) return
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], {
      type: 'image/svg+xml',
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'faire-part-qr.svg'
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  const encoded = encodeURIComponent(shareMessage)
  const whatsappHref = `https://wa.me/?text=${encoded}`
  const smsHref = `sms:?&body=${encoded}`
  const mailHref = `mailto:?subject=${encodeURIComponent('Notre faire-part')}&body=${encoded}`

  return (
    <div className="flex flex-col gap-5">
      {/* URL + copier */}
      <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-100/60 py-2 pl-4 pr-2">
        <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-ink">{url}</span>
        <button
          type="button"
          onClick={() => void copy()}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-anthracite-800 px-3 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-anthracite-700"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? 'Lien copié' : 'Copier'}
        </button>
      </div>

      <div className="flex flex-wrap items-start gap-6">
        {/* QR */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center gap-3"
        >
          <div ref={canvasWrapRef} className="rounded-xl border border-neutral-200 bg-white p-3">
            <QRCodeCanvas value={url} size={132} fgColor="#1B1B1E" bgColor="#FFFFFF" level="M" />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={downloadPng}
              className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1.5 text-[11.5px] font-medium text-ink transition-colors hover:bg-neutral-100"
            >
              <Download size={12} /> PNG
            </button>
            <button
              type="button"
              onClick={downloadSvg}
              className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1.5 text-[11.5px] font-medium text-ink transition-colors hover:bg-neutral-100"
            >
              <Download size={12} /> SVG
            </button>
          </div>
          {/* SVG caché pour l'export vectoriel */}
          <div ref={svgWrapRef} className="hidden" aria-hidden="true">
            <QRCodeSVG value={url} size={512} fgColor="#1B1B1E" bgColor="#FFFFFF" level="M" />
          </div>
        </motion.div>

        {/* Kit de partage */}
        <div className="flex min-w-56 flex-1 flex-col gap-3">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
            Kit de partage
          </p>
          {onMessageChange ? (
            <textarea
              value={shareMessage}
              onChange={(e) => onMessageChange(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-xl border border-neutral-200 bg-white px-3 py-2 text-[13px] text-ink outline-none transition-colors focus:border-terracotta-500"
            />
          ) : (
            <p className="rounded-xl bg-neutral-100/60 px-3 py-2 text-[13px] italic text-neutral-500">
              « {shareMessage} »
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-terracotta-500 px-4 py-2 text-[12.5px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-terracotta-400"
            >
              <MessageCircle size={14} /> WhatsApp
            </a>
            <a
              href={smsHref}
              className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-4 py-2 text-[12.5px] font-medium text-ink transition-colors hover:bg-neutral-100"
            >
              <Phone size={14} /> SMS
            </a>
            <a
              href={mailHref}
              className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-4 py-2 text-[12.5px] font-medium text-ink transition-colors hover:bg-neutral-100"
            >
              <Mail size={14} /> Email
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
