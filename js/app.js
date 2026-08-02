"use strict";

const SIZE = 4;
const TILE_COUNT = SIZE * SIZE;
const SHUFFLE_MOVES = 240;
const MAX_HINTS = 3;
const API_BASE = "api";

const MODES = {
  creatures: {
    label: "Creatures Mode",
    description: "Reef creatures in bright shallow water.",
    image: "img/CreaturesMode.jpg",
    audio: "audio/CreaturesAudio.mp3"
  },
  waves: {
    label: "Waves Mode",
    description: "A surfer moving through deep teal waves.",
    image: "img/WavesMode.jpg",
    audio: "audio/WaveAudio.mp3"
  },
  bites: {
    label: "Bites Mode",
    description: "A colorful beachside fruit bowl reward.",
    image: "img/BitesMode.jpg",
    audio: "audio/BitesAudio.mp3"
  }
};

let boardState = solvedBoard();
let timerId = null;
let elapsedSeconds = 0;
let moves = 0;
let hintsRemaining = MAX_HINTS;
let gameStarted = false;
let gameSolved = false;
let isPaused = false;
let currentMode = "creatures";
let winningScore = null;
let sessionResults = [];
let musicPlaying = false;
let undoStack = [];
let redoStack = [];

const boardElement = document.getElementById("puzzleBoard");
const timerElement = document.getElementById("timer");
const moveCountElement = document.getElementById("moveCount");
const hintCountElement = document.getElementById("hintCount");
const modeSelect = document.getElementById("modeSelect");
const modeDescription = document.getElementById("modeDescription");
const previewOverlay = document.getElementById("previewOverlay");
const previewImage = document.getElementById("previewImage");
const statusMessage = document.getElementById("statusMessage");
const scoreForm = document.getElementById("scoreForm");
const playerNameInput = document.getElementById("playerName");
const saveScoreBtn = document.getElementById("saveScoreBtn");
const leaderboardList = document.getElementById("leaderboardList");
const winModal = document.getElementById("winModal");
const winImage = document.getElementById("winImage");
const winSummary = document.getElementById("winSummary");
const musicButton = document.getElementById("musicBtn");
const pauseButton = document.getElementById("pauseBtn");
const undoButton = document.getElementById("undoBtn");
const redoButton = document.getElementById("redoBtn");
const themeAudio = new Audio(MODES[currentMode].audio);
themeAudio.loop = true;

