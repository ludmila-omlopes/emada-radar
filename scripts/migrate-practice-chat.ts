import { loadEnvConfig } from "@next/env";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";
loadEnvConfig(process.cwd());

async function main() {
  // Deliberately no fallback to DATABASE_URL: production must not be touched by accident.
  const connectionString = process.env.PRACTICE_MIGRATION_DATABASE_URL;
  if (!connectionString) throw new Error("Defina PRACTICE_MIGRATION_DATABASE_URL com a conexão direta da branch de teste. Depois de validar, use explicitamente a conexão de produção.");
  const target = new URL(connectionString);
  if (target.hostname.includes("-pooler")) throw new Error("Use uma conexão direta, sem -pooler, para esta migração.");
  if (!process.argv.includes("--apply")) throw new Error("Confira o alvo e execute com --apply. Teste primeiro numa branch Neon.");
  const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 10_000 });
  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL lock_timeout = '5s'");
      await client.query(await readFile(new URL("../migrations/002-practice-chat.sql", import.meta.url), "utf8"));
      await client.query("COMMIT");
      console.log(`Migração 002 aplicada em ${target.hostname}${target.pathname}. Nenhuma tabela existente foi removida.`);
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  } finally { await pool.end(); }
}
main().catch(() => { console.error("Migração não concluída. Confira a conexão direta e use --apply somente após escolher a branch correta. Nenhum segredo foi registrado."); process.exitCode = 1; });
