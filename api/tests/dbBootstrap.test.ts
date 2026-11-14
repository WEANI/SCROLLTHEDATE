import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { readMigrationFiles } from "drizzle-orm/migrator";
import path from "node:path";

// Démarrage : une base existante (créée avant les migrations) est
// enregistrée comme « point de départ » sans rejouer la baseline ; seules
// les migrations suivantes s'appliquent.

const dialect = new PgDialect();
const state = vi.hoisted(() => ({ recorded: 0, hasTables: true, executed: [] as string[] }));

vi.mock("../queries/connection", () => ({
  getDb: () => ({
    execute: async (q: SQL) => {
      const { sql: text, params } = dialect.sqlToQuery(q);
      state.executed.push(text);
      if (text.includes("count(*)")) return [{ n: state.recorded }];
      if (text.includes("to_regclass")) return [{ exists: state.hasTables }];
      if (text.startsWith("insert into drizzle")) {
        state.recorded++;
        state.executed.push(`params:${params.join(",")}`);
      }
      return [];
    },
  }),
}));
const migrate = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("drizzle-orm/postgres-js/migrator", () => ({ migrate }));
vi.mock("node:child_process", () => ({ exec: vi.fn() }));

const { bootstrapDatabase } = await import("../db-bootstrap");
const migrations = readMigrationFiles({ migrationsFolder: path.resolve(process.cwd(), "db/migrations") });

async function boot() {
  process.env.DATABASE_URL = "postgres://test";
  bootstrapDatabase();
  await vi.waitFor(() => expect(migrate).toHaveBeenCalled());
}

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(state, { recorded: 0, hasTables: true, executed: [] });
});

describe("bootstrapDatabase", () => {
  it("base existante non suivie : enregistre la baseline sans l'exécuter, puis migre", async () => {
    await boot();
    expect(state.recorded).toBe(1);
    expect(state.executed).toContain(`params:${migrations[0]!.hash},${migrations[0]!.folderMillis}`);
    expect(state.executed.some((s) => s.includes('CREATE TABLE "users"'))).toBe(false);
  });

  it("base déjà suivie : n'enregistre rien de plus", async () => {
    state.recorded = 2;
    await boot();
    expect(state.recorded).toBe(2);
  });

  it("base neuve : laisse la baseline s'exécuter normalement", async () => {
    state.hasTables = false;
    await boot();
    expect(state.recorded).toBe(0);
  });
});

describe("db/migrations", () => {
  it("commence par la baseline, puis la création de site_events", () => {
    expect(migrations.length).toBeGreaterThanOrEqual(2);
    expect(migrations[1]!.sql.join("")).toContain('CREATE TABLE "site_events"');
  });

  it("aucune migration ne supprime de table ou de colonne", () => {
    for (const m of migrations.slice(1)) {
      expect(m.sql.join("")).not.toMatch(/DROP TABLE|DROP COLUMN/i);
    }
  });
});
