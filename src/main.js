import {
  DEFAULT_GRID_SIZE,
  DIRECTIONS,
  createInitialState,
  setDirection,
  stepGame,
  togglePause
} from "./snakeGame.js";

const PLAYER_NAME_KEY = "snake.playerName";
const HIGH_SCORE_KEY = "snake.highScore";
const SETTINGS_KEY = "snake.settings";
const SESSION_LEADERBOARD_KEY = "snake.sessionLeaderboard";
const SWIPE_MIN_DISTANCE = 24;
const STATUS_NOTE_DURATION_MS = 2600;
const MAX_LEADERBOARD_ITEMS = 5;
const MAX_LEADERBOARD_STORAGE_ITEMS = 50;

const DEFAULT_SETTINGS = Object.freeze({
  speed: "normal",
  gridSize: "medium",
  swipeEnabled: true,
  soundEnabled: false
});

const SPEED_TO_TICK_MS = {
  slow: 220,
  normal: 150,
  fast: 100
};

const GRID_SIZE_TO_CELLS = {
  small: 16,
  medium: DEFAULT_GRID_SIZE,
  large: 24
};

const gridEl = document.getElementById("game-grid");
const scoreEl = document.getElementById("score");
const highScoreEl = document.getElementById("high-score");
const statusEl = document.getElementById("status");
const playerNameEl = document.getElementById("player-name");
const pauseBtn = document.getElementById("pause-btn");
const restartBtn = document.getElementById("restart-btn");
const changePlayerBtn = document.getElementById("change-player-btn");
const leaderboardListEl = document.getElementById("session-leaderboard");
const leaderboardEmptyEl = document.getElementById("leaderboard-empty");
const nameOverlayEl = document.getElementById("name-overlay");
const nameFormEl = document.getElementById("name-form");
const nameModalTitleEl = document.getElementById("player-modal-title");
const existingPlayerGroupEl = document.getElementById("existing-player-group");
const existingPlayerSelectEl = document.getElementById("existing-player-select");
const usePlayerBtn = document.getElementById("use-player-btn");
const nameInputEl = document.getElementById("player-name-input");
const addPlayerBtn = document.getElementById("add-player-btn");
const speedSelectEl = document.getElementById("setting-speed");
const gridSizeSelectEl = document.getElementById("setting-grid-size");
const swipeToggleEl = document.getElementById("setting-swipe");
const soundToggleEl = document.getElementById("setting-sound");
const settingsApplyBtn = document.getElementById("settings-apply-btn");
const settingsResetBtn = document.getElementById("settings-reset-btn");

let localStorageAvailable = true;
let sessionStorageAvailable = true;
let settings = loadSettings();
let state = createInitialState({ gridSize: resolveGridSize(settings.gridSize) });
let queuedDirection = null;
let highScore = loadHighScore();
let playerName = loadPlayerName();
let sessionPlayers = loadSessionPlayers();
let touchStartX = null;
let touchStartY = null;
let statusNote = "";
let statusNoteExpiresAt = 0;
let audioContext = null;
let isNamePromptOpen = false;
let nameFlowMode = "start";

if (playerName) {
  const profile = ensurePlayerProfile(playerName);
  playerName = profile.playerName;
  savePlayerName(playerName);
}

rebuildGrid(state.gridSize);
setupPlayerName();
setupSettingsPanel();
setupSwipeControls();
setupInputControls();
render();
queueNextTick();

// Prime audio context on first pointer interaction when sound is enabled later.
document.addEventListener(
  "pointerdown",
  () => {
    ensureAudioContext();
  },
  { once: true }
);

function queueNextTick() {
  window.setTimeout(runTick, getTickMs(settings.speed));
}

function runTick() {
  if (playerName && !isNamePromptOpen) {
    if (queuedDirection) {
      state = setDirection(state, queuedDirection);
      queuedDirection = null;
    }

    const prevState = state;
    state = stepGame(state);
    handleStateTransition(prevState, state);
  }

  render();
  queueNextTick();
}

