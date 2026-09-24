# Destaques de lançamentos de modelos

## Escolha do modelo

Pesquisa em 24/09/2026: Jev 1.13, da TypeSafe, é um modelo de decisão disponível no OpenRouter. Retorna uma opção de um conjunto fechado e a distribuição de probabilidades. Esse formato atende diretamente à classificação das notícias. O Gemini Flash Lite continua responsável pelas traduções, que precisam de geração de texto.

| Característica | Jev 1.13 | Gemini 2.5 Flash Lite, já usado no portal |
| --- | --- | --- |
| Saída | Decisão tipada e probabilidades | Texto ou JSON estruturado |
| Uso nesta integração | Classificar o assunto da notícia | Traduzir o texto |
| Preço por milhão de tokens na consulta | US$0,042 entrada; saída gratuita | US$0,10 entrada; US$0,40 saída |
| API | `/api/alpha/decisions` | `/api/v1/chat/completions` |

A escolha é por adequação de formato e custo. Não foi feita uma comparação de acurácia entre os dois modelos neste domínio. A Decisions API está em alpha; falhas e alterações de contrato deixam a notícia sem destaque. A versão está fixada em `typesafe/jev-1.13`, sem o alias `latest`, para evitar mudar o comportamento sem nova avaliação.

Fontes: [Jev no OpenRouter](https://openrouter.ai/docs/guides/community/jev), [API Decisions](https://openrouter.ai/docs/api/api-reference/alphadecisions/submit-a-decisions-request), [preço do Jev](https://openrouter.ai/typesafe/jev-1.13), [catálogo de modelos](https://openrouter.ai/api/v1/models) e [interpretação de confiança da TypeSafe](https://docs.typesafe.ai/confidence).

## Regra editorial

- **Lançamento:** anúncio explícito da estreia, liberação ou primeira disponibilidade de um modelo, família ou nova versão identificável, incluindo previews públicos e primeiros pesos abertos. Inclui texto, código, imagem, vídeo, áudio e embeddings.
- **Outra notícia:** tutoriais, comparações, benchmarks, atualizações de aplicativos, rumores, previsão de lançamentos, mudanças de preço, parcerias, aposentadorias ou acesso a um modelo já existente em outra plataforma.
- **Incerto:** título e resumo não dão evidência suficiente. Nunca recebe destaque.

O classificador recebe título original, resumo RSS de até 1.200 caracteres quando disponível, nome da fonte e descrição HTML da página oficial de até 600 bytes. O servidor lê apenas o cabeçalho da página, com limite de 500 KB e cinco segundos, restringindo os domínios aos cinco coletores oficiais e validando cada redirecionamento. Não executa scripts e não recebe texto de usuários. Falhas nessa leitura deixam a classificação usar título e RSS. Uma introdução explícita de modelo pode ser evidência suficiente no título; uma simples menção a GPT, Gemini ou Claude não é.

O selo “Novo modelo” exige categoria `release` e probabilidade dessa categoria de pelo menos **0,90**. Usa-se `probabilities.release`, não o campo `confidence`, que descreve a concentração da distribuição. O corte é conservador e provisório: probabilidades não equivalem a garantia de acerto e uma avaliação maior com notícias rotuladas é necessária para calibrá-lo.

## Interface e processamento

- A lista mantém a ordem cronológica. Lançamentos têm borda lateral, fundo sutil, ícone e selo textual; a indicação não depende apenas de cor.
- O filtro “Só lançamentos de modelos” combina com a busca e a fonte selecionada. Funciona em português e inglês, sobre a mesma decisão.
- Notícias ainda não processadas ficam visíveis sem selo. A análise ocorre após a resposta, com `after`, e aparece na próxima atualização. O portal já se atualiza a cada cinco minutos quando a aba está visível.
- Cache persistente por hash de ID, URL, título, resumo RSS, fonte, versão do modelo e regras. Mudanças nesses campos invalidam o resultado. A descrição da página é consultada apenas ao classificar uma entrada nova; edições exclusivas dessa descrição não invalidam o cache sozinhas. Traduções não alteram a decisão.
- Resultados positivos, negativos e incertos são armazenados. Falhas não viram “outra notícia” nem lançamento. Sem chave, resultados já salvos ainda podem ser lidos; sem banco ou com recurso desativado, a lista funciona sem destaques automáticos.

## Orçamento

Limite próprio de **US$0,50 por mês UTC**, dentro do orçamento compartilhado de US$5 por banco. Cada lote de até oito notícias reserva US$0,01 antes de chamar a API. O mesmo débito atômico de `practice_budgets` é usado pelo chat e pelas traduções. O limite da chave protege o gasto total entre Preview e Production, cujos bancos são separados.

No máximo um lote por minuto por banco, com até 8.000 bytes de entradas antes do enriquecimento e 14.000 bytes após adicionar descrições de até 600 bytes por página. As perguntas apontam explicitamente para a notícia correspondente em `state.articles.articleN`. Provedor sem coleta de dados, sem fallback e preço máximo de US$0,05/milhão de tokens de entrada, saída e taxa por pedido iguais a zero. Uma chamada falha ou sem custo confirmado conserva a reserva; falha da chave antes da inferência devolve o valor. Uma cobrança acima da reserva pausa o orçamento do mês.

Há trava entre instâncias e cache para evitar cobrança duplicada. Uma falha só pode ser tentada novamente depois de 24 horas, até três vezes. Interrupções deixam a reserva registrada. Não há endpoint público para enviar conteúdo arbitrário ao classificador.

## Ativação e testes

1. Aplicar migração 006 em branch de teste: `NEWS_CLASSIFICATION_MIGRATION_DATABASE_URL` direto e `npm run db:migrate:news-classification -- --apply`. Requer migração 002, sem modificar registros existentes.
2. Definir `OPENROUTER_NEWS_CLASSIFICATION_ENABLED=true` e disponibilizar `OPENROUTER_API_KEY` como segredo no servidor.
3. Publicar no ambiente com o banco correspondente. O build verifica configuração e tabelas, sem chamadas de classificação por padrão.
4. `OPENROUTER_NEWS_VERIFY=true` somente no build executa uma avaliação inicial com oito exemplos versionados, incluindo três lançamentos (um deles apenas com título), tutorial, recurso de aplicativo, rumor, integração e título vago. Os resultados são cacheados e o custo é contabilizado normalmente. O build falha se algum exemplo não recebe o destaque esperado.
5. `OPENROUTER_NEWS_SEED=true` somente no build classifica o acervo atual de até 100 notícias, em até 25 lotes sequenciais. Essa manutenção dispensa o intervalo entre lotes, preservando todas as reservas, limites financeiros e travas. Interrompe na primeira falha ou falta de orçamento. Sem a flag, o build não processa o acervo; o tráfego continua processando novidades em segundo plano.

Em 24/09/2026, Jev acertou os oito casos dessa avaliação inicial em chamada real. Isso verifica integração e casos básicos, não é uma medição representativa de precisão em notícias reais. Os testes automatizados também cobrem contrato da API, correspondência de entradas, limites, cache, simultaneidade, falhas e orçamento compartilhado.

## Publicação validada

Em 24/09/2026, o [ambiente de teste](https://emada-academy-cexhs7sx6-definns-projects.vercel.app/pt-BR/noticias) processou as 100 notícias disponíveis com as regras `model-release-v2`, resultando em nove destaques. As páginas publicadas em português e inglês foram verificadas: ambas exibem nove selos e o filtro de lançamentos, sem mensagens de tradução ausentes. Build de produção, TypeScript, lint e testes de classificação, orçamento e leitura de evidências passaram. A ativação permanece restrita ao Preview.
