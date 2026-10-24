(function (root) {
  "use strict";

  const SIZE = 9;
  const MINE_COUNT = 10;
  const WINDOW_KEY = "minesweeper";
  const mineSvg = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1v22M1 12h22M4 4l16 16M4 20L20 4" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="7" fill="currentColor"/><path d="M8 7h3v3H8z" fill="white"/></svg>`;
  const flagSvg = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v17M6 21h13" stroke="#222" stroke-width="2"/><path d="M11 3L3 8l8 4z" fill="#da2525"/></svg>`;
  const icon = "data:image/svg+xml," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect x="7" y="7" width="50" height="50" fill="#c0c0c0" stroke="#fff" stroke-width="3"/><path d="M8 56h48V8" fill="none" stroke="#707070" stroke-width="3"/><g transform="translate(12 12) scale(1.65)">${mineSvg.replace(/<svg[^>]*>|<\/svg>/g, "")}</g></svg>`);

  function neighbors(index) {
    const row = Math.floor(index / SIZE);
    const col = index % SIZE;
    const result = [];
    for (let y = Math.max(0, row - 1); y <= Math.min(SIZE - 1, row + 1); y += 1) {
      for (let x = Math.max(0, col - 1); x <= Math.min(SIZE - 1, col + 1); x += 1) {
        const next = y * SIZE + x;
        if (next !== index) result.push(next);
      }
    }
    return result;
  }

  class Game {
    constructor(random = Math.random) {
      this.random = random;
      this.cells = Array.from({ length: SIZE * SIZE }, () => ({ mine: false, count: 0, revealed: false, flagged: false }));
      this.status = "ready";
      this.flags = 0;
      this.revealed = 0;
      this.exploded = -1;
    }

    placeMines(first) {
      const safe = new Set([first, ...neighbors(first)]);
      const candidates = this.cells.map((_, index) => index).filter((index) => !safe.has(index));
      for (let i = candidates.length - 1; i > 0; i -= 1) {
        const j = Math.floor(this.random() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
      }
      candidates.slice(0, MINE_COUNT).forEach((index) => { this.cells[index].mine = true; });
      this.cells.forEach((cell, index) => {
        cell.count = neighbors(index).filter((next) => this.cells[next].mine).length;
      });
      this.status = "playing";
    }

    reveal(index) {
      const cell = this.cells[index];
      if (!cell || cell.flagged || cell.revealed || this.status === "won" || this.status === "lost") return false;
      if (this.status === "ready") this.placeMines(index);
      if (cell.mine) {
        this.status = "lost";
        this.exploded = index;
        return true;
      }
      const queue = [index];
      while (queue.length) {
        const current = queue.pop();
        const next = this.cells[current];
        if (next.revealed || next.flagged || next.mine) continue;
        next.revealed = true;
        this.revealed += 1;
        if (next.count === 0) queue.push(...neighbors(current));
      }
      if (this.revealed === SIZE * SIZE - MINE_COUNT) {
        this.status = "won";
        this.cells.forEach((entry) => { if (entry.mine) entry.flagged = true; });
        this.flags = MINE_COUNT;
      }
      return true;
    }

    toggleFlag(index) {
      const cell = this.cells[index];
      if (!cell || cell.revealed || this.status === "won" || this.status === "lost") return false;
      if (!cell.flagged && this.flags === MINE_COUNT) return false;
      cell.flagged = !cell.flagged;
      this.flags += cell.flagged ? 1 : -1;
      return true;
    }
  }

  function faceSvg(status) {
    const eyes = status === "lost"
      ? '<path d="m7 7 3 3m0-3-3 3m7-3 3 3m0-3-3 3"/>'
      : '<circle cx="8.5" cy="8.5" r=".8"/><circle cx="15.5" cy="8.5" r=".8"/>';
    const mouth = status === "lost" ? 'M7 17q5-5 10 0' : 'M7 14q5 6 10 0';
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#ffe849" stroke="#222"/><g stroke="#222" stroke-width="1.5" fill="none">${eyes}<path d="${mouth}"/></g>${status === "won" ? '<path d="M5 7h14v4h-5l-2-2-2 2H5z" fill="#222"/>' : ""}</svg>`;
  }

  function open(createWindow, windowLayer, bringToFront) {
    const existing = windowLayer.querySelector(`[data-window-key="${WINDOW_KEY}"]`);
    if (existing) {
      bringToFront(existing);
      existing.querySelector('.ms-cell[tabindex="0"]').focus();
      return existing;
    }

    let game;
    let timer = null;
    let startedAt = null;
    let flagMode = false;
    let focusedIndex = 0;
    const stopTimer = () => {
      if (timer !== null) root.clearInterval(timer);
      timer = null;
    };
    const win = createWindow("Minesweeper", `<div class="ms-game" aria-live="off">
      <div class="ms-toolbar">
        <output class="ms-counter ms-mines" aria-label="Flags remaining">010</output>
        <button type="button" class="ms-reset" aria-label="New game" title="New game"></button>
        <output class="ms-counter ms-time" role="timer" aria-live="off" aria-label="Elapsed time in seconds">000</output>
      </div>
      <div class="ms-board" role="group" aria-label="Minesweeper board, 9 rows and 9 columns"></div>
      <div class="ms-controls"><span>Beginner · 10 mines</span><button type="button" class="ms-flag-mode" aria-pressed="false">Flag mode</button></div>
      <p class="ms-status" role="status" aria-live="polite"></p>
      <p class="ms-help">Click to reveal. Right-click or F to flag.<br>Arrow keys move. Use Flag mode on touch.</p>
    </div>`, {
      key: WINDOW_KEY,
      onClose: () => {
        stopTimer();
        root.document.querySelector('.desktop-icon[data-id="minesweeper"]')?.focus();
      },
    });
    win.classList.add("minesweeper-window");
    win.setAttribute("aria-label", "Minesweeper");
    const board = win.querySelector(".ms-board");
    const counter = win.querySelector(".ms-mines");
    const clock = win.querySelector(".ms-time");
    const resetButton = win.querySelector(".ms-reset");
    const flagButton = win.querySelector(".ms-flag-mode");
    const status = win.querySelector(".ms-status");
    const cells = Array.from({ length: SIZE * SIZE }, (_, index) => {
      const button = root.document.createElement("button");
      button.type = "button";
      button.className = "ms-cell";
      button.dataset.index = index;
      button.tabIndex = index === 0 ? 0 : -1;
      board.appendChild(button);
      return button;
    });

    const updateClock = () => {
      const elapsed = startedAt === null ? 0 : Math.min(999, Math.floor((Date.now() - startedAt) / 1000));
      clock.textContent = String(elapsed).padStart(3, "0");
    };

    function render() {
      counter.textContent = String(MINE_COUNT - game.flags).padStart(3, "0");
      resetButton.innerHTML = faceSvg(game.status);
      resetButton.title = game.status === "lost" ? "Try again" : "New game";
      const messages = {
        ready: "Clear the board. Your first click is safe.",
        playing: "Find every safe square.",
        won: "You win! All safe squares cleared.",
        lost: "Boom! Click the smiley to try again.",
      };
      status.textContent = messages[game.status];
      const finished = game.status === "lost" || game.status === "won";
      if (finished) stopTimer();
      flagButton.disabled = finished;
      game.cells.forEach((cell, index) => {
        const button = cells[index];
        const showMine = cell.mine && game.status === "lost";
        const wrongFlag = cell.flagged && !cell.mine && game.status === "lost";
        button.className = "ms-cell";
        button.classList.toggle("is-revealed", cell.revealed || showMine || wrongFlag);
        button.classList.toggle("is-exploded", index === game.exploded);
        button.classList.toggle("is-wrong-flag", wrongFlag);
        button.dataset.count = cell.revealed ? cell.count : "";
        button.setAttribute("aria-disabled", String(finished || cell.revealed));
        let label = "covered";
        button.textContent = "";
        if (wrongFlag) {
          button.textContent = "×";
          label = "incorrect flag";
        } else if (showMine) {
          button.innerHTML = mineSvg;
          label = "mine";
        } else if (cell.flagged) {
          button.innerHTML = flagSvg;
          label = "flagged";
        } else if (cell.revealed) {
          button.textContent = cell.count || "";
          label = cell.count ? `${cell.count} adjacent mines` : "empty";
        }
        button.setAttribute("aria-label", `Row ${Math.floor(index / SIZE) + 1}, column ${index % SIZE + 1}: ${label}`);
      });
    }

    function focusCell(index) {
      cells[focusedIndex].tabIndex = -1;
      focusedIndex = index;
      cells[index].tabIndex = 0;
      cells[index].focus();
    }

    function play(index, flag) {
      const changed = flag ? game.toggleFlag(index) : game.reveal(index);
      if (!changed) return;
      if (game.status === "playing" && startedAt === null) {
        startedAt = Date.now();
        timer = root.setInterval(updateClock, 250);
      }
      updateClock();
      render();
    }

    function reset() {
      stopTimer();
      startedAt = null;
      flagMode = false;
      flagButton.setAttribute("aria-pressed", "false");
      game = new Game();
      updateClock();
      render();
    }

    board.addEventListener("click", (event) => {
      const button = event.target.closest(".ms-cell");
      if (!button) return;
      const index = Number(button.dataset.index);
      focusCell(index);
      play(index, flagMode);
    });
    board.addEventListener("contextmenu", (event) => {
      const button = event.target.closest(".ms-cell");
      if (!button) return;
      event.preventDefault();
      const index = Number(button.dataset.index);
      focusCell(index);
      play(index, true);
    });
    board.addEventListener("keydown", (event) => {
      const button = event.target.closest(".ms-cell");
      if (!button) return;
      const index = Number(button.dataset.index);
      const row = Math.floor(index / SIZE);
      const col = index % SIZE;
      const moves = { ArrowLeft: row * SIZE + Math.max(0, col - 1), ArrowRight: row * SIZE + Math.min(SIZE - 1, col + 1), ArrowUp: Math.max(0, row - 1) * SIZE + col, ArrowDown: Math.min(SIZE - 1, row + 1) * SIZE + col };
      if (Object.prototype.hasOwnProperty.call(moves, event.key)) {
        event.preventDefault();
        focusCell(moves[event.key]);
      } else if (event.key.toLowerCase() === "f") {
        event.preventDefault();
        play(index, true);
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        play(index, false);
      }
    });
    flagButton.addEventListener("click", () => {
      flagMode = !flagMode;
      flagButton.setAttribute("aria-pressed", String(flagMode));
    });
    resetButton.addEventListener("click", reset);
    reset();
    cells[0].focus();
    return win;
  }

  const api = { icon, open, Game };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Minesweeper = api;
})(typeof window !== "undefined" ? window : globalThis);
