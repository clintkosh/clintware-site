export const MAX_MESSAGES = 12;
export const MAX_MESSAGE_CHARS = 3000;
export const MAX_BODY_CHARS = 24000;

export function csv(value = "") {
  return String(value).split(",").map((item) => item.trim()).filter(Boolean);
}

export function normalizeMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages.slice(-MAX_MESSAGES).map((item) => ({
    role: item?.role === "assistant" ? "assistant" : "user",
    content: String(item?.content || "").slice(0, MAX_MESSAGE_CHARS)
  })).filter((item) => item.content.trim());
}

export function isOriginAllowed(origin, patterns) {
  if (!origin) return false;
  for (const pattern of patterns) {
    if (pattern === origin) return true;
    if (pattern.startsWith("https://*.")) {
      const suffix = pattern.slice("https://*".length);
      if (origin.startsWith("https://") && origin.slice("https://".length).endsWith(suffix)) return true;
    }
  }
  return false;
}

export function actionPolicy(capability, env) {
  const name = String(capability || "").trim();
  if (!name) return {level:"none", allowed:false};
  if (csv(env.AUTO_ACTIONS).includes(name)) return {level:"auto", allowed:true};
  if (csv(env.CONFIRM_ACTIONS).includes(name)) return {level:"confirm", allowed:true};
  return {level:"owner", allowed:false};
}

export function safePageContext(page = {}) {
  const url = String(page.url || "").slice(0, 1200);
  const title = String(page.title || "").slice(0, 300);
  const path = String(page.path || "").slice(0, 500);
  return {url, title, path};
}
