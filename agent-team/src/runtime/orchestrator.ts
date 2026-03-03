import fs from "fs";
import path from "path";
import { team } from "../team";
import { toolRegistry } from "../tools/tool_registry";
import { TeamConfig, ToolPermissions } from "../types";
import { requiresApproval } from "../policies/approval_policy";

function readJsonFile<T>(filePath: string): T {
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

export function loadDefaults() {
  const configDir = path.resolve(__dirname, "..", "..", "config");
  const teamConfig = readJsonFile<TeamConfig>(
    path.join(configDir, "team.defaults.json")
  );
  const toolPermissions = readJsonFile<ToolPermissions>(
    path.join(configDir, "tool.permissions.json")
  );

  return { teamConfig, toolPermissions };
}

export function getTeamSummary() {
  return Object.values(team).map((agent) => ({
    name: agent.name,
    role: agent.role,
    summary: agent.summary,
    handoffTargets: agent.handoffTargets,
  }));
}

export function getToolPolicySummary(toolPermissions: ToolPermissions) {
  return toolRegistry.map((tool) => ({
    name: tool.name,
    riskTier: tool.riskTier,
    approval: requiresApproval(tool, toolPermissions),
  }));
}

export function runTeam() {
  const { teamConfig, toolPermissions } = loadDefaults();

  return {
    team: getTeamSummary(),
    tools: getToolPolicySummary(toolPermissions),
    config: teamConfig,
  };
}
