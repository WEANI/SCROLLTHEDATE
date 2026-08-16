import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabaseClient";

// Page volontairement en classes littérales claires (bg-white, text-ink…)
// plutôt que le composant <Card> shadcn : les tokens CSS --card/--background
// de ce projet sont sombres par défaut (thème du site public cinématique),
// alors que /login mène vers les espaces clairs (/espace, /admin) — même
// convention que ClientShell/AdminShell.

type Mode = "signin" | "signup" | "forgot";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/espace";

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate(from, { replace: true });
        return;
      }
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name: name || undefined } },
        });
        if (error) throw error;
        if (!data.session) {
          setInfo(
            "Compte créé — vérifiez votre boîte mail pour confirmer votre adresse avant de vous connecter.",
          );
          setMode("signin");
        } else {
          navigate(from, { replace: true });
        }
        return;
      }
      // forgot
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) throw error;
      setInfo("Email de réinitialisation envoyé — vérifiez votre boîte mail.");
      setMode("signin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-100 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 text-ink shadow-[0_8px_32px_rgba(27,27,30,0.08)]">
        <div className="mb-6 text-center">
          <p className="font-display text-2xl font-medium italic text-ink">Scroll The Date</p>
          <p className="mt-1 text-sm text-neutral-500">
            {mode === "signin" && "Connectez-vous à votre espace"}
            {mode === "signup" && "Créez votre compte"}
            {mode === "forgot" && "Réinitialiser votre mot de passe"}
          </p>
        </div>
        <div>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            {mode === "signup" && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Nom</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Anna & Théo"
                  autoComplete="name"
                />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.fr"
                autoComplete="email"
              />
            </div>
            {mode !== "forgot" && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                />
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}
            {info && <p className="text-sm text-terracotta-500">{info}</p>}

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading
                ? "Un instant…"
                : mode === "signin"
                  ? "Se connecter"
                  : mode === "signup"
                    ? "Créer mon compte"
                    : "Envoyer le lien"}
            </Button>
          </form>

          <div className="mt-5 flex flex-col items-center gap-2 text-sm">
            {mode === "signin" && (
              <>
                <button
                  type="button"
                  className="text-neutral-500 hover:text-ink"
                  onClick={() => {
                    setMode("forgot");
                    setError(null);
                    setInfo(null);
                  }}
                >
                  Mot de passe oublié ?
                </button>
                <button
                  type="button"
                  className="text-terracotta-500 hover:text-terracotta-400"
                  onClick={() => {
                    setMode("signup");
                    setError(null);
                    setInfo(null);
                  }}
                >
                  Pas de compte ? Créez-en un
                </button>
              </>
            )}
            {mode !== "signin" && (
              <button
                type="button"
                className="text-neutral-500 hover:text-ink"
                onClick={() => {
                  setMode("signin");
                  setError(null);
                  setInfo(null);
                }}
              >
                ← Retour à la connexion
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
