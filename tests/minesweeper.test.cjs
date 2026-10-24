const test = require("node:test");
const assert = require("node:assert/strict");
const { Game } = require("../minesweeper.js");

function seededRandom(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

test("every starting square opens safely with exactly ten mines", () => {
  for (let start = 0; start < 81; start += 1) {
    const game = new Game(seededRandom(start + 1));
    assert.equal(game.status, "ready");
    assert.equal(game.cells.some((cell) => cell.mine), false);
    game.reveal(start);
    assert.equal(game.cells.filter((cell) => cell.mine).length, 10);
    assert.equal(game.cells[start].mine, false);
    assert.equal(game.cells[start].count, 0);
    assert.equal(game.cells[start].revealed, true);
    assert.notEqual(game.status, "lost");
  }
});

test("neighbor counts match actual adjacent mines, including board edges", () => {
  const game = new Game(seededRandom(22));
  game.reveal(40);
  game.cells.forEach((cell, index) => {
    const row = Math.floor(index / 9);
    const column = index % 9;
    const actual = game.cells.filter((candidate, other) => candidate.mine && other !== index
      && Math.abs(Math.floor(other / 9) - row) <= 1
      && Math.abs(other % 9 - column) <= 1).length;
    assert.equal(cell.count, actual);
  });
});

test("empty regions reveal their numbered boundary without opening mines", () => {
  const game = new Game(seededRandom(44));
  game.reveal(40);
  assert(game.revealed > 1);
  assert.equal(game.cells.some((cell) => cell.mine && cell.revealed), false);
  game.cells.forEach((cell, index) => {
    if (!cell.revealed || cell.count !== 0) return;
    const row = Math.floor(index / 9);
    const column = index % 9;
    game.cells.forEach((neighbor, other) => {
      if (Math.abs(Math.floor(other / 9) - row) <= 1 && Math.abs(other % 9 - column) <= 1) {
        assert.equal(neighbor.revealed, true);
      }
    });
  });
  assert.equal(game.revealed, game.cells.filter((cell) => cell.revealed).length);
});

test("flags protect cells from revealing and are limited to the mine count", () => {
  const game = new Game(seededRandom(7));
  assert.equal(game.toggleFlag(40), true);
  assert.equal(game.reveal(40), false);
  assert.equal(game.status, "ready");
  assert.equal(game.toggleFlag(40), true);
  assert.equal(game.flags, 0);
  for (let index = 0; index < 10; index += 1) assert.equal(game.toggleFlag(index), true);
  assert.equal(game.flags, 10);
  assert.equal(game.toggleFlag(10), false);
  assert.equal(game.toggleFlag(0), true);
  assert.equal(game.flags, 9);
  game.reveal(40);
  for (let index = 1; index < 10; index += 1) assert.equal(game.cells[index].revealed, false);
  assert.equal(game.toggleFlag(40), false);
});

test("opening a mine loses and locks the board", () => {
  const game = new Game(seededRandom(33));
  game.reveal(40);
  const mine = game.cells.findIndex((cell) => cell.mine);
  const covered = game.cells.findIndex((cell) => !cell.mine && !cell.revealed);
  assert.equal(game.reveal(mine), true);
  assert.equal(game.status, "lost");
  assert.equal(game.exploded, mine);
  const before = JSON.stringify(game);
  assert.equal(game.reveal(covered), false);
  assert.equal(game.toggleFlag(mine), false);
  assert.equal(JSON.stringify(game), before);
});

test("revealing all safe cells wins, flags the mines, and locks the board", () => {
  const game = new Game(seededRandom(99));
  game.reveal(0);
  game.cells.forEach((cell, index) => { if (!cell.mine) game.reveal(index); });
  assert.equal(game.status, "won");
  assert.equal(game.revealed, 71);
  assert.equal(game.flags, 10);
  assert(game.cells.filter((cell) => cell.mine).every((cell) => cell.flagged && !cell.revealed));
  assert.equal(game.toggleFlag(game.cells.findIndex((cell) => cell.mine)), false);
  assert.equal(game.reveal(game.cells.findIndex((cell) => cell.mine)), false);
});

test("new games are independent and ignore duplicate or invalid reveals", () => {
  const first = new Game(seededRandom(5));
  first.reveal(0);
  const count = first.revealed;
  assert.equal(first.reveal(0), false);
  assert.equal(first.reveal(-1), false);
  assert.equal(first.reveal(81), false);
  assert.equal(first.revealed, count);
  const second = new Game(seededRandom(5));
  assert.equal(second.revealed, 0);
  assert.equal(second.flags, 0);
  assert.equal(second.status, "ready");
  assert(second.cells.every((cell) => !cell.revealed && !cell.flagged && !cell.mine));
});
