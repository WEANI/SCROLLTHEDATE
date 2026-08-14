import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../lib/env";
import * as schema from "@db/schema";
import * as relations from "@db/relations";

const fullSchema = { ...schema, ...relations };

let instance: ReturnType<typeof drizzle<typeof fullSchema>>;

export function getDb() {
  if (!instance) {
    // `prepare: false` : compatible avec le pooler transactionnel Supabase
    // (port 6543) si on l'utilise un jour ; sans effet négatif en connexion
    // directe (port 5432).
    const client = postgres(env.databaseUrl, { prepare: false });
    instance = drizzle(client, { schema: fullSchema });
  }
  return instance;
}
