import { Lab } from "@/components/lab";
import { requireSession } from "@/lib/session";
export const metadata = { title: "Laboratório" };
export default async function LabPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireSession("/laboratorio");
  const { tab } = await searchParams;
  return <div className="page-container"><div className="page-heading"><h1>Ideias em teste.</h1><p>Monte um prompt ou desenhe um fluxo. Prepare suas instruções e leve o experimento para a ferramenta que preferir.</p></div><Lab initialTab={tab === "fluxos" ? "fluxos" : "prompts"}/></div>;
}
