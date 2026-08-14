import { useEffect } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { formatEuros } from './pricing'

/** Montant en euros avec tween de 300 ms à chaque changement (récap checkout). */
export default function AnimatedAmount({
  cents,
  className,
  forceDecimals = false,
}: {
  cents: number
  className?: string
  forceDecimals?: boolean
}) {
  const value = useMotionValue(cents)

  useEffect(() => {
    const controls = animate(value, cents, { duration: 0.3, ease: 'easeOut' })
    return () => controls.stop()
  }, [cents, value])

  const text = useTransform(value, (v) => formatEuros(Math.round(v), forceDecimals))

  return <motion.span className={className}>{text}</motion.span>
}
