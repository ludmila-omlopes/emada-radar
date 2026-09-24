import JSON5 from "json5";
import { z } from "zod";
import type { Experiment, Metric, PortalArticle, RankedModel } from "./portal-types";

export function publicUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) if (key.startsWith("utm_")) url.searchParams.delete(key);
    return url.href;
  } catch { return null; }
}

export function plainText(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#(?:39|x27);/g, "'").replace(/&(?:nbsp|#160);/g, " ").replace(/\s+/g, " ").trim();
}

// LiveBench publishes a numeric CSV: the model key and all subtask columns.
export function numericCsv(text: string): Record<string, string>[] {
  const [header, ...lines] = text.trim().split(/\r?\n/);
  const keys = header?.replace(/^\uFEFF/, "").split(",");
  if (!keys?.includes("model")) throw new Error("Tabela sem coluna model.");
  return lines.filter(Boolean).map(line => {
    const values = line.split(",");
    if (values.length !== keys.length) throw new Error("Formato da tabela alterado.");
    return Object.fromEntries(keys.map((key, index) => [key, values[index]]));
  });
}

const metadataEntry = z.object({ displayName: z.string().optional(), organization: z.string().optional(), url: z.string().optional(), variants: z.array(z.object({ rawName: z.string(), displayName: z.string().optional(), url: z.string().optional() })).optional() });
export function liveBenchMetadata(script: string) {
  const literal = script.match(/export const modelLinks\s*=\s*(\{[\s\S]*?\n\});/)?.[1];
  if (!literal) throw new Error("Metadados do benchmark indisponíveis.");
  // Parse the data literal only. Never execute JavaScript downloaded from a source.
  const entries = z.record(z.string(), metadataEntry).parse(JSON5.parse(literal));
  const resolved: Record<string, { name: string; organization: string; url: string }> = {};
  for (const [id, item] of Object.entries(entries)) {
    const base = { name: item.displayName ?? id, organization: item.organization ?? "Não informado", url: publicUrl(item.url) ?? "https://livebench.ai/" };
    resolved[id] = base;
    for (const variant of item.variants ?? []) resolved[variant.rawName] = { ...base, name: variant.displayName ?? base.name, url: publicUrl(variant.url) ?? base.url };
  }
  return resolved;
}

const labels: Record<string, string> = { Reasoning: "Raciocínio", Coding: "Código", "Agentic Coding": "Agentes de código", Mathematics: "Matemática", "Data Analysis": "Análise de dados", Language: "Linguagem", IF: "Instruções", "Instruction Following": "Instruções" };
export function parseLiveBench(csv: string, rawCategories: unknown, metadata: ReturnType<typeof liveBenchMetadata>, costCsv?: string) {
  const categories = z.record(z.string(), z.array(z.string()).min(1)).parse(rawCategories);
  const entries = Object.entries(categories);
  if (!entries.length) throw new Error("Benchmark sem categorias.");
  const costs = new Map((costCsv ? numericCsv(costCsv) : []).map(row => [row.model, row]));
  const metrics: Metric[] = [
    { key: "overall", label: "Visão geral", description: "Média das categorias, com o mesmo peso para cada uma. Escala de 0 a 100.", unit: "score" },
    ...entries.map(([key]) => ({ key, label: labels[key] ?? key, description: "Média das subtarefas disponíveis nesta categoria. Escala de 0 a 100.", unit: "score" as const })),
  ];
  const models: RankedModel[] = numericCsv(csv).flatMap(row => {
    const info = metadata[row.model];
    if (!info) return []; // Match the source's policy: unlisted models are hidden.
    const scores: Record<string, number | null> = {};
    for (const [key, subtasks] of entries) {
      const values = subtasks.map(task => row[task]?.trim() ? Number(row[task]) : NaN).filter(value => Number.isFinite(value) && value >= 0 && value <= 100);
      scores[key] = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
    }
    const complete = entries.every(([key]) => scores[key] !== null);
    scores.overall = complete ? entries.reduce((sum, [key]) => sum + scores[key]!, 0) / entries.length : null;
    const cost = costs.get(row.model);
    const tasks = entries.flatMap(([, values]) => values);
    let totalCost = 0, questions = 0;
    let completeCosts = Boolean(cost);
    for (const task of tasks) {
      const dollars = cost?.[task]?.trim() ? Number(cost[task]) : NaN;
      const count = cost?.[`nq_${task}`]?.trim() ? Number(cost[`nq_${task}`]) : NaN;
      if (Number.isFinite(dollars) && dollars >= 0 && Number.isFinite(count) && count > 0) { totalCost += dollars; questions += count; }
      else completeCosts = false;
    }
    scores.cost = completeCosts && questions && scores.overall && scores.overall > 0 ? (totalCost / questions / scores.overall) * 100 : null;
    return [{ id: row.model, ...info, scores }];
  });
  if (!models.length) throw new Error("Nenhum resultado válido.");
  if (models.some(model => model.scores.cost !== null)) metrics.push({ key: "cost", label: "Custo por acerto", description: "Estimativa do LiveBench em US$ por tarefa bem-sucedida: custo médio por questão dividido pela pontuação geral. Menor é melhor.", unit: "usd", lowerIsBetter: true });
  return { models, metrics };
}

export function parseAnthropicNews(html: string, now = new Date()): PortalArticle[] {
  const cutoff = now.getTime() - 45 * 86_400_000;
  const articles = [...html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)].flatMap(([, href, body]) => {
    const url = publicUrl(href.startsWith("/") ? `https://www.anthropic.com${href}` : href);
    if (!url || !["www.anthropic.com", "anthropic.com"].includes(new URL(url).hostname)) return [];
    const date = body.match(/<time\b[^>]*>([\s\S]*?)<\/time>/i)?.[1];
    const title = body.match(/<span\b[^>]*class="[^"]*__title[^"]*"[^>]*>([\s\S]*?)<\/span>/i)?.[1] ?? body.match(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/i)?.[1];
    const published = new Date(`${plainText(date ?? "")} UTC`);
    if (!title || !Number.isFinite(published.getTime()) || published.getTime() < cutoff || published > now) return [];
    return [{ id: `anthropic:${url}`, title: plainText(title), url, source: "Anthropic", category: "Anthropic", publishedAt: published.toISOString() }];
  });
  if (!articles.length) throw new Error("Estrutura da página de notícias alterada ou sem publicações recentes.");
  return articles;
}

const hnHit = z.object({ objectID: z.string().regex(/^\d+$/), title: z.string(), url: z.string().nullish(), author: z.string(), created_at: z.string(), points: z.number().nullish(), num_comments: z.number().nullish() });
export function parseExperiments(payload: unknown, now = new Date()): Experiment[] {
  const hits = z.object({ hits: z.array(z.unknown()) }).parse(payload).hits;
  return hits.flatMap(raw => {
    const parsed = hnHit.safeParse(raw);
    if (!parsed.success) return [];
    const hit = parsed.data;
    const title = plainText(hit.title);
    const date = new Date(hit.created_at);
    const specificModel = /\b(llms?|models?|claude|gpt|gemini|agents?|deepseek)\b/i.test(title);
    const aiRelated = specificModel || /\bAI\b/.test(title);
    const formalEvaluation = /\b(?:benchmarks?|benchmarking|evaluat(?:e|ing|ion|ions)|evals?|leaderboards?)\b/i.test(title);
    const isGame = /\b(?:games?|chess|pok[eé]mon|poker|sudoku|tetris|minecraft)\b/i.test(title) && !/\bgame (?:a|the) (?:test|benchmark)\b/i.test(title);
    const gameEvaluation = specificModel && isGame;
    const handsOn = specificModel && /\b(?:tested|experiments?|comparison|versus|vs)\b/i.test(title);
    const personalTest = specificModel && /^(?:show hn:|i |we |my |our )/i.test(title) && /\btest(?:s|ed|ing)?\b/i.test(title);
    if (/^ask hn:/i.test(title) || !aiRelated || !(formalEvaluation || gameEvaluation || handsOn || personalTest)) return [];
    if (!Number.isFinite(date.getTime()) || date > now || date.getTime() < now.getTime() - 30 * 86_400_000) return [];
    const discussionUrl = `https://news.ycombinator.com/item?id=${hit.objectID}`;
    return [{ id: hit.objectID, title, url: publicUrl(hit.url) ?? discussionUrl, source: "Hacker News", category: "Comunidade", author: hit.author, publishedAt: date.toISOString(), discussionUrl, points: Math.max(0, hit.points ?? 0), comments: Math.max(0, hit.num_comments ?? 0), kind: isGame ? "Jogos" as const : /cod|program|software|terminal/i.test(title) ? "Código" as const : "Avaliações" as const }];
  });
}

export function newestUnique<T extends { url: string; publishedAt: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return [...items].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)).filter(item => { if (seen.has(item.url)) return false; seen.add(item.url); return true; });
}
