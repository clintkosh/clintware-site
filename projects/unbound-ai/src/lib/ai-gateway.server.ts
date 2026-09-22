import { createOpenAI } from "@ai-sdk/openai";

export const GATEWAY_BASE_URL = "https://ai.gateway.lovable.dev";
export const CHAT_MODEL = "openai/gpt-6-astra";
export const EMBEDDING_MODEL = "google/gemini-embedding-2";
export const EMBEDDING_DIMENSIONS = 1536;

export function requireApiKey(): string {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  return key;
}

/** Responses-API provider for openai/* models, authenticated on the Lovable header. */
export function createResponsesProvider(apiKey: string) {
  return createOpenAI({
    baseURL: `${GATEWAY_BASE_URL}/v1`,
    apiKey, // satisfies the SDK; the gateway authenticates on the header below
    headers: {
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
  });
}

export function gatewayErrorMessage(status: number, fallback?: string): string {
  switch (status) {
    case 401:
      return "AI is not configured for this app yet.";
    case 402:
      return "You're out of AI credits. Top up in Settings → Plans & credits to keep chatting.";
    case 403:
      return "This request was blocked by the AI provider.";
    case 429:
      return "Too many requests right now — give it a few seconds and try again.";
    default:
      return fallback || "The AI service is unavailable right now. Please try again.";
  }
}