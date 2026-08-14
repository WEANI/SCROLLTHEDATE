import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Copy, Mail, MessageCircle } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

const SHARE_TEXT = 'Anna & Théo se marient le 20 juin 2026 — découvrez leur faire-part :'

/** Section 8 — Pied du faire-part : QR + partage + signature Félicity. */
export default function DemoFooterSection() {
  const shareUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/demo` : 'https://felicity.fr/demo'
  const [copied, setCopied] = useState(false)

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard indisponible : sélection manuelle via prompt silencieux impossible — ignorer
    }
  }

  const buttons = [
    {
      label: 'WhatsApp',
      icon: MessageCircle,
      href: `https://wa.me/?text=${encodeURIComponent(`${SHARE_TEXT} ${shareUrl}`)}`,
    },
    {
      label: 'SMS',
      icon: Mail,
      href: `sms:?&body=${encodeURIComponent(`${SHARE_TEXT} ${shareUrl}`)}`,
    },
  ]

  return (
    <section className="grain relative overflow-hidden bg-anthracite-950 py-28 lg:py-36" aria-label="Partager le faire-part">
      <div className="mx-auto flex max-w-[640px] flex-col items-center px-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-20%' }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-2xl bg-white p-5 shadow-[0_16px_48px_rgba(0,0,0,0.4)]"
        >
          <QRCodeSVG value={shareUrl} size={148} fgColor="#1B1B1E" bgColor="#FFFFFF" level="M" />
        </motion.div>

        <h2 className="font-display mt-10 text-[clamp(1.8rem,4vw,2.6rem)] font-light tracking-[-0.015em] text-white">
          Partagez ce <em className="italic text-terracotta-300">faire-part</em>
        </h2>
        <p className="mt-3 text-[14px] leading-[1.65] text-white/55">
          Envoyez le lien à ceux qui ne l'auraient pas encore reçu.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {buttons.map((btn) => (
            <a
              key={btn.label}
              href={btn.href}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-[12px] font-semibold uppercase tracking-[0.1em] text-white/85 transition-all hover:-translate-y-0.5 hover:border-terracotta-400 hover:text-white"
            >
              <btn.icon size={15} aria-hidden />
              {btn.label}
            </a>
          ))}
          <button
            type="button"
            onClick={copyLink}
            className="flex items-center gap-2 rounded-full bg-terracotta-500 px-6 py-3 text-[12px] font-semibold uppercase tracking-[0.1em] text-white transition-all hover:-translate-y-0.5 hover:bg-terracotta-400 active:scale-[0.97]"
          >
            {copied ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />}
            {copied ? 'Lien copié' : 'Copier le lien'}
          </button>
        </div>

        <div className="mt-16 w-full border-t border-anthracite-700/60 pt-8">
          <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-white/40">
            Créé avec{' '}
            <span className="font-display normal-case italic tracking-normal text-terracotta-300">Félicity</span>
            {' '}— félicity.fr
          </p>
        </div>
      </div>
    </section>
  )
}