function setupPlayerName() {
  addPlayerBtn.addEventListener("click", () => {
    const raw = nameInputEl.value;
    const normalized = sanitizePlayerName(raw);
    if (!normalized) {
      setStatusNote("Enter a valid player name.");
      render();
      return;
    }

    const existing = findPlayerById(toPlayerId(normalized));
    if (existing) {
      activatePlayer(existing.playerId);
      setStatusNote(`Player exists. Switched to ${existing.playerName}.`);
      render();
      return;
    }

    const created = createPlayerProfile(normalized);
    activatePlayer(created.playerId);
    setStatusNote(`Player ${created.playerName} added.`);
    render();
  });

  usePlayerBtn.addEventListener("click", () => {
    const selectedId = existingPlayerSelectEl.value;
    if (!selectedId) {
      setStatusNote("No existing player selected.");
      render();
      return;
    }

    activatePlayer(selectedId);
    setStatusNote("Player changed. New round started.");
    render();
  });

  if (playerName) {
    closeNameOverlay();
    return;
  }

  openNameOverlay("start");
}

function activatePlayer(playerId) {
  const profile = findPlayerById(playerId);
  if (!profile) {
    return;
  }

  playerName = profile.playerName;
  savePlayerName(playerName);
  closeNameOverlay();
  restartRound();
  pauseBtn.focus();
}

function openNameOverlay(mode) {
  nameFlowMode = mode === "change" ? "change" : "start";
  isNamePromptOpen = true;

  nameModalTitleEl.textContent =
    nameFlowMode === "change" ? "Switch or create player" : "Select or create player";

  renderExistingPlayersSelect();

  nameInputEl.value = "";
  nameOverlayEl.classList.remove("hidden");
  nameInputEl.focus();
}

function closeNameOverlay() {
  isNamePromptOpen = false;
  nameOverlayEl.classList.add("hidden");
}

function renderExistingPlayersSelect() {
  existingPlayerSelectEl.textContent = "";
  const sortedPlayers = getSortedSessionPlayers();

  if (sortedPlayers.length === 0) {
    existingPlayerGroupEl.hidden = true;
    return;
  }

  existingPlayerGroupEl.hidden = false;
  for (const player of sortedPlayers) {
    const option = document.createElement("option");
    option.value = player.playerId;
    option.textContent = `${player.playerName} (Best ${player.bestScore}, Games ${player.gamesPlayed})`;
    if (playerName && player.playerId === toPlayerId(playerName)) {
      option.selected = true;
    }
    existingPlayerSelectEl.appendChild(option);
  }
}

function setupSettingsPanel() {
  syncSettingsUi();

  settingsApplyBtn.addEventListener("click", () => {
    applySettings(readSettingsFromUi());
  });

  settingsResetBtn.addEventListener("click", () => {
    syncSettingsUi(DEFAULT_SETTINGS);
    applySettings({ ...DEFAULT_SETTINGS }, { isReset: true });
  });
}

function applySettings(nextRaw, { isReset = false } = {}) {
  const nextSettings = normalizeSettings(nextRaw);
  const prevSettings = settings;
  settings = nextSettings;
  saveSettings(settings);
  syncSettingsUi();

  const prevGridSize = resolveGridSize(prevSettings.gridSize);
  const nextGridSize = resolveGridSize(settings.gridSize);
  const changedGridSize = prevGridSize !== nextGridSize;

  if (changedGridSize) {
    state = createInitialState({ gridSize: nextGridSize });
    queuedDirection = null;
    rebuildGrid(nextGridSize);
  }

  if (isReset) {
    setStatusNote("Settings reset to defaults.");
  } else if (changedGridSize) {
    setStatusNote("Settings applied. Grid size changed, round restarted.");
  } else {
    setStatusNote("Settings applied.");
  }

  render();
}

