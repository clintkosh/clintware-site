import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PlatformEnum = z.enum(["telegram", "discord"]);

function randomCode() {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  for (const byte of bytes) out += alphabet[byte % alphabet.length];
  return out;
}

export const listBotLinks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("bot_links")
      .select("id, platform, external_id, link_code, linked_at, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/** Bot availability depends on server-side credentials the app owner must supply. */
export const getBotConfigStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => ({
    telegram: Boolean(process.env["TELEGRAM_BOT_TOKEN"]),
    discord: Boolean(process.env["DISCORD_PUBLIC_KEY"] && process.env["DISCORD_BOT_TOKEN"]),
  }));

export const createLinkCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { platform: string }) =>
    z.object({ platform: PlatformEnum }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const code = randomCode();
    const { data: row, error } = await context.supabase
      .from("bot_links")
      .insert({
        user_id: context.userId,
        platform: data.platform,
        external_id: `pending:${code}`,
        link_code: code,
      })
      .select("id, platform, external_id, link_code, linked_at, created_at")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteBotLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("bot_links").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });