# Navegação livre dentro da aula

O controle “Etapas da aula”, abaixo da barra de posição, permite abrir qualquer etapa de um dia. Os títulos vêm do conteúdo da própria aula. Slides/conceitos, exemplo quando houver, prática e revisão permanecem na ordem original; a etapa atual usa `aria-current="step"`.

Abrir uma etapa não conclui a aula. Registro, checklist e resposta correta continuam obrigatórios para salvar a conclusão; a validação no servidor não mudou. A revisão antecipada explica a pendência e oferece “Completar a prática”. A sequência Voltar/Continuar também ficou livre.

O menu recolhe após a escolha e move o foco para o título do conteúdo. Escape recolhe e devolve o foco ao controle. Uma coluna no celular, duas no desktop. Trocar etapas preserva registro, checklist, escolha do quiz e rascunho de chat. A retomada da revisão não depende mais de ter terminado a prática.

Validação em 11/09/2026: 34 testes, lint e build passaram. A lista foi testada para as 15 aulas e as versões arquivadas. Na fixture isolada: primeiro slide → revisão sem prática; conclusão permanece desabilitada mesmo com quiz correto; reload mantém revisão; prática → slide → prática preserva registro; Escape devolve foco; layout de 390px sem overflow; aula de automação inclui o exemplo. Nenhuma mensagem paga ou conclusão de aluno foi criada nos testes.
