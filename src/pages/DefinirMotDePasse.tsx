import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Link } from 'react-router'
import { supabase } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LOGIN_PATH } from '@/const'
import { useSeo } from '@/hooks/useSeo'

/**
 * Choix du mot de passe, atterrissage des liens Supabase de type `recovery`.
 *
 * Deux usages :
 *  - activation d'un espace après un checkout invité (le compte est créé sans
 *    mot de passe une fois le paiement encaissé — cf. api/lib/guestAccount.ts,
 *    le lien arrive dans l'email de confirmation de commande) ;
 *  - « mot de passe oublié » depuis /login.
 *
 * Le lien Supabase ouvre une session avant de rediriger ici (supabase-js lit
 * les jetons présents dans le fragment d'URL au chargement) : on attend donc
 * cette session avant d'afficher le formulaire, sinon `updateUser` échouerait.
 * Auparavant ces liens renvoyaient vers /login, qui n'offre aucun moyen de
 * définir un mot de passe — le parcours était sans issue.
 */
export default function DefinirMotDePasse() {
  const navigate = useNavigate()
  useSeo({
    title: 'Choisir mon mot de passe — Scroll The Date',
    description: 'Activez votre espace client Scroll The Date en choisissant votre mot de passe.',
    path: '/definir-mot-de-passe',
  })

  const [checkingSession, setCheckingSession] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    // La session peut n'être établie qu'après le traitement du fragment
    // d'URL : on écoute donc aussi les changements plutôt que de se fier au
    // seul appel immédiat.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return
      if (session) {
        setHasSession(true)
        setCheckingSession(false)
      }
    })

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      if (data.session) setHasSession(true)
      setCheckingSession(false)
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('Votre mot de passe doit contenir au moins 8 caractères.')
      return
    }
    if (password !== confirm) {
      setError('Les deux mots de passe ne correspondent pas.')
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      navigate('/espace', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-100 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 text-ink shadow-[0_8px_32px_rgba(27,27,30,0.08)]">
        <div className="mb-6 text-center">
          <p className="font-display text-2xl font-medium italic text-ink">Scroll The Date</p>
          <p className="mt-1 text-sm text-neutral-500">
            {hasSession ? 'Choisissez votre mot de passe' : 'Activation de votre espace'}
          </p>
        </div>

        {checkingSession && (
          <p className="text-center text-sm text-neutral-500">Vérification du lien…</p>
        )}

        {!checkingSession && !hasSession && (
          <div className="flex flex-col gap-4 text-sm text-neutral-500">
            <p>
              Ce lien n'est plus valide — il a expiré ou a déjà été utilisé.
            </p>
            <p>
              Depuis la page de connexion, utilisez « Mot de passe oublié ? » avec l'adresse email
              de votre commande pour en recevoir un nouveau.
            </p>
            <Link
              to={LOGIN_PATH}
              className="text-center font-semibold text-terracotta-500 underline-offset-4 hover:underline"
            >
              Aller à la connexion
            </Link>
          </div>
        )}

        {!checkingSession && hasSession && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8 caractères minimum"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirm">Confirmation</Label>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>

            {error && (
              <p className="rounded-lg border border-error/30 bg-error/5 px-3 py-2 text-sm text-error">
                {error}
              </p>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Enregistrement…' : 'Activer mon espace'}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
