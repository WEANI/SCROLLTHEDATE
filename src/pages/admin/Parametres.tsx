import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Check,
  CreditCard,
  Download,
  Loader2,
  Mail,
  MessageCircle,
  Monitor,
  Plus,
  Save,
  Server,
  Smartphone,
  Trash2,
  X,
} from "lucide-react";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  AdminButton,
  AdminSwitch,
  Initials,
  PageHeader,
  Panel,
  PanelTitle,
  Pill,
  ToastStack,
  eur,
  fmtDate,
  fmtTime,
  inputClass,
  textareaClass,
  useToasts,
} from "@/components/admin-suite/ui";
import type {
  OptionSetting,
  ProductSetting,
} from "@/components/admin-suite/types";

// ------------------------------------------------------------- défauts ----

const FALLBACK_PRODUCTS: ProductSetting[] = [
  {
    id: "FAIRE_PART",
    name: "Faire-part digital",
    priceCents: 34900,
    description: "Vidéo cinématique + faire-part en ligne avec RSVP.",
    durationMin: 2,
    revisionsIncluded: 2,
    features: [
      "Vidéo cinématique personnalisée",
      "Faire-part en ligne (3 templates)",
      "RSVP en temps réel",
      "QR code & kit de partage",
    ],
    visible: true,
    installments: true,
  },
  {
    id: "SAVE_THE_DATE",
    name: "Save the Date digital",
    priceCents: 14900,
    description: "Annonce courte et élégante avant le faire-part.",
    durationMin: 1,
    revisionsIncluded: 1,
    features: ["Vidéo courte", "Lien illimité", "Envoi WhatsApp / email"],
    visible: true,
    installments: false,
  },
];

const FALLBACK_OPTIONS: OptionSetting[] = [
  { id: "revisions", label: "Révisions illimitées", priceCents: 6000, visible: true },
  { id: "sous-titres", label: "Sous-titres FR/EN", priceCents: 4000, visible: true },
  { id: "version-courte", label: "Version courte réseaux", priceCents: 9000, visible: true },
];

interface EmailTemplateDraft {
  id: string;
  name: string;
  subject: string;
  body: string;
  active: boolean;
  auto?: string;
}

const DEFAULT_EMAIL_TEMPLATES: EmailTemplateDraft[] = [
  {
    id: "bienvenue",
    name: "Bienvenue post-achat",
    subject: "Bienvenue chez Scroll The Date, {{prenoms}} !",
    body: "Merci pour votre confiance. Retrouvez votre espace : {{lien_espace}}. Votre mariage le {{date_mariage}} approche — racontez-nous votre histoire.",
    active: true,
  },
  {
    id: "relance-questionnaire",
    name: "Relance questionnaire",
    subject: "{{prenoms}}, votre histoire nous attend",
    body: "Votre questionnaire est à moitié rempli. 5 minutes suffisent : {{lien_espace}}.",
    active: true,
    auto: "auto J+3",
  },
  {
    id: "scenarios-envoyes",
    name: "Scénarios envoyés",
    subject: "Vos 3 scénarios sont prêts, {{prenoms}}",
    body: "Nous avons imaginé 3 façons de raconter votre histoire. Découvrez-les : {{lien_espace}}.",
    active: true,
  },
  {
    id: "filigrane-pret",
    name: "Vidéo filigrane prête",
    subject: "Votre film est prêt à être relu",
    body: "La première version de votre vidéo vous attend (filigrane). Validez ou commentez : {{lien_espace}}.",
    active: true,
  },
  {
    id: "livraison",
    name: "Faire-part livré",
    subject: "Votre faire-part est en ligne !",
    body: "Partagez-le dès maintenant avec vos proches : {{lien_espace}}. Mariage le {{date_mariage}}.",
    active: true,
  },
  {
    id: "relance-validation",
    name: "Relance validation",
    subject: "Un dernier regard sur votre film ?",
    body: "Votre vidéo attend votre validation : {{lien_espace}}.",
    active: true,
    auto: "auto J+5",
  },
];

const EMAIL_VARIABLES = ["{{prenoms}}", "{{lien_espace}}", "{{date_mariage}}"];

