import { timingSafeEqual } from "node:crypto";
import { databaseConfigured } from "@/lib/db";
import { collectNews } from "@/lib/news";
export const maxDuration = 60;
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const expected = Buffer.from(`Bearer ${secret ?? ""}`);
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  if (!secret || actual.length !== expected.length || !timingSafeEqual(actual, expected)) return Response.json({ error: "Não autorizado." }, { status: 401 });
  if (!databaseConfigured()) return Response.json({ error: "Banco não configurado." }, { status: 503 });
  try { const result = await collectNews(); return Response.json(result, { status: result.ok ? 200 : 502 }); }
  catch { return Response.json({ error: "Falha na coleta. Consulte os registros da execução." }, { status: 500 }); }
}
