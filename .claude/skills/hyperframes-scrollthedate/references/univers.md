# Univers visuels — Scroll The Date

Objectif : une vidéo change d'identité en changeant **un seul import**. Les templates ne
connaissent aucun univers ; ils lisent des variables CSS. Chaque univers fournit ces variables.

## Contrat de tokens

Tout `assets/univers/<slug>/tokens.css` DOIT définir ce jeu de variables sur `:root`. Les
templates n'utilisent que ces noms — ne pas en inventer d'autres sans les ajouter ici, sinon un
template tombera sur une variable vide.

```css
:root {
  /* Couleurs */
  --brand-bg:        /* fond principal de composition */;
  --brand-surface:   /* cartes, panneaux */;
  --brand-ink:       /* texte principal (sur bg) */;
  --brand-ink-soft:  /* texte secondaire */;
  --brand-primary:   /* accent n°1 (titres, filets) */;
  --brand-secondary: /* accent n°2 */;
  --brand-on-primary:/* texte posé sur --brand-primary */;

  /* Typographie */
  --brand-font-display: /* titres */;
  --brand-font-body:    /* corps */;
  --brand-weight-display: 300;
  --brand-weight-body:    400;

  /* Forme */
  --brand-radius: /* rayon des cartes, ex 12px */;
  --brand-shadow: /* ombre portée */;

  /* Logo */
  --brand-logo-url: /* chemin local du lockup, ou vide si texte seul */;
}
```

## Les 4 univers

| Slug | Usage | Fond | Accent | Clair/sombre |
|---|---|---|---|---|
| `scrollthedate` | Marketing (site, Instagram, pub) | `#1B1B1E` | `#C96F5A` | sombre |
| `red-door` | Modèle Red Door | `#1A0A0A` | `#D4AF6A` | sombre |
| `parchemin-blanc` | Modèle Parchemin Blanc | `#F5EEDE` | `#B8934A` | **clair** |
| `parchemin-rose` | Modèle Parchemin Rose | `#F7E4DC` | `#C08769` | **clair** |

**Piège à ne pas rater** : deux des trois modèles sont CLAIRS. Un texte ivoire, parfait sur Red
Door, devient illisible sur un parchemin. Toujours vérifier `--brand-ink` avant de composer, ne
jamais supposer « fond sombre, texte clair ».

## Source de vérité

Les trois univers de modèles reprennent **exactement** les `HeroTheme` de
`contracts/saveTheDateTemplates.ts` (`RED_DOOR_THEME`, `PARCHEMIN_BLANC_THEME`,
`PARCHEMIN_ROSE_THEME`). Un teaser doit être indiscernable de la page publique du modèle.

Correspondance des noms :

| Token du skill | Champ du `HeroTheme` |
|---|---|
| `--brand-bg` | `frameBg` |
| `--brand-surface` | `cardBg` |
| `--brand-ink` | `textPrimary` |
| `--brand-ink-soft` | `textSecondary` |
| `--brand-primary` | `accent` |

Si un thème change dans le code, mettre à jour le `tokens.css` correspondant. **Le code fait foi.**

## Charger un univers dans un template

```html
<link rel="stylesheet" href="../univers/red-door/tokens.css">
```

Un seul import par composition. Pour décliner une vidéo sur un autre modèle, changer cette ligne —
rien d'autre.

## Polices & déterminisme

Ne jamais charger une police par `@import` réseau au render. HyperFrames réécrit les Google Fonts
en copies locales ; déclarer les familles dans `--brand-font-*` et laisser le pipeline figer.

La bibliothèque de polices du projet (`HERO_FONTS` dans
`src/components/hero-scrub/heroDecor.ts`, une trentaine de familles classées par catégorie) est la
**source de vérité** : calligraphies mariage, capitales gravées, serifs éditoriaux. Toutes sont
des Google Fonts, donc compatibles avec le pipeline. Ne pas introduire une police absente de cette
liste sans raison — elle ne serait proposable ni dans l'admin ni dans le studio.
