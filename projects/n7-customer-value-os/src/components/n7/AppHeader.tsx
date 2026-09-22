import { Link } from "@tanstack/react-router";
import { CircleHelp, Settings } from "lucide-react";
import { ORG } from "@/lib/n7/seed";
import { ThemeToggle } from "@/components/n7/ThemeToggle";
import { Button } from "@/components/ui/button";

export function AppHeader({
  right,
  customerName,
  onOpenTour,
}: {
  right?: React.ReactNode;
  customerName?: string;
  onOpenTour?: () => void;
}) {
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
        {customerName ? (
          <>
            <span className="hidden text-muted-foreground sm:inline" aria-hidden>/</span>
            <span className="hidden max-w-52 truncate text-sm font-medium text-foreground sm:block">{customerName}</span>
          </>
        ) : null}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <ThemeToggle />
          {onOpenTour ? (
            <Button variant="ghost" size="icon" onClick={onOpenTour} aria-label="Open workspace tour" title="Workspace tour">
              <CircleHelp />
            </Button>
          ) : null}
          <Button asChild variant="ghost" size="icon" title="Architecture and settings">
            <Link to="/architecture" aria-label="Architecture and settings"><Settings /></Link>
          </Button>

          {right}
        </div>
      </div>
    </header>
  );
}