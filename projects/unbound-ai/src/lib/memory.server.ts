import type { SupabaseClient } from "@supabase/supabase-js";
import { streamText, Output } from "ai";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import {
  CHAT_MODEL,
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
  GATEWAY_BASE_URL,
  createResponsesProvider,
  gatewayErrorMessage,
  requireApiKey,
} from "./ai-gateway.server";

type DB = SupabaseClient<Database>;

export type RetrievedMemory = {
  id: string;
  content: string;
  category: string;
  importance: number;
  similarity: number;
};

/** Embeds text through the gateway. Returns null when embedding is unavailable. */
export async function embed(text: string): Promise<number[] | null> {
  const apiKey = requireApiKey();
  const res = await fetch(`${GATEWAY_BASE_URL}/v1/embeddings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text.slice(0, 8000),
      dimensions: EMBEDDING_DIMENSIONS,
    }),
  });
  if (!res.ok) {
    console.error("[memory] embedding failed", res.status, gatewayErrorMessage(res.status));
    return null;
  }
  const json = (await res.json()) as { data?: { embedding?: number[] }[] };
  const vector = json.data?.[0]?.embedding;
  return Array.isArray(vector) ? vector : null;
}

export function serializeEmbedding(vector: number[]): string {
  return `[${vector.join(",")}]`;
}

export async function retrieveMemories(
  supabase: DB,
  userId: string,
  query: string,
  matchCount = 8,
): Promise<RetrievedMemory[]> {
  const vector = await embed(query);
  if (!vector) return [];
  const { data, error } = await supabase.rpc("match_memories", {
    p_user_id: userId,
    p_query_embedding: serializeEmbedding(vector) as unknown as string,
    p_match_count: matchCount,
    p_min_similarity: 0.35,
  });
  if (error) {
    console.error("[memory] match_memories failed", error.message);
    return [];
  }
  return (data ?? []) as RetrievedMemory[];
}

export function renderMemoryBlock(memories: RetrievedMemory[]): string {
  if (memories.length === 0) return "";
  const lines = memories.map(
    (m) => `- (${m.category}, importance ${m.importance}) ${m.content}`,
  );
  return `\n\nKnown memories about this user (most relevant first):\n${lines.join("\n")}`;
}

const ExtractionSchema = z.object({
  memories: z
    .array(
      z.object({
        content: z.string(),
        category: z.enum(["profile", "fact", "goal", "custom"]),
        importance: z.number().int().min(1).max(5),
        tags: z.array(z.string()),
      }),
    )
    .max(5),
});

/**
 * Looks at one conversation turn and stores any durable facts worth remembering.
 * Never throws — memory extraction must not break a chat turn.
 */
export async function extractMemories(
  supabase: DB,
  userId: string,
  userText: string,
  assistantText: string,
): Promise<number> {
  try {
    const apiKey = requireApiKey();
    const provider = createResponsesProvider(apiKey);
    const result = streamText({
      model: provider.responses(CHAT_MODEL),
      output: Output.object({ schema: ExtractionSchema }),
      system: `Extract durable, long-term memories about the user from this exchange.
Only include things worth remembering weeks from now: stable preferences, identity facts, relationships, ongoing projects, goals, constraints.
Ignore small talk, one-off questions, transient state, and anything about the assistant.
Categories: profile (identity/who they are), fact (stable facts), goal (aims/projects), custom (anything else durable).
Write each memory as one short third-person sentence. Return an empty array when nothing qualifies.`,
      prompt: `User said:\n${userText.slice(0, 4000)}\n\nAssistant replied:\n${assistantText.slice(0, 4000)}`,
      providerOptions: {
        openai: {
          forceReasoning: true,
          reasoningEffort: "low",
          store: false,
          include: ["reasoning.encrypted_content"],
        },
      },
    });
    const output = await result.output;
    const candidates = output.memories.filter((m) => m.content.trim().length > 3);
    if (candidates.length === 0) return 0;

    let saved = 0;
    for (const candidate of candidates) {
      const vector = await embed(candidate.content);
      // Skip near-duplicates of what we already know.
      if (vector) {
        const { data: dupes } = await supabase.rpc("match_memories", {
          p_user_id: userId,
          p_query_embedding: serializeEmbedding(vector) as unknown as string,
          p_match_count: 1,
          p_min_similarity: 0.9,
        });
        if (dupes && dupes.length > 0) continue;
      }
      const { error } = await supabase.from("memories").insert({
        user_id: userId,
        content: candidate.content.trim(),
        category: candidate.category,
        importance: candidate.importance,
        tags: candidate.tags.slice(0, 6),
        source: "auto",
        embedding: vector ? serializeEmbedding(vector) : null,
      });
      if (error) {
        console.error("[memory] insert failed", error.message);
        continue;
      }
      saved += 1;
    }
    return saved;
  } catch (error) {
    console.error("[memory] extraction failed", error);
    return 0;
  }
}

/** Summarises a conversation and stores it as a `summary` memory. */
export async function summarizeConversation(
  supabase: DB,
  userId: string,
  conversationId: string,
): Promise<string | null> {
  const { data: rows, error } = await supabase
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) throw new Error(error.message);
  const transcript = (rows ?? [])
    .filter((m) => m.role !== "system" && m.content.trim().length > 0)
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n")
    .slice(0, 20000);
  if (!transcript) return null;

  const apiKey = requireApiKey();
  const provider = createResponsesProvider(apiKey);
  const result = streamText({
    model: provider.responses(CHAT_MODEL),
    output: Output.object({ schema: z.object({ summary: z.string(), tags: z.array(z.string()) }) }),
    system:
      "Summarise this conversation into a compact, durable memory: what the user wanted, what was decided, and anything about them worth remembering later. 2-5 sentences, third person.",
    prompt: transcript,
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "low",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  const output = await result.output;
  const summary = output.summary.trim();
  if (!summary) return null;

  const vector = await embed(summary);
  const { error: insertError } = await supabase.from("memories").insert({
    user_id: userId,
    content: summary,
    category: "summary",
    importance: 3,
    tags: output.tags.slice(0, 6),
    source: "summary",
    embedding: vector ? serializeEmbedding(vector) : null,
  });
  if (insertError) throw new Error(insertError.message);
  return summary;
}