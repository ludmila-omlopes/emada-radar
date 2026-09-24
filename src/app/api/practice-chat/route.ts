import "server-only";
import { getSession } from "@/lib/session";
import { getDb } from "@/lib/db";
import { PracticeStore } from "@/lib/practice-store";
import { practiceHandlers } from "@/lib/practice-http";
import { getPublishedDays } from "@/lib/published-lessons";

export const runtime = "nodejs";
export const maxDuration = 60;
const handlers = practiceHandlers({
  user: async () => (await getSession())?.user ?? null,
  store: () => new PracticeStore(getDb(), { enabled: process.env.PRACTICE_CHAT_ENABLED === "true", key: process.env.OPENROUTER_API_KEY }, undefined, async slug => (await getPublishedDays()).find(day => day.lesson.slug === slug)?.lesson),
  siteUrl: process.env.BETTER_AUTH_URL,
});
export const GET = handlers.GET;
export const POST = handlers.POST;
