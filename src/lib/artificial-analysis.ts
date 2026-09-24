import { z } from "zod";
import { plainText } from "./portal-parsers";
import type { Leaderboard, Metric, RankedModel } from "./portal-types";

export const ARTIFICIAL_ANALYSIS_URL = "https://artificialanalysis.ai/leaderboards/models";

const publicColumns: { header: string; metric: Metric }[] = [
  { header: "Artificial Analysis Intelligence Index", metric: { key: "overall", label: "Inteligência", description: "Artificial Analysis Intelligence Index, conforme exibido na tabela pública. As pontuações são arredondadas pela fonte; valores iguais aparecem empatados.", unit: "score", precision: 0 } },
  { header: "Cost per Task USD", metric: { key: "costPerTask", label: "Custo por tarefa", description: "Custo por tarefa informado pela Artificial Analysis, em US$. Menor é melhor. Esta medida é diferente do preço por milhão de tokens.", unit: "usd", precision: 4, lowerIsBetter: true } },
  { header: "Median Tokens/s", metric: { key: "speed", label: "Velocidade", description: "Velocidade mediana de geração na tabela pública, em tokens por segundo. Maior é melhor.", unit: "tokens", precision: 0 } },
  { header: "Latency First Chunk (s)", metric: { key: "latency", label: "Latência", description: "Tempo até o primeiro trecho da resposta, em segundos, conforme a coluna Latency First Chunk da fonte. Menor é melhor.", unit: "seconds", precision: 2, lowerIsBetter: true } },
  { header: "Total Response (s)", metric: { key: "responseTime", label: "Tempo total de resposta", description: "Tempo total de resposta reportado na tabela pública, em segundos. Menor é melhor.", unit: "seconds", precision: 2, lowerIsBetter: true } },
  { header: "Context Window", metric: { key: "context", label: "Janela de contexto", description: "Capacidade de contexto informada pela fonte, em tokens. Os sufixos k e M são convertidos para milhares e milhões; um contexto maior não implica maior qualidade.", unit: "context", precision: 2 } },
];

function cellText(html: string) {
  return plainText(html.replace(/<(script|style|svg)\b[^>]*>[\s\S]*?<\/\1>/gi, ""));
}

function publicNumber(html: string, metric: Metric): number | null {
  const value = cellText(html).replace(/\s*\*$/, "");
  if (["", "--", "—", "–", "N/A"].includes(value)) return null;
  if (metric.unit === "context") {
    const match = value.match(/^([\d,]+(?:\.\d+)?)\s*([kKmM])?$/);
    if (!match) throw new Error("Formato de contexto alterado na fonte.");
    const number = Number(match[1].replaceAll(",", ""));
    return number * (match[2]?.toLowerCase() === "m" ? 1_000_000 : match[2]?.toLowerCase() === "k" ? 1_000 : 1);
  }
  const normalized = (metric.unit === "usd" ? value.replace(/^\$\s*/, "") : value).replaceAll(",", "");
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) throw new Error("Formato numérico alterado na fonte.");
  const number = Number(normalized);
  if (!Number.isFinite(number)) throw new Error("Resultado numérico inválido.");
  return number;
}

/** Read only the rendered table, without executing or depending on embedded Next.js scripts. */
export function parseArtificialAnalysisPage(html: string): Pick<Leaderboard, "models" | "metrics" | "note"> {
  const tables = [...html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)].map(match => match[1]);
  for (const table of tables) {
    const head = table.match(/<thead\b[^>]*>([\s\S]*?)<\/thead>/i)?.[1] ?? "";
    const headerRows = [...head.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(row => [...row[1].matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)].map(cell => cellText(cell[1])));
    const headers = headerRows.find(row => row.includes("Model") && row.includes("Creator") && row.includes(publicColumns[0].header));
    if (!headers) continue;
    if (new Set(headers).size !== headers.length) throw new Error("Colunas ambíguas na tabela pública.");
    const columns = publicColumns.filter(column => headers.includes(column.header));
    const body = table.match(/<tbody\b[^>]*>([\s\S]*?)<\/tbody>/i)?.[1] ?? "";
    const models: RankedModel[] = [];
    const seen = new Set<string>();
    for (const row of body.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const cells = [...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(cell => cell[1]);
      if (cells.length !== headers.length) throw new Error("Estrutura da tabela pública alterada.");
      const name = cellText(cells[headers.indexOf("Model")]);
      const organization = cellText(cells[headers.indexOf("Creator")]);
      const links = [...row[1].matchAll(/href=["']([^"']+)["']/gi)].map(match => match[1]);
      const modelUrl = links.map(href => {
        try {
          const url = new URL(href, ARTIFICIAL_ANALYSIS_URL);
          return url.origin === "https://artificialanalysis.ai" && !url.username && !url.password && /^\/models\/[\w.-]+$/.test(url.pathname) ? url.origin + url.pathname : null;
        } catch { return null; }
      }).find(Boolean);
      if (!name || !organization || !modelUrl) throw new Error("Modelo sem identidade verificável na fonte.");
      if (seen.has(modelUrl)) throw new Error("Modelo duplicado na tabela pública.");
      seen.add(modelUrl);
      const scores = Object.fromEntries(columns.map(column => [column.metric.key, publicNumber(cells[headers.indexOf(column.header)], column.metric)]));
      const scoreNotes = Object.fromEntries(columns.filter(column => /\*$/.test(cellText(cells[headers.indexOf(column.header)]))).map(column => [column.metric.key, "Estimativa da Artificial Analysis"]));
      models.push({ id: modelUrl, name, organization, url: modelUrl, scores, scoreNotes });
    }
    if (!models.some(model => model.scores.overall != null)) throw new Error("Tabela pública sem resultados de inteligência.");
    return {
      models,
      metrics: columns.map(column => column.metric).filter(metric => models.some(model => model.scores[metric.key] != null)),
      note: "Tabela pública da Artificial Analysis, com a precisão e o recorte de modelos exibidos pela fonte. * Indica uma estimativa da fonte. Valores ausentes não entram na classificação. Consulta renovada a cada seis horas quando o portal recebe visitas.",
    };
  }
  throw new Error("Tabela da Artificial Analysis não encontrada.");
}

const apiScore = z.number().finite().nonnegative().nullish();
const apiModel = z.object({
  id: z.string().min(1), name: z.string().min(1), slug: z.string().regex(/^[\w.-]+$/),
  model_creator: z.object({ name: z.string().min(1) }),
  evaluations: z.object({ artificial_analysis_intelligence_index: apiScore, artificial_analysis_coding_index: apiScore, artificial_analysis_math_index: apiScore }).nullish(),
  pricing: z.object({ price_1m_input_tokens: apiScore, price_1m_output_tokens: apiScore }).nullish(),
  median_output_tokens_per_second: apiScore, median_time_to_first_token_seconds: apiScore,
});

export function parseArtificialAnalysisApi(raw: unknown): Pick<Leaderboard, "models" | "metrics" | "release" | "note"> {
  const data = z.object({ data: z.array(apiModel).min(1), intelligence_index_version: z.union([z.number(), z.string()]).nullish() }).parse(raw);
  const models: RankedModel[] = data.data.map(model => ({
    id: model.id, name: model.name, organization: model.model_creator.name, url: `https://artificialanalysis.ai/models/${model.slug}`,
    scores: { overall: model.evaluations?.artificial_analysis_intelligence_index ?? null, coding: model.evaluations?.artificial_analysis_coding_index ?? null, math: model.evaluations?.artificial_analysis_math_index ?? null, speed: model.median_output_tokens_per_second ?? null, latency: model.median_time_to_first_token_seconds ?? null, input: model.pricing?.price_1m_input_tokens ?? null, output: model.pricing?.price_1m_output_tokens ?? null },
  }));
  const metrics: Metric[] = [
    { key: "overall", label: "Inteligência", description: "Intelligence Index da Artificial Analysis. Compare apenas pontuações da mesma fonte e versão.", unit: "score" },
    { key: "coding", label: "Código", description: "Coding Index da Artificial Analysis, quando fornecido pela API.", unit: "score" },
    { key: "math", label: "Matemática", description: "Math Index da Artificial Analysis, quando fornecido pela API.", unit: "score" },
    { key: "speed", label: "Velocidade", description: "Mediana de tokens gerados por segundo. Maior é melhor.", unit: "tokens" },
    { key: "latency", label: "Latência", description: "Mediana do tempo até o primeiro token, em segundos. Menor é melhor.", unit: "seconds", lowerIsBetter: true },
    { key: "input", label: "Preço de entrada", description: "Preço em US$ por milhão de tokens de entrada.", unit: "usd", lowerIsBetter: true },
    { key: "output", label: "Preço de saída", description: "Preço em US$ por milhão de tokens de saída.", unit: "usd", lowerIsBetter: true },
  ];
  const available = metrics.filter(metric => models.some(model => model.scores[metric.key] != null));
  if (!available.length) throw new Error("API sem resultados de benchmark.");
  return { models, metrics: available, release: data.intelligence_index_version != null ? `v${String(data.intelligence_index_version).replace(/^v/i, "")}` : null, note: "Dados da API oficial da Artificial Analysis. Métricas disponíveis variam por modelo; valores ausentes são preservados. Consulta renovada a cada seis horas quando o portal recebe visitas." };
}
