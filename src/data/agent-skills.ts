import type { Locale } from "@/i18n/config";

// Editorial snapshot, not live counters. GitHub API and skills.sh consulted on this date.
export const skillsReviewedAt = "2026-09-25";
export const skillCategories = ["development", "design", "documents", "productivity", "marketing", "data", "discovery"] as const;
export type SkillCategory = typeof skillCategories[number];
type Copy = Record<Locale, string>;
export type SkillRepository = {
  id: string;
  name: string;
  repo: string;
  kind: "collection" | "directory" | "tool";
  official: boolean;
  stars: number;
  categories: SkillCategory[];
  description: Copy;
};

export const skillRepositories: SkillRepository[] = [
  { id: "superpowers", name: "Superpowers", repo: "obra/superpowers", kind: "collection", official: false, stars: 291550, categories: ["development", "productivity"], description: { "pt-BR": "Um fluxo de engenharia com planejamento, investigação de bugs, testes e revisão de código. Útil para estruturar trabalhos que passam por várias etapas.", en: "An engineering workflow covering planning, bug investigation, tests and code review. Useful for structuring work that spans several stages." } },
  { id: "matt-pocock", name: "Matt Pocock Skills", repo: "mattpocock/skills", kind: "collection", official: false, stars: 269578, categories: ["development", "productivity"], description: { "pt-BR": "Skills de engenharia e aprendizado: questionar planos, modelar domínios, revisar código e estudar conceitos dentro do projeto.", en: "Engineering and learning skills for questioning plans, modeling domains, reviewing code and studying concepts within a project." } },
  { id: "anthropic", name: "Anthropic Skills", repo: "anthropics/skills", kind: "collection", official: true, stars: 178189, categories: ["design", "documents", "development", "productivity"], description: { "pt-BR": "Coleção da Anthropic com design de interfaces, criação de skills e trabalho com documentos. As licenças variam entre as skills.", en: "Anthropic’s collection for interface design, skill creation and document workflows. Licenses vary between skills." } },
  { id: "ui-ux", name: "UI UX Pro Max", repo: "nextlevelbuilder/ui-ux-pro-max-skill", kind: "collection", official: false, stars: 130598, categories: ["design"], description: { "pt-BR": "Referências e ferramentas para decisões de interface: estilos, cores, tipografia e padrões de experiência em diferentes plataformas.", en: "References and tools for interface decisions: styles, colors, typography and experience patterns across platforms." } },
  { id: "taste", name: "Taste Skill", repo: "Leonxlnx/taste-skill", kind: "collection", official: false, stars: 90080, categories: ["design"], description: { "pt-BR": "Direção visual para interfaces, redesigns e identidade de marca, com orientações para evitar resultados genéricos.", en: "Visual direction for interfaces, redesigns and brand identity, with guidance for avoiding generic results." } },
  { id: "composio", name: "Awesome Claude Skills", repo: "ComposioHQ/awesome-claude-skills", kind: "directory", official: false, stars: 75635, categories: ["discovery", "productivity", "marketing"], description: { "pt-BR": "Lista da Composio com skills, recursos e automações para Claude. Parte das integrações depende de serviços e configuração adicional.", en: "Composio’s directory of skills, resources and automations for Claude. Some integrations require services and additional setup." } },
  { id: "marketing", name: "Marketing Skills", repo: "coreyhaines31/marketingskills", kind: "collection", official: false, stars: 51498, categories: ["marketing"], description: { "pt-BR": "Coleção de Corey Haines para copywriting, SEO, conversão e estratégia de marketing, organizada por tarefas.", en: "Corey Haines’s task-oriented collection for copywriting, SEO, conversion and marketing strategy." } },
  { id: "scientific", name: "Scientific Agent Skills", repo: "K-Dense-AI/scientific-agent-skills", kind: "collection", official: false, stars: 46643, categories: ["data"], description: { "pt-BR": "Coleção da K-Dense para pesquisa científica, análise de dados e acesso a bases especializadas. Cada fluxo pode exigir ferramentas próprias.", en: "K-Dense’s collection for scientific research, data analysis and specialist databases. Each workflow may require its own tools." } },
  { id: "browser", name: "Agent Browser", repo: "vercel-labs/agent-browser", kind: "tool", official: true, stars: 43184, categories: ["development", "productivity"], description: { "pt-BR": "Ferramenta de automação de navegador da Vercel com uma skill para orientar navegação, formulários, capturas e testes.", en: "Vercel’s browser automation tool with a skill for navigation, forms, screenshots and testing." } },
  { id: "voltagent", name: "Awesome Agent Skills", repo: "VoltAgent/awesome-agent-skills", kind: "directory", official: false, stars: 34854, categories: ["discovery"], description: { "pt-BR": "Diretório da VoltAgent que reúne skills de equipes oficiais e da comunidade. Um ponto de partida para descobrir autores e áreas de uso.", en: "VoltAgent’s directory of skills from official teams and the community. A starting point for discovering authors and use cases." } },
  { id: "skills-cli", name: "Skills CLI", repo: "vercel-labs/skills", kind: "tool", official: true, stars: 32467, categories: ["discovery"], description: { "pt-BR": "CLI da Vercel para descobrir e instalar skills em agentes compatíveis. Inclui a skill find-skills e a documentação dos comandos.", en: "Vercel’s CLI for discovering and installing skills in compatible agents. Includes find-skills and command documentation." } },
  { id: "vercel", name: "Vercel Agent Skills", repo: "vercel-labs/agent-skills", kind: "collection", official: true, stars: 31532, categories: ["development", "design"], description: { "pt-BR": "Coleção da Vercel para React, composição de componentes, interfaces web e outros fluxos do seu ecossistema.", en: "Vercel’s collection for React, component composition, web interfaces and other workflows in its ecosystem." } },
  { id: "openai", name: "OpenAI Skills", repo: "openai/skills", kind: "collection", official: true, stars: 27626, categories: ["development", "documents", "productivity"], description: { "pt-BR": "Catálogo da OpenAI para Codex, com skills de desenvolvimento, integrações e produtividade. Consulte o README para instalação e requisitos.", en: "OpenAI’s catalog for Codex, with development, integration and productivity skills. See the README for installation and requirements." } },
  { id: "supabase", name: "Supabase Agent Skills", repo: "supabase/agent-skills", kind: "collection", official: true, stars: 2653, categories: ["data", "development"], description: { "pt-BR": "Coleção da Supabase para seu ecossistema e boas práticas de Postgres, incluindo consultas, índices e modelagem.", en: "Supabase’s collection for its ecosystem and Postgres best practices, including queries, indexes and modeling." } },
];

export type AgentSkill = {
  id: string;
  repositoryId: string;
  category: SkillCategory;
  path: string;
  // Approximate all-time installs as displayed by skills.sh, not ratings or unique users.
  installs: number;
  description: Copy;
  note?: Copy;
  companion?: string;
};

export const agentSkills: AgentSkill[] = [
  { id: "find-skills", repositoryId: "skills-cli", category: "discovery", path: "skills/find-skills", installs: 3600000, description: { "pt-BR": "Encontra skills a partir da tarefa que você quer realizar e ajuda a descobrir como instalá-las.", en: "Finds skills based on the task you want to accomplish and helps you discover how to install them." } },
  { id: "grill-me", repositoryId: "matt-pocock", category: "productivity", path: "skills/productivity/grill-me", installs: 1200000, companion: "grilling", description: { "pt-BR": "Transforma um plano em uma entrevista para esclarecer decisões, premissas e pontos que ainda precisam de resposta.", en: "Turns a plan into an interview to clarify decisions, assumptions and unanswered questions." }, note: { "pt-BR": "A versão atual chama a skill grilling; o comando inclui as duas.", en: "The current version calls the grilling skill; the command includes both." } },
  { id: "agent-browser", repositoryId: "browser", category: "development", path: "skills/agent-browser", installs: 941400, description: { "pt-BR": "Orienta o agente a navegar, preencher formulários, capturar páginas e testar aplicações no navegador.", en: "Guides an agent through browsing, forms, screenshots and testing web applications." }, note: { "pt-BR": "Também exige instalar o Agent Browser e suas dependências, conforme o repositório.", en: "Also requires Agent Browser and its dependencies, as documented in the repository." } },
  { id: "frontend-design", repositoryId: "anthropic", category: "design", path: "skills/frontend-design", installs: 922100, description: { "pt-BR": "Ajuda a definir direção estética, tipografia e composição ao criar ou redesenhar uma interface.", en: "Helps define aesthetic direction, typography and composition when creating or redesigning an interface." } },
  { id: "vercel-react-best-practices", repositoryId: "vercel", category: "development", path: "skills/react-best-practices", installs: 743500, description: { "pt-BR": "Orienta otimizações de React e Next.js, incluindo carregamento de dados, tamanho do bundle e renderização.", en: "Guides React and Next.js optimization, including data loading, bundle size and rendering." } },
  { id: "teach", repositoryId: "matt-pocock", category: "productivity", path: "skills/productivity/teach", installs: 711000, description: { "pt-BR": "Organiza o aprendizado de um conceito dentro do workspace, mantendo objetivos e progresso entre sessões.", en: "Organizes learning a concept within the workspace, keeping goals and progress across sessions." } },
  { id: "web-design-guidelines", repositoryId: "vercel", category: "design", path: "skills/web-design-guidelines", installs: 666300, description: { "pt-BR": "Revisa código de interface com as diretrizes web da Vercel, incluindo acessibilidade e experiência de uso.", en: "Reviews interface code against Vercel’s web guidelines, including accessibility and usability." } },
  { id: "design-taste-frontend", repositoryId: "taste", category: "design", path: "skills/taste-skill", installs: 518600, description: { "pt-BR": "Interpreta o briefing e orienta escolhas visuais para landing pages, portfólios e redesigns com identidade própria.", en: "Interprets the brief and guides visual choices for landing pages, portfolios and distinctive redesigns." } },
  { id: "supabase-postgres-best-practices", repositoryId: "supabase", category: "data", path: "skills/supabase-postgres-best-practices", installs: 416900, description: { "pt-BR": "Ajuda a revisar consultas, índices, esquema e outras decisões de Postgres com recomendações da Supabase.", en: "Helps review queries, indexes, schemas and other Postgres decisions using Supabase’s recommendations." } },
  { id: "skill-creator", repositoryId: "anthropic", category: "productivity", path: "skills/skill-creator", installs: 390800, description: { "pt-BR": "Cria e melhora skills, com avaliações para verificar resultados e ajustar quando elas devem ser acionadas.", en: "Creates and improves skills, with evaluations to check results and refine when they should be triggered." } },
  { id: "ui-ux-pro-max", repositoryId: "ui-ux", category: "design", path: ".claude/skills/ui-ux-pro-max", installs: 370600, description: { "pt-BR": "Consulta referências de estilos, paletas e tipografia para apoiar decisões de UI e UX em diferentes plataformas.", en: "Consults style, palette and typography references to support UI and UX decisions across platforms." }, note: { "pt-BR": "Consulte no repositório os requisitos das ferramentas de busca que acompanham a skill.", en: "Check the repository for requirements of the search tools bundled with this skill." } },
  { id: "vercel-composition-patterns", repositoryId: "vercel", category: "development", path: "skills/composition-patterns", installs: 356100, description: { "pt-BR": "Ajuda a estruturar componentes React reutilizáveis e a simplificar APIs com excesso de propriedades booleanas.", en: "Helps structure reusable React components and simplify APIs with too many boolean props." } },
  { id: "systematic-debugging", repositoryId: "superpowers", category: "development", path: "skills/systematic-debugging", installs: 271400, description: { "pt-BR": "Organiza a investigação de bugs para encontrar a causa antes de propor uma correção.", en: "Structures bug investigations to find the cause before proposing a fix." } },
  { id: "test-driven-development", repositoryId: "superpowers", category: "development", path: "skills/test-driven-development", installs: 236700, description: { "pt-BR": "Conduz o ciclo de escrever um teste que falha, implementar o necessário e refatorar com verificação.", en: "Guides the cycle of writing a failing test, implementing what is needed and refactoring with verification." } },
  { id: "pptx", repositoryId: "anthropic", category: "documents", path: "skills/pptx", installs: 226700, description: { "pt-BR": "Cria, lê e edita apresentações PowerPoint, incluindo layouts, modelos e conteúdo dos slides.", en: "Creates, reads and edits PowerPoint presentations, including layouts, templates and slide content." } },
  { id: "seo-audit", repositoryId: "marketing", category: "marketing", path: "skills/seo-audit", installs: 214000, description: { "pt-BR": "Investiga problemas de SEO técnico, indexação e conteúdo para orientar melhorias no site.", en: "Investigates technical SEO, indexing and content issues to guide website improvements." } },
  { id: "copywriting", repositoryId: "marketing", category: "marketing", path: "skills/copywriting", installs: 207900, description: { "pt-BR": "Ajuda a escrever e revisar textos de páginas, propostas de valor, títulos e chamadas para ação.", en: "Helps write and revise page copy, value propositions, headlines and calls to action." } },
  { id: "pdf", repositoryId: "anthropic", category: "documents", path: "skills/pdf", installs: 201200, description: { "pt-BR": "Lê e extrai conteúdo de PDFs, combina arquivos, preenche formulários e trabalha com documentos digitalizados.", en: "Reads and extracts PDF content, combines files, fills forms and works with scanned documents." } },
  { id: "docx", repositoryId: "anthropic", category: "documents", path: "skills/docx", installs: 193100, description: { "pt-BR": "Cria e edita documentos Word com estrutura, formatação, tabelas e imagens.", en: "Creates and edits Word documents with structure, formatting, tables and images." } },
];

export function repositoryFor(skill: AgentSkill) {
  return skillRepositories.find(repository => repository.id === skill.repositoryId)!;
}
export function skillSource(skill: AgentSkill) {
  return `https://github.com/${repositoryFor(skill).repo}/blob/main/${skill.path}/SKILL.md`;
}
export function skillLeaderboard(skill: AgentSkill) {
  return `https://skills.sh/${repositoryFor(skill).repo.toLowerCase()}/${skill.id}`;
}
export function skillInstallCommand(skill: AgentSkill) {
  return `npx skills add ${repositoryFor(skill).repo} --skill ${skill.id}${skill.companion ? ` --skill ${skill.companion}` : ""}`;
}
