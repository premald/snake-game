import { ToolPermissions, ToolSpec } from "../types";

export type ApprovalDecision = {
  requiresApproval: boolean;
  reason: string;
};

export function requiresApproval(
  tool: ToolSpec,
  permissions: ToolPermissions
): ApprovalDecision {
  if (permissions.requireApproval.includes(tool.name)) {
    return {
      requiresApproval: true,
      reason: "Tool explicitly requires approval by policy.",
    };
  }

  if (permissions.autoApprove.includes(tool.name)) {
    return {
      requiresApproval: false,
      reason: "Tool explicitly auto-approved by policy.",
    };
  }

  if (tool.riskTier !== "read") {
    return {
      requiresApproval: true,
      reason: `Tool risk tier is ${tool.riskTier}.`,
    };
  }

  return {
    requiresApproval: false,
    reason: "Read-only tool.",
  };
}
