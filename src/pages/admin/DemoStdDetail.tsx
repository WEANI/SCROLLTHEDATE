import { Link, useParams } from "react-router";
import { trpc } from "@/providers/trpc";
import { PageHeader } from "@/components/admin-suite/ui";
import { DEMO_VIDEOS, demoInitialOverride, demoTemplate, getDemoHero, parseDemoOverride } from "@/components/demo/demoHero";
import { StdHeroForm } from "@/pages/admin/ModeleStdDetail";

/**
 * Réglage d'une vidéo démo — mêmes onglets que les Modèles Save the Date
 * (demande du 12/11/2026) : c'est le même écran (StdHeroForm), avec en plus
 * le choix de la vidéo dans l'onglet Général.
 */
export default function DemoStdDetail() {
  const { id } = useParams();
  const def = getDemoHero(id);
  const heroQ = trpc.settings.get.useQuery({ key: def?.settingKey ?? "none" }, { enabled: !!def });
  const namesQ = trpc.settings.get.useQuery({ key: def?.namesKey ?? "none" }, { enabled: !!def });

  if (!def) {
    return (
      <div className="mx-auto w-full max-w-[1200px] text-ink">
        <PageHeader title="Démo introuvable" />
        <Link to="/admin/parametres" className="text-sm font-medium text-terracotta-500 hover:text-terracotta-400">
          ← Retour aux paramètres
        </Link>
      </div>
    );
  }
  // Même règle que pour un modèle : le formulaire ne monte qu'avec la vraie réponse du serveur.
  if (heroQ.data === undefined || namesQ.data === undefined) return null;

  const names = (namesQ.data?.value as { coupleNames?: string } | null)?.coupleNames?.trim() || "Anna & Théo";
  const saved = parseDemoOverride(heroQ.data?.value);
  const initial = { ...(saved ?? demoInitialOverride(def, names)), exampleNames: names, exampleDate: def.dateShort };
  return (
    <StdHeroForm
      key={def.id}
      template={demoTemplate(def, initial.videoId)}
      initial={initial}
      toSetting={(o) => ({ key: def.settingKey, value: o })}
      publicHref={def.path}
      backHref="/admin/parametres"
      backLabel="Paramètres"
      saveLabel="Enregistrer la démo"
      videoOptions={DEMO_VIDEOS}
    />
  );
}
