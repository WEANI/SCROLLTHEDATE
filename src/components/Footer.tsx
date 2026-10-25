import { Link } from 'react-router'
import { Flag, HeartHandshake, Infinity as InfinityIcon, MessageCircle, ShieldCheck } from 'lucide-react'
import { useLanguage } from '@/i18n/LanguageContext'
import { activeSocialProfiles } from '@contracts/brand'
import SocialIcon from '@/components/SocialIcon'

export default function Footer() {
  const { t } = useLanguage()
  // Comptes de la marque — n'apparaissent qu'une fois leur adresse renseignée
  // dans contracts/brand.ts (vides tant que les noms ne sont pas confirmés).
  const socials = activeSocialProfiles()

  const NAVIGATION = [
    { key: 'concept', label: t('nav.concept'), href: '/#concept' },
    { key: 'howItWorks', label: t('nav.howItWorks'), href: '/#comment-ca-marche' },
    { key: 'faq', label: t('nav.faq'), href: '/#faq' },
    { key: 'login', label: t('nav.login'), href: '/login' },
  ]

  const OFFRES = [
    { key: 'fairePart', label: t('footer.offerFairePart'), href: '/faire-part-digital' },
    { key: 'saveTheDate', label: t('footer.offerSaveTheDate'), href: '/save-the-date-digital' },
    { key: 'demo', label: t('footer.seeDemo'), href: '/demofairepart' },
  ]

  const REASSURANCE = [
    { key: 'payment', icon: ShieldCheck, label: t('footer.reassurancePayment') },
    { key: 'link', icon: InfinityIcon, label: t('footer.reassuranceLink') },
    { key: 'human', icon: HeartHandshake, label: t('footer.reassuranceHuman') },
    { key: 'made', icon: Flag, label: t('footer.reassuranceMade') },
  ]

  return (
    <footer className="grain bg-anthracite-950">
      <div className="mx-auto grid max-w-[1440px] gap-12 px-6 py-20 sm:grid-cols-2 lg:grid-cols-4 lg:px-12">
        {/* Wordmark + baseline */}
        <div className="flex flex-col gap-5">
          <Link to="/" aria-label="Scroll The Date — accueil">
            <img src="/logo.png" alt="Scroll The Date" className="h-[72px] w-auto" />
          </Link>
          <p className="font-display text-lg font-light italic text-white/70">
            {t('footer.tagline')}
          </p>
          <a
            href="https://wa.me/33600000000"
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-fit items-center gap-2 rounded-full border border-anthracite-700 px-4 py-2 text-xs font-medium uppercase tracking-[0.12em] text-white/80 transition-colors hover:border-terracotta-500 hover:text-terracotta-300"
          >
            <MessageCircle size={14} className="text-terracotta-500" />
            {t('footer.whatsapp')}
          </a>
          {socials.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta-300">{t('footer.followUs')}</p>
              <ul className="flex flex-wrap gap-3">
                {socials.map((s) => (
                  <li key={s.id}>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noreferrer me"
                      aria-label={s.label}
                      title={s.label}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white/70 transition-all hover:-translate-y-0.5 hover:border-terracotta-500 hover:text-white"
                    >
                      <SocialIcon id={s.id} size={18} />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav aria-label="Navigation pied de page">
          <h3 className="mb-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta-300">
            {t('footer.navigation')}
          </h3>
          <ul className="flex flex-col gap-3">
            {NAVIGATION.map((item) => (
              <li key={item.key}>
                <Link
                  to={item.href}
                  className="text-sm text-white/70 transition-colors hover:text-white"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Offres */}
        <nav aria-label="Nos offres">
          <h3 className="mb-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta-300">
            {t('footer.offers')}
          </h3>
          <ul className="flex flex-col gap-3">
            {OFFRES.map((item) => (
              <li key={item.key}>
                <Link
                  to={item.href}
                  className="text-sm text-white/70 transition-colors hover:text-white"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Réassurance */}
        <div>
          <h3 className="mb-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta-300">
            {t('footer.reassurance')}
          </h3>
          <ul className="flex flex-col gap-3">
            {REASSURANCE.map((item) => (
              <li key={item.key} className="flex items-center gap-3 text-sm text-white/70">
                <item.icon size={16} className="shrink-0 text-terracotta-500" />
                {item.label}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-anthracite-700/50">
        <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-4 px-6 py-6 text-xs text-white/50 sm:flex-row lg:px-12">
          <p>© {new Date().getFullYear()} Scroll The Date — scrollthedate.com</p>
          <div className="flex gap-6">
            <Link to="/mentions-legales" className="transition-colors hover:text-white/80">
              {t('footer.legal')}
            </Link>
            <Link to="/cgv" className="transition-colors hover:text-white/80">
              {t('footer.cgv')}
            </Link>
            <Link to="/confidentialite" className="transition-colors hover:text-white/80">
              {t('footer.privacy')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
