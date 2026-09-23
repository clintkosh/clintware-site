export const N7_GA4_ID = "G-DCY144YM9P";

type AnalyticsValue = string | number | boolean | undefined;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function analyticsReady() {
  return typeof window !== "undefined" && typeof window.gtag === "function";
}

/**
 * Product analytics only. Never pass customer names, prompts, transcripts,
 * issue bodies, document text, stakeholder names, or other customer content.
 * Parameters must be coarse workflow metadata/enums/counts only.
 */
export function trackN7Event(
  eventName: string,
  params: Record<string, AnalyticsValue> = {},
) {
  if (!analyticsReady()) return;
  const safe = Object.fromEntries(
    Object.entries(params).filter(([, value]) =>
      value === undefined ||
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean",
    ),
  );
  window.gtag?.("event", eventName, safe);
}

export function trackN7PageView(pathname: string) {
  if (!analyticsReady()) return;
  window.gtag?.("event", "page_view", {
    page_path: pathname,
    page_location: window.location.href,
    send_to: N7_GA4_ID,
  });
}
