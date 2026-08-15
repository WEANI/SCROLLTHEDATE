import "dotenv/config";
import { eq } from "drizzle-orm";
import { getDb } from "../api/queries/connection";
import {
  auditEvents,
  formTemplates,
  media,
  messages,
  notifications,
  orders,
  projects,
  questionnaires,
  rsvpConfig,
  rsvpResponses,
  scenarioProposals,
  siteSettings,
  users,
  videoVersions,
  voiceNotes,
} from "./schema";

// ---------------------------------------------------------------------------
// Seed Félicity
//
// Auth : Supabase Auth (voir api/context.ts, api/queries/users.ts). Le rôle
// "admin" est attribué automatiquement à la première connexion réelle de
// l'utilisateur dont l'email == OWNER_EMAIL (env). Les comptes de démo
// ci-dessous n'ont pas de compte Supabase Auth associé (authUserId = null) —
// ce sont juste des fixtures pour peupler les dashboards. Quand le vrai
// propriétaire se connecte, une ligne distincte (avec authUserId) est créée ;
// ce n'est pas un problème pour la démo, tout le reste référence `users.id`.
// ---------------------------------------------------------------------------

async function upsertUser(data: {
  name: string;
  email: string;
  role: "user" | "admin";
}) {
  const db = getDb();
  const existing = await db.query.users.findFirst({
    where: eq(users.email, data.email),
  });
  if (existing) {
    await db
      .update(users)
      .set({ name: data.name, role: data.role, lastSignInAt: new Date() })
      .where(eq(users.id, existing.id));
    return { ...existing, name: data.name, role: data.role };
  }
  const [row] = await db
    .insert(users)
    .values({ ...data, lastSignInAt: new Date() })
    .returning();
  return row;
}

async function upsertSetting(key: string, value: unknown) {
  await getDb()
    .insert(siteSettings)
    .values({ key, value: value as Record<string, unknown> })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: { value: value as Record<string, unknown> },
    });
}