const NOTIF_EVENTS = [
  { id: "new_order", label: "Nouvelle commande" },
  { id: "questionnaire_done", label: "Questionnaire complété" },
  { id: "scenario_chosen", label: "Scénario choisi" },
  { id: "watermark_approved", label: "Filigrane validé" },
  { id: "client_message", label: "Message client" },
  { id: "payment_failed", label: "Paiement échoué" },
] as const;

type NotifPrefs = Record<string, { email: boolean; push: boolean }>;

const DEFAULT_NOTIFS: NotifPrefs = Object.fromEntries(
  NOTIF_EVENTS.map((e) => [e.id, { email: true, push: e.id !== "client_message" }]),
);

const DEFAULT_QUICK_REPLIES = [
  "Merci, on s'en occupe !",
  "Vos scénarios arrivent demain.",
  "Bien reçu, je regarde ça aujourd'hui.",
];

// ------------------------------------------------------------------ page ----

const TABS = [
  { id: "profil", label: "Profil" },
  { id: "produits", label: "Produits & prix" },
  { id: "emails", label: "Emails" },
  { id: "notifications", label: "Notifications" },
  { id: "integrations", label: "Intégrations" },
  { id: "securite", label: "Sécurité" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function Parametres() {
  const { toasts, push } = useToasts();
  const [tab, setTab] = useState<TabId>("profil");

  return (
    <div className="mx-auto w-full max-w-[1600px] text-ink">
      <PageHeader
        title="Paramètres"
        description="Configuration du studio Scroll The Date."
      />
      <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
        {/* Onglets verticaux sticky */}
        <nav className="flex gap-1 self-start lg:sticky lg:top-6 lg:flex-col">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "relative rounded-[10px] px-4 py-2.5 text-left text-sm font-medium transition-colors",
                tab === t.id
                  ? "bg-white text-ink shadow-[0_8px_32px_rgba(27,27,30,0.06)]"
                  : "text-neutral-500 hover:text-ink",
              )}
            >
              {tab === t.id ? (
                <motion.span
                  layoutId="settings-tab"
                  className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-terracotta-500"
                />
              ) : null}
              {t.label}
            </button>
          ))}
        </nav>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="min-w-0"
          >
            {tab === "profil" ? <TabProfil push={push} /> : null}
            {tab === "produits" ? <TabProduits push={push} /> : null}
            {tab === "emails" ? <TabEmails push={push} /> : null}
            {tab === "notifications" ? <TabNotifications push={push} /> : null}
            {tab === "integrations" ? <TabIntegrations push={push} /> : null}
            {tab === "securite" ? <TabSecurite push={push} /> : null}
          </motion.div>
        </AnimatePresence>
      </div>
      <ToastStack toasts={toasts} />
    </div>
  );
}

type Push = (kind: "success" | "error", text: string) => void;

function useSaveSetting(push: Push) {
  return trpc.settings.adminUpdate.useMutation({
    onSuccess: () => push("success", "Paramètres enregistrés."),
    onError: () => push("error", "Échec de l'enregistrement."),
  });
}

// ---------------------------------------------------------------- profil ----

function TabProfil({ push }: { push: Push }) {
  const { user } = useAuth();
  const q = trpc.settings.get.useQuery({ key: "profile" });
  const save = useSaveSetting(push);

  const [displayName, setDisplayName] = useState("");
  const [signature, setSignature] = useState("");
  const [bio, setBio] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (loaded) return;
    const v = q.data?.value as
      | { displayName?: string; signature?: string; bio?: string }
      | null
      | undefined;
    setDisplayName(v?.displayName ?? user?.name ?? "Élise — Scroll The Date");
    setSignature(v?.signature ?? "Élise\nScroll The Date — faire-parts cinématiques");
    setBio(
      v?.bio ??
        "Votre interlocutrice : je vous accompagne du questionnaire à la livraison de votre film.",
    );
    setLoaded(true);
  }, [q.data, user, loaded]);

  return (
    <Panel>
      <PanelTitle title="Profil" hint="Visible par les clients dans leur espace" />
      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-center gap-4">
          <Initials name={displayName} size="lg" />
          <div>
            <p className="text-sm font-medium text-ink">{user?.email ?? "—"}</p>
            <p className="text-xs text-neutral-500">
              Compte administrateur · connexion par email
            </p>
          </div>
        </div>
        <label className="flex flex-col gap-1 text-xs font-medium text-neutral-500">
          Nom affiché
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className={cn(inputClass, "max-w-md")}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-neutral-500">
          Signature de messages (ajoutée en fin de chaque message client)
          <textarea
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            rows={2}
            className={cn(textareaClass, "max-w-md")}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-neutral-500">
          Bio courte (« Votre interlocutrice » dans l'espace client)
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            className={cn(textareaClass, "max-w-md")}
          />
        </label>
        <AdminButton
          className="self-start"
          disabled={save.isPending}
          onClick={() =>
            save.mutate({
              key: "profile",
              value: { displayName, signature, bio },
            })
          }
        >
          {save.isPending ? <Loader2 className="animate-spin" /> : <Save />}
          Enregistrer
        </AdminButton>
      </div>
    </Panel>
  );
}


