import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import { useLanguage } from '@/i18n/LanguageContext'
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
  const { t } = useLanguage()
  const { user, isLoading: authLoading } = useAuth()

  useEffect(() => {
    document.title = `Scroll The Date — ${t('espace.parametres.title')}`
  }, [t])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="font-display text-3xl font-medium tracking-[-0.01em] text-ink sm:text-4xl"
        >
          {t('espace.parametres.title')}
        </motion.h2>
        <p className="mt-2 text-[15px] text-neutral-500">
          {t('espace.parametres.subtitle')}
        </p>
      </div>

      {authLoading ? (
        <SectionCard>
          <p className="text-[14px] text-neutral-500">{t('espace.parametres.loading')}</p>
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
  const { t } = useLanguage()
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
          ? `${t('espace.parametres.emailChangedInfoPrefix')} ${email.trim()} ${t('espace.parametres.emailChangedInfoSuffix')}`
          : t('espace.parametres.profileUpdated'),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : t('espace.parametres.genericError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <SectionCard>
      <h3 className="font-display text-xl font-medium text-ink">{t('espace.parametres.profileTitle')}</h3>
      <form className="mt-5 flex max-w-md flex-col gap-4" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="settings-name">{t('espace.parametres.nameLabel')}</Label>
          <Input
            id="settings-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('espace.parametres.namePlaceholder')}
            autoComplete="name"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="settings-email">{t('espace.parametres.emailLabel')}</Label>
          <Input
            id="settings-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <p className="text-[12px] text-neutral-500">
            {t('espace.parametres.emailHint')}
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
          {loading ? t('espace.parametres.saving') : t('espace.parametres.save')}
        </Button>
      </form>
    </SectionCard>
  )
}

function PasswordCard() {
  const { t } = useLanguage()
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
      setError(t('espace.parametres.passwordMismatch'))
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setInfo(t('espace.parametres.passwordUpdated'))
      setPassword('')
      setConfirm('')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('espace.parametres.genericError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <SectionCard>
      <h3 className="font-display text-xl font-medium text-ink">{t('espace.parametres.passwordTitle')}</h3>
      <form className="mt-5 flex max-w-md flex-col gap-4" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="settings-password">{t('espace.parametres.newPasswordLabel')}</Label>
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
          <Label htmlFor="settings-password-confirm">{t('espace.parametres.confirmPasswordLabel')}</Label>
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
          {loading ? t('espace.parametres.saving') : t('espace.parametres.changePassword')}
        </Button>
      </form>
    </SectionCard>
  )
}