function readSettingsFromUi() {
  return {
    speed: speedSelectEl.value,
    gridSize: gridSizeSelectEl.value,
    swipeEnabled: swipeToggleEl.checked,
    soundEnabled: soundToggleEl.checked
  };
}

function syncSettingsUi(source = settings) {
  speedSelectEl.value = source.speed;
  gridSizeSelectEl.value = source.gridSize;
  swipeToggleEl.checked = source.swipeEnabled;
  soundToggleEl.checked = source.soundEnabled;
}

function setupSwipeControls() {
  gridEl.addEventListener(
    "touchstart",
    (event) => {
      if (
        !settings.swipeEnabled ||
        !playerName ||
        isNamePromptOpen ||
        event.touches.length !== 1
      ) {
        return;
      }
      const touch = event.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
    },
    { passive: true }
  );

  gridEl.addEventListener(
    "touchend",
    (event) => {
      if (
        !settings.swipeEnabled ||
        !playerName ||
        isNamePromptOpen ||
        touchStartX === null ||
        touchStartY === null
      ) {
        return;
      }
      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - touchStartX;
      const deltaY = touch.clientY - touchStartY;
      touchStartX = null;
      touchStartY = null;

      if (Math.abs(deltaX) < SWIPE_MIN_DISTANCE && Math.abs(deltaY) < SWIPE_MIN_DISTANCE) {
        return;
      }

      let dir = null;
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        dir = deltaX > 0 ? DIRECTIONS.right : DIRECTIONS.left;
      } else {
        dir = deltaY > 0 ? DIRECTIONS.down : DIRECTIONS.up;
      }

      if (dir) {
        event.preventDefault();
        queueDirection(dir);
      }
    },
    { passive: false }
  );
}

function setupInputControls() {
  document.addEventListener("keydown", (event) => {
    if (!playerName || isNamePromptOpen) {
      return;
    }

    const key = event.key.toLowerCase();
    const keyMap = {
      arrowup: DIRECTIONS.up,
      w: DIRECTIONS.up,
      arrowdown: DIRECTIONS.down,
      s: DIRECTIONS.down,
      arrowleft: DIRECTIONS.left,
      a: DIRECTIONS.left,
      arrowright: DIRECTIONS.right,
      d: DIRECTIONS.right
    };

    if (key === " " || key === "p") {
      event.preventDefault();
      state = togglePause(state);
      render();
      return;
    }

    if (key === "r") {
      restartRound();
      render();
      return;
    }

    const dir = keyMap[key];
    if (!dir) {
      return;
    }
    event.preventDefault();
    queueDirection(dir);
  });

  document.querySelectorAll("[data-dir]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!playerName || isNamePromptOpen) {
        return;
      }
      const dirName = button.getAttribute("data-dir");
      queueDirection(DIRECTIONS[dirName]);
    });
  });

  pauseBtn.addEventListener("click", () => {
    if (!playerName || isNamePromptOpen) {
      return;
    }
    state = togglePause(state);
    render();
  });

  restartBtn.addEventListener("click", () => {
    if (!playerName || isNamePromptOpen) {
      return;
    }
    restartRound();
    render();
  });

  changePlayerBtn.addEventListener("click", () => {
    openNameOverlay("change");
    setStatusNote("Enter name to start");
    render();
  });
}

function restartRound() {
  state = createInitialState({ gridSize: resolveGridSize(settings.gridSize) });
  queuedDirection = null;
  rebuildGrid(state.gridSize);
}

function queueDirection(nextDirection) {
  if (!nextDirection) {
    return;
  }
  const baseDirection = queuedDirection || state.direction;
  if (isOppositeDirection(baseDirection, nextDirection)) {
    return;
  }
  queuedDirection = nextDirection;
}

function handleStateTransition(prevState, nextState) {
  if (nextState.score > prevState.score) {
    playTone(740, 0.06, "square");
  }

  if (!prevState.gameOver && nextState.gameOver) {
    playTone(190, 0.18, "sawtooth");
    recordGameResult(nextState.score);
  }
}