function solvedBoard() {
  return Array.from({ length: TILE_COUNT }, (_, index) =>
    index === TILE_COUNT - 1 ? 0 : index + 1
  );
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function tileCoordinates(index) {
  return {
    row: Math.floor(index / SIZE),
    col: index % SIZE
  };
}

function adjacentIndices(index) {
  const { row, col } = tileCoordinates(index);
  const candidates = [];

  if (row > 0) candidates.push(index - SIZE);
  if (row < SIZE - 1) candidates.push(index + SIZE);
  if (col > 0) candidates.push(index - 1);
  if (col < SIZE - 1) candidates.push(index + 1);

  return candidates;
}

function canMove(index) {
  const emptyIndex = boardState.indexOf(0);
  return adjacentIndices(emptyIndex).includes(index);
}

function swapTiles(firstIndex, secondIndex) {
  [boardState[firstIndex], boardState[secondIndex]] =
    [boardState[secondIndex], boardState[firstIndex]];
}

function renderBoard() {
  boardElement.innerHTML = "";
  document.documentElement.style.setProperty(
    "--tile-image",
    `url("../${MODES[currentMode].image}")`
  );

  boardState.forEach((value, index) => {
    if (value === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-tile";
      empty.setAttribute("aria-label", "Empty space");
      empty.setAttribute("role", "gridcell");
      boardElement.appendChild(empty);
      return;
    }

    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "puzzle-tile";
    tile.dataset.index = String(index);
    tile.dataset.value = String(value);
    tile.setAttribute("role", "gridcell");
    tile.setAttribute("aria-label", `Tile ${value}`);

    const solvedIndex = value - 1;
    const solvedRow = Math.floor(solvedIndex / SIZE);
    const solvedCol = solvedIndex % SIZE;
    tile.style.backgroundPosition =
      `${(solvedCol / (SIZE - 1)) * 100}% ${(solvedRow / (SIZE - 1)) * 100}%`;

    const number = document.createElement("span");
    number.className = "tile-number";
    number.textContent = String(value);
    tile.appendChild(number);

    tile.addEventListener("click", () => moveTile(index));
    boardElement.appendChild(tile);
  });
}

function updateHistoryButtons() {
  undoButton.disabled = undoStack.length === 0 || gameSolved || isPaused;
  redoButton.disabled = redoStack.length === 0 || gameSolved || isPaused;
}

function updatePauseButton() {
  pauseButton.textContent = isPaused ? "Resume" : "Pause";
  pauseButton.setAttribute("aria-pressed", String(isPaused));
  pauseButton.disabled = !gameStarted || gameSolved;
  boardElement.classList.toggle("paused", isPaused);
  updateHistoryButtons();
}

function snapshotBoard() {
  return {
    board: [...boardState],
    moves
  };
}

function applySnapshot(snapshot) {
  boardState = [...snapshot.board];
  moves = snapshot.moves;
  moveCountElement.textContent = String(moves);
  renderBoard();
  updateHistoryButtons();
}

function moveTile(index) {
  if (!canMove(index) || gameSolved || isPaused) return;

  if (!gameStarted) {
    gameStarted = true;
    startTimer();
    updatePauseButton();
  }

  undoStack.push(snapshotBoard());
  redoStack = [];

  const emptyIndex = boardState.indexOf(0);
  swapTiles(index, emptyIndex);
  moves += 1;
  moveCountElement.textContent = String(moves);
  statusMessage.textContent = `Moved tile ${boardState[emptyIndex]}.`;
  renderBoard();
  updateHistoryButtons();

  if (isSolved()) {
    finishGame();
  }
}

function undoMove() {
  if (undoStack.length === 0 || gameSolved || isPaused) return;

  redoStack.push(snapshotBoard());
  applySnapshot(undoStack.pop());
  statusMessage.textContent = "Move undone.";
}

function redoMove() {
  if (redoStack.length === 0 || gameSolved || isPaused) return;

  undoStack.push(snapshotBoard());
  applySnapshot(redoStack.pop());
  statusMessage.textContent = "Move redone.";

  if (isSolved()) {
    finishGame();
  }
}

function togglePause() {
  if (!gameStarted || gameSolved) return;

  isPaused = !isPaused;

  if (isPaused) {
    stopTimer();
    statusMessage.textContent = "Game paused. Press Resume to continue.";
  } else {
    startTimer();
    statusMessage.textContent = "Game resumed.";
  }

  updatePauseButton();
}

function isSolved() {
  return boardState.every((value, index) =>
    index === TILE_COUNT - 1 ? value === 0 : value === index + 1
  );
}

function startTimer() {
  stopTimer();
  timerId = window.setInterval(() => {
    elapsedSeconds += 1;
    timerElement.textContent = formatTime(elapsedSeconds);
  }, 1000);
}

function stopTimer() {
  if (timerId !== null) {
    window.clearInterval(timerId);
    timerId = null;
  }
}

function shuffledBoard() {
  const state = solvedBoard();
  let emptyIndex = state.indexOf(0);
  let previousEmptyIndex = -1;

  for (let step = 0; step < SHUFFLE_MOVES; step += 1) {
    let options = adjacentIndices(emptyIndex).filter(
      index => index !== previousEmptyIndex
    );

    if (options.length === 0) {
      options = adjacentIndices(emptyIndex);
    }

    const chosenIndex = options[Math.floor(Math.random() * options.length)];
    [state[emptyIndex], state[chosenIndex]] =
      [state[chosenIndex], state[emptyIndex]];
    previousEmptyIndex = emptyIndex;
    emptyIndex = chosenIndex;
  }

  return state;
}

function newGame() {
  stopTimer();
  boardState = shuffledBoard();
  elapsedSeconds = 0;
  moves = 0;
  hintsRemaining = MAX_HINTS;
  gameStarted = false;
  gameSolved = false;
  isPaused = false;
  winningScore = null;
  undoStack = [];
  redoStack = [];

  timerElement.textContent = "00:00";
  moveCountElement.textContent = "0";
  hintCountElement.textContent = String(MAX_HINTS);
  saveScoreBtn.disabled = true;
  saveScoreBtn.textContent = "Save Score";
  statusMessage.textContent = "New solvable puzzle created. Make your first move.";
  renderBoard();
  updatePauseButton();
  closeWinModal();
}

function manhattanDistance(state) {
  let total = 0;

  state.forEach((value, index) => {
    if (value === 0) return;

    const goalIndex = value - 1;
    const current = tileCoordinates(index);
    const goal = tileCoordinates(goalIndex);
    total += Math.abs(current.row - goal.row) + Math.abs(current.col - goal.col);
  });

  return total;
}

function bestHintIndex() {
  const emptyIndex = boardState.indexOf(0);
  const candidates = adjacentIndices(emptyIndex);

  let bestIndex = candidates[0];
  let bestDistance = Number.POSITIVE_INFINITY;

  candidates.forEach(index => {
    const testState = [...boardState];
    [testState[emptyIndex], testState[index]] =
      [testState[index], testState[emptyIndex]];

    const distance = manhattanDistance(testState);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });

  return bestIndex;
}

function showHint() {
  if (isPaused) {
    statusMessage.textContent = "Resume the game to use a hint.";
    return;
  }

  if (gameSolved) {
    statusMessage.textContent = "The puzzle is already solved.";
    return;
  }

  if (hintsRemaining <= 0) {
    statusMessage.textContent = "No magic hints remaining.";
    return;
  }

  document.querySelectorAll(".hinted").forEach(tile =>
    tile.classList.remove("hinted")
  );

  const suggestedIndex = bestHintIndex();
  const tile = boardElement.querySelector(`[data-index="${suggestedIndex}"]`);

  if (tile) {
    tile.classList.add("hinted");
    hintsRemaining -= 1;
    hintCountElement.textContent = String(hintsRemaining);
    statusMessage.textContent =
      `Hint: try tile ${boardState[suggestedIndex]}.`;

    window.setTimeout(() => tile.classList.remove("hinted"), 2500);
  }
}

function finishGame() {
  gameSolved = true;
  isPaused = false;
  stopTimer();
  updatePauseButton();

  winningScore = {
    player_name: "",
    variant_mode: currentMode,
    moves_count: moves,
    solve_time_seconds: elapsedSeconds
  };

  sessionResults.push({
    moves,
    seconds: elapsedSeconds
  });
  updateAnalytics();

  saveScoreBtn.disabled = false;
  saveScoreBtn.textContent = "Save Score";
  winImage.src = MODES[currentMode].image;
  winSummary.textContent =
    `You finished ${MODES[currentMode].label} in ${formatTime(elapsedSeconds)} with ${moves} moves.`;
  winModal.hidden = false;
  statusMessage.textContent = "Puzzle solved. Enter your name to save the score.";
}

function updateAnalytics() {
  const completed = sessionResults.length;
  const totalMoves = sessionResults.reduce((sum, result) => sum + result.moves, 0);
  const totalSeconds = sessionResults.reduce((sum, result) => sum + result.seconds, 0);

  document.getElementById("gamesCompleted").textContent = String(completed);
  document.getElementById("averageMoves").textContent =
    completed ? String(Math.round(totalMoves / completed)) : "0";
  document.getElementById("averageTime").textContent =
    completed ? formatTime(Math.round(totalSeconds / completed)) : "00:00";
}

function setPreviewVisible(visible) {
  previewOverlay.hidden = !visible;
}

function closeWinModal() {
  winModal.hidden = true;
}

function localScores() {
  try {
    return JSON.parse(localStorage.getItem("puzzleLeaderboard") || "[]");
  } catch (error) {
    return [];
  }
}

function storeLocalScore(score) {
  const scores = localScores();
  scores.push({
    ...score,
    score_id: `local-${Date.now()}`,
    created_at: new Date().toISOString()
  });

  scores.sort((a, b) =>
    a.solve_time_seconds - b.solve_time_seconds ||
    a.moves_count - b.moves_count
  );

  localStorage.setItem(
    "puzzleLeaderboard",
    JSON.stringify(scores.slice(0, 10))
  );
}

async function saveScore(score) {
  try {
    const response = await fetch(`${API_BASE}/score.php`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(score)
    });

    if (!response.ok) {
      throw new Error("Server returned an error.");
    }

    const result = await response.json();
    if (result.status !== "success") {
      throw new Error(result.message || "Score could not be saved.");
    }

    return { source: "server", result };
  } catch (error) {
    storeLocalScore(score);
    return { source: "local", error };
  }
}

