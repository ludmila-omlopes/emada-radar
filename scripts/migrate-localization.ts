import { loadEnvConfig } from "@next/env";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";
loadEnvConfig(process.cwd());
async function main() {
  const connectionString = process.env.LOCALIZATION_MIGRATION_DATABASE_URL;
  if (!connectionString || !process.argv.includes("--apply")) throw new Error("Explicit target required");
  const target = new URL(connectionString);
  if (target.hostname.includes("-pooler")) throw new Error("Direct connection required");
  const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 15000 });
  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL lock_timeout = '5s'");
      await client.query(await readFile(new URL("../migrations/004-localization.sql", import.meta.url), "utf8"));
      await client.query("COMMIT");
      console.log(`Migration 004 applied to ${target.hostname}.`);
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  } finally { await pool.end(); }
}
main().catch(() => { console.error("Migration failed. Set a direct LOCALIZATION_MIGRATION_DATABASE_URL, validate on a test branch, and run with --apply. No credentials were logged."); process.exitCode = 1; });
