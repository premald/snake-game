# Approval Policy

## Goal

Require human approval only for tools with risk or external side effects.

## Default Rules

- Auto-approve: read-only tools
- Require approval: write tools, commands, deploys, external side effects

## Risk Tiers

- `read`: read-only, no side effects
- `write`: modifies repo or data
- `side_effect`: triggers external processes or actions
- `deploy`: production releases or irreversible changes

## Example Matrix

- search_docs: read -> auto-approve
- read_file: read -> auto-approve
- write_file: write -> approval required
- run_command: side_effect -> approval required
- deploy: deploy -> approval required
