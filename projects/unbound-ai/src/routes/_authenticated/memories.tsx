import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Brain, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createMemory,
  deleteMemory,
  listMemories,
  searchMemories,
  updateMemory,
} from "@/lib/memory.functions";
import { MEMORY_CATEGORIES, categoryLabel, type MemoryCategory } from "@/lib/persona";

export const Route = createFileRoute("/_authenticated/memories")({
  component: MemoriesPage,
  head: () => ({
    meta: [
      { title: "Memories — Alexer" },
      {
        name: "description",
        content:
          "Review, search, edit and add the long-term memories Alexer uses to personalise every answer.",
      },
      { property: "og:title", content: "Memories — Alexer" },
      {
        property: "og:description",
        content: "Your assistant's long-term memory bank: profile, facts, goals and summaries.",
      },
    ],
  }),
});

type MemoryRow = {
  id: string;
  content: string;
  category: string;
  tags: string[];
  importance: number;
  source: string;
  created_at: string;
  updated_at: string;
};

const emptyDraft = {
  id: "",
  content: "",
  category: "fact" as MemoryCategory,
  importance: 3,
  tags: "",
};

function MemoriesPage() {
  const qc = useQueryClient();
  const fetchAll = useServerFn(listMemories);
  const runSearch = useServerFn(searchMemories);
  const create = useServerFn(createMemory);
  const update = useServerFn(updateMemory);
  const remove = useServerFn(deleteMemory);

  const [query, setQuery] = useState("");
  const [semantic, setSemantic] = useState<{ id: string }[] | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);

  const { data: memories = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["memories"],
    queryFn: () => fetchAll() as Promise<MemoryRow[]>,
  });

  const search = useMutation({
    mutationFn: (q: string) => runSearch({ data: { query: q } }),
    onSuccess: (rows) => setSemantic(rows.map((r) => ({ id: r.id }))),
    onError: (e: Error) => toast.error(e.message),
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        content: draft.content,
        category: draft.category,
        importance: draft.importance,
        tags: draft.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
          .slice(0, 8),
      };
      if (draft.id) return update({ data: { id: draft.id, ...payload } });
      return create({ data: payload });
    },
    onSuccess: () => {
      setOpen(false);
      setDraft(emptyDraft);
      qc.invalidateQueries({ queryKey: ["memories"] });
      toast.success("Memory saved.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const destroy = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["memories"] });
      toast.success("Memory deleted.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const visible = useMemo(() => {
    let rows = memories;
    if (semantic) {
      const order = new Map(semantic.map((s, i) => [s.id, i]));
      rows = rows.filter((m) => order.has(m.id)).sort((a, b) => order.get(a.id)! - order.get(b.id)!);
    } else if (query.trim()) {
      const q = query.trim().toLowerCase();
      rows = rows.filter(
        (m) => m.content.toLowerCase().includes(q) || m.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    if (filter !== "all") rows = rows.filter((m) => m.category === filter);
    return rows;
  }, [memories, semantic, query, filter]);

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto w-full max-w-4xl p-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <h1 className="font-display text-2xl font-bold">Memories</h1>
          </div>
          <span className="text-sm text-muted-foreground">{memories.length} stored</span>
          <Button
            className="ml-auto gap-2"
            onClick={() => {
              setDraft(emptyDraft);
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Add memory
          </Button>
        </div>

        <p className="mt-2 text-sm text-muted-foreground">
          Alexer writes these automatically as you chat, and pulls the most relevant ones into every
          answer. Edit or delete anything you don&apos;t want remembered.
        </p>

        <form
          className="mt-5 flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (query.trim().length >= 2) search.mutate(query.trim());
          }}
        >
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSemantic(null);
              }}
              placeholder="Search memories..."
              className="pl-9"
              aria-label="Search memories"
            />
            {(query || semantic) && (
              <button
                type="button"
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setQuery("");
                  setSemantic(null);
                }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[190px]" aria-label="Filter by category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {MEMORY_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" variant="outline" disabled={search.isPending || query.trim().length < 2}>
            {search.isPending ? "Searching..." : "Smart search"}
          </Button>
        </form>

        <div className="mt-6 space-y-3">
          {isLoading &&
            [0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl border bg-card" />)}
          {isError && (
            <div className="rounded-xl border p-6 text-center text-sm text-muted-foreground">
              Couldn&apos;t load your memories.{" "}
              <button className="underline" onClick={() => refetch()}>
                Retry
              </button>
            </div>
          )}
          {!isLoading && !isError && visible.length === 0 && (
            <div className="rounded-xl border border-dashed p-10 text-center">
              <p className="text-sm font-medium">
                {memories.length === 0 ? "No memories yet" : "Nothing matches that"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {memories.length === 0
                  ? "Chat for a bit — durable facts get saved automatically. Or add one yourself."
                  : "Try a different search or category."}
              </p>
            </div>
          )}
          {visible.map((m) => (
            <article key={m.id} className="rounded-xl border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{categoryLabel(m.category)}</Badge>
                <Badge variant="outline">importance {m.importance}</Badge>
                <Badge variant="outline">{m.source}</Badge>
                {m.tags.map((t) => (
                  <Badge key={t} variant="outline" className="text-[10px]">
                    #{t}
                  </Badge>
                ))}
                <span className="ml-auto flex items-center gap-1">
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Edit memory"
                    onClick={() => {
                      setDraft({
                        id: m.id,
                        content: m.content,
                        category: m.category as MemoryCategory,
                        importance: m.importance,
                        tags: m.tags.join(", "),
                      });
                      setOpen(true);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Delete memory"
                    onClick={() => destroy.mutate(m.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed">{m.content}</p>
            </article>
          ))}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{draft.id ? "Edit memory" : "Add memory"}</DialogTitle>
            <DialogDescription>
              Write one durable fact per memory. Short third-person sentences work best.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="memory-content">Memory</Label>
              <Textarea
                id="memory-content"
                rows={4}
                value={draft.content}
                onChange={(e) => setDraft({ ...draft, content: e.target.value })}
                placeholder="Prefers concise answers and hates emoji."
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={draft.category}
                  onValueChange={(v) => setDraft({ ...draft, category: v as MemoryCategory })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MEMORY_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Importance</Label>
                <Select
                  value={String(draft.importance)}
                  onValueChange={(v) => setDraft({ ...draft, importance: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="memory-tags">Tags</Label>
              <Input
                id="memory-tags"
                value={draft.tags}
                onChange={(e) => setDraft({ ...draft, tags: e.target.value })}
                placeholder="work, preferences"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => save.mutate()}
              disabled={save.isPending || draft.content.trim().length < 3}
            >
              {save.isPending ? "Saving..." : "Save memory"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}