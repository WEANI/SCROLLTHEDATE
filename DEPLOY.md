# Déploiement Railway

Le repo est prêt pour Railway (Nixpacks, aucun Dockerfile requis) :
[railway.json](railway.json) fixe explicitement `npm run build` / `npm start` +
un healthcheck sur `/api/health`. `package.json` épingle `engines.node >=22`.

Build de production vérifié en local : `npm run build` produit
`dist/public` (client Vite) + `dist/boot.js` (serveur Hono/tRPC bundlé via
esbuild) ; `npm start` sert les deux sur `$PORT` et interroge bien Supabase.

## 1. Créer le service

```bash
railway login          # ouvre le navigateur pour l'auth
railway init            # ou : railway link, si le projet Railway existe déjà
railway up               # premier déploiement depuis ce dossier
```

Ou, plus simple : sur [railway.app](https://railway.app), **New Project → Deploy
from GitHub repo → WEANI/SCROLLTHEDATE**. Railway détecte `railway.json`
automatiquement.

## 2. Variables d'environnement à définir dans Railway

Aucune n'est dans le repo (`.env` est gitignore). À copier dans
**Railway → Service → Variables** :

| Variable | Valeur | Note |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres.ehenrzyesyptcyadwdjq:<mot-de-passe>@aws-1-eu-west-1.pooler.supabase.com:5432/postgres` — mot de passe dans le `.env` local (jamais commité). | **Session Pooler Supabase**, pas la connexion directe : Railway est IPv4-only par défaut et la connexion directe Supabase (`db.<ref>.supabase.co:5432`) est IPv6-only. Le shard de ce projet est `aws-1-` (vérifié par connexion réelle — la doc générique Supabase montre souvent `aws-0-`, ne pas supposer). |
| `APP_ID` | `felicity-local` (ou autre) | Libre en l'absence de vraie intégration Kimi. |
| `APP_SECRET` | à générer : `openssl rand -hex 32` | **Ne pas réutiliser la valeur dev** (`dev-local-secret-change-me`) — sert à signer les JWT de session. |
| `KIMI_AUTH_URL` | `https://auth.kimi.com` | Doit être une URL valide (le code fait `new URL()` au chargement) même si le service reste injoignable — voir point 3. |
| `KIMI_OPEN_URL` | `https://open.kimi.com` | Idem. |
| `VITE_KIMI_AUTH_URL` | vide ou `https://auth.kimi.com` | Exposée au frontend, injectée au **build**. |
| `VITE_APP_ID` | `felicity-local` | Idem, injectée au build. |
| `OWNER_UNION_ID` | vide ou le unionId admin | Optionnel — auto-attribution du rôle admin au 1er login. |

`PORT` est fourni automatiquement par Railway, ne pas le définir manuellement.

## 3. Ce qui fonctionnera / ne fonctionnera pas après déploiement

- ✅ **Site public** (Accueil avec héros scroll-scrub, Offres, Démo) — 100 %
  fonctionnel, aucune dépendance bloquante.
- ✅ **API/DB** — toutes les routes tRPC qui lisent/écrivent Supabase
  fonctionnent (vérifié en local en conditions de prod).
- ❌ **Connexion, `/espace`, `/admin`** — l'authentification est branchée sur
  l'OAuth propriétaire "Kimi" (la plateforme qui a généré ce code). Sans vrai
  `APP_ID`/`APP_SECRET` Kimi enregistrés avec l'URL de callback Railway
  (`https://<ton-domaine>.up.railway.app/api/oauth/callback`), le login ne
  peut pas aboutir. Il faudra soit obtenir ces identifiants, soit remplacer ce
  bloc auth par un système propre (email magic link, Supabase Auth, etc.) —
  travail séparé, pas fait ici.

## 4. Après le premier déploiement

- Railway assigne un domaine `*.up.railway.app` — utilisable tel quel ou avec
  un domaine custom (Railway → Settings → Networking).
- Le serveur relance `drizzle-kit push` + le seed idempotent à chaque boot
  (`api/db-bootstrap.ts`, en tâche de fond, sans bloquer le démarrage) — sans
  danger, les tables/policies RLS existent déjà et le seed ne duplique rien.
