import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("locale preferences validate locale and disappear with their account", async () => {
  const db = new PGlite();
  try {
    await db.exec('CREATE TABLE "user" (id text PRIMARY KEY);');
    await db.exec(await readFile(new URL("../migrations/004-localization.sql", import.meta.url), "utf8"));
    await db.query('INSERT INTO "user" (id) VALUES ($1)', ["fixture-user"]);
    await assert.rejects(db.query("INSERT INTO user_locale_preferences(user_id, locale) VALUES ('fixture-user', 'invalid')"));
    await db.query("INSERT INTO user_locale_preferences(user_id, locale) VALUES ('fixture-user', 'en')");
    await db.query('DELETE FROM "user" WHERE id = $1', ["fixture-user"]);
    assert.equal((await db.query("SELECT * FROM user_locale_preferences")).rows.length, 0);
  } finally { await db.close(); }
});
