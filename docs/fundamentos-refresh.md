# Fundamentos · revisão editorial e visual

Sete aulas, com os mesmos slugs e cinco etapas de conteúdo por aula. Prática e revisão continuam nas posições existentes. Nenhuma mudança no orçamento, no provedor, nas regras de conclusão ou no armazenamento de progresso.

O conteúdo ativo está em `src/lib/foundation-content.ts`. Cada etapa contém uma abertura, dois parágrafos de desenvolvimento, um diagrama HTML acessível, um exemplo comentado, uma reflexão revelável e uma ideia de fechamento. Os exemplos são fictícios. As estimativas de duração passaram a considerar a leitura ampliada e a prática.

As apresentações-resumo v3 são editáveis e incluem os exemplos de trabalho nas notas do apresentador. Os sete arquivos v2 foram importados e atualizados, preservando dimensões, fontes, objetos e versões anteriores. As páginas oferecem somente os slides da versão atual. O JSON anterior foi preservado como fonte histórica, sem importação pelo currículo ativo.

## Exemplos de trabalho

As 35 etapas usam situações de criadores de conteúdo, editores ou pequenos negócios. O projeto principal acompanha um roteiro de até 30 segundos para uma papelaria fictícia, com três tomadas disponíveis e sem locução. Outros casos incluem aberturas de vídeo, descrição de produto, perguntas de briefing, conferência aritmética de um anúncio e exploração de uma série de bastidores.

Os pedidos copiáveis, as sete práticas e os quizzes relacionados também foram adaptados. Nenhuma atividade exige enviar dados reais de clientes, publicar conteúdo ou executar uma ação externa. O chat recebe descrições em texto e não assiste nem edita os vídeos. O teste adicional verifica a coerência dos exemplos, o tamanho dos prompts e a compatibilidade das regras de conclusão.

## Ilustrações

Geradas com a ferramenta de imagem integrada, não com a API do OpenRouter. Os originais foram preservados na pasta de imagens geradas. As cópias do site estão em `public/aulas/basico/ilustracoes/`, em WebP de 1200 × 800, qualidade 85. Os diagramas são HTML/CSS com texto real e não dependem dessas imagens para explicar o conteúdo.

### curiosidade-v1.webp

Prompt: Create a wide editorial illustration for Emada Academy, an inspiring introductory AI course for adults. No text, letters, numbers, logos or robots. Landscape 3:2. A person at a small desk opens a notebook; loose cream paper shapes unfurl into a winding path toward an open pink doorway, evoking starting with a small personal question. Sophisticated cut-paper collage with subtly grainy hand-painted texture, warm off-white, dusty blush pink, plum and charcoal, matte colors, dark charcoal backdrop. Human, curious, calm, tactile, restrained, thoughtful adult learning publication. Clear composition at small screen sizes, no interface mockup, no decorative tech circuitry. Deliver an illustration asset.

### projeto-v1.webp (histórica, não utilizada nas aulas atuais)

Prompt: Create a landscape 3:2 editorial illustration for an adult beginner AI course, Emada Academy. No text, letters, numbers, logos, robots or interface. A human pair of hands rearranges three paper versions of a simple dinner plan on a desk, illustrated ingredients and a small analogue kitchen timer; the final arrangement is simpler and more intentional. Visual metaphor for making, reviewing and improving a small personal project. Sophisticated cut-paper collage with subtly grainy hand-painted texture, warm cream, dusty blush pink, muted sage, plum and charcoal, matte palette, dark charcoal backdrop. Calm tactile adult education publication, coherent intentional negative space, clear readable shapes, no tech circuitry. Actual illustration asset, not a website mockup.

### pratica-v1.webp

Prompt: Create a landscape 3:2 editorial illustration for Emada Academy's adult introductory AI course. No text, letters, numbers, logos, robots or interface. A person's hand tends a small growing plant beside an open notebook and a cup, morning light on an ordinary desk. Five loose paper bookmarks form a gentle rhythm across the scene. Metaphor for a small sustainable learning practice, not miraculous growth. Sophisticated tactile cut-paper collage, subtly grainy hand-painted texture, warm cream, dusty blush pink, muted sage, plum and charcoal, matte colors, charcoal background. Inspiring but quiet and grounded adult education publication, distinct well-balanced composition, clear shapes at mobile size. Deliver illustration asset, no website mockup, no tech circuitry.

### projeto-trabalho-v2.webp

Arquivo atual: `public/aulas/basico/ilustracoes/projeto-trabalho-v2.webp`. Gerado pela ferramenta integrada de imagens, usando `projeto-v1.webp` somente como referência de estilo. Original preservado em `C:/Users/ludmi/.codex/generated_images/01a08c51-b274-7192-8a8d-c5f4dc51c5ad/exec-84e268ad-0339-41d2-adc5-5d4ff436a46a.png`. A ilustração representa o processo de storyboard, não uma ficha técnica do produto fictício.

Prompt: Use case: illustration-story. Asset: landscape 3:2 editorial illustration for an introductory AI course aimed at creators, video editors and small businesses. Image 1 is a STYLE REFERENCE ONLY: preserve its tactile torn-paper collage, handmade print texture, charcoal background, warm ivory paper, dusty pink and sage palette. Create a NEW work scene: overhead view of a video editor's desk, two natural hands arranging three storyboard sheets for a fictional stationery shop's short product video. Sheets depict a notebook cover, hand opening notebook, notebook displayed upright. At top edge a partially visible laptop with simple muted timeline blocks, at one side compact camera and pencil. No cooking, food, ingredients or kitchen tools. Composition focused on the three storyboard sheets and thoughtful selection; comfortable uncluttered space, premium warm editorial feel. No readable words, logos, watermark or robot imagery. Output a standalone landscape illustration, not website UI.

## Validação

Testes de conteúdo, renderização das 35 etapas, navegação e regras de progresso. Os testes existentes do chat continuam cobrindo cotas, isolamento, concorrência e orçamento. A validação visual usa uma fixture local com chat simulado e não consome créditos do OpenRouter.
