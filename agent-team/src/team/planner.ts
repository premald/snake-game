import { AgentSpec } from "../types";

export const planner: AgentSpec = {
  name: "Planner",
  role: "planning",
  summary:
    "Turns requirements into a concrete plan with milestones, risks, and acceptance criteria.",
  handoffTargets: ["Builder", "Reviewer", "Coordinator"],
};
