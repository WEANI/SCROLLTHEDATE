import { Routes, Route } from 'react-router'
import Layout from '@/components/Layout'
import Home from '@/pages/Home'
import Login from '@/pages/Login'
import NotFound from '@/pages/NotFound'
import Offres from '@/pages/Offres'
import Commander from '@/pages/Commander'
import Merci from '@/pages/Merci'
import Demo from '@/pages/Demo'
import ClientShell from '@/components/espace/ClientShell'
import TableauDeBord from '@/pages/espace/TableauDeBord'
import Questionnaire from '@/pages/espace/Questionnaire'
import Projet from '@/pages/espace/Projet'
import CommandesClient from '@/pages/espace/Commandes'
import MessagesClient from '@/pages/espace/Messages'
import AdminShell from '@/components/admin/AdminShell'
import AdminDashboard from '@/pages/admin/Dashboard'
import AdminCommandes from '@/pages/admin/Commandes'
import AdminProjets from '@/pages/admin/Projets'
import AdminClients from '@/pages/admin/Clients'
import AdminFormulaires from '@/pages/admin/Formulaires'
import AdminAnalytique from '@/pages/admin/Analytique'
import AdminMessages from '@/pages/admin/Messages'
import AdminParametres from '@/pages/admin/Parametres'

/**
 * Routage Félicity.
 * - Layout public (Navbar + Footer, Outlet) : uniquement les pages publiques.
 * - /espace/* : ClientShell (clair) avec routes imbriquées.
 * - /admin/* : AdminShell (dense, garde admin) avec routes imbriquées.
 */
export default function App() {
  return (
    <Routes>
      {/* Pages publiques — shell commun Navbar/Footer */}
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="offres" element={<Offres />} />
        <Route path="commander" element={<Commander />} />
        <Route path="merci" element={<Merci />} />
        <Route path="demo" element={<Demo />} />
        <Route path="login" element={<Login />} />
      </Route>

      {/* Espace client — shell clair dédié (hors Layout public) */}
      <Route path="/espace" element={<ClientShell />}>
        <Route index element={<TableauDeBord />} />
        <Route path="questionnaire" element={<Questionnaire />} />
        <Route path="projet" element={<Projet />} />
        <Route path="commandes" element={<CommandesClient />} />
        <Route path="messages" element={<MessagesClient />} />
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
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
