import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import type { Pool } from "pg";
import { ACADEMY_OWNER_EMAIL, isAcademyOwner } from "../src/lib/academy-access";
import { AcademyWaitlist, WAITLIST_JOINS_PER_HOUR } from "../src/lib/academy-waitlist";

const db = new PGlite();
const pool = { query: async (sql: string, values?: unknown[]) => { const result = await db.query(sql, values); return { rows: result.rows, rowCount: result.rows.length || result.affectedRows || 0 }; } } as unknown as Pool;

before(async () => {
  const migration = await readFile(new URL("../migrations/009-academy-waitlist.sql", import.meta.url), "utf8");
  await db.exec(migration); await db.exec(migration);
});
beforeEach(async () => { await db.exec("TRUNCATE academy_waitlist"); });
after(async () => { await db.close(); });

test("only the owner with a verified email or admin account opens the Academy", () => {
  assert.equal(isAcademyOwner(null, false), false);
  assert.equal(isAcademyOwner({ email: "someone@example.com", emailVerified: true }, true), false);
  assert.equal(isAcademyOwner({ email: ACADEMY_OWNER_EMAIL, emailVerified: true }, false), true);
  assert.equal(isAcademyOwner({ email: ACADEMY_OWNER_EMAIL.toUpperCase(), emailVerified: false }, true), true);
  // An unverified password sign-up with the owner's address is not enough.
  assert.equal(isAcademyOwner({ email: ACADEMY_OWNER_EMAIL, emailVerified: false }, false), false);
});

test("joining keeps the first entry for repeated addresses", async () => {
  const waitlist = new AcademyWaitlist(pool);
  const first = new Date("2026-10-01T10:00:00Z");
  assert.equal(await waitlist.join({ email: "ana@example.com", locale: "pt-BR", source: "modulos" }, first), "joined");
  assert.equal(await waitlist.join({ email: "ana@example.com", locale: "en", source: "progresso", userId: "u1" }, new Date("2026-10-01T11:00:00Z")), "joined");
  const { total, entries } = await waitlist.list();
  assert.equal(total, 1);
  assert.equal(entries[0].locale, "pt-BR");
  assert.equal(entries[0].source, "modulos");
  assert.equal(new Date(entries[0].created_at).getTime(), first.getTime());
});

test("joining is capped per hour", async () => {
  const waitlist = new AcademyWaitlist(pool);
  const now = new Date("2026-10-01T10:00:00Z");
  await db.query("INSERT INTO academy_waitlist (email, locale, source, created_at) SELECT 'p' || i || '@example.com', 'en', 'modulos', $1 FROM generate_series(1, $2::int) AS i", [new Date(now.getTime() - 60_000), WAITLIST_JOINS_PER_HOUR]);
  assert.equal(await waitlist.join({ email: "late@example.com", locale: "en", source: "modulos" }, now), "busy");
  assert.equal(await waitlist.join({ email: "late@example.com", locale: "en", source: "modulos" }, new Date(now.getTime() + 3_600_000)), "joined");
});
