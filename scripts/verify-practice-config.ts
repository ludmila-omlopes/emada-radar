import { loadEnvConfig } from "@next/env";
import { checkPracticeKey } from "../src/lib/openrouter";

loadEnvConfig(process.cwd());
async function main() {
  if (process.env.PRACTICE_CHAT_ENABLED !== "true") return;
  if (!process.env.OPENROUTER_API_KEY) throw new Error("missing_key");
  await checkPracticeKey(process.env.OPENROUTER_API_KEY);
  console.log("Practice chat: OpenRouter credential and credit cap verified (maximum US$5). No generation requested.");
}
main().catch(() => {
  console.error("Practice chat configuration failed safety checks. Verify the OpenRouter key, its credit balance, and a monthly/lifetime cap of at most US$5. No secret was logged.");
  process.exitCode = 1;
});
