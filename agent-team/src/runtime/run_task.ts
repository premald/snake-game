import { runTeamTask } from "./agents_sdk";

const input = process.argv.slice(2).join(" ").trim();

if (!input) {
  console.error("Usage: npm run run:task -- \"your task\"");
  process.exit(1);
}

const approveAll = process.env.AGENT_TEAM_APPROVE_ALL === "true";

async function main() {
  const result = await runTeamTask(
    input,
    approveAll
      ? async () => "approve"
      : undefined
  );

  if (result.interruptions?.length) {
    console.log("Run paused for approvals:");
    for (const interruption of result.interruptions) {
      console.log(`- ${interruption.type}`);
    }
  }

  console.log("Final output:");
  console.log(result.finalOutput ?? result.output ?? "(no output)");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
