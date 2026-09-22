import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Bot, Copy, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { getProfile, updateProfile } from "@/lib/profile.functions";
import { getUsage } from "@/lib/chat.functions";
import {
  createLinkCode,
  deleteBotLink,
  getBotConfigStatus,
  listBotLinks,
} from "@/lib/bots.functions";
import { DEFAULT_SYSTEM_PROMPT } from "@/lib/persona";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
  head: () => ({
    meta: [
      { title: "Settings — Alexer" },
      {
        name: "description",
        content:
          "Set your name, edit Alexer's instructions, check daily usage and connect the Telegram or Discord bot.",
      },
      { property: "og:title", content: "Settings — Alexer" },
      {
        property: "og:description",
        content: "Personalise Alexer's instructions and connect it to Telegram or Discord.",
      },
    ],
  }),
});

function SettingsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fetchProfile = useServerFn(getProfile);
  const saveProfile = useServerFn(updateProfile);
  const fetchUsage = useServerFn(getUsage);
  const fetchLinks = useServerFn(listBotLinks);
  const fetchBotStatus = useServerFn(getBotConfigStatus);
  const makeCode = useServerFn(createLinkCode);
  const removeLink = useServerFn(deleteBotLink);

  const [displayName, setDisplayName] = useState("");
  const [prompt, setPrompt] = useState("");

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () => fetchProfile(),
  });
  const { data: usage } = useQuery({ queryKey: ["usage"], queryFn: () => fetchUsage() });
  const { data: links = [] } = useQuery({ queryKey: ["bot-links"], queryFn: () => fetchLinks() });
  const { data: botStatus } = useQuery({
    queryKey: ["bot-status"],
    queryFn: () => fetchBotStatus(),
  });

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name ?? "");
    setPrompt(profile.custom_system_prompt ?? "");
  }, [profile]);

  const save = useMutation({
    mutationFn: () =>
      saveProfile({
        data: {
          displayName: displayName.trim() || null,
          customSystemPrompt: prompt.trim() || null,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Settings saved.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const generateCode = useMutation({
    mutationFn: (platform: "telegram" | "discord") => makeCode({ data: { platform } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bot-links"] });
      toast.success("Link code created.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const dropLink = useMutation({
    mutationFn: (id: string) => removeLink({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bot-links"] });
      toast.success("Removed.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto w-full max-w-3xl space-y-8 p-6">
        <header>
          <h1 className="font-display text-2xl font-bold">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Signed in as {user?.email}
          </p>
        </header>

        <section className="space-y-4 rounded-xl border bg-card p-5">
          <h2 className="font-display text-lg font-semibold">You</h2>
          <div className="space-y-2">
            <Label htmlFor="display-name">What should Alexer call you?</Label>
            <Input
              id="display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="system-prompt">Instructions</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => setPrompt(DEFAULT_SYSTEM_PROMPT)}
              >
                <RotateCcw className="h-3.5 w-3.5" /> Use default
              </Button>
            </div>
            <Textarea
              id="system-prompt"
              rows={12}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={DEFAULT_SYSTEM_PROMPT}
              className="font-mono text-xs"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to use the default personality. Individual chats can override this from the
              chat header.
            </p>
          </div>

          <Button onClick={() => save.mutate()} disabled={save.isPending || isLoading}>
            {save.isPending ? "Saving..." : "Save settings"}
          </Button>
        </section>

        <section className="space-y-4 rounded-xl border bg-card p-5">
          <h2 className="font-display text-lg font-semibold">Usage (last 24 hours)</h2>
          {usage ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Messages</span>
                  <span className="text-muted-foreground">
                    {usage.chat} / {usage.chatLimit}
                  </span>
                </div>
                <Progress value={(usage.chat / usage.chatLimit) * 100} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Images</span>
                  <span className="text-muted-foreground">
                    {usage.image} / {usage.imageLimit}
                  </span>
                </div>
                <Progress value={(usage.image / usage.imageLimit) * 100} />
              </div>
            </div>
          ) : (
            <div className="h-10 animate-pulse rounded-md bg-muted" />
          )}
        </section>

        <section className="space-y-4 rounded-xl border bg-card p-5">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-semibold">Connected bots</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Chat with Alexer from Telegram or Discord using the same memories. Generate a code here,
            then send <code className="font-mono text-xs">/link YOURCODE</code> to the bot.
          </p>

          {(["telegram", "discord"] as const).map((platform) => {
            const configured = botStatus?.[platform];
            const platformLinks = links.filter((l) => l.platform === platform);
            return (
              <div key={platform} className="space-y-3 rounded-lg border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium capitalize">{platform}</span>
                  {configured ? (
                    <Badge variant="secondary">Bot online</Badge>
                  ) : (
                    <Badge variant="outline">Needs setup</Badge>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="ml-auto"
                    disabled={generateCode.isPending}
                    onClick={() => generateCode.mutate(platform)}
                  >
                    Generate link code
                  </Button>
                </div>

                {!configured && (
                  <p className="text-xs text-muted-foreground">
                    {platform === "telegram"
                      ? "The Telegram bot isn't live yet: a bot token from @BotFather has to be added to this project's secrets (TELEGRAM_BOT_TOKEN), and the bot's webhook pointed at /api/public/telegram. Link codes you generate now will work as soon as that's in place."
                      : "The Discord bot isn't live yet: create an application in the Discord Developer Portal, add its public key and bot token to this project's secrets (DISCORD_PUBLIC_KEY, DISCORD_BOT_TOKEN), and set its interactions endpoint to /api/public/discord. Link codes you generate now will work as soon as that's in place."}
                  </p>
                )}

                {platformLinks.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No codes yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {platformLinks.map((link) => (
                      <li key={link.id} className="flex flex-wrap items-center gap-2 text-sm">
                        <code className="rounded bg-muted px-2 py-1 font-mono text-xs">
                          {link.link_code}
                        </code>
                        {link.linked_at ? (
                          <Badge variant="secondary">Linked</Badge>
                        ) : (
                          <Badge variant="outline">Waiting for /link</Badge>
                        )}
                        <span className="ml-auto flex items-center gap-1">
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label="Copy link command"
                            onClick={() => {
                              navigator.clipboard
                                .writeText(`/link ${link.link_code}`)
                                .then(() => toast.success("Copied /link command."))
                                .catch(() => toast.error("Couldn't copy."));
                            }}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label="Remove link"
                            onClick={() => dropLink.mutate(link.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
}