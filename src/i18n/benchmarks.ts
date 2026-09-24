import type { Leaderboard } from "@/lib/portal-types";
const labelKeys: Record<string, string> = { Reasoning: "reasoning", Coding: "coding", "Agentic Coding": "agenticCoding", Mathematics: "math", "Data Analysis": "dataAnalysis", Language: "language", IF: "instructions", "Instruction Following": "instructions", coding: "coding", math: "math", cost: "cost", costPerTask: "costPerTask", speed: "speed", latency: "latency", responseTime: "responseTime", context: "context", input: "input", output: "output" };
export function localizeLeaderboard(board: Leaderboard, t: (key: string) => string): Leaderboard {
  const livebench = board.id === "livebench";
  const source = livebench ? "livebench" : board.metrics.some(metric => metric.key === "costPerTask") ? "aaPublic" : "aaApi";
  return { ...board, note: board.note && !livebench ? t(`${source}.note`) : board.note, metrics: board.metrics.map(metric => {
    const labelKey = metric.key === "overall" ? livebench ? "overall" : "intelligence" : labelKeys[metric.key];
    return { ...metric, label: labelKey ? t(`labels.${labelKey}`) : metric.label, description: t(`${source}.${livebench && !["overall", "cost"].includes(metric.key) ? "category" : metric.key}`) };
  }) };
}
