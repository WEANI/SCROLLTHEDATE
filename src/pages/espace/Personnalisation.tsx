import { useEffect, useState, type CSSProperties } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ExternalLink, Save } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { trpc } from '@/providers/trpc'
import { useLanguage } from '@/i18n/LanguageContext'
import { ErrorState, Kicker, PageSkeleton, SectionCard } from '@/components/espace/shared'
import { useSelectedProject } from '@/components/espace/ProjectSelection'
import { HERO_FONTS, HERO_TEXT_ANIMATIONS, getHeroFont, useGoogleFont } from '@/components/hero-scrub/heroDecor'
import { ChapterContent } from '@/components/hero-scrub/HeroScrub'
import type { HeroChapter } from '@/components/hero-scrub/types'
import type { HeroChapterTiming, HeroCustomCard, HeroVerticalAlign } from '@contracts/bespokePalette'

/**
 * Personnalisation d'un Save the Date "sur un modèle" — APRÈS achat, cf.
 * échange du 21/09/2026. Le client choisit lui-même, par bloc, la couleur
 * du texte et sa position (haut/milieu/bas), plus la police et l'animation
 * pour tout le hero — jamais le timing (secondes d'apparition/disparition),
 * réglé exclusivement par l'admin. Onglet nav visible uniquement pour une
 * commande SAVE_THE_DATE (cf. ClientShell.tsx, NAV_ITEMS).
 *
 * Nuancier restreint (SWATCHES) plutôt qu'un `<input type=color>` brut —
 * plus soigné pour du client-facing, et garantit des couleurs qui
 * fonctionnent sur la plupart des montages plutôt qu'un choix hasardeux.
 */
type T = (key: string) => string

function useSwatches(t: T) {
  return [
    { label: t('espace.personnalisation.swatchIvory'), value: '#F7EFE0' },
    { label: t('espace.personnalisation.swatchGold'), value: '#D4AF6A' },
    { label: t('espace.personnalisation.swatchTerracotta'), value: '#C96F5A' },
    { label: t('espace.personnalisation.swatchDustyPink'), value: '#C08769' },
    { label: t('espace.personnalisation.swatchBurgundy'), value: '#7A2E2E' },
    { label: t('espace.personnalisation.swatchForestGreen'), value: '#3E4D3A' },
    { label: t('espace.personnalisation.swatchMidnightBlue'), value: '#242C40' },
    { label: t('espace.personnalisation.swatchAnthracite'), value: '#2A2A2E' },
  ]
}

function usePositions(t: T): { value: HeroVerticalAlign; label: string }[] {
  return [
    { value: 'top', label: t('espace.personnalisation.positionTop') },
    { value: 'middle', label: t('espace.personnalisation.positionMiddle') },
    { value: 'bottom', label: t('espace.personnalisation.positionBottom') },
  ]
}

function ColorSwatches({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useLanguage()
  const swatches = useSwatches(t)
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onChange('')}
        title={t('espace.personnalisation.defaultColorTitle')}
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full border-2 text-[9px] font-semibold text-neutral-500',
          value === '' ? 'border-terracotta-500' : 'border-neutral-200',
        )}
      >
        {t('espace.personnalisation.defaultColorLabel')}
      </button>
      {swatches.map((s) => (
        <button
          key={s.value}
          type="button"
          title={s.label}
          onClick={() => onChange(s.value)}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full border-2 transition-transform hover:scale-110',
            value.toLowerCase() === s.value.toLowerCase() ? 'border-terracotta-500' : 'border-white/0',
          )}
          style={{ background: s.value, boxShadow: '0 0 0 1px rgba(27,27,30,0.12)' }}
        >
          {value.toLowerCase() === s.value.toLowerCase() && <Check size={14} className="text-white drop-shadow" />}
        </button>
      ))}
    </div>
  )
}