function isOppositeDirection(a, b) {
  return a.x === -b.x && a.y === -b.y;
}

function rebuildGrid(gridSize) {
  gridEl.textContent = "";
  gridEl.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
  gridEl.style.gridTemplateRows = `repeat(${gridSize}, 1fr)`;
  const total = gridSize * gridSize;
  for (let i = 0; i < total; i += 1) {
    const cell = document.createElement("div");
    cell.className = "cell";
    gridEl.appendChild(cell);
  }
}

function render() {
  const cells = gridEl.children;
  for (let i = 0; i < cells.length; i += 1) {
    cells[i].className = "cell";
  }

  for (const segment of state.snake) {
    const idx = segment.y * state.gridSize + segment.x;
    if (cells[idx]) {
      cells[idx].classList.add("snake");
    }
  }

  if (state.food) {
    const foodIdx = state.food.y * state.gridSize + state.food.x;
    if (cells[foodIdx]) {
      cells[foodIdx].classList.add("food");
    }
  }

  scoreEl.textContent = String(state.score);
  if (state.score > highScore) {
    highScore = state.score;
    saveHighScore(highScore);
  }
  highScoreEl.textContent = String(highScore);
  playerNameEl.textContent = playerName || "-";

  renderSessionLeaderboard();

  if (statusNote && Date.now() > statusNoteExpiresAt) {
    statusNote = "";
  }

  if (statusNote) {
    statusEl.textContent = statusNote;
  } else if (isNamePromptOpen || !playerName) {
    statusEl.textContent = "Enter name to start";
  } else if (state.gameOver) {
    statusEl.textContent = "Game Over";
  } else if (state.paused) {
    statusEl.textContent = "Paused";
  } else {
    statusEl.textContent = "Running";
  }

  pauseBtn.textContent = state.paused ? "Resume" : "Pause";
}

function renderSessionLeaderboard() {
  const sorted = getSortedSessionPlayers();
  const visibleEntries = sorted.slice(0, MAX_LEADERBOARD_ITEMS);

  leaderboardListEl.textContent = "";
  if (visibleEntries.length === 0) {
    leaderboardEmptyEl.hidden = false;
    leaderboardListEl.hidden = true;
    return;
  }

  leaderboardEmptyEl.hidden = true;
  leaderboardListEl.hidden = false;

  for (const entry of visibleEntries) {
    const item = document.createElement("li");
    item.textContent = `${entry.playerName} - Best: ${entry.bestScore} - Games: ${entry.gamesPlayed}`;
    leaderboardListEl.appendChild(item);
  }
}

function recordGameResult(score) {
  if (!playerName || !Number.isFinite(score) || score < 0) {
    return;
  }

  const profile = ensurePlayerProfile(playerName);
  profile.gamesPlayed += 1;
  if (score > profile.bestScore) {
    profile.bestScore = score;
  }
  profile.lastPlayedAt = Date.now();

  sortSessionPlayersInPlace();
  trimStoredPlayers();
  saveSessionPlayers();
}

function sanitizePlayerName(raw) {
  if (typeof raw !== "string") {
    return "";
  }
  return raw.trim().replace(/\s+/g, " ").slice(0, 24);
}

function toPlayerId(name) {
  return sanitizePlayerName(name).toLowerCase();
}

function getSortedSessionPlayers() {
  return [...sessionPlayers].sort(comparePlayers);
}

function sortSessionPlayersInPlace() {
  sessionPlayers.sort(comparePlayers);
}

function comparePlayers(a, b) {
  if (b.bestScore !== a.bestScore) {
    return b.bestScore - a.bestScore;
  }
  if (b.gamesPlayed !== a.gamesPlayed) {
    return b.gamesPlayed - a.gamesPlayed;
  }
  if (b.lastPlayedAt !== a.lastPlayedAt) {
    return b.lastPlayedAt - a.lastPlayedAt;
  }
  return a.playerName.localeCompare(b.playerName);
}

