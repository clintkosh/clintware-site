import { createFileRoute } from "@tanstack/react-router";
import { generateImage, imageSettings } from "@/lib/image-gateway.server";
import { DAILY_IMAGE_LIMIT } from "@/lib/persona";
import { supabaseFromRequest } from "@/lib/supabase-request.server";

export const Route = createFileRoute("/api/generate-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as {
          prompt?: unknown;
          size?: unknown;
          stream?: unknown;
        };
        const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
        if (!prompt) return new Response("A prompt is required", { status: 400 });

        const auth = await supabaseFromRequest(request);
        if (!auth) return new Response("Please sign in again.", { status: 401 });

        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { count } = await auth.supabase
          .from("usage_events")
          .select("id", { count: "exact", head: true })
          .eq("kind", "image")
          .gte("created_at", since);
        if ((count ?? 0) >= DAILY_IMAGE_LIMIT) {
          return new Response(
            `You've hit the daily limit of ${DAILY_IMAGE_LIMIT} images. It resets on a rolling 24-hour basis.`,
            { status: 429 },
          );
        }

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return new Response("AI is not configured for this app yet.", { status: 500 });

        const stream = body.stream !== false;
        const extra = typeof body.size === "string" ? { size: body.size } : {};
        const upstream = await generateImage({ ...imageSettings, apiKey }, prompt, stream, extra);

        if (upstream.ok) {
          await auth.supabase.from("usage_events").insert({ user_id: auth.userId, kind: "image" });
        }

        return new Response(upstream.body, {
          status: upstream.status,
          headers: {
            "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
            "Cache-Control": "no-cache",
          },
        });
      },
    },
  },
});