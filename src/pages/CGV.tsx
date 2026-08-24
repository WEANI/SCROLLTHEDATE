import { useEffect } from 'react'
import LegalLayout, { TodoBlock } from '@/components/legal/LegalLayout'

/**
 * Conditions générales de vente — le contenu commercial (produits, prix,
 * délais, politique de révisions) est repris tel quel depuis le code réel
 * (cf. src/components/commerce/pricing.ts, FALLBACK_PRODUCTS/OPTIONS, et le
 * FAQ de Home.tsx pour "2 allers-retours inclus") plutôt que reformulé —
 * même principe que le reste du payload du site : jamais de chiffre
 * inventé. Les clauses sans équivalent existant dans le produit
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
  useEffect(() => {
    document.title = 'Conditions générales de vente — Scroll The Date'
  }, [])

  return (
    <LegalLayout kicker="Informations légales" title="Conditions générales de vente" lastUpdated="24 août 2026">
      <TodoBlock>
        Ce document doit être relu et validé par un professionnel du droit avant toute mise en
        ligne engageant de vrais clients — en particulier les clauses de rétractation et de
        remboursement ci-dessous, rédigées sur une base standard mais non spécifiques à votre
        situation. Le médiateur de la consommation (obligatoire, article L616-1 du Code de la
        consommation) reste également à désigner.
      </TodoBlock>

      <section>
        <h2>1. Objet</h2>
        <p>
          Les présentes conditions générales de vente (CGV) régissent les ventes de prestations
          de création de faire-part et de Save the Date numériques, réalisées par Scroll The Date
          (cf. <a href="/mentions-legales">Mentions légales</a>) auprès de particuliers, via le
          site scrollthedate.com. Toute commande implique l'acceptation sans réserve des
          présentes CGV.
        </p>
      </section>

      <section>
        <h2>2. Prestations et tarifs</h2>
        <p>Deux formules, prix unique quel que soit le nombre d'invités :</p>
        <ul>
          <li>
            <strong>Save the Date digital — 149 €</strong> : vidéo personnalisée (30–45 s), page
            d'annonce avec date et lieu, lien illimité, QR code.
          </li>
          <li>
            <strong>Faire-part digital — 349 €</strong> : vidéo cinématique complète (60–90 s),
            programme, lieu, hébergements et dress code, RSVP intégré, lien illimité, QR code.
          </li>
        </ul>
        <p>Options facultatives, cumulables :</p>
        <ul>
          <li>Révisions illimitées — 60 €</li>
          <li>Sous-titres FR/EN — 40 €</li>
          <li>Version courte réseaux sociaux — 90 €</li>
          <li>Page infos complètes — 30 €</li>
        </ul>
        <p>
          Les prix sont indiqués en euros, toutes taxes comprises. Scroll The Date se réserve le
          droit de modifier ses tarifs à tout moment ; seul le prix en vigueur au moment de la
          commande s'applique.
        </p>
      </section>

      <section>
        <h2>3. Commande et déroulé de la prestation</h2>
        <p>La commande se déroule en 4 étapes :</p>
        <ul>
          <li>Choix de la formule et paiement en ligne sécurisé.</li>
          <li>
            Questionnaire guidé et note vocale : le client fournit les éléments (histoire,
            photos, informations pratiques) nécessaires à la réalisation.
          </li>
          <li>
            Trois propositions de scénario sont soumises au client, qui en choisit une (ou
            demande des ajustements avant de choisir).
          </li>
          <li>
            Une version de la vidéo en filigrane est soumise pour validation avant toute
            livraison finale — aucune version finale n'est livrée sans l'accord du client.
          </li>
        </ul>
        <p>
          Deux allers-retours de modifications sont inclus dans le prix de chaque formule.
          L'option "Révisions illimitées" lève cette limite.
        </p>
      </section>

      <section>
        <h2>4. Délais de livraison</h2>
        <p>
          À titre indicatif, à compter de la réception du questionnaire complété par le client :
        </p>
        <ul>
          <li>Save the Date digital : environ 10 jours.</li>
          <li>Faire-part digital : environ 3 semaines (21 jours).</li>
        </ul>
        <p>
          Ces délais sont des moyennes et peuvent varier selon la charge de production et la
          réactivité du client lors des étapes de validation. Un délai de livraison plus court est
          susceptible d'être proposé sur demande, selon disponibilité.
        </p>
      </section>

      <section>
        <h2>5. Modalités de paiement</h2>
        <p>
          Le paiement s'effectue en ligne, par carte bancaire, via un prestataire de paiement
          sécurisé (Stripe), avec authentification 3D Secure. Un paiement en 3 fois sans frais est
          proposé pour les commandes à partir de 150 €.
        </p>
        <p>La totalité du prix est due au moment de la commande.</p>
      </section>

      <section>
        <h2>6. Droit de rétractation</h2>
        <p>
          Conformément à l'article L221-28 du Code de la consommation, le droit de rétractation ne
          peut être exercé pour les contrats de fourniture de biens confectionnés selon les
          spécifications du consommateur ou nettement personnalisés. Les prestations proposées
          par Scroll The Date (vidéo et page web réalisées à partir des informations, photos et
          choix de scénario propres à chaque client) relèvent de cette catégorie : le droit de
          rétractation de 14 jours prévu à l'article L221-18 du même code ne s'applique donc pas
          dès lors que la personnalisation de la commande a débuté (questionnaire transmis et/ou
          scénarios en préparation).
        </p>
        <p>
          Avant le début de cette personnalisation, le client peut annuler sa commande et obtenir
          un remboursement intégral en contactant{' '}
          <a href="mailto:contact@scrollthedate.com">contact@scrollthedate.com</a>.
        </p>
      </section>

      <section>
        <h2>7. Annulation et remboursement après le début de la prestation</h2>
        <TodoBlock>
          Politique à confirmer — la clause ci-dessous est une proposition standard, pas une
          politique déjà annoncée ailleurs sur le site.
        </TodoBlock>
        <p>
          Une fois la personnalisation engagée (questionnaire transmis, scénarios en préparation
          ou proposés), la prestation ne peut plus être annulée ni remboursée, sauf accord
          exprès de Scroll The Date ou obligation légale contraire. En cas de manquement avéré de
          Scroll The Date à ses obligations (absence de livraison, non-conformité manifeste non
          corrigée dans le cadre des allers-retours prévus), le client peut demander réparation
          dans les conditions de droit commun.
        </p>
      </section>

      <section>
        <h2>8. Propriété intellectuelle</h2>
        <p>
          À compter du paiement intégral du prix, le client dispose d'un droit d'usage personnel
          et non exclusif sur la vidéo et la page web réalisées pour lui (partage aux invités,
          diffusion privée). Scroll The Date conserve la propriété intellectuelle de ses méthodes,
          gabarits et outils de production, et peut faire état de la réalisation à des fins de
          démonstration ou de portfolio, sauf demande contraire expresse du client.
        </p>
      </section>

      <section>
        <h2>9. Responsabilité</h2>
        <p>
          Scroll The Date met en œuvre les moyens nécessaires à la bonne exécution de la
          prestation. Sa responsabilité ne saurait être engagée en cas d'inexécution due à un cas
          de force majeure, à une information erronée ou incomplète transmise par le client, ou à
          un usage du faire-part non conforme à sa destination.
        </p>
      </section>

      <section>
        <h2>10. Données personnelles</h2>
        <p>
          Le traitement des données transmises lors de la commande (coordonnées, contenu du
          questionnaire, photos, notes vocales) est décrit dans la{' '}
          <a href="/confidentialite">Politique de confidentialité</a>.
        </p>
      </section>

      <section>
        <h2>11. Réclamation et médiation</h2>
        <TodoBlock>
          Médiateur de la consommation à désigner (obligatoire pour tout professionnel vendant à
          des consommateurs en France, article L616-1 du Code de la consommation) — nom,
          coordonnées et lien vers la plateforme de médiation à ajouter ici une fois choisi.
        </TodoBlock>
        <p>
          Toute réclamation peut être adressée à{' '}
          <a href="mailto:contact@scrollthedate.com">contact@scrollthedate.com</a>. À défaut de
          résolution amiable, le client consommateur a le droit de recourir gratuitement à un
          médiateur de la consommation.
        </p>
      </section>

      <section>
        <h2>12. Droit applicable et litiges</h2>
        <p>
          Les présentes CGV sont soumises au droit français. En cas de litige non résolu à
          l'amiable, les tribunaux français compétents seront seuls saisis, sous réserve des
          règles impératives de protection du consommateur applicables.
        </p>
      </section>
    </LegalLayout>
  )
}
