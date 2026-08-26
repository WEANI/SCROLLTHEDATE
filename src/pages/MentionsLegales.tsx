import { useEffect } from 'react'
import LegalLayout, { TodoBlock } from '@/components/legal/LegalLayout'

/**
 * Mentions légales — obligatoires (art. 6-III de la LCEN) pour tout site
 * édité en France. Les champs d'identité de l'éditeur (raison sociale,
 * SIRET, RCS, capital social, adresse du siège) ne sont PAS inventés : ils
 * viennent du client (cf. TodoBlock ci-dessous) — un SIRET fabriqué serait
 * une fausse déclaration, pire qu'une page absente. Le reste (hébergeur,
 * contact) est vérifiable depuis le projet lui-même.
 */
export default function MentionsLegales() {
  useEffect(() => {
    document.title = 'Mentions légales — Scroll The Date'
  }, [])

  return (
    <LegalLayout kicker="Informations légales" title="Mentions légales" lastUpdated="24 août 2026">
      <section>
        <h2>Éditeur du site</h2>
        <p>
          Le site scrollthedate.com est édité par <strong>WEANI</strong>, société par actions
          simplifiée (SAS) au capital social de 1 000 €, immatriculée au Registre du commerce et
          des sociétés de Bordeaux sous le numéro <strong>904 049 301</strong>, dont le siège
          social est situé 9 rue de Condé, Bordeaux. Numéro de TVA intracommunautaire :{' '}
          <strong>FR76 904049301</strong>.
        </p>
        <TodoBlock>
          Code postal manquant pour finaliser l'adresse (9 rue de Condé, [code postal] Bordeaux),
          et nom du directeur de la publication (dirigeant de WEANI) à compléter.
        </TodoBlock>
        <p>
          Contact :{' '}
          <a href="mailto:contact@scrollthedate.com">contact@scrollthedate.com</a>
        </p>
      </section>

      <section>
        <h2>Hébergement</h2>
        <p>
          Le site est hébergé par <strong>Railway Corporation</strong> (San Francisco,
          États-Unis) — <a href="https://railway.com" target="_blank" rel="noreferrer">railway.com</a>.
        </p>
        <p>
          Les données de production, y compris les fichiers médias transmis par les clients
          (photos, vidéos, notes vocales), sont hébergées via <strong>Supabase</strong> (base de
          données et authentification).
        </p>
      </section>

      <section>
        <h2>Propriété intellectuelle</h2>
        <p>
          L'ensemble des éléments du site (textes, mises en page, graphismes, logo, vidéos de
          démonstration) est la propriété de Scroll The Date, sauf mention contraire, et protégé
          par le droit de la propriété intellectuelle. Toute reproduction, même partielle, sans
          autorisation préalable est interdite.
        </p>
        <p>
          Le régime de propriété applicable aux créations réalisées pour un client (vidéo,
          faire-part) est précisé dans les{' '}
          <a href="/cgv">Conditions générales de vente</a>.
        </p>
      </section>

      <section>
        <h2>Données personnelles</h2>
        <p>
          Le traitement des données personnelles des utilisateurs et clients du site est détaillé
          dans notre <a href="/confidentialite">Politique de confidentialité</a>.
        </p>
      </section>

      <section>
        <h2>Crédits</h2>
        <p>Conception et réalisation : Scroll The Date.</p>
      </section>
    </LegalLayout>
  )
}
