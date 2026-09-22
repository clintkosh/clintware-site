import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { toast } from "sonner";
import {
  Brain,
  Download,
  Image as ImageIcon,
  Link2,
  MessageSquareText,
  SlidersHorizontal,
} from "lucide-react";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { BrandMark } from "@/components/BrandMark";
import { ImageResult } from "@/components/chat/ImageResult";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  appendImageMessage,
  getConversation,
  setConversationSharing,
  updateConversationPrompt,
} from "@/lib/chat.functions";
import { summarizeConversationToMemory } from "@/lib/memory.functions";
import { ASPECT_RATIOS, STYLE_MODIFIERS } from "@/lib/persona";
import { streamImage } from "@/lib/stream-image";

export const Route = createFileRoute("/_authenticated/chat/$id")({
  component: ChatPage,
  head: () => ({
    meta: [
      { title: "Chat — Alexer" },
      {
        name: "description",
        content:
          "Chat with Alexer: a witty assistant that remembers what matters to you and generates images inline.",
      },
      { property: "og:title", content: "Chat — Alexer" },
      {
        property: "og:description",
        content: "A witty AI chat with long-term memory and inline image generation.",
      },
    ],
  }),
});

type DbMessage = {
  id: string;
  role: string;
  content: string;
  image_urls: string[];
  created_at: string;
};

function toUIMessages(rows: DbMessage[]): UIMessage[] {
  return rows
    .filter((row) => row.role === "user" || row.role === "assistant")
    .map((row) => ({
      id: row.id,
      role: row.role as "user" | "assistant",
      parts: [
        ...(row.content ? [{ type: "text" as const, text: row.content }] : []),
        ...row.image_urls.map((url) => ({
          type: "file" as const,
          mediaType: "image/png",
          url,
        })),
      ],
    }));
}

function messageText(message: UIMessage): string {
  return message.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
}

function messageImages(message: UIMessage): string[] {
  return message.parts
    .filter((p): p is { type: "file"; url: string; mediaType: string } => p.type === "file")
    .map((p) => p.url);
}

function ChatPage() {
  const { id } = Route.useParams();
  const { session, user } = useAuth();
  const qc = useQueryClient();
  const token = session?.access_token;

  const fetchConversation = useServerFn(getConversation);
  const savePrompt = useServerFn(updateConversationPrompt);
  const saveSharing = useServerFn(setConversationSharing);
  const saveImageMessage = useServerFn(appendImageMessage);
  const summarize = useServerFn(summarizeConversationToMemory);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["conversation", id],
    queryFn: () => fetchConversation({ data: { id } }),
  });

  return (
    <div className="flex h-full min-h-0 flex-col">
      {isLoading && (
        <div className="flex flex-1 items-center justify-center">
          <Shimmer>Loading conversation...</Shimmer>
        </div>
      )}
      {isError && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {(error as Error)?.message ?? "This conversation couldn't be loaded."}
          </p>
          <Button variant="outline" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      )}
      {data && token && user && (
        <ChatSurface
          key={id}
          conversationId={id}
          token={token}
          userId={user.id}
          conversation={data.conversation}
          initialMessages={toUIMessages(data.messages as DbMessage[])}
          onPromptSave={async (value) => {
            await savePrompt({ data: { id, systemPromptOverride: value } });
            qc.invalidateQueries({ queryKey: ["conversation", id] });
          }}
          onSharingChange={async (isShared) => saveSharing({ data: { id, isShared } })}
          onImagePersist={async (prompt, imageUrls) =>
            saveImageMessage({ data: { conversationId: id, prompt, imageUrls } })
          }
          onSummarize={async () => {
            const { summary } = await summarize({ data: { conversationId: id } });
            qc.invalidateQueries({ queryKey: ["memories"] });
            return summary;
          }}
        />
      )}
      {data && (!token || !user) && (
        <div className="flex flex-1 items-center justify-center p-8">
          <Shimmer>Restoring your session...</Shimmer>
        </div>
      )}
    </div>
  );
}

