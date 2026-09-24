import { loadEnvConfig } from "@next/env";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";
loadEnvConfig(process.cwd());

async function main() {
  const connectionString = process.env.CONTENT_MIGRATION_DATABASE_URL;
  if (!connectionString || !process.argv.includes("--apply")) throw new Error("Explicit target required");
  const target = new URL(connectionString);
  if (target.hostname.includes("-pooler")) throw new Error("Direct connection required");
  const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 15_000 });
  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL lock_timeout = '5s'");
      await client.query(await readFile(new URL("../migrations/003-lesson-content.sql", import.meta.url), "utf8"));
      await client.query("COMMIT");
      console.log(`Migração 003 aplicada em ${target.hostname}. Conteúdo existente e progresso preservados.`);
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  } finally { await pool.end(); }
}
main().catch(() => { console.error("Migração não concluída. Defina CONTENT_MIGRATION_DATABASE_URL com uma conexão direta, valide primeiro na branch de teste e execute com --apply. Nenhum segredo foi registrado."); process.exitCode = 1; });
