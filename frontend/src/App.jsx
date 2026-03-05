import { useMemo, useState } from "react";
import {
  Baby,
  BedDouble,
  Droplets,
  Eye,
  EyeOff,
  Milk,
  Salad,
  Syringe,
  Timer
} from "lucide-react";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";

const SECTION_DEFINITIONS = [
  {
    id: "diaper",
    name: "Diaper changes",
    icon: Droplets,
    tint: "bb-border-rose-500/35 bb-bg-gradient-to-br bb-from-rose-950/30 bb-to-slate-950/40",
    cards: ["Last Nappy Change", "Nappy Changes"]
  },
  {
    id: "feedings",
    name: "Feedings",
    icon: Milk,
    tint: "bb-border-sky-500/35 bb-bg-gradient-to-br bb-from-sky-950/30 bb-to-slate-950/40",
    cards: ["Last Feeding", "Last Feeding Method", "Recent Feedings", "Breastfeeding"]
  },
  {
    id: "pumpings",
    name: "Pumpings",
    icon: Syringe,
    tint: "bb-border-violet-500/35 bb-bg-gradient-to-br bb-from-violet-950/30 bb-to-slate-950/40",
    cards: ["Last Pumping"]
  },
  {
    id: "sleep",
    name: "Sleep",
    icon: BedDouble,
    tint: "bb-border-amber-500/35 bb-bg-gradient-to-br bb-from-amber-950/30 bb-to-slate-950/40",
    cards: ["Sleep Timeline", "Sleep Recommendations", "Last Sleep", "Sleep Timer"]
  },
  {
    id: "tummy",
    name: "Tummy Time",
    icon: Salad,
    tint: "bb-border-emerald-500/35 bb-bg-gradient-to-br bb-from-emerald-950/30 bb-to-slate-950/40",
    cards: ["Today's Tummy Time"]
  }
];

export function App({ bootstrap }) {
  const [hiddenSections, setHiddenSections] = useState(new Set());

  const userName = bootstrap?.userName || "User";

  const visibleSections = useMemo(
    () => SECTION_DEFINITIONS.filter((section) => !hiddenSections.has(section.id)),
    [hiddenSections]
  );

  const hiddenCount = hiddenSections.size;

  function toggleSection(sectionId) {
    setHiddenSections((previous) => {
      const next = new Set(previous);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }

  return (
    <main className="bb-space-y-4 bb-rounded-2xl bb-border bb-border-slate-700/50 bb-bg-slate-950/55 bb-p-4 bb-text-slate-100 md:bb-p-5">
      <header className="bb-flex bb-flex-wrap bb-items-center bb-justify-between bb-gap-3">
        <div>
          <p className="bb-m-0 bb-text-xs bb-uppercase bb-tracking-[0.18em] bb-text-slate-400">
            Shadcn Migration Preview
          </p>
          <h1 className="bb-m-0 bb-mt-1 bb-text-2xl bb-font-semibold">Dashboard Shell</h1>
        </div>

        <div className="bb-flex bb-items-center bb-gap-2">
          <Badge variant="accent">{visibleSections.length} sections visible</Badge>
          <Badge variant={hiddenCount ? "neutral" : "success"}>
            {hiddenCount ? `${hiddenCount} hidden` : "all visible"}
          </Badge>
          <Button asChild variant="secondary">
            <a href="/">
              <Baby size={15} className="bb-mr-2" />
              Back to Dashboard
            </a>
          </Button>
        </div>
      </header>

      <p className="bb-m-0 bb-text-sm bb-text-slate-300">Signed in as {userName}. This page is isolated for iterative UI migration to React/shadcn.</p>

      <section className="bb-space-y-3">
        {SECTION_DEFINITIONS.map((section) => {
          const isHidden = hiddenSections.has(section.id);
          const SectionIcon = section.icon;

          return (
            <Card key={section.id} className={`bb-overflow-hidden ${section.tint}`}>
              <CardHeader className="bb-justify-between bb-border-b bb-border-slate-700/50">
                <div className="bb-flex bb-items-center bb-gap-2">
                  <SectionIcon size={18} className="bb-text-slate-200" />
                  <CardTitle>{section.name}</CardTitle>
                </div>

                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label={isHidden ? `Show ${section.name}` : `Hide ${section.name}`}
                  onClick={() => toggleSection(section.id)}
                >
                  {isHidden ? <Eye size={16} /> : <EyeOff size={16} />}
                </Button>
              </CardHeader>

              {!isHidden ? (
                <CardContent>
                  <div className="bb-grid bb-gap-3 bb-pt-3 md:bb-grid-cols-2">
                    {section.cards.map((cardName) => (
                      <Card key={cardName} className="bb-border-slate-600/45 bb-bg-slate-900/55">
                        <CardHeader className="bb-pb-2">
                          <CardTitle className="bb-text-sm bb-font-semibold bb-text-slate-100">{cardName}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="bb-flex bb-items-center bb-justify-between bb-gap-2 bb-text-sm bb-text-slate-300">
                            <span>Component placeholder</span>
                            <Badge variant="neutral">WIP</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              ) : null}
            </Card>
          );
        })}
      </section>

      <footer className="bb-flex bb-items-center bb-gap-2 bb-text-xs bb-text-slate-400">
        <Timer size={14} />
        Next step: wire real BabyBuddy API data and replace placeholders with migrated cards.
      </footer>
    </main>
  );
}