type Conversation = {
  id: string;
  title: string;
  system_prompt_override: string | null;
  is_shared: boolean;
  share_token: string;
};

function ChatSurface({
  conversationId,
  token,
  userId,
  conversation,
  initialMessages,
  onPromptSave,
  onSharingChange,
  onImagePersist,
  onSummarize,
}: {
  conversationId: string;
  token: string;
  userId: string;
  conversation: Conversation;
  initialMessages: UIMessage[];
  onPromptSave: (value: string | null) => Promise<void>;
  onSharingChange: (isShared: boolean) => Promise<{ is_shared: boolean; share_token: string }>;
  onImagePersist: (prompt: string, imageUrls: string[]) => Promise<unknown>;
  onSummarize: () => Promise<string | null>;
}) {
  const qc = useQueryClient();
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"text" | "image">("text");
  const [size, setSize] = useState<string>(ASPECT_RATIOS[0].value);
  const [style, setStyle] = useState<string>("");
  const [count, setCount] = useState("1");
  const [imageBusy, setImageBusy] = useState(false);
  const [previews, setPreviews] = useState<{ src: string; final: boolean }[]>([]);
  const [promptDraft, setPromptDraft] = useState(conversation.system_prompt_override ?? "");
  const [promptOpen, setPromptOpen] = useState(false);
  const [shared, setShared] = useState(conversation.is_shared);
  const [summarizing, setSummarizing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        headers: { Authorization: `Bearer ${token}` },
        body: { conversationId },
      }),
    [token, conversationId],
  );

  const { messages, setMessages, sendMessage, status, stop } = useChat({
    id: conversationId,
    messages: initialMessages,
    transport,
    onError: (err) => toast.error(err.message || "The assistant hit an error."),
    onFinish: () => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
      qc.invalidateQueries({ queryKey: ["memories"] });
      qc.invalidateQueries({ queryKey: ["usage"] });
      focusComposer();
    },
  });

  const focusComposer = useCallback(() => {
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, []);

  useEffect(() => {
    focusComposer();
  }, [focusComposer, conversationId]);

  const busy = status === "submitted" || status === "streaming" || imageBusy;

  const runImageGeneration = useCallback(
    async (rawPrompt: string) => {
      const prompt = rawPrompt.trim();
      if (!prompt) return;
      const n = Math.max(1, Math.min(4, Number(count) || 1));
      const fullPrompt = style ? `${prompt}. ${style}` : prompt;
      setImageBusy(true);
      setPreviews(Array.from({ length: n }, () => ({ src: "", final: false })));
      try {
        const urls: string[] = [];
        for (let index = 0; index < n; index += 1) {
          let finalSrc = "";
          await streamImage(
            "/api/generate-image",
            { prompt: fullPrompt, size },
            (dataUrl, isFinal) => {
              finalSrc = dataUrl;
              setPreviews((prev) => {
                const next = [...prev];
                next[index] = { src: dataUrl, final: isFinal };
                return next;
              });
            },
            undefined,
            { Authorization: `Bearer ${token}` },
          );
          if (!finalSrc) continue;
          const blob = await (await fetch(finalSrc)).blob();

          const path = `${userId}/${crypto.randomUUID()}.png`;
          const { error: uploadError } = await supabase.storage
            .from("chat-images")
            .upload(path, blob, { contentType: "image/png" });
          if (uploadError) throw new Error(uploadError.message);
          const { data: publicUrl } = supabase.storage.from("chat-images").getPublicUrl(path);
          urls.push(publicUrl.publicUrl);
        }
        if (urls.length === 0) throw new Error("No images were produced.");
        await onImagePersist(prompt, urls);
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "user",
            parts: [{ type: "text", text: `Generate an image: ${prompt}` }],
          },
          {
            id: crypto.randomUUID(),
            role: "assistant",
            parts: [
              { type: "text", text: prompt },
              ...urls.map((url) => ({ type: "file" as const, mediaType: "image/png", url })),
            ],
          },
        ]);
        qc.invalidateQueries({ queryKey: ["conversations"] });
        qc.invalidateQueries({ queryKey: ["usage"] });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Image generation failed.");
      } finally {
        setPreviews([]);
        setImageBusy(false);
        focusComposer();
      }
    },
    [count, style, size, token, userId, onImagePersist, setMessages, qc, focusComposer],
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    if (mode === "image") {
      await runImageGeneration(text);
      return;
    }
    sendMessage({ text });
    focusComposer();
  };

  const exportChat = (format: "md" | "json") => {
    const rows = messages.map((m) => ({
      role: m.role,
      text: messageText(m),
      images: messageImages(m),
    }));
    const body =
      format === "json"
        ? JSON.stringify({ title: conversation.title, messages: rows }, null, 2)
        : [
            `# ${conversation.title}`,
            "",
            ...rows.map((r) =>
              [
                `## ${r.role === "user" ? "You" : "Alexer"}`,
                "",
                r.text,
                ...r.images.map((url) => `\n![image](${url})`),
                "",
              ].join("\n"),
            ),
          ].join("\n");
    const blob = new Blob([body], {
      type: format === "json" ? "application/json" : "text/markdown",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${conversation.title.replace(/[^\w-]+/g, "-").slice(0, 40)}.${format}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
  };

  const toggleShare = async (next: boolean) => {
    try {
      const row = await onSharingChange(next);
      setShared(row.is_shared);
      if (row.is_shared) {
        const url = `${window.location.origin}/share/${row.share_token}`;
        await navigator.clipboard.writeText(url).catch(() => {});
        toast.success("Share link copied to clipboard.");
      } else {
        toast.success("Sharing turned off.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update sharing.");
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-2 border-b px-4 py-2">
        <h1 className="min-w-0 flex-1 truncate font-display text-sm font-semibold">
          {conversation.title}
        </h1>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          disabled={summarizing || messages.length === 0}
          onClick={async () => {
            setSummarizing(true);
            try {
              const summary = await onSummarize();
              toast.success(summary ? "Saved a summary to your memories." : "Nothing to summarise yet.");
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Couldn't summarise this chat.");
            } finally {
              setSummarizing(false);
            }
          }}
        >
          <Brain className="h-4 w-4" />
          <span className="hidden sm:inline">Save summary</span>
        </Button>
        <Dialog open={promptOpen} onOpenChange={setPromptOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">Instructions</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Instructions for this chat</DialogTitle>
              <DialogDescription>
                Overrides your global instructions for this conversation only. Leave empty to use
                your default.
              </DialogDescription>
            </DialogHeader>
            <Textarea
              value={promptDraft}
              onChange={(e) => setPromptDraft(e.target.value)}
              rows={8}
              placeholder="e.g. Answer as a blunt senior engineer. Always show code."
            />
            <DialogFooter>
              <Button
                onClick={async () => {
                  try {
                    await onPromptSave(promptDraft.trim() ? promptDraft : null);
                    setPromptOpen(false);
                    toast.success("Instructions saved.");
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Couldn't save instructions.");
                  }
                }}
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Button variant="ghost" size="sm" className="gap-2" onClick={() => toggleShare(!shared)}>
          <Link2 className="h-4 w-4" />
          <span className="hidden sm:inline">{shared ? "Sharing on" : "Share"}</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Export chat">
              <Download className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => exportChat("md")}>Export as Markdown</DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportChat("json")}>Export as JSON</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="mx-auto w-full max-w-3xl">
          {messages.length === 0 && previews.length === 0 && (
            <ConversationEmptyState
              icon={<BrandMark className="h-10 w-10" />}
              title="What's on your mind?"
              description="Ask anything. I remember what matters and can generate images — switch the composer to Image mode."
            />
          )}
          {messages.map((message) => {
            const text = messageText(message);
            const images = messageImages(message);
            return (
              <Message key={message.id} from={message.role}>
                <MessageContent>
                  {text && message.role === "assistant" ? (
                    <MessageResponse>{text}</MessageResponse>
                  ) : (
                    text && <p className="whitespace-pre-wrap">{text}</p>
                  )}
                  {images.length > 0 && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {images.map((url) => (
                        <ImageResult
                          key={url}
                          src={url}
                          alt={text || "Generated image"}
                          onRegenerate={
                            message.role === "assistant" && text
                              ? () => runImageGeneration(text)
                              : undefined
                          }
                        />
                      ))}
                    </div>
                  )}
                </MessageContent>
              </Message>
            );
          })}
          {previews.length > 0 && (
            <Message from="assistant">
              <MessageContent>
                <Shimmer>Painting...</Shimmer>
                <div className="grid gap-3 sm:grid-cols-2">
                  {previews.map((preview, index) =>
                    preview.src ? (
                      <ImageResult
                        key={index}
                        src={preview.src}
                        alt="Generating"
                        isPartial={!preview.final}
                      />
                    ) : (
                      <div
                        key={index}
                        className="aspect-square w-full max-w-md animate-pulse rounded-xl border bg-card"
                      />
                    ),
                  )}
                </div>
              </MessageContent>
            </Message>
          )}
          {status === "submitted" && (
            <Message from="assistant">
              <MessageContent>
                <Shimmer>Thinking...</Shimmer>
              </MessageContent>
            </Message>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t bg-background px-3 py-3">
        <div className="mx-auto w-full max-w-3xl">
          <PromptInput onSubmit={handleSubmit}>
            <PromptInputTextarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                mode === "image" ? "Describe the image you want..." : "Ask Alexer anything..."
              }
              disabled={busy}
            />
            <PromptInputFooter className="flex-wrap gap-2">
              <PromptInputTools className="flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={mode === "text" ? "secondary" : "ghost"}
                  className="gap-1.5"
                  onClick={() => setMode("text")}
                >
                  <MessageSquareText className="h-3.5 w-3.5" /> Text
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={mode === "image" ? "secondary" : "ghost"}
                  className="gap-1.5"
                  onClick={() => setMode("image")}
                >
                  <ImageIcon className="h-3.5 w-3.5" /> Image
                </Button>
                {mode === "image" && (
                  <>
                    <Select value={size} onValueChange={setSize}>
                      <SelectTrigger className="h-8 w-[130px] text-xs" aria-label="Aspect ratio">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ASPECT_RATIOS.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={style} onValueChange={setStyle}>
                      <SelectTrigger className="h-8 w-[140px] text-xs" aria-label="Style">
                        <SelectValue placeholder="Style" />
                      </SelectTrigger>
                      <SelectContent>
                        {STYLE_MODIFIERS.map((s) => (
                          <SelectItem key={s.label} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={count} onValueChange={setCount}>
                      <SelectTrigger className="h-8 w-[90px] text-xs" aria-label="Number of images">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["1", "2", "3", "4"].map((n) => (
                          <SelectItem key={n} value={n}>
                            {n} image{n === "1" ? "" : "s"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                )}
              </PromptInputTools>
              <PromptInputSubmit
                status={imageBusy ? "streaming" : status}
                disabled={!input.trim() && !busy}
                onStop={mode === "text" ? stop : undefined}
              />
            </PromptInputFooter>
          </PromptInput>
          <div className="mt-2 flex items-center gap-2 px-1 text-[11px] text-muted-foreground">
            <Switch
              id="share-toggle"
              checked={shared}
              onCheckedChange={toggleShare}
              aria-label="Share this conversation"
            />
            <Label htmlFor="share-toggle" className="text-[11px] font-normal">
              {shared ? "Anyone with the link can read this chat" : "This chat is private"}
            </Label>
          </div>
        </div>
      </div>
    </div>
  );
}