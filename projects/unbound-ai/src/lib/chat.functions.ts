import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { DAILY_CHAT_LIMIT, DAILY_IMAGE_LIMIT } from "@/lib/persona";

export const createConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { title?: string } | undefined) =>
    z.object({ title: z.string().min(1).max(120).optional() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("conversations")
      .insert({ user_id: userId, title: data.title ?? "New chat" })
      .select("id, title, created_at")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("conversations")
      .select("id, title, updated_at")
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const deleteConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("conversations").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const renameConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; title: string }) =>
    z.object({ id: z.string().uuid(), title: z.string().min(1).max(120) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("conversations")
      .update({ title: data.title })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getConversation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: conversation, error } = await context.supabase
      .from("conversations")
      .select("id, title, model, system_prompt_override, is_shared, share_token, created_at")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!conversation) throw new Error("Conversation not found");

    const { data: messages, error: messagesError } = await context.supabase
      .from("messages")
      .select("id, role, content, image_urls, created_at")
      .eq("conversation_id", data.id)
      .order("created_at", { ascending: true })
      .limit(500);
    if (messagesError) throw new Error(messagesError.message);

    return { conversation, messages: messages ?? [] };
  });

export const updateConversationPrompt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; systemPromptOverride: string | null }) =>
    z
      .object({
        id: z.string().uuid(),
        systemPromptOverride: z.string().max(8000).nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const value = data.systemPromptOverride?.trim() ? data.systemPromptOverride.trim() : null;
    const { error } = await context.supabase
      .from("conversations")
      .update({ system_prompt_override: value })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setConversationSharing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; isShared: boolean }) =>
    z.object({ id: z.string().uuid(), isShared: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("conversations")
      .update({ is_shared: data.isShared })
      .eq("id", data.id)
      .select("is_shared, share_token")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const appendImageMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { conversationId: string; prompt: string; imageUrls: string[] }) =>
    z
      .object({
        conversationId: z.string().uuid(),
        prompt: z.string().min(1).max(4000),
        imageUrls: z.array(z.string().url()).min(1).max(8),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error: userError } = await supabase.from("messages").insert({
      conversation_id: data.conversationId,
      user_id: userId,
      role: "user",
      content: `Generate an image: ${data.prompt}`,
    });
    if (userError) throw new Error(userError.message);

    const { data: row, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: data.conversationId,
        user_id: userId,
        role: "assistant",
        content: data.prompt,
        image_urls: data.imageUrls,
      })
      .select("id, role, content, image_urls, created_at")
      .single();
    if (error) throw new Error(error.message);

    const { data: conversation } = await supabase
      .from("conversations")
      .select("title")
      .eq("id", data.conversationId)
      .maybeSingle();
    await supabase
      .from("conversations")
      .update(
        !conversation?.title || conversation.title === "New chat"
          ? { title: data.prompt.slice(0, 60) }
          : { updated_at: new Date().toISOString() },
      )
      .eq("id", data.conversationId);

    return row;
  });

export const getUsage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const [chat, image] = await Promise.all([
      context.supabase
        .from("usage_events")
        .select("id", { count: "exact", head: true })
        .eq("kind", "chat")
        .gte("created_at", since),
      context.supabase
        .from("usage_events")
        .select("id", { count: "exact", head: true })
        .eq("kind", "image")
        .gte("created_at", since),
    ]);
    return {
      chat: chat.count ?? 0,
      image: image.count ?? 0,
      chatLimit: DAILY_CHAT_LIMIT,
      imageLimit: DAILY_IMAGE_LIMIT,
    };
  });