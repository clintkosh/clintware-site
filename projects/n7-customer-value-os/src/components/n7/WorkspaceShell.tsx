import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AppHeader } from "@/components/n7/AppHeader";
import { MeetingBriefDialog } from "@/components/n7/MeetingBrief";

import { Button } from "@/components/ui/button";
import { SECTIONS, SECTION_GROUPS } from "@/lib/n7/sections";
import { useN7 } from "@/lib/n7/store";
import type { CustomerWorkspace } from "@/lib/n7/types";
import { cn } from "@/lib/utils";

const TOUR_BY_SECTION: Record<string, string> = {
  "executive-summary": "Review the customer outcome, current stage, blockers, risks, and operating priorities.",
  implementation: "Track current milestones, owners, dependencies, confidence, and parallel work.",
  "critical-path": "Review the SAP dependency, planning boundary, and evidence required for each recovery option.",
  environment: "Map systems and flows, maintain approved source context, and review topology proposals.",
  documents: "Maintain approved knowledge sources, owners, freshness, and system relevance.",
  "assumption-change": "Use temporary scenario overlays to test plan impacts without changing the live plan.",
};

function GuidedTour({ activeSection, onClose }: { activeSection: string; onClose: () => void }) {
  const section = SECTIONS.find((item) => item.slug === activeSection);
  return (
    <div className="fixed inset-x-3 top-20 z-40 rounded-lg border border-border bg-card p-4 shadow-panel sm:inset-x-auto sm:right-4 sm:w-[340px]">
      <div className="label-caps">Workspace tour · {section?.label ?? "Current section"}</div>
      <p className="mt-1 text-sm leading-relaxed text-foreground/90">
        {TOUR_BY_SECTION[activeSection] ?? section?.blurb ?? "Use this section to keep the customer plan current and evidence-backed."}
      </p>
      <Button className="mt-3" size="sm" onClick={onClose}>Done</Button>
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
  const { activeOverrides, clearOverrides } = useN7();
  const [navOpen, setNavOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const inScenarioPlanning = activeSection === "assumption-change";

  useEffect(() => {
    if (!inScenarioPlanning && activeOverrides.length) clearOverrides();
  }, [activeOverrides.length, clearOverrides, inScenarioPlanning]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        customerName={ws.customer.name}
        onOpenTour={() => setTourOpen(true)}
        right={
          <Button asChild size="sm" variant="ghost">
            <Link to="/present/$customerId" params={{ customerId: ws.customer.id }}>
              Presentation mode
            </Link>
          </Button>
        }
      />

      <div className="mx-auto max-w-[1500px] px-4 pt-4 lg:px-5">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/" className="rounded hover:text-foreground hover:underline">
            Portfolio
          </Link>
          <span aria-hidden>/</span>
          <Link
            to="/customers/$customerId/$section"
            params={{ customerId: ws.customer.id, section: "executive-summary" }}
            className="rounded hover:text-foreground hover:underline"
          >
            {ws.customer.name}
          </Link>
          <span aria-hidden>/</span>
          <span className="font-medium text-foreground">
            {SECTIONS.find((s) => s.slug === activeSection)?.label ?? activeSection}
          </span>
        </nav>
      </div>

      <div className="mx-auto flex max-w-[1500px] gap-6 px-4 py-6 lg:px-5">
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="sticky top-20 space-y-4">

            <div className="panel p-3">
              <div className="label-caps">Customer</div>
              <div className="mt-1 text-sm font-semibold leading-tight text-foreground">
                {ws.customer.name}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{ws.customer.industry}</div>
              {inScenarioPlanning ? (
                <div className="mt-2 rounded bg-assumption px-2 py-1 text-[10px] font-semibold uppercase text-assumption-foreground">
                  Scenario mode
                </div>
              ) : null}
            </div>
            <div className="print:hidden">
              <MeetingBriefDialog ws={ws} />
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

      {tourOpen ? <GuidedTour activeSection={activeSection} onClose={() => setTourOpen(false)} /> : null}
    </div>
  );
}