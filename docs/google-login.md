# Ativar login e cadastro com Google

A integração usa Better Auth e as tabelas de autenticação já existentes no Postgres. Não precisa de migração. O primeiro acesso com um novo e-mail cria a conta; os próximos acessos abrem a mesma conta. O botão fica desabilitado enquanto faltar uma das credenciais.

## 1. Criar o cliente no Google Cloud

1. Abra [Google Cloud Console](https://console.cloud.google.com/) com a conta que administrará a Emada Academy. Selecione ou crie um projeto chamado **Emada Academy**.
2. Abra **Google Auth Platform**. Configure a identificação do aplicativo: nome **Emada Academy**, e-mail de suporte e contato **ludmila.omlopes@gmail.com**. A interface também pode mostrar essa configuração como **APIs e serviços > Tela de consentimento OAuth**.
3. Selecione o público **Externo**, pois os alunos poderão usar contas Google pessoais.
4. Durante os testes, mantenha o aplicativo em modo de teste e adicione os e-mails dos testadores, incluindo o administrador, quando solicitado. Para abrir a todos os alunos, conclua a configuração exigida pelo Google e altere o status de publicação na área de público.
5. Na área **Clientes**, crie um cliente OAuth do tipo **Aplicativo da Web**, com nome **Emada Academy Web**.
6. Cadastre os URIs de redirecionamento abaixo, exatamente como estão escritos:

~~~text
http://localhost:3000/api/auth/callback/google
http://127.0.0.1:3000/api/auth/callback/google
https://emada-academy.vercel.app/api/auth/callback/google
~~~

Este fluxo usa redirecionamento pelo servidor. Não depende de origens JavaScript autorizadas. Não adicione URLs temporárias de preview ao cliente de produção.

7. Copie o **ID do cliente** e o **Segredo do cliente** para os ambientes descritos abaixo. O segredo deve ficar apenas no servidor.

Os escopos solicitados pelo aplicativo são somente openid, email e profile. O login não pede acesso ao Gmail ou Drive.

## 2. Desenvolvimento local

Adicione estas variáveis ao arquivo **.env.local existente**, preservando a conexão Postgres e os outros segredos:

~~~dotenv
GOOGLE_CLIENT_ID=seu-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu-segredo
BETTER_AUTH_URL=http://localhost:3000
~~~

Não coloque NEXT_PUBLIC_ nesses nomes. Não copie o .env.example por cima do .env.local.

Reinicie **npm run dev** e acesse **http://localhost:3000/entrar**. Se usar 127.0.0.1, a tela de entrada redireciona para o hostname local definido em BETTER_AUTH_URL para manter o cookie OAuth no mesmo endereço do retorno.

## 3. Vercel

No [projeto Emada Academy](https://vercel.com/definns-projects/emada-academy/settings/environment-variables), adicione:

| Variável | Valor | Ambiente |
| --- | --- | --- |
| GOOGLE_CLIENT_ID | ID do cliente OAuth | Production |
| GOOGLE_CLIENT_SECRET | Segredo do cliente OAuth | Production |
| BETTER_AUTH_URL | https://emada-academy.vercel.app | Production |

BETTER_AUTH_URL já existe: confira o valor antes de alterar. Depois, faça um novo deploy para aplicar as credenciais. Para desenvolvimento na Vercel, use as mesmas variáveis no ambiente Development e a URL local. Evite credenciais de produção em previews.

## Contas com senha e progresso

Uma conta local com e-mail ainda não verificado não é unida automaticamente a uma conta Google. Para preservar o progresso:

1. Entre com o e-mail e a senha existentes.
2. Abra **Meu progresso > Acesso à sua conta > Conectar Google**.
3. Escolha a conta Google com o mesmo e-mail.
4. Após conectar, os próximos acessos podem usar **Continuar com Google**.

Os exercícios continuam associados ao mesmo ID interno do usuário. O login Google não concede privilégios administrativos; o convite de administrador continua necessário.

## Verificação após configurar

- Criar conta Google nova, confirmar acesso à trilha e salvar um exercício.
- Sair e entrar novamente com o mesmo Google: o exercício deve continuar salvo.
- Conectar uma conta com senha existente: o progresso deve permanecer.
- Cancelar no Google: voltar à Emada com mensagem clara.
- Usar outro Google: não visualizar o progresso do usuário anterior.
- Abrir uma aula deslogado, entrar com Google e voltar à aula solicitada.

Os testes automatizados locais cobrem a criação da autorização, proteção de origem, callbacks internos, PKCE, estado OAuth e bloqueio de conexão sem sessão. Não substituem o teste real com as credenciais Google.

Referências: [Better Auth: Google](https://better-auth.com/docs/authentication/google), [Google: credenciais OAuth para aplicações Web](https://developers.google.com/identity/protocols/oauth2/web-server#creatingcred), [Better Auth: vínculo de contas](https://better-auth.com/docs/concepts/users-accounts#account-linking).
