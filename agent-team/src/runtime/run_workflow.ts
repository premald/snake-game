import { Agent, run } from "@openai/agents";
import { createAgents } from "./agents_sdk";
import { TeamConfig } from "../types";
import { loadDefaults } from "./orchestrator";
import { executeReadTool } from "../tools/read_tools";

type StepResult = {
  label: string;
  output: string;
};

async function runWithApprovals(agent: Agent<unknown, any>, input: string) {
  let result = await run(agent, input);
  while (result.interruptions?.length) {
    for (const interruption of result.interruptions) {
      if (interruption.type !== "tool_approval_item") {
        continue;
      }
      result.state.approve(interruption, { alwaysApprove: false });
    }
    result = await run(agent, result.state);
  }
  return result;
}

function formatStep(label: string, output: string) {
  return { label, output: output ?? "(no output)" };
}

function taskPrompt(config: TeamConfig) {
  return [
    "Task: Add a player name feature with UI to ask for the name and store it for the session.",
    "Requirements:",
    "- Add UI to collect player name before gameplay.",
    "- Store name in sessionStorage and reuse it for the session.",
    "- Show the current player name in the HUD.",
    "- Use write_file tool to modify files; do not just describe changes.",
    `Repo root is set via AGENT_TEAM_REPO_ROOT. Model: ${config.defaultModel}.`,
  ].join("\n");
}

async function loadMemoryBank() {
  const files = [
    "memory-bank/projectbrief.md",
    "memory-bank/productContext.md",
    "memory-bank/activeContext.md",
    "memory-bank/systemPatterns.md",
    "memory-bank/techContext.md",
    "memory-bank/progress.md",
  ];

  const sections: string[] = [];
  for (const file of files) {
    const result = await executeReadTool("read_file", { path: file });
    if (result.ok && result.data && typeof result.data === "object") {
      const data = result.data as { content?: string };
      if (data.content) {
        sections.push(`## ${file}\n${data.content}`);
        continue;
      }
    }
    sections.push(`## ${file}\n(Unavailable or empty)`);
  }

  return sections.join("\n\n");
}

async function main() {
  const { teamConfig } = loadDefaults();
  const { coordinator, planner, builder, reviewer } = createAgents();

  const steps: StepResult[] = [];
  const prompt = taskPrompt(teamConfig);
  const memoryContext = await loadMemoryBank();
  const contextBlock = `\n\n== Memory Bank Context ==\n${memoryContext}\n`;

  console.log("== Agent Workflow Start ==");

  console.log("\n[Planner] Creating plan...");
  const planResult = await runWithApprovals(
    planner,
    `${prompt}\nReturn a step-by-step plan with files to change.${contextBlock}`
  );
  steps.push(formatStep("Planner", String(planResult.finalOutput ?? "")));

  console.log("\n[Builder] Implementing changes...");
  const buildResult = await runWithApprovals(
    builder,
    `${prompt}\nUse the plan above and implement the changes now.${contextBlock}`
  );
  steps.push(formatStep("Builder", String(buildResult.finalOutput ?? "")));

  console.log("\n[Reviewer] Reviewing changes...");
  const reviewResult = await runWithApprovals(
    reviewer,
    "Review the recent changes for correctness, missing edge cases, and UX. " +
      "If issues are found, provide specific file/line guidance." +
      contextBlock
  );
  steps.push(formatStep("Reviewer", String(reviewResult.finalOutput ?? "")));

  console.log("\n[Coordinator] Running tests via run_command...");
  const testResult = await runWithApprovals(
    coordinator,
    "Run tests using run_command with `npm test` from the repo root. " +
      "Report the output and whether tests passed."
  );
  steps.push(formatStep("Tests", String(testResult.finalOutput ?? "")));

  console.log("\n[Coordinator] Updating memory bank progress log...");
  const logResult = await runWithApprovals(
    coordinator,
    "Update memory-bank/progress.md with a short entry under 'Agent Workflow Log' " +
      "describing this workflow (plan/build/review/test) and the files touched. " +
      "Use read_file to fetch the current file and write_file to update it."
  );
  steps.push(formatStep("Memory Log", String(logResult.finalOutput ?? "")));

  console.log("\n== Agent Workflow Summary ==");
  for (const step of steps) {
    console.log(`\n--- ${step.label} ---\n${step.output}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
