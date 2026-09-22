import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AppHeader } from "@/components/n7/AppHeader";
import { Button } from "@/components/ui/button";
import { SECTIONS, SECTION_GROUPS } from "@/lib/n7/sections";
import { useN7 } from "@/lib/n7/store";
import type { CustomerWorkspace } from "@/lib/n7/types";
import { cn } from "@/lib/utils";

const TOUR = [
  "Executive Summary carries the position: thesis, situation, four moves, principles.",
  "Critical Path shows the SAP dependency and the three recovery options with guardrails.",
  "KPI Contract and ROI Workshop make the 50% outcome defensible before launch.",
  "Accuracy Triage walks eight fault domains before anyone blames the model.",
  "Panel Defense gives 30-second answers with the evidence to open if pressed.",
];

function GuidedTour() {
  const { tourSeen, setTourSeen } = useN7();
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!tourSeen) setVisible(true);
  }, [tourSeen]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 w-[340px] rounded-lg border border-border bg-card p-4 shadow-panel">
      <div className="label-caps">
        Guided tour · {step + 1} of {TOUR.length}
      </div>
      <p className="mt-1 text-sm leading-relaxed text-foreground/90">{TOUR[step]}</p>
      <div className="mt-3 flex justify-between gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setTourSeen(true);
            setVisible(false);
          }}
        >
          Skip
        </Button>
        <Button
          size="sm"
          onClick={() => {
            if (step === TOUR.length - 1) {
              setTourSeen(true);
              setVisible(false);
            } else setStep((s) => s + 1);
          }}
        >
          {step === TOUR.length - 1 ? "Done" : "Next"}
        </Button>
      </div>
    </div>
  );
}

export function WorkspaceShell({
  ws,
  activeSection,
  children,
}: {
  ws: CustomerWorkspace;
  activeSection: string;
  children: React.ReactNode;
}) {
  const { presentationMode, setPresentationMode, activeOverrides } = useN7();
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {presentationMode ? null : (
        <AppHeader
          right={
            <div className="flex items-center gap-2">
              <Button asChild size="sm" variant="outline">
                <Link to="/present/$customerId" params={{ customerId: ws.customer.id }}>
                  Presentation mode
                </Link>
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setPresentationMode(true)}>
                Hide chrome
              </Button>
            </div>
          }
        />
      )}

      {presentationMode ? (
        <div className="flex items-center justify-between border-b border-border px-5 py-2 text-xs text-muted-foreground">
          <span>Presentation mode — editing chrome hidden</span>
          <Button size="sm" variant="ghost" onClick={() => setPresentationMode(false)}>
            Exit presentation mode
          </Button>
        </div>
      ) : null}

      <div className="mx-auto flex max-w-[1500px] gap-6 px-4 py-6 lg:px-5">
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="sticky top-20 space-y-4">
            <div className="panel p-3">
              <div className="label-caps">Customer</div>
              <div className="mt-1 text-sm font-semibold leading-tight text-foreground">
                {ws.customer.name}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{ws.customer.industry}</div>
              {activeOverrides.length ? (
                <div className="mt-2 rounded bg-assumption px-2 py-1 text-[10px] font-semibold uppercase text-assumption-foreground">
                  {activeOverrides.length} scenario override(s) active
                </div>
              ) : null}
            </div>
            <nav aria-label="Workspace sections" className="space-y-4">
              {SECTION_GROUPS.map((group) => (
                <div key={group}>
                  <div className="label-caps px-2">{group}</div>
                  <ul className="mt-1 space-y-0.5">
                    {SECTIONS.filter((s) => s.group === group).map((s) => (
                      <li key={s.slug}>
                        <Link
                          to="/customers/$customerId/$section"
                          params={{ customerId: ws.customer.id, section: s.slug }}
                          className={cn(
                            "block rounded-md px-2 py-1.5 text-sm transition-colors",
                            activeSection === s.slug
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                          )}
                        >
                          {s.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-4 lg:hidden">
            <Button size="sm" variant="outline" onClick={() => setNavOpen((o) => !o)}>
              {navOpen ? "Hide sections" : "Browse sections"}
            </Button>
            {navOpen ? (
              <nav aria-label="Workspace sections" className="mt-2 grid grid-cols-2 gap-1.5">
                {SECTIONS.map((s) => (
                  <Link
                    key={s.slug}
                    to="/customers/$customerId/$section"
                    params={{ customerId: ws.customer.id, section: s.slug }}
                    onClick={() => setNavOpen(false)}
                    className={cn(
                      "rounded-md border border-border px-2 py-1.5 text-xs",
                      activeSection === s.slug ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                    )}
                  >
                    {s.label}
                  </Link>
                ))}
              </nav>
            ) : null}
          </div>
          {children}
        </div>
      </div>

      {presentationMode ? null : <GuidedTour />}
    </div>
  );
}