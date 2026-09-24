import { readFile, appendFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
async function main() {
  const path = ".env.local";
  const current = await readFile(path, "utf8").catch(() => "");
  const values = { BETTER_AUTH_URL: "http://localhost:3000", BETTER_AUTH_SECRET: randomBytes(32).toString("hex"), CRON_SECRET: randomBytes(32).toString("hex") };
  for (const [key, value] of Object.entries(values)) if (!new RegExp(`^${key}=`, "m").test(current)) await appendFile(path, `\n${key}="${value}"\n`, { mode: 0o600 });
  console.log("Configuração local preparada. Nenhum segredo foi exibido.");
}
main();
