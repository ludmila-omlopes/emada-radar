"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

// Entrance animations play on load. Sections that start below the fold are
// paused after hydration and resume when they scroll into view; without
// JavaScript everything simply renders in place.
export function Reveal({ children, className = "", as: Tag = "div", id, label }: { children: ReactNode; className?: string; as?: "div" | "section" | "aside"; id?: string; label?: string }) {
  const ref = useRef<HTMLElement>(null);
  const [waiting, setWaiting] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    if (node.getBoundingClientRect().top < window.innerHeight) return;
    setWaiting(true);
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setWaiting(false); observer.disconnect(); }
    }, { rootMargin: "0px 0px -12% 0px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return <Tag ref={ref as never} id={id} aria-label={label} className={`${className} ${waiting ? "reveal-wait" : ""}`.trim()}>{children}</Tag>;
}
