/**
 * Bibliothèque des « scènes » du hero — blocs overlay narratifs proposés au
 * client les 30/09/2026 (trois maquettes : blocs mixtes faire-part/Save the
 * Date, blocs propres au Save the Date, puis une seconde série), toutes
 * conservées ("garde tout").
 *
 * Pourquoi UN seul `kind: 'scene'` plutôt que 37 kinds : ces 37 mises en
 * page consomment en réalité le même petit jeu de champs (un surtitre, un
 * titre, un sous-titre, une 3e ligne, une liste de paires, des pastilles de
 * couleur, une image) — chacune n'en utilise que 1 à 3. Un kind par bloc
 * aurait multiplié par 37 le schéma zod, le mapping de FairePart.tsx et le
 * formulaire d'admin pour la même donnée. Ici : une entrée de catalogue
 * décrit quels champs elle utilise (`fields`, qui pilote le formulaire) et
 * avec quoi les préremplir (`d`), et le rendu (HeroSceneBlocks.tsx) fait le
 * reste.
 *
 * Les prénoms, initiales et la date NE sont jamais saisis : ils viennent du
 * projet (cf. `HeroScene.a`/`b`/`initials`/`dateShort`…), comme pour le
 * monogramme.
 */

/** Champs de contenu qu'une scène peut consommer — pilote le formulaire d'admin. */
export type HeroSceneField = 'kicker' | 'title' | 'subtitle' | 'extra' | 'items' | 'colors' | 'image'

export interface HeroSceneOption {
  id: string
  label: string
  desc: string
  /** Section de la bibliothèque, pour regrouper les vignettes dans l'admin. */
  group: string
  /** Produit auquel la scène est destinée — purement indicatif dans l'admin, aucune restriction technique. */
  product: 'both' | 'fp' | 'std'
  fields: HeroSceneField[]
  /** Libellés des champs, quand « Titre »/« Sous-titre » ne veut rien dire pour cette scène. */
  labels?: Partial<Record<HeroSceneField, string>>
  /** Contenu de départ — ce que l'admin voit dès qu'il ajoute la scène. */
  d: {
    kicker?: string
    title?: string
    subtitle?: string
    extra?: string
    items?: { a: string; b: string }[]
    colors?: string[]
  }
}

/** Données d'une scène prête à afficher — cf. `HeroChapter.scene` (types.ts). */
export interface HeroScene {
  id: string
  kicker: string
  /** Les retours à la ligne (`\n`) sont rendus tels quels. */
  title: string
  subtitle: string
  extra: string
  items: { a: string; b: string }[]
  colors: string[]
  image: string
  /** Contexte du projet — jamais saisi à la main (cf. doc du fichier). */
  a: string
  b: string
  initials: string
  /** « 12 juin 2027 ». */
  dateShort: string
  /** « 12 · 06 · 2027 ». */
  dateNumeric: string
  /** ISO 8601 — pour la page de calendrier et le décompte. Vide = la scène retombe sur un repli propre. */
  dateIso: string
}

