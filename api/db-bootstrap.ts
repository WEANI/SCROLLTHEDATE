import { exec } from "node:child_process";
import path from "node:path";
import { sql } from "drizzle-orm";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { getDb } from "./queries/connection";
import { alertOwner } from "./lib/alerts";

const MIGRATIONS_FOLDER = path.resolve(process.cwd(), "db/migrations");

/**
 * Base créée avant les migrations versionnées (synchro `drizzle-kit push`
 * à chaque démarrage, jusqu'au 14/11/2026) : sa structure correspond déjà à
 * la migration 0000_baseline. On l'enregistre comme appliquée — sans
 * l'exécuter — pour que seules les migrations suivantes tournent.
 * Sans effet sur une base neuve (vide : la baseline s'exécute normalement)
 * ou déjà suivie (au moins une migration enregistrée).
 */
async function adoptExistingDatabase() {
  const db = getDb();
  await db.execute(sql`create schema if not exists drizzle`);
  await db.execute(
    sql`create table if not exists drizzle.__drizzle_migrations (id serial primary key, hash text not null, created_at bigint)`,
  );
  const [{ n }] = (await db.execute(
    sql`select count(*)::int as n from drizzle.__drizzle_migrations`,
  )) as unknown as { n: number }[];
  if (n > 0) return;
  const [{ exists }] = (await db.execute(
    sql`select to_regclass('public.orders') is not null as exists`,
  )) as unknown as { exists: boolean }[];
  if (!exists) return;
  const [baseline] = readMigrationFiles({ migrationsFolder: MIGRATIONS_FOLDER });
  await db.execute(
    sql`insert into drizzle.__drizzle_migrations (hash, created_at) values (${baseline.hash}, ${baseline.folderMillis})`,
  );
  console.log("[db-bootstrap] base existante enregistrée comme point de départ (0000_baseline)");
}

/**
 * Bootstrap base de données, au démarrage du serveur, en tâche de fond —
 * sans jamais bloquer ni faire échouer le démarrage si la base est
 * temporairement inaccessible.
 *
 * 1. Migrations versionnées (db/migrations, générées par
 *    `npm run db:generate` après une modification de db/schema.ts, relues
 *    et commitées) : seules celles pas encore appliquées tournent, dans
 *    l'ordre, dans une transaction. Remplace `drizzle-kit push`, qui
 *    modifiait la base « au jugé » et échouait en silence dès qu'il voulait
 *    poser une question (cas réel : table site_events jamais créée).
 * 2. Seed idempotent (db/seed.ts) : réglages par défaut s'ils manquent.
 */
export function bootstrapDatabase() {
  if (!process.env.DATABASE_URL) return;
  void (async () => {
    try {
      await adoptExistingDatabase();
      await migrate(getDb(), { migrationsFolder: MIGRATIONS_FOLDER });
      console.log("[db-bootstrap] migrations à jour");
    } catch (err) {
      await alertOwner("db-migrations", "Mise à jour de la base échouée au démarrage", err);
      return;
    }
    exec("npx tsx db/seed.ts", { cwd: process.cwd(), env: process.env }, (err, stdout, stderr) => {
      if (err) {
        console.warn("[db-bootstrap] échec du seed :", err.message);
        return;
      }
      if (stdout) console.log("[db-bootstrap]", stdout.slice(-500));
      if (stderr) console.warn("[db-bootstrap]", stderr.slice(-300));
    });
  })();
}
