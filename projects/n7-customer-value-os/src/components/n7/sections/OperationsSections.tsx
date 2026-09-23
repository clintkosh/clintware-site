import { useMemo, useState, type DragEvent } from "react";
import { toast } from "sonner";
import { SectionHeader, Panel, EmptyState, ProvenanceTag } from "@/components/n7/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useN7 } from "@/lib/n7/store";
import { jiraBridge } from "@/lib/n7/server-api";
import { trackN7Event } from "@/lib/n7/analytics";
import type {
  CustomerWorkspace,
  DeploymentWorkItem,
  DeploymentWorkStatus,
  EngineeringIssueIntake,
  SprintPlan,
} from "@/lib/n7/types";

const DEPLOY_COLUMNS: Array<{ id: DeploymentWorkStatus; label: string }> = [
  { id: "backlog", label: "Backlog" },
  { id: "ready", label: "Ready" },
  { id: "in-progress", label: "In progress" },
  { id: "blocked", label: "Blocked" },
  { id: "review", label: "Review" },
  { id: "done", label: "Done" },
];

const slug = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50);

function JiraConfig({ ws }: { ws: CustomerWorkspace }) {
  const { patchWorkspace } = useN7();
  const jira = ws.jira ?? {};
  return (
    <Panel title="Jira connection" subtitle="N7 renders Jira data through the Clintware Control Plane. Jira remains the engineering execution system of record.">
      <div className="grid gap-3 md:grid-cols-4">
        <div>
          <Label>Project key</Label>
          <Input
            value={jira.projectKey ?? ""}
            placeholder="e.g. N7"
            onChange={(e) => patchWorkspace(ws.customer.id, { jira: { ...jira, projectKey: e.target.value.trim().toUpperCase() } })}
          />
        </div>
        <div>
          <Label>Cloud ID</Label>
          <Input
            value={jira.cloudId ?? ""}
            placeholder="Optional if only one site"
            onChange={(e) => patchWorkspace(ws.customer.id, { jira: { ...jira, cloudId: e.target.value.trim() } })}
          />
        </div>
        <div>
          <Label>Deployment issue type</Label>
          <Input
            value={jira.deploymentIssueType ?? ""}
            placeholder="Task"
            onChange={(e) => patchWorkspace(ws.customer.id, { jira: { ...jira, deploymentIssueType: e.target.value } })}
          />
        </div>
        <div>
          <Label>Engineering issue type</Label>
          <Input
            value={jira.engineeringIssueType ?? ""}
            placeholder="Bug"
            onChange={(e) => patchWorkspace(ws.customer.id, { jira: { ...jira, engineeringIssueType: e.target.value } })}
          />
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        N7 does not iframe Jira. Jira Cloud commonly restricts framing; the safer integration is API-backed rendering through Clintware with Jira links/keys preserved.
      </p>
    </Panel>
  );
}

function mapMilestoneStatus(status: string): DeploymentWorkStatus {
  const normalized = status.toLowerCase();
  if (normalized.includes("done") || normalized.includes("complete")) return "done";
  if (normalized.includes("block")) return "blocked";
  if (normalized.includes("progress")) return "in-progress";
  return "backlog";
}

function mapJiraStatus(name: string): DeploymentWorkStatus {
  const s = name.toLowerCase();
  if (/done|closed|resolved|complete/.test(s)) return "done";
  if (/block|imped/.test(s)) return "blocked";
  if (/review|qa|test/.test(s)) return "review";
  if (/progress|doing|active|development/.test(s)) return "in-progress";
  if (/ready|selected/.test(s)) return "ready";
  return "backlog";
}

function JiraIssueCard({ issue }: { issue: any }) {
  const fields = issue?.fields ?? {};
  return (
    <article className="rounded-md border border-border bg-background p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <strong className="text-sm">{fields.summary ?? issue?.key ?? "Jira issue"}</strong>
        <span className="font-mono text-[11px] text-muted-foreground">{issue?.key}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
        <span>{fields.status?.name ?? "No status"}</span>
        {fields.priority?.name ? <span>• {fields.priority.name}</span> : null}
        {fields.assignee?.displayName ? <span>• {fields.assignee.displayName}</span> : null}
      </div>
    </article>
  );
}

export function DeploymentBoard({ ws }: { ws: CustomerWorkspace }) {
  const { patchWorkspace } = useN7();
  const items = ws.deploymentWork ?? [];
  const jira = ws.jira ?? {};
  const [title, setTitle] = useState("");
  const [owner, setOwner] = useState("");
  const [week, setWeek] = useState("");
  const [points, setPoints] = useState("");
  const [jiraIssues, setJiraIssues] = useState<any[]>([]);
  const [jiraLoading, setJiraLoading] = useState(false);

  function saveItems(next: DeploymentWorkItem[]) {
    patchWorkspace(ws.customer.id, { deploymentWork: next });
  }

  function addCard() {
    if (!title.trim()) return;
    saveItems([
      ...items,
      {
        id: `${ws.customer.id}-work-${Date.now().toString(36)}`,
        customerId: ws.customer.id,
        title: title.trim(),
        detail: "",
        status: "backlog",
        owner: owner.trim(),
        week: week.trim(),
        storyPoints: points ? Math.max(0, Number(points)) : undefined,
        provenance: "user-entered",
      },
    ]);
    setTitle("");
    setOwner("");
    setWeek("");
    setPoints("");
  }

  function importMilestones() {
    const existing = new Set(items.map((item) => item.sourceMilestoneId).filter(Boolean));
    const additions = ws.milestones
      .filter((m) => !existing.has(m.id))
      .map<DeploymentWorkItem>((m) => ({
        id: `${ws.customer.id}-work-${m.id}`,
        customerId: ws.customer.id,
        title: m.title,
        detail: m.detail,
        status: mapMilestoneStatus(m.status),
        owner: m.owner,
        week: m.week,
        sourceMilestoneId: m.id,
        provenance: m.provenance,
      }));
    if (!additions.length) { toast("No new milestones to import."); return; }
    saveItems([...items, ...additions]);
    toast.success(`Imported ${additions.length} milestone${additions.length === 1 ? "" : "s"}.`);
  }

  async function moveItem(id: string, status: DeploymentWorkStatus) {
    const item = items.find((row) => row.id === id);
    if (!item || item.status === status) return;

    // Once a card is linked to Jira, Jira is authoritative. Never allow N7 to
    // show a different status merely because a local drag succeeded.
    if (item.jiraKey) {
      try {
        const transitions: any = await jiraBridge({
          data: {
            operation: "transitions",
            args: { cloud_id: jira.cloudId || undefined, issue_key: item.jiraKey },
          },
        });
        const available = Array.isArray(transitions?.transitions) ? transitions.transitions : [];
        const target = available.find(
          (t: any) => mapJiraStatus(String(t?.to?.name ?? t?.name ?? "")) === status,
        );
        if (!target?.id) {
          toast.error(`Jira does not currently allow a direct move to ${status}. Card left unchanged.`);
          return;
        }
        await jiraBridge({
          data: {
            operation: "transition",
            args: {
              cloud_id: jira.cloudId || undefined,
              issue_key: item.jiraKey,
              transition_id: String(target.id),
            },
          },
        });
        saveItems(items.map((row) => (row.id === id ? { ...row, status } : row)));
        trackN7Event("jira_deployment_transition_succeeded", { target_status: status });
        toast.success(`${item.jiraKey} moved in Jira.`);
        return;
      } catch (error) {
        trackN7Event("jira_deployment_transition_failed", { target_status: status });
        toast.error("Jira transition failed. Card left unchanged to prevent status drift.");
        return;
      }
    }

    // Unsynced cards are local planning drafts and can move freely.
    saveItems(items.map((row) => (row.id === id ? { ...row, status } : row)));
    trackN7Event("deployment_card_moved_locally", { target_status: status });
  }

  function onDrop(status: DeploymentWorkStatus, event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const id = event.dataTransfer.getData("text/n7-work-item");
    if (id) void moveItem(id, status);
  }

  async function sendToJira(item: DeploymentWorkItem) {
    if (!jira.projectKey) { toast.error("Set a Jira project key first."); return; }
    try {
      const result: any = await jiraBridge({
        data: {
          operation: "create",
          args: {
            cloud_id: jira.cloudId || undefined,
            project_key: jira.projectKey,
            summary: item.title,
            issue_type: jira.deploymentIssueType || "Task",
            description: [
              item.detail,
              item.week ? `Planned week: ${item.week}` : "",
              item.owner ? `Owner: ${item.owner}` : "",
              "Source: N7 Customer Value OS deployment board",
            ].filter(Boolean).join("\n\n"),
            labels: ["n7-deployment", `n7-customer-${slug(ws.customer.id)}`],
          },
        },
      });
      const key = result?.issue?.key;
      if (!key) throw new Error("Jira did not return an issue key.");
      saveItems(items.map((row) => (row.id === item.id ? { ...row, jiraKey: key } : row)));
      trackN7Event("jira_deployment_issue_created");
      toast.success(`Created Jira issue ${key}.`);
      return;
    } catch (error) {
      trackN7Event("jira_deployment_issue_create_failed");
      toast.error(error instanceof Error ? error.message : "Jira issue creation failed.");
      return;
    }
  }

  async function refreshJira(): Promise<void> {
    if (!jira.projectKey) {
      toast.error("Set a Jira project key first.");
      return;
    }
    setJiraLoading(true);
    try {
      const jql = jira.deploymentJql?.trim() ||
        `project = "${jira.projectKey.replace(/"/g, "")}" AND labels = "n7-deployment" ORDER BY updated DESC`;
      const result: any = await jiraBridge({
        data: {
          operation: "search",
          args: {
            cloud_id: jira.cloudId || undefined,
            jql,
            max_results: 100,
            fields: ["summary", "status", "assignee", "priority", "updated", "labels"],
          },
        },
      });
      const liveIssues = Array.isArray(result?.issues) ? result.issues : [];
      setJiraIssues(liveIssues);

      const byKey = new Map<string, any>(
        liveIssues
          .filter((issue: any) => issue?.key)
          .map((issue: any) => [String(issue.key), issue]),
      );
      const synced = items.map((item) => {
        if (!item.jiraKey) return item;
        const issue = byKey.get(item.jiraKey);
        if (!issue) return item;
        const liveStatus = mapJiraStatus(String(issue?.fields?.status?.name ?? ""));
        return liveStatus === item.status ? item : { ...item, status: liveStatus };
      });
      if (synced.some((item, index) => item.status !== items[index]?.status)) saveItems(synced);

      trackN7Event("jira_deployment_board_refreshed", { issue_count: liveIssues.length });
      toast.success("Jira deployment board refreshed and linked cards synchronized.");
      return;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Jira refresh failed.");
      return;
    } finally {
      setJiraLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={ws.customer.name}
        title="Deployment Board"
        description="Plan locally, then send execution cards to Jira. Once linked, Jira becomes the authoritative status and N7 stays synchronized through the Clintware Control Plane."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={importMilestones}>Import milestones</Button>
            <Button variant="outline" onClick={() => void refreshJira()} disabled={jiraLoading}>
              {jiraLoading ? "Refreshing…" : "Refresh Jira"}
            </Button>
          </div>
        }
      />

      <JiraConfig ws={ws} />

      <Panel title="Add deployment work" subtitle="Only add work the team has actually identified. Blank fields stay blank.">
        <div className="grid gap-2 md:grid-cols-[2fr_1fr_1fr_120px_auto]">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Work item" />
          <Input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="Owner" />
          <Input value={week} onChange={(e) => setWeek(e.target.value)} placeholder="Week / sprint" />
          <Input value={points} onChange={(e) => setPoints(e.target.value)} placeholder="Points" type="number" min="0" />
          <Button onClick={addCard} disabled={!title.trim()}>Add</Button>
        </div>
      </Panel>

      <div className="grid gap-3 xl:grid-cols-6">
        {DEPLOY_COLUMNS.map((column) => (
          <div
            key={column.id}
            className="min-h-48 rounded-lg border border-border bg-secondary/25 p-2"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => onDrop(column.id, event)}
          >
            <div className="mb-2 flex items-center justify-between px-1">
              <strong className="text-xs uppercase tracking-wide">{column.label}</strong>
              <span className="text-xs text-muted-foreground">{items.filter((i) => i.status === column.id).length}</span>
            </div>
            <div className="space-y-2">
              {items.filter((i) => i.status === column.id).map((item) => (
                <article
                  key={item.id}
                  draggable
                  onDragStart={(event) => event.dataTransfer.setData("text/n7-work-item", item.id)}
                  className="cursor-grab rounded-md border border-border bg-background p-3 shadow-sm active:cursor-grabbing"
                >
                  <div className="text-sm font-medium">{item.title}</div>
                  {item.detail ? <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p> : null}
                  <div className="mt-2 flex flex-wrap gap-1 text-[11px] text-muted-foreground">
                    {item.week ? <span>{item.week}</span> : null}
                    {item.owner ? <span>• {item.owner}</span> : null}
                    {item.storyPoints !== undefined ? <span>• {item.storyPoints} pt</span> : null}
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <ProvenanceTag value={item.provenance} short />
                    {item.jiraKey ? (
                      <span
                        className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] text-primary"
                        title="Jira is the authoritative status for this card"
                      >
                        Jira · {item.jiraKey}
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Local draft</span>
                        <Button size="sm" variant="ghost" onClick={() => void sendToJira(item)}>
                          Send to Jira
                        </Button>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>

      {jiraIssues.length ? (
        <Panel title="Live Jira deployment issues" subtitle="API-backed Jira view. Refresh when you want current Jira status.">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {jiraIssues.map((issue) => <JiraIssueCard key={issue.id ?? issue.key} issue={issue} />)}
          </div>
        </Panel>
      ) : null}
    </div>
  );
}

export function RolloutSprints({ ws }: { ws: CustomerWorkspace }) {
  const { patchWorkspace } = useN7();
  const sprints = ws.sprints ?? [];
  const work = ws.deploymentWork ?? [];
  const [name, setName] = useState("");
  const [weekStart, setWeekStart] = useState("");
  const [weekEnd, setWeekEnd] = useState("");
  const [goal, setGoal] = useState("");
  const [capacity, setCapacity] = useState("");

  function addSprint() {
    if (!name.trim()) return;
    const sprint: SprintPlan = {
      id: `${ws.customer.id}-sprint-${Date.now().toString(36)}`,
      customerId: ws.customer.id,
      name: name.trim(),
      weekStart: weekStart.trim(),
      weekEnd: weekEnd.trim(),
      goal: goal.trim(),
      status: "planned",
      capacityPoints: capacity ? Number(capacity) : undefined,
      provenance: "user-entered",
    };
    patchWorkspace(ws.customer.id, { sprints: [...sprints, sprint] });
    setName(""); setWeekStart(""); setWeekEnd(""); setGoal(""); setCapacity("");
  }

  function assign(itemId: string, sprintId: string) {
    patchWorkspace(ws.customer.id, {
      deploymentWork: work.map((item) => item.id === itemId ? { ...item, sprintId: sprintId || undefined } : item),
    });
  }

  const totalDone = work.filter((i) => i.status === "done").reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);
  const totalCommitted = work.reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);
  const completedSprintVelocity = sprints
    .filter((sprint) => sprint.status === "complete")
    .map((sprint) =>
      work
        .filter((item) => item.sprintId === sprint.id && item.status === "done")
        .reduce((sum, item) => sum + (item.storyPoints ?? 0), 0),
    );
  const rollingVelocity = completedSprintVelocity.length
    ? Math.round(
        completedSprintVelocity.reduce((sum, points) => sum + points, 0) /
          completedSprintVelocity.length,
      )
    : 0;

  function setSprintStatus(sprintId: string, status: SprintPlan["status"]) {
    patchWorkspace(ws.customer.id, {
      sprints: sprints.map((sprint) => (sprint.id === sprintId ? { ...sprint, status } : sprint)),
    });
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={ws.customer.name}
        title="Rollout / Sprints"
        description="Organize planned weeks into execution sprints and track committed vs completed work. Velocity is calculated only from points the team enters."
      />
      <div className="grid gap-3 sm:grid-cols-4">
        <Panel title="Committed points"><div className="text-3xl font-semibold">{totalCommitted}</div></Panel>
        <Panel title="Completed points"><div className="text-3xl font-semibold">{totalDone}</div></Panel>
        <Panel title="Overall completion"><div className="text-3xl font-semibold">{totalCommitted ? Math.round((totalDone / totalCommitted) * 100) : 0}%</div></Panel>
        <Panel title="Rolling velocity" subtitle="Average completed points across completed sprints">
          <div className="text-3xl font-semibold">{rollingVelocity}</div>
        </Panel>
      </div>

      <Panel title="Add sprint">
        <div className="grid gap-2 md:grid-cols-5">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Sprint name" />
          <Input value={weekStart} onChange={(e) => setWeekStart(e.target.value)} placeholder="Start / week" />
          <Input value={weekEnd} onChange={(e) => setWeekEnd(e.target.value)} placeholder="End / week" />
          <Input value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="Capacity points" type="number" />
          <Button onClick={addSprint} disabled={!name.trim()}>Add sprint</Button>
        </div>
        <Textarea className="mt-2" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Sprint goal" />
      </Panel>

      {sprints.length ? (
        <Tabs defaultValue={sprints[0]!.id}>
          <TabsList className="flex h-auto flex-wrap">
            {sprints.map((sprint) => <TabsTrigger key={sprint.id} value={sprint.id}>{sprint.name}</TabsTrigger>)}
          </TabsList>
          {sprints.map((sprint) => {
            const assigned = work.filter((item) => item.sprintId === sprint.id);
            const committed = assigned.reduce((sum, item) => sum + (item.storyPoints ?? 0), 0);
            const done = assigned.filter((item) => item.status === "done").reduce((sum, item) => sum + (item.storyPoints ?? 0), 0);
            return (
              <TabsContent key={sprint.id} value={sprint.id}>
                <Panel
                  title={sprint.name}
                  subtitle={[sprint.weekStart, sprint.weekEnd].filter(Boolean).join(" → ") || "Dates not provided"}
                >
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <span className="label-caps">Sprint status</span>
                    {(["planned", "active", "complete"] as const).map((status) => (
                      <Button
                        key={status}
                        size="sm"
                        variant={sprint.status === status ? "default" : "outline"}
                        onClick={() => setSprintStatus(sprint.id, status)}
                      >
                        {status}
                      </Button>
                    ))}
                  </div>
                  {sprint.goal ? <p className="mb-4 text-sm">{sprint.goal}</p> : null}
                  <div className="mb-4 grid gap-3 sm:grid-cols-4">
                    <div><div className="label-caps">Committed</div><div className="text-xl font-semibold">{committed} pt</div></div>
                    <div><div className="label-caps">Done</div><div className="text-xl font-semibold">{done} pt</div></div>
                    <div><div className="label-caps">Completion</div><div className="text-xl font-semibold">{committed ? Math.round((done / committed) * 100) : 0}%</div></div>
                    <div>
                      <div className="label-caps">Velocity</div>
                      <div className="text-xl font-semibold">{sprint.status === "complete" ? `${done} pt` : "Open"}</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {assigned.length ? assigned.map((item) => (
                      <div key={item.id} className="flex flex-wrap items-center gap-2 rounded-md border border-border p-3">
                        <span className="min-w-0 flex-1 text-sm font-medium">{item.title}</span>
                        <span className="text-xs text-muted-foreground">{item.storyPoints ?? 0} pt · {item.status}</span>
                      </div>
                    )) : <EmptyState title="No work assigned" body="Assign deployment-board cards to this sprint below." />}
                  </div>
                </Panel>
              </TabsContent>
            );
          })}
        </Tabs>
      ) : <EmptyState title="No sprints yet" body="Create a sprint only when the team has a real rollout period to track." />}

      <Panel title="Assign deployment work">
        <div className="space-y-2">
          {work.map((item) => (
            <div key={item.id} className="grid items-center gap-2 rounded-md border border-border p-3 md:grid-cols-[1fr_220px]">
              <div>
                <div className="text-sm font-medium">{item.title}</div>
                <div className="text-xs text-muted-foreground">{item.status} · {item.storyPoints ?? 0} pt</div>
              </div>
              <select
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={item.sprintId ?? ""}
                onChange={(e) => assign(item.id, e.target.value)}
              >
                <option value="">Unassigned</option>
                {sprints.map((sprint) => <option key={sprint.id} value={sprint.id}>{sprint.name}</option>)}
              </select>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function issueReady(issue: EngineeringIssueIntake) {
  const required = [
    issue.summary,
    issue.reportedProblem,
    issue.expected,
    issue.actual,
    issue.environment,
    issue.evidence,
    issue.customerImpact,
    issue.affectedUsers,
    issue.source,
    issue.owner,
  ];
  return required.every((value) => value.trim()) &&
    (issue.reproducible ? Boolean(issue.reproSteps.trim()) : Boolean(issue.notReproducibleReason?.trim()));
}

function issueDescription(issue: EngineeringIssueIntake) {
  return [
    "Customer-reported problem",
    issue.reportedProblem,
    "",
    "Expected",
    issue.expected,
    "",
    "Actual",
    issue.actual,
    "",
    "Reproduction",
    issue.reproducible ? issue.reproSteps : `Not currently reproducible. Reason: ${issue.notReproducibleReason || "Not provided"}`,
    "",
    "Environment",
    issue.environment,
    "",
    "Evidence",
    issue.evidence,
    "",
    "Customer impact",
    issue.customerImpact,
    "",
    "Affected users / scope",
    issue.affectedUsers,
    "",
    "Workaround",
    issue.workaround || "None provided",
    "",
    "Source",
    issue.source,
    "",
    `CS owner: ${issue.owner}`,
    "Created through N7 Engineering Issue intake gate.",
  ].join("\n");
}

export function EngineeringIssues({ ws }: { ws: CustomerWorkspace }) {
  const { patchWorkspace } = useN7();
  const issues = ws.engineeringIssues ?? [];
  const jira = ws.jira ?? {};
  const emptyDraft = (): EngineeringIssueIntake => ({
    id: `${ws.customer.id}-issue-${Date.now().toString(36)}`,
    customerId: ws.customer.id,
    summary: "",
    reportedProblem: "",
    expected: "",
    actual: "",
    reproSteps: "",
    reproducible: true,
    environment: "",
    evidence: "",
    severity: "medium",
    customerImpact: "",
    affectedUsers: "",
    workaround: "",
    source: "",
    owner: "",
    status: "intake",
    createdAt: new Date().toISOString(),
    provenance: "user-entered",
  });
  const [draft, setDraft] = useState<EngineeringIssueIntake>(emptyDraft);
  const [jiraIssues, setJiraIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const ready = issueReady(draft);

  function saveDraft() {
    patchWorkspace(ws.customer.id, { engineeringIssues: [...issues, { ...draft, status: ready ? "ready-for-engineering" : "intake" }] });
    setDraft(emptyDraft());
    toast.success(ready ? "Issue intake saved and ready for engineering." : "Issue intake draft saved.");
  }

  async function createJira(issue: EngineeringIssueIntake): Promise<void> {
    if (!issueReady(issue)) {
      toast.error("Complete the engineering intake gate before creating a Jira issue.");
      return;
    }
    if (!jira.projectKey) {
      toast.error("Set a Jira project key first.");
      return;
    }
    try {
      const result: any = await jiraBridge({
        data: {
          operation: "create",
          args: {
            cloud_id: jira.cloudId || undefined,
            project_key: jira.projectKey,
            summary: issue.summary,
            issue_type: jira.engineeringIssueType || "Bug",
            description: issueDescription(issue),
            labels: ["n7-engineering", `n7-customer-${slug(ws.customer.id)}`, `severity-${issue.severity}`],
          },
        },
      });
      const key = result?.issue?.key;
      if (!key) throw new Error("Jira did not return an issue key.");
      patchWorkspace(ws.customer.id, {
        engineeringIssues: issues.map((row) => row.id === issue.id ? { ...row, jiraKey: key, status: "in-jira" } : row),
      });
      trackN7Event("jira_engineering_issue_created", { severity: issue.severity, reproducible: issue.reproducible });
      toast.success(`Created Jira issue ${key}.`);
    } catch (error) {
      trackN7Event("jira_engineering_issue_create_failed");
      toast.error(error instanceof Error ? error.message : "Jira issue creation failed.");
    }
  }

  async function refreshJira(): Promise<void> {
    if (!jira.projectKey) {
      toast.error("Set a Jira project key first.");
      return;
    }
    setLoading(true);
    try {
      const jql = jira.issuesJql?.trim() ||
        `project = "${jira.projectKey.replace(/"/g, "")}" AND labels = "n7-engineering" ORDER BY updated DESC`;
      const result: any = await jiraBridge({
        data: {
          operation: "search",
          args: {
            cloud_id: jira.cloudId || undefined,
            jql,
            max_results: 100,
            fields: ["summary", "status", "assignee", "priority", "updated", "labels"],
          },
        },
      });
      setJiraIssues(Array.isArray(result?.issues) ? result.issues : []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Jira refresh failed.");
    } finally {
      setLoading(false);
    }
  }

  const gate = [
    ["Problem statement", Boolean(draft.reportedProblem.trim())],
    ["Expected result", Boolean(draft.expected.trim())],
    ["Actual result", Boolean(draft.actual.trim())],
    ["Environment", Boolean(draft.environment.trim())],
    ["Evidence / logs / screenshots", Boolean(draft.evidence.trim())],
    ["Customer impact", Boolean(draft.customerImpact.trim())],
    ["Affected scope", Boolean(draft.affectedUsers.trim())],
    ["Source", Boolean(draft.source.trim())],
    ["Owner", Boolean(draft.owner.trim())],
    ["Reproduction path", draft.reproducible ? Boolean(draft.reproSteps.trim()) : Boolean(draft.notReproducibleReason?.trim())],
  ] as const;

  const jiraColumns = useMemo(() => {
    const groups: Record<DeploymentWorkStatus, any[]> = {
      backlog: [], ready: [], "in-progress": [], blocked: [], review: [], done: [],
    };
    for (const issue of jiraIssues) groups[mapJiraStatus(String(issue?.fields?.status?.name ?? ""))].push(issue);
    return groups;
  }, [jiraIssues]);

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow={ws.customer.name}
        title="Engineering Issues"
        description="Collect the evidence Engineering needs before creating Jira work. Capture reproducible steps whenever possible; if reproduction is not possible, document what was attempted and why."
        actions={<Button variant="outline" onClick={() => void refreshJira()} disabled={loading}>{loading ? "Refreshing…" : "Refresh Jira issues"}</Button>}
      />

      <JiraConfig ws={ws} />

      <Panel title="New engineering issue" subtitle="Do not send a one-line symptom to Engineering. Capture enough context to act without another information-gathering round.">
        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-3">
            <Input value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} placeholder="Short issue summary" />
            <Textarea value={draft.reportedProblem} onChange={(e) => setDraft({ ...draft, reportedProblem: e.target.value })} placeholder="What was the user trying to do? What problem was reported?" />
            <div className="grid gap-2 md:grid-cols-2">
              <Textarea value={draft.expected} onChange={(e) => setDraft({ ...draft, expected: e.target.value })} placeholder="Expected result" />
              <Textarea value={draft.actual} onChange={(e) => setDraft({ ...draft, actual: e.target.value })} placeholder="Actual result" />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Label className="flex items-center gap-2">
                <input type="checkbox" checked={draft.reproducible} onChange={(e) => setDraft({ ...draft, reproducible: e.target.checked })} />
                Reproducible
              </Label>
              <select
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={draft.severity}
                onChange={(e) => setDraft({ ...draft, severity: e.target.value as EngineeringIssueIntake["severity"] })}
              >
                <option value="low">Low severity</option>
                <option value="medium">Medium severity</option>
                <option value="high">High severity</option>
                <option value="critical">Critical severity</option>
              </select>
            </div>
            {draft.reproducible ? (
              <Textarea value={draft.reproSteps} onChange={(e) => setDraft({ ...draft, reproSteps: e.target.value })} placeholder={"Reproduction steps\n1. ...\n2. ...\n3. ..."} />
            ) : (
              <Textarea value={draft.notReproducibleReason ?? ""} onChange={(e) => setDraft({ ...draft, notReproducibleReason: e.target.value })} placeholder="Why can it not currently be reproduced? What was attempted?" />
            )}
            <Textarea value={draft.environment} onChange={(e) => setDraft({ ...draft, environment: e.target.value })} placeholder="Environment: tenant, browser/device, versions, integrations, region, relevant configuration" />
            <Textarea value={draft.evidence} onChange={(e) => setDraft({ ...draft, evidence: e.target.value })} placeholder="Evidence: logs, screenshots, timestamps, request IDs, recordings, links" />
            <div className="grid gap-2 md:grid-cols-2">
              <Textarea value={draft.customerImpact} onChange={(e) => setDraft({ ...draft, customerImpact: e.target.value })} placeholder="Customer impact / business consequence" />
              <Textarea value={draft.affectedUsers} onChange={(e) => setDraft({ ...draft, affectedUsers: e.target.value })} placeholder="Affected users / scope / frequency" />
            </div>
            <div className="grid gap-2 md:grid-cols-3">
              <Input value={draft.workaround} onChange={(e) => setDraft({ ...draft, workaround: e.target.value })} placeholder="Known workaround" />
              <Input value={draft.source} onChange={(e) => setDraft({ ...draft, source: e.target.value })} placeholder="Source: call, ticket, email…" />
              <Input value={draft.owner} onChange={(e) => setDraft({ ...draft, owner: e.target.value })} placeholder="CS / triage owner" />
            </div>
            <Button onClick={saveDraft} disabled={!draft.summary.trim()}>Save intake</Button>
          </div>

          <div className="rounded-md border border-border bg-secondary/30 p-4">
            <div className="label-caps">Engineering intake gate</div>
            <div className="mt-3 space-y-2">
              {gate.map(([label, ok]) => (
                <div key={label} className="flex items-center justify-between gap-3 text-sm">
                  <span>{label}</span>
                  <span className={ok ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}>{ok ? "Ready" : "Missing"}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              CS captures impact and evidence. Engineering/Product still owns technical prioritization and sprint placement.
            </p>
          </div>
        </div>
      </Panel>

      <Panel title="Issue intake queue">
        {issues.length ? (
          <div className="space-y-3">
            {issues.map((issue) => (
              <article key={issue.id} className="rounded-md border border-border p-4">
                <div className="flex flex-wrap items-start gap-2">
                  <strong className="min-w-0 flex-1">{issue.summary}</strong>
                  <span className="rounded-full bg-secondary px-2 py-1 text-[11px]">{issue.status}</span>
                  {issue.jiraKey ? <span className="font-mono text-xs">{issue.jiraKey}</span> : null}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{issue.reportedProblem}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {!issue.jiraKey ? (
                    <Button size="sm" onClick={() => void createJira(issue)} disabled={!issueReady(issue)}>
                      Create Jira issue
                    </Button>
                  ) : null}
                  <ProvenanceTag value={issue.provenance} short />
                </div>
              </article>
            ))}
          </div>
        ) : <EmptyState title="No engineering issues" body="No customer issue is implied until the team records one." />}
      </Panel>

      {jiraIssues.length ? (
        <Panel title="Live Jira issue board" subtitle="Current Jira issues grouped by workflow status inside N7.">
          <div className="grid gap-3 xl:grid-cols-6">
            {DEPLOY_COLUMNS.map((column) => (
              <div key={column.id} className="min-h-40 rounded-lg border border-border bg-secondary/25 p-2">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide">{column.label}</div>
                <div className="space-y-2">{jiraColumns[column.id].map((issue) => <JiraIssueCard key={issue.id ?? issue.key} issue={issue} />)}</div>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
