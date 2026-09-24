# Emada Radar

Portal para profissionais de inteligência artificial acompanharem notícias, benchmarks, lançamentos de modelos, publicações e experimentos da comunidade. Inclui a área de aprendizado Emada Academy.

## Recursos

- Rankings do LiveBench e da Artificial Analysis.
- Notícias de fontes oficiais e descobertas de experimentos no Hacker News.
- Publicações de perfis de IA, com integração opcional à API do X.
- Interface em português e inglês, com traduções de conteúdo via OpenRouter.
- Identificação de lançamentos de modelos com Jev e filtro de notícias destacadas.
- Aulas, acompanhamento de progresso, autenticação e administração de conteúdo.

## Executar localmente

Requer Node.js 24 e npm.

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Preencha `.env.local` com as configurações dos serviços que deseja habilitar. O servidor de desenvolvimento fica em `http://127.0.0.1:3000`. Recursos de conta, progresso e caches persistentes exigem Postgres e as migrações correspondentes. As integrações automáticas com OpenRouter são opcionais e ficam desativadas no arquivo de exemplo.

## Verificações

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

O build valida credenciais e tabelas das integrações habilitadas. As flags de avaliação e processamento inicial descritas na documentação podem realizar chamadas pagas; não são necessárias para iniciar o portal.

## Documentação

- [Portal, fontes, tradução e configuração](docs/portal-ia.md)
- [Classificação de lançamentos e orçamento](docs/news-classification.md)
- [Login com Google](docs/google-login.md)
- [Chat das aulas](docs/practice-chat.md)
- [Editor administrativo](docs/admin-lesson-editor.md)

## Configuração e publicação

O projeto utiliza Next.js, React, TypeScript, Postgres/Neon e Vercel. As migrações estão em `migrations/`, com comandos específicos em `package.json`; consulte a documentação de cada recurso antes de aplicá-las ao banco escolhido.

Credenciais devem ser configuradas no ambiente local ou nos segredos da hospedagem. `.env.local`, `.local/`, `.vercel/`, dependências e saídas de build ficam fora do Git. `.env.example` contém apenas o modelo de configuração.
