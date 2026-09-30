---
name: hyperframes-scrollthedate
description: >
  Pont Scroll The Date par-dessus HyperFrames (framework HeyGen HTML → MP4 déterministe) pour
  composer, sous-titrer, narrer et rendre les vidéos du projet : montages hero d'un modèle Save
  the Date, teasers partageables d'un faire-part livré, et vidéos marketing du site. Utilise CE
  skill dès qu'il s'agit de monter / sous-titrer / rendre une vidéo pour Scroll The Date, de
  produire un nouveau modèle de montage (comme Red Door ou Parchemin Blanc), de fabriquer une
  séquence de frames scrubbable, ou de décliner une vidéo en 9:16 / 1:1 / 16:9. Déclenche même
  sans citer HyperFrames. Fournit la couche Scroll The Date (univers visuels, formats, contrat
  de livraison des montages, défauts FR mariage) et DÉLÈGUE le contrat technique aux skills
  HyperFrames installés. Pour GÉNÉRER les plans → seedance-cinematic-sowax. Pour préparer les
  rushes et livrer le master → ffmpeg-skill.
---

# HyperFrames × Scroll The Date

Ce skill est un **pont**. HyperFrames (framework open-source de HeyGen) transforme du **HTML en
vidéo MP4 déterministe** (rendu frame-par-frame dans Chrome headless + FFmpeg). Ce skill code
*comment Scroll The Date s'en sert* : univers visuels, formats, contrat de livraison d'un
montage hero, défauts en français. Il ne réécrit pas la doc de HyperFrames — il **s'appuie
dessus**.

Adapté du skill `hyperframes-sowax` (même architecture), mais pour un produit différent : des
**faire-part et save the date vidéo**, vendus à des couples, affichés dans un hero scrubbable au
doigt. Les contraintes qui suivent viennent du code réel du projet, pas d'une charte supposée.

## LA règle à ne jamais enfreindre

> **Sur un montage hero, les textes ne sont JAMAIS incrustés dans la vidéo.**

Les prénoms, la date, « Save the date », le monogramme, le compte à rebours, le programme : tout
cela est du **HTML superposé**, rendu par `HeroScrub` par-dessus la vidéo, réglé bloc par bloc
depuis l'admin (`src/pages/admin/ModeleStdDetail.tsx`) et **différent pour chaque couple**. Un
montage livré avec « Anna & Théo » gravé dedans est inutilisable : il faudrait un montage par
client.

Un texte n'est incrusté que dans deux cas, jamais ailleurs :
- un **teaser partageable** (le couple partage un MP4 sur WhatsApp — là, tout est figé) ;
- une **vidéo marketing** (site, réseaux sociaux — aucun rapport avec un projet client).

## Séparation des responsabilités

| Besoin | Qui s'en occupe |
|---|---|
| Générer un plan cinématique (texte→vidéo) | skill **seedance-cinematic-sowax** (Higgsfield/Seedance) |
| Contrat de composition (data-*, clips, tracks, keyframes, adapters) | skills **HyperFrames** installés (`/hyperframes-core`, `/hyperframes-animation`) |
| Audio / voiceover / transcription / captions **dans la composition** | skill **HyperFrames** `/hyperframes-media` |
| Univers visuel, format, contrat de livraison d'un montage, défauts FR | **CE skill** |
| Installer HyperFrames en local | l'utilisateur, dans son terminal (voir Étape 0) |
| Préparer les rushes (recadrer, trimmer, fps constant, HDR→SDR, proxy) | skill **ffmpeg-skill** |
| Extraire la séquence de frames scrubbables, livrer le master | skill **ffmpeg-skill** |

Règle d'or : quand un détail relève du contrat HyperFrames (comment déclarer un keyframe
seek-safe, quel adapter, quelle option de render), **ne l'invente pas** — lis le skill
HyperFrames concerné. Ce skill dit *quoi produire pour Scroll The Date*, pas *comment
HyperFrames fonctionne*.

## Étape 0 — Vérifier que HyperFrames est disponible

Avant toute composition, vérifier sa présence (dépendance `hyperframes`, dossier de skills
`/hyperframes*`, ou `CLAUDE.md` qui le référence).

- **Si présent** : lire d'abord le skill routeur `/hyperframes`, puis continuer.
- **Si absent** : ne pas l'installer à distance. Indiquer la commande à lancer en local :
  ```bash
  npx skills add heygen-com/hyperframes --all   # prérequis : Node.js 22+ et FFmpeg
  ```

## Les univers visuels

Les templates de composition sont **agnostiques** : aucune couleur en dur, ils lisent des
**variables CSS**. Un univers = un fichier de tokens. Changer d'univers = changer un import.

| Slug | Quand l'utiliser | Ambiance |
|---|---|---|
| `scrollthedate` | Vidéos marketing : site, Instagram, publicité | Terracotta sur anthracite, Fraunces |
| `red-door` | Montage / teaser du modèle Red Door | Rouge profond, dorures, opulent |
| `parchemin-blanc` | Modèle Parchemin Blanc | Ivoire, satin, or discret — clair |
| `parchemin-rose` | Modèle Parchemin Rose | Rose poudré, cuivre — clair |

Les valeurs des trois univers de modèles sont **exactement** celles de
`contracts/saveTheDateTemplates.ts` (`RED_DOOR_THEME` et consorts) : un teaser doit être
indiscernable de la page publique. Si un thème change dans le code, mettre à jour le `tokens.css`
correspondant — le code fait foi, pas ce skill.

Contrat de tokens et chargement : **`references/univers.md`**.

## Formats

| Usage | Ratio | `data-width`×`data-height` | fps | Notes |
|---|---|---|---|---|
| **Montage hero** (modèle Save the Date) | 9:16 | 1080 × 1920 | 30 | + séquence de frames à 12 fps, voir contrat de livraison |
| Teaser partageable (WhatsApp, SMS) | 9:16 | 1080 × 1920 | 30 | textes incrustés, 10–20 s |
| Reels / TikTok / Stories (marketing) | 9:16 | 1080 × 1920 | 30 | safe-area : ~220 px haut, ~320 px bas |
| Feed Instagram (marketing) | 1:1 | 1080 × 1080 | 30 | |
| Hero du site / YouTube | 16:9 | 1920 × 1080 | 30 | |

Le 9:16 est le format de référence : le produit vit sur un téléphone, tenu à la verticale.
Détails et safe-areas : **`references/formats.md`**.

## Contrat de livraison d'un montage hero

C'est la partie la plus spécifique au projet. Un nouveau modèle Save the Date n'est pas « une
vidéo » : c'est un ensemble de fichiers et une entrée de catalogue, sans quoi le hero ne sait pas
le scrubber. Procédure complète, nommage, calcul du nombre de frames et déclaration dans
`SAVE_THE_DATE_TEMPLATES` : **`references/montage-hero.md`**.

En résumé, un modèle livré = ① `public/<slug>.mp4` (fps constant, keyframes serrées) ②
`public/<slug>-frames/00001.jpg…` à 12 fps ③ l'entrée `frames: { baseUrl, count, fps }` dans
`contracts/saveTheDateTemplates.ts` ④ un `HeroTheme` cohérent avec le montage.

## Routing — quel workflow HyperFrames pour quel job

Toujours lire `/hyperframes` d'abord (il tranche le routing). Traduction Scroll The Date :

| Job | Workflow HyperFrames |
|---|---|
| Teaser d'un faire-part livré (à partager par le couple) | `/product-launch-video` |
| Vidéo de présentation d'une offre (149 €, 99 €) | `/product-launch-video` |
| Démo du site / tour de l'espace client | `/website-to-video` |
| Explication du parcours (« comment ça marche », 4 étapes) | `/faceless-explainer` |
| Annonce d'un nouveau modèle de montage | `/pr-to-video` |

Si le sujet est indéterminé (pas de projet, pas de modèle, pas d'asset), demander avant d'entrer
dans un workflow — s'engager dans un workflow EST la décision de routing.

## Handoff Seedance → HyperFrames

Seedance **génère** les plans cinématiques, HyperFrames les **monte** de façon déterministe. Pour
un montage hero, la vidéo générée est le fond ; les textes viennent par-dessus au runtime (cf. LA
règle). Pour un teaser, tout est monté et figé.

Principe : un clip devient un `<video class="clip">` sur une piste, avec `data-start`,
`data-duration`, `data-track-index`. La lecture est **pilotée par le framework** (seek-safe) — ne
jamais lancer la vidéo soi-même en JS ni dépendre de l'horloge murale.

Procédure détaillée dans **`references/montage-hero.md`** (section « Depuis un plan Seedance »).

## Routage FFmpeg

> **Amont** — tout fichier média *avant* qu'il devienne un `<video class="clip">` : `ffmpeg-skill`.
> **Composition** — timeline, texte, marque, animation, TTS : **HyperFrames**.
> **Aval** — tout ce qui touche le MP4 *après* `npx hyperframes render` : `ffmpeg-skill`.

Ne jamais écrire de ligne `ffmpeg` brute dans un livrable. Discipline **probe-first / verify-last** :
`probe` sur chaque entrée avant de planifier ; après tout outil visuel (`fit`, `color`, `proxy`),
relancer `probe` **et** `look` sur la sortie et regarder le PNG ; `--json` dès que la sortie est
réutilisée en aval.

| Besoin | Commande |
|---|---|
| Connaître un rush (durée, fps, VFR, colorimétrie) | `python3 scripts/probe.py clip.mp4` |
| Planche contact de référence | `python3 scripts/look.py clip.mp4 --tiles 4x3 -o ref.png` |
| Recadrer un 16:9 en 9:16 sans letterbox | `python3 scripts/fit.py clip.mp4 --aspect 9:16 --fit crop --json` |
| **Forcer un fps constant** (le VFR casse le scrub) | `python3 scripts/fit.py clip.mp4 --fps 30 --json` |
| BT.2020/PQ → SDR BT.709 | `python3 scripts/color.py clip.mp4 --json` |
| Proxy léger pour itérer en preview | `python3 scripts/proxy.py clip.mp4 --width 640 --json` |

**Aval**, dans l'ordre : `loudness.py -I -14 --tp -1` → `export.py --preset reels` →
`check.py --platform tiktok` → `report.py`. Les lignes de `check` en `kind=judgement` se tranchent
avec l'utilisateur, jamais silencieusement.

**Sous-titres** : par défaut dans la composition HyperFrames (ils lisent les tokens et respectent
la safe-area). `ffmpeg-skill/caption` uniquement pour un burn-in a posteriori sur un master déjà
rendu.

## Défauts français

- **Langue** : français. Le site est bilingue FR/EN (cf. `src/i18n/`), mais les vidéos sont
  produites en français d'abord ; une version EN se décline avec les mêmes compositions.
- **Ton** : chaleureux, sobre, jamais mièvre. Vouvoiement pour le marketing, tutoiement proscrit.
  On s'adresse à un couple qui prépare le plus beau jour de sa vie, pas à un acheteur.
- **Devise** : euro (149 €, 99 €, 299 €). Pas de FCFA, pas de Mobile Money, pas de référence
  CEMAC — ce projet est français.
- **Dates** : format français (« 12 juin 2027 »). La bibliothèque de formats de date du projet
  (`HERO_DATE_FORMATS`, `src/components/hero-scrub/heroDecor.ts`) fait foi si un format stylisé
  est demandé.
- **Polices** : la bibliothèque du projet (`HERO_FONTS`, même fichier) est la source de vérité —
  Great Vibes, Cinzel, Cormorant Garamond, Playfair Display… Ne pas introduire une police qui
  n'y figure pas sans raison.

## Discipline de rendu (rappels du contrat HyperFrames)

**« Rule of Three »**
1. Racine : `data-composition-id`, `data-width`, `data-height`.
2. Éléments timés : `class="clip"` + `data-start`, `data-duration`, `data-track-index`.
3. Animations GSAP : créées en `{ paused: true }` et enregistrées sur `window.__timelines`.

**Déterminisme** : jamais de `Date.now()`, jamais de `Math.random()` non seedé, aucune dépendance
réseau au render (polices et médias figés localement).

```bash
npx hyperframes init <projet>
npx hyperframes preview
npx hyperframes render --output final.mp4
```

## Livrables attendus

1. La **composition HTML** (un template de `assets/templates/` instancié, important le
   `tokens.css` de l'univers), conforme à la Rule of Three.
2. Le **script de voiceover FR** si narration, et la note de sous-titres.
3. Pour un montage hero : le **contrat de livraison** rempli (fichiers + entrée de catalogue).
4. Un **récap FR** : univers, format(s), workflow utilisé, clips intégrés, commande de render.

Ne jamais rendre le MP4 depuis un contexte distant (pas de Chrome de rendu ici) : livrer la
composition et la commande, le rendu se fait en local.

## Ressources

- `references/univers.md` — contrat de tokens, table des univers, chargement.
- `references/formats.md` — formats, safe-areas, déclinaison.
- `references/montage-hero.md` — contrat de livraison d'un modèle, frames scrubbables, handoff Seedance.
- `assets/univers/<slug>/tokens.css` + `frame.md` — les 4 univers.
- `assets/templates/*.html` — compositions agnostiques (teaser 9:16, hero 16:9, explainer 1:1).
