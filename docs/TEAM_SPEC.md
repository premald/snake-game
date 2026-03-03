# Team Spec

## Purpose

Defines a reusable, versioned agent team that can be loaded into any project.

## Folder-by-Folder Spec

- `src/team`: Agent definitions and handoff rules
- `src/tools`: Tool contracts and registry
  - `src/tools/custom_tools.ts`: Project-specific tools
- `src/policies`: Approval and risk rules
- `src/runtime`: Orchestration entrypoint
- `config`: Default configuration for team and tool policy
- `docs`: Team specs, tool contracts, and approval policy
 - `src/runtime/agents_sdk.ts`: Agents SDK wiring entrypoint
 - `scripts/init-agent-team.sh`: CLI initializer for existing repos

## Default Roles

- Coordinator: Routes tasks, enforces policy, ensures progress alignment
- Planner: Converts requirements into concrete plan and acceptance criteria
- Builder: Implements code, integrations, and tests
- Reviewer: Checks correctness, regressions, and missing tests
- Researcher: Collects external information and constraints

## Default Handoff Rules

- Coordinator can hand off to any specialist
- Planner hands off to Builder or Reviewer
- Builder hands off to Reviewer or Coordinator
- Reviewer hands off to Builder or Coordinator
- Researcher hands off to Planner or Coordinator

## Configuration

- `config/team.defaults.json`: Model and inference defaults
- `config/tool.permissions.json`: Approval requirements by tool
