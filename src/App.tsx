import { Routes, Route, Navigate, useLocation, useNavigationType } from 'react-router'
import { Suspense, lazy, useEffect, useLayoutEffect } from 'react'
import { startSiteTracking, trackPageview } from '@/lib/analytics'
import Layout from '@/components/Layout'
import Home from '@/pages/Home'
/**
 * Pages publiques chargées à la demande, sauf l'accueil (22/10/2026) : le
 * bundle initial pesait encore 1,7 Mo — paiement Stripe, hero des
 * faire-part, démos, textes légaux — téléchargés par chaque visiteur avant
 * de voir l'accueil. Les Suspense sont posés dans Layout (Navbar et Footer
 * restent affichés) et autour de <Routes> pour les pages hors Layout.
 */
const Login = lazy(() => import('@/pages/Login'))
const DefinirMotDePasse = lazy(() => import('@/pages/DefinirMotDePasse'))
const NotFound = lazy(() => import('@/pages/NotFound'))
const Offres = lazy(() => import('@/pages/Offres'))
const FairePartDigital = lazy(() => import('@/pages/FairePartDigital'))
const SaveTheDateDigital = lazy(() => import('@/pages/SaveTheDateDigital'))
const SaveTheDateTemplates = lazy(() => import('@/pages/SaveTheDateTemplates'))
const SaveTheDateTemplatePreview = lazy(() => import('@/pages/SaveTheDateTemplatePreview'))
const Commander = lazy(() => import('@/pages/Commander'))
const Merci = lazy(() => import('@/pages/Merci'))
const MentionsLegales = lazy(() => import('@/pages/MentionsLegales'))
const CGV = lazy(() => import('@/pages/CGV'))
const Confidentialite = lazy(() => import('@/pages/Confidentialite'))
const Demo = lazy(() => import('@/pages/Demo'))
const DemoInfos = lazy(() => import('@/pages/DemoInfos'))
const DemoFairePart = lazy(() => import('@/pages/DemoFairePart'))
const DemoFairePart1 = lazy(() => import('@/pages/DemoFairePart1'))
const DemoFairePart2 = lazy(() => import('@/pages/DemoFairePart2'))
const FairePartCamilleAdrien = lazy(() => import('@/pages/FairePartCamilleAdrien'))
const FairePart = lazy(() => import('@/pages/FairePart'))

/**
 * /espace/* et /admin/* chargés à la demande (`React.lazy`) plutôt que dans
 * le bundle public initial — mesuré le 04/10/2026 : ces 20 composants (dont
 * StudioPanel et ModeleStdDetail, les plus gros fichiers du projet, jamais
 * ouverts par un visiteur de l'accueil) représentaient une bonne part des
 * 2,85 Mo du bundle unique, téléchargés par CHAQUE visiteur public avant de
 * pouvoir voir la vitrine. Aucun des composants ci-dessous n'est importé
 * ailleurs dans l'app (vérifié) : ce découpage ne duplique rien dans un
 * autre chunk, il retire simplement ce bloc du chemin public.
 *
 * `LegacyRedirect` (export nommé de ProductSpace, pas un composant de page)
 * reste un import normal — lazy() ne s'applique qu'à des exports par défaut.
 */
const ClientShell = lazy(() => import('@/components/espace/ClientShell'))
const TableauDeBord = lazy(() => import('@/pages/espace/TableauDeBord'))
const Questionnaire = lazy(() => import('@/pages/espace/Questionnaire'))
const Projet = lazy(() => import('@/pages/espace/Projet'))
const PersonnalisationClient = lazy(() => import('@/pages/espace/Personnalisation'))
const CommandesClient = lazy(() => import('@/pages/espace/Commandes'))
const MessagesClient = lazy(() => import('@/pages/espace/Messages'))
const ParametresClient = lazy(() => import('@/pages/espace/Parametres'))
const RsvpClient = lazy(() => import('@/pages/espace/Rsvp'))
const ProductSpace = lazy(() => import('@/pages/espace/ProductSpace'))
const LegacyRedirect = lazy(() =>
  import('@/pages/espace/ProductSpace').then((m) => ({ default: m.LegacyRedirect })),
)
const StatistiquesClient = lazy(() => import('@/pages/espace/Statistiques'))
const AdminShell = lazy(() => import('@/components/admin/AdminShell'))
const AdminDashboard = lazy(() => import('@/pages/admin/Dashboard'))
const AdminCommandes = lazy(() => import('@/pages/admin/Commandes'))
const AdminProjets = lazy(() => import('@/pages/admin/Projets'))
const AdminClients = lazy(() => import('@/pages/admin/Clients'))
const AdminFormulaires = lazy(() => import('@/pages/admin/Formulaires'))
const AdminAnalytique = lazy(() => import('@/pages/admin/Analytique'))
const AdminStatistiques = lazy(() => import('@/pages/admin/Statistiques'))
const AdminFrequentation = lazy(() => import('@/pages/admin/Frequentation'))
const AdminMessages = lazy(() => import('@/pages/admin/Messages'))
const AdminParametres = lazy(() => import('@/pages/admin/Parametres'))
const AdminModeleStdDetail = lazy(() => import('@/pages/admin/ModeleStdDetail'))

