import type { Locale } from "@/i18n/config";

type Copy = { description: string; audience: string; duration: string; languages: string; requirements: string };
export type Training = {
  id: string; name: string; provider: string; url: string; source: string;
  credential: "certificate" | "badge" | "both" | "unconfirmed";
  copy: Record<Locale, Copy>;
};
// Editorial selection: verify access AND credential cost at the source before adding an entry.
export const trainingReviewedAt = "2026-09-24";
export const aiTraining: Training[] = [
  {
    id: "claude", name: "Claude Academy", provider: "Anthropic", url: "https://academy.claude.com/", source: "https://academy.claude.com/help/faq", credential: "badge",
    copy: {
      "pt-BR": { description: "Cursos sobre Claude, Claude Code, fluência em IA e desenvolvimento com a API.", audience: "Do uso cotidiano ao desenvolvimento", duration: "Varia por curso", languages: "Inglês", requirements: "Use uma conta Claude e passe nos quizzes exigidos pelo curso. O badge gratuito funciona como certificado de conclusão e pode ser compartilhado pelo link de verificação." },
      en: { description: "Courses on Claude, Claude Code, AI fluency and building with the API.", audience: "From everyday use to development", duration: "Varies by course", languages: "English", requirements: "Use a Claude account and pass the course’s required quizzes. The free badge serves as a certificate of completion and includes a shareable verification link." },
    },
  },
  {
    id: "openai", name: "OpenAI Academy", provider: "OpenAI", url: "https://academy.openai.com/", source: "https://help.openai.com/en/articles/20001270-openai-academy-courses", credential: "both",
    copy: {
      "pt-BR": { description: "Formação em ChatGPT, agentes, Codex, APIs e adoção de IA no trabalho.", audience: "Profissionais, educadores e desenvolvedores", duration: "Varia por curso", languages: "Consulte o idioma de cada curso", requirements: "Entre com uma conta ChatGPT. Complete o curso e obtenha pelo menos 80% na avaliação para receber o badge. As trilhas Foundations, Codex e API oferecem certificado de conclusão ao completar todos os cursos e avaliações da trilha." },
      en: { description: "Training in ChatGPT, agents, Codex, APIs and adopting AI at work.", audience: "Professionals, educators and developers", duration: "Varies by course", languages: "Check each course’s language", requirements: "Sign in with a ChatGPT account. Complete a course and score at least 80% on its assessment to earn a badge. The Foundations, Codex and API pathways offer a completion certificate after all their courses and assessments are completed." },
    },
  },
  {
    id: "ibm", name: "Artificial Intelligence Fundamentals", provider: "IBM SkillsBuild", url: "https://skillsbuild.org/learning-catalog?topic=ai", source: "https://skillsbuild.org/digital-credentials", credential: "badge",
    copy: {
      "pt-BR": { description: "Fundamentos de aprendizado de máquina, linguagem natural, visão computacional e ética em IA.", audience: "Para começar em IA", duration: "10+ horas", languages: "Português, inglês e outros idiomas", requirements: "Crie uma conta gratuita no SkillsBuild e conclua as atividades exigidas pela trilha Artificial Intelligence Fundamentals. A IBM emite o badge digital pelo Credly; siga as instruções recebidas para resgatá-lo." },
      en: { description: "Foundations of machine learning, natural language, computer vision and AI ethics.", audience: "Getting started with AI", duration: "10+ hours", languages: "Portuguese, English and other languages", requirements: "Create a free SkillsBuild account and complete the activities required by the Artificial Intelligence Fundamentals pathway. IBM issues the digital badge through Credly; follow the instructions you receive to claim it." },
    },
  },
  {
    id: "huggingface", name: "AI Agents Course", provider: "Hugging Face", url: "https://huggingface.co/learn/agents-course/en/unit0/introduction", source: "https://huggingface.co/learn/agents-course/en/unit0/introduction#the-certification-process", credential: "certificate",
    copy: {
      "pt-BR": { description: "Agentes com smolagents, LlamaIndex e LangGraph, com exercícios e avaliação prática.", audience: "Conhecimento básico de Python e LLMs", duration: "Ritmo sugerido: 3–4 horas por capítulo", languages: "Inglês; traduções da comunidade", requirements: "A emissão é gratuita. Conclua a unidade 1 para o certificado de fundamentos. Para o certificado de conclusão, cumpra também uma atividade de caso de uso e o desafio final. É necessária uma conta Hugging Face. A execução de projetos depende dos recursos e provedores escolhidos." },
      en: { description: "Agents with smolagents, LlamaIndex and LangGraph, with exercises and practical evaluation.", audience: "Basic Python and LLM knowledge", duration: "Suggested pace: 3–4 hours per chapter", languages: "English; community translations", requirements: "Certificates are free. Complete unit 1 for the fundamentals certificate. For the completion certificate, also finish a use-case assignment and the final challenge. A Hugging Face account is required. Running projects depends on the resources and providers you choose." },
    },
  },
  {
    id: "kaggle", name: "Intro to Machine Learning", provider: "Kaggle Learn", url: "https://www.kaggle.com/learn/intro-to-machine-learning", source: "https://www.kaggle.com/", credential: "certificate",
    copy: {
      "pt-BR": { description: "Construa seus primeiros modelos e pratique validação, overfitting e random forests.", audience: "Conhecimento básico de Python", duration: "Cerca de 3 horas", languages: "Inglês", requirements: "Use uma conta Kaggle e conclua as lições e os exercícios do curso. Os cursos do Kaggle Learn são gratuitos e oferecem certificado de conclusão da plataforma." },
      en: { description: "Build your first models and practice validation, overfitting and random forests.", audience: "Basic Python knowledge", duration: "About 3 hours", languages: "English", requirements: "Use a Kaggle account and complete the course lessons and exercises. Kaggle Learn courses are free and offer a platform-issued completion certificate." },
    },
  },
  {
    id: "cs50", name: "CS50’s Introduction to AI with Python", provider: "Harvard · CS50", url: "https://cs50.harvard.edu/ai/", source: "https://cs50.harvard.edu/ai/certificate/", credential: "certificate",
    copy: {
      "pt-BR": { description: "Busca, representação do conhecimento, incerteza, redes neurais e linguagem, com projetos em Python.", audience: "Para quem já programa em Python", duration: "7 módulos, no seu ritmo", languages: "Inglês", requirements: "Envie os projetos e obtenha pelo menos 70% em cada um para receber o certificado gratuito do CS50. Esta opção é o CS50 Certificate; o certificado verificado do edX é uma modalidade separada e paga." },
      en: { description: "Search, knowledge representation, uncertainty, neural networks and language, with Python projects.", audience: "For learners who already code in Python", duration: "7 modules, self-paced", languages: "English", requirements: "Submit the projects and score at least 70% on each to earn the free CS50 certificate. This option is the CS50 Certificate; the edX verified certificate is a separate paid option." },
    },
  },
  {
    id: "google", name: "Machine Learning Crash Course", provider: "Google for Developers", url: "https://developers.google.com/machine-learning/crash-course", source: "https://developers.googleblog.com/machine-learning-crash-course/", credential: "unconfirmed",
    copy: {
      "pt-BR": { description: "Conceitos de aprendizado de máquina com vídeos, visualizações interativas e exercícios.", audience: "Bases de álgebra, estatística e Python", duration: "Módulos no seu ritmo", languages: "Inglês e versões localizadas", requirements: "Acesse as aulas gratuitamente pelo Google for Developers. Não encontramos promessa de certificado de conclusão na página consultada; esta indicação é para estudar." },
      en: { description: "Machine learning concepts through videos, interactive visualizations and exercises.", audience: "Basic algebra, statistics and Python", duration: "Self-paced modules", languages: "English and localized versions", requirements: "Access the lessons for free on Google for Developers. We found no promise of a completion certificate on the reviewed page; this recommendation is for learning." },
    },
  },
];