function findPlayerById(playerId) {
  return sessionPlayers.find((entry) => entry.playerId === playerId) || null;
}

function createPlayerProfile(name) {
  const playerNameClean = sanitizePlayerName(name);
  const playerId = toPlayerId(playerNameClean);
  const profile = {
    playerId,
    playerName: playerNameClean,
    bestScore: 0,
    gamesPlayed: 0,
    lastPlayedAt: Date.now()
  };
  sessionPlayers.push(profile);
  sortSessionPlayersInPlace();
  trimStoredPlayers();
  saveSessionPlayers();
  return profile;
}

function ensurePlayerProfile(name) {
  const playerNameClean = sanitizePlayerName(name);
  const playerId = toPlayerId(playerNameClean);
  const existing = findPlayerById(playerId);
  if (existing) {
    return existing;
  }
  return createPlayerProfile(playerNameClean);
}

function trimStoredPlayers() {
  sessionPlayers = getSortedSessionPlayers().slice(0, MAX_LEADERBOARD_STORAGE_ITEMS);
}

function setStatusNote(message) {
  statusNote = message;
  statusNoteExpiresAt = Date.now() + STATUS_NOTE_DURATION_MS;
}

function getTickMs(speed) {
  return SPEED_TO_TICK_MS[speed] ?? SPEED_TO_TICK_MS[DEFAULT_SETTINGS.speed];
}

function resolveGridSize(gridSize) {
  return GRID_SIZE_TO_CELLS[gridSize] ?? GRID_SIZE_TO_CELLS[DEFAULT_SETTINGS.gridSize];
}

function normalizeSettings(raw = {}) {
  const speed = ["slow", "normal", "fast"].includes(raw.speed)
    ? raw.speed
    : DEFAULT_SETTINGS.speed;
  const gridSize = ["small", "medium", "large"].includes(raw.gridSize)
    ? raw.gridSize
    : DEFAULT_SETTINGS.gridSize;

  return {
    speed,
    gridSize,
    swipeEnabled:
      typeof raw.swipeEnabled === "boolean"
        ? raw.swipeEnabled
        : DEFAULT_SETTINGS.swipeEnabled,
    soundEnabled:
      typeof raw.soundEnabled === "boolean"
        ? raw.soundEnabled
        : DEFAULT_SETTINGS.soundEnabled
  };
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      return { ...DEFAULT_SETTINGS };
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return { ...DEFAULT_SETTINGS };
    }

    return normalizeSettings(parsed);
  } catch (error) {
    localStorageAvailable = false;
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(value) {
  if (!localStorageAvailable) {
    return;
  }
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(normalizeSettings(value)));
  } catch (error) {
    localStorageAvailable = false;
  }
}

function loadHighScore() {
  try {
    const raw = localStorage.getItem(HIGH_SCORE_KEY);
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  } catch (error) {
    localStorageAvailable = false;
    return 0;
  }
}

function saveHighScore(value) {
  if (!localStorageAvailable) {
    return;
  }
  try {
    localStorage.setItem(HIGH_SCORE_KEY, String(value));
  } catch (error) {
    localStorageAvailable = false;
  }
}

function loadPlayerName() {
  try {
    const raw = sessionStorage.getItem(PLAYER_NAME_KEY);
    return raw ? sanitizePlayerName(raw) : "";
  } catch (error) {
    sessionStorageAvailable = false;
    return "";
  }
}

function savePlayerName(value) {
  if (!sessionStorageAvailable) {
    return;
  }
  try {
    sessionStorage.setItem(PLAYER_NAME_KEY, sanitizePlayerName(value));
  } catch (error) {
    sessionStorageAvailable = false;
  }
}