export const HERO_SCENES: HeroSceneOption[] = [
  // ---- Ouverture ----
  {
    id: 'formule',
    label: "Formule d'annonce",
    desc: 'La phrase consacrée du faire-part, en trois temps',
    group: 'Ouverture',
    product: 'both',
    fields: ['kicker', 'extra'],
    labels: { kicker: 'Phrase du dessus', extra: 'Ligne du dessous' },
    d: { kicker: 'Ont la joie de vous faire part du mariage de', extra: '' },
  },
  {
    id: 'citation',
    label: 'Citation',
    desc: "Une phrase du couple, en grand, seule à l'image",
    group: 'Ouverture',
    product: 'both',
    fields: ['title'],
    labels: { title: 'La phrase' },
    d: { title: 'On ne raterait ça pour rien au monde' },
  },
  // ---- Le couple ----
  {
    id: 'photo-polaroid',
    label: 'Photo — polaroid',
    desc: 'Un cliché incliné, légende manuscrite',
    group: 'Le couple',
    product: 'both',
    fields: ['image'],
    d: {},
  },
  {
    id: 'photo-medaillon',
    label: 'Photo — médaillon',
    desc: "Portrait ovale cerclé d'accent, esprit camée",
    group: 'Le couple',
    product: 'both',
    fields: ['image'],
    d: {},
  },
  {
    id: 'temoins',
    label: 'Les témoins',
    desc: 'La noce, en deux colonnes',
    group: 'Le couple',
    product: 'fp',
    fields: ['kicker', 'items'],
    labels: { items: 'Colonnes (intitulé / prénoms séparés par une virgule)' },
    d: {
      kicker: 'La noce',
      items: [
        { a: 'Ses témoins', b: 'Camille, Adrien' },
        { a: 'Ses témoins', b: 'Nora, Baptiste' },
      ],
    },
  },
  // ---- Notre histoire ----
  {
    id: 'jalons',
    label: 'Jalons datés',
    desc: 'Année à gauche, étape à droite, filets fins',
    group: 'Notre histoire',
    product: 'both',
    fields: ['items'],
    labels: { items: 'Jalons (année / étape)' },
    d: {
      items: [
        { a: '2019', b: 'Un premier regard, quai de Seine' },
        { a: '2024', b: 'La demande, au sommet du Puy' },
        { a: '2027', b: 'Le grand jour' },
      ],
    },
  },
  {
    id: 'millesimes',
    label: 'Millésimes',
    desc: "L'année en très grand, l'étape en capitales",
    group: 'Notre histoire',
    product: 'both',
    fields: ['items'],
    labels: { items: 'Millésimes (année / étape)' },
    d: {
      items: [
        { a: '2019', b: 'La rencontre' },
        { a: '2024', b: 'La demande' },
        { a: '2027', b: 'Le mariage' },
      ],
    },
  },
  // ---- Le lieu & le jour ----
  {
    id: 'lieu',
    label: 'Le lieu',
    desc: 'Nom du domaine, ville, repère',
    group: 'Le lieu & le jour',
    product: 'both',
    fields: ['kicker', 'title', 'subtitle'],
    labels: { title: 'Nom du lieu', subtitle: 'Adresse' },
    d: { kicker: 'Rendez-vous', title: 'Domaine\ndes Oliviers', subtitle: 'Route de Gordes\n84220 Provence' },
  },
  {
    id: 'dresscode',
    label: 'Dress code',
    desc: 'La consigne et les teintes suggérées',
    group: 'Le lieu & le jour',
    product: 'fp',
    fields: ['kicker', 'title', 'colors'],
    labels: { title: 'La consigne', colors: 'Teintes suggérées' },
    d: { kicker: 'Dress code', title: 'Élégance champêtre', colors: ['#B9A3CC', '#D8B99A', '#E8A9BC'] },
  },
  {
    id: 'infos',
    label: 'Infos pratiques',
    desc: 'Navette, hébergement, parking — en liste',
    group: 'Le lieu & le jour',
    product: 'fp',
    fields: ['items'],
    labels: { items: 'Lignes (intitulé / détail)' },
    d: {
      items: [
        { a: 'Navette', b: '17h — place du village' },
        { a: 'Hébergement', b: 'Mas des Cyprès' },
        { a: 'Parking', b: 'Sur place, gratuit' },
      ],
    },
  },
  // ---- Clôture ----
  {
    id: 'rsvp',
    label: 'RSVP',
    desc: 'La date limite, encadrée',
    group: 'Clôture',
    product: 'fp',
    fields: ['kicker', 'title', 'subtitle'],
    labels: { title: 'Date limite', subtitle: 'Mention du dessous' },
    d: { kicker: 'Répondez avant le', title: '1er mai 2027', subtitle: 'sur votre faire-part' },
  },
  {
    id: 'suite-fp',
    label: 'Faire-part à suivre',
    desc: 'La promesse de la suite — propre au Save the Date',
    group: 'Clôture',
    product: 'std',
    fields: ['title', 'subtitle'],
    d: { title: 'Le faire-part\narrive bientôt', subtitle: 'Gardez-nous la date' },
  },
  // ---- L'annonce (Save the Date) ----
  {
    id: 'hold',
    label: 'Réservez la date',
    desc: "L'impératif, en grand — le cœur du Save the Date",
    group: "L'annonce",
    product: 'std',
    fields: ['kicker', 'title', 'extra'],
    labels: { extra: "Année (vide = celle du mariage)" },
    d: { kicker: 'Save the date', title: 'Réservez\nle 12 juin', extra: '' },
  },
  {
    id: 'bilingue',
    label: 'Bilingue',
    desc: "Pour les invités étrangers d'un mariage international",
    group: "L'annonce",
    product: 'std',
    fields: ['kicker', 'title', 'extra'],
    labels: { kicker: 'En anglais', title: 'En français', extra: 'Date (vide = 12 · 06 · 2027)' },
    d: { kicker: 'Save the date', title: 'Réservez la date', extra: '' },
  },
  {
    id: 'tampon',
    label: 'Tampon de voyage',
    desc: 'Un cachet incliné, esprit passeport',
    group: "L'annonce",
    product: 'std',
    fields: ['title', 'subtitle', 'extra'],
    labels: { title: 'Mention du haut', subtitle: 'Mention du bas', extra: 'Date (vide = celle du mariage)' },
    d: { title: 'Save the date', subtitle: 'Provence', extra: '' },
  },
  {
    id: 'billet',
    label: 'Billet',
    desc: "Une invitation façon ticket d'événement",
    group: "L'annonce",
    product: 'std',
    fields: ['kicker', 'title', 'subtitle'],
    labels: { kicker: 'Mention du haut', title: 'Date (vide = celle du mariage)', subtitle: 'Lieu' },
    d: { kicker: 'Admet deux personnes', title: '', subtitle: 'Provence' },
  },
  // ---- La date, autrement ----
  {
    id: 'saison',
    label: 'Saison',
    desc: "Quand la date exacte n'est pas encore figée",
    group: 'La date, autrement',
    product: 'std',
    fields: ['kicker', 'title', 'extra'],
    labels: { title: 'La saison', extra: "Année (vide = celle du mariage)" },
    d: { kicker: 'Nous nous marions', title: 'au printemps', extra: '' },
  },
  {
    id: 'jour-semaine',
    label: 'Jour de la semaine',
    desc: 'Le jour en très grand, la date en dessous',
    group: 'La date, autrement',
    product: 'std',
    fields: ['title', 'subtitle'],
    labels: { title: 'Jour (vide = déduit de la date)', subtitle: 'Date (vide = celle du mariage)' },
    d: { title: '', subtitle: '' },
  },
  {
    id: 'mois',
    label: 'Décompte en mois',
    desc: "Plus juste qu'un décompte en jours, un an à l'avance",
    group: 'La date, autrement',
    product: 'std',
    fields: ['kicker', 'subtitle'],
    labels: { subtitle: 'Unité' },
    d: { kicker: 'Dans', subtitle: 'mois' },
  },
  // ---- Le lieu, sans l'adresse ----
  {
    id: 'region',
    label: 'Région',
    desc: 'La destination, sans rue ni domaine',
    group: "Le lieu, sans l'adresse",
    product: 'std',
    fields: ['kicker', 'title', 'subtitle'],
    labels: { title: 'Région', subtitle: 'Pays' },
    d: { kicker: 'Ce sera en', title: 'Provence', subtitle: 'France' },
  },
  {
    id: 'repere',
    label: 'Repère cartographique',
    desc: 'Une épingle stylisée et des coordonnées',
    group: "Le lieu, sans l'adresse",
    product: 'std',
    fields: ['title', 'extra'],
    labels: { title: 'Région', extra: 'Coordonnées' },
    d: { title: 'Provence', extra: '43.90° N · 5.05° E' },
  },
  // ---- Ce qu'on attend d'eux ----
  {
    id: 'conges',
    label: 'Posez vos congés',
    desc: 'La note pratique aux invités qui viennent de loin',
    group: "Ce qu'on attend d'eux",
    product: 'std',
    fields: ['title', 'subtitle'],
    d: { title: 'Pensez à poser\nvos congés', subtitle: 'Le voyage vaut le détour' },
  },
  {
    id: 'hashtag',
    label: 'Le mot-dièse',
    desc: 'Pour retrouver les photos des invités après coup',
    group: "Ce qu'on attend d'eux",
    product: 'std',
    fields: ['kicker', 'title', 'subtitle'],
    labels: { title: 'Mot-dièse (vide = déduit des prénoms)' },
    d: { kicker: 'Partagez vos photos', title: '', subtitle: 'Sur tous vos réseaux' },
  },
  {
    id: 'suite-std',
    label: 'Les détails suivront',
    desc: 'On tease, on ne dit pas tout',
    group: "Ce qu'on attend d'eux",
    product: 'std',
    fields: ['title'],
    d: { title: 'Vous saurez tout\ntrès bientôt' },
  },
  // ---- Comme au cinéma ----
  {
    id: 'bande',
    label: 'Prochainement',
    desc: "L'annonce en style bande-annonce",
    group: 'Comme au cinéma',
    product: 'both',
    fields: ['kicker', 'extra'],
    labels: { kicker: 'Mention du haut', extra: 'Date (vide = mois + année du mariage)' },
    d: { kicker: 'Prochainement', extra: '' },
  },
  {
    id: 'generique',
    label: 'Générique',
    desc: "Le casting du film, dans l'ordre d'apparition",
    group: 'Comme au cinéma',
    product: 'both',
    fields: ['items'],
    labels: { items: 'Lignes (intitulé / nom)' },
    d: {
      items: [
        { a: 'Avec', b: '' },
        { a: 'Et', b: '' },
        { a: 'Tourné en', b: 'Provence, juin 2027' },
      ],
    },
  },
  {
    id: 'affiche',
    label: 'Affiche',
    desc: 'Titre massif, distribution, mentions en bas',
    group: 'Comme au cinéma',
    product: 'both',
    fields: ['kicker', 'title', 'subtitle', 'extra'],
    labels: { kicker: 'Mention du haut', title: 'Titre', subtitle: 'Distribution', extra: 'Mentions du bas' },
    d: { kicker: '', title: 'Le plus\nbeau jour', subtitle: '', extra: 'Provence · France\nFaire-part à suivre' },
  },
  {
    id: 'clap',
    label: 'Clap',
    desc: 'Le repère de tournage — scène, prise, date',
    group: 'Comme au cinéma',
    product: 'both',
    fields: ['extra'],
    labels: { extra: 'Date (vide = celle du mariage)' },
    d: { extra: '' },
  },
  // ---- Le calendrier ----
  {
    id: 'calendrier',
    label: 'Page de calendrier',
    desc: 'Le mois, la grille, le jour entouré',
    group: 'Le calendrier',
    product: 'both',
    fields: [],
    d: {},
  },
  {
    id: 'eclat',
    label: 'Date éclatée',
    desc: 'Trois nombres, pleine largeur',
    group: 'Le calendrier',
    product: 'both',
    fields: ['subtitle'],
    d: { subtitle: 'Save the date' },
  },
  {
    id: 'jmoins',
    label: 'J−365',
    desc: 'Le décompte en style technique',
    group: 'Le calendrier',
    product: 'both',
    fields: ['kicker', 'subtitle'],
    d: { kicker: 'Compte à rebours', subtitle: 'Avant le grand jour' },
  },
  // ---- Objets du voyage ----
  {
    id: 'timbre',
    label: 'Timbre',
    desc: 'Un timbre dentelé aux initiales',
    group: 'Objets du voyage',
    product: 'std',
    fields: ['subtitle', 'extra'],
    labels: { subtitle: 'Mention du bas', extra: 'Date (vide = celle du mariage)' },
    d: { subtitle: 'Save the date', extra: '' },
  },
  {
    id: 'etiquette',
    label: 'Étiquette bagage',
    desc: 'Destination et date, œillet en haut',
    group: 'Objets du voyage',
    product: 'std',
    fields: ['kicker', 'title', 'extra'],
    labels: { title: 'Destination', extra: 'Date (vide = celle du mariage)' },
    d: { kicker: 'Destination', title: 'Provence', extra: '' },
  },
  {
    id: 'rose',
    label: 'Rose des vents',
    desc: 'Une direction, une distance',
    group: 'Objets du voyage',
    product: 'std',
    fields: ['title', 'extra'],
    labels: { title: 'Direction', extra: 'Distance & date' },
    d: { title: 'Cap sur\nProvence', extra: 'à 680 km · 12.06.2027' },
  },
  // ---- Fiançailles & histoire ----
  {
    id: 'oui',
    label: 'Elle a dit oui',
    desc: "L'annonce des fiançailles plutôt que celle de la date",
    group: 'Fiançailles & histoire',
    product: 'std',
    fields: ['title', 'subtitle'],
    d: { title: 'Elle a dit\noui', subtitle: 'Le 14 février 2026' },
  },
  {
    id: 'villes',
    label: "D'une ville à l'autre",
    desc: "Où l'on s'est rencontrés, où l'on se marie",
    group: 'Fiançailles & histoire',
    product: 'std',
    fields: ['items'],
    labels: { items: 'Étapes (intitulé / lieu)' },
    d: {
      items: [
        { a: 'Rencontrés à', b: 'Lyon' },
        { a: 'Mariés en', b: 'Provence' },
      ],
    },
  },
  {
    id: 'ans',
    label: 'Les années ensemble',
    desc: "Le chiffre qui résume l'histoire",
    group: 'Fiançailles & histoire',
    product: 'std',
    fields: ['kicker', 'title', 'subtitle'],
    labels: { title: 'Nombre', subtitle: 'Phrase du dessous' },
    d: { kicker: 'Ensemble depuis', title: '7', subtitle: 'ans — et pour\nbien plus encore' },
  },
]

