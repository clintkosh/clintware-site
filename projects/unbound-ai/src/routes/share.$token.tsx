import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandMark } from "@/components/BrandMark";
import { getSharedConversation } from "@/lib/share.functions";

export const Route = createFileRoute("/share/$token")({
  loader: ({ params }) => getSharedConversation({ data: { token: params.token } }),
  component: SharedConversationPage,
  errorComponent: () => (
    <div className="grid min-h-screen place-items-center p-8 text-center">
      <p className="text-sm text-muted-foreground">This shared chat couldn&apos;t be loaded.</p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="grid min-h-screen place-items-center p-8 text-center">
      <p className="text-sm text-muted-foreground">This shared chat doesn&apos;t exist.</p>
    </div>
  ),
  head: ({ loaderData }) => {
    const title = loaderData?.conversation?.title
      ? `${loaderData.conversation.title} — shared on Alexer`
      : "Shared chat — Alexer";
    const description = "A conversation shared from Alexer, an AI chat with long-term memory.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
});

function SharedConversationPage() {
  const { conversation, messages } = Route.useLoaderData();

  if (!conversation) {
    return (
      <div className="grid min-h-screen place-items-center p-8 text-center">
        <div className="max-w-sm">
          <BrandMark className="mx-auto h-10 w-10" />
          <h1 className="mt-4 font-display text-xl font-semibold">Chat not available</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This link is either wrong or the owner turned sharing off.
          </p>
          <Link to="/" className="mt-6 inline-block text-sm text-primary underline">
            Go to Alexer
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <BrandMark className="h-6 w-6" />
          <span className="font-display text-sm font-semibold">Alexer</span>
          <span className="ml-auto text-xs text-muted-foreground">shared conversation</span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="font-display text-2xl font-bold">{conversation.title}</h1>
        <div className="mt-8 space-y-6">
          {messages.map((m) => (
            <article key={m.id} className={m.role === "user" ? "flex justify-end" : ""}>
              <div
                className={
                  m.role === "user"
                    ? "max-w-[85%] rounded-lg bg-secondary px-4 py-3 text-sm whitespace-pre-wrap"
                    : "max-w-full text-sm whitespace-pre-wrap"
                }
              >
                {m.content}
                {m.image_urls.length > 0 && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {m.image_urls.map((url) => (
                      <img
                        key={url}
                        src={url}
                        alt={m.content || "Generated image"}
                        loading="lazy"
                        className="rounded-xl border"
                      />
                    ))}
                  </div>
                )}
              </div>
            </article>
          ))}
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground">This conversation is empty.</p>
          )}
        </div>
        <p className="mt-12 text-xs text-muted-foreground">
          Shared from Alexer —{" "}
          <Link to="/" className="text-primary underline">
            start your own chat
          </Link>
          .
        </p>
      </main>
    </div>
  );
}