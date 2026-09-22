import { MeetingPrepPage } from "@/components/n7/MeetingBrief";
import type { CustomerWorkspace } from "@/lib/n7/types";
import { AssumptionChange, ExecutiveSummary } from "./FrameSections";
import { CriticalPath, Governance, Implementation, RisksDecisions } from "./PlanSections";
import { ExecutiveQBR, KPIContract, ROIWorkshop } from "./ValueSections";
import { AccuracyTriage, Documents } from "./TechSections";
import { Evidence, Messaging, ReadinessGate } from "./SystemSections";
import { EnvironmentMapper } from "./EnvironmentMapper";
import { DeploymentBoard, EngineeringIssues, RolloutSprints } from "./OperationsSections";
import { LiveAssist, LivePrompt } from "./LiveSections";

export const SECTION_COMPONENTS: Record<string, (props: { ws: CustomerWorkspace }) => React.ReactElement> = {
  "executive-summary": ExecutiveSummary,
  implementation: Implementation,
  "deployment-board": DeploymentBoard,
  "rollout-sprints": RolloutSprints,
  "engineering-issues": EngineeringIssues,
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
  "meeting-prep": MeetingPrepPage,
  "live-prompt": LivePrompt,
  "live-assist": LiveAssist,
  "assumption-change": AssumptionChange,
  evidence: Evidence,
};