async function fetchScores() {
  try {
    const response = await fetch(
      `${API_BASE}/leaderboard.php?mode=${encodeURIComponent(currentMode)}`
    );

    if (!response.ok) {
      throw new Error("Leaderboard request failed.");
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error("Invalid leaderboard response.");
    }

    return data;
  } catch (error) {
    return localScores().filter(score => score.variant_mode === currentMode);
  }
}

function renderLeaderboard(scores) {
  leaderboardList.innerHTML = "";

  if (!scores.length) {
    const item = document.createElement("li");
    item.className = "empty-state";
    item.textContent = "No scores yet for this mode.";
    leaderboardList.appendChild(item);
    return;
  }

  scores.slice(0, 10).forEach(score => {
    const item = document.createElement("li");
    const name = document.createElement("strong");
    const meta = document.createElement("span");

    name.textContent = score.player_name;
    meta.className = "score-meta";
    meta.textContent =
      `${formatTime(Number(score.solve_time_seconds))} · ${score.moves_count} moves`;

    item.append(name, meta);
    leaderboardList.appendChild(item);
  });
}

async function loadLeaderboard() {
  leaderboardList.innerHTML = '<li class="empty-state">Loading scores…</li>';
  const scores = await fetchScores();
  renderLeaderboard(scores);
}

