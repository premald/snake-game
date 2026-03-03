import { AgentSpec } from "../types";

export const researcher: AgentSpec = {
  name: "Researcher",
  role: "research",
  summary:
    "Finds relevant documentation, requirements, and constraints. Summarizes with citations.",
  handoffTargets: ["Planner", "Coordinator"],
};
