import { ToolSpec, ToolResult } from "../types";

export const customTools: ToolSpec[] = [];

export async function executeCustomTool(
  toolName: string,
  input: Record<string, unknown>
): Promise<ToolResult> {
  return {
    ok: false,
    error: `Custom tool not wired. Tried ${toolName} with ${JSON.stringify(input)}`,
  };
}
