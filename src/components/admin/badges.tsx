import { cn } from "@/lib/utils";
import {
  STATUS_BADGE_CLASS,
  STATUS_LABEL,
  type AdminOrder,
  type ProjectStatus,
} from "@/components/admin/shared";

/** Badge pilule de statut pipeline. */
export function StatusBadge({ status, className }: { status: ProjectStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em]",
        STATUS_BADGE_CLASS[status],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {STATUS_LABEL[status]}
    </span>
  );
}

/** Badge pilule de statut de paiement. */
export function PaymentBadge({ status }: { status: AdminOrder["paymentStatus"] }) {
  const map: Record<AdminOrder["paymentStatus"], { label: string; cls: string }> = {
    paid: { label: "Payée", cls: "bg-success/15 text-success" },
    pending: { label: "En attente", cls: "bg-pending/15 text-pending" },
    failed: { label: "Échouée", cls: "bg-error/15 text-error" },
    refunded: { label: "Remboursée", cls: "bg-neutral-500/15 text-neutral-500" },
  };
  const { label, cls } = map[status];
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em]", cls)}>
      {label}
    </span>
  );
}
