import type { SupabaseClient } from "@supabase/supabase-js";
import { streamText } from "ai";
import type { Database } from "@/integrations/supabase/types";
import { CHAT_MODEL, createResponsesProvider, requireApiKey } from "./ai-gateway.server";
import { extractMemories, renderMemoryBlock, retrieveMemories } from "./memory.server";
import { DEFAULT_SYSTEM_PROMPT } from "./persona";

type DB = SupabaseClient<Database>;

export type BotPlatform = "telegram" | "discord";

const LINK_HINT =
  "This chat isn't linked to an account yet. Open Alexer → Settings → Connected bots, generate a link code, then send me: /link YOURCODE";

export async function getAdminClient(): Promise<DB> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as DB;
}

async function resolveUser(
  admin: DB,
  platform: BotPlatform,
  externalId: string,
  text: string,
): Promise<{ userId: string } | { reply: string }> {
  const { data: existing } = await admin
    .from("bot_links")
    .select("user_id")
    .eq("platform", platform)
    .eq("external_id", externalId)
    .maybeSingle();
  if (existing?.user_id) return { userId: existing.user_id };

  const match = text.trim().match(/^\/?link\s+([A-Za-z0-9]{6,12})/i);
  if (!match) return { reply: LINK_HINT };

  const code = match[1].toUpperCase();
  const { data: pending } = await admin
    .from("bot_links")
    .select("id, user_id, linked_at")
    .eq("platform", platform)
    .eq("link_code", code)
    .maybeSingle();
  if (!pending) return { reply: "That link code isn't valid. Generate a fresh one in Settings." };
  if (pending.linked_at) return { reply: "That link code has already been used." };

  const { error } = await admin
    .from("bot_links")
    .update({ external_id: externalId, linked_at: new Date().toISOString() })
    .eq("id", pending.id);
  if (error) return { reply: "Linking failed. Try generating a new code." };
  return { reply: "Linked. I've got your memories now — ask me anything." };
}

async function getOrCreateConversation(
  admin: DB,
  userId: string,
  platform: BotPlatform,
): Promise<string> {
  const title = platform === "telegram" ? "Telegram chat" : "Discord chat";
  const { data: existing } = await admin
    .from("conversations")
    .select("id")
    .eq("user_id", userId)
    .eq("title", title)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing?.id) return existing.id;
  const { data: created, error } = await admin
    .from("conversations")
    .insert({ user_id: userId, title })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return created.id;
}

/**
 * Runs an inbound bot message through the same AI + memory pipeline as the web app.
 * Returns the text to send back on the originating platform.
 */
export async function handleBotMessage(params: {
  platform: BotPlatform;
  externalChatId: string;
  externalMessageId: string;
  text: string;
}): Promise<string> {
  const { platform, externalChatId, externalMessageId, text } = params;
  const admin = await getAdminClient();

  // Idempotency: platforms retry deliveries.
  const { error: dedupeError } = await admin.from("bot_messages").insert({
    platform,
    external_message_id: externalMessageId,
    external_chat_id: externalChatId,
    payload: { text },
  });
  if (dedupeError) {
    if (dedupeError.code === "23505") return "";
    console.error("[bot] dedupe insert failed", dedupeError.message);
  }

  const resolved = await resolveUser(admin, platform, externalChatId, text);
  if ("reply" in resolved) return resolved.reply;
  const userId = resolved.userId;

  if (!text.trim()) return "Send me some text and I'll answer.";

  const conversationId = await getOrCreateConversation(admin, userId, platform);

  const { data: profile } = await admin
    .from("profiles")
    .select("display_name, custom_system_prompt")
    .eq("id", userId)
    .maybeSingle();

  const memories = await retrieveMemories(admin, userId, text);
  const system = [
    profile?.custom_system_prompt?.trim() || DEFAULT_SYSTEM_PROMPT,
    profile?.display_name ? `\n\nThe user's name is ${profile.display_name}.` : "",
    renderMemoryBlock(memories),
    `\n\nYou are replying over ${platform}. Keep answers tight and chat-friendly; no markdown tables.`,
  ].join("");

  const { data: history } = await admin
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(20);

  const priorMessages = (history ?? [])
    .reverse()
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  const provider = createResponsesProvider(requireApiKey());
  const result = streamText({
    model: provider.responses(CHAT_MODEL),
    system,
    messages: [...priorMessages, { role: "user" as const, content: text }],
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "low",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  const reply = (await result.text).trim();

  await admin.from("messages").insert([
    { conversation_id: conversationId, user_id: userId, role: "user", content: text },
    { conversation_id: conversationId, user_id: userId, role: "assistant", content: reply },
  ]);
  await admin.from("usage_events").insert({ user_id: userId, kind: "chat" });
  await admin
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);
  await admin
    .from("bot_messages")
    .update({ user_id: userId, conversation_id: conversationId })
    .eq("platform", platform)
    .eq("external_message_id", externalMessageId);

  await extractMemories(admin, userId, text, reply);

  return reply || "I didn't have anything useful to say there — try rephrasing.";
}