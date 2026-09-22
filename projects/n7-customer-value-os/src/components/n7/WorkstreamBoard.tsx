import { useMemo } from "react";
import { Panel, ProvenanceTag, StatusPill } from "@/components/n7/primitives";
import { computeQuickWins } from "@/lib/n7/meeting";
import type { CustomerWorkspace, Milestone } from "@/lib/n7/types";
import { cn } from "@/lib/utils";

type Lane = "now" | "next" | "later";

const LANES: { key: Lane; label: string; note: string }[] = [
  { key: "now", label: "Now", note: "In flight or blocked this week" },
  { key: "next", label: "Next", note: "Ready to start once its prerequisite clears" },
  { key: "later", label: "Later", note: "Sequenced behind the critical path" },
];

function laneOf(m: Milestone): Lane {
  if (m.status === "in-progress" || m.status === "blocked") return "now";
  if (m.status === "done") return "now";
  return m.track === "critical-path" ? "later" : "next";
}

const TRACK_LABEL: Record<Milestone["track"], string> = {
  "critical-path": "Critical path",
  parallel: "Parallel",
  governance: "Governance",
  hypercare: "Hypercare",
};

/**
 * Compact now / next / later board. It classifies each milestone by track and
 * status so critical-path, parallelisable, blocked and pull-forward work are
 * visually distinct, and shows the downstream effect of anything blocked.
 */
export function WorkstreamBoard({ ws }: { ws: CustomerWorkspace }) {
  const lanes = useMemo(() => {
    const out: Record<Lane, Milestone[]> = { now: [], next: [], later: [] };
    for (const m of ws.milestones) out[laneOf(m)].push(m);
    return out;
  }, [ws.milestones]);

  const blocked = ws.milestones.filter((m) => m.status === "blocked");
  const criticalBlocked = blocked.filter((m) => m.track === "critical-path");
  const stillMoving = ws.milestones.filter(
    (m) => m.track !== "critical-path" && m.status !== "done",
  );
  const quickWins = useMemo(() => computeQuickWins(ws), [ws]);

  if (!ws.milestones.length) {
    return (
      <Panel title="Workstream board">
        <p className="text-sm text-muted-foreground">
          No milestones captured for this customer yet. Add them in the implementation plan and this
          board will classify critical-path, parallel and pull-forward work automatically.
        </p>
      </Panel>
    );
  }

  return (
    <Panel
      title="Workstream board — now / next / later"
      subtitle="Critical-path work is sequenced; parallel work is not. W10 stays a planning boundary, not a promise."
      right={<ProvenanceTag value="automated-signal" short />}
    >
      <div className="grid gap-4 lg:grid-cols-3">
        {LANES.map((lane) => (
          <div key={lane.key} className="rounded-lg border border-border bg-secondary/30 p-3">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold text-foreground">{lane.label}</span>
              <span className="text-[11px] text-muted-foreground">{lanes[lane.key].length}</span>
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{lane.note}</p>
            <ul className="mt-3 space-y-2">
              {lanes[lane.key].length ? (
                lanes[lane.key].map((m) => (
                  <li
                    key={m.id}
                    className={cn(
                      "rounded-md border bg-card p-2.5 transition-colors",
                      m.track === "critical-path"
                        ? "border-l-4 border-l-critical border-border"
                        : "border-border",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-medium leading-snug text-foreground">
                        {m.title}
                      </span>
                      <StatusPill status={m.status} />
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      <span>{m.week}</span>
                      <span>{TRACK_LABEL[m.track]}</span>
                      <span>{m.owner}</span>
                    </div>
                  </li>
                ))
              ) : (
                <li className="rounded-md border border-dashed border-border p-3 text-[11px] text-muted-foreground">
                  Nothing in this lane.
                </li>
              )}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-md border border-border border-l-4 border-l-warning p-3">
          <div className="label-caps">Downstream impact</div>
          {criticalBlocked.length ? (
            <p className="mt-1 text-xs leading-relaxed text-foreground/90">
              {criticalBlocked.length} critical-path item
              {criticalBlocked.length === 1 ? " is" : "s are"} blocked
              {" — "}
              {criticalBlocked.map((m) => m.title).join("; ")}. Everything sequenced behind it moves
              with it. {stillMoving.length} non-dependent item
              {stillMoving.length === 1 ? "" : "s"} can still proceed in parallel.
            </p>
          ) : (
            <p className="mt-1 text-xs leading-relaxed text-foreground/90">
              No critical-path item is blocked right now. {stillMoving.length} parallel item
              {stillMoving.length === 1 ? "" : "s"} remain open and can absorb capacity.
            </p>
          )}
        </div>
        <div className="rounded-md border border-border p-3">
          <div className="label-caps">Pull-forward candidates</div>
          {quickWins.length ? (
            <ul className="mt-1 space-y-1 text-xs text-foreground/90">
              {quickWins.slice(0, 4).map((q) => (
                <li key={q.id}>
                  • {q.title}{" "}
                  <span className="text-muted-foreground">
                    ({q.effort} effort · {q.owner})
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              Nothing safe to pull forward — the plan is already as compressed as the dependencies
              allow.
            </p>
          )}
          <p className="mt-2 text-[11px] text-muted-foreground">
            Deterministic recommendations. Pulling an item into the plan is a human decision, taken
            from the meeting brief.
          </p>
        </div>
      </div>
    </Panel>
  );
}