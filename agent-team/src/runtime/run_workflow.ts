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

async function bestEffort(label: string, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (error) {
    console.warn(`Warning: ${label} failed`, error);
  }
}

function taskPrompt(config: TeamConfig, task: string) {
  return [
    `Task: ${task}`,
    "Requirements:",
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

  const task = process.argv.slice(2).join(" ").trim();
  if (!task) {
    console.error("Usage: npm run run:workflow -- \"your task\"");
    process.exit(1);
  }

  const steps: StepResult[] = [];
  const prompt = taskPrompt(teamConfig, task);
  const memoryContext = await loadMemoryBank();
  const contextBlock = `\n\n== Memory Bank Context ==\n${memoryContext}\n`;

  console.log("== Agent Workflow Start ==");

  console.log("\n[Planner] Creating plan...");
  const planResult = await runWithApprovals(
    planner,
    `${prompt}\nReturn a step-by-step plan with files to change.${contextBlock}`
  );
  steps.push(formatStep("Planner", String(planResult.finalOutput ?? "")));

  console.log("\n[Coordinator] Persisting plan to memory bank...");
  await bestEffort("Persist plan", async () => {
    const planPersistResult = await runWithApprovals(
      coordinator,
      "Update memory-bank/activeContext.md with the latest requirements and plan from the Planner output. " +
        "Keep it concise and preserve unrelated sections. " +
        "Use read_file to fetch the file and write_file to update it."
    );
    steps.push(formatStep("Plan Log", String(planPersistResult.finalOutput ?? "")));
  });

  await bestEffort("Update planned features", async () => {
    const featurePlanResult = await runWithApprovals(
      coordinator,
      "Update memory-bank/features.md: add the new feature(s) from this task under 'Planned' " +
        "if they are not already listed. Preserve existing items. " +
        "Use read_file then write_file."
    );
    steps.push(formatStep("Feature Plan Log", String(featurePlanResult.finalOutput ?? "")));
  });

  console.log("\n[Builder] Implementing changes...");
  const buildResult = await runWithApprovals(
    builder,
    `${prompt}\nUse the plan above and implement the changes now.${contextBlock}`
  );
  steps.push(formatStep("Builder", String(buildResult.finalOutput ?? "")));

  console.log("\n[Coordinator] Logging build summary...");
  await bestEffort("Build log", async () => {
    const buildPersistResult = await runWithApprovals(
      coordinator,
      "Append a short build summary to memory-bank/progress.md under 'Agent Workflow Log'. " +
        "Include date, task summary, and files changed. " +
        "Use read_file to fetch and write_file to update."
    );
    steps.push(formatStep("Build Log", String(buildPersistResult.finalOutput ?? "")));
  });

  await bestEffort("Update implemented features", async () => {
    const featureDoneResult = await runWithApprovals(
      coordinator,
      "Update memory-bank/features.md: move any features from 'Planned' to 'Implemented' " +
        "that were completed in this task. Preserve existing items. " +
        "Use read_file then write_file."
    );
    steps.push(formatStep("Feature Done Log", String(featureDoneResult.finalOutput ?? "")));
  });

  console.log("\n[Reviewer] Reviewing changes...");
  const reviewResult = await runWithApprovals(
    reviewer,
    "Review the recent changes for correctness, missing edge cases, and UX. " +
      "If issues are found, provide specific file/line guidance." +
      contextBlock
  );
  steps.push(formatStep("Reviewer", String(reviewResult.finalOutput ?? "")));

  console.log("\n[Coordinator] Logging review notes...");
  await bestEffort("Review log", async () => {
    const reviewPersistResult = await runWithApprovals(
      coordinator,
      "Append reviewer notes to memory-bank/progress.md under 'Agent Workflow Log'. " +
        "Keep it short and reference any required follow-ups. " +
        "Use read_file to fetch and write_file to update."
    );
    steps.push(formatStep("Review Log", String(reviewPersistResult.finalOutput ?? "")));
  });

  console.log("\n[Coordinator] Running tests via run_command...");
  const testResult = await runWithApprovals(
    coordinator,
    "Run tests using run_command with `npm test` from the repo root. " +
      "Report the output and whether tests passed."
  );
  steps.push(formatStep("Tests", String(testResult.finalOutput ?? "")));

  await bestEffort("Update test backlog", async () => {
    const testBacklogResult = await runWithApprovals(
      coordinator,
      "If this task added a feature or fixed a bug, update memory-bank/testBacklog.md with " +
        "new or adjusted test cases. Otherwise, make no changes. " +
        "Use read_file then write_file."
    );
    steps.push(formatStep("Test Backlog Log", String(testBacklogResult.finalOutput ?? "")));
  });

  console.log("\n[Coordinator] Updating memory bank progress log...");
  await bestEffort("Workflow log", async () => {
    const logResult = await runWithApprovals(
      coordinator,
      "Update memory-bank/progress.md with a short entry under 'Agent Workflow Log' " +
        "describing this workflow (plan/build/review/test) and the files touched. " +
        "Use read_file to fetch the current file and write_file to update it."
    );
    steps.push(formatStep("Memory Log", String(logResult.finalOutput ?? "")));
  });

  console.log("\n== Agent Workflow Summary ==");
  for (const step of steps) {
    console.log(`\n--- ${step.label} ---\n${step.output}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
