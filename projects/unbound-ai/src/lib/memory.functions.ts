import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CategoryEnum = z.enum(["profile", "fact", "goal", "summary", "custom"]);

export const listMemories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("memories")
      .select("id, content, category, tags, importance, source, created_at, updated_at")
      .order("importance", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createMemory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { content: string; category: string; importance: number; tags: string[] }) =>
      z
        .object({
          content: z.string().min(3).max(2000),
          category: CategoryEnum,
          importance: z.number().int().min(1).max(5),
          tags: z.array(z.string().max(32)).max(8),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { embed, serializeEmbedding } = await import("@/lib/memory.server");
    const vector = await embed(data.content);
    const { data: row, error } = await context.supabase
      .from("memories")
      .insert({
        user_id: context.userId,
        content: data.content.trim(),
        category: data.category,
        importance: data.importance,
        tags: data.tags,
        source: "manual",
        embedding: vector ? serializeEmbedding(vector) : null,
      })
      .select("id, content, category, tags, importance, source, created_at, updated_at")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateMemory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id: string;
      content: string;
      category: string;
      importance: number;
      tags: string[];
    }) =>
      z
        .object({
          id: z.string().uuid(),
          content: z.string().min(3).max(2000),
          category: CategoryEnum,
          importance: z.number().int().min(1).max(5),
          tags: z.array(z.string().max(32)).max(8),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { embed, serializeEmbedding } = await import("@/lib/memory.server");
    const vector = await embed(data.content);
    const { error } = await context.supabase
      .from("memories")
      .update({
        content: data.content.trim(),
        category: data.category,
        importance: data.importance,
        tags: data.tags,
        embedding: vector ? serializeEmbedding(vector) : null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteMemory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("memories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const searchMemories = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { query: string }) =>
    z.object({ query: z.string().min(2).max(500) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { retrieveMemories } = await import("@/lib/memory.server");
    return await retrieveMemories(context.supabase, context.userId, data.query, 20);
  });

export const summarizeConversationToMemory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { conversationId: string }) =>
    z.object({ conversationId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { summarizeConversation } = await import("@/lib/memory.server");
    const summary = await summarizeConversation(
      context.supabase,
      context.userId,
      data.conversationId,
    );
    return { summary };
  });