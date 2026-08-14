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
| `SUPABASE_URL` | `https://ehenrzyesyptcyadwdjq.supabase.co` | Backend — vérifie les tokens Supabase Auth. |
| `SUPABASE_SERVICE_ROLE_KEY` | dans le `.env` local | **Jamais** préfixée `VITE_` (bypass RLS). |
| `VITE_SUPABASE_URL` | `https://ehenrzyesyptcyadwdjq.supabase.co` | Exposée au frontend, injectée au **build**. |
| `VITE_SUPABASE_ANON_KEY` | dans le `.env` local | Clé publique, safe côté client. |
| `OWNER_EMAIL` | l'email qui doit devenir admin | Reçoit le rôle "admin" automatiquement à sa première connexion réelle. |

`PORT` est fourni automatiquement par Railway, ne pas le définir manuellement.

## 3. Authentification (Supabase Auth)

Depuis le retrait de l'OAuth Kimi, l'auth est gérée par Supabase Auth
(email + mot de passe, voir `src/pages/Login.tsx`) : ça fonctionne aussi bien
en local qu'en prod, aucune dépendance à une redirection OAuth externe.

- ✅ **Site public, connexion, `/espace`, `/admin`** — tout fonctionne une fois
  les variables ci-dessus renseignées.
- Comportement par défaut de Supabase : un email de confirmation est envoyé à
  l'inscription, il faut cliquer le lien avant de pouvoir se connecter (géré
  par le service email intégré de Supabase, pas de config SMTP nécessaire à
  faible volume).
- Si les emails de confirmation/réinitialisation redirigent mal : vérifier
  **Supabase Dashboard → Authentication → URL Configuration** et y ajouter le
  domaine Railway (`https://<ton-domaine>.up.railway.app`) dans les Redirect
  URLs — réglage à faire manuellement dans le dashboard, aucun outil ne
  l'automatise ici.

## 4. Après le premier déploiement

- Railway assigne un domaine `*.up.railway.app` — utilisable tel quel ou avec
  un domaine custom (Railway → Settings → Networking).
- Le serveur relance `drizzle-kit push` + le seed idempotent à chaque boot
  (`api/db-bootstrap.ts`, en tâche de fond, sans bloquer le démarrage) — sans
  danger, les tables/policies RLS existent déjà et le seed ne duplique rien.