function loadSessionPlayers() {
  try {
    const raw = sessionStorage.getItem(SESSION_LEADERBOARD_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    // New format: one aggregate row per player.
    if (parsed[0] && typeof parsed[0] === "object" && "gamesPlayed" in parsed[0]) {
      const clean = parsed
        .map((entry) => {
          const name = sanitizePlayerName(entry.playerName);
          const playerId = toPlayerId(name);
          const bestScore = Number(entry.bestScore);
          const gamesPlayed = Number(entry.gamesPlayed);
          const lastPlayedAt = Number(entry.lastPlayedAt);
          if (!name || !playerId) {
            return null;
          }
          return {
            playerId,
            playerName: name,
            bestScore: Number.isFinite(bestScore) && bestScore >= 0 ? bestScore : 0,
            gamesPlayed: Number.isFinite(gamesPlayed) && gamesPlayed >= 0 ? gamesPlayed : 0,
            lastPlayedAt: Number.isFinite(lastPlayedAt) ? lastPlayedAt : 0
          };
        })
        .filter(Boolean);

      const merged = mergeDuplicatePlayers(clean);
      merged.sort(comparePlayers);
      return merged.slice(0, MAX_LEADERBOARD_STORAGE_ITEMS);
    }

    // Old format: one row per run ({ playerName, score, timestamp }).
    const aggregated = new Map();
    for (const entry of parsed) {
      if (!entry || typeof entry !== "object") {
        continue;
      }
      const name = sanitizePlayerName(entry.playerName);
      const playerId = toPlayerId(name);
      const score = Number(entry.score);
      const timestamp = Number(entry.timestamp);
      if (!name || !playerId || !Number.isFinite(score) || score < 0) {
        continue;
      }

      const existing = aggregated.get(playerId) ?? {
        playerId,
        playerName: name,
        bestScore: 0,
        gamesPlayed: 0,
        lastPlayedAt: 0
      };
      existing.bestScore = Math.max(existing.bestScore, score);
      existing.gamesPlayed += 1;
      if (Number.isFinite(timestamp)) {
        existing.lastPlayedAt = Math.max(existing.lastPlayedAt, timestamp);
      }
      aggregated.set(playerId, existing);
    }

    const migrated = [...aggregated.values()].sort(comparePlayers).slice(0, MAX_LEADERBOARD_STORAGE_ITEMS);
    if (migrated.length) {
      sessionStorage.setItem(SESSION_LEADERBOARD_KEY, JSON.stringify(migrated));
    }
    return migrated;
  } catch (error) {
    sessionStorageAvailable = false;
    return [];
  }
}

function mergeDuplicatePlayers(players) {
  const merged = new Map();
  for (const player of players) {
    const existing = merged.get(player.playerId);
    if (!existing) {
      merged.set(player.playerId, { ...player });
      continue;
    }

    existing.bestScore = Math.max(existing.bestScore, player.bestScore);
    existing.gamesPlayed += player.gamesPlayed;
    if (player.lastPlayedAt > existing.lastPlayedAt) {
      existing.lastPlayedAt = player.lastPlayedAt;
      existing.playerName = player.playerName;
    }
  }
  return [...merged.values()];
}

function saveSessionPlayers() {
  if (!sessionStorageAvailable) {
    return;
  }

  try {
    sessionStorage.setItem(SESSION_LEADERBOARD_KEY, JSON.stringify(sessionPlayers));
  } catch (error) {
    sessionStorageAvailable = false;
  }
}

function ensureAudioContext() {
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) {
    return null;
  }

  if (!audioContext) {
    audioContext = new AudioCtor();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }

  return audioContext;
}

function playTone(frequency, durationSeconds, type) {
  if (!settings.soundEnabled) {
    return;
  }

  const ctx = ensureAudioContext();
  if (!ctx) {
    return;
  }

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;

  gainNode.gain.value = 0.001;
  gainNode.gain.exponentialRampToValueAtTime(0.035, ctx.currentTime + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationSeconds);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.start();
  oscillator.stop(ctx.currentTime + durationSeconds);
}
