import { Agent, run, tool, RunState } from "@openai/agents";
import { team } from "../team";
import { AgentSpec, ToolPermissions, ToolSpec } from "../types";
import { loadDefaults } from "./orchestrator";
import { toolRegistry } from "../tools/tool_registry";
import { requiresApproval } from "../policies/approval_policy";
import { executeReadTool } from "../tools/read_tools";
import { executeWriteTool } from "../tools/write_tools";
import { executeCustomTool } from "../tools/custom_tools";

function buildInstructions(spec: AgentSpec) {
  return [
    `Role: ${spec.role}.`,
    spec.summary,
    "If you need a specialist, hand off to the appropriate agent.",
  ].join(" ");
}

export function createAgents() {
  const { toolPermissions, teamConfig } = loadDefaults();
  const tools = createFunctionTools(toolPermissions);
  const model = teamConfig.defaultModel;
  const modelSettings = { temperature: teamConfig.temperature };

  const planner = new Agent({
    name: team.planner.name,
    instructions: buildInstructions(team.planner),
    tools,
    model,
    modelSettings,
  });

  const builder = new Agent({
    name: team.builder.name,
    instructions: buildInstructions(team.builder),
    tools,
    model,
    modelSettings,
  });

  const reviewer = new Agent({
    name: team.reviewer.name,
    instructions: buildInstructions(team.reviewer),
    tools,
    model,
    modelSettings,
  });

  const researcher = new Agent({
    name: team.researcher.name,
    instructions: buildInstructions(team.researcher),
    tools,
    model,
    modelSettings,
  });

  const coordinator = new Agent({
    name: team.coordinator.name,
    instructions: buildInstructions(team.coordinator),
    handoffs: [planner, builder, reviewer, researcher],
    tools,
    model,
    modelSettings,
  });

  return { coordinator, planner, builder, reviewer, researcher };
}

function createFunctionTools(toolPermissions: ToolPermissions) {
  return toolRegistry.map((spec) =>
    tool({
      name: spec.name,
      description: spec.description,
      parameters: spec.inputSchema as any,
      needsApproval: async () =>
        requiresApproval(spec, toolPermissions).requiresApproval,
      execute: async (input) =>
        dispatchToolExecution(spec, input as Record<string, unknown>),
    })
  );
}

async function dispatchToolExecution(spec: ToolSpec, input: Record<string, unknown>) {
  if (spec.riskTier === "read") {
    const readResult = await executeReadTool(spec.name, input);
    if (readResult.ok || !readResult.error?.startsWith("Unknown read tool")) {
      return readResult;
    }
    return executeCustomTool(spec.name, input);
  }
  const writeResult = await executeWriteTool(spec.name, input);
  if (writeResult.ok || !writeResult.error?.startsWith("Unknown write tool")) {
    return writeResult;
  }
  return executeCustomTool(spec.name, input);
}

export type ApprovalHandler = (interruption: any) => Promise<"approve" | "reject">;

export async function runTeamTask(
  input: string,
  onApproval?: ApprovalHandler
): Promise<any> {
  const { coordinator } = createAgents();

  let result = await run(coordinator, input);

  if (!onApproval) {
    return result;
  }

  while (result.interruptions?.length) {
    for (const interruption of result.interruptions) {
      if (interruption.type !== "tool_approval_item") {
        continue;
      }
      const decision = await onApproval(interruption);
      if (decision === "approve") {
        result.state.approve(interruption, { alwaysApprove: false });
      } else {
        result.state.reject(interruption, { alwaysReject: false });
      }
    }
    result = await run(coordinator, result.state);
  }

  return result;
}

export async function resumeRun(
  agent: Agent<unknown, any>,
  serializedState: string
) {
  const state = await RunState.fromString(agent, serializedState);
  return run(agent, state);
}
