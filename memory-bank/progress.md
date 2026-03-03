# Progress

## Completed
- Added high score tracking with localStorage.
- Added player name overlay (sessionStorage).
- HUD shows player name, score, high score.
- Game blocks input and ticking until player name is set.
- Status text updated to "Enter name to start" when name missing.
- Tests pass (`npm test`).

## Notable Notes
- sessionStorage access is wrapped in try/catch to handle restricted environments.

## Known Gaps
- localStorage for high score is not try/catch guarded.
- Small-grid edge case in `createInitialState` (pre-existing).