export function getHeroScene(id: string | undefined): HeroSceneOption | null {
  if (!id) return null
  return HERO_SCENES.find((s) => s.id === id) ?? null
}

/** Sections de la bibliothèque, dans l'ordre d'apparition — pour regrouper les vignettes dans l'admin. */
export const HERO_SCENE_GROUPS: string[] = HERO_SCENES.reduce<string[]>(
  (acc, s) => (acc.includes(s.group) ? acc : [...acc, s.group]),
  [],
)

/** Contenu de départ d'une scène (cf. `d`) — posé au moment où l'admin choisit la mise en page. */
export function heroSceneDefaults(id: string) {
  const s = getHeroScene(id)
  return {
    kicker: s?.d.kicker ?? '',
    title: s?.d.title ?? '',
    subtitle: s?.d.subtitle ?? '',
    extra: s?.d.extra ?? '',
    items: s?.d.items ?? [],
    colors: s?.d.colors ?? [],
  }
}

/** Contexte du projet (ou du couple d'exemple) — la part de `HeroScene` qui n'est jamais saisie à la main. */
export interface HeroSceneContext {
  a: string
  b: string
  initials: string
  dateShort: string
  dateNumeric: string
  dateIso: string
}

/** Carte overlay `kind: 'scene'` + contexte → scène prête à afficher. Utilisé par les aperçus de l'admin. */
export function heroSceneFromCard(
  card: {
    sceneId: string
    sceneKicker: string
    sceneTitle: string
    sceneSubtitle: string
    sceneExtra: string
    sceneItems: { a: string; b: string }[]
    sceneColors: string[]
    sceneImage: string
  },
  ctx: HeroSceneContext,
): HeroScene {
  return {
    id: card.sceneId,
    kicker: card.sceneKicker,
    title: card.sceneTitle,
    subtitle: card.sceneSubtitle,
    extra: card.sceneExtra,
    items: card.sceneItems,
    colors: card.sceneColors,
    image: card.sceneImage,
    ...ctx,
  }
}

/** Scène remplie de son contenu de départ — pour les vignettes du choix de mise en page. */
export function heroScenePreview(o: HeroSceneOption, ctx: HeroSceneContext): HeroScene {
  return { id: o.id, image: '', ...heroSceneDefaults(o.id), ...ctx }
}
