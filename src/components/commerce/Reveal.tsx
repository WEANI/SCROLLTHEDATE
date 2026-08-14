import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { EASE_EDITORIAL } from './motion'

/** Reveal standard des sections calmes : y 40px → 0, fade, trigger 20 % viewport. */
export function FadeUp({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  return (
    <motion.div
      className={className}
      initial={{ y: 40, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true, margin: '-20%' }}
      transition={{ duration: 0.9, ease: EASE_EDITORIAL, delay }}
    >
      {children}
    </motion.div>
  )
}

export interface HeadlineSegment {
  text: string
  /** Italique terracotta — pour les mots d'émotion. */
  accent?: boolean
}

/**
 * Reveal mot par mot (stagger 0.05 s, y 40px) pour les titres Fraunces.
 * Chaque mot est masqué dans un conteneur overflow-hidden.
 */
export function WordReveal({
  segments,
  className,
  delay = 0,
}: {
  segments: HeadlineSegment[]
  className?: string
  delay?: number
}) {
  const words = segments.flatMap((seg) =>
    seg.text
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => ({ w, accent: !!seg.accent })),
  )
  return (
    <motion.span
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-15%' }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: delay } } }}
    >
      {words.map((word, i) => (
        <span key={`${word.w}-${i}`} className="-mb-[0.12em] inline-block overflow-hidden pb-[0.12em] align-bottom">
          <motion.span
            className={cn('inline-block', word.accent && 'italic text-terracotta-300')}
            variants={{
              hidden: { y: '110%' },
              show: { y: '0%', transition: { duration: 0.7, ease: EASE_EDITORIAL } },
            }}
          >
            {word.w}
          </motion.span>
          {i < words.length - 1 ? <span aria-hidden>&nbsp;</span> : null}
        </span>
      ))}
    </motion.span>
  )
}
