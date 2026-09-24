import { toNextJsHandler } from "better-auth/next-js";
import { getAuth, authConfigured } from "@/lib/auth";

function unavailable() { return Response.json({ message: "O login será liberado após a conexão com o Postgres." }, { status: 503 }); }
export async function GET(request: Request) { return authConfigured() ? toNextJsHandler(getAuth()).GET(request) : unavailable(); }
export async function POST(request: Request) { return authConfigured() ? toNextJsHandler(getAuth()).POST(request) : unavailable(); }
