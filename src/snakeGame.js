export const DEFAULT_GRID_SIZE = 20;
export const DIRECTIONS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 }
};

export function createInitialState({ gridSize = DEFAULT_GRID_SIZE, rng = Math.random } = {}) {
  const start = Math.floor(gridSize / 2);
  const snake = [
    { x: start, y: start },
    { x: start - 1, y: start },
    { x: start - 2, y: start }
  ];

  return {
    gridSize,
    snake,
    direction: { ...DIRECTIONS.right },
    food: randomEmptyCell(snake, gridSize, rng),
    score: 0,
    gameOver: false,
    paused: false
  };
}

export function setDirection(state, nextDirection) {
  if (state.gameOver || state.paused) {
    return state;
  }
  if (!nextDirection) {
    return state;
  }
  if (
    state.direction.x + nextDirection.x === 0 &&
    state.direction.y + nextDirection.y === 0
  ) {
    return state;
  }

  return { ...state, direction: { ...nextDirection } };
}

export function togglePause(state) {
  if (state.gameOver) {
    return state;
  }
  return { ...state, paused: !state.paused };
}

export function stepGame(state, rng = Math.random) {
  if (state.gameOver || state.paused) {
    return state;
  }

  const head = state.snake[0];
  const nextHead = {
    x: head.x + state.direction.x,
    y: head.y + state.direction.y
  };

  if (!isInside(nextHead, state.gridSize)) {
    return { ...state, gameOver: true };
  }

  const ateFood = sameCell(nextHead, state.food);
  const collisionBody = ateFood ? state.snake : state.snake.slice(0, -1);
  if (includesCell(collisionBody, nextHead)) {
    return { ...state, gameOver: true };
  }

  const nextSnake = ateFood
    ? [nextHead, ...state.snake]
    : [nextHead, ...state.snake.slice(0, -1)];

  if (!ateFood) {
    return { ...state, snake: nextSnake };
  }

  const nextFood = randomEmptyCell(nextSnake, state.gridSize, rng);
  const nextScore = state.score + 1;
  return {
    ...state,
    snake: nextSnake,
    food: nextFood,
    score: nextScore,
    gameOver: nextFood === null
  };
}

export function randomEmptyCell(snake, gridSize, rng = Math.random) {
  const totalCells = gridSize * gridSize;
  if (snake.length >= totalCells) {
    return null;
  }

  let candidate = null;
  let attempts = 0;
  while (attempts < totalCells * 2) {
    candidate = {
      x: Math.floor(rng() * gridSize),
      y: Math.floor(rng() * gridSize)
    };
    if (!includesCell(snake, candidate)) {
      return candidate;
    }
    attempts += 1;
  }

  for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < gridSize; x += 1) {
      const fallback = { x, y };
      if (!includesCell(snake, fallback)) {
        return fallback;
      }
    }
  }
  return null;
}

function includesCell(cells, target) {
  return cells.some((cell) => sameCell(cell, target));
}

function sameCell(a, b) {
  if (!a || !b) {
    return false;
  }
  return a.x === b.x && a.y === b.y;
}

function isInside(cell, gridSize) {
  return cell.x >= 0 && cell.y >= 0 && cell.x < gridSize && cell.y < gridSize;
}
