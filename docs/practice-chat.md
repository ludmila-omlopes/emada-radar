# Chat real nas práticas

Integração server-side com OpenRouter, modelo fixo `google/gemini-2.5-flash-lite`. A chave nunca é entregue ao navegador. O endpoint `/api/practice-chat` exige sessão; o POST também exige origem igual a `BETTER_AUTH_URL`, JSON limitado a 12 KB e um identificador UUID por operação. O cliente não escolhe modelo, papel, histórico, limite ou ferramentas. As respostas aparecem como texto, sem executar HTML ou links recebidos.

## Limites aprovados

- US$ 5 por mês-calendário UTC para toda a plataforma, além do limite da chave no OpenRouter.
- Duas conversas por usuário/aula, seis mensagens enviadas em cada, no máximo 12 por aula. Limites vitalícios da aula, não por sessão do navegador.
- 24 mensagens e 60.000 tokens por usuário/dia UTC; 30.000 tokens por aula.
- 1.500 caracteres por mensagem; contexto serializado limitado a 6.000 bytes, removendo pares antigos; 500 tokens de saída.
- Tokens incluem entradas, histórico e saída, não apenas o texto novo do aluno.
- Uma solicitação por vez por usuário, intervalo de cinco segundos; pendências bloqueiam novos envios por 90 segundos.

O modelo é fixo e não há busca, plugins, anexos, ferramentas, fallback de modelos nem repetição automática de geração. O roteamento exige provedor sem coleta de dados e preço máximo de US$0,25/milhão de tokens de entrada e US$1/milhão de saída, sem cobrança fixa por solicitação. O limite legado `max_tokens` é usado porque consta entre os parâmetros suportados deste modelo no catálogo consultado; a API geral também oferece `max_completion_tokens`.

## Orçamento e concorrência

O Postgres reserva US$0,01 e 8.192 tokens ANTES da chamada. Locks transacionais por usuário e débito condicional atômico no orçamento mensal funcionam entre abas e instâncias da Vercel. A transação termina antes da chamada de rede. Respostas válidas conciliam a reserva com `usage.cost`, `prompt_tokens` e `completion_tokens`; ausência de uso ou falha após possível envio mantém a reserva. Falha na verificação da chave, antes de iniciar geração, libera a reserva financeira e de tokens, mas conta como tentativa de mensagem.

Um UUID repetido nunca inicia uma segunda geração. Pendências abandonadas continuam debitadas e não são reenviadas automaticamente. Um consumo acima da reserva aciona pausa conservadora pelo restante do mês. O teto da chave é a segunda barreira no próprio provedor; configure uma chave exclusiva, não compartilhada com outros apps. Se usa BYOK, habilite também a inclusão desse consumo no limite da chave. Os US$5 referem-se à inferência, não a taxas de compra de créditos ou infraestrutura.

## Ativação

1. Criar chave de inferência exclusiva em https://openrouter.ai/settings/keys, limite US$5 com reset mensal. Chaves de gerenciamento e sem limite são rejeitadas. Uma chave com limite vitalício de até US$5 também é aceita, mas não renova automaticamente.
2. Cadastrar `OPENROUTER_API_KEY` como segredo sensível na Vercel. O chat está habilitado em Production. A mesma chave também está disponível em Preview para as traduções automáticas do portal, documentadas em `docs/portal-ia.md`. Não colar em conversas, código, logs ou variáveis públicas.
3. Testar `migrations/002-practice-chat.sql` em branch Neon usando conexão direta. Depois aplicar somente essa migração aditiva na produção, sem recriar dados ou autenticação.
4. Ativar `PRACTICE_CHAT_ENABLED=true` e fazer deploy. O build executa `scripts/verify-practice-config.ts`: quando habilitado, exige chave válida, saldo mínimo e teto de até US$5 antes de publicar, sem gerar resposta nem registrar segredos. Para pausar imediatamente no provedor, desabilitar a chave; para desativar pela aplicação, usar `false` e redeploy.
5. Verificar conversa autenticada com dados fictícios, limites e histórico. Não usar contas de alunos para testes de escrita.

Sem configuração, o aluno recebe uma indicação de indisponibilidade e pode continuar pelo exercício escrito. O chat não conclui a aula nem marca checklist/quiz. ‘Adicionar conversa ao meu registro’ apenas anexa o texto, sem substituir o que o aluno escreveu.

## Verificação e implantação

`npm test` cobre entradas, origem, autenticação, contexto, quotas, payload do provedor, migração idempotente em PostgreSQL embutido (PGlite), isolamento entre usuários, idempotência, pendências, falhas e reserva global de orçamento. O adaptador PGlite serializa transações porque o motor tem uma conexão; a validação em branch Neon ainda é necessária antes da produção. Chamadas ao modelo são simuladas nesses testes.

O runner `npm run db:migrate:chat -- --apply` exige `PRACTICE_MIGRATION_DATABASE_URL` explícita e direta. Ele aplica apenas a migração 002 dentro de transação; não assume o `DATABASE_URL` existente. A fixture visual local usa respostas simuladas e dados fictícios; foi verificada em desktop e 390 px, incluindo histórico após recarregar, segunda conversa, bloqueio da terceira e inclusão no registro sem substituir texto existente.

Estado em 11/09/2026: chat ATIVO em https://emada-academy.vercel.app. 30 testes, lint, typecheck e build passaram. A migração 002 foi aplicada duas vezes numa branch temporária Neon para verificar idempotência; testes com múltiplas conexões validaram o máximo de duas conversas, oito envios simultâneos com o mesmo UUID gerando uma única chamada simulada, isolamento por usuário, conciliação de tokens e bloqueio de concorrência na última reserva do orçamento. Só depois foi aplicada a migração aditiva em produção, sem remover tabelas ou usuários existentes.

O deploy `dpl_B7V7vnKaR2bqm85G8bTC26LutUHM` ficou READY com `PRACTICE_CHAT_ENABLED=true`. A chave permanece como segredo de produção da Vercel, indisponível para download local, e passou na verificação de limite durante o build. Um teste autenticado de ponta a ponta, com conta descartável e dados fictícios, confirmou resposta real do OpenRouter, histórico e repetição idempotente sem segunda geração: 262 tokens e US$0,000053 (53 microdólares contabilizados). A conta descartável e seu histórico foram removidos, mantendo esse custo no orçamento global. Nenhum exercício de aluno foi alterado.

A branch temporária `test-practice-chat-20260911` foi excluída após a validação. Apenas a cópia de testes e seus registros fictícios foram descartados; a branch principal permanece intacta.

## Fontes técnicas

- OpenRouter: https://openrouter.ai/docs/api/api-reference/chat/send-chat-completion-request
- Roteamento e teto de preço: https://openrouter.ai/docs/guides/routing/provider-selection
- Verificação da chave: https://openrouter.ai/docs/api/api-reference/api-keys/get-current-api-key
- Catálogo conferido em 11/09/2026: https://openrouter.ai/api/v1/models
