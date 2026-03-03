# Agent Team Template

A reusable, versioned multi-agent team you can drop into any project. This template is designed to be the first artifact in a new repo so you always start with the same team and tool policy.

## What This Provides

- A default agent team: Coordinator, Planner, Builder, Reviewer, Researcher
- A tool registry with JSON Schema tool contracts
- A selective approval policy for higher-risk tools
- A minimal orchestration entrypoint

## Folder Overview

- `src/team`: Agent role definitions and handoff logic
- `src/tools`: Tool contracts and registry
  - Add project-specific tools in `src/tools/custom_tools.ts`
- `src/policies`: Approval policies for tool calls
- `src/runtime`: Orchestration entrypoint
- `config`: Default config for team + tool permissions

## How To Use This Template

1. Create a new repo from this template (or copy the folder into a new repo).
2. Implement project-specific tools in `src/tools`.
3. Update tool permissions in `config/tool.permissions.json`.
4. Update team defaults in `config/team.defaults.json` if needed.
5. Wire `src/runtime/orchestrator.ts` into your app entrypoint.

## CLI Initializer

Use `scripts/init-agent-team.sh` to copy the team scaffold into an existing repo.

Example:

```bash
./scripts/init-agent-team.sh /path/to/target-repo
```

Notes:

- Existing files are not overwritten.
- `README.md` and `tsconfig.json` are copied as `README.agent-team.md` and `tsconfig.agent-team.json` to avoid conflicts.

## Agents SDK Wiring

This template includes an Agents SDK wiring entrypoint at `src/runtime/agents_sdk.ts`.

Setup:

1. Install the SDK: `npm install @openai/agents`
2. Set `OPENAI_API_KEY` in your environment.
3. Update `config/team.defaults.json` with a model your account can access.

Usage:

- Call `runTeamTask(\"your task\")` from `src/runtime/agents_sdk.ts` to run the coordinator.
- If a tool requires approval, pass an approval handler to `runTeamTask(input, onApproval)`.

Tool execution defaults:

- `read_file` and `search_docs` are implemented for local repo reads.
- `write_file` writes to disk (approval required).
- `run_command` is disabled unless `AGENT_TEAM_ENABLE_RUN_COMMAND=true`.
- `deploy` returns a not-wired error (project-specific).
- Add project-specific tools in `src/tools/custom_tools.ts` and include them in the registry.

## Opinionated Defaults

- Selective human approvals:
  - Auto-approve read-only tools
  - Require approval for writes, external side effects, deployments
- Clear role boundaries and explicit handoffs

## Notes

This template is implementation-light on purpose. It defines the boundaries, contracts, and decision logic so you can wire it to the OpenAI Agents SDK in your stack.
