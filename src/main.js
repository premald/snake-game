import {
  DEFAULT_GRID_SIZE,
  DIRECTIONS,
  createInitialState,
  setDirection,
  stepGame,
  togglePause
} from "./snakeGame.js";

const TICK_MS = 150;
const PLAYER_NAME_KEY = "snake.playerName";
const SWIPE_MIN_DISTANCE = 24;
const gridEl = document.getElementById("game-grid");
const scoreEl = document.getElementById("score");
const highScoreEl = document.getElementById("high-score");
const statusEl = document.getElementById("status");
const playerNameEl = document.getElementById("player-name");
const pauseBtn = document.getElementById("pause-btn");
const restartBtn = document.getElementById("restart-btn");
const nameOverlayEl = document.getElementById("name-overlay");
const nameFormEl = document.getElementById("name-form");
const nameInputEl = document.getElementById("player-name-input");

let state = createInitialState({ gridSize: DEFAULT_GRID_SIZE });
let queuedDirection = null;
let highScore = loadHighScore();
let playerName = loadPlayerName();
let storageAvailable = true;
let touchStartX = null;
let touchStartY = null;

initGrid(state.gridSize);
setupPlayerName();
setupSwipeControls();
render();

setInterval(() => {
  if (!playerName) {
    return;
  }
  if (queuedDirection) {
    state = setDirection(state, queuedDirection);
    queuedDirection = null;
  }
  state = stepGame(state);
  render();
}, TICK_MS);

document.addEventListener("keydown", (event) => {
  if (!playerName) {
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
    state = createInitialState({ gridSize: DEFAULT_GRID_SIZE });
    queuedDirection = null;
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
    if (!playerName) {
      return;
    }
    const dirName = button.getAttribute("data-dir");
    queueDirection(DIRECTIONS[dirName]);
  });
});

pauseBtn.addEventListener("click", () => {
  if (!playerName) {
    return;
  }
  state = togglePause(state);
  render();
});

restartBtn.addEventListener("click", () => {
  if (!playerName) {
    return;
  }
  state = createInitialState({ gridSize: DEFAULT_GRID_SIZE });
  queuedDirection = null;
  render();
});

function setupPlayerName() {
  if (playerName) {
    playerNameEl.textContent = playerName;
    nameOverlayEl.classList.add("hidden");
    return;
  }

  nameOverlayEl.classList.remove("hidden");
  nameInputEl.focus();

  nameFormEl.addEventListener("submit", (event) => {
    event.preventDefault();
    const submittedName = nameInputEl.value.trim();
    if (!submittedName) {
      return;
    }
    playerName = submittedName;
    if (storageAvailable) {
      try {
        sessionStorage.setItem(PLAYER_NAME_KEY, playerName);
      } catch (error) {
        storageAvailable = false;
      }
    }
    playerNameEl.textContent = playerName;
    nameOverlayEl.classList.add("hidden");
    pauseBtn.focus();
    render();
  });
}

function setupSwipeControls() {
  gridEl.addEventListener(
    "touchstart",
    (event) => {
      if (!playerName || event.touches.length !== 1) {
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
      if (!playerName || touchStartX === null || touchStartY === null) {
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

function isOppositeDirection(a, b) {
  return a.x === -b.x && a.y === -b.y;
}

function initGrid(gridSize) {
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
  if (state.gameOver) {
    statusEl.textContent = "Game Over";
  } else if (!playerName) {
    statusEl.textContent = "Enter name to start";
  } else if (state.paused) {
    statusEl.textContent = "Paused";
  } else {
    statusEl.textContent = "Running";
  }
  pauseBtn.textContent = state.paused ? "Resume" : "Pause";
}

function loadHighScore() {
  const raw = localStorage.getItem("snake.highScore");
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function saveHighScore(value) {
  localStorage.setItem("snake.highScore", String(value));
}

function loadPlayerName() {
  try {
    const raw = sessionStorage.getItem(PLAYER_NAME_KEY);
    return raw ? raw.trim() : "";
  } catch (error) {
    storageAvailable = false;
    return "";
  }
}
