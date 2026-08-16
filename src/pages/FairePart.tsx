import { useEffect } from 'react'
import { Link, useParams } from 'react-router'
import { Loader2 } from 'lucide-react'
import { trpc } from '@/providers/trpc'
import PayloadSection from '@/components/faire-part/PayloadSection'
import PhotosSection from '@/components/faire-part/PhotosSection'
import ClosingSection from '@/components/faire-part/ClosingSection'
import HeroScrub from '@/components/hero-scrub/HeroScrub'
import { HERO_THEMES } from '@/components/hero-scrub/themes'
import type { HeroChapter } from '@/components/hero-scrub/types'

/**
 * Faire-part client — page publique dynamique, une par projet réel (par
 * opposition à `/demo` et `/faire-part/edwige-wilfried`, câblées en dur).
 * Alimentée par `projects.getPublicInvite` : vidéo hero (première version
 * livrée non filigranée) + réponses du questionnaire marquées "affiché sur
 * le faire-part". Hors du `Layout` public — pas de Navbar/Footer marketing
 * devant les invités, cf. FairePartEdwigeWilfried.
 */
export default function FairePart() {
  const { slug } = useParams<{ slug: string }>()
  const query = trpc.projects.getPublicInvite.useQuery(
    { slug: slug ?? '' },
    { enabled: !!slug, retry: false, refetchOnWindowFocus: false, staleTime: 60_000 },
  )

  const invite = query.data
  const theme = HERO_THEMES[(invite?.template as keyof typeof HERO_THEMES) ?? 'cinema'] ?? HERO_THEMES.cinema

  useEffect(() => {
    if (!invite) return
    document.title = invite.coupleNames ? `${invite.coupleNames} · Scroll The Date` : 'Scroll The Date'
    const meta = document.createElement('meta')
    meta.name = 'color-scheme'
    // Lu depuis le thème, jamais déduit de son id : "editorial" est clair
    // lui aussi, un test `id === 'minimal'` l'aurait déclaré sombre et
    // aurait rouvert l'inversion dark mode sur mobile.
    meta.content = theme.colorScheme === 'light' ? 'only light' : 'only dark'
    document.head.appendChild(meta)
    return () => {
      document.title = 'Scroll The Date'
      document.head.removeChild(meta)
    }
  }, [invite, theme.colorScheme])

  if (query.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-anthracite-950">
        <Loader2 className="animate-spin text-terracotta-500" size={28} />
      </div>
    )
  }

  // Pas de projet à ce slug, ou pas encore de vidéo livrée aux invités —
  // état neutre plutôt qu'une erreur (un lien peut circuler avant que tout
  // soit prêt).
  if (!invite) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-anthracite-950 px-6 text-center">
        <p className="font-display text-2xl italic text-white">Ce faire-part n'est pas encore disponible.</p>
        <p className="max-w-sm text-[14px] text-white/60">
          Le lien est peut-être arrivé un peu tôt — revenez un peu plus tard.
        </p>
        <Link to="/" className="mt-2 text-[13px] font-medium uppercase tracking-[0.1em] text-terracotta-400">
          Scroll The Date — accueil
        </Link>
      </div>
    )
  }

  const coupleNames = invite.coupleNames ?? 'Les mariés'
  // "Anna & Théo" → segments ["Anna", "&" (accent), "Théo"] pour le rendu du
  // hero ; si le format ne s'y prête pas (pas de " & "/" et " détecté), on
  // affiche le nom tel quel, sans accent — dégradé propre plutôt qu'un
  // découpage hasardeux.
  const nameParts = coupleNames.split(/\s+(&|et)\s+/i)
  const segments =
    nameParts.length === 3
      ? [{ text: nameParts[0] }, { text: nameParts[1], accent: true }, { text: nameParts[2] }]
      : [{ text: coupleNames }]
  const initials = nameParts.length === 3 ? `${nameParts[0][0]} & ${nameParts[2][0]}` : undefined

  const chapters: HeroChapter[] = [
    {
      id: 0,
      kind: 'text',
      from: 0.9,
      to: 1,
      eyebrow: initials,
      segments,
      rule: true,
      sub: invite.weddingDate
        ? new Date(invite.weddingDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
        : undefined,
    },
  ]

  const fields = [
    invite.weddingDate && {
      label: 'Date',
      value: new Date(invite.weddingDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
    },
    invite.venueName && { label: 'Lieu', value: invite.venueName },
    invite.ceremonyTime && { label: 'Heure de cérémonie', value: invite.ceremonyTime },
    invite.dressCode && { label: 'Dress code', value: invite.dressCode },
    invite.practicalInfo && { label: 'Infos pratiques', value: invite.practicalInfo },
  ].filter((f): f is { label: string; value: string } => !!f)

  return (
    <div style={{ background: theme.pageBg }}>
      <header className="absolute inset-x-0 top-0 z-40 flex items-center justify-center px-6 py-5">
        <Link to="/" aria-label="Scroll The Date — accueil" className="rounded-full bg-black/25 px-4 py-2 backdrop-blur-sm">
          <img src="/logo.svg" alt="Scroll The Date" className="h-6 w-auto brightness-0 invert" />
        </Link>
      </header>

      <HeroScrub
        theme={theme}
        chapters={chapters}
        video={{ desktopSrc: invite.heroVideoUrl, posterSrc: invite.heroPosterUrl ?? undefined }}
        trackHeightVh={700}
        ariaLabel={`Faire-part — ${coupleNames}`}
      />

      <PayloadSection slug={invite.slug} coupleNames={coupleNames} fields={fields} />
      <PhotosSection />
      <ClosingSection coupleNames={coupleNames} />
    </div>
  )
}
