import markUrl from "@/assets/alexer-mark.png";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <img
      src={markUrl}
      alt="Alexer"
      width={816}
      height={816}
      loading="lazy"
      className={cn("h-8 w-8 object-contain", className)}
    />
  );
}