scoreForm.addEventListener("submit", async event => {
  event.preventDefault();

  if (!winningScore) {
    statusMessage.textContent = "Solve the puzzle before saving a score.";
    return;
  }

  const playerName = playerNameInput.value.trim();
  if (!playerName) {
    playerNameInput.focus();
    return;
  }

  const score = {
    ...winningScore,
    player_name: playerName
  };

  saveScoreBtn.disabled = true;
  saveScoreBtn.textContent = "Saving…";

  const result = await saveScore(score);
  statusMessage.textContent =
    result.source === "server"
      ? "Score saved to the database."
      : "Server unavailable. Score saved in this browser.";

  saveScoreBtn.textContent = "Saved";
  winningScore = null;
  await loadLeaderboard();
});

function updateMusicButton() {
  musicButton.textContent = musicPlaying ? "Stop Music" : "Start Music";
  musicButton.setAttribute("aria-pressed", String(musicPlaying));
}

async function playModeMusic() {
  themeAudio.src = MODES[currentMode].audio;
  themeAudio.currentTime = 0;

  try {
    await themeAudio.play();
    musicPlaying = true;
  } catch (error) {
    musicPlaying = false;
    statusMessage.textContent = "Unable to play music in this browser.";
  }

  updateMusicButton();
}

function stopModeMusic() {
  themeAudio.pause();
  themeAudio.currentTime = 0;
  musicPlaying = false;
  updateMusicButton();
}

async function toggleMusic() {
  if (musicPlaying) {
    stopModeMusic();
    return;
  }

  await playModeMusic();
}

document.getElementById("newGameBtn").addEventListener("click", newGame);
document.getElementById("hintBtn").addEventListener("click", showHint);
document.getElementById("refreshScoresBtn").addEventListener("click", loadLeaderboard);
document.getElementById("closeModalBtn").addEventListener("click", closeWinModal);
document.getElementById("playAgainBtn").addEventListener("click", newGame);
musicButton.addEventListener("click", toggleMusic);
pauseButton.addEventListener("click", togglePause);
undoButton.addEventListener("click", undoMove);
redoButton.addEventListener("click", redoMove);

const previewButton = document.getElementById("previewBtn");
["mousedown", "touchstart"].forEach(eventName =>
  previewButton.addEventListener(eventName, event => {
    event.preventDefault();
    setPreviewVisible(true);
  }, { passive: false })
);
["mouseup", "mouseleave", "touchend", "touchcancel"].forEach(eventName =>
  previewButton.addEventListener(eventName, () => setPreviewVisible(false))
);

modeSelect.addEventListener("change", async event => {
  currentMode = event.target.value;
  modeDescription.textContent = MODES[currentMode].description;
  previewImage.src = MODES[currentMode].image;
  document.documentElement.style.setProperty(
    "--tile-image",
    `url("../${MODES[currentMode].image}")`
  );

  if (musicPlaying) {
    await playModeMusic();
  } else {
    themeAudio.src = MODES[currentMode].audio;
  }

  await loadLeaderboard();
  newGame();
});

document.getElementById("themeToggle").addEventListener("click", event => {
  const isDark = document.body.classList.toggle("dark");
  event.currentTarget.textContent = isDark ? "Day Mode" : "Night Mode";
  event.currentTarget.setAttribute("aria-pressed", String(isDark));
});

document.addEventListener("keydown", event => {
  if (isPaused || gameSolved) return;

  if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
    return;
  }

  event.preventDefault();
  const emptyIndex = boardState.indexOf(0);
  const { row, col } = tileCoordinates(emptyIndex);
  let tileIndex = -1;

  if (event.key === "ArrowUp" && row < SIZE - 1) tileIndex = emptyIndex + SIZE;
  if (event.key === "ArrowDown" && row > 0) tileIndex = emptyIndex - SIZE;
  if (event.key === "ArrowLeft" && col < SIZE - 1) tileIndex = emptyIndex + 1;
  if (event.key === "ArrowRight" && col > 0) tileIndex = emptyIndex - 1;

  if (tileIndex >= 0) {
    moveTile(tileIndex);
  }
});

renderBoard();
updatePauseButton();
loadLeaderboard();