// ---------------------------------------------------------- produits & prix ----

function TabProduits({ push }: { push: Push }) {
  const productsQ = trpc.settings.get.useQuery({ key: "products" });
  const optionsQ = trpc.settings.get.useQuery({ key: "options" });
  const save = useSaveSetting(push);

  const [products, setProducts] = useState<ProductSetting[]>(FALLBACK_PRODUCTS);
  const [options, setOptions] = useState<OptionSetting[]>(FALLBACK_OPTIONS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (loaded) return;
    const pv = productsQ.data?.value as ProductSetting[] | null | undefined;
    const ov = optionsQ.data?.value as OptionSetting[] | null | undefined;
    if (Array.isArray(pv) && pv.length > 0) {
      // Fusionne avec les défauts pour conserver les champs étendus
      setProducts(
        FALLBACK_PRODUCTS.map((fb) => {
          const found = pv.find((p) => p.id === fb.id);
          return found ? { ...fb, ...found } : fb;
        }),
      );
    }
    if (Array.isArray(ov) && ov.length > 0) setOptions(ov);
    setLoaded(true);
  }, [productsQ.data, optionsQ.data, loaded]);

  const updateProduct = (id: string, patch: Partial<ProductSetting>) =>
    setProducts((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const updateOption = (id: string, patch: Partial<OptionSetting>) =>
    setOptions((os) => os.map((o) => (o.id === id ? { ...o, ...patch } : o)));

  const persist = () => {
    save.mutate({ key: "products", value: products });
    save.mutate({ key: "options", value: options });
  };

  return (
    <div className="flex flex-col gap-4">
      <Panel className="border-pending/40 bg-pending/5 p-4">
        <p className="flex items-center gap-2 text-sm text-ink">
          <AlertTriangle className="h-4 w-4 text-pending" />
          Modifier un prix n'affecte pas les commandes en cours.
        </p>
      </Panel>

      {products.map((p) => (
        <Panel key={p.id}>
          <PanelTitle
            title={p.name}
            hint={p.id === "FAIRE_PART" ? "Produit phare" : "Produit d'annonce"}
            action={
              <div className="flex items-center gap-4 text-xs text-neutral-500">
                <label className="flex items-center gap-2">
                  Visible sur le site
                  <AdminSwitch
                    checked={p.visible ?? true}
                    onChange={(v) => updateProduct(p.id, { visible: v })}
                    label="Visible sur le site"
                  />
                </label>
                <label className="flex items-center gap-2">
                  3× sans frais
                  <AdminSwitch
                    checked={p.installments ?? false}
                    onChange={(v) => updateProduct(p.id, { installments: v })}
                    label="Paiement en 3 fois"
                  />
                </label>
              </div>
            }
          />
          <div className="grid gap-4 p-6 md:grid-cols-3">
            <label className="flex flex-col gap-1 text-xs font-medium text-neutral-500">
              Nom du produit
              <input
                value={p.name}
                onChange={(e) => updateProduct(p.id, { name: e.target.value })}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-neutral-500">
              Prix TTC (€)
              <input
                type="number"
                min={0}
                step={1}
                value={p.priceCents / 100}
                onChange={(e) =>
                  updateProduct(p.id, {
                    priceCents: Math.round(Number(e.target.value) * 100),
                  })
                }
                className={cn(inputClass, "tabular")}
              />
            </label>
            <div className="flex flex-col gap-1 text-xs font-medium text-neutral-500">
              Aperçu tarif
              <p className="tabular flex h-9 items-center rounded-[10px] bg-neutral-100 px-3 text-sm font-semibold text-ink">
                {eur(p.priceCents)} TTC · HT {eur(Math.round(p.priceCents / 1.2))}
              </p>
            </div>
            <label className="flex flex-col gap-1 text-xs font-medium text-neutral-500 md:col-span-3">
              Description
              <input
                value={p.description ?? ""}
                onChange={(e) =>
                  updateProduct(p.id, { description: e.target.value })
                }
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-neutral-500">
              Durée vidéo (min)
              <input
                type="number"
                min={0}
                value={p.durationMin ?? 0}
                onChange={(e) =>
                  updateProduct(p.id, { durationMin: Number(e.target.value) })
                }
                className={cn(inputClass, "tabular")}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-neutral-500">
              Révisions incluses
              <input
                type="number"
                min={0}
                value={p.revisionsIncluded ?? 0}
                onChange={(e) =>
                  updateProduct(p.id, {
                    revisionsIncluded: Number(e.target.value),
                  })
                }
                className={cn(inputClass, "tabular")}
              />
            </label>
          </div>
          {/* Features éditables */}
          <div className="border-t border-neutral-200 px-6 py-4">
            <p className="mb-2 text-xs font-medium text-neutral-500">
              Points forts affichés sur la page offres
            </p>
            <div className="flex flex-col gap-2">
              {(p.features ?? []).map((f, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={f}
                    onChange={(e) => {
                      const next = [...(p.features ?? [])];
                      next[i] = e.target.value;
                      updateProduct(p.id, { features: next });
                    }}
                    className={cn(inputClass, "h-8 max-w-md text-xs")}
                  />
                  <button
                    aria-label="Supprimer"
                    onClick={() =>
                      updateProduct(p.id, {
                        features: (p.features ?? []).filter((_, j) => j !== i),
                      })
                    }
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-500 hover:bg-error/10 hover:text-error"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <AdminButton
                variant="ghost"
                className="self-start"
                onClick={() =>
                  updateProduct(p.id, {
                    features: [...(p.features ?? []), "Nouveau point fort"],
                  })
                }
              >
                <Plus /> Ajouter un point fort
              </AdminButton>
            </div>
          </div>
        </Panel>
      ))}

      {/* Options / add-ons */}
      <Panel>
        <PanelTitle title="Options (add-ons)" hint="Proposées au checkout" />
        <div className="flex flex-col gap-2 p-6">
          {options.map((o) => (
            <div key={o.id} className="flex flex-wrap items-center gap-2">
              <input
                value={o.label}
                onChange={(e) => updateOption(o.id, { label: e.target.value })}
                className={cn(inputClass, "h-8 max-w-xs text-xs")}
              />
              <input
                type="number"
                min={0}
                value={o.priceCents / 100}
                onChange={(e) =>
                  updateOption(o.id, {
                    priceCents: Math.round(Number(e.target.value) * 100),
                  })
                }
                className={cn(inputClass, "tabular h-8 w-24 text-xs")}
                aria-label="Prix en euros"
              />
              <span className="tabular text-xs text-neutral-500">€</span>
              <label className="ml-auto flex items-center gap-2 text-xs text-neutral-500">
                Visible
                <AdminSwitch
                  checked={o.visible ?? true}
                  onChange={(v) => updateOption(o.id, { visible: v })}
                  label="Option visible"
                />
              </label>
              <button
                aria-label="Supprimer l'option"
                onClick={() => setOptions((os) => os.filter((x) => x.id !== o.id))}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-500 hover:bg-error/10 hover:text-error"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <AdminButton
            variant="ghost"
            className="self-start"
            onClick={() =>
              setOptions((os) => [
                ...os,
                {
                  id: `opt-${Date.now().toString(36)}`,
                  label: "Nouvelle option",
                  priceCents: 0,
                  visible: true,
                },
              ])
            }
          >
            <Plus /> Ajouter une option
          </AdminButton>
        </div>
      </Panel>

      <AdminButton className="self-start" disabled={save.isPending} onClick={persist}>
        {save.isPending ? <Loader2 className="animate-spin" /> : <Save />}
        Enregistrer produits & prix
      </AdminButton>
    </div>
  );
}

// ---------------------------------------------------------------- emails ----

function TabEmails({ push }: { push: Push }) {
  const q = trpc.settings.get.useQuery({ key: "emailTemplates" });
  const save = useSaveSetting(push);

  const [templates, setTemplates] = useState<EmailTemplateDraft[]>(
    DEFAULT_EMAIL_TEMPLATES,
  );
  const [selectedId, setSelectedId] = useState(DEFAULT_EMAIL_TEMPLATES[0].id);
  const [device, setDevice] = useState<"mobile" | "desktop">("mobile");
  const [loaded, setLoaded] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (loaded) return;
    const v = q.data?.value as EmailTemplateDraft[] | null | undefined;
    if (Array.isArray(v) && v.length > 0) setTemplates(v);
    setLoaded(true);
  }, [q.data, loaded]);

  const selected = templates.find((t) => t.id === selectedId) ?? templates[0];

  const updateSelected = (patch: Partial<EmailTemplateDraft>) =>
    setTemplates((ts) => ts.map((t) => (t.id === selected.id ? { ...t, ...patch } : t)));

  const insertVariable = (v: string) => {
    const el = bodyRef.current;
    if (!el) {
      updateSelected({ body: selected.body + v });
      return;
    }
    const start = el.selectionStart ?? selected.body.length;
    const end = el.selectionEnd ?? start;
    const next = selected.body.slice(0, start) + v + selected.body.slice(end);
    updateSelected({ body: next });
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + v.length, start + v.length);
    });
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[280px_1fr]">
      {/* Liste des templates */}
      <Panel className="self-start">
        <PanelTitle title="Emails transactionnels" />
        <div className="flex flex-col p-2">
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedId(t.id)}
              className={cn(
                "flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                t.id === selected.id
                  ? "bg-neutral-100 font-medium text-ink"
                  : "text-neutral-500 hover:bg-neutral-100 hover:text-ink",
              )}
            >
              <span className="min-w-0">
                <span className="block truncate">{t.name}</span>
                {t.auto ? (
                  <span className="text-[10px] text-neutral-500">{t.auto}</span>
                ) : null}
              </span>
              <span
                className={cn(
                  "h-2 w-2 shrink-0 rounded-full",
                  t.active ? "bg-success" : "bg-neutral-200",
                )}
                aria-label={t.active ? "actif" : "inactif"}
              />
            </button>
          ))}
        </div>
      </Panel>

      {/* Éditeur */}
      <Panel>
        <PanelTitle
          title={selected.name}
          action={
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-full border border-neutral-200 p-0.5">
                {(
                  [
                    { id: "mobile", icon: Smartphone },
                    { id: "desktop", icon: Monitor },
                  ] as const
                ).map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setDevice(d.id)}
                    aria-label={`Aperçu ${d.id}`}
                    className={cn(
                      "flex h-7 w-8 items-center justify-center rounded-full transition-colors",
                      device === d.id
                        ? "bg-terracotta-500 text-white"
                        : "text-neutral-500",
                    )}
                  >
                    <d.icon className="h-3.5 w-3.5" />
                  </button>
                ))}
              </div>
              <AdminButton
                variant="outline"
                onClick={() => push("success", "Email de test envoyé à votre adresse.")}
              >
                <Mail /> M'envoyer un test
              </AdminButton>
            </div>
          }
        />
        <div className="grid gap-4 p-6 lg:grid-cols-2">
          <div className="flex flex-col gap-3">
            <label className="flex items-center justify-between text-xs font-medium text-neutral-500">
              Actif
              <AdminSwitch
                checked={selected.active}
                onChange={(v) => updateSelected({ active: v })}
                label="Template actif"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-neutral-500">
              Objet
              <input
                value={selected.subject}
                onChange={(e) => updateSelected({ subject: e.target.value })}
                className={inputClass}
              />
            </label>
            <div className="flex flex-wrap gap-1.5">
              {EMAIL_VARIABLES.map((v) => (
                <motion.button
                  key={v}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => insertVariable(v)}
                  className="rounded-full bg-terracotta-500/10 px-2.5 py-1 text-[11px] font-medium text-terracotta-500"
                >
                  {v}
                </motion.button>
              ))}
            </div>
            <label className="flex flex-col gap-1 text-xs font-medium text-neutral-500">
              Corps
              <textarea
                ref={bodyRef}
                value={selected.body}
                onChange={(e) => updateSelected({ body: e.target.value })}
                rows={8}
                className={textareaClass}
              />
            </label>
            <AdminButton
              className="self-start"
              disabled={save.isPending}
              onClick={() => save.mutate({ key: "emailTemplates", value: templates })}
            >
              {save.isPending ? <Loader2 className="animate-spin" /> : <Save />}
              Enregistrer les templates
            </AdminButton>
          </div>

          {/* Aperçu */}
          <div className="flex justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={device}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className={cn(
                  "overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_8px_32px_rgba(27,27,30,0.08)]",
                  device === "mobile" ? "w-[300px]" : "w-full max-w-md",
                )}
              >
                <div className="bg-anthracite-900 px-4 py-3">
                  <p className="font-display italic text-white">Scroll The Date</p>
                </div>
                <div className="p-4">
                  <p className="text-sm font-semibold text-ink">
                    {selected.subject
                      .replace("{{prenoms}}", "Anna & Théo")
                      .replace("{{date_mariage}}", "20 juin 2026")}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-neutral-500">
                    {selected.body
                      .replaceAll("{{prenoms}}", "Anna & Théo")
                      .replaceAll("{{lien_espace}}", "scrollthedate.fr/espace")
                      .replaceAll("{{date_mariage}}", "20 juin 2026")}
                  </p>
                  <div className="mt-4 h-8 w-36 rounded-full bg-terracotta-500 text-center text-xs font-medium leading-8 text-white">
                    Ouvrir mon espace
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </Panel>
    </div>
  );
}


