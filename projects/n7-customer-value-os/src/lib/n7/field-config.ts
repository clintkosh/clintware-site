/**
 * Configuration-driven field definitions.
 *
 * Adding a new editable field is a data change here, not a page change. Fields
 * marked caseFactProtected require an explicit confirmation before a seeded
 * case fact can be altered, and the original value stays available from the
 * untouched seed baseline in the store.
 */
import type { Customer } from "./types";

export interface FieldDef<T> {
  key: keyof T & string;
  label: string;
  hint?: string;
  type: "text" | "textarea" | "select";
  options?: readonly string[];
  group: string;
}

export const CUSTOMER_FIELDS: FieldDef<Customer>[] = [
  { key: "name", label: "Customer name", type: "text", group: "Profile" },
  { key: "industry", label: "Industry", type: "text", group: "Profile" },
  {
    key: "health",
    label: "Health",
    type: "select",
    options: ["on-track", "watch", "at-risk", "critical"],
    group: "Status",
  },
  {
    key: "stage",
    label: "Implementation stage",
    type: "select",
    options: ["discovery", "design", "build", "test", "uat", "launch", "hypercare", "bau"],
    group: "Status",
  },
  {
    key: "targetOutcome",
    label: "Business outcome",
    hint: "What the customer actually bought.",
    type: "textarea",
    group: "Outcome",
  },
  { key: "users", label: "Users", type: "text", group: "Outcome" },
  {
    key: "nextMilestone",
    label: "Next milestone",
    type: "text",
    group: "Plan",
  },
  { key: "nextExecutiveTouch", label: "Next executive touch", type: "text", group: "Plan" },
  {
    key: "headline",
    label: "Headline / current position",
    type: "textarea",
    group: "Plan",
  },
];

export const CUSTOMER_FIELD_GROUPS = ["Profile", "Status", "Outcome", "Plan"];