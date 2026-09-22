import LegalLayout, { TodoBlock } from '@/components/legal/LegalLayout'
import { useSeo } from '@/hooks/useSeo'
import { useLanguage } from '@/i18n/LanguageContext'

/**
 * Conditions générales de vente — le contenu commercial (produits, prix,
 * délais, politique de révisions) est repris tel quel depuis le code réel
 * (cf. src/components/commerce/pricing.ts, FALLBACK_PRODUCTS/OPTIONS) plutôt
 * que reformulé — même principe que le reste du payload du site : jamais de
 * chiffre inventé. Le nombre précis de propositions de scénario et de
 * retouches incluses n'est volontairement plus affiché nulle part sur le
 * site (demande client du 26/08/2026) — la mécanique (scénarios proposés,
 * retouches incluses) reste réelle, seul l'engagement chiffré public a été
 * retiré. Les clauses sans équivalent existant dans le produit
 * (rétractation, remboursement, médiation) sont rédigées sur une base
 * standard/conservatrice et clairement signalées comme à faire valider par
 * un professionnel du droit avant mise en ligne réelle — cf. TodoBlock.
 *
 * ⚠️ Ces CGV décrivent un paiement carte via Stripe comme s'il était réel.
 * Au moment de la rédaction, `createCheckout` (api/ordersRouter.ts) SIMULE
 * le paiement (statut "paid" posé directement, `stripeRef: test_...`) —
 * aucune intégration Stripe réelle n'existe encore. Ces CGV ne doivent pas
 * engager de vrais clients tant que ce paiement n'est pas réellement câblé.
 */
export default function CGV() {
  const { t } = useLanguage()

  useSeo({
    title: t('cgv.seoTitle'),
    description: t('cgv.seoDescription'),
    path: '/cgv',
  })

  return (
    <LegalLayout kicker={t('legal.kickerInfo')} title={t('cgv.title')} lastUpdated={t('cgv.lastUpdated')}>
      <TodoBlock>{t('cgv.todoIntro')}</TodoBlock>

      <section>
        <h2>{t('cgv.s1Title')}</h2>
        <p>
          {t('cgv.s1Prefix')} <a href="/mentions-legales">{t('cgv.s1Link')}</a>
          {t('cgv.s1Suffix')}
        </p>
      </section>

      <section>
        <h2>{t('cgv.s2Title')}</h2>
        <p>{t('cgv.s2Intro')}</p>
        <ul>
          <li>
            <strong>{t('cgv.s2Item1Bold')}</strong> {t('cgv.s2Item1Rest')}
          </li>
          <li>
            <strong>{t('cgv.s2Item2Bold')}</strong> {t('cgv.s2Item2Rest')}
          </li>
        </ul>
        <p>{t('cgv.s2OptionsIntro')}</p>
        <ul>
          <li>{t('cgv.s2Opt1')}</li>
          <li>{t('cgv.s2Opt2')}</li>
          <li>{t('cgv.s2Opt3')}</li>
          <li>{t('cgv.s2Opt4')}</li>
        </ul>
        <p>{t('cgv.s2Price')}</p>
      </section>

      <section>
        <h2>{t('cgv.s3Title')}</h2>
        <p>{t('cgv.s3Intro')}</p>
        <ul>
          <li>{t('cgv.s3Item1')}</li>
          <li>{t('cgv.s3Item2')}</li>
          <li>{t('cgv.s3Item3')}</li>
          <li>{t('cgv.s3Item4')}</li>
        </ul>
        <p>{t('cgv.s3Note')}</p>
      </section>

      <section>
        <h2>{t('cgv.s4Title')}</h2>
        <p>{t('cgv.s4Intro')}</p>
        <ul>
          <li>{t('cgv.s4Item1')}</li>
          <li>{t('cgv.s4Item2')}</li>
        </ul>
        <p>{t('cgv.s4Note')}</p>
      </section>

      <section>
        <h2>{t('cgv.s5Title')}</h2>
        <p>{t('cgv.s5Body1')}</p>
        <p>{t('cgv.s5Body2')}</p>
      </section>

      <section>
        <h2>{t('cgv.s6Title')}</h2>
        <p>{t('cgv.s6Body1')}</p>
        <p>
          {t('cgv.s6Body2Prefix')} <a href="mailto:contact@scrollthedate.com">contact@scrollthedate.com</a>
          {t('cgv.s6Body2Suffix')}
        </p>
      </section>

      <section>
        <h2>{t('cgv.s7Title')}</h2>
        <TodoBlock>{t('cgv.s7Todo')}</TodoBlock>
        <p>{t('cgv.s7Body')}</p>
      </section>

      <section>
        <h2>{t('cgv.s8Title')}</h2>
        <p>{t('cgv.s8Body')}</p>
      </section>

      <section>
        <h2>{t('cgv.s9Title')}</h2>
        <p>{t('cgv.s9Body')}</p>
      </section>

      <section>
        <h2>{t('cgv.s10Title')}</h2>
        <p>
          {t('cgv.s10Prefix')} <a href="/confidentialite">{t('cgv.s10Link')}</a>
          {t('cgv.s10Suffix')}
        </p>
      </section>

      <section>
        <h2>{t('cgv.s11Title')}</h2>
        <TodoBlock>{t('cgv.s11Todo')}</TodoBlock>
        <p>
          {t('cgv.s11BodyPrefix')} <a href="mailto:contact@scrollthedate.com">contact@scrollthedate.com</a>.{' '}
          {t('cgv.s11BodySuffix')}
        </p>
      </section>

      <section>
        <h2>{t('cgv.s12Title')}</h2>
        <p>{t('cgv.s12Body')}</p>
      </section>
    </LegalLayout>
  )
}
