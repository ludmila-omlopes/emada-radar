# Newsletter do Radar

Resumo semanal por e-mail, em português ou inglês, montado com os dados que o portal já coleta: lançamentos de modelos, notícias das fontes oficiais, top 5 do LiveBench, melhor custo-benefício da Artificial Analysis, experimentos mais votados do Hacker News e posts de Vozes. O envio usa a API do [Resend](https://resend.com/docs/api-reference/emails/send-batch-emails).

## Inscrição

O formulário aparece no fim da página inicial (`/pt-BR`, `/en`) e, em versão compacta, no rodapé das demais páginas. Ele só é exibido quando a newsletter está configurada. O idioma da inscrição é o da página.

- Dupla confirmação: o endereço recebe um link e só passa a receber o resumo depois do clique. O link vale 72 horas.
- A página de confirmação e a de cancelamento pedem um clique no botão. Abrir o link não altera nada, porque verificadores de links de provedores de e-mail visitam os endereços automaticamente.
- O formulário responde da mesma forma para endereços novos, pendentes e já confirmados; não revela quem está inscrito.
- Um campo oculto descarta envios automatizados. Cada endereço recebe no máximo um e-mail de confirmação a cada 15 minutos, e o site envia no máximo 60 confirmações por hora.
- Pedidos não confirmados são apagados após 30 dias, na execução diária do cron.
- O banco guarda a data e a versão do texto de consentimento (`CONSENT_VERSION` em `src/lib/newsletter.ts`). Atualize a versão se o texto do formulário mudar.

## Cancelamento

Todo resumo traz o link "Cancelar inscrição" e os cabeçalhos `List-Unsubscribe` e `List-Unsubscribe-Post`, que permitem cancelar com um clique pelo próprio Gmail ou Outlook (RFC 8058). O `POST` em `/api/newsletter/unsubscribe` cancela imediatamente; um `GET` no mesmo endereço leva à página de confirmação. Cancelar também invalida links de confirmação antigos. Uma nova inscrição exige nova confirmação.

## Envio

O cron `/api/cron/newsletter` roda todo dia às 11h UTC (8h em Brasília), com `CRON_SECRET`:

1. Apaga pedidos pendentes com mais de 30 dias.
2. Se ainda não existe edição para a semana ISO (por exemplo, `2026-W40`) e o dia é segunda, terça ou quarta, monta o resumo dos últimos sete dias nos dois idiomas e congela o conteúdo na tabela `newsletter_issues`. Terça e quarta só abrem a edição se a de segunda falhou. Sem notícias nem experimentos na semana, nada é aberto.
3. Envia a edição da semana em lotes de até 100 e-mails para quem confirmou antes da abertura. Quem confirmar depois recebe a partir da semana seguinte.

Cada inscrito é reservado uma única vez por edição, inclusive com execuções simultâneas. Se o Resend recusa o lote antes de enviar (cota diária, validação), a reserva é liberada e a execução do dia seguinte continua de onde parou. Se o resultado é incerto (tempo esgotado, erro 5xx), o lote fica como "sem confirmação do provedor" e não é reenviado, para evitar e-mails duplicados. Se o Resend recusa o conteúdo de um lote (erro 400 ou 422, por exemplo por causa de um único endereço), os e-mails daquele lote são enviados um a um: o endereço recusado fica como "Recusado" na edição e os demais seguem. Se todos são recusados, o problema é tratado como configuração (por exemplo, o remetente) e o lote volta para a próxima execução. Cada envio usa uma chave de idempotência do Resend. Títulos com quebras de linha são normalizados antes de irem para o assunto.

O resumo não gera chamadas pagas: usa a classificação de lançamentos e as traduções que já estão em cache ou no catálogo manual. Sem a classificação ativa, a seção de lançamentos fica vazia e os anúncios aparecem entre as notícias. As notícias alternam entre fontes para que um único feed não ocupe a seção inteira. Links para o site levam `utm_source=newsletter`, `utm_medium=email` e `utm_campaign=<edição>`.

## Administração

`/admin/newsletter` mostra a configuração, inscritos por situação, as últimas edições e a prévia do resumo atual nos dois idiomas. O botão de teste envia as duas versões apenas para o e-mail do administrador conectado, com `[Teste]` no assunto.

## Ativação

1. Criar a conta no Resend e verificar um domínio próprio (registros SPF e DKIM no DNS). Sem domínio verificado, o Resend só entrega ao e-mail do dono da conta, o que basta para o envio de teste.
2. Aplicar `migrations/008-newsletter.sql` numa branch de teste com `NEWSLETTER_MIGRATION_DATABASE_URL` direto e `npm run db:migrate:newsletter -- --apply`. A migração é aditiva e idempotente. Depois, aplicar em Production.
3. Configurar na Vercel, como segredos de servidor: `RESEND_API_KEY` (chave com permissão de envio), `NEWSLETTER_FROM` (por exemplo, `Emada Radar <radar@seu-dominio>`), opcionalmente `NEWSLETTER_REPLY_TO`, e `NEWSLETTER_ENABLED=true`. Os links usam a origem de `BETTER_AUTH_URL`; confira se é o domínio público.
4. Publicar, abrir `/admin/newsletter` e usar "Enviar teste" antes da primeira segunda-feira.

Para pausar, definir `NEWSLETTER_ENABLED=false` e publicar novamente: o formulário some, o cron responde 503 e os links de confirmação e cancelamento continuam funcionando.

## Custos e limites

Pelos preços consultados em 29/09/2026, o plano gratuito do Resend inclui 3.000 e-mails por mês e 100 por dia, e o Pro custa US$ 20 por mês para 50.000 e-mails ([preços](https://resend.com/pricing)). O limite diário é compartilhado com as confirmações. Com cerca de 90 inscritos ou mais, o envio no plano gratuito passa a se estender por vários dias; nesse ponto, vale migrar para o Pro. O Resend mantém sua própria lista de supressão para endereços que retornam erro ou marcam spam; o registro desses eventos no banco, por webhook, ainda não foi implementado.

## Verificação

`npm test` cobre semanas ISO, validação de endereços, seleção do resumo, escape de HTML e cabeçalhos de cancelamento, o cliente do Resend com respostas simuladas e, em PostgreSQL embutido (PGlite), dupla confirmação, limites, cancelamento, reserva única por edição com execuções simultâneas, falhas do provedor e limpeza de pendentes.

Estado em 29/09/2026: implementado e verificado localmente (lint, typecheck, 115 testes, 12 deles da newsletter, e revisão visual em desktop e 375 px). A prévia do e-mail foi gerada com dados reais das fontes públicas. A migração 008 não foi aplicada e a newsletter não está ativada em nenhum ambiente.
