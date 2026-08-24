import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import { SectionCard } from '@/components/espace/shared'

/**
 * Paramètres client — jusqu'ici un item de menu grisé "bientôt" sans page
 * derrière (cf. ClientShell.tsx). Corrige l'audit : rien n'existait pour
 * qu'un client modifie ses propres coordonnées.
 *
 * Écrit directement via `supabase.auth.updateUser()`, pas une mutation tRPC
 * dédiée : l'authentification de ce projet est déjà entièrement pilotée
 * côté frontend par Supabase Auth (cf. api/auth-router.ts, api/context.ts).
 * Le nom vit dans `user_metadata.name` (pas une colonne réécrite à part) —
 * `api/context.ts` resynchronise la ligne `users` locale (name + email)
 * depuis Supabase à CHAQUE requête authentifiée : une mutation backend
 * séparée qui n'aurait touché que la ligne locale aurait été écrasée par ce
 * mécanisme dès la requête suivante. `useAuth` écoute déjà
 * `supabase.auth.onAuthStateChange` et invalide `auth.me` sur tout
 * changement (login, update, refresh) : après un `updateUser()` réussi,
 * tout le reste de l'app (sidebar, etc.) se resynchronise seul, sans
 * plomberie supplémentaire ici.
 *
 * N'expose PAS de champ téléphone : aucune colonne `phone` n'existe sur la
 * table `users` (le champ "Téléphone" de Commander.tsx n'est lui-même
 * jamais persisté nulle part — bug distinct, signalé mais non corrigé ici).
 * Ajouter un champ qui n'écrirait nulle part serait exactement le défaut
 * que cette page corrige.
 */
export default function Parametres() {
  const { user, isLoading: authLoading } = useAuth()

  useEffect(() => {
    document.title = 'Scroll The Date — Paramètres'
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="font-display text-3xl font-medium tracking-[-0.01em] text-ink sm:text-4xl"
        >
          Paramètres
        </motion.h2>
        <p className="mt-2 text-[15px] text-neutral-500">
          Vos coordonnées et votre mot de passe de connexion.
        </p>
      </div>

      {authLoading ? (
        <SectionCard>
          <p className="text-[14px] text-neutral-500">Chargement…</p>
        </SectionCard>
      ) : (
        <>
          <ProfileCard name={user?.name ?? ''} email={user?.email ?? ''} />
          <PasswordCard />
        </>
      )}
    </div>
  )
}

function ProfileCard({ name: initialName, email: initialEmail }: { name: string; email: string }) {
  const [name, setName] = useState(initialName)
  const [email, setEmail] = useState(initialEmail)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const dirty = name !== initialName || email !== initialEmail

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setLoading(true)
    try {
      const emailChanged = email.trim() !== initialEmail
      const { error } = await supabase.auth.updateUser({
        ...(emailChanged ? { email: email.trim() } : {}),
        data: { name: name.trim() || undefined },
      })
      if (error) throw error
      setInfo(
        emailChanged
          ? `Nom mis à jour. Un email de confirmation a été envoyé à ${email.trim()} — le changement d'adresse ne prendra effet qu'après confirmation.`
          : 'Vos informations ont été mises à jour.',
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SectionCard>
      <h3 className="font-display text-xl font-medium text-ink">Vos informations</h3>
      <form className="mt-5 flex max-w-md flex-col gap-4" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="settings-name">Nom</Label>
          <Input
            id="settings-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Anna & Théo"
            autoComplete="name"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="settings-email">Email</Label>
          <Input
            id="settings-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <p className="text-[12px] text-neutral-500">
            Changer votre email nécessite une confirmation via un lien envoyé à la nouvelle
            adresse.
          </p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {info && (
          <p className="flex items-start gap-1.5 text-sm text-terracotta-500">
            <Check size={16} className="mt-0.5 shrink-0" />
            {info}
          </p>
        )}

        <Button type="submit" className="w-fit" disabled={loading || !dirty}>
          {loading ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
      </form>
    </SectionCard>
  )
}

function PasswordCard() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    if (password !== confirm) {
      setError('Les deux mots de passe ne correspondent pas.')
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setInfo('Mot de passe mis à jour.')
      setPassword('')
      setConfirm('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SectionCard>
      <h3 className="font-display text-xl font-medium text-ink">Mot de passe</h3>
      <form className="mt-5 flex max-w-md flex-col gap-4" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="settings-password">Nouveau mot de passe</Label>
          <Input
            id="settings-password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="settings-password-confirm">Confirmer le mot de passe</Label>
          <Input
            id="settings-password-confirm"
            type="password"
            required
            minLength={6}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {info && (
          <p className="flex items-center gap-1.5 text-sm text-terracotta-500">
            <Check size={16} />
            {info}
          </p>
        )}

        <Button type="submit" className="w-fit" disabled={loading || !password}>
          {loading ? 'Enregistrement…' : 'Changer le mot de passe'}
        </Button>
      </form>
    </SectionCard>
  )
}
