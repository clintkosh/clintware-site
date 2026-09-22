import { toast } from "sonner";

/**
 * Copy text with a graceful fallback. Clipboard access can be denied by the
 * browser (permissions, non-secure context, embedded preview), so never let a
 * rejected promise surface as an unhandled runtime error.
 */
export async function copyText(text: string, successMessage: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      toast.success(successMessage);
      return true;
    }
    throw new Error("Clipboard API unavailable");
  } catch {
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.setAttribute("readonly", "");
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(el);
      if (ok) {
        toast.success(successMessage);
        return true;
      }
    } catch {
      // fall through to the manual-copy message below
    }
    toast.error("Copy blocked by the browser", {
      description: "Select the text in the panel and copy it manually.",
    });
    return false;
  }
}