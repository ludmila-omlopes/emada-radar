import { loadEnvConfig } from "@next/env";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";
loadEnvConfig(process.cwd());
async function main() {
  const connectionString = process.env.NEWS_CLASSIFICATION_MIGRATION_DATABASE_URL;
  if (!connectionString || !process.argv.includes("--apply")) throw new Error("Explicit target required");
  const target = new URL(connectionString);
  if (target.hostname.includes("-pooler")) throw new Error("Direct connection required");
  const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 15000 });
  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL lock_timeout = '5s'");
      await client.query("SELECT month FROM practice_budgets LIMIT 0");
      await client.query(await readFile(new URL("../migrations/006-news-classification.sql", import.meta.url), "utf8"));
      await client.query("COMMIT");
      console.log(`Migration 006 applied to ${target.hostname}.`);
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  } finally { await pool.end(); }
}
main().catch(() => { console.error("Migration failed. Set a direct NEWS_CLASSIFICATION_MIGRATION_DATABASE_URL and run with --apply after test-branch validation. No credentials were logged."); process.exitCode = 1; });
