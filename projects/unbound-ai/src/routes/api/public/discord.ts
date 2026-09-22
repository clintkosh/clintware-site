import { createFileRoute } from "@tanstack/react-router";
import { handleBotMessage } from "@/lib/bot-reply.server";

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

async function verifyDiscordSignature(
  publicKey: string,
  signature: string,
  timestamp: string,
  body: string,
): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      hexToBytes(publicKey),
      { name: "Ed25519" },
      false,
      ["verify"],
    );
    return await crypto.subtle.verify(
      { name: "Ed25519" },
      key,
      hexToBytes(signature),
      new TextEncoder().encode(timestamp + body),
    );
  } catch (error) {
    console.error("[discord] signature verification error", error);
    return false;
  }
}

type DiscordInteraction = {
  id?: string;
  type?: number;
  channel_id?: string;
  data?: {
    name?: string;
    options?: { name?: string; value?: unknown }[];
  };
};

export const Route = createFileRoute("/api/public/discord")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const publicKey = process.env["DISCORD_PUBLIC_KEY"];
        if (!publicKey) return new Response("Discord bot is not configured", { status: 503 });

        const signature = request.headers.get("x-signature-ed25519");
        const timestamp = request.headers.get("x-signature-timestamp");
        const body = await request.text();
        if (!signature || !timestamp) return new Response("Missing signature", { status: 401 });
        if (!(await verifyDiscordSignature(publicKey, signature, timestamp, body))) {
          return new Response("Invalid signature", { status: 401 });
        }

        let interaction: DiscordInteraction;
        try {
          interaction = JSON.parse(body) as DiscordInteraction;
        } catch {
          return new Response("Invalid payload", { status: 400 });
        }

        // PING
        if (interaction.type === 1) {
          return Response.json({ type: 1 });
        }

        // APPLICATION_COMMAND
        if (interaction.type === 2) {
          const option = interaction.data?.options?.find(
            (o) => o.name === "message" || o.name === "prompt" || o.name === "code",
          );
          const raw = typeof option?.value === "string" ? option.value : "";
          const isLink = interaction.data?.name === "link";
          const text = isLink ? `/link ${raw}` : raw;

          try {
            const reply = await handleBotMessage({
              platform: "discord",
              externalChatId: interaction.channel_id ?? "unknown",
              externalMessageId: interaction.id ?? crypto.randomUUID(),
              text,
            });
            return Response.json({
              type: 4,
              data: { content: (reply || "Nothing to say there.").slice(0, 1900) },
            });
          } catch (error) {
            console.error("[discord] handler failed", error);
            return Response.json({
              type: 4,
              data: { content: "Something went wrong on my side. Try again in a moment." },
            });
          }
        }

        return Response.json({ type: 4, data: { content: "Unsupported interaction." } });
      },
    },
  },
});