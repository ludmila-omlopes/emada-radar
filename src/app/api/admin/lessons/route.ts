import { revalidatePath } from "next/cache";
import { getSession, isAdmin } from "@/lib/session";
import { getDb } from "@/lib/db";
import { LessonContentStore } from "@/lib/lesson-content-store";
import { lessonContentHandlers } from "@/lib/lesson-content-http";

export const runtime = "nodejs";
const handlers = lessonContentHandlers({
  admin: async () => await isAdmin() ? (await getSession())!.user : null,
  store: () => new LessonContentStore(getDb()),
  siteUrl: process.env.BETTER_AUTH_URL,
  published: () => revalidatePath("/", "layout"),
});
export const GET = handlers.GET;
export const POST = handlers.POST;