function PositionSelect({ value, onChange }: { value: HeroVerticalAlign; onChange: (v: HeroVerticalAlign) => void }) {
  const { t } = useLanguage()
  const positions = usePositions(t)
  return (
    <div className="flex gap-1.5">
      {positions.map((p) => (
        <button
          key={p.value}
          type="button"
          onClick={() => onChange(p.value)}
          className={cn(
            'rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors',
            value === p.value ? 'bg-anthracite-800 text-white' : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200',
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}

/** Petite vignette d'aperçu sombre — pas le vrai thème du montage (couleurs de fond/vignette non exposées côté client), juste de quoi juger la couleur/position/police/animation choisies. */
function BlockPreview({ chapter, fontId, textAnimation }: { chapter: HeroChapter; fontId: string; textAnimation: string }) {
  const font = getHeroFont(fontId)
  const [show, setShow] = useState(true)
  useEffect(() => {
    const id = window.setInterval(() => {
      setShow(false)
      window.setTimeout(() => setShow(true), 80)
    }, 2600)
    return () => window.clearInterval(id)
  }, [fontId, textAnimation])
  return (
    <div
      className="relative w-full overflow-hidden rounded-xl bg-anthracite-950"
      style={
        {
          aspectRatio: '16/8',
          containerType: 'inline-size',
          '--hs-accent': '#D4AF6A',
          '--hs-text-primary': '#F7EFE0',
          '--hs-text-secondary': '#D8C2A0',
          '--hs-card-bg': 'rgba(26,10,10,0.55)',
          '--hs-card-border': 'rgba(212,175,106,0.25)',
          '--hs-card-shadow': '0 24px 60px rgba(0,0,0,0.45)',
          '--hs-font-family': font?.fontFamily || "'Fraunces', Georgia, serif",
        } as CSSProperties
      }
    >
      <ChapterContent
        chapter={chapter}
        textAnimation={textAnimation || undefined}
        className={cn('hs-overlay', show && 'show', textAnimation && `hs-anim-${textAnimation}`)}
      />
    </div>
  )
}

export default function Personnalisation() {
  const { t } = useLanguage()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const utils = trpc.useUtils()
  const { projectId } = useSelectedProject()
  const projectQuery = trpc.projects.myProject.useQuery({ projectId }, { enabled: isAuthenticated, retry: false })
  const project = projectQuery.data ?? null

  const [toast, setToast] = useState<string | null>(null)
  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  // ---- état local du formulaire, synchronisé au chargement seulement
  // (jamais réécrasé par un refetch pendant que le client tape) ----
  const [loaded, setLoaded] = useState(false)
  const [names, setNames] = useState('')
  const [weddingDate, setWeddingDate] = useState('')
  const [chapter1Color, setChapter1Color] = useState('')
  const [chapter1Position, setChapter1Position] = useState<HeroVerticalAlign>('bottom')
  const [chapter2Color, setChapter2Color] = useState('')
  const [chapter2Position, setChapter2Position] = useState<HeroVerticalAlign>('bottom')
  const [dateColor, setDateColor] = useState('')
  const [datePosition, setDatePosition] = useState<HeroVerticalAlign>('bottom')
  const [fontId, setFontId] = useState('')
  const [textAnimation, setTextAnimation] = useState('')

  const heroChapters = (project?.heroChapters as HeroChapterTiming[] | null) ?? []
  const heroCustomCards = (project?.heroCustomCards as HeroCustomCard[] | null) ?? []
  const dateCard = heroCustomCards.find((c) => c.kind === 'date')
  const palette = (project?.palette as Record<string, string> | null) ?? {}

  useEffect(() => {
    if (loaded || !project) return
    const answers = (project.questionnaire?.answers as Record<string, unknown> | null) ?? {}
    setNames((answers['couple.prenoms'] as string | undefined) ?? '')
    setWeddingDate(project.weddingDate ? new Date(project.weddingDate).toISOString().slice(0, 10) : '')
    setChapter1Color(palette.stdSaveTheDateTextColor ?? '')
    setChapter1Position(heroChapters[0]?.position ?? 'bottom')
    setChapter2Color(palette.stdNamesDateTextColor ?? '')
    setChapter2Position(heroChapters[1]?.position ?? 'bottom')
    setDateColor(dateCard?.textColor ?? '')
    setDatePosition(dateCard?.position ?? 'bottom')
    setFontId(palette.heroFontId ?? '')
    setTextAnimation(palette.heroTextAnimation ?? '')
    setLoaded(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, loaded])

  useGoogleFont(fontId)

  const saveDates = trpc.questionnaire.save.useMutation()
  const savePersonalization = trpc.projects.updateMySaveTheDatePersonalization.useMutation()
  const saving = saveDates.isPending || savePersonalization.isPending

  const handleSave = async () => {
    await Promise.all([
      saveDates.mutateAsync({ projectId, answers: { 'couple.prenoms': names } }),
      savePersonalization.mutateAsync({
        projectId,
        weddingDate: weddingDate ? new Date(weddingDate) : undefined,
        chapter1TextColor: chapter1Color,
        chapter1Position,
        chapter2TextColor: chapter2Color,
        chapter2Position,
        ...(dateCard ? { dateTextColor: dateColor, datePosition } : null),
        fontId,
        textAnimation,
      }),
    ])
    await utils.projects.myProject.invalidate()
    showToast(t('espace.personnalisation.savedToast'))
  }

  if (authLoading || projectQuery.isLoading) return <PageSkeleton />
  if (projectQuery.error && projectQuery.error.data?.code !== 'NOT_FOUND') {
    return <ErrorState onRetry={() => projectQuery.refetch()} />
  }

  const nameParts = names.split(/\s+(&|et)\s+/i)
  const namesPreview: HeroChapter = {
    id: 1,
    kind: 'text',
    from: 0,
    to: 1,
    segments:
      nameParts.length === 3
        ? [{ text: nameParts[0] }, { text: nameParts[1], accent: true }, { text: nameParts[2] }]
        : [{ text: names || 'Vos prénoms' }],
    fitOneLine: true,
    titleSize: 'md',
    textColorOverride: chapter2Color || undefined,
  }
  const savePreview: HeroChapter = {
    id: 0,
    kind: 'text',
    from: 0,
    to: 1,
    segments: [{ text: 'Save the date' }],
    titleSize: 'md',
    textColorOverride: chapter1Color || undefined,
  }
  const datePreview: HeroChapter = {
    id: 2,
    kind: 'text',
    from: 0,
    to: 1,
    segments: [{ text: weddingDate ? new Date(weddingDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Votre date' }],
    titleSize: 'md',
    textColorOverride: dateColor || undefined,
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Kicker>{t('espace.personnalisation.kicker')}</Kicker>
        <h2 className="font-display mt-1 text-3xl font-medium tracking-[-0.01em] text-ink">
          {t('espace.personnalisation.title')}
        </h2>
        <p className="mt-1.5 text-[14px] text-neutral-500">
          {t('espace.personnalisation.subtitle')}
        </p>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="fixed left-1/2 top-20 z-50 -translate-x-1/2 rounded-full bg-anthracite-800 px-5 py-2.5 text-[13px] font-medium text-white shadow-xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {!project ? (
        <SectionCard>
          <p className="text-[14px] text-neutral-500">{t('espace.personnalisation.noProjectYet')}</p>
        </SectionCard>
      ) : project.order?.product !== 'SAVE_THE_DATE' ? (
        <SectionCard>
          <p className="text-[14px] text-neutral-500">{t('espace.personnalisation.wrongProduct')}</p>
        </SectionCard>
      ) : (
        <>
          <SectionCard className="flex flex-col gap-5">
            <h3 className="font-display text-xl font-medium text-ink">{t('espace.personnalisation.namesDateTitle')}</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-[13px] font-medium text-neutral-500">
                {t('espace.personnalisation.namesLabel')}
                <input
                  value={names}
                  onChange={(e) => setNames(e.target.value)}
                  placeholder={t('espace.personnalisation.namesPlaceholder')}
                  className="rounded-xl border border-neutral-200 px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-terracotta-500"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-[13px] font-medium text-neutral-500">
                {t('espace.personnalisation.dateLabel')}
                <input
                  type="date"
                  value={weddingDate}
                  onChange={(e) => setWeddingDate(e.target.value)}
                  className="rounded-xl border border-neutral-200 px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-terracotta-500"
                />
              </label>
            </div>
          </SectionCard>

          <SectionCard className="flex flex-col gap-6">
            <h3 className="font-display text-xl font-medium text-ink">{t('espace.personnalisation.blocksTitle')}</h3>

            <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
              <div className="flex flex-col gap-2">
                <p className="text-[13px] font-semibold text-ink">{t('espace.personnalisation.blockSaveLabel')}</p>
                <ColorSwatches value={chapter1Color} onChange={setChapter1Color} />
                <PositionSelect value={chapter1Position} onChange={setChapter1Position} />
              </div>
              <BlockPreview chapter={savePreview} fontId={fontId} textAnimation={textAnimation} />
            </div>

            <div className="grid gap-4 border-t border-neutral-200 pt-6 lg:grid-cols-[1fr_260px]">
              <div className="flex flex-col gap-2">
                <p className="text-[13px] font-semibold text-ink">{t('espace.personnalisation.blockNamesLabel')}</p>
                <ColorSwatches value={chapter2Color} onChange={setChapter2Color} />
                <PositionSelect value={chapter2Position} onChange={setChapter2Position} />
              </div>
              <BlockPreview chapter={namesPreview} fontId={fontId} textAnimation={textAnimation} />
            </div>

            {dateCard && (
              <div className="grid gap-4 border-t border-neutral-200 pt-6 lg:grid-cols-[1fr_260px]">
                <div className="flex flex-col gap-2">
                  <p className="text-[13px] font-semibold text-ink">{t('espace.personnalisation.blockDateLabel')}</p>
                  <ColorSwatches value={dateColor} onChange={setDateColor} />
                  <PositionSelect value={datePosition} onChange={setDatePosition} />
                </div>
                <BlockPreview chapter={datePreview} fontId={fontId} textAnimation={textAnimation} />
              </div>
            )}
          </SectionCard>

          <SectionCard className="flex flex-col gap-4">
            <h3 className="font-display text-xl font-medium text-ink">{t('espace.personnalisation.fontAnimTitle')}</h3>
            <p className="text-[13px] text-neutral-500">{t('espace.personnalisation.fontAnimHint')}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-[13px] font-medium text-neutral-500">
                {t('espace.personnalisation.fontLabel')}
                <select
                  value={fontId}
                  onChange={(e) => setFontId(e.target.value)}
                  className="rounded-xl border border-neutral-200 px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-terracotta-500"
                >
                  <option value="">{t('espace.personnalisation.fontDefaultOption')}</option>
                  {Object.entries(
                    HERO_FONTS.reduce<Record<string, typeof HERO_FONTS>>((acc, f) => {
                      ;(acc[f.category] ??= []).push(f)
                      return acc
                    }, {}),
                  ).map(([category, fonts]) => (
                    <optgroup key={category} label={category}>
                      {fonts.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-[13px] font-medium text-neutral-500">
                {t('espace.personnalisation.animLabel')}
                <select
                  value={textAnimation}
                  onChange={(e) => setTextAnimation(e.target.value)}
                  className="rounded-xl border border-neutral-200 px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-terracotta-500"
                >
                  <option value="">{t('espace.personnalisation.animDefaultOption')}</option>
                  {HERO_TEXT_ANIMATIONS.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </SectionCard>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="inline-flex items-center gap-2 rounded-full bg-terracotta-500 px-6 py-3 text-[13.5px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-terracotta-400 active:scale-[0.97] disabled:opacity-60"
            >
              <Save size={15} /> {saving ? t('espace.personnalisation.saving') : t('espace.personnalisation.save')}
            </button>
            <a
              href={`/faire-part/${project.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-neutral-500 hover:text-ink"
            >
              {t('espace.personnalisation.viewLink')} <ExternalLink size={13} />
            </a>
          </div>
        </>
      )}
    </div>
  )
}
