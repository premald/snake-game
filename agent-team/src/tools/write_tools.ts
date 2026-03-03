import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { ToolSpec, ToolResult } from "../types";
import { getRepoRoot, resolveRepoPath } from "./path_utils";

export const writeTools: ToolSpec[] = [
  {
    name: "write_file",
    description: "Write or update a file in the repository.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Repo-relative path" },
        content: { type: "string", description: "Full file content" },
      },
      required: ["path", "content"],
      additionalProperties: false,
    },
    riskTier: "write",
  },
  {
    name: "run_command",
    description: "Execute a local command in the repo environment.",
    inputSchema: {
      type: "object",
      properties: {
        command: { type: "string", description: "Shell command" },
      },
      required: ["command"],
      additionalProperties: false,
    },
    riskTier: "side_effect",
  },
  {
    name: "deploy",
    description: "Trigger a deployment or release pipeline.",
    inputSchema: {
      type: "object",
      properties: {
        target: { type: "string", description: "Deployment target" },
        version: { type: "string", description: "Version or tag" },
      },
      required: ["target", "version"],
      additionalProperties: false,
    },
    riskTier: "deploy",
  },
];

const execAsync = promisify(exec);

export async function executeWriteTool(
  toolName: string,
  input: Record<string, unknown>
): Promise<ToolResult> {
  if (toolName === "write_file") {
    const relativePath = String(input.path ?? "");
    const content = String(input.content ?? "");
    if (!relativePath) {
      return { ok: false, error: "write_file requires a path." };
    }
    const filePath = resolveRepoPath(relativePath);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, "utf-8");
    return { ok: true, data: { path: relativePath, bytesWritten: content.length } };
  }

  if (toolName === "run_command") {
    if (process.env.AGENT_TEAM_ENABLE_RUN_COMMAND !== "true") {
      return {
        ok: false,
        error:
          "run_command is disabled. Set AGENT_TEAM_ENABLE_RUN_COMMAND=true to enable.",
      };
    }
    const command = String(input.command ?? "");
    if (!command) {
      return { ok: false, error: "run_command requires a command string." };
    }
    const repoRoot = getRepoRoot();
    const { stdout, stderr } = await execAsync(command, {
      cwd: repoRoot,
      timeout: 120000,
      maxBuffer: 1024 * 1024,
    });
    return { ok: true, data: { stdout, stderr } };
  }

  if (toolName === "deploy") {
    return { ok: false, error: "deploy is not wired for this project." };
  }

  return { ok: false, error: `Unknown write tool: ${toolName}` };
}
