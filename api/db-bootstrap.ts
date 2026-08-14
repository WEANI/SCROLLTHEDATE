import { exec } from "node:child_process";

/**
 * Bootstrap base de données (idempotent).
 *
 * Base Postgres hébergée sur Supabase. On lance, au démarrage du serveur,
 * une synchro du schéma (`drizzle-kit push`) suivie du seed idempotent
 * (`db/seed.ts`) — en tâche de fond, sans jamais bloquer ni faire échouer le
 * démarrage si la base est temporairement inaccessible.
 */
export function bootstrapDatabase() {
  if (!process.env.DATABASE_URL) return;
  const cmd = "npx drizzle-kit push && npx tsx db/seed.ts";
  exec(cmd, { cwd: process.cwd(), env: process.env }, (err, stdout, stderr) => {
    if (err) {
      console.warn("[db-bootstrap] échec (base injoignable ?) :", err.message);
      return;
    }
    if (stdout) console.log("[db-bootstrap]", stdout.slice(-500));
    if (stderr) console.warn("[db-bootstrap]", stderr.slice(-300));
  });
}