// ---------------------------------------------------------- notifications ----

function TabNotifications({ push }: { push: Push }) {
  const notifQ = trpc.settings.get.useQuery({ key: "notifications" });
  const quickQ = trpc.settings.get.useQuery({ key: "quickReplies" });
  const save = useSaveSetting(push);

  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_NOTIFS);
  const [recap, setRecap] = useState(true);
  const [recapHour, setRecapHour] = useState("08:00");
  const [quickReplies, setQuickReplies] = useState<string[]>(DEFAULT_QUICK_REPLIES);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (loaded) return;
    const nv = notifQ.data?.value as
      | { events?: NotifPrefs; recap?: boolean; recapHour?: string }
      | null
      | undefined;
    if (nv?.events) setPrefs({ ...DEFAULT_NOTIFS, ...nv.events });
    if (typeof nv?.recap === "boolean") setRecap(nv.recap);
    if (nv?.recapHour) setRecapHour(nv.recapHour);
    const qv = quickQ.data?.value as string[] | null | undefined;
    if (Array.isArray(qv) && qv.length > 0) setQuickReplies(qv);
    setLoaded(true);
  }, [notifQ.data, quickQ.data, loaded]);

  const setEvent = (id: string, channel: "email" | "push", v: boolean) =>
    setPrefs((p) => ({ ...p, [id]: { ...p[id], [channel]: v } }));

  const persist = () => {
    save.mutate({ key: "notifications", value: { events: prefs, recap, recapHour } });
    save.mutate({ key: "quickReplies", value: quickReplies });
  };

  return (
    <div className="flex flex-col gap-4">
      <Panel>
        <PanelTitle title="Événements" hint="Email et/ou notification navigateur" />
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-500">
              <th className="px-6 py-3">Événement</th>
              <th className="px-3 py-3 text-center">Email</th>
              <th className="px-3 py-3 text-center">Push navigateur</th>
            </tr>
          </thead>
          <tbody>
            {NOTIF_EVENTS.map((e) => (
              <tr key={e.id} className="border-b border-neutral-200/70 last:border-0">
                <td className="px-6 py-3 text-ink">{e.label}</td>
                {(["email", "push"] as const).map((ch) => (
                  <td key={ch} className="px-3 py-3 text-center">
                    <AdminSwitch
                      checked={prefs[e.id]?.[ch] ?? false}
                      onChange={(v) => setEvent(e.id, ch, v)}
                      label={`${e.label} — ${ch}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel>
        <PanelTitle title="Récap quotidien" />
        <div className="flex flex-wrap items-center gap-4 p-6">
          <label className="flex items-center gap-2 text-sm text-ink">
            <AdminSwitch checked={recap} onChange={setRecap} label="Récap quotidien" />
            Recevoir un récapitulatif chaque matin
          </label>
          <input
            type="time"
            value={recapHour}
            onChange={(e) => setRecapHour(e.target.value)}
            disabled={!recap}
            className={cn(inputClass, "tabular w-28")}
            aria-label="Heure du récap"
          />
        </div>
      </Panel>

      <Panel>
        <PanelTitle
          title="Réponses rapides"
          hint="Insérables depuis la messagerie admin (bouton ⚡)"
        />
        <div className="flex flex-col gap-2 p-6">
          {quickReplies.map((r, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={r}
                onChange={(e) =>
                  setQuickReplies((qs) =>
                    qs.map((x, j) => (j === i ? e.target.value : x)),
                  )
                }
                className={cn(inputClass, "max-w-lg")}
              />
              <button
                aria-label="Supprimer"
                onClick={() => setQuickReplies((qs) => qs.filter((_, j) => j !== i))}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-500 hover:bg-error/10 hover:text-error"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <AdminButton
            variant="ghost"
            className="self-start"
            onClick={() => setQuickReplies((qs) => [...qs, "Nouvelle réponse rapide"])}
          >
            <Plus /> Ajouter une réponse
          </AdminButton>
        </div>
      </Panel>

      <AdminButton className="self-start" disabled={save.isPending} onClick={persist}>
        {save.isPending ? <Loader2 className="animate-spin" /> : <Save />}
        Enregistrer les notifications
      </AdminButton>
    </div>
  );
}

// ----------------------------------------------------------- intégrations ----

function TabIntegrations({ push }: { push: Push }) {
  const [testing, setTesting] = useState<string | null>(null);

  const test = (name: string, ok: boolean) => {
    setTesting(name);
    window.setTimeout(() => {
      setTesting(null);
      if (ok) push("success", `${name} : connexion réussie.`);
      else push("error", `${name} : échec du test de connexion.`);
    }, 1200);
  };

  const cards = [
    {
      id: "stripe",
      icon: CreditCard,
      name: "Stripe",
      status: "connected" as const,
      lines: ["Mode test · clé pk_test_••••••••4f2a", "Dernière synchro : aujourd'hui"],
      ok: true,
    },
    {
      id: "whatsapp",
      icon: MessageCircle,
      name: "WhatsApp Business",
      status: "connected" as const,
      lines: [
        "+33 6 12 34 56 78 — les notes vocales clients arrivent ici",
        "Rattachement manuel des vocaux aux projets",
      ],
      ok: true,
    },
    {
      id: "s3",
      icon: Server,
      name: "Stockage S3",
      status: "connected" as const,
      lines: ["Bucket scrollthedate-media", "Quota utilisé : 42 %"],
      ok: true,
    },
    {
      id: "email",
      icon: Mail,
      name: "Email transactionnel",
      status: "connected" as const,
      lines: ["Domaine scrollthedate.fr vérifié", "SPF ✓ · DKIM ✓"],
      ok: true,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {cards.map((c) => (
        <Panel key={c.id} className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-ink">
                <c.icon className="h-5 w-5" />
              </span>
              <p className="font-medium text-ink">{c.name}</p>
            </div>
            <AnimatePresence mode="wait">
              {testing === c.id ? (
                <motion.span
                  key="testing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 text-xs text-neutral-500"
                >
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Test…
                </motion.span>
              ) : (
                <motion.div
                  key="status"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Pill tone={c.status === "connected" ? "success" : "error"}>
                    {c.status === "connected" ? "connecté" : "erreur"}
                  </Pill>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <ul className="mt-3 flex flex-col gap-1">
            {c.lines.map((l) => (
              <li key={l} className="text-xs text-neutral-500">
                {l}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex gap-2">
            <AdminButton
              variant="outline"
              disabled={testing !== null}
              onClick={() => test(c.name, c.ok)}
            >
              Tester la connexion
            </AdminButton>
            <AdminButton
              variant="ghost"
              onClick={() => push("success", `Configuration ${c.name} enregistrée.`)}
            >
              Configurer
            </AdminButton>
          </div>
        </Panel>
      ))}
    </div>
  );
}

// --------------------------------------------------------------- sécurité ----

function TabSecurite({ push }: { push: Push }) {
  const { user } = useAuth();
  const ordersQ = trpc.orders.adminList.useQuery();
  const secQ = trpc.settings.get.useQuery({ key: "security" });
  const save = useSaveSetting(push);

  const [twoFactor, setTwoFactor] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(0);

  useEffect(() => {
    if (loaded) return;
    const v = secQ.data?.value as { twoFactor?: boolean } | null | undefined;
    if (typeof v?.twoFactor === "boolean") setTwoFactor(v.twoFactor);
    setLoaded(true);
  }, [secQ.data, loaded]);

  const exportAll = () => {
    const payload = {
      exporte_le: new Date().toISOString(),
      commandes: ordersQ.data ?? [],
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "scrollthedate-export-complet.json";
    a.click();
    URL.revokeObjectURL(url);
    push("success", "Export complet téléchargé.");
  };

  return (
    <div className="flex flex-col gap-4">
      <Panel>
        <PanelTitle title="Authentification" />
        <div className="flex flex-col gap-4 p-6">
          <div className="flex items-center justify-between gap-4 rounded-xl bg-neutral-100 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-ink">Mot de passe</p>
              <p className="text-xs text-neutral-500">
                Authentification par email et mot de passe (Supabase Auth). Utilisez
                « Mot de passe oublié » sur l'écran de connexion pour le modifier.
              </p>
            </div>
            <Pill tone="info">Supabase Auth</Pill>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-xl border border-neutral-200 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-ink">
                Double authentification (2FA)
              </p>
              <p className="text-xs text-neutral-500">
                Code TOTP demandé à chaque connexion admin.
              </p>
            </div>
            <AdminSwitch
              checked={twoFactor}
              onChange={(v) => {
                setTwoFactor(v);
                save.mutate({ key: "security", value: { twoFactor: v } });
              }}
              label="Activer la 2FA"
            />
          </div>
          {twoFactor ? (
            <div className="flex items-center gap-3 rounded-xl border border-neutral-200 p-4">
              <div className="grid h-24 w-24 shrink-0 grid-cols-6 gap-0.5 rounded-lg border border-neutral-200 bg-white p-2">
                {Array.from({ length: 36 }).map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "rounded-[1px]",
                      (i * 7 + 3) % 5 < 2 ? "bg-anthracite-900" : "bg-neutral-100",
                    )}
                  />
                ))}
              </div>
              <p className="text-xs text-neutral-500">
                Scannez ce QR TOTP avec votre application d'authentification pour
                activer la 2FA.
              </p>
            </div>
          ) : null}
        </div>
      </Panel>

      <Panel>
        <PanelTitle title="Sessions actives" />
        <div className="p-6">
          <div className="flex items-center justify-between gap-4 rounded-xl border border-neutral-200 px-4 py-3">
            <div className="flex items-center gap-3">
              <Monitor className="h-4 w-4 text-neutral-500" />
              <div>
                <p className="text-sm font-medium text-ink">
                  Cet appareil — {user?.email ?? "admin"}
                </p>
                <p className="tabular text-xs text-neutral-500">
                  Dernière connexion : {fmtDate(user?.lastSignInAt)} ·{" "}
                  {fmtTime(user?.lastSignInAt)}
                </p>
              </div>
            </div>
            <Pill tone="success">
              <Check className="h-3 w-3" /> session courante
            </Pill>
          </div>
        </div>
      </Panel>

      {/* Zone danger */}
      <Panel className="border-error/30">
        <PanelTitle title="Zone danger" />
        <div className="flex flex-col gap-3 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-ink">
                Export complet des données (RGPD)
              </p>
              <p className="text-xs text-neutral-500">
                Télécharge toutes les commandes au format JSON.
              </p>
            </div>
            <AdminButton variant="outline" onClick={exportAll}>
              <Download /> Exporter
            </AdminButton>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 pt-3">
            <div>
              <p className="text-sm font-medium text-ink">Suppression du compte</p>
              <p className="text-xs text-neutral-500">
                Action irréversible — double confirmation requise.
              </p>
            </div>
            {confirmDelete === 0 ? (
              <AdminButton variant="danger" onClick={() => setConfirmDelete(1)}>
                <Trash2 /> Supprimer…
              </AdminButton>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-xs font-medium text-error">
                  Confirmer la demande ?
                </p>
                <AdminButton
                  variant="danger"
                  onClick={() => {
                    setConfirmDelete(0);
                    push(
                      "success",
                      "Demande enregistrée — contactez support@scrollthedate.fr pour finaliser.",
                    );
                  }}
                >
                  Oui, confirmer
                </AdminButton>
                <AdminButton variant="ghost" onClick={() => setConfirmDelete(0)}>
                  <X /> Annuler
                </AdminButton>
              </div>
            )}
          </div>
        </div>
      </Panel>
    </div>
  );
}
