import { Routes, Route, useLocation, useNavigationType } from 'react-router'
import { useLayoutEffect } from 'react'
import Layout from '@/components/Layout'
import Home from '@/pages/Home'
import Login from '@/pages/Login'
import DefinirMotDePasse from '@/pages/DefinirMotDePasse'
import NotFound from '@/pages/NotFound'
import Offres from '@/pages/Offres'
import FairePartDigital from '@/pages/FairePartDigital'
import SaveTheDateDigital from '@/pages/SaveTheDateDigital'
import SaveTheDateTemplates from '@/pages/SaveTheDateTemplates'
import SaveTheDateTemplatePreview from '@/pages/SaveTheDateTemplatePreview'
import Commander from '@/pages/Commander'
import Merci from '@/pages/Merci'
import MentionsLegales from '@/pages/MentionsLegales'
import CGV from '@/pages/CGV'
import Confidentialite from '@/pages/Confidentialite'
import Demo from '@/pages/Demo'
import DemoInfos from '@/pages/DemoInfos'
import DemoFairePart from '@/pages/DemoFairePart'
import DemoFairePart1 from '@/pages/DemoFairePart1'
import DemoFairePart2 from '@/pages/DemoFairePart2'
import FairePartCamilleAdrien from '@/pages/FairePartCamilleAdrien'
import FairePart from '@/pages/FairePart'
import ClientShell from '@/components/espace/ClientShell'
import TableauDeBord from '@/pages/espace/TableauDeBord'
import Questionnaire from '@/pages/espace/Questionnaire'
import Projet from '@/pages/espace/Projet'
import PersonnalisationClient from '@/pages/espace/Personnalisation'
import CommandesClient from '@/pages/espace/Commandes'
import MessagesClient from '@/pages/espace/Messages'
import ParametresClient from '@/pages/espace/Parametres'
import RsvpClient from '@/pages/espace/Rsvp'
import AdminShell from '@/components/admin/AdminShell'
import AdminDashboard from '@/pages/admin/Dashboard'
import AdminCommandes from '@/pages/admin/Commandes'
import AdminProjets from '@/pages/admin/Projets'
import AdminClients from '@/pages/admin/Clients'
import AdminFormulaires from '@/pages/admin/Formulaires'
import AdminAnalytique from '@/pages/admin/Analytique'
import AdminMessages from '@/pages/admin/Messages'
import AdminParametres from '@/pages/admin/Parametres'
import AdminModeleStdDetail from '@/pages/admin/ModeleStdDetail'

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

        {/* Espace client — shell clair dédié (hors Layout public) */}
        <Route path="/espace" element={<ClientShell />}>
          <Route index element={<TableauDeBord />} />
          <Route path="questionnaire" element={<Questionnaire />} />
          <Route path="projet" element={<Projet />} />
          <Route path="personnalisation" element={<PersonnalisationClient />} />
          <Route path="commandes" element={<CommandesClient />} />
          <Route path="messages" element={<MessagesClient />} />
          <Route path="rsvp" element={<RsvpClient />} />
          <Route path="parametres" element={<ParametresClient />} />
        </Route>

        {/* Admin — shell dense dédié (hors Layout public) */}
        <Route path="/admin" element={<AdminShell />}>
          <Route index element={<AdminDashboard />} />
          <Route path="commandes" element={<AdminCommandes />} />
          <Route path="projets" element={<AdminProjets />} />
          <Route path="clients" element={<AdminClients />} />
          <Route path="formulaires" element={<AdminFormulaires />} />
          <Route path="analytique" element={<AdminAnalytique />} />
          <Route path="messages" element={<AdminMessages />} />
          <Route path="parametres" element={<AdminParametres />} />
          <Route path="parametres/modeles-std/:slug" element={<AdminModeleStdDetail />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}
