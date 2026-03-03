# Active Context

## Current Focus
Agent-driven feature work and validation flow (plan → build → review → test).

## Recent Decisions
- Player name is required before gameplay.
- Name is stored in sessionStorage for the session scope.
- Status text shows "Enter name to start" until name is set.

## Open Items
- Consider adding a "Change Player" button.
- Consider storage access hardening for localStorage (high score) similar to sessionStorage.
