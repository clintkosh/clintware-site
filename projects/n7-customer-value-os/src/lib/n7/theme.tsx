import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ThemeChoice = "light" | "dark" | "system";

const KEY = "n7-theme";

/**
 * Inline script injected into the document head so the correct theme class is
 * applied before first paint (no flash). Kept dependency-free on purpose.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var c=localStorage.getItem('${KEY}')||'system';var d=c==='dark'||(c==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){}})();`;

interface ThemeValue {
  /** What the user picked: light, dark or follow the operating system. */
  choice: ThemeChoice;
  /** What is actually rendered right now. */
  resolved: "light" | "dark";
  setChoice: (c: ThemeChoice) => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);

function systemDark() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function apply(choice: ThemeChoice) {
  if (typeof document === "undefined") return "light" as const;
  const dark = choice === "dark" || (choice === "system" && systemDark());
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
  return dark ? ("dark" as const) : ("light" as const);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [choice, setChoiceState] = useState<ThemeChoice>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  useEffect(() => {
    let stored: ThemeChoice = "system";
    try {
      const raw = localStorage.getItem(KEY);
      if (raw === "light" || raw === "dark" || raw === "system") stored = raw;
    } catch {
      /* storage unavailable */
    }
    setChoiceState(stored);
    setResolved(apply(stored));
  }, []);

  // Follow the OS while the user is on "system".
  useEffect(() => {
    if (choice !== "system" || typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setResolved(apply("system"));
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [choice]);

  const setChoice = useCallback((c: ThemeChoice) => {
    setChoiceState(c);
    setResolved(apply(c));
    try {
      localStorage.setItem(KEY, c);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const value = useMemo(() => ({ choice, resolved, setChoice }), [choice, resolved, setChoice]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}