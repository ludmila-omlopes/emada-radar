import Image from "next/image";
export function ModuleArt({ type }: { type: "fundamentos" | "automacoes" }) {
  return <div className={`module-art ${type}`}><Image src={`/images/${type}.webp`} alt="" fill sizes="(max-width: 767px) 100vw, (max-width: 1100px) 45vw, 540px" /></div>;
}
