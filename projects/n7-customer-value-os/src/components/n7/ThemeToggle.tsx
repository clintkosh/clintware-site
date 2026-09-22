import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type ThemeChoice } from "@/lib/n7/theme";
import { cn } from "@/lib/utils";

const OPTIONS: { value: ThemeChoice; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
];

/** Global light / dark / system switch. Persists across refresh and navigation. */
export function ThemeToggle({ className }: { className?: string }) {
  const { choice, setChoice } = useTheme();

  return (
    <div
      role="group"
      aria-label="Colour theme"
      className={cn("flex items-center rounded-md border border-border p-0.5", className)}
    >
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          title={`${label} theme`}
          aria-label={`${label} theme`}
          aria-pressed={choice === value}
          onClick={() => setChoice(value)}
          className={cn(
            "rounded p-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            choice === value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground",
          )}
        >
          <Icon className="size-3.5" aria-hidden />
        </button>
      ))}
    </div>
  );
}