import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { createConversation } from "@/lib/chat.functions";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
  },
  loader: async () => {
    // Find latest conversation OR create a new one
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing) throw redirect({ to: "/chat/$id", params: { id: existing.id } });
    const created = await createConversation();
    throw redirect({ to: "/chat/$id", params: { id: created.id } });
  },
  component: () => null,
});