# Aprendizado por dias

A trilha tem 15 dias de estudo: fundamentos nos dias 1–7 e automações nos dias 8–15. Os dias representam etapas de estudo, sem bloqueios por data ou calendário.

A página inicial de quem está conectado e a Minha trilha mostram a timeline, a proporção concluída e uma ação para o primeiro dia ainda não concluído. O básico é uma adaptação original Emada da AI Learning Series de Jeremy Utley: boas-vindas e aulas 01–06. O conteúdo preparado está em `src/lib/basic-lesson-content.json`; atividades e revisão, em `src/lib/basic-lessons.ts`. São 35 slides e sete apresentações em `public/aulas/basico`.

As novas aulas recebem slugs próprios. As seis aulas básicas anteriores permanecem acessíveis pelos links originais e seus exercícios aparecem no histórico de Meu progresso. Não contam como conclusão das novas aulas. Os oito slugs de automações não mudam. Nenhum registro é apagado e não há migração de banco de dados. Todos os indicadores de progresso contam apenas os 15 dias ativos.

O básico apresenta um slide por tela, com o texto do roteiro para leitura, descrição acessível e ampliação por diálogo. Prompts também aparecem como texto selecionável. Cada aula oferece a apresentação editável para download. São cinco telas de conteúdo, prática e revisão; não há vídeo gravado disponibilizado. O módulo de automações mantém conceito, exemplo, prática e revisão. A prática exige a lista de tarefas completa e pelo menos 30 caracteres. A revisão exige a alternativa correta. A conclusão depende do sucesso da ação de salvamento existente, que valida novamente os dados e a sessão no servidor.

No último dia do básico, entrega-se o fluxo e o plano de cinco testes. Não há bloqueio de cinco dias: esse exercício de rotina continua depois da aula.

O rascunho de uma aula ainda não concluída guarda a etapa e as respostas no sessionStorage, usando o identificador do usuário e da aula. Ele é retomado na mesma aba e removido ao salvar com sucesso. Os exercícios concluídos continuam no Postgres e podem ser consultados em Meu progresso, em seções recolhidas.

## Verificação

- `npm test`: ordem e identidade das aulas, primeira pendência, conclusões duplicadas/obsoletas, estudo fora de ordem e trilha completa; testes existentes de autenticação.
- `npm run lint`, `npm run typecheck`, `npm run build`.
- Atualização do básico: 16 testes automatizados cobrem as sete aulas, 35 imagens e sete arquivos PPTX, isolamento do histórico e validação das respostas novas e antigas. Revisão local em 1280 e 390 pixels: slides, ampliação, checklist, rascunho após recarregar, quiz incorreto/correto, conclusão simulada, automações e navegação da versão anterior. Fixture isolada em `.local/course-qa.*`, fora do deploy; nenhum exercício de usuário foi alterado.
- Revisão dos componentes reais em navegador, em 1366 e 390 pixels, com uma fixture local isolada: navegação, validação da prática, restauração de rascunho, separação por usuário, nova tentativa do quiz, falha/sucesso no salvamento e próximo dia. A ação de persistência foi simulada nessa verificação; nenhum exercício de usuário foi alterado.
