import LegalLayout, { TodoBlock } from '@/components/legal/LegalLayout'
import { useSeo } from '@/hooks/useSeo'
import { useLanguage } from '@/i18n/LanguageContext'

/**
 * Politique de confidentialité — catégories de données et sous-traitants
 * repris des schémas/routers réels du projet (db/schema.ts, api/rsvpRouter.ts,
 * api/mediaRouter.ts, api/context.ts), pas d'une liste générique : c'est
 * précisément le défaut relevé à l'audit (une page qui n'existe pas du
 * tout) — autant que celle qui existe décrive la vraie collecte de
 * données plutôt qu'un texte passe-partout copié d'ailleurs.
 */
export default function Confidentialite() {
  const { t } = useLanguage()

  useSeo({
    title: t('confidentialite.seoTitle'),
    description: t('confidentialite.seoDescription'),
    path: '/confidentialite',
  })

  return (
    <LegalLayout kicker={t('legal.kickerInfo')} title={t('confidentialite.title')} lastUpdated={t('confidentialite.lastUpdated')}>
      <TodoBlock>
        {t('confidentialite.todoPrefix')} <a href="/mentions-legales">{t('confidentialite.todoLink')}</a>.
      </TodoBlock>

      <section>
        <h2>{t('confidentialite.s1Title')}</h2>
        <p>
          {t('confidentialite.s1Prefix')} <strong>{t('confidentialite.s1Bold')}</strong> {t('confidentialite.s1Mid')}{' '}
          <a href="/mentions-legales">{t('confidentialite.s1Link')}</a> {t('confidentialite.s1Suffix')}
        </p>
      </section>

      <section>
        <h2>{t('confidentialite.s2Title')}</h2>
        <p>{t('confidentialite.s2Intro')}</p>
        <ul>
          <li>
            <strong>{t('confidentialite.s2Item1Bold')}</strong>
            {t('confidentialite.s2Item1Rest')}
          </li>
          <li>
            <strong>{t('confidentialite.s2Item2Bold')}</strong>
            {t('confidentialite.s2Item2Rest')}
          </li>
          <li>
            <strong>{t('confidentialite.s2Item3Bold')}</strong>
            {t('confidentialite.s2Item3Rest')}
          </li>
          <li>
            <strong>{t('confidentialite.s2Item4Bold')}</strong>
            {t('confidentialite.s2Item4Rest')}
          </li>
          <li>
            <strong>{t('confidentialite.s2Item5Bold')}</strong>
            {t('confidentialite.s2Item5Rest')}
          </li>
        </ul>
      </section>

      <section>
        <h2>{t('confidentialite.s3Title')}</h2>
        <ul>
          <li>{t('confidentialite.s3Item1')}</li>
          <li>{t('confidentialite.s3Item2')}</li>
          <li>{t('confidentialite.s3Item3')}</li>
          <li>{t('confidentialite.s3Item4')}</li>
          <li>{t('confidentialite.s3Item5')}</li>
        </ul>
      </section>

      <section>
        <h2>{t('confidentialite.s4Title')}</h2>
        <p>{t('confidentialite.s4Body')}</p>
      </section>

      <section>
        <h2>{t('confidentialite.s5Title')}</h2>
        <p>{t('confidentialite.s5Intro')}</p>
        <ul>
          <li>
            <strong>{t('confidentialite.s5Item1Bold')}</strong> {t('confidentialite.s5Item1Rest')}
          </li>
          <li>
            <strong>{t('confidentialite.s5Item2Bold')}</strong> {t('confidentialite.s5Item2Rest')}
          </li>
          <li>
            <strong>{t('confidentialite.s5Item3Bold')}</strong> {t('confidentialite.s5Item3Rest')}
          </li>
          <li>
            <strong>{t('confidentialite.s5Item4Bold')}</strong> {t('confidentialite.s5Item4Rest')}
          </li>
        </ul>
        <p>{t('confidentialite.s5Note')}</p>
      </section>

      <section>
        <h2>{t('confidentialite.s6Title')}</h2>
        <TodoBlock>{t('confidentialite.s6Todo')}</TodoBlock>
        <p>{t('confidentialite.s6Body')}</p>
      </section>

      <section id="cookies">
        <h2>{t('confidentialite.s7Title')}</h2>
        <p>
          {t('confidentialite.s7Body1Prefix')} <strong>{t('confidentialite.s7Body1Bold')}</strong>
          {' '}{t('confidentialite.s7Body1Suffix')}
        </p>
        <p>{t('confidentialite.s7Body2')}</p>
        <p>{t('confidentialite.s7Body3')}</p>
      </section>

      <section>
        <h2>{t('confidentialite.s8Title')}</h2>
        <p>
          {t('confidentialite.s8Body1Prefix')}{' '}
          <a href="mailto:contact@scrollthedate.com">contact@scrollthedate.com</a>.
        </p>
        <p>
          {t('confidentialite.s8Body2Prefix')}
          <a href="https://www.cnil.fr" target="_blank" rel="noreferrer">
            {t('confidentialite.s8Body2Link')}
          </a>
          {t('confidentialite.s8Body2Suffix')}
        </p>
      </section>
    </LegalLayout>
  )
}