/** Fallback pendant le chargement d'un chunk /espace ou /admin — même motif que le spinner de chargement de session d'AdminShell.tsx, pour qu'il n'y ait aucun flash visuel entre les deux. */
function RouteLoadingFallback() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-neutral-100">
      <span className="h-10 w-10 animate-spin rounded-full border-2 border-neutral-200 border-t-terracotta-500" />
    </div>
  )
}

/**
 * Remet la page en haut à chaque changement d'URL.
 *
 * React Router conserve la position de défilement d'une page à l'autre : après
 * un paiement, on arrivait sur /merci au niveau où l'on avait quitté le bas du
 * formulaire de commande, donc au milieu de la page de remerciement (signalé
 * le 31/08/2026).
 *
 * `useLayoutEffect` plutôt que `useEffect` (correctif du 12/09/2026, bug
 * signalé : clic sur « Offres » depuis une page longue → atterrissage en bas
 * de /offres). Cause : `useEffect` s'exécute APRÈS que le navigateur a peint
 * la nouvelle page — s'il on vient d'une page plus longue que la nouvelle, le
 * navigateur clampe immédiatement le scroll existant (ex. 4800px) à la
 * hauteur max de la page d'arrivée dès le premier paint, donc tout en bas,
 * et seul un correctif exécuté AVANT ce paint évite l'effet visible.
 * `useLayoutEffect` s'exécute de façon synchrone juste après le commit DOM,
 * avant que le navigateur ne peigne — plus de fenêtre où un mauvais scroll
 * est visible, même brièvement.
 *
 * Deux cas volontairement épargnés :
 *  - une ancre (#concept, #faq…) : la cible est gérée par la page elle-même
 *    (Home.tsx) et par la Navbar ;
 *  - une navigation « POP » (boutons précédent/suivant du navigateur) : on
 *    laisse le navigateur restaurer la position, c'est ce que l'utilisateur
 *    attend en revenant en arrière.
 */
function ScrollToTop() {
  const { pathname, hash } = useLocation()
  const navigationType = useNavigationType()

  useLayoutEffect(() => {
    if (hash) return
    if (navigationType === 'POP') return
    window.scrollTo(0, 0)
  }, [pathname, hash, navigationType])

  return null
}

/** Mesure d'audience maison : une page vue à chaque changement d'adresse (cf. src/lib/analytics.ts). */
function SiteTracker() {
  const { pathname } = useLocation()
  useEffect(() => {
    startSiteTracking()
    trackPageview(pathname)
  }, [pathname])
  return null
}

/**
 * Routage Scroll The Date.
 * - Layout public (Navbar + Footer, Outlet) : uniquement les pages publiques.
 * - /espace/* : ClientShell (clair) avec routes imbriquées.
 * - /admin/* : AdminShell (dense, garde admin) avec routes imbriquées.
 */
