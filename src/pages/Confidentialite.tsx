import { useEffect } from 'react'
import LegalLayout, { TodoBlock } from '@/components/legal/LegalLayout'

/**
 * Politique de confidentialité — catégories de données et sous-traitants
 * repris des schémas/routers réels du projet (db/schema.ts, api/rsvpRouter.ts,
 * api/mediaRouter.ts, api/context.ts), pas d'une liste générique : c'est
 * précisément le défaut relevé à l'audit (une page qui n'existe pas du
 * tout) — autant que celle qui existe décrive la vraie collecte de
 * données plutôt qu'un texte passe-partout copié d'ailleurs.
 */
export default function Confidentialite() {
  useEffect(() => {
    document.title = 'Politique de confidentialité — Scroll The Date'
  }, [])

  return (
    <LegalLayout kicker="Informations légales" title="Politique de confidentialité" lastUpdated="24 août 2026">
      <TodoBlock>
        Nom du responsable du traitement à compléter avec le nom du dirigeant de WEANI, cf.{' '}
        <a href="/mentions-legales">Mentions légales</a>.
      </TodoBlock>

      <section>
        <h2>Responsable du traitement</h2>
        <p>
          Les données personnelles collectées sur scrollthedate.com sont traitées par{' '}
          <strong>WEANI</strong> (SAS, RCS Bordeaux 904 049 301), éditrice du site — cf.{' '}
          <a href="/mentions-legales">Mentions légales</a> pour l'identité complète.
        </p>
      </section>

      <section>
        <h2>Données collectées</h2>
        <p>Selon votre usage du site, les données suivantes sont collectées :</p>
        <ul>
          <li>
            <strong>Compte client</strong> : nom, adresse email, mot de passe (géré par notre
            prestataire d'authentification, jamais stocké en clair par nos soins).
          </li>
          <li>
            <strong>Commande</strong> : prénoms, date et lieu du mariage, formule et options
            choisies. Le paiement par carte bancaire est traité directement par notre
            prestataire de paiement (Stripe) — les coordonnées bancaires ne transitent jamais
            par nos serveurs et ne sont pas conservées par WEANI.
          </li>
          <li>
            <strong>Questionnaire</strong> : histoire du couple, informations pratiques du
            mariage (lieu, horaires, dress code), photos et notes vocales transmises pour la
            réalisation de la vidéo.
          </li>
          <li>
            <strong>Réponses des invités (RSVP)</strong> : nom, email (facultatif), réponse de
            présence, allergies/régime alimentaire, chanson demandée, message libre — transmis
            par les invités du client sur la page faire-part.
          </li>
          <li>
            <strong>Messagerie</strong> : échanges entre le client et notre équipe au sujet de
            son projet.
          </li>
        </ul>
      </section>

      <section>
        <h2>Finalités du traitement</h2>
        <ul>
          <li>Gestion du compte client et de la commande.</li>
          <li>Réalisation de la vidéo et de la page faire-part commandées.</li>
          <li>Gestion des réponses RSVP pour le compte du client.</li>
          <li>Communication relative au projet (email, messagerie interne).</li>
          <li>Respect de nos obligations légales et comptables.</li>
        </ul>
      </section>

      <section>
        <h2>Base légale</h2>
        <p>
          Le traitement repose sur l'exécution du contrat (commande, réalisation de la
          prestation), sur le consentement (données transmises volontairement par les invités via
          le formulaire RSVP) et, le cas échéant, sur le respect d'obligations légales
          (comptabilité, facturation).
        </p>
      </section>

      <section>
        <h2>Destinataires et sous-traitants</h2>
        <p>Les données sont hébergées et traitées par les prestataires suivants :</p>
        <ul>
          <li>
            <strong>Supabase</strong> — authentification des comptes, base de données et
            stockage des fichiers médias transmis (photos, vidéos, notes vocales).
          </li>
          <li>
            <strong>Railway</strong> — hébergement de l'application.
          </li>
          <li>
            <strong>Resend</strong> — envoi des emails transactionnels (confirmation de
            commande, notifications de suivi de projet).
          </li>
          <li>
            <strong>Stripe</strong> — traitement des paiements par carte bancaire.
          </li>
        </ul>
        <p>
          Aucune donnée n'est vendue ni cédée à des tiers à des fins commerciales ou
          publicitaires.
        </p>
      </section>

      <section>
        <h2>Durée de conservation</h2>
        <TodoBlock>
          Durées précises à confirmer avec un professionnel du droit — la proposition ci-dessous
          est une base standard, pas une politique déjà arrêtée.
        </TodoBlock>
        <p>
          Les données du compte et de la commande sont conservées le temps de la relation
          commerciale, puis archivées le temps requis par les obligations légales et comptables
          (10 ans pour les documents comptables). Les données du questionnaire (photos, notes
          vocales, histoire du couple) sont conservées le temps nécessaire à la réalisation et à
          la disponibilité du faire-part en ligne, puis supprimées ou anonymisées sur demande.
        </p>
      </section>

      <section id="cookies">
        <h2>Cookies et traceurs</h2>
        <p>
          Le site ne dépose <strong>aucun cookie ni traceur soumis à consentement</strong>
          (pas de mesure d'audience, pas de publicité, pas de traceur de réseau social — vérifié
          dans le code du site, pas une simple déclaration d'intention).
        </p>
        <p>
          Le seul mécanisme technique en jeu est le stockage de votre session de connexion
          (maintenu par notre prestataire d'authentification, Supabase, via le stockage local de
          votre navigateur — pas même un cookie HTTP au sens strict). Il n'est posé que lorsque
          vous créez un compte ou vous connectez, c'est-à-dire un service que vous demandez
          explicitement. Conformément aux recommandations de la CNIL, les traceurs strictement
          nécessaires à un service expressément demandé par l'utilisateur — dont l'authentification
          — sont exemptés de consentement préalable : c'est pourquoi vous ne voyez pas de bandeau
          "Accepter / Refuser" sur ce site, il n'y a rien à accepter ou refuser.
        </p>
        <p>
          Si un outil de mesure d'audience ou publicitaire venait à être ajouté au site, un
          recueil de consentement conforme (refus aussi simple que l'acceptation) serait mis en
          place avant son activation.
        </p>
      </section>

      <section>
        <h2>Vos droits</h2>
        <p>
          Conformément au Règlement général sur la protection des données (RGPD) et à la loi
          Informatique et Libertés, vous disposez d'un droit d'accès, de rectification,
          d'effacement, de limitation, d'opposition et de portabilité sur vos données
          personnelles. Vous pouvez exercer ces droits en écrivant à{' '}
          <a href="mailto:contact@scrollthedate.com">contact@scrollthedate.com</a>.
        </p>
        <p>
          Vous disposez également du droit d'introduire une réclamation auprès de la CNIL
          (
          <a href="https://www.cnil.fr" target="_blank" rel="noreferrer">
            cnil.fr
          </a>
          ) si vous estimez que le traitement de vos données n'est pas conforme à la
          réglementation.
        </p>
      </section>
    </LegalLayout>
  )
}
