import { foundationContent as content } from "./foundation-content";
import type { CourseModule, Lesson } from "./curriculum";

// Foundation lessons retain stable identifiers and completion requirements.
// New identifiers deliberately do not reuse completion records from the previous basics.
const activities: Pick<Lesson, "slug" | "minutes" | "steps" | "task" | "placeholder" | "quiz">[] = [
  {
    slug: "primeiro-passo-com-ia", minutes: 8,
    steps: ["Escolha uma tarefa de trabalho de baixo risco: uma abertura de vídeo, uma dúvida de briefing ou uma descrição de produto.", "Faça uma primeira troca com a IA usando um cliente, canal ou negócio fictício.", "Anote o que você gostaria de investigar nas próximas aulas."],
    task: "Complete ‘Eu gostaria de ter ajuda no trabalho para…’ e registre o que você vai conferir para saber se a IA ajudou.",
    placeholder: "Minha tarefa de trabalho:… Contexto fictício:… Na primeira conversa… Vou conferir se…",
    quiz: { question: "Qual é o seu papel depois de receber uma resposta da IA?", options: ["Aceitar se o texto parecer convincente.", "Avaliar se faz sentido, está correto e serve para a situação.", "Repetir o pedido até receber uma resposta longa."], answer: 1, explanation: "A IA propõe; você avalia. Uma resposta fluente pode conter erros ou não servir para o seu contexto." },
  },
  {
    slug: "qual-e-a-sua-pergunta", minutes: 8,
    steps: ["Liste dez possibilidades no seu trabalho com conteúdo, edição ou um pequeno negócio; se travar, comece com três.", "Escolha uma tarefa pequena e de baixo risco que importe para você.", "Defina como reconhecer uma resposta útil para essa tarefa."],
    task: "Registre suas possibilidades, a pergunta escolhida e por que ela é simples de avaliar.",
    placeholder: "Será que a IA poderia me ajudar a… Minhas possibilidades:… Escolhi… Vou avaliar por…",
    quiz: { question: "Qual é uma boa primeira pergunta para aprender?", options: ["Uma tarefa pequena que me interessa e cujo resultado consigo avaliar.", "A aplicação mais impressionante que vi outra pessoa usar.", "Uma decisão importante que quero delegar sem revisar."], answer: 0, explanation: "Interesse pessoal, escopo pequeno e um critério de avaliação tornam o experimento mais útil. A possibilidade de ajuda é uma hipótese, não uma garantia." },
  },
  {
    slug: "primeiro-projeto-pessoal", minutes: 13,
    steps: ["Peça uma entrega pequena: um roteiro de até 30 segundos, uma descrição de produto ou uma mensagem a um cliente fictício.", "Aponte um problema específico na primeira resposta e peça uma revisão.", "Compare as versões e confira se a revisão respeitou suas condições."],
    task: "Guarde seu pedido, um trecho da primeira resposta e a revisão. Explique o que aprovou ou o que ainda faltou.",
    placeholder: "Meu projeto:… Pedido:… Primeira resposta:… Pedi para mudar… Revisão:… Minha avaliação:…",
    quiz: { question: "O roteiro sugerido exige uma gravação que não cabe no prazo de edição. Como continuar?", options: ["Pedir apenas ‘melhore’.", "Aceitar porque a resposta parece organizada.", "Explicar o prazo e as tomadas disponíveis, pedir uma alternativa e conferir a revisão."], answer: 2, explanation: "Feedback específico orienta a próxima versão. Você ainda precisa verificar se a IA respeitou o material disponível e testar a montagem no editor." },
  },
  {
    slug: "experimentar-e-avaliar", minutes: 18,
    steps: ["Escolha uma tarefa de trabalho e seu critério: conferir o preço de um anúncio fictício ou a fidelidade de uma descrição ao briefing.", "Faça até três tentativas: pedido inicial, mais contexto e revisão dirigida.", "Compare as respostas, verifique um ponto importante e registre os limites do teste."],
    task: "Registre seu critério, as três tentativas e o que melhorou ou falhou. Indique o que você conferiu fora da resposta da IA.",
    placeholder: "Critério:… Tentativa 1:… Tentativa 2:… Tentativa 3:… Conferi… Meu próximo passo:…",
    quiz: { question: "O que permite comparar as tentativas de forma útil?", options: ["Escolher sempre a resposta mais longa.", "Usar um critério definido antes e verificar os pontos importantes.", "Considerar correta a resposta que a própria IA aprovou."], answer: 1, explanation: "O critério conecta o teste à sua necessidade. A revisão pela própria IA não substitui a verificação de fatos ou cálculos." },
  },
  {
    slug: "pensando-em-voz-alta", minutes: 13,
    steps: ["Explore uma ideia de conteúdo, serviço ou campanha fictícia por dois ou três minutos, com escrita livre ou ditado revisado.", "Revise o texto e corrija o resumo para preservar sua intenção e as decisões ainda pendentes.", "Escolha um próximo passo pequeno e avalie se essa forma de interação ajudou."],
    task: "Registre um resumo da ideia, uma correção necessária e a ação escolhida. Não precisa compartilhar a gravação.",
    placeholder: "Minha ideia:… Usei voz, ditado ou escrita porque… O resumo precisava corrigir… Próximo passo:…",
    quiz: { question: "A data de publicação de uma série ainda está em aberto, mas o resumo diz que ela está definida. O que fazer?", options: ["Corrigir essa interpretação antes de pedir um plano.", "Manter a decisão porque o resumo ficou mais organizado.", "Usar apenas voz, pois o ditado nunca funciona."], answer: 0, explanation: "Organizar uma fala não autoriza transformar possibilidades em compromissos de publicação. Preserve sua intenção, seja falando ou escrevendo." },
  },
  {
    slug: "o-desconforto-de-comecar", minutes: 8,
    steps: ["Identifique uma barreira: tempo, acesso, insegurança, privacidade ou outra.", "Escolha um teste curto com um serviço ou cliente fictício, sem obrigação de publicar ou enviar o resultado.", "Compare a expectativa com o resultado sem exigir confiança imediata."],
    task: "Descreva a barreira e seu teste, sem detalhes pessoais. Você pode usar um exemplo fictício e registrar apenas o aprendizado.",
    placeholder: "Barreira no meu exemplo:… Teste possível:… Expectativa:… Resultado:… O que aprendi:…",
    quiz: { question: "Uma pessoa não está usando IA. O que podemos concluir?", options: ["Ela necessariamente tem medo.", "Ela está atrasada e precisa começar imediatamente.", "É preciso entender a barreira; medo é apenas uma possibilidade."], answer: 2, explanation: "Tempo, acesso, interesse e preocupações legítimas também influenciam. Entender a barreira permite adaptar o teste sem transformar a escolha da pessoa em um defeito ou uma obrigação." },
  },
  {
    slug: "uma-pratica-na-rotina", minutes: 13,
    steps: ["Escolha uma tarefa recorrente de conteúdo, edição ou atendimento e reúna contexto, pedido, revisão e critério de aprovação.", "Inclua um resultado fictício que você revisou e explique o que precisou conferir.", "Planeje cinco testes de até dez minutos e escolha quando fará o primeiro."],
    task: "Entregue seu fluxo, um exemplo revisado e o plano dos cinco dias. Você conclui a aula com esse plano; os testes continuam depois.",
    placeholder: "Tarefa:… Contexto:… Pedido:… Revisão:… Critério:… Exemplo e conferência:… Dias 1 a 5:… Primeiro teste em:…",
    quiz: { question: "O que o teste de cinco dias deve ajudar a decidir?", options: ["Se um hábito completo foi garantido em cinco dias.", "Se o uso ajudou, exigiu revisão demais ou precisa ser ajustado ou abandonado.", "Quantas ferramentas novas devo instalar."], answer: 1, explanation: "O prazo serve para avaliar uma rotina, não para prometer domínio ou um hábito formado. Manter, simplificar ou deixar esse uso de lado são resultados válidos." },
  },
];

export const basicModule: CourseModule = {
  slug: "fundamentos", number: "01", title: "Seu primeiro passo com IA.",
  subtitle: "Uma pergunta sua. Um projeto. Uma prática.",
  description: "Sua curiosidade é o ponto de partida. Explore conceitos com diagramas e situações de criadores de conteúdo, editores e pequenos negócios. Transforme uma tarefa do trabalho em um projeto que você sabe avaliar, no seu ritmo.",
  level: "Básico", tags: ["Primeira conversa", "Projeto pessoal", "Prática"],
  lessons: content.map((lesson, index): Lesson => ({
    ...activities[index], minutes: lesson.minutes, title: lesson.title, intro: lesson.goal, sections: lesson.sections,
    presentation: { download: `/aulas/basico/aula-${String(lesson.id).padStart(2, "0")}-fundamentos-v3.pptx`, attribution: "Emada Academy · Apresentação-resumo com notas para acompanhar a explicação. Explore também os exemplos, diagramas e reflexões na aula." },
    example: { after: lesson.sections.find(section => section.prompt)?.prompt ?? lesson.goal, caption: "Adapte ao seu trabalho usando um cliente, canal ou negócio fictício." },
    sources: [],
  })),
};
