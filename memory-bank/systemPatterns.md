# System Patterns

## Structure
- `index.html` defines UI and DOM targets.
- `src/main.js` orchestrates game state, input, rendering, and HUD updates.
- `src/snakeGame.js` contains core game logic (state transitions).
- `styles.css` provides UI styling.

## Agent Workflow
- Agents live under `agent-team/` with an SDK runner.
- Workflow: Planner → Builder → Reviewer → Tests.
- Tooling uses `write_file`/`read_file` plus `run_command` (enabled by env flag).
