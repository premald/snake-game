import test from "node:test";
import assert from "node:assert/strict";
import {
  DIRECTIONS,
  createInitialState,
  randomEmptyCell,
  setDirection,
  stepGame
} from "../src/snakeGame.js";

test("createInitialState creates a 3-segment snake with valid food", () => {
  const state = createInitialState({ gridSize: 10, rng: () => 0.1 });

  assert.equal(state.snake.length, 3);
  assert.deepEqual(state.direction, DIRECTIONS.right);
  assert.equal(state.food.x >= 0 && state.food.x < 10, true);
  assert.equal(state.food.y >= 0 && state.food.y < 10, true);
  assert.equal(
    state.snake.some((cell) => cell.x === state.food.x && cell.y === state.food.y),
    false
  );
});

test("stepGame moves snake one cell in current direction", () => {
  const initial = {
    gridSize: 8,
    snake: [
      { x: 3, y: 3 },
      { x: 2, y: 3 },
      { x: 1, y: 3 }
    ],
    direction: DIRECTIONS.right,
    food: { x: 7, y: 7 },
    score: 0,
    gameOver: false,
    paused: false
  };

  const next = stepGame(initial, () => 0.1);
  assert.deepEqual(next.snake, [
    { x: 4, y: 3 },
    { x: 3, y: 3 },
    { x: 2, y: 3 }
  ]);
  assert.equal(next.score, 0);
});

test("stepGame grows snake and increments score when eating food", () => {
  const initial = {
    gridSize: 8,
    snake: [
      { x: 3, y: 3 },
      { x: 2, y: 3 },
      { x: 1, y: 3 }
    ],
    direction: DIRECTIONS.right,
    food: { x: 4, y: 3 },
    score: 0,
    gameOver: false,
    paused: false
  };

  const next = stepGame(initial, () => 0.9);
  assert.equal(next.snake.length, 4);
  assert.deepEqual(next.snake[0], { x: 4, y: 3 });
  assert.equal(next.score, 1);
});

test("stepGame marks game over when head crosses boundary", () => {
  const initial = {
    gridSize: 5,
    snake: [
      { x: 4, y: 2 },
      { x: 3, y: 2 },
      { x: 2, y: 2 }
    ],
    direction: DIRECTIONS.right,
    food: { x: 0, y: 0 },
    score: 0,
    gameOver: false,
    paused: false
  };

  const next = stepGame(initial);
  assert.equal(next.gameOver, true);
});

test("stepGame marks game over on self collision", () => {
  const initial = {
    gridSize: 6,
    snake: [
      { x: 2, y: 2 },
      { x: 2, y: 3 },
      { x: 1, y: 3 },
      { x: 1, y: 2 }
    ],
    direction: DIRECTIONS.down,
    food: { x: 5, y: 5 },
    score: 0,
    gameOver: false,
    paused: false
  };

  const next = stepGame(initial);
  assert.equal(next.gameOver, true);
});

test("setDirection ignores reverse direction", () => {
  const state = createInitialState({ gridSize: 10 });
  const next = setDirection(state, DIRECTIONS.left);
  assert.deepEqual(next.direction, DIRECTIONS.right);
});

test("randomEmptyCell does not place food on snake body", () => {
  const snake = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 }
  ];
  let calls = 0;
  const rng = () => {
    calls += 1;
    return calls <= 6 ? 0 : 0.8;
  };
  const cell = randomEmptyCell(snake, 4, rng);
  assert.equal(
    snake.some((segment) => segment.x === cell.x && segment.y === cell.y),
    false
  );
});
