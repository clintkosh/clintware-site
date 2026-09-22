import type { CustomerWorkspace } from "@/lib/n7/types";
import { AssumptionChange, ExecutiveSummary } from "./FrameSections";
import { CriticalPath, Governance, Implementation, RisksDecisions } from "./PlanSections";
import { ExecutiveQBR, KPIContract, ROIWorkshop } from "./ValueSections";
import { AccuracyTriage, Documents, VirtualLiaison } from "./TechSections";
import { Evidence, Messaging, ReadinessGate } from "./SystemSections";
import { EnvironmentMapper } from "./EnvironmentMapper";

export const SECTION_COMPONENTS: Record<string, (props: { ws: CustomerWorkspace }) => React.ReactElement> = {
  "executive-summary": ExecutiveSummary,
  implementation: Implementation,
  "critical-path": CriticalPath,
  "risks-decisions": RisksDecisions,
  raci: Governance,
  environment: EnvironmentMapper,
  documents: Documents,
  messaging: Messaging,
  "roi-workshop": ROIWorkshop,
  "kpi-contract": KPIContract,
  "accuracy-triage": AccuracyTriage,
  "executive-qbr": ExecutiveQBR,
  "readiness-gate": ReadinessGate,
  "virtual-liaison": VirtualLiaison,
  "assumption-change": AssumptionChange,
  evidence: Evidence,
};