import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Provenance } from "@/lib/n7/types";

const PROVENANCE_META: Record<Provenance, { label: string; className: string }> = {
  "case-fact": { label: "Case fact", className: "bg-fact text-fact-foreground" },
  "user-entered": { label: "User entered", className: "bg-human text-human-foreground" },
  "generated-proposal": {
    label: "Proposal (not approved)",
    className: "bg-assumption text-assumption-foreground",
  },
  "template-helper": { label: "Template", className: "bg-secondary text-secondary-foreground" },
  "working-assumption": {
    label: "Needs review",
    className: "bg-assumption text-assumption-foreground",
  },
  illustrative: { label: "Needs review", className: "bg-demo text-demo-foreground" },
  "human-decision": { label: "User entered", className: "bg-human text-human-foreground" },
  "automated-signal": { label: "Automated signal", className: "bg-auto text-auto-foreground" },
};

/** Badges shown in the legend. Legacy values are still rendered on old records. */
const LEGEND_KEYS: Provenance[] = [
  "case-fact",
  "user-entered",
  "generated-proposal",
  "template-helper",
];

export function ProvenanceTag({
  value,
  className,
  short,
}: {
  value: Provenance;
  className?: string;
  short?: boolean;
}) {
  const meta = PROVENANCE_META[value];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        meta.className,
        className,
      )}
    >
      {short ? meta.label.split(" ")[0] : meta.label}
    </span>
  );
}

export function ProvenanceLegend({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="label-caps">Provenance</span>
      {LEGEND_KEYS.map((p) => (
        <ProvenanceTag key={p} value={p} />
      ))}
    </div>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
      <div className="max-w-3xl">
        {eyebrow ? <div className="label-caps mb-1">{eyebrow}</div> : null}
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        {description ? (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Panel({
  title,
  subtitle,
  right,
  children,
  className,
}: {
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("panel p-5", className)}>
      {title ? (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-foreground">{title}</h2>
            {subtitle ? (
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
          {right}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export function MetricCard({
  label,
  value,
  note,
  tone = "default",
  provenance,
}: {
  label: string;
  value: string;
  note?: string;
  tone?: "default" | "warning" | "critical" | "success";
  provenance?: Provenance;
}) {
  const toneClass = {
    default: "text-foreground",
    warning: "text-warning",
    critical: "text-critical",
    success: "text-success",
  }[tone];
  return (
    <div className="panel p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="label-caps">{label}</div>
        {provenance ? <ProvenanceTag value={provenance} short /> : null}
      </div>
      <div className={cn("mt-2 text-xl font-semibold tracking-tight", toneClass)}>{value}</div>
      {note ? <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{note}</p> : null}
    </div>
  );
}

export function Callout({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "warning" | "critical" | "success";
  title?: string;
  children: ReactNode;
}) {
  const map = {
    info: "border-l-primary bg-secondary/60",
    warning: "border-l-warning bg-assumption/40",
    critical: "border-l-critical bg-destructive/10",
    success: "border-l-success bg-human/30",
  }[tone];
  return (
    <div className={cn("rounded-md border border-border border-l-4 p-4", map)}>
      {title ? <div className="mb-1 text-sm font-semibold text-foreground">{title}</div> : null}
      <div className="text-sm leading-relaxed text-foreground/90">{children}</div>
    </div>
  );
}

export function KeyQuote({ children }: { children: ReactNode }) {
  return (
    <blockquote className="panel border-l-4 border-l-primary p-5 text-base leading-relaxed font-medium text-foreground">
      {children}
    </blockquote>
  );
}

export function StatusPill({
  status,
}: {
  status: string;
}) {
  const tone =
    /blocked|critical|at-risk|fail|open/i.test(status)
      ? "bg-destructive/15 text-critical"
      : /done|ready|pass|closed|on-track/i.test(status)
        ? "bg-human/60 text-human-foreground"
        : /progress|watch|triage|monitoring/i.test(status)
          ? "bg-assumption/70 text-assumption-foreground"
          : "bg-secondary text-secondary-foreground";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize",
        tone,
      )}
    >
      {status.replace(/-/g, " ")}
    </span>
  );
}

export function DemoDataNote({ children }: { children?: ReactNode }) {
  return (
    <p className="mt-3 text-xs text-muted-foreground">
      {children ?? "Values shown come from this workspace. Nothing here is pre-filled sample data."}
    </p>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="panel grid-bg flex flex-col items-center justify-center gap-2 p-10 text-center">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="max-w-md text-xs leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}