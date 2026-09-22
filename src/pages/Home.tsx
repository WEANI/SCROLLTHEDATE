import { useEffect } from 'react'
import { Link, useLocation } from 'react-router'
import ScrubHero from '@/components/ScrubHero'
import type { ScrubHeroBeat } from '@/components/ScrubHero'
import { useSeo } from '@/hooks/useSeo'
import { useLanguage } from '@/i18n/LanguageContext'
import SocialProof from '@/components/home/SocialProof'
import Concept from '@/components/home/Concept'
import Included from '@/components/home/Included'
import HowItWorks from '@/components/home/HowItWorks'
import Advantages from '@/components/home/Advantages'
import RsvpTeaser from '@/components/home/RsvpTeaser'
import Products from '@/components/home/Products'
import Gallery from '@/components/home/Gallery'
import Faq from '@/components/home/Faq'
import FinalCta from '@/components/home/FinalCta'

/**
 * Calé sur le contenu réel de home-hero-desktop.mp4 (13,5 s) — 3 plans
 * séparés par des zooms-fondus continus (pas des whip-pans glitchés comme
 * l'ancien clip : pas besoin de `snapWindows` ici, on peut s'arrêter
 * n'importe où dans une transition sans tomber sur une frame moche) :
 *  - 0 → 0.265 : sortie de cérémonie, confettis (plan large, établit l'histoire)
 *  - transition (zoom continu)  0.265 → 0.34
 *  - 0.34 → 0.69 : mains alliées sur le bouquet (plan serré, « les images »)
 *  - transition (zoom continu)  0.69 → 0.75
 *  - 0.75 → 1   : silhouette, échange d'alliance sur fond blanc (plan fixe,
 *    le plus calme du clip — CTA révélé ici, cf. persistentFrom)
 *
 * Construit à partir de `t()` (cf. échange du 22/09/2026 — site bilingue) :
 * fonction plutôt que constante de module, appelée dans le composant une
 * fois `t` disponible.
 */
function buildHeroBeats(t: (key: string) => string): ScrubHeroBeat[] {
  return [
    {
      from: 0,
      to: 0.08,
      kicker: t('home.hero.kicker'),
    },
    {
      from: 0.08,
      to: 0.24,
      segments: [{ text: t('home.hero.beat1'), ink: true }],
    },
    {
      from: 0.37,
      to: 0.65,
      segments: [{ text: t('home.hero.beat2Lead') }, { text: t('home.hero.beat2Accent'), accent: true }],
    },
    {
      from: 0.78,
      to: 0.95,
      segments: [
        { text: t('home.hero.beat3Lead') },
        { text: t('home.hero.beat3Brand'), brand: true },
        { text: t('home.hero.beat3Tail') },
      ],
    },
  ]
}

/**
 * Même découpage sur home-hero-mobile.mp4 (12,13 s) — un montage différent,
 * pas un simple recadrage : ses plans ne tombent pas aux mêmes fractions
 * que la vidéo desktop (~9 % d'écart mesuré sur les 2 transitions) :
 *  - 0 → 0.34 : confettis
 *  - transition  0.34 → 0.45
 *  - 0.45 → 0.79 : bouquet
 *  - transition  0.79 → 0.85
 *  - 0.85 → 1   : silhouette
 *
 * Même texte que `buildHeroBeats` ci-dessus (seuls les timings diffèrent) —
 * mêmes clés de traduction, jamais dupliquées.
 */
function buildHeroBeatsMobile(t: (key: string) => string): ScrubHeroBeat[] {
  return [
    {
      from: 0,
      to: 0.08,
      kicker: t('home.hero.kicker'),
    },
    {
      from: 0.08,
      to: 0.3,
      segments: [{ text: t('home.hero.beat1'), ink: true }],
    },
    {
      from: 0.48,
      to: 0.75,
      segments: [{ text: t('home.hero.beat2Lead') }, { text: t('home.hero.beat2Accent'), accent: true }],
    },
    {
      from: 0.87,
      to: 0.97,
      segments: [
        { text: t('home.hero.beat3Lead') },
        { text: t('home.hero.beat3Brand'), brand: true },
        { text: t('home.hero.beat3Tail') },
      ],
    },
  ]
}

/** CTA persistant du héros (révélé à 87 % de progression) — dans le plan
 * silhouette pour les deux montages (desktop : 0.75→1 ; mobile, plus
 * court : 0.85→1), le plus calme des deux, cf. commentaires ci-dessus. */
function HeroCta({ t }: { t: (key: string) => string }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-5">
      <Link
        to="/offres"
        className="rounded-full bg-terracotta-500 px-8 py-3.5 text-[13px] font-semibold uppercase tracking-[0.1em] text-white transition-all hover:-translate-y-0.5 hover:bg-terracotta-400 active:scale-[0.97]"
      >
        {t('home.hero.ctaCreate')}
      </Link>
      <Link
        to="/demofairepart"
        className="rounded-full border border-white/25 px-8 py-3.5 text-[13px] font-semibold uppercase tracking-[0.1em] text-white/85 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-white/60 hover:text-white"
      >
        {t('home.hero.ctaDemo')}
      </Link>
    </div>
  )
}

export default function Home() {
  const location = useLocation()
  const { t } = useLanguage()

  useSeo({
    title: t('home.seo.title'),
    description: t('home.seo.description'),
    path: '/',
  })

  // Deep-links d'ancres (/#concept, /#faq…) depuis les autres pages
  useEffect(() => {
    if (!location.hash) return
    const id = location.hash.slice(1)
    const timer = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    }, 150)
    return () => window.clearTimeout(timer)
  }, [location.hash])

  return (
    <>
      {/* Héros plein écran : sort du padding du Layout (navbar overlay) via -mt-20 */}
      <div className="-mt-20">
        <ScrubHero
          videoSrc="/home-hero-desktop.mp4"
          mobileSrc="/home-hero-mobile.mp4"
          posterSrc="/home-hero-poster.jpg"
          // Séquence d'images plutôt que lecture vidéo directe — cf. doc de
          // ScrubHeroProps.frames (échange du 13/09/2026). Extraites avec le
          // même pipeline ffmpeg que les modèles Save the Date
          // (fps=12, scale=-2:1080) : 162 images pour le montage desktop
          // (13,5 s), tous deux servis statiquement depuis public/.
          //
          // Montage mobile remplacé le 13/09/2026 par « HERO MOBILE
          // OUVERTURE » (206 images, 17,1 s) : ouverture d'enveloppe → sortie
          // de cérémonie → alliance en silhouette. Vidéo source livrée en
          // 1920×1080 avec un pillarboxing noir (portrait 608×1080 encadré
          // dans un export CapCut) — recadrée avant extraction des frames
          // (`crop=608:1080:656:0,fps=12,scale=-2:1080`).
          //
          // ⚠️ `HERO_BEATS_MOBILE` ci-dessus n'a PAS été retimé sur ce
          // nouveau montage (durée différente, nouvelle scène d'ouverture) —
          // ses fractions de progression restent celles calées sur l'ancien
          // clip de 12,13 s. À revoir si le texte tombe mal par rapport aux
          // nouvelles scènes.
          frames={{ baseUrl: '/home-hero-desktop-frames/', count: 162, fps: 12 }}
          mobileFrames={{ baseUrl: '/home-hero-mobile-frames/', count: 206, fps: 12 }}
          heading={t('home.hero.heading')}
          beats={buildHeroBeats(t)}
          mobileBeats={buildHeroBeatsMobile(t)}
          persistent={<HeroCta t={t} />}
          persistentFrom={0.87}
          durationVh={280}
        />
      </div>
      <SocialProof />
      <Concept />
      <Products />
      <HowItWorks />
      <Included />
      <RsvpTeaser />
      <Advantages />
      <Gallery />
      <Faq />
      <FinalCta />
    </>
  )
}
