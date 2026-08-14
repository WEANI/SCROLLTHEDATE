import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  FileText,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { trpc } from "@/providers/trpc";
import { cn } from "@/lib/utils";
import {
  AdminButton,
  AdminSwitch,
  CountUp,
  EmptyState,
  PageHeader,
  Panel,
  Pill,
  ToastStack,
  fmtDate,
  inputClass,
  selectClass,
  useToasts,
} from "@/components/admin-suite/ui";
import {
  QUESTION_TYPES,
  type CompletionStat,
  type FormQuestion,
  type FormTemplate,
} from "@/components/admin-suite/types";

let localId = 0;
const newId = () => `q_${Date.now().toString(36)}_${++localId}`;

// ------------------------------------------------------------------ page ----

export default function Formulaires() {
  const [editing, setEditing] = useState<FormTemplate | null>(null);
  return (
    <div className="mx-auto w-full max-w-[1600px] text-ink">
      <AnimatePresence mode="wait">
        {editing ? (
          <motion.div
            key="editor"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <TemplateEditor template={editing} onClose={() => setEditing(null)} />
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <TemplatesOverview onEdit={setEditing} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ------------------------------------------------------- vue d'ensemble ----

function TemplatesOverview({ onEdit }: { onEdit: (t: FormTemplate) => void }) {
  const { toasts, push } = useToasts();
  const utils = trpc.useUtils();
  const templatesQ = trpc.questionnaire.adminListTemplates.useQuery();
  const statsQ = trpc.questionnaire.adminCompletionStats.useQuery();
  const save = trpc.questionnaire.adminSaveTemplate.useMutation({
    onError: () => push("error", "Échec de l'enregistrement du template."),
  });

  const templates = (templatesQ.data ?? []) as FormTemplate[];

  const duplicateActive = async () => {
    const source = templates.find((t) => t.active) ?? templates.at(0);
    if (!source) {
      // Aucun template : créer un squelette minimal
      const created = await save.mutateAsync({
        name: "Questionnaire mariage v1",
        active: true,
        questions: [
          {
            id: newId(),
            step: 1,
            type: "text",
            label: "Vos prénoms",
            placeholder: "Anna & Théo",
            required: true,
            showOnInvite: true,
          },
        ],
      });
      await utils.questionnaire.adminListTemplates.invalidate();
      push("success", "Template créé.");
      const list = (utils.questionnaire.adminListTemplates.getData() ??
        []) as FormTemplate[];
      const t = list.find((x) => x.id === created);
      if (t) onEdit(t);
      return;
    }
    const match = /v(\d+)$/i.exec(source.name);
    const name = match
      ? source.name.replace(/v(\d+)$/i, `v${Number(match[1]) + 1}`)
      : `${source.name} (copie)`;
    const created = await save.mutateAsync({
      name,
      active: false,
      questions: source.questions.map((q) => ({ ...q })),
    });
    await utils.questionnaire.adminListTemplates.invalidate();
    push("success", `« ${name} » créé par duplication.`);
    const list = (utils.questionnaire.adminListTemplates.getData() ??
      []) as FormTemplate[];
    const t = list.find((x) => x.id === created);
    if (t) onEdit(t);
  };

  return (
    <div>
      <PageHeader
        title="Formulaires"
        description="Les questions du questionnaire « Votre histoire », éditables sans toucher au code."
        actions={
          <AdminButton onClick={duplicateActive} disabled={save.isPending}>
            {save.isPending ? <Loader2 className="animate-spin" /> : <Plus />}
            Nouveau template
          </AdminButton>
        }
      />

      {/* Rangée 1 — templates */}
      <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {templatesQ.isLoading ? (
          <Panel className="col-span-full flex items-center justify-center gap-2 py-16 text-sm text-neutral-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Chargement des templates…
          </Panel>
        ) : templates.length === 0 ? (
          <Panel className="col-span-full">
            <EmptyState
              title="Aucun template"
              description="Créez votre premier questionnaire pour commencer à collecter les histoires."
              action={
                <AdminButton onClick={duplicateActive}>
                  <Plus /> Créer un template
                </AdminButton>
              }
            />
          </Panel>
        ) : (
          templates.map((t, i) => (
            <motion.button
              key={t.id}
              type="button"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => onEdit(t)}
              className={cn(
                "rounded-2xl border bg-white p-5 text-left shadow-[0_8px_32px_rgba(27,27,30,0.06)] transition-colors",
                t.active
                  ? "border-terracotta-500"
                  : "border-neutral-200 hover:border-terracotta-300",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <FileText className="h-5 w-5 text-terracotta-500" />
                {t.active ? (
                  <Pill tone="terracotta">actif</Pill>
                ) : (
                  <Pill tone="neutral">archivé</Pill>
                )}
              </div>
              <p className="font-display mt-3 text-lg text-ink">{t.name}</p>
              <p className="tabular mt-1 text-xs text-neutral-500">
                {t.questions.length} question(s) · créé le {fmtDate(t.createdAt)}
              </p>
            </motion.button>
          ))
        )}
      </div>

      {/* Rangée 2 — complétion */}
      <CompletionStats
        stats={statsQ.data as
          | {
              projectCount: number;
              avgCompletionPct: number;
              stats: CompletionStat[];
            }
          | undefined}
        loading={statsQ.isLoading}
      />
      <ToastStack toasts={toasts} />
    </div>
  );
}

// ------------------------------------------------------- stats complétion ----

function CompletionStats({
  stats,
  loading,
}: {
  stats:
    | { projectCount: number; avgCompletionPct: number; stats: CompletionStat[] }
    | undefined;
  loading: boolean;
}) {
  const [sortByDropoff, setSortByDropoff] = useState(false);

  const rows = useMemo(() => {
    const base = (stats?.stats ?? []).map((s, i, arr) => {
      // Abandon estimé : perte de complétion vs question précédente
      const prev = i > 0 ? arr[i - 1].completionPct : 100;
      const dropoff = Math.max(0, prev - s.completionPct);
      return { ...s, dropoff };
    });
    return sortByDropoff ? [...base].sort((a, b) => b.dropoff - a.dropoff) : base;
  }, [stats, sortByDropoff]);

  const worst = useMemo(
    () =>
      rows.length > 0
        ? rows.reduce((a, b) => (b.dropoff > a.dropoff ? b : a))
        : null,
    [rows],
  );

  const showOnInviteCount = stats?.stats.length ?? 0;

  return (
    <section>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta-500">
            Rangée 2
          </p>
          <h2 className="font-display mt-1 text-xl text-ink">
            Statistiques de complétion
          </h2>
        </div>
        <AdminButton variant="ghost" onClick={() => setSortByDropoff((v) => !v)}>
          {sortByDropoff ? "Tri : ordre du wizard" : "Trier par abandon"}
        </AdminButton>
      </div>

      {/* KPI */}
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <Panel className="p-5">
          <p className="text-xs text-neutral-500">Complétion moyenne</p>
          <p className="font-display tabular mt-1 text-3xl text-ink">
            <CountUp value={stats?.avgCompletionPct ?? 0} /> %
          </p>
        </Panel>
        <Panel className="p-5">
          <p className="text-xs text-neutral-500">Projets ayant répondu</p>
          <p className="font-display tabular mt-1 text-3xl text-ink">
            <CountUp value={stats?.projectCount ?? 0} />
          </p>
        </Panel>
        <Panel className="p-5">
          <p className="text-xs text-neutral-500">Questions suivies</p>
          <p className="font-display tabular mt-1 text-3xl text-ink">
            <CountUp value={showOnInviteCount} />
          </p>
        </Panel>
      </div>

      {worst && worst.dropoff > 5 ? (
        <Panel className="mb-4 border-info/30 bg-info/5 p-4">
          <p className="text-sm text-ink">
            <span className="font-semibold">Insight :</span> la question «{" "}
            {worst.label} » fait perdre environ {worst.dropoff} % des répondants —
            envisagez de la rendre optionnelle ou de la reformuler.
          </p>
        </Panel>
      ) : null}

      <Panel className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-neutral-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Calcul des taux…
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            title="Pas encore de statistiques"
            description="Les taux apparaîtront dès que des clients auront répondu au questionnaire."
          />
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-500">
                <th className="px-5 py-3">Question</th>
                <th className="px-3 py-3">Étape</th>
                <th className="w-[30%] px-3 py-3">Complétion</th>
                <th className="px-3 py-3 text-right">Réponses</th>
                <th className="px-3 py-3 text-right">Abandon</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className="border-b border-neutral-200/70 last:border-0">
                  <td className="px-5 py-3">
                    <span className="font-medium text-ink">{r.label}</span>
                    {r.required ? (
                      <Pill tone="neutral" className="ml-2">
                        requise
                      </Pill>
                    ) : null}
                  </td>
                  <td className="tabular px-3 py-3 text-neutral-500">{r.step}/4</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-200">
                        <motion.div
                          initial={{ scaleX: 0 }}
                          whileInView={{ scaleX: r.completionPct / 100 }}
                          viewport={{ once: true, amount: 0.3 }}
                          transition={{ delay: i * 0.05, duration: 0.6 }}
                          className="h-full origin-left rounded-full bg-terracotta-500"
                        />
                      </div>
                      <span className="tabular w-10 text-right text-xs font-medium">
                        {r.completionPct} %
                      </span>
                    </div>
                  </td>
                  <td className="tabular px-3 py-3 text-right text-neutral-500">
                    {r.answered}/{r.total}
                  </td>
                  <td
                    className={cn(
                      "tabular px-3 py-3 text-right font-medium",
                      r.dropoff > 15 ? "text-error" : "text-neutral-500",
                    )}
                  >
                    {r.dropoff} %
                    {r.dropoff > 15 ? (
                      <span className="ml-1 text-[10px] uppercase">bloque</span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </section>
  );
}


// -------------------------------------------------------------- éditeur ----

function TemplateEditor({
  template,
  onClose,
}: {
  template: FormTemplate;
  onClose: () => void;
}) {
  const { toasts, push } = useToasts();
  const utils = trpc.useUtils();
  const [name, setName] = useState(template.name);
  const [questions, setQuestions] = useState<FormQuestion[]>(() =>
    template.questions.map((q) => ({ ...q })),
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    template.questions.at(0)?.id ?? null,
  );
  const [previewStep, setPreviewStep] = useState(1);

  const save = trpc.questionnaire.adminSaveTemplate.useMutation({
    onError: () => push("error", "Échec de l'enregistrement."),
  });

  const persist = async (active: boolean) => {
    if (!name.trim()) {
      push("error", "Le template doit avoir un nom.");
      return;
    }
    if (questions.some((q) => !q.label.trim())) {
      push("error", "Chaque question doit avoir un libellé.");
      return;
    }
    await save.mutateAsync({
      id: template.id,
      name: name.trim(),
      active,
      questions: questions.map((q) => ({
        id: q.id,
        step: q.step,
        type: q.type,
        label: q.label.trim(),
        placeholder: q.placeholder || undefined,
        help: q.help || undefined,
        required: !!q.required,
        showOnInvite: !!q.showOnInvite,
      })),
    });
    await Promise.all([
      utils.questionnaire.adminListTemplates.invalidate(),
      utils.questionnaire.adminCompletionStats.invalidate(),
    ]);
    push(
      "success",
      active
        ? "Template publié — les nouveaux projets utiliseront cette version."
        : "Modifications enregistrées.",
    );
  };

  const update = (id: string, patch: Partial<FormQuestion>) =>
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)));

  const move = (id: string, dir: -1 | 1) =>
    setQuestions((qs) => {
      const idx = qs.findIndex((q) => q.id === id);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= qs.length) return qs;
      const next = [...qs];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });

  const duplicate = (id: string) =>
    setQuestions((qs) => {
      const idx = qs.findIndex((q) => q.id === id);
      if (idx < 0) return qs;
      const copy = { ...qs[idx], id: newId(), label: `${qs[idx].label} (copie)` };
      return [...qs.slice(0, idx + 1), copy, ...qs.slice(idx + 1)];
    });

  const remove = (id: string) =>
    setQuestions((qs) => qs.filter((q) => q.id !== id));

  const addQuestion = () => {
    const q: FormQuestion = {
      id: newId(),
      step: Math.min(4, Math.max(1, previewStep)),
      type: "text",
      label: "Nouvelle question",
      required: false,
      showOnInvite: false,
    };
    setQuestions((qs) => [...qs, q]);
    setSelectedId(q.id);
  };

  return (
    <div>
      {/* Barre haut */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button
          onClick={onClose}
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Templates
        </button>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={cn(inputClass, "max-w-xs font-medium")}
          aria-label="Nom du template"
        />
        {template.active ? <Pill tone="terracotta">actif</Pill> : null}
        <div className="ml-auto flex items-center gap-2">
          <AdminButton
            variant="outline"
            onClick={() => persist(template.active)}
            disabled={save.isPending}
          >
            {save.isPending ? <Loader2 className="animate-spin" /> : <Save />}
            Enregistrer
          </AdminButton>
          <AdminButton onClick={() => persist(true)} disabled={save.isPending}>
            Publier
          </AdminButton>
        </div>
      </div>
      <p className="mb-4 text-xs text-neutral-500">
        Publier active cette version pour les nouveaux projets — les projets en
        cours conservent leurs réponses.
      </p>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        {/* Liste des questions */}
        <div className="flex flex-col gap-3">
          <AnimatePresence initial={false}>
            {questions.map((q, idx) => (
              <motion.div
                key={q.id}
                layout="position"
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ type: "spring", stiffness: 320, damping: 30 }}
                onClick={() => {
                  setSelectedId(q.id);
                  setPreviewStep(q.step);
                }}
                className={cn(
                  "rounded-2xl border bg-white p-4 shadow-[0_8px_32px_rgba(27,27,30,0.06)] transition-colors",
                  selectedId === q.id
                    ? "border-terracotta-500 ring-2 ring-terracotta-500/15"
                    : "border-neutral-200",
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="tabular w-6 text-xs font-semibold text-neutral-500">
                    {idx + 1}
                  </span>
                  <input
                    value={q.label}
                    onChange={(e) => update(q.id, { label: e.target.value })}
                    className="h-8 flex-1 rounded-lg border border-transparent bg-transparent px-2 text-sm font-medium text-ink outline-none transition-colors hover:border-neutral-200 focus:border-terracotta-500 focus:bg-white"
                    aria-label="Libellé de la question"
                  />
                  <div className="flex items-center gap-0.5">
                    <IconBtn label="Monter" onClick={() => move(q.id, -1)} disabled={idx === 0}>
                      <ArrowUp />
                    </IconBtn>
                    <IconBtn
                      label="Descendre"
                      onClick={() => move(q.id, 1)}
                      disabled={idx === questions.length - 1}
                    >
                      <ArrowDown />
                    </IconBtn>
                    <IconBtn label="Dupliquer" onClick={() => duplicate(q.id)}>
                      <Copy />
                    </IconBtn>
                    <IconBtn label="Supprimer" danger onClick={() => remove(q.id)}>
                      <Trash2 />
                    </IconBtn>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <label className="flex flex-col gap-1 text-[11px] font-medium text-neutral-500">
                    Type de champ
                    <select
                      value={q.type}
                      onChange={(e) => update(q.id, { type: e.target.value })}
                      className={selectClass}
                    >
                      {QUESTION_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-[11px] font-medium text-neutral-500">
                    Étape du wizard
                    <select
                      value={q.step}
                      onChange={(e) => update(q.id, { step: Number(e.target.value) })}
                      className={selectClass}
                    >
                      {[1, 2, 3, 4].map((s) => (
                        <option key={s} value={s}>
                          Étape {s}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-[11px] font-medium text-neutral-500">
                    Placeholder
                    <input
                      value={q.placeholder ?? ""}
                      onChange={(e) => update(q.id, { placeholder: e.target.value })}
                      className={inputClass}
                    />
                  </label>
                </div>
                <label className="mt-2 flex flex-col gap-1 text-[11px] font-medium text-neutral-500">
                  Texte d'aide (exemple affiché sous le champ)
                  <input
                    value={q.help ?? ""}
                    onChange={(e) => update(q.id, { help: e.target.value })}
                    className={inputClass}
                  />
                </label>

                <div className="mt-3 flex flex-wrap items-center gap-5">
                  <label className="flex items-center gap-2 text-xs text-neutral-500">
                    <AdminSwitch
                      checked={!!q.required}
                      onChange={(v) => update(q.id, { required: v })}
                      label="Obligatoire"
                    />
                    Obligatoire
                  </label>
                  <label className="flex items-center gap-2 text-xs text-neutral-500">
                    <AdminSwitch
                      checked={!!q.showOnInvite}
                      onChange={(v) => update(q.id, { showOnInvite: v })}
                      label="Affiché sur le faire-part"
                    />
                    Affiché sur le faire-part
                    {q.showOnInvite ? <Pill tone="terracotta">public</Pill> : null}
                  </label>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          <AdminButton variant="outline" onClick={addQuestion} className="self-start">
            <Plus /> Ajouter une question
          </AdminButton>
        </div>

        {/* Aperçu client live */}
        <ClientPreview
          questions={questions}
          step={previewStep}
          onStepChange={setPreviewStep}
          selectedId={selectedId}
        />
      </div>
      <ToastStack toasts={toasts} />
    </div>
  );
}

function IconBtn({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-lg text-neutral-500 transition-colors disabled:opacity-30 [&_svg]:size-3.5",
        danger ? "hover:bg-error/10 hover:text-error" : "hover:bg-neutral-100 hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

// -------------------------------------------------------- aperçu client ----

function ClientPreview({
  questions,
  step,
  onStepChange,
  selectedId,
}: {
  questions: FormQuestion[];
  step: number;
  onStepChange: (s: number) => void;
  selectedId: string | null;
}) {
  const stepQuestions = questions.filter((q) => q.step === step);
  const selectedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [selectedId]);

  return (
    <div className="sticky top-6 self-start">
      <div className="mb-2 flex items-center gap-2 text-xs text-neutral-500">
        <Eye className="h-3.5 w-3.5" /> Aperçu client — mis à jour en direct
      </div>
      <div className="mx-auto w-[375px] overflow-hidden rounded-[28px] border border-neutral-200 bg-neutral-100 shadow-[0_8px_32px_rgba(27,27,30,0.12)]">
        {/* Stepper */}
        <div className="border-b border-neutral-200 bg-white px-5 pb-4 pt-5">
          <p className="font-display text-lg text-ink">Votre histoire</p>
          <div className="mt-3 flex gap-1.5">
            {[1, 2, 3, 4].map((s) => (
              <button
                key={s}
                onClick={() => onStepChange(s)}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors",
                  s < step
                    ? "bg-success"
                    : s === step
                      ? "bg-terracotta-500"
                      : "bg-neutral-200",
                )}
                aria-label={`Étape ${s}`}
              />
            ))}
          </div>
          <p className="tabular mt-2 text-[11px] text-neutral-500">
            Étape {step} sur 4
          </p>
        </div>
        {/* Questions */}
        <div className="max-h-[480px] overflow-y-auto px-5 py-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-4"
            >
              {stepQuestions.length === 0 ? (
                <p className="py-10 text-center text-sm text-neutral-500">
                  Aucune question à cette étape.
                </p>
              ) : (
                stepQuestions.map((q) => (
                  <div
                    key={q.id}
                    ref={q.id === selectedId ? selectedRef : undefined}
                    className={cn(
                      "rounded-xl border bg-white p-3.5 transition-colors",
                      q.id === selectedId
                        ? "border-terracotta-500"
                        : "border-neutral-200",
                    )}
                  >
                    <p className="text-sm font-medium text-ink">
                      {q.label}
                      {q.required ? (
                        <span className="ml-1 text-terracotta-500">*</span>
                      ) : null}
                    </p>
                    {q.help ? (
                      <p className="mt-0.5 text-xs text-neutral-500">{q.help}</p>
                    ) : null}
                    <div className="mt-2">
                      <PreviewField q={q} />
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="border-t border-neutral-200 bg-white px-5 py-3">
          <div className="h-9 w-full rounded-full bg-terracotta-500 text-center text-sm font-medium leading-9 text-white">
            Continuer
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewField({ q }: { q: FormQuestion }) {
  switch (q.type) {
    case "textarea":
      return (
        <div className="h-20 rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-2 text-xs text-neutral-500">
          {q.placeholder ?? "Votre réponse…"}
        </div>
      );
    case "date":
      return (
        <div className="flex h-9 items-center rounded-lg border border-neutral-200 bg-neutral-100 px-3 text-xs text-neutral-500">
          jj/mm/aaaa
        </div>
      );
    case "toggle":
      return (
        <div className="flex gap-2">
          {["Oui", "Non"].map((v) => (
            <span
              key={v}
              className="rounded-full border border-neutral-200 px-3 py-1 text-xs text-neutral-500"
            >
              {v}
            </span>
          ))}
        </div>
      );
    case "color":
      return (
        <div className="flex gap-2">
          {["#C96F5A", "#26262A", "#6FA287", "#7B8FA6"].map((c) => (
            <span
              key={c}
              className="h-6 w-6 rounded-full border border-neutral-200"
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      );
    case "cards":
      return (
        <div className="grid grid-cols-2 gap-2">
          {["Option A", "Option B"].map((v) => (
            <span
              key={v}
              className="rounded-lg border border-neutral-200 px-2 py-2 text-center text-xs text-neutral-500"
            >
              {v}
            </span>
          ))}
        </div>
      );
    case "list":
      return (
        <div className="flex flex-col gap-1">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-8 rounded-lg border border-neutral-200 bg-neutral-100 px-3 text-xs leading-8 text-neutral-500"
            >
              Élément {i}
            </div>
          ))}
        </div>
      );
    default:
      return (
        <div className="flex h-9 items-center rounded-lg border border-neutral-200 bg-neutral-100 px-3 text-xs text-neutral-500">
          {q.placeholder ?? "Votre réponse…"}
        </div>
      );
  }
}

