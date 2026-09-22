import LegalLayout, { TodoBlock } from '@/components/legal/LegalLayout'
import { useSeo } from '@/hooks/useSeo'
import { useLanguage } from '@/i18n/LanguageContext'

/**
 * Mentions légales — obligatoires (art. 6-III de la LCEN) pour tout site
 * édité en France. Les champs d'identité de l'éditeur (raison sociale,
 * SIRET, RCS, capital social, adresse du siège) ne sont PAS inventés : ils
 * viennent du client (cf. TodoBlock ci-dessous) — un SIRET fabriqué serait
 * une fausse déclaration, pire qu'une page absente. Le reste (hébergeur,
 * contact) est vérifiable depuis le projet lui-même.
 */
export default function MentionsLegales() {
  const { t } = useLanguage()

  useSeo({
    title: t('mentionsLegales.seoTitle'),
    description: t('mentionsLegales.seoDescription'),
    path: '/mentions-legales',
  })

  return (
    <LegalLayout kicker={t('legal.kickerInfo')} title={t('mentionsLegales.title')} lastUpdated={t('mentionsLegales.lastUpdated')}>
      <section>
        <h2>{t('mentionsLegales.s1Title')}</h2>
        <p>
          {t('mentionsLegales.s1Prefix')} <strong>{t('mentionsLegales.s1Bold')}</strong>,{' '}
          {t('mentionsLegales.s1Mid')} <strong>{t('mentionsLegales.s1Rcs')}</strong>
          {t('mentionsLegales.s1Suffix')} <strong>{t('mentionsLegales.s1Vat')}</strong>.
        </p>
        <TodoBlock>{t('mentionsLegales.s1Todo')}</TodoBlock>
        <p>
          {t('mentionsLegales.s1Contact')}{' '}
          <a href="mailto:contact@scrollthedate.com">contact@scrollthedate.com</a>
        </p>
      </section>

      <section>
        <h2>{t('mentionsLegales.s2Title')}</h2>
        <p>
          {t('mentionsLegales.s2Body1Prefix')} <strong>{t('mentionsLegales.s2Body1Bold')}</strong>{' '}
          {t('mentionsLegales.s2Body1Mid')}{' '}
          <a href="https://railway.com" target="_blank" rel="noreferrer">railway.com</a>.
        </p>
        <p>
          {t('mentionsLegales.s2Body2Prefix')} <strong>{t('mentionsLegales.s2Body2Bold')}</strong>{' '}
          {t('mentionsLegales.s2Body2Suffix')}
        </p>
      </section>

      <section>
        <h2>{t('mentionsLegales.s3Title')}</h2>
        <p>{t('mentionsLegales.s3Body1')}</p>
        <p>
          {t('mentionsLegales.s3Body2Prefix')} <a href="/cgv">{t('mentionsLegales.s3Body2Link')}</a>
          {t('mentionsLegales.s3Body2Suffix')}
        </p>
      </section>

      <section>
        <h2>{t('mentionsLegales.s4Title')}</h2>
        <p>
          {t('mentionsLegales.s4Prefix')} <a href="/confidentialite">{t('mentionsLegales.s4Link')}</a>
          {t('mentionsLegales.s4Suffix')}
        </p>
      </section>

      <section>
        <h2>{t('mentionsLegales.s5Title')}</h2>
        <p>{t('mentionsLegales.s5Body')}</p>
      </section>
    </LegalLayout>
  )
}
