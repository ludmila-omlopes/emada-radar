import type { Lesson } from "./curriculum";

export function getLessonStages(lesson: Lesson) {
  return [
    ...lesson.sections.map(section => ({ title: section.title, kind: section.reading ? "Exploração" : lesson.presentation ? "Slide" : "Conceito" })),
    ...(!lesson.presentation ? [{ title: "Veja um exemplo", kind: "Exemplo" }] : []),
    { title: "Agora, pratique", kind: "Prática" },
    { title: "Confira o que aprendeu", kind: "Revisão" },
  ];
}
