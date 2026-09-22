import { createFileRoute } from "@tanstack/react-router";
import { handleBotMessage } from "@/lib/bot-reply.server";

type TelegramUpdate = {
  update_id?: number;
  message?: {
    message_id?: number;
    chat?: { id?: number | string };
    text?: string;
  };
};

export const Route = createFileRoute("/api/public/telegram")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = process.env["TELEGRAM_BOT_TOKEN"];
        if (!token) {
          return new Response("Telegram bot is not configured", { status: 503 });
        }

        // Telegram's own webhook authentication.
        const secret = process.env["TELEGRAM_WEBHOOK_SECRET"];
        if (secret && request.headers.get("x-telegram-bot-api-secret-token") !== secret) {
          return new Response("Invalid secret token", { status: 401 });
        }

        let update: TelegramUpdate;
        try {
          update = (await request.json()) as TelegramUpdate;
        } catch {
          return new Response("Invalid payload", { status: 400 });
        }

        const chatId = update.message?.chat?.id;
        const messageId = update.message?.message_id;
        const text = update.message?.text;
        if (chatId === undefined || messageId === undefined || typeof text !== "string") {
          return new Response("ok");
        }

        try {
          const reply = await handleBotMessage({
            platform: "telegram",
            externalChatId: String(chatId),
            externalMessageId: `${chatId}:${messageId}`,
            text,
          });
          if (reply) {
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: chatId, text: reply }),
            });
          }
        } catch (error) {
          console.error("[telegram] handler failed", error);
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: "Something went wrong on my side. Try again in a moment.",
            }),
          }).catch(() => {});
        }

        return new Response("ok");
      },
    },
  },
});