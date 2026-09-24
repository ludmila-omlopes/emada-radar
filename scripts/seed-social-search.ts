import { getDb } from "../src/lib/db";
import { SocialSearchStore } from "../src/lib/social-search-store";

async function main() {
  if (process.env.X_SOCIAL_SEED !== "true") return;
  if (process.env.VERCEL_ENV !== "production" || !process.env.X_API_BEARER_TOKEN) throw new Error("Production token required");
  const db = getDb();
  try {
    const result = await new SocialSearchStore(db).collect(process.env.X_API_BEARER_TOKEN);
    console.log("Social collection:", JSON.stringify(result));
    if (!result.ok) process.exitCode = 1;
  } finally { await db.end(); }
}
main().catch(() => { console.error("Social seed failed; no credentials logged."); process.exitCode = 1; });
