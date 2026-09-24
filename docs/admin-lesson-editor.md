# Editor de aulas

## Uso

1. Entre com uma conta autorizada em `admin_users`.
2. Abra **Administração → Editar aulas**, ou `/admin/aulas`.
3. Escolha uma das 15 aulas ativas e a etapa que quer editar.
4. Altere os campos de texto e use **Prévia** para conferir o resultado.
5. **Salvar rascunho** guarda a edição no banco sem mudar o conteúdo dos alunos.
6. **Publicar alterações → Confirmar publicação** disponibiliza os textos ao abrir ou atualizar a aula.

O editor oferece títulos, apresentação, textos das etapas, pedidos copiáveis, parágrafos, textos e legendas dos diagramas, exemplos, reflexões, descrição acessível das ilustrações, checklist, orientação do registro, pergunta, alternativas e explicação do quiz. As 8 aulas de Automações usam o mesmo editor, com os campos que existem em cada aula.

Nos diagramas, a prévia também aparece no próprio modo **Editar** e acompanha o texto enquanto você digita. Use **Parte do diagrama** para escolher **Título e legenda** ou um bloco. Trocar de parte mantém todas as alterações. No computador, campos e desenho aparecem lado a lado; no celular, o desenho fica acima, em uma área rolável. A prévia usa o mesmo componente da aula, adaptado à largura do painel. Nada é publicado automaticamente.

**Restaurar original**, abaixo de um campo modificado, leva o texto do código ao rascunho. É necessário salvar ou publicar para persistir essa restauração. O navegador pede confirmação antes de sair com alterações não salvas. As mudanças só em memória podem ser perdidas se o navegador ou computador encerrar abruptamente; salve o rascunho durante o trabalho.

## Limites intencionais

- Texto simples; HTML não é executado.
- Slugs, ordem e quantidade das etapas, imagens, URLs, duração e posição da alternativa correta são protegidos.
- Ao reescrever a revisão, preserve o sentido da alternativa correta indicada no formulário.
- PowerPoints são arquivos separados: editar o site **não** regenera o download. O painel informa essa diferença.
- As aulas arquivadas continuam acessíveis para preservar registros antigos, mas não entram neste editor.
- O conteúdo de interface (rótulos de botões, textos gerais de segurança e cotas do chat) não é editável.

## Persistência e segurança

A migração `003-lesson-content.sql` acrescenta `lesson_content` e `lesson_content_revisions`. Não modifica as tabelas de usuários, progresso ou chat. O currículo em código é a base; o banco guarda somente os campos de texto substituídos. Alterações publicadas são aplicadas à sala de aula, timeline, progresso, busca e contexto do chat. Rascunhos não são enviados aos alunos.

Páginas exigem sessão e associação em `admin_users`. A API exige a mesma autorização, valida origem, limita o corpo a 400 KB e aceita somente caminhos de texto definidos pelo currículo. A associação de administrador é conferida novamente dentro da transação de escrita. Não existe endpoint de promoção de contas no editor.

Um contador de versão e bloqueio transacional impedem que duas abas sobrescrevam silenciosamente o mesmo rascunho. Em conflito, os textos locais ficam no editor para copiar antes de recarregar. Cada salvamento/publicação guarda uma revisão com autor e data no banco; essa trilha de auditoria não possui ainda uma tela de restauração histórica.

## Migração e testes

Use conexão direta e um alvo explícito em `CONTENT_MIGRATION_DATABASE_URL`, primeiro na branch de teste:

```powershell
npm run db:migrate:content -- --apply
```

Não há fallback automático para a conexão de produção. A migração deve estar aplicada antes de publicar o código. A migração é idempotente.

Validações: 44 testes automatizados, typecheck, lint e build. A migração e disputa entre duas conexões foram verificadas em uma branch Neon isolada; usuários, progresso e pedidos de chat existentes permaneceram inalterados. No navegador local, foram verificados edição por etapa, prévia, salvamento, recarregamento, confirmação de publicação e largura de 390 px. Nenhuma geração paga de IA foi usada.
