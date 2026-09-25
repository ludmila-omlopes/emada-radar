# Coleta filtrada do X

`/api/cron/social` usa `CRON_SECRET` e executa às **09:00 e 21:00 UTC**. As páginas só leem o Postgres: visitas, traduções, filtros da interface e o botão Atualizar não fazem consultas pagas ao X.

A consulta em `src/lib/social-search.ts` combina os 14 perfis do diretório com termos de IA/modelos/ferramentas e `-is:retweet -is:reply`. Não restringe idioma. Palavras-chave podem deixar passar referências indiretas ou nomes inéditos; o filtro é temático, não um classificador semântico. Alterar os termos ou perfis cria uma nova versão da consulta e inicia uma janela de 24 horas na próxima coleta; resultados da versão anterior deixam de aparecer.

Em 25/09/2026, foram acrescentados `@simonw`, `@swyx`, `@jxnlco`, `@alexalbert__`, `@trq212`, `@polynoamial`, `@scaling01` e `@kimmonismus`. `@karpathy` e `@bcherny` já estavam cadastrados. O diretório público e a busca usam a mesma lista; a inclusão não altera os horários nem o limite global de posts por execução.

## Limites e continuidade

- Uma página de **até 10 posts no total**, por execução, com duas execuções agendadas a cada dia UTC. Os horários delimitam slots persistentes de 12 horas; chamadas simultâneas e repetições do cron não geram uma segunda consulta no mesmo slot.
- IDs dos perfis ficam salvos. A descoberta consulta somente perfis ainda não resolvidos, sem expansões de usuários em cada busca.
- A primeira janela cobre 24 horas. Depois, `since_id` evita buscar novamente posts de janelas concluídas. Uma janela vazia avança a data de corte quando ainda não existe ID.
- Havendo paginação, a próxima execução continua com o mesmo `next_token`, corte e fim de janela. O cursor só avança quando todas as páginas daquela janela são salvas. Grandes volumes atrasam a coleta de posts mais novos.
- A busca recente só permite recuperar sete dias. Se o início de uma janela pendente chegar a uma hora desse limite, a coleta reinicia nos seis dias disponíveis e registra `recent_window_expired`; cobertura integral não é garantida durante atrasos prolongados.
- Falhas não avançam o cursor, não apagam posts anteriores e só são tentadas novamente no próximo slot. Tentativas interrompidas permanecem registradas. Uma trava de dois minutos impede sobreposição entre slots.
- Posts são mantidos por 30 dias; a página mostra os 60 mais recentes. O estado das fontes fica indisponível se houver erro ou mais de 26 horas sem sucesso, mantendo o conteúdo salvo.

Pelos preços consultados em 24/09/2026, US$ 0,005 por post e US$ 0,01 por usuário, 20 posts/dia dão **até US$ 3,10 em um mês de 31 dias**, mais **US$ 0,06** na descoberta inicial dos seis perfis. É uma estimativa para este coletor com execuções nos horários previstos, não um limite financeiro da conta. Consultas de outros aplicativos, mudanças de preço, reconfigurações e falhas repetidas na descoberta de usuários podem alterar o total. Tradução via OpenRouter é cobrada separadamente. [Preços do X](https://docs.x.com/x-api/getting-started/pricing).

## Publicação

1. Aplicar `migrations/007-social-search.sql` em um branch de teste com `SOCIAL_MIGRATION_DATABASE_URL` direto e `npm run db:migrate:social -- --apply`.
2. Validar migração, testes e Preview com banco isolado. Aplicar a mesma migração aditiva em Production antes de publicar o código.
3. Production exige `DATABASE_URL`, `X_API_BEARER_TOKEN` e `CRON_SECRET`. Não usar prefixos públicos nem copiar o token do X para Preview.
4. Opcionalmente, `X_SOCIAL_SEED=true` **somente no build inicial de Production** executa uma coleta pelo mesmo controle de slots. Builds normais não consultam o X. Retirar a flag após a publicação.

`social_search_runs` registra status, quantidade e códigos de erro sanitizados. `social_search_state` mantém contas, cursor e horário do último sucesso. Nenhuma dessas tabelas armazena credenciais.
