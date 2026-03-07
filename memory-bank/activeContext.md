# Active Context

## Current Focus
Agent-driven feature work and validation flow (plan → build → review → test).

## Recent Decisions
- Player name is required before gameplay.
- Name is stored in sessionStorage for the session scope.
- Status text shows "Enter name to start" until name is set.
- Added a settings panel for speed, grid size, swipe toggle, and sound toggle.
- Settings are validated and persisted in localStorage with safe fallback behavior.
- Grid size changes apply by restarting the round on apply/reset.
- Added Change Player flow via reusable name overlay, which pauses gameplay while prompting.
- Added player selection/add flow that prevents duplicate player identities in-session.
- Session leaderboard now tracks per-player best score and games played (not per-run rows).

## Open Items
- Consider adding persistent top-10 leaderboard storage beyond session scope.
