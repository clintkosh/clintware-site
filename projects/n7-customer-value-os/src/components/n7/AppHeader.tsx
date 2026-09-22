import { Link } from "@tanstack/react-router";
import { ORG } from "@/lib/n7/seed";
import { useN7 } from "@/lib/n7/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PrototypeBadge({ className }: { className?: string }) {
  return (
    <span
      title="This is a candidate-built concept prototype for a Neuron7 Customer Success case study. It is not an official Neuron7 product."
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-1 text-[10px] font-semibold tracking-wider uppercase text-muted-foreground",
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-warning" />
      Candidate Concept Prototype
    </span>
  );
}

export function AppHeader({ right }: { right?: React.ReactNode }) {
  const { audience, setAudience } = useN7();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      <div className="flex flex-wrap items-center gap-4 px-5 py-3">
        <Link to="/" className="flex items-center gap-3">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
            N7
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-semibold text-foreground">{ORG.productTitle}</span>
            <span className="block text-[11px] text-muted-foreground">{ORG.subtitle}</span>
          </span>
        </Link>
        <PrototypeBadge />
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border border-border p-0.5">
            {(["executive", "technical"] as const).map((a) => (
              <button
                key={a}
                onClick={() => setAudience(a)}
                className={cn(
                  "rounded px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                  audience === a
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {a}
              </button>
            ))}
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/architecture">Architecture &amp; Assumptions</Link>
          </Button>
          {right}
        </div>
      </div>
    </header>
  );
}