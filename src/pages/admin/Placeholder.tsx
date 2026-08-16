import { Link } from "react-router";
import { Construction } from "lucide-react";

interface PlaceholderProps {
  title: string;
  description?: string;
}

/**
 * Placeholder léger pour les pages admin implémentées par un autre agent
 * (Clients, Formulaires, Analytique, Messages, Paramètres).
 */
export default function Placeholder({ title, description }: PlaceholderProps) {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center rounded-xl border border-dashed border-neutral-200 bg-white p-10 text-center">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-terracotta-500/10 text-terracotta-500">
        <Construction size={22} />
      </span>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta-500">Admin</p>
      <h1 className="font-display mt-2 text-[28px] font-medium leading-tight">{title}</h1>
      <p className="mt-3 max-w-sm text-[13px] leading-relaxed text-neutral-500">
        {description ?? "Cette section est en cours de construction par l'équipe Scroll The Date."}
      </p>
      <Link
        to="/admin"
        className="mt-6 rounded-full border border-neutral-200 px-5 py-2.5 text-[12px] font-semibold text-ink transition-colors hover:border-terracotta-500 hover:text-terracotta-500"
      >
        ← Retour au dashboard
      </Link>
    </div>
  );
}
