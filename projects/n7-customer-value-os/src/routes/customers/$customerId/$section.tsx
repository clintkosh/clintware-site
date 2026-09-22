import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { WorkspaceShell } from "@/components/n7/WorkspaceShell";
import { SECTION_COMPONENTS } from "@/components/n7/sections/registry";
import { EmptyState } from "@/components/n7/primitives";
import { Button } from "@/components/ui/button";
import { resolveSectionSlug, sectionBySlug } from "@/lib/n7/sections";
import { useN7 } from "@/lib/n7/store";

export const Route = createFileRoute("/customers/$customerId/$section")({
  beforeLoad: ({ params }) => {
    if (params.section === "panel-defense") {
      throw redirect({
        to: "/customers/$customerId/$section",
        params: { customerId: params.customerId, section: "executive-summary" },
        replace: true,
      });
    }
  },
  head: ({ params }) => {
    const section = sectionBySlug(params.section);
    const title = section ? `${section.label} — N7 Customer Value OS` : "Customer workspace — N7 Customer Value OS";
    const description =
      section?.blurb ??
      "Customer workspace in the N7 Customer Value OS: plan, evidence, governance and value proof.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: WorkspaceSection,
});

function WorkspaceSection() {
  const { customerId, section } = Route.useParams();
  const { getWorkspace } = useN7();
  const ws = getWorkspace(customerId);

  if (!ws) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-20">
        <EmptyState
          title="Customer workspace not found"
          body="This workspace may have been created in a different browser session. Customer workspaces added with the wizard are stored locally in your browser."
        />
        <div className="mt-4 text-center">
          <Button asChild>
            <Link to="/">Back to portfolio</Link>
          </Button>
        </div>
      </div>
    );
  }

  const slug = resolveSectionSlug(section);
  const SectionComponent = SECTION_COMPONENTS[slug];

  return (
    <WorkspaceShell ws={ws} activeSection={slug}>
      {SectionComponent ? (
        <SectionComponent ws={ws} />
      ) : (
        <EmptyState
          title="Unknown section"
          body="Pick a section from the navigation to open it."
        />
      )}
    </WorkspaceShell>
  );
}