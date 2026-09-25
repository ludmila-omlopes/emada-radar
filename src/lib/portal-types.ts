export type SourceState = {
  name: string;
  url: string;
  status: "ok" | "unavailable" | "unconfigured";
  fetchedAt: string | null;
  collectedAt?: string;
};

export type Collection<T> = { items: T[]; sources: SourceState[] };
export type Metric = { key: string; label: string; description: string; unit: "score" | "usd" | "tokens" | "seconds" | "context"; lowerIsBetter?: boolean; precision?: number };
export type RankedModel = { id: string; name: string; organization: string; url: string; scores: Record<string, number | null>; scoreNotes?: Record<string, string> };
export type Leaderboard = {
  id: string;
  name: string;
  url: string;
  release: string | null;
  fetchedAt: string | null;
  status: SourceState["status"];
  metrics: Metric[];
  models: RankedModel[];
  note?: string;
};

export type ContentTranslation = { text: string; sourceLanguage: string; locale: "pt-BR" | "en"; automatic?: boolean };
export type PortalArticle = { id: string; title: string; url: string; source: string; category: string; publishedAt: string; summary?: string; modelRelease?: boolean; translation?: ContentTranslation };
export type Experiment = PortalArticle & { author: string; discussionUrl: string; points: number; comments: number; kind: "Jogos" | "Código" | "Avaliações" };
export type SocialProfile = { name: string; username: string; role: string; initials: string };
export type SocialPost = { id: string; text: string; url: string; publishedAt: string; profile: SocialProfile; collectedAt?: string; translation?: ContentTranslation };

export const socialProfiles: SocialProfile[] = [
  { name: "Sam Altman", username: "sama", role: "OpenAI", initials: "SA" },
  { name: "Boris Cherny", username: "bcherny", role: "Claude Code · Anthropic", initials: "BC" },
  { name: "Theo Browne", username: "theo", role: "T3 · Desenvolvimento", initials: "TB" },
  { name: "OpenAI Developers", username: "OpenAIDevs", role: "Ferramentas para devs", initials: "OA" },
  { name: "Anthropic", username: "AnthropicAI", role: "Pesquisa e modelos", initials: "AN" },
  { name: "Andrej Karpathy", username: "karpathy", role: "Pesquisa e educação em IA", initials: "AK" },
  { name: "Simon Willison", username: "simonw", role: "Datasette · Django", initials: "SW" },
  { name: "swyx", username: "swyx", role: "Comunidade de IA", initials: "SX" },
  { name: "Jason Liu", username: "jxnlco", role: "Comunidade de IA", initials: "JL" },
  { name: "Alex Albert", username: "alexalbert__", role: "Anthropic", initials: "AA" },
  { name: "Thariq", username: "trq212", role: "Comunidade de IA", initials: "TQ" },
  { name: "Noam Brown", username: "polynoamial", role: "Comunidade de IA", initials: "NB" },
  { name: "Lisan al Gaib", username: "scaling01", role: "Comunidade de IA", initials: "LG" },
  { name: "Chubby", username: "kimmonismus", role: "Comunidade de IA", initials: "CH" },
];
