import { loadEnvConfig } from "@next/env";
import { readFile } from "node:fs/promises";
loadEnvConfig(process.cwd());
async function main() {
  const { getAuth } = await import("../src/lib/auth");
  const { getDb } = await import("../src/lib/db");
  const { getMigrations } = await import("better-auth/db/migration");
  const { runMigrations } = await getMigrations(getAuth().options);
  await runMigrations();
  await getDb().query(await readFile(new URL("../migrations/001-academy.sql", import.meta.url), "utf8"));
  console.log("Migrações de autenticação e da Academy aplicadas.");
  await getDb().end();
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Falha na migração."); process.exitCode = 1; });
