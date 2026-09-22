import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

/** Public, unauthenticated read of a shared conversation. */
export const getSharedConversation = createServerFn({ method: "GET" })
  .inputValidator((input: { token: string }) =>
    z.object({ token: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (!url || !key) throw new Error("Backend is not configured");

    const supabase = createClient<Database>(url, key, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });

    const { data: conversation, error } = await supabase
      .from("conversations")
      .select("id, title, created_at, is_shared")
      .eq("share_token", data.token)
      .eq("is_shared", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!conversation) return { conversation: null, messages: [] };

    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select("id, role, content, image_urls, created_at")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true })
      .limit(500);
    if (messagesError) throw new Error(messagesError.message);

    return { conversation, messages: messages ?? [] };
  });