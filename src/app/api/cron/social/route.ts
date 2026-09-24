import { timingSafeEqual } from "node:crypto";
import { databaseConfigured, getDb } from "@/lib/db";
import { SocialSearchStore } from "@/lib/social-search-store";

export const maxDuration = 60;
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const expected = Buffer.from(`Bearer ${secret ?? ""}`);
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  if (!secret || actual.length !== expected.length || !timingSafeEqual(actual, expected)) return Response.json({ error: "Não autorizado." }, { status: 401 });
  if (!databaseConfigured() || !process.env.X_API_BEARER_TOKEN) return Response.json({ error: "Coleta não configurada." }, { status: 503 });
  try {
    const result = await new SocialSearchStore(getDb()).collect(process.env.X_API_BEARER_TOKEN);
    return Response.json(result, { status: result.ok ? 200 : 502 });
  } catch { return Response.json({ error: "Falha na coleta." }, { status: 500 }); }
}
