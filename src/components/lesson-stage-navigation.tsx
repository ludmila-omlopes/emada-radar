"use client";
import { useRef } from "react";
import { ChevronDown, List } from "lucide-react";
import type { getLessonStages } from "@/lib/lesson-stages";

type Props = { stages: ReturnType<typeof getLessonStages>; current: number; disabled: boolean; onSelect: (index: number) => void };

export function LessonStageNavigation({ stages, current, disabled, onSelect }: Props) {
  const disclosure = useRef<HTMLDetailsElement>(null);
  const trigger = useRef<HTMLElement>(null);
  return <details className="session-stage-menu" ref={disclosure} onKeyDown={event => {
    if (event.key === "Escape" && disclosure.current?.open) {
      event.preventDefault(); disclosure.current.open = false; trigger.current?.focus();
    }
  }}>
    <summary ref={trigger}><List size={18} aria-hidden="true"/><span>Etapas da aula</span><span className="stage-menu-position">{current + 1}/{stages.length}</span><ChevronDown size={16} className="stage-menu-chevron" aria-hidden="true"/></summary>
    <nav aria-label="Etapas desta aula">
      <p>Vá direto a qualquer etapa. Navegar não conclui a aula.</p>
      <ol>{stages.map((stage, index) => <li key={index}><button type="button" disabled={disabled} aria-current={index === current ? "step" : undefined} onClick={() => {
        if (disclosure.current) disclosure.current.open = false;
        onSelect(index);
      }}><span className="stage-menu-number">{index + 1}</span><span className="stage-menu-copy"><span>{stage.kind}{index === current ? " · Você está aqui" : ""}</span><strong>{stage.title}</strong></span></button></li>)}</ol>
    </nav>
  </details>;
}
