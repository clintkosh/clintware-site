import { useState } from "react";
import { Pencil, RotateCcw, Save, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Panel, ProvenanceTag } from "@/components/n7/primitives";
import { CUSTOMER_FIELDS, CUSTOMER_FIELD_GROUPS } from "@/lib/n7/field-config";
import { useN7 } from "@/lib/n7/store";
import type { Customer, CustomerWorkspace } from "@/lib/n7/types";

/**
 * Reusable Edit / Save / Cancel surface for the customer record.
 * Seeded case facts stay recoverable: "Restore case fact" reverts a field to
 * the untouched seed value rather than silently keeping an edit.
 */
export function EditableCustomerPanel({ ws }: { ws: CustomerWorkspace }) {
  const { updateCustomer, getBaseline } = useN7();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Customer>(ws.customer);
  const baseline = getBaseline(ws.customer.id)?.customer;
  const isCaseFact = ws.customer.provenance === "case-fact";

  function start() {
    setDraft(ws.customer);
    setEditing(true);
  }

  function save() {
    updateCustomer(ws.customer.id, draft);
    setEditing(false);
    toast.success("Customer record saved", {
      description: isCaseFact
        ? "Edited values are working assumptions. Use Restore case fact to return to the seeded case."
        : "Stored locally in this browser.",
    });
  }

  return (
    <Panel
      title="Customer record"
      subtitle="Every field here is editable. Field definitions are configuration-driven, so new fields are added without touching this page."
      right={
        editing ? (
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              <X className="mr-1 size-3.5" /> Cancel
            </Button>
            <Button size="sm" onClick={save}>
              <Save className="mr-1 size-3.5" /> Save
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={start}>
            <Pencil className="mr-1 size-3.5" /> Edit
          </Button>
        )
      }
    >
      {isCaseFact ? (
        <p className="mb-4 rounded-md border border-border border-l-4 border-l-warning bg-assumption/30 p-3 text-xs leading-relaxed text-foreground/90">
          This customer is the authoritative case. Editing a case fact does not rewrite the case —
          the seeded value stays available and any edit is treated as a working assumption.
        </p>
      ) : null}

      <div className="space-y-5">
        {CUSTOMER_FIELD_GROUPS.map((group) => (
          <div key={group}>
            <div className="label-caps mb-2">{group}</div>
            <div className="grid gap-3 md:grid-cols-2">
              {CUSTOMER_FIELDS.filter((f) => f.group === group).map((f) => {
                const value = String((editing ? draft : ws.customer)[f.key] ?? "");
                const changed = baseline ? String(baseline[f.key] ?? "") !== String(ws.customer[f.key] ?? "") : false;
                return (
                  <div key={f.key} className="grid gap-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor={`cf-${f.key}`}>{f.label}</Label>
                      {changed ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                          onClick={() => {
                            updateCustomer(ws.customer.id, { [f.key]: baseline![f.key] } as Partial<Customer>);
                            setDraft((d) => ({ ...d, [f.key]: baseline![f.key] }));
                            toast("Case fact restored");
                          }}
                        >
                          <RotateCcw className="size-3" /> Restore case fact
                        </button>
                      ) : null}
                    </div>
                    {!editing ? (
                      <p className="rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm text-foreground/90">
                        {value || <span className="text-muted-foreground">Not set</span>}
                      </p>
                    ) : f.type === "textarea" ? (
                      <Textarea
                        id={`cf-${f.key}`}
                        rows={3}
                        value={value}
                        onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                      />
                    ) : f.type === "select" ? (
                      <select
                        id={`cf-${f.key}`}
                        value={value}
                        onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                      >
                        {f.options?.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        id={`cf-${f.key}`}
                        value={value}
                        onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                      />
                    )}
                    {f.hint ? <p className="text-[11px] text-muted-foreground">{f.hint}</p> : null}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2">
        <ProvenanceTag value={ws.customer.provenance} />
        <span className="text-xs text-muted-foreground">
          Edits persist locally in this browser only.
        </span>
      </div>
    </Panel>
  );
}