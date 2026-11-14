import { describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

// Écran Fréquentation : le pilote postgres-js refuse un objet Date passé
// dans une requête `sql` brute (« Failed query » sur tout l'écran, constaté
// le 14/11/2026). Aucune requête ne doit lui en envoyer.

vi.mock("../queries/connection", () => ({ getDb: vi.fn() }));
const { findSiteStats } = await import("../queries/siteEvents");

describe("findSiteStats", () => {
  it("n'envoie jamais d'objet Date en paramètre", async () => {
    const dialect = new PgDialect();
    const params: unknown[] = [];
    const db = {
      execute: vi.fn(async (q: SQL) => {
        params.push(...dialect.sqlToQuery(q).params);
        return [];
      }),
    };

    await findSiteStats(30, db as never);

    expect(db.execute).toHaveBeenCalled();
    expect(params.some((p) => p instanceof Date)).toBe(false);
  });
});
