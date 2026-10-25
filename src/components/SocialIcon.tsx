import { Facebook, Instagram, Youtube, type LucideProps } from 'lucide-react'

/**
 * Icône d'un réseau social, à partir de son `id` (cf. SOCIAL_PROFILES dans
 * contracts/brand.ts). Instagram, Facebook et YouTube viennent de lucide-react ;
 * TikTok et Pinterest n'y existent pas : ils sont dessinés ici dans le même
 * style (24×24, trait arrondi) pour que les cinq se ressemblent.
 */
function TikTok({ size = 24, strokeWidth = 1.75, ...props }: LucideProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 7.917v4.034a9.948 9.948 0 0 1-5-1.951v4.5a6.5 6.5 0 1 1-8-6.326v4.326a2.5 2.5 0 1 0 4 2v-11.5h4.083a6.005 6.005 0 0 0 4.917 4.917z" />
    </svg>
  )
}

function Pinterest({ size = 24, strokeWidth = 1.75, ...props }: LucideProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M9.2 20.5l1.9-7.6" />
      <path d="M9.6 12.2c-.3-3.1 3.1-4.6 4.9-3.1 1.5 1.3.9 4.2-.9 5.2-1.3.7-2.3-.1-2.5-1.1" />
    </svg>
  )
}

const ICONS: Record<string, (props: LucideProps) => React.ReactElement> = {
  instagram: (p) => <Instagram {...p} />,
  facebook: (p) => <Facebook {...p} />,
  youtube: (p) => <Youtube {...p} />,
  tiktok: TikTok,
  pinterest: Pinterest,
}

export default function SocialIcon({ id, ...props }: { id: string } & LucideProps) {
  const Icon = ICONS[id]
  return Icon ? <Icon aria-hidden {...props} /> : null
}
