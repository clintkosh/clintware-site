import { Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ImageResult({
  src,
  alt,
  isPartial,
  onRegenerate,
}: {
  src: string;
  alt: string;
  isPartial?: boolean;
  onRegenerate?: () => void;
}) {
  const download = async () => {
    const link = document.createElement("a");
    link.href = src;
    link.download = `alexer-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <figure className="group relative overflow-hidden rounded-xl border bg-card">
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={`block w-full max-w-md transition-[filter] duration-500 ${
          isPartial ? "blur-2xl" : "blur-0"
        }`}
      />
      {!isPartial && (
        <figcaption className="flex items-center justify-between gap-2 border-t px-3 py-2">
          <span className="truncate text-xs text-muted-foreground">{alt}</span>
          <span className="flex shrink-0 items-center gap-1">
            {onRegenerate && (
              <Button size="icon-sm" variant="ghost" aria-label="Regenerate image" onClick={onRegenerate}>
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button size="icon-sm" variant="ghost" aria-label="Download image" onClick={download}>
              <Download className="h-3.5 w-3.5" />
            </Button>
          </span>
        </figcaption>
      )}
    </figure>
  );
}