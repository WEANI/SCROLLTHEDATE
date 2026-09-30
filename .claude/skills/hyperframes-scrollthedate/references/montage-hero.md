# Contrat de livraison d'un montage hero

C'est la partie la plus spécifique au projet. Un nouveau modèle Save the Date n'est pas « une
vidéo » : sans les bons fichiers et la bonne entrée de catalogue, le hero ne sait pas le scrubber
et la page reste noire.

## Pourquoi une séquence de frames

`HeroScrub` (`src/components/hero-scrub/HeroScrub.tsx`) fait avancer le montage **au rythme du
scroll**, pas du temps. Sur mobile, chercher une position dans un MP4 à chaque mouvement du pouce
est trop lent et saccade. Le composant lit donc une **séquence d'images JPG** préchargée, et ne
garde le MP4 que comme repli.

Conséquence : livrer le MP4 seul ne suffit pas. Il faut les deux.

## Les 4 livrables

### ① `public/<slug>.mp4`

Le montage complet, 1080 × 1920, **fps constant** (le VFR casse le seek), keyframes serrées.

```bash
python3 scripts/probe.py montage.mp4                    # vérifier fps réel et VFR
python3 scripts/fit.py montage.mp4 --fps 30 --json      # forcer le fps si besoin
```

### ② `public/<slug>-frames/00001.jpg` …

La séquence scrubbable, **à 12 fps**, numérotée sur 5 chiffres à partir de `00001`.

```bash
ffmpeg -i montage.mp4 -vf fps=12 -q:v 4 public/<slug>-frames/%05d.jpg
```

> C'est l'une des rares lignes `ffmpeg` brutes admises dans ce projet : `ffmpeg-skill` n'a pas
> d'outil d'export en séquence d'images. Tout le reste passe par le contrat.

Compter les fichiers produits — c'est ce nombre exact qui va dans le catalogue :

```bash
ls public/<slug>-frames/ | wc -l
```

### ③ L'entrée dans `contracts/saveTheDateTemplates.ts`

```ts
{
  slug: 'mon-modele',
  name: 'Mon Modèle',
  tagline: 'Une phrase courte pour la carte de la bibliothèque.',
  description: "Deux à trois lignes pour la page de détail du modèle.",
  theme: MON_MODELE_THEME,
  frames: { baseUrl: '/mon-modele-frames/', count: 294, fps: 12 },
  desktopSrc: '/mon-modele.mp4',
  posterSrc: '/mon-modele-frames/00001.jpg',
  chapters: [ /* 2 chapitres : "Save the date", puis prénoms + date */ ],
}
```

**`count` doit être exact.** Un `count` trop grand fait chercher des images qui n'existent pas
(le montage se fige) ; trop petit, la fin du montage est inatteignable. La durée s'en déduit :
`count / fps` — c'est ce que `templateDurationSec()` calcule, et ce que l'admin affiche.

### ④ Un `HeroTheme` cohérent

Dans le même fichier. Les 8 couleurs doivent être relevées **sur le montage lui-même**, pas
choisies au jugé : `accent` sur une dorure du film, `textPrimary` lisible sur les plans où les
textes se posent. Reporter ensuite ces valeurs dans
`.claude/skills/hyperframes-scrollthedate/assets/univers/<slug>/tokens.css`.

## Réserver la place des textes

Les blocs (« Save the date », prénoms & date, monogramme, compte à rebours, programme) se posent
en HTML par-dessus, au tiers haut, milieu ou bas selon le réglage admin. Le montage doit donc
offrir, sur les plans concernés, **une zone calme** : pas de motif chargé, pas de contraste
violent, une luminosité stable sur 1 à 2 secondes.

Deux pièges déjà rencontrés sur Red Door :
- un **plan clair** (miroir, marbre) sous un texte réglé en sombre → le texte disparaît ;
- un **fond très saturé** derrière une carte translucide → la carte vire à l'orangé.

Les timings par défaut des deux chapitres se règlent ensuite dans l'admin (« Caler ici » sur la
timeline), pas en dur dans le code.

## Depuis un plan Seedance

1. **Générer** les plans avec `seedance-cinematic-sowax` (Higgsfield). Un montage = souvent un
   seul plan continu de 25–30 s, pas une succession de coupes : le scrub supporte mal les cuts
   secs, l'utilisateur perd le fil.
2. **Préparer le rush** (`ffmpeg-skill`) : `probe` d'abord, puis `fit --aspect 9:16 --fit crop` si
   le plan est en 16:9, `color` si le rush est en BT.2020/PQ (sinon délavé dans Chrome headless),
   `fit --fps 30` pour le fps constant.
3. **Composer** avec HyperFrames si le montage enchaîne plusieurs plans : chaque clip devient un
   `<video class="clip">` avec `data-start` / `data-duration` / `data-track-index`. Ne jamais
   piloter la lecture en JS — le framework s'en charge (seek-safe).
4. **Rendre** en local : `npx hyperframes render --output montage.mp4`.
5. **Extraire les frames** (② ci-dessus), compter, déclarer (③), relever les couleurs (④).

## Vérification avant de déclarer le modèle terminé

- [ ] `probe` du MP4 : fps constant, 1080 × 1920, SDR BT.709.
- [ ] `ls | wc -l` sur le dossier de frames = le `count` déclaré.
- [ ] `posterSrc` pointe sur une image qui existe (`00001.jpg`).
- [ ] La page publique `/save-the-date-modeles/<slug>` scrolle sans à-coup sur un vrai téléphone.
- [ ] Les deux blocs de texte sont lisibles là où ils tombent, dans les deux réglages de couleur.
- [ ] Aucun prénom ni date n'est incrusté dans l'image.
