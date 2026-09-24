export type LearningDiagram = {
  title: string;
  kind: "flow" | "compare" | "cycle" | "filter" | "timeline";
  nodes: { title: string; text: string }[];
  caption: string;
};

export type FoundationReading = {
  paragraphs: string[];
  diagram: LearningDiagram;
  example: { title: string; situation: string; response: string; commentary: string };
  reflection: { question: string; answer: string };
  takeaway: string;
  illustration?: { src: string; alt: string; caption: string };
};

export type FoundationPage = {
  title: string;
  body: string;
  prompt?: string;
  reading: FoundationReading;
};

export type FoundationLesson = {
  id: number; title: string; goal: string; minutes: number;
  sections: FoundationPage[];
};
