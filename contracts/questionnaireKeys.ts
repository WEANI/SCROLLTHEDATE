/**
 * Identifiants réels des 12 questions ajoutées en Phase 1 du plan de
 * généralisation bespoke (cf. PLAN-GENERALISATION-THEMES.md, tenu en
 * local, non commité), dans le template actif "Questionnaire mariage v2"
 * (form_templates.id = 1, vérifié en base le 2026-08-27).
 *
 * L'éditeur admin (src/pages/admin/Formulaires.tsx) génère des IDs non
 * sémantiques (`q_<horodatage>_<n>`) pour toute question ajoutée après
 * coup — contrairement aux clés à point (`couple.prenoms`, `jourj.date`…)
 * du template d'origine, câblées à la main dans le questionnaire. Ces
 * constantes documentent ce mapping à un seul endroit, réutilisable aussi
 * bien côté client (StudioPanel, Phase 2) que côté serveur
 * (getPublicInvite, Phase 3) : si la question est un jour recréée depuis
 * l'admin (nouvel ID généré), il suffira de corriger ici plutôt que de
 * traquer les chaînes en dur dans tout le code.
 */
export const QUESTIONNAIRE_KEYS = {
  histoire: "q_mtafjoom_1",
  histoireMotsCles: "q_mtafkwdn_2",
  galeriePhoto1: "q_mtafme66_3",
  galeriePhoto2: "q_mtafn64s_4",
  galeriePhoto3: "q_mtafnfu6_5",
  programme: "q_mtafnri6_6",
  faq: "q_mtafo03e_7",
  photoLieu: "q_mtafoanc_8",
  photoOuverture: "q_mtafohy9_9",
  /** Toggle "Souhaitez-vous un fond sombre ?" — false/absent = clair, true = sombre. */
  paletteMode: "q_mtafopo1_10",
  palettePreference: "q_mtafoyxr_11",
  paletteAEviter: "q_mtafp82d_12",
} as const;
