import { BedDouble, Milk, Timer } from "lucide-react";
import { Button } from "./components/ui/button";

export function App() {
  const cards = [
    { title: "Sleep timeline", icon: BedDouble, text: "24h chart placeholder" },
    { title: "Recent feedings", icon: Milk, text: "section/card mapping placeholder" },
    { title: "Sleep quick timer", icon: Timer, text: "start/stop interaction placeholder" }
  ];

  return (
    <main className="min-h-screen bg-background p-6 text-slate-100">
      <section className="mx-auto max-w-6xl space-y-4">
        <header className="rounded-xl border border-slate-600/40 bg-slate-900/60 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Shadcn migration</p>
          <h1 className="mt-1 text-3xl font-semibold">Dashboard Preview</h1>
          <div className="mt-4">
            <Button>Primary Action</Button>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map(({ title, icon: Icon, text }) => (
            <article key={title} className="rounded-xl border border-sky-500/30 bg-card p-4">
              <div className="mb-3 flex items-center gap-2 text-accent">
                <Icon size={18} />
                <h2 className="text-base font-semibold text-slate-100">{title}</h2>
              </div>
              <p className="text-sm text-muted">{text}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
