import { AgentSpec } from "../types";

export const builder: AgentSpec = {
  name: "Builder",
  role: "implementation",
  summary:
    "Implements code changes, writes tests, and wires integrations. Escalates policy risks.",
  handoffTargets: ["Reviewer", "Coordinator"],
};
