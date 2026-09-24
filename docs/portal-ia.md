# Portal de IA

A página inicial agora é o radar, inclusive para usuários autenticados. A trilha continua em `/modulos`, os exercícios em `/laboratorio` e os conceitos em `/biblioteca`.

## Idiomas

O portal usa `next-intl`, com `/pt-BR` e `/en` e os mesmos caminhos para Modelos, Notícias, Experimentos e Vozes. Links antigos sem prefixo redirecionam preservando a query. A prioridade é idioma explícito na URL, cookie `EMADA_LOCALE`, preferência da conta (quando há sessão e não há cookie) e `Accept-Language`; o fallback é português brasileiro. Variantes como `en-US` e `pt-PT` são negociadas. O seletor fica no cabeçalho do desktop e no menu móvel, preserva a página, query e âncora e salva a escolha por um ano. Para contas autenticadas, também salva no banco. O login, as APIs, o admin e o conteúdo didático da Academy mantêm as rotas existentes e o português; o cartão da Academy informa isso em inglês.

Os catálogos em `src/i18n/messages` traduzem navegação, filtros, metadados, estados, explicações e unidades dos benchmarks. Datas usam o idioma escolhido e mantêm UTC; preços continuam em USD. Os resultados, nomes de modelos, empresas e fontes não são traduzidos. Cabeçalhos `Link` do middleware anunciam as versões de idioma aos buscadores.

### Tradução de publicações

As traduções são preparadas por Codex e ficam versionadas em `src/data/publication-translations.json`. O catálogo inicial contém 100 títulos de notícias, 38 títulos de experimentos e 23 posts, traduzidos do inglês para o português brasileiro. A interface em português e inglês continua nos catálogos `src/i18n/messages`.

Cada entrada guarda o tipo de publicação, ID, URL, texto original, idioma de origem e tradução. O portal aplica a tradução somente quando ID, tipo, URL e texto original correspondem exatamente à fonte atual. Uma edição da fonte invalida a tradução antiga. O catálogo nunca injeta publicações antigas no feed nem altera as datas ou a expiração das fontes.

O visitante pode alternar entre “Ver original” e “Ver tradução”. A busca considera ambos os textos. URLs, handles, nomes de modelos, números e reticências de posts truncados são preservados. Em inglês, os originais em inglês são exibidos diretamente.

### Traduções automáticas com OpenRouter

Notícias e posts novos usam a conta OpenRouter configurada no servidor quando `OPENROUTER_TRANSLATIONS_ENABLED=true`. O catálogo manual tem prioridade e não gera chamadas pagas. Experimentos continuam com as traduções preparadas. Em `/en`, os originais em inglês continuam sem chamada ao modelo.

O modelo é `google/gemini-2.5-flash-lite`, com resposta JSON validada, até oito textos por lote, 6.000 bytes de entrada e 4.096 tokens de saída. Os textos públicos são tratados como dados, sem ferramentas ou acesso a navegação. Links e menções são conferidos antes de aceitar o resultado. Nomes, números e trechos truncados devem ser preservados pelo modelo; traduções automáticas podem conter erros e sempre oferecem “Ver original”.

Na primeira consulta a um item novo, o portal mostra o original e agenda a tradução com `after`, depois de enviar a página. Ela aparece na próxima atualização, inclusive na atualização existente a cada cinco minutos. O cache persistente no Postgres usa hash de tipo, ID, URL, texto, idioma e versão do tradutor. Não existe um endpoint público que aceite texto arbitrário para tradução. Falhas de API, configuração ou banco mantêm o conteúdo disponível no original.

O limite inicial de traduções é **US$1 por mês UTC**, com reserva de US$0,01 por lote. Essa reserva também debita atomicamente `practice_budgets`, compartilhando o limite de US$5 com o chat quando ambos usam o mesmo banco. Preview e Production têm bancos e contadores separados; o limite de US$5 da mesma chave no OpenRouter é o teto entre ambientes. Não houve aumento do limite da chave.

Locks no banco impedem processamento duplicado entre instâncias. Há no máximo um lote por minuto. Custos confirmados conciliam a reserva; falhas após possível envio mantêm a reserva integral. Erros antes da geração liberam o valor. Novas tentativas de um texto falho só acontecem após 24 horas, até três tentativas; não há reenvio imediato. Se um custo exceder a reserva conservadora, o orçamento fica pausado no mês. Pendências de execução interrompida continuam debitadas.

Ativação:

1. Aplicar `migrations/005-openrouter-translations.sql` numa branch de teste, com `OPENROUTER_TRANSLATION_MIGRATION_DATABASE_URL` direto e `npm run db:migrate:translations -- --apply`. Requer a tabela de orçamento da migração 002; não altera dados antigos.
2. Disponibilizar a chave sensível existente `OPENROUTER_API_KEY` no ambiente da Vercel e definir `OPENROUTER_TRANSLATIONS_ENABLED=true`. Nunca usar prefixo `NEXT_PUBLIC_`.
3. Publicar com as conexões de banco corretas para o ambiente. O build verifica chave, saldo, limite de até US$5 e tabelas, sem gerar conteúdo por padrão.
4. Para validar a ativação uma única vez, definir `OPENROUTER_TRANSLATION_VERIFY=true` **somente no build**. O teste traduz uma frase fictícia, contabiliza o custo no mesmo orçamento e reaproveita o resultado em novas execuções. Nenhuma credencial é impressa.

Desativar `OPENROUTER_TRANSLATIONS_ENABLED` e publicar novamente interrompe novos pedidos da aplicação. Desabilitar a chave no OpenRouter interrompe também deployments anteriores. As traduções manuais continuam funcionando.

Referências: [API de chat do OpenRouter](https://openrouter.ai/docs/api/api-reference/chat/send-chat-completion-request) e [respostas estruturadas](https://openrouter.ai/docs/guides/features/structured-outputs).

Estado em 24/09/2026: ativado no Preview `https://emada-academy-qpzncj7ve-definns-projects.vercel.app`, deployment `dpl_DCoCfQ3z9Lv1P1ZB7XD93TYhee38`. A migração 005 foi aplicada duas vezes na branch isolada `preview-i18n-20260924`, confirmando idempotência. O teste real devolveu “Modelos de IA podem ajudar desenvolvedores a escrever código.”, com 66 microdólares (US$0,000066) contabilizados e resultado em cache. A chave sensível passou a ter os destinos Production e Preview sem leitura do seu valor. A flag de tradução foi habilitada apenas em Preview. O build remoto, lint, typecheck e 24 testes relacionados passaram. O conteúdo didático e o deployment de Production continuam na versão anterior.

Para atualizar o catálogo manual:

1. Execute `npm run translations:collect`. O script usa os mesmos coletores públicos do portal e grava as publicações sem tradução em `.local/translation-candidates.json`, sem alterar o catálogo.
2. Traduza os textos completos disponíveis e adicione as entradas ao catálogo, preservando os originais e links. Não complete trechos truncados nem apresente resumos como traduções.
3. Execute os testes e publique um novo Preview. Só adicionar a tradução não renova a data ou torna um post expirado visível novamente.

### Ambiente de teste de idiomas

As preferências de idioma usam a branch Neon `preview-i18n-20260924` (`br-super-dawn-acs3ipd6`). O Preview recebe `DATABASE_URL` e `POSTGRES_URL` dessa branch como overrides de deployment. Preserve esses overrides em novos deploys de teste.

A migração histórica `004-localization.sql` foi mantida porque já foi aplicada. Suas tabelas antigas de cache e consumo não são mais utilizadas; nenhuma tabela ou dado existente foi apagado nesta substituição. A tabela de preferência por usuário permanece ativa. Para um novo banco, o comando `npm run db:migrate:localization -- --apply` exige uma conexão direta explícita em `LOCALIZATION_MIGRATION_DATABASE_URL`.

Os testes verificam correspondência entre publicação e tradução, fallback quando o original muda, preservação de links, handles e números, além do roteamento de idiomas e persistência da preferência.

## Coleta

As notícias podem receber destaque automático de lançamento de modelo usando Jev pelo OpenRouter. O filtro “Só lançamentos de modelos” mantém a busca e os filtros de fonte. Veja critérios, avaliação, cache, ativação e limites em [Classificação de notícias](news-classification.md).

As páginas são renderizadas no servidor. As consultas usam o cache persistente do Next e revalidam ao receber tráfego; não dependem de uma migração ou de um cron. A página aberta verifica atualizações a cada cinco minutos enquanto a aba estiver visível; o botão Atualizar permite uma consulta manual. A primeira consulta após o intervalo pode receber o cache anterior enquanto a atualização acontece em segundo plano.

| Área | Fonte | Intervalo do cache |
| --- | --- | --- |
| Modelos | CSVs e metadados públicos de LiveBench/new-livebench | 6 horas |
| Notícias | RSS de OpenAI, Google AI, Google DeepMind e Hugging Face | 15 minutos |
| Notícias | Lista pública de notícias da Anthropic | 30 minutos |
| Experimentos | Busca por títulos no Hacker News via Algolia | 30 minutos |
| Vozes | Busca recente do X, filtrada por IA e perfis, sem respostas/reposts; leitura do Postgres | Coleta às 09h e 21h UTC |
| Vozes sem API | Seleção datada de URLs + conteúdo do oEmbed oficial do X | 1 hora para o conteúdo; seleção pontual |
| Modelos adicionais | Tabela pública da Artificial Analysis; Data API opcional | 6 horas |

Fonte consultada: o horário exibido vem do cabeçalho HTTP Date preservado no cache da resposta. Datas e horários são apresentados em UTC. Uma fonte sem resposta válida aparece indisponível; não é substituída por dados fictícios. Falhas em uma fonte não eliminam resultados das outras.

O LiveBench descobre a versão mais recente em `src/lib/constants.js`, lê o mapa de categorias e calcula os resultados a partir das subtarefas. O arquivo de metadados JavaScript é lido como literal JSON5, nunca executado. Valores ausentes continuam ausentes. As categorias têm pesos iguais na média geral. O custo por acerto usa custo total dividido pelo número de questões, dividido pela pontuação geral e multiplicado por 100. Configurações de esforço são linhas distintas, identificadas no nome.

As notícias automáticas são independentes da fila antiga de curadoria em `/admin`; não recebem o rótulo de revisão humana. A coleta antiga e seu cron continuam operacionais. A lista da Anthropic é HTML, pois o site não oferece o RSS usado pelas outras fontes; mudanças no seu markup podem exigir ajuste do parser.

Experimentos são descobertas automáticas dos últimos 30 dias, com filtro de relevância pelo título, deduplicação, autor, data e link para a discussão. Pontos e comentários pertencem ao Hacker News. O portal não afirma ter reproduzido os testes. As buscas estão definidas em `src/lib/portal-data.ts`.

## Integrações opcionais

Configure no ambiente do servidor, nunca com prefixo `NEXT_PUBLIC_`:

- `X_API_BEARER_TOKEN`: token de aplicativo do X com acesso de leitura a usuários e busca recente. O administrador deve configurar acesso e créditos no console do X. Habilita a descoberta automática de novos posts. Sem token, o portal pode usar a seleção pontual descrita abaixo. Com token, falhas preservam os posts já salvos e são indicadas no estado das fontes.
- `ARTIFICIAL_ANALYSIS_API_KEY`: chave opcional da Data API gratuita. O adaptador prioriza `/api/v2/data/llms/models` quando a chave estiver configurada. Sem chave, ou em caso de falha da API, usa a tabela pública atualizada da Artificial Analysis. Não é necessária credencial para o ranking público funcionar.

### Artificial Analysis

A página inicial e `/modelos` permitem alternar entre LiveBench e Artificial Analysis, mantendo as classificações independentes. A leitura pública de `https://artificialanalysis.ai/leaderboards/models` oferece Intelligence Index, custo por tarefa em US$, velocidade mediana, latência até o primeiro trecho, tempo total de resposta e janela de contexto. A coleta inicial validou 270 configurações de modelos: 266 com inteligência, 99 com custo por tarefa, 160 com velocidade/latência/tempo total e 270 com contexto. Esses totais são dinâmicos.

O parser identifica as colunas pelos nomes, preserva números arredondados e asteriscos de estimativa da fonte, converte k/M em tokens, mantém valores ausentes como `null` e valida os links dos modelos. Não lê scripts embutidos nem os executa. Pontuações públicas iguais aparecem empatadas. Mudanças de estrutura ou números inesperados fazem a coleta falhar de forma explícita, em vez de deslocar colunas silenciosamente.

O HTML público excede o limite de 2 MB do cache de fetch do Next. Por isso, a leitura aceita até 5 MB e o cache persistente guarda **somente os dados processados**, por seis horas, usando `unstable_cache` enquanto Cache Components estiver desativado neste projeto. O horário HTTP da coleta original acompanha o resultado armazenado; atualizar a página não renova artificialmente esse horário.

Com a API configurada, também podem estar disponíveis Coding Index, Math Index e preços de entrada/saída por milhão de tokens. As métricas refletem a origem utilizada, identificada na nota do ranking. Preço por milhão de tokens nunca é tratado como custo por tarefa. Não se misturam resultados da API e da tabela pública no mesmo conjunto.

Os perfis são definidos em `src/lib/portal-types.ts`: Sam Altman, Boris Cherny, Theo Browne, OpenAI Developers, Anthropic e Andrej Karpathy. O X resolve seus IDs uma vez e os salva no Postgres. Uma única busca reúne os seis perfis e filtra por assuntos de IA, excluindo respostas e reposts. Nenhuma chamada de publicação é feita. Veja [coleta e limites](social-search.md).

### Coleta pontual de posts

Em 23/09/2026, foram coletados 25 links públicos dos seis perfis diretamente nas timelines do X, com datas extraídas do elemento `time` das publicações. `src/data/social-post-selection.json` contém somente IDs, perfis, datas de publicação e horário da seleção. Não contém cookies, credenciais, HTML ou textos copiados. Os posts incluem conversas e são uma seleção recente, não uma garantia de cobertura integral da timeline.

O servidor consulta `https://publish.twitter.com/oembed` para obter o texto real desses posts sem autenticação. Autor, domínio e ID são validados; o HTML é convertido em texto e nenhum script remoto é executado. Publicações indisponíveis são omitidas individualmente, sem derrubar os outros perfis. O horário da seleção continua fixo, mesmo quando o conteúdo é consultado novamente. A interface identifica a coleta pontual e oferece filtro por perfil e links para mídia e conversas originais.

**oEmbed não descobre novos posts.** A seleção não se atualiza pelo botão Atualizar ou pelo intervalo de consulta da página. Para atualizar a seleção manualmente, leia novamente os perfis públicos, substitua os IDs e datas observados no JSON e registre o horário real em `collectedAt`. Apenas posts publicados até esse horário e nos últimos 30 dias são aceitos, com no máximo cinco por perfil. A seleção inteira expira em sete dias para não ser apresentada indefinidamente como novidade. Para atualização contínua, configure `X_API_BEARER_TOKEN`. A sessão do navegador utilizada na coleta inicial não foi copiada para o servidor.

Referência da integração pública: [oEmbed oficial do X](https://docs.x.com/x-for-websites/oembed-api).

Referências: [LiveBench](https://github.com/LiveBench/new-livebench), [Artificial Analysis API](https://artificialanalysis.ai/api-reference), [X API](https://docs.x.com/x-api), [HN Search](https://hn.algolia.com/api).

## Validação

### Hierarquia visual do portal

As cinco telas do portal usam um cabeçalho com título descritivo, uma frase de contexto e a ação Atualizar. Foram removidos os eyebrows, a faixa de edição da home, a navegação duplicada por âncoras, os números decorativos de seção e os rótulos redundantes dos cards. A marca e os links da navegação principal continuam orientando o usuário.

- **Hierarquia e proximidade:** títulos, filtros e resultados agrupados; espaçamento e tipografia indicam a importância de cada bloco. Os campos do ranking têm rótulos persistentes.
- **Divulgação progressiva:** explicações de parâmetros, detalhes de coleta e metodologia ficam em controles nativos `details`/`summary`. Fontes e horários continuam acessíveis, e estimativas e coleta pontual continuam sinalizadas junto aos resultados.
- **Reconhecimento e consistência:** os títulos correspondem aos destinos da navegação. Os filtros mantêm o estado selecionado e a contagem de resultados.
- **Acessibilidade:** foco visível, controles principais com área de interação de 44 px, expansão por teclado e respeito à preferência de movimento reduzido. No celular, a descrição usa a largura disponível sob o título e a ação.

Referências: [heurísticas de usabilidade da Nielsen Norman Group](https://www.nngroup.com/articles/ten-usability-heuristics/) e [design estético e minimalista](https://www.nngroup.com/articles/aesthetic-minimalist-design/).

`npm run typecheck`, `npm run lint`, `npm test` e `npm run build`.

Os testes em `tests/portal-parsers.test.ts` verificam pesos, valores ausentes, custo por acerto, metadados sem execução de código, links seguros, recorte de datas e deduplicação. `tests/social-posts.test.ts` verifica autoria e ID do oEmbed, extração segura de texto, datas, expiração e deduplicação da seleção. `tests/artificial-analysis.test.ts` verifica o mapeamento das colunas, unidades, estimativas, ausências, mudanças de estrutura, links de modelos e contrato da API. Endpoints autenticados precisam de credenciais válidas para uma validação real.
