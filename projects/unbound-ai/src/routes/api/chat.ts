import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import {
  CHAT_MODEL,
  createResponsesProvider,
  requireApiKey,
} from "@/lib/ai-gateway.server";
import { extractMemories, renderMemoryBlock, retrieveMemories } from "@/lib/memory.server";
import { DAILY_CHAT_LIMIT, DEFAULT_SYSTEM_PROMPT } from "@/lib/persona";
import { supabaseFromRequest } from "@/lib/supabase-request.server";

type ChatRequestBody = {
  messages?: unknown;
  conversationId?: unknown;
};

function textOf(message: UIMessage): string {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as ChatRequestBody;
        const messages = body.messages;
        const conversationId = body.conversationId;
        if (!Array.isArray(messages) || typeof conversationId !== "string") {
          return new Response("A conversation id and messages are required", { status: 400 });
        }

        const auth = await supabaseFromRequest(request);
        if (!auth) return new Response("Please sign in again.", { status: 401 });
        const { supabase, userId } = auth;

        const apiKey = (() => {
          try {
            return requireApiKey();
          } catch {
            return null;
          }
        })();
        if (!apiKey) return new Response("AI is not configured for this app yet.", { status: 500 });

        const { data: conversation, error: convError } = await supabase
          .from("conversations")
          .select("id, title, system_prompt_override")
          .eq("id", conversationId)
          .maybeSingle();
        if (convError) return new Response(convError.message, { status: 500 });
        if (!conversation) return new Response("Conversation not found", { status: 404 });

        // Daily rate limit
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { count } = await supabase
          .from("usage_events")
          .select("id", { count: "exact", head: true })
          .eq("kind", "chat")
          .gte("created_at", since);
        if ((count ?? 0) >= DAILY_CHAT_LIMIT) {
          return new Response(
            `You've hit the daily limit of ${DAILY_CHAT_LIMIT} messages. It resets on a rolling 24-hour basis.`,
            { status: 429 },
          );
        }

        const uiMessages = messages as UIMessage[];
        const lastUser = [...uiMessages].reverse().find((m) => m.role === "user");
        const lastUserText = lastUser ? textOf(lastUser) : "";

        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, custom_system_prompt")
          .eq("id", userId)
          .maybeSingle();

        const basePrompt =
          conversation.system_prompt_override?.trim() ||
          profile?.custom_system_prompt?.trim() ||
          DEFAULT_SYSTEM_PROMPT;

        const memories = lastUserText ? await retrieveMemories(supabase, userId, lastUserText) : [];
        const system = [
          basePrompt,
          profile?.display_name ? `\n\nThe user's name is ${profile.display_name}.` : "",
          renderMemoryBlock(memories),
          "\n\nWhen the user asks for a picture or image, tell them to switch the composer to Image mode — you generate text, the image tool generates pictures.",
        ].join("");

        // Persist the incoming user message + usage event before streaming.
        if (lastUserText) {
          await supabase.from("messages").insert({
            conversation_id: conversationId,
            user_id: userId,
            role: "user",
            content: lastUserText,
          });
          await supabase.from("usage_events").insert({ user_id: userId, kind: "chat" });
          if (!conversation.title || conversation.title === "New chat") {
            await supabase
              .from("conversations")
              .update({ title: lastUserText.slice(0, 60) })
              .eq("id", conversationId);
          } else {
            await supabase
              .from("conversations")
              .update({ updated_at: new Date().toISOString() })
              .eq("id", conversationId);
          }
        }

        const provider = createResponsesProvider(apiKey);
        const result = streamText({
          model: provider.responses(CHAT_MODEL),
          system,
          messages: await convertToModelMessages(uiMessages),
          providerOptions: {
            openai: {
              forceReasoning: true,
              reasoningEffort: "low",
              store: false,
              include: ["reasoning.encrypted_content"],
            },
          },
        });

        return result.toUIMessageStreamResponse({
          originalMessages: uiMessages,
          onFinish: async ({ responseMessage }) => {
            const assistantText = textOf(responseMessage);
            if (!assistantText) return;
            const { error } = await supabase.from("messages").insert({
              conversation_id: conversationId,
              user_id: userId,
              role: "assistant",
              content: assistantText,
            });
            if (error) console.error("[chat] failed to save assistant message", error.message);
            if (lastUserText) {
              await extractMemories(supabase, userId, lastUserText, assistantText);
            }
          },
        });
      },
    },
  },
});