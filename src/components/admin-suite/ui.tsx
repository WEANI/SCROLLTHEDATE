// Kit UI partagé des pages admin-suite — surfaces claires, densité fonctionnelle.
// Les variables CSS du scaffold sont sombres : ici tout est explicite (clair).

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PROJECT_STATUS_LABEL,
  PROJECT_STATUS_ORDER,
  PAYMENT_LABEL,
} from "./types";
import type { ProjectStatus, PaymentStatus } from "./types";

// ---------------------------------------------------------------- formats ----

export const eur = (cents: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);

export const fmtDate = (d: string | Date | null | undefined) =>
  d
    ? new Date(d).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "—";

export const fmtDateShort = (d: string | Date | null | undefined) =>
  d
    ? new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
    : "—";

export const fmtTime = (d: string | Date | null | undefined) =>
  d
    ? new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : "";

export function timeAgo(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const diff = Date.now() - new Date(d).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const j = Math.floor(h / 24);
  if (j < 30) return `il y a ${j} j`;
  return fmtDate(d);
}

export function initials(name: string | null | undefined): string {
  if (!name) return "··";
  const parts = name
    .replace(/&/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

// ---------------------------------------------------------------- surfaces ----

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta-500">
          Admin
        </p>
        <h1 className="font-display mt-1 text-3xl text-ink">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-neutral-500">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Panel({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-neutral-200 bg-white shadow-[0_8px_32px_rgba(27,27,30,0.06)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PanelTitle({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-neutral-200 px-5 py-4">
      <div>
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {hint ? <p className="mt-0.5 text-xs text-neutral-500">{hint}</p> : null}
      </div>
      {action}
    </div>
  );
}

// ------------------------------------------------------------------ pills ----

type Tone = "terracotta" | "success" | "pending" | "error" | "info" | "neutral" | "anthracite";

const TONE_CLASS: Record<Tone, string> = {
  terracotta: "bg-terracotta-500/10 text-terracotta-500 border-terracotta-500/30",
  success: "bg-success/10 text-success border-success/30",
  pending: "bg-pending/10 text-pending border-pending/30",
  error: "bg-error/10 text-error border-error/30",
  info: "bg-info/10 text-info border-info/30",
  neutral: "bg-neutral-100 text-neutral-500 border-neutral-200",
  anthracite: "bg-anthracite-800 text-white border-anthracite-800",
};

export function Pill({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium",
        TONE_CLASS[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const STATUS_TONE: Record<ProjectStatus, Tone> = {
  ONBOARDING: "info",
  QUESTIONNAIRE: "pending",
  SCENARIOS: "terracotta",
  PRODUCTION: "terracotta",
  REVIEW: "pending",
  DELIVERED: "success",
};

export function StatusPill({ status }: { status: ProjectStatus }) {
  return <Pill tone={STATUS_TONE[status]}>{PROJECT_STATUS_LABEL[status]}</Pill>;
}

const PAYMENT_TONE: Record<PaymentStatus, Tone> = {
  pending: "pending",
  paid: "success",
  failed: "error",
  refunded: "neutral",
};

export function PaymentPill({ status }: { status: PaymentStatus }) {
  return <Pill tone={PAYMENT_TONE[status]}>{PAYMENT_LABEL[status]}</Pill>;
}

export function Initials({
  name,
  size = "md",
  className,
}: {
  name: string | null | undefined;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClass =
    size === "lg"
      ? "h-14 w-14 text-lg"
      : size === "sm"
        ? "h-8 w-8 text-[11px]"
        : "h-10 w-10 text-sm";
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-anthracite-800 font-display font-medium text-terracotta-300",
        sizeClass,
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

// -------------------------------------------------------------- stepper ----

export function MiniStepper({ status }: { status: ProjectStatus }) {
  const idx = PROJECT_STATUS_ORDER.indexOf(status);
  return (
    <div className="flex items-center gap-1" aria-label={PROJECT_STATUS_LABEL[status]}>
      {PROJECT_STATUS_ORDER.map((s, i) => (
        <span
          key={s}
          className={cn(
            "h-1.5 w-4 rounded-full",
            i < idx
              ? "bg-success"
              : i === idx
                ? "bg-terracotta-500"
                : "bg-neutral-200",
          )}
        />
      ))}
    </div>
  );
}

// ------------------------------------------------------------------- KPI ----

export function Delta({
  current,
  previous,
  suffix = "%",
  invert = false,
}: {
  current: number;
  previous: number;
  suffix?: string;
  invert?: boolean;
}) {
  if (!previous) {
    return <span className="text-xs text-neutral-500">n/p période préc.</span>;
  }
  const pct = ((current - previous) / previous) * 100;
  const positive = invert ? pct <= 0 : pct >= 0;
  return (
    <span
      className={cn(
        "tabular text-xs font-semibold",
        positive ? "text-success" : "text-error",
      )}
    >
      {pct >= 0 ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}
      {suffix}
    </span>
  );
}

/** Compteur animé (count-up 800 ms). */
export function CountUp({
  value,
  format,
}: {
  value: number;
  format?: (v: number) => string;
}) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);
  useEffect(() => {
    const from = prevRef.current;
    prevRef.current = value;
    const start = performance.now();
    const dur = 800;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (value - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  const rendered = format ? format(display) : Math.round(display).toLocaleString("fr-FR");
  return <span className="tabular">{rendered}</span>;
}

// ------------------------------------------------------------ empty state ----

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <p className="font-display text-xl text-ink">{title}</p>
      {description ? (
        <p className="max-w-sm text-sm text-neutral-500">{description}</p>
      ) : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

// ---------------------------------------------------------------- toasts ----

type ToastItem = { id: number; kind: "success" | "error"; text: string };

export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);
  const push = useCallback((kind: "success" | "error", text: string) => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, kind, text }]);
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 4000);
  }, []);
  return { toasts, push };
}

export function ToastStack({ toasts }: { toasts: ToastItem[] }) {
  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex w-80 flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="pointer-events-auto overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-[0_8px_32px_rgba(27,27,30,0.16)]"
          >
            <div className="flex items-center gap-2 px-4 py-3">
              {t.kind === "success" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-error" />
              )}
              <p className="text-sm text-ink">{t.text}</p>
            </div>
            <motion.div
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: 4, ease: "linear" }}
              className="h-0.5 origin-left bg-terracotta-500"
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// --------------------------------------------------------------- boutons ----

export function AdminButton({
  variant = "primary",
  className,
  children,
  ...props
}: React.ComponentProps<"button"> & {
  variant?: "primary" | "outline" | "ghost" | "danger";
}) {
  const variantClass = {
    primary:
      "bg-terracotta-500 text-white hover:bg-terracotta-400 disabled:opacity-50",
    outline:
      "border border-neutral-200 bg-white text-ink hover:bg-neutral-100 disabled:opacity-50",
    ghost: "text-neutral-500 hover:bg-neutral-100 hover:text-ink disabled:opacity-50",
    danger: "bg-error text-white hover:bg-error/90 disabled:opacity-50",
  }[variant];
  return (
    <button
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 rounded-[10px] px-3.5 text-sm font-medium transition-colors [&_svg]:size-4",
        variantClass,
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export const inputClass =
  "h-9 w-full rounded-[10px] border border-neutral-200 bg-white px-3 text-sm text-ink placeholder:text-neutral-500 outline-none transition-colors focus:border-terracotta-500 focus:ring-2 focus:ring-terracotta-500/20 disabled:opacity-50";

export const textareaClass =
  "w-full rounded-[10px] border border-neutral-200 bg-white px-3 py-2 text-sm text-ink placeholder:text-neutral-500 outline-none transition-colors focus:border-terracotta-500 focus:ring-2 focus:ring-terracotta-500/20 disabled:opacity-50";

export const selectClass =
  "h-9 rounded-[10px] border border-neutral-200 bg-white px-2.5 text-sm text-ink outline-none transition-colors focus:border-terracotta-500";

/** Toggle pilule façon switch (thumb terracotta quand actif). */
export function AdminSwitch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-5.5 w-10 shrink-0 rounded-full transition-colors disabled:opacity-40",
        checked ? "bg-terracotta-500" : "bg-neutral-200",
      )}
      style={{ height: 22 }}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 32 }}
        className={cn(
          "absolute top-[3px] h-4 w-4 rounded-full bg-white shadow",
          checked ? "right-[3px]" : "left-[3px]",
        )}
      />
    </button>
  );
}

/** Chip de filtre cliquable. */
export function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        "inline-flex h-7 items-center gap-1 rounded-full border px-3 text-xs font-medium transition-colors",
        active
          ? "border-terracotta-500 bg-terracotta-500 text-white"
          : "border-neutral-200 bg-white text-neutral-500 hover:border-terracotta-300 hover:text-ink",
      )}
    >
      {children}
      {active ? <span aria-hidden>×</span> : null}
    </motion.button>
  );
}