async function seed() {
  const db = getDb();
  console.log("Seeding database...");

  // --- Utilisateurs ---------------------------------------------------------
  const admin = await upsertUser({
    name: "Élise Félicity",
    email: "elise@felicity.fr",
    role: "admin",
  });
  const annaTheo = await upsertUser({
    name: "Anna & Théo",
    email: "anna.theo@demo.felicity.fr",
    role: "user",
  });
  const mehdiSarah = await upsertUser({
    name: "Mehdi & Sarah",
    email: "mehdi.sarah@demo.felicity.fr",
    role: "user",
  });
  console.log("Users:", admin.id, annaTheo.id, mehdiSarah.id);

  // --- Site settings : produits & prix --------------------------------------
  await upsertSetting("products", [
    {
      id: "FAIRE_PART",
      name: "Faire-part digital",
      priceCents: 34900,
      description:
        "Vidéo 60–90 s racontant votre histoire, page complète (programme, lieu, hébergements), RSVP en ligne, 3 propositions de scénario.",
      features: [
        "Vidéo cinématique 60–90 s",
        "3 propositions de scénario",
        "Page faire-part complète + RSVP",
        "Lien illimité",
        "2 révisions incluses",
      ],
    },
    {
      id: "SAVE_THE_DATE",
      name: "Save the Date digital",
      priceCents: 14900,
      description:
        "Vidéo 30–45 s, page d'annonce élégante avec la date, lien illimité.",
      features: [
        "Vidéo 30–45 s",
        "Page d'annonce",
        "Lien illimité",
        "1 révision incluse",
      ],
    },
  ]);
  await upsertSetting("options", [
    { id: "revisions", label: "Révisions illimitées", priceCents: 6000 },
    { id: "sous-titres", label: "Sous-titres FR/EN", priceCents: 4000 },
    { id: "version-courte", label: "Version courte réseaux", priceCents: 9000 },
  ]);
  await upsertSetting("texts", {
    baseline: "Votre histoire, racontée en images.",
    contactWhatsApp: "+33600000000",
    deliveryEstimateDays: 21,
  });

  // --- Template de questionnaire actif (~15 questions) ----------------------
  const questions = [
    { id: "couple.prenoms", step: 1, type: "text", label: "Vos prénoms", placeholder: "Anna & Théo", required: true, showOnInvite: true },
    { id: "couple.surnoms", step: 1, type: "text", label: "Les surnoms que vous vous donnez", help: "ex. : « J'ai dit oui avant même qu'il finisse sa phrase » — soyez vous-mêmes" },
    { id: "couple.qui_repond", step: 1, type: "text", label: "Qui de vous deux répond ?", required: true },
    { id: "couple.trois_mots", step: 1, type: "text", label: "Votre couple en 3 mots", placeholder: "drôle, entier, solaire" },
    { id: "rencontre.lieu_date", step: 2, type: "textarea", label: "Où et quand vous êtes-vous rencontrés ?", required: true },
    { id: "rencontre.premier_souvenir", step: 2, type: "textarea", label: "Votre premier souvenir ensemble" },
    { id: "rencontre.le_declic", step: 2, type: "textarea", label: "Le moment où vous avez su", required: true },
    { id: "rencontre.anecdote", step: 2, type: "textarea", label: "Une anecdote que vos amis racontent toujours" },
    { id: "jourj.date", step: 3, type: "date", label: "Date du mariage", required: true, showOnInvite: true },
    { id: "jourj.lieu_ceremonie", step: 3, type: "text", label: "Lieu de cérémonie + adresse", required: true, showOnInvite: true },
    { id: "jourj.heure", step: 3, type: "text", label: "Heure de la cérémonie", showOnInvite: true },
    { id: "jourj.hebergements", step: 3, type: "list", label: "Hébergements recommandés", help: "Nom + distance + lien, un par ligne", showOnInvite: true },
    { id: "jourj.dress_code", step: 3, type: "text", label: "Dress code", showOnInvite: true },
    { id: "jourj.infos_pratiques", step: 3, type: "textarea", label: "Infos pratiques (navette, parking, enfants…)", showOnInvite: true },
    { id: "style.ambiance", step: 4, type: "choice", label: "Ambiance souhaitée (Éditorial / Cinéma / Minimal)", required: true },
    { id: "style.theme_couleurs", step: 4, type: "text", label: "Thème et couleurs du mariage", placeholder: "Bohème chic — terracotta, sauge, lin", help: "La palette qui inspire le montage et le faire-part", showOnInvite: true },
    { id: "style.musiques", step: 4, type: "text", label: "Musiques que vous aimez (3 max)" },
    { id: "style.a_eviter", step: 4, type: "textarea", label: "Ce que vous ne voulez surtout pas" },
  ];
  const existingTemplate = await db.query.formTemplates.findFirst({
    where: eq(formTemplates.active, true),
  });
  if (!existingTemplate) {
    await db
      .insert(formTemplates)
      .values({ name: "Questionnaire mariage v2", questions, active: true });
  }

  // --- Projet démo complet « Anna & Théo » ----------------------------------
  const existingDemo = await db.query.projects.findFirst({
    where: eq(projects.slug, "anna-theo"),
  });
  if (existingDemo) {
    console.log("Demo project anna-theo already exists, skipping.");
  } else {
    const [{ id: orderId }] = await db
      .insert(orders)
      .values({
        userId: annaTheo.id,
        product: "FAIRE_PART",
        options: [
          { id: "sous-titres", label: "Sous-titres FR/EN", priceCents: 4000 },
        ],
        amountCents: 38900,
        paymentStatus: "paid",
        stripeRef: "test_seed_anna_theo",
        createdAt: new Date("2025-12-28T10:00:00Z"),
      })
      .returning({ id: orders.id });

    const [{ id: projectId }] = await db
      .insert(projects)
      .values({
        orderId,
        userId: annaTheo.id,
        status: "DELIVERED",
        weddingDate: new Date("2026-06-20T15:00:00Z"),
        venue: "Domaine de Clairval, 84140 Lourmarin, Provence",
        progress: 100,
        slug: "anna-theo",
        template: "cinema",
        createdAt: new Date("2025-12-28T10:05:00Z"),
      })
      .returning({ id: projects.id });

    await db.insert(questionnaires).values({
      projectId,
      completionPct: 100,
      answers: {
        "couple.prenoms": "Anna & Théo",
        "couple.surnoms": "« Capitaine » et « Moussaillon »",
        "couple.qui_repond": "Anna (mais Théo relit tout)",
        "couple.trois_mots": "drôle, entier, solaire",
        "rencontre.lieu_date":
          "Un soir de pluie en novembre 2019, dans un café parisien du 11e. Théo a renversé son café sur mon carnet — et a insisté pour m'en offrir un nouveau.",
        "rencontre.premier_souvenir":
          "Le carnet gondolé, séché au radiateur, que j'ai gardé.",
        "rencontre.le_declic":
          "Trois semaines après, un roadtrip en van le long des falaises normandes. À l'arrivée, on ne voulait plus repartir.",
        "rencontre.anecdote":
          "Nos amis racontent toujours le café renversé. Théo jure que c'était calculé.",
        "jourj.date": "2026-06-20",
        "jourj.lieu_ceremonie":
          "Domaine de Clairval, 84140 Lourmarin, Provence",
        "jourj.heure": "17h00",
        "jourj.hebergements":
          "Hôtel Bastide de Lourmarin (5 min) · Mas des Oliviers (12 min)",
        "jourj.dress_code": "Chic estival — tons neutres, pas de blanc",
        "jourj.infos_pratiques":
          "Navette depuis Aix-en-Provence TGV à 15h30. Parking sur place. Les enfants sont les bienvenus.",
        "style.ambiance": "Cinéma",
        "style.musiques": "Noviembre — Polo & Pan · The Bones — Maren Morris",
        "style.a_eviter": "Rien de sirupeux, pas de violons lents.",
      },
      updatedAt: new Date("2025-12-29T18:30:00Z"),
    });

    await db.insert(voiceNotes).values({
      projectId,
      url: "/demo-voice-note.webm",
      durationSec: 222,
      status: "processed",
      createdAt: new Date("2026-01-04T09:00:00Z"),
    });

    await db.insert(media).values([
      { projectId, type: "photo", url: "/story-rencontre.jpg", filename: "rencontre.jpg", status: "validated" },
      { projectId, type: "photo", url: "/story-voyage.jpg", filename: "roadtrip.jpg", status: "validated" },
      { projectId, type: "photo", url: "/story-demande.jpg", filename: "demande.jpg", status: "validated" },
      { projectId, type: "photo", url: "/venue.jpg", filename: "domaine.jpg", status: "received" },
    ]);

    await db.insert(scenarioProposals).values([
      {
        projectId,
        ordre: 1,
        title: "Le café renversé",
        summary:
          "Un récit intimiste en trois actes : la pluie parisienne, le carnet gondolé, la demande. Ton doux, voix off entrecoupée de rires.",
        moodboard: [
          { url: "/story-rencontre.jpg", caption: "La rencontre" },
          { url: "/gallery-1.jpg", caption: "Mains" },
          { url: "/story-demande.jpg", caption: "La demande" },
        ],
        status: "chosen",
        sentAt: new Date("2026-01-12T10:00:00Z"),
        chosenAt: new Date("2026-01-14T21:00:00Z"),
      },
      {
        projectId,
        ordre: 2,
        title: "Trois semaines, un van",
        summary:
          "L'aventure comme fil rouge : le roadtrip en Normandie raconté comme un voyage initiatique. Rythme plus soutenu, plans larges.",
        moodboard: [
          { url: "/story-voyage.jpg", caption: "Le van" },
          { url: "/gallery-2.jpg", caption: "Face à la mer" },
        ],
        status: "pending",
        sentAt: new Date("2026-01-12T10:00:00Z"),
      },
      {
        projectId,
        ordre: 3,
        title: "La marée montante",
        summary:
          "Structure cinéma : ellipses, contre-jours, musique qui monte. Le plus ambitieux visuellement, le moins narratif.",
        moodboard: [
          { url: "/gallery-3.jpg", caption: "Confettis" },
          { url: "/gallery-4.jpg", caption: "Le voile" },
        ],
        status: "pending",
        sentAt: new Date("2026-01-12T10:00:00Z"),
      },
    ]);

    await db.insert(videoVersions).values([
      {
        projectId,
        version: 1,
        url: "/demo-film.mp4",
        watermark: true,
        status: "sent",
        createdAt: new Date("2026-01-24T15:00:00Z"),
      },
      {
        projectId,
        version: 2,
        url: "/demo-film.mp4",
        watermark: true,
        status: "approved",
        clientComment: [
          { timecode: "00:42", comment: "Rallonger le plan du van" },
        ],
        createdAt: new Date("2026-01-28T11:00:00Z"),
      },
      {
        projectId,
        version: 3,
        url: "/demo-film.mp4",
        watermark: false,
        status: "final",
        createdAt: new Date("2026-02-02T09:00:00Z"),
      },
    ]);

    await db.insert(rsvpConfig).values({
      projectId,
      enabled: true,
      questions: {
        deadline: "2026-05-01",
        askPlusOnes: true,
        askAllergies: true,
        askSong: true,
        askMessage: true,
      },
    });

    await db.insert(rsvpResponses).values([
      { projectId, guestName: "Claire Martin", email: "claire@example.com", attending: "yes", plusOnes: 1, song: "As It Was — Harry Styles", message: "On a hâte !" },
      { projectId, guestName: "Hugo Bernard", email: "hugo@example.com", attending: "yes", plusOnes: 0, allergies: "Arachides" },
      { projectId, guestName: "Inès & Karim", attending: "maybe", plusOnes: 2, message: "On confirme fin mars" },
      { projectId, guestName: "Tante Lucie", attending: "no", message: "De tout cœur avec vous depuis Montréal" },
    ]);

    await db.insert(messages).values([
      {
        projectId,
        senderRole: "customer",
        body: "Bonjour Élise ! Le questionnaire est rempli, dites-nous si vous avez besoin d'autre chose.",
        createdAt: new Date("2025-12-29T18:45:00Z"),
        readAt: new Date("2025-12-29T19:00:00Z"),
      },
      {
        projectId,
        senderRole: "admin",
        body: "C'est parfait, merci Anna ! L'anecdote du café renversé est en or — on part là-dessus pour l'un des scénarios. Réponse sous 10 jours.",
        createdAt: new Date("2025-12-30T09:15:00Z"),
        readAt: new Date("2025-12-30T10:00:00Z"),
      },
      {
        projectId,
        senderRole: "customer",
        body: "Les 3 propositions sont arrivées, on adore. On hésite entre le 1 et le 2, on vous dit ça demain !",
        createdAt: new Date("2026-01-12T20:30:00Z"),
        readAt: new Date("2026-01-12T21:00:00Z"),
      },
      {
        projectId,
        senderRole: "admin",
        body: "Votre faire-part est en ligne 🎬 Le lien : felicity.fr/m/anna-theo — la version finale HD remplacera le filigrane cette semaine.",
        createdAt: new Date("2026-02-02T09:30:00Z"),
      },
    ]);

    await db.insert(auditEvents).values([
      { projectId, actor: "system", action: "order.paid", meta: { orderId, amountCents: 38900 }, createdAt: new Date("2025-12-28T10:00:00Z") },
      { projectId, actor: `customer:${annaTheo.id}`, action: "questionnaire.started", createdAt: new Date("2025-12-28T20:00:00Z") },
      { projectId, actor: `customer:${annaTheo.id}`, action: "questionnaire.completed", meta: { completionPct: 100 }, createdAt: new Date("2025-12-29T18:30:00Z") },
      { projectId, actor: `customer:${annaTheo.id}`, action: "voice_note.received", meta: { durationSec: 222 }, createdAt: new Date("2026-01-04T09:00:00Z") },
      { projectId, actor: `admin:${admin.id}`, action: "scenarios.sent", meta: { count: 3 }, createdAt: new Date("2026-01-12T10:00:00Z") },
      { projectId, actor: `customer:${annaTheo.id}`, action: "scenario.chosen", meta: { title: "Le café renversé" }, createdAt: new Date("2026-01-14T21:00:00Z") },
      { projectId, actor: `admin:${admin.id}`, action: "project.status_changed", meta: { from: "SCENARIOS", to: "PRODUCTION" }, createdAt: new Date("2026-01-15T09:00:00Z") },
      { projectId, actor: `admin:${admin.id}`, action: "video.version_added", meta: { version: 1, watermark: true }, createdAt: new Date("2026-01-24T15:00:00Z") },
      { projectId, actor: `customer:${annaTheo.id}`, action: "video.changes_requested", meta: { version: 1 }, createdAt: new Date("2026-01-25T11:00:00Z") },
      { projectId, actor: `customer:${annaTheo.id}`, action: "video.approved", meta: { version: 2 }, createdAt: new Date("2026-01-30T19:00:00Z") },
      { projectId, actor: `admin:${admin.id}`, action: "video.version_added", meta: { version: 3, watermark: false, status: "final" }, createdAt: new Date("2026-02-02T09:00:00Z") },
      { projectId, actor: `admin:${admin.id}`, action: "project.status_changed", meta: { from: "REVIEW", to: "DELIVERED" }, createdAt: new Date("2026-02-02T09:30:00Z") },
    ]);

    await db.insert(notifications).values([
      {
        userId: annaTheo.id,
        type: "project.status_changed",
        payload: { projectId, slug: "anna-theo", status: "DELIVERED" },
        readAt: new Date("2026-02-02T12:00:00Z"),
      },
      {
        userId: admin.id,
        type: "video.approved",
        payload: { projectId, slug: "anna-theo", version: 2 },
      },
    ]);

    console.log("Demo project anna-theo created:", projectId);
  }

  // --- Second projet démo (Kanban non vide hors DELIVERED) ------------------
  const existingSecond = await db.query.projects.findFirst({
    where: eq(projects.slug, "mehdi-sarah"),
  });
  if (existingSecond) {
    console.log("Demo project mehdi-sarah already exists, skipping.");
  } else {
    const [{ id: orderId }] = await db
      .insert(orders)
      .values({
        userId: mehdiSarah.id,
        product: "SAVE_THE_DATE",
        options: [],
        amountCents: 14900,
        paymentStatus: "paid",
        stripeRef: "test_seed_mehdi_sarah",
      })
      .returning({ id: orders.id });

    const [{ id: projectId }] = await db
      .insert(projects)
      .values({
        orderId,
        userId: mehdiSarah.id,
        status: "QUESTIONNAIRE",
        weddingDate: new Date("2026-09-12T16:00:00Z"),
        venue: "Bordeaux",
        progress: 20,
        slug: "mehdi-sarah",
        template: "editorial",
      })
      .returning({ id: projects.id });

    await db.insert(questionnaires).values({
      projectId,
      completionPct: 41,
      answers: {
        "couple.prenoms": "Mehdi & Sarah",
        "couple.qui_repond": "Sarah",
        "couple.trois_mots": "complices, gourmands, voyageurs",
        "rencontre.lieu_date":
          "À une soirée d'anniversaire commune à Bordeaux, en 2021.",
        "jourj.date": "2026-09-12",
        "jourj.lieu_ceremonie": "Château Pape Clément, Pessac",
        "style.ambiance": "Éditorial",
      },
    });

    await db.insert(auditEvents).values([
      { projectId, actor: "system", action: "order.paid", meta: { orderId, amountCents: 14900 } },
      { projectId, actor: `customer:${mehdiSarah.id}`, action: "questionnaire.started", meta: { completionPct: 41 } },
    ]);

    await db.insert(messages).values({
      projectId,
      senderRole: "customer",
      body: "Bonjour, on avance sur le questionnaire — petite question : peut-on ajouter une seconde date possible ?",
    });

    console.log("Demo project mehdi-sarah created:", projectId);
  }

  console.log("Done.");
  process.exit(0); // close Postgres connection pool
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
