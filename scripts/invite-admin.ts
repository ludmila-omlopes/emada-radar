import { loadEnvConfig } from "@next/env";
import { randomBytes, createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { z } from "zod";
loadEnvConfig(process.cwd());
async function main() {
  const email = z.email().parse(process.argv[2]).toLowerCase();
  const { getDb } = await import("../src/lib/db");
  const token = randomBytes(32).toString("hex");
  await getDb().query("INSERT INTO admin_invites (token_hash, email, expires_at) VALUES ($1, $2, now() + interval '7 days')", [createHash("sha256").update(token).digest("hex"), email]);
  const url = new URL("/admin/ativar", process.env.BETTER_AUTH_URL); url.searchParams.set("token", token);
  await mkdir(".local", { recursive: true });
  await writeFile(".local/admin-invite.txt", `Convite privado para ${email}\nVálido por 7 dias; uso único.\n${url.href}\n`, { mode: 0o600 });
  console.log("Convite privado salvo em .local/admin-invite.txt. Nenhum e-mail enviado.");
  await getDb().end();
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Falha ao gerar convite."); process.exitCode = 1; });