export default function App() {
  return (
    <>
      <ScrollToTop />
      <SiteTracker />
      <Suspense fallback={<div className="min-h-[100dvh]" />}>
      <Routes>
        {/* Pages publiques — shell commun Navbar/Footer */}
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="offres" element={<Offres />} />
          <Route path="faire-part-digital" element={<FairePartDigital />} />
          <Route path="save-the-date-digital" element={<SaveTheDateDigital />} />
          <Route path="save-the-date-modeles" element={<SaveTheDateTemplates />} />
          <Route path="save-the-date-modeles/:slug" element={<SaveTheDateTemplatePreview />} />
          <Route path="commander" element={<Commander />} />
          <Route path="merci" element={<Merci />} />
          <Route path="demo" element={<Demo />} />
          <Route path="demo/infos" element={<DemoInfos />} />
          <Route path="demofairepart" element={<DemoFairePart />} />
          <Route path="mentions-legales" element={<MentionsLegales />} />
          <Route path="cgv" element={<CGV />} />
          <Route path="confidentialite" element={<Confidentialite />} />
        </Route>

        {/* Login — clair, hors Layout public sombre (comme /espace et /admin) */}
        <Route path="/login" element={<Login />} />
        {/* Atterrissage des liens Supabase "recovery" : activation d'espace
            après un checkout invité, et mot de passe oublié. */}
        <Route path="/definir-mot-de-passe" element={<DefinirMotDePasse />} />

        {/* Faire-part démo — hors Layout public (pas de Navbar/Footer
            marketing devant les invités). Pages câblées en dur (skill
            SCROLL THE DATE), listées sur /demofairepart — cf. doc de
            demoFairePart1Content.ts/demoFairePart2Content.ts (retirées le
            13/09/2026 : /edwige-wilfried et /lea-olivier, jusque-là ici).
            /faire-part/:slug est la vraie page dynamique, alimentée par
            projects.getPublicInvite — react-router priorise les segments
            statiques sur le paramétré, ils coexistent sans conflit. */}
        <Route path="/faire-part/demo-faire-part-1" element={<DemoFairePart1 />} />
        <Route path="/faire-part/demo-faire-part-2" element={<DemoFairePart2 />} />
        <Route path="/faire-part/camille-adrien" element={<FairePartCamilleAdrien />} />
        <Route path="/faire-part/:slug" element={<FairePart />} />

        {/* Espace client — shell clair dédié (hors Layout public). `Suspense`
            posé ici, autour de `ClientShell` : il reste un ancêtre de
            n'importe quelle route enfant rendue par son `<Outlet/>`, donc
            capte la suspension de CHACUNE des pages lazy ci-dessous sans
            avoir à répéter la limite sur chaque `<Route>`. */}
        <Route path="/espace" element={<Suspense fallback={<RouteLoadingFallback />}><ClientShell /></Suspense>}>
          <Route index element={<TableauDeBord />} />
          {/* Pages produit à onglets (cf. ProductSpace) */}
          <Route path="save-the-date" element={<ProductSpace product="SAVE_THE_DATE" />}>
            <Route index element={<Navigate to="apercu" replace />} />
            <Route path="apercu" element={<Projet />} />
            <Route path="personnalisation" element={<PersonnalisationClient />} />
            <Route path="questionnaire" element={<Questionnaire />} />
            <Route path="*" element={<Navigate to="apercu" replace />} />
          </Route>
          <Route path="faire-part" element={<ProductSpace product="FAIRE_PART" />}>
            <Route index element={<Navigate to="apercu" replace />} />
            <Route path="apercu" element={<Projet />} />
            <Route path="questionnaire" element={<Questionnaire />} />
            <Route path="rsvp" element={<RsvpClient />} />
            <Route path="*" element={<Navigate to="apercu" replace />} />
          </Route>
          {/* Anciennes URL → onglet équivalent de la page produit */}
          <Route path="projet" element={<LegacyRedirect tab="apercu" />} />
          <Route path="questionnaire" element={<LegacyRedirect tab="questionnaire" />} />
          <Route path="personnalisation" element={<LegacyRedirect tab="personnalisation" />} />
          <Route path="rsvp" element={<LegacyRedirect tab="rsvp" />} />
          <Route path="statistiques" element={<StatistiquesClient />} />
          <Route path="commandes" element={<CommandesClient />} />
          <Route path="messages" element={<MessagesClient />} />
          <Route path="parametres" element={<ParametresClient />} />
        </Route>

        {/* Admin — shell dense dédié (hors Layout public) — même principe de `Suspense` que /espace ci-dessus. */}
        <Route path="/admin" element={<Suspense fallback={<RouteLoadingFallback />}><AdminShell /></Suspense>}>
          <Route index element={<AdminDashboard />} />
          <Route path="commandes" element={<AdminCommandes />} />
          <Route path="projets" element={<AdminProjets />} />
          <Route path="clients" element={<AdminClients />} />
          <Route path="formulaires" element={<AdminFormulaires />} />
          <Route path="analytique" element={<AdminAnalytique />} />
          <Route path="statistiques" element={<AdminStatistiques />} />
          <Route path="frequentation" element={<AdminFrequentation />} />
          <Route path="messages" element={<AdminMessages />} />
          <Route path="parametres" element={<AdminParametres />} />
          <Route path="parametres/modeles-std/:slug" element={<AdminModeleStdDetail />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
    </>
  )
}
