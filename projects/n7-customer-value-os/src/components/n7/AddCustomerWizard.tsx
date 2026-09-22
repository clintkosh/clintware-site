import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useN7, type NewCustomerInput } from "@/lib/n7/store";
import { cn } from "@/lib/utils";

const STEPS: {
  key: keyof NewCustomerInput | "identity";
  title: string;
  hint: string;
}[] = [
  { key: "identity", title: "Customer", hint: "Name and industry." },
  { key: "businessOutcome", title: "Business outcome", hint: "What did they actually buy?" },
  { key: "baseline", title: "Baseline", hint: "What is today's measured value, and from where?" },
  { key: "target", title: "Target", hint: "The committed improvement and horizon." },
  { key: "users", title: "Users", hint: "Who uses it, and how many?" },
  { key: "useCases", title: "Use cases", hint: "The work being changed." },
  { key: "systems", title: "Systems / integrations", hint: "Comma separated. Connector status is verified later." },
  { key: "stakeholders", title: "Stakeholders", hint: "Comma separated named owners." },
  { key: "implementationTarget", title: "Implementation target", hint: "Planning boundary, not a promise." },
  { key: "successCriteria", title: "Success criteria", hint: "What proves this worked?" },
];

const EMPTY: NewCustomerInput = {
  name: "",
  industry: "",
  businessOutcome: "",
  baseline: "",
  target: "",
  users: "",
  useCases: "",
  systems: "",
  stakeholders: "",
  implementationTarget: "",
  successCriteria: "",
};

const EXAMPLE: NewCustomerInput = {
  name: "Industrial Equipment Manufacturer (Demo #2)",
  industry: "Industrial equipment",
  businessOutcome: "Reduce repeat truck rolls by 30% in Year 1",
  baseline: "Repeat visit rate from the work order system, last 2 quarters",
  target: "30% reduction, measured on median repeat rate",
  users: "220 field engineers and 40 support agents",
  useCases: "First-visit diagnostics, parts identification, escalation avoidance",
  systems: "ServiceNow, SharePoint, Oracle DB, SSO",
  stakeholders: "VP Service Operations, Platform Owner, Data Lead",
  implementationTarget: "Planning boundary W12 pending engineering validation",
  successCriteria: "Repeat visit rate falls with a stable cohort and approved baseline",
};

export function AddCustomerWizard({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<NewCustomerInput>(EMPTY);
  const { addCustomer } = useN7();
  const navigate = useNavigate();

  const current = STEPS[step]!;
  const isLast = step === STEPS.length - 1;

  const canAdvance =
    current.key === "identity" ? form.name.trim().length > 1 : String(form[current.key]).trim().length > 0;

  function set(key: keyof NewCustomerInput, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function finish() {
    const id = addCustomer(form);
    toast.success("Customer workspace created", {
      description: "The reusable operating model was applied to the new customer.",
    });
    setOpen(false);
    setStep(0);
    setForm(EMPTY);
    navigate({ to: "/customers/$customerId/$section", params: { customerId: id, section: "executive-summary" } });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setStep(0);
      }}
    >
      <DialogTrigger asChild>{trigger ?? <Button size="sm">Add customer</Button>}</DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add customer</DialogTitle>
          <DialogDescription>
            The same operating model is applied to every customer: outcome, baseline, target, users,
            use cases, systems, stakeholders, implementation target, success criteria.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-1">
          {STEPS.map((s, i) => (
            <div
              key={s.title}
              className={cn(
                "h-1 flex-1 rounded-full",
                i <= step ? "bg-primary" : "bg-secondary",
              )}
            />
          ))}
        </div>

        <div className="space-y-3 py-2">
          <div>
            <div className="label-caps">
              Step {step + 1} of {STEPS.length}
            </div>
            <h3 className="text-base font-semibold text-foreground">{current.title}</h3>
            <p className="text-xs text-muted-foreground">{current.hint}</p>
          </div>

          {current.key === "identity" ? (
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="cname">Customer name</Label>
                <Input id="cname" value={form.name} onChange={(e) => set("name", e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="cind">Industry</Label>
                <Input
                  id="cind"
                  value={form.industry}
                  onChange={(e) => set("industry", e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="grid gap-1.5">
              <Label htmlFor="field">{current.title}</Label>
              <Textarea
                id="field"
                rows={3}
                value={String(form[current.key])}
                onChange={(e) => set(current.key as keyof NewCustomerInput, e.target.value)}
              />
            </div>
          )}
        </div>

        <DialogFooter className="flex-row justify-between gap-2 sm:justify-between">
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setForm(EXAMPLE);
                toast("Example customer loaded", {
                  description: "Illustrative demo data — edit any step before creating.",
                });
              }}
            >
              Fill example
            </Button>
            {step > 0 ? (
              <Button variant="outline" size="sm" onClick={() => setStep((s) => s - 1)}>
                Back
              </Button>
            ) : null}
          </div>
          <Button
            size="sm"
            disabled={!canAdvance}
            onClick={() => (isLast ? finish() : setStep((s) => s + 1))}
          >
            {isLast ? "Create workspace" : "Next"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}