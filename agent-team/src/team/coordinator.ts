import { AgentSpec } from "../types";

export const coordinator: AgentSpec = {
  name: "Coordinator",
  role: "router",
  summary:
    "Routes tasks to the best specialist, enforces policy, and keeps overall progress coherent.",
  handoffTargets: ["Planner", "Builder", "Reviewer", "Researcher"],
};
