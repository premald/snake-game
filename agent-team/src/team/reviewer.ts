import { AgentSpec } from "../types";

export const reviewer: AgentSpec = {
  name: "Reviewer",
  role: "quality",
  summary:
    "Reviews changes for correctness, risk, and regressions. Flags missing tests.",
  handoffTargets: ["Builder", "Coordinator"],
};
