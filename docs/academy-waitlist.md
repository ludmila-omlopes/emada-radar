# Lista de espera da Academy

A trilha de aulas (`/modulos`, `/aprender/*` e o progresso em `/progresso`) fica aberta apenas para o e-mail definido em `ACADEMY_OWNER_EMAIL` (`src/lib/academy-access.ts`). O acesso exige que esse e-mail esteja verificado (login com Google) ou pertença a uma conta de administração, porque cadastros por senha não verificam o endereço.

As demais pessoas, com ou sem login, veem um formulário de lista de espera. Em `/progresso`, a seção da conta continua disponível. O salvamento de exercícios e o chat das aulas recusam quem não tem acesso.

## Banco

A migração `009-academy-waitlist.sql` cria a tabela `academy_waitlist`. Aplique com uma conexão direta:

```powershell
$env:WAITLIST_MIGRATION_DATABASE_URL = "<conexão direta>"
npm run db:migrate:waitlist -- --apply
```

Endereços repetidos mantêm a primeira entrada, e o formulário responde da mesma forma para endereços novos e repetidos. Há um limite de 200 entradas por hora.

## Administração

`/admin/lista-de-espera` mostra o total, os últimos 500 e-mails e um botão para copiá-los.

Para abrir a Academy a todos, faça `canAccessAcademy` (`src/lib/session.ts`) retornar `true`.
