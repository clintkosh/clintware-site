import { useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Plus,
  MessageSquare,
  Brain,
  Settings,
  LogOut,
  Menu,
  Trash2,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { BrandMark } from "@/components/BrandMark";
import { useAuth } from "@/contexts/AuthContext";
import {
  createConversation,
  deleteConversation,
  listConversations,
  renameConversation,
} from "@/lib/chat.functions";

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const { signOut, user } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const params = useParams({ strict: false }) as { id?: string };
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");

  const fetchList = useServerFn(listConversations);
  const createConv = useServerFn(createConversation);
  const removeConv = useServerFn(deleteConversation);
  const rename = useServerFn(renameConversation);

  const {
    data: convs = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => fetchList(),
  });

  const newChat = useMutation({
    mutationFn: () => createConv({ data: {} }),
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
      onNavigate?.();
      nav({ to: "/chat/$id", params: { id: c.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => removeConv({ data: { id } }),
    onSuccess: async (_r, id) => {
      await qc.invalidateQueries({ queryKey: ["conversations"] });
      if (params.id === id) nav({ to: "/" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveTitle = useMutation({
    mutationFn: (vars: { id: string; title: string }) => rename({ data: vars }),
    onSuccess: () => {
      setEditingId(null);
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="flex h-full flex-col">
      <div className="p-4 flex items-center gap-2">
        <BrandMark className="h-8 w-8" />
        <span className="font-display font-semibold tracking-tight">Alexer</span>
      </div>
      <div className="px-3">
        <Button
          className="w-full justify-start gap-2"
          onClick={() => newChat.mutate()}
          disabled={newChat.isPending}
        >
          <Plus className="h-4 w-4" /> New chat
        </Button>
      </div>
      <nav className="px-2 mt-4 space-y-1 flex-1 overflow-y-auto scrollbar-thin" aria-label="Conversations">
        {isLoading && (
          <div className="space-y-2 px-1">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-9 rounded-md bg-sidebar-accent/40 animate-pulse" />
            ))}
          </div>
        )}
        {isError && (
          <div className="px-3 py-2 text-xs text-muted-foreground">
            Couldn&apos;t load your chats.{" "}
            <button className="underline" onClick={() => refetch()}>
              Retry
            </button>
          </div>
        )}
        {!isLoading && !isError && convs.length === 0 && (
          <p className="px-3 py-2 text-xs text-muted-foreground">
            No chats yet. Start one above.
          </p>
        )}
        {convs.map((c) =>
          editingId === c.id ? (
            <div key={c.id} className="flex items-center gap-1 px-1">
              <Input
                autoFocus
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && draftTitle.trim())
                    saveTitle.mutate({ id: c.id, title: draftTitle.trim() });
                  if (e.key === "Escape") setEditingId(null);
                }}
                className="h-8 text-xs"
                aria-label="Chat title"
              />
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Save title"
                onClick={() => draftTitle.trim() && saveTitle.mutate({ id: c.id, title: draftTitle.trim() })}
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon-sm" variant="ghost" aria-label="Cancel" onClick={() => setEditingId(null)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <div
              key={c.id}
              className={`group flex items-center gap-1 rounded-md pr-1 ${
                params.id === c.id ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/60"
              }`}
            >
              <Link
                to="/chat/$id"
                params={{ id: c.id }}
                onClick={onNavigate}
                className={`flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-sm ${
                  params.id === c.id ? "text-sidebar-accent-foreground" : "text-sidebar-foreground/80"
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-60" />
                <span className="truncate">{c.title}</span>
              </Link>
              <Button
                size="icon-xs"
                variant="ghost"
                aria-label={`Rename ${c.title}`}
                className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                onClick={() => {
                  setEditingId(c.id);
                  setDraftTitle(c.title);
                }}
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                size="icon-xs"
                variant="ghost"
                aria-label={`Delete ${c.title}`}
                className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                onClick={() => remove.mutate(c.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ),
        )}
      </nav>
      <div className="p-2 border-t space-y-1">
        <Link
          to="/memories"
          onClick={onNavigate}
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent"
        >
          <Brain className="h-4 w-4" /> Memories
        </Link>
        <Link
          to="/settings"
          onClick={onNavigate}
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent"
        >
          <Settings className="h-4 w-4" /> Settings
        </Link>
        <button
          onClick={() => signOut()}
          className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent text-left"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
        <div className="px-3 pt-2 text-xs text-muted-foreground truncate">{user?.email}</div>
      </div>
    </div>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-background text-foreground">
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r bg-sidebar">
        <SidebarBody />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b px-3 py-2 md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-sidebar p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <SidebarBody onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            <BrandMark className="h-6 w-6" />
            <span className="font-display text-sm font-semibold">Alexer</span>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}