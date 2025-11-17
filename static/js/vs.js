let myRole = null;
let myName = "";
let currentQuestionId = null;

// DOM
const setupSection = document.getElementById("setup-section");
const gameSection = document.getElementById("game-section");
const networkStatus = document.getElementById("network-status");

const joinBtn = document.getElementById("join-btn");
const playerNameInput = document.getElementById("player-name");
const joinStatus = document.getElementById("join-status");

const myRoleLabel = document.getElementById("my-role-label");
const turnLabel = document.getElementById("turn-label");

const playerANameSpan = document.getElementById("player-a-name");
const playerAScoreSpan = document.getElementById("player-a-score");
const playerBNameSpan = document.getElementById("player-b-name");
const playerBScoreSpan = document.getElementById("player-b-score");

const waitingMessage = document.getElementById("waiting-message");
const questionArea = document.getElementById("question-area");
const questionCategorySpan = document.getElementById("question-category");
const questionDifficultySpan = document.getElementById("question-difficulty");
const questionText = document.getElementById("question-text");
const optionsContainer = document.getElementById("options-container");

const gameEvent = document.getElementById("game-event");
const resetBtn = document.getElementById("reset-btn");

// ---------------------------
// Check server
// ---------------------------
function checkServer() {
  fetch("/api/vs/state")
    .then((r) => {
      if (!r.ok) throw new Error("Error");
      networkStatus.textContent = "🟢 Conectado al servidor VS";
      networkStatus.classList.remove("status-error");
      networkStatus.classList.add("status-ok");
    })
    .catch(() => {
      networkStatus.textContent = "🔴 No se puede contactar al servidor VS";
      networkStatus.classList.remove("status-ok");
      networkStatus.classList.add("status-error");
    });
}

// ---------------------------
// Join
// ---------------------------
joinBtn.onclick = () => {
  const name = playerNameInput.value.trim() || "Anónimo";
  joinBtn.disabled = true;
  joinStatus.textContent = "Uniéndote a la sala...";

  fetch("/api/vs/join", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ playerName: name }),
  })
    .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
    .then(({ ok, data }) => {
      if (!ok || !data.ok) {
        joinStatus.textContent =
          data.error || "No se pudo unir a la sala. Intenta más tarde.";
        joinBtn.disabled = false;
        return;
      }

      myRole = data.role;
      myName = data.playerName;
      myRoleLabel.textContent = `${myRole} (${myName})`;

      joinStatus.textContent = `Te uniste como jugador ${myRole}. Esperando estado de la partida...`;

      setupSection.classList.add("hidden");
      gameSection.classList.remove("hidden");

      startPolling();
    })
    .catch((err) => {
      console.error("Error al unirse:", err);
      joinStatus.textContent = "Error al unirse a la sala.";
      joinBtn.disabled = false;
    });
};

// ---------------------------
// Polling
// ---------------------------
let pollingInterval = null;

function startPolling() {
  if (pollingInterval) clearInterval(pollingInterval);
  fetchState();
  pollingInterval = setInterval(fetchState, 2000);
}

function fetchState() {
  fetch("/api/vs/state")
    .then((r) => r.json())
    .then((state) => {
      updateFromState(state);
    })
    .catch((err) => {
      console.error("Error al obtener estado:", err);
    });
}

function updateFromState(state) {
  const pA = state.players.A;
  const pB = state.players.B;

  playerANameSpan.textContent = pA ? pA.name : "Esperando...";
  playerBNameSpan.textContent = pB ? pB.name : "Esperando...";
  playerAScoreSpan.textContent = state.scores.A;
  playerBScoreSpan.textContent = state.scores.B;

  if (state.finished) {
    turnLabel.textContent = "-";
  } else {
    turnLabel.textContent = state.turn || "-";
  }

  gameEvent.textContent = state.lastEvent || "";

  if (state.status === "waiting") {
    waitingMessage.classList.remove("hidden");
    questionArea.classList.add("hidden");
    return;
  } else {
    waitingMessage.classList.add("hidden");
  }

  if (state.status === "finished" || state.finished) {
    questionArea.classList.add("hidden");
    let msg = "";
    if (state.winner === "A") {
      msg = `La partida terminó. Ganó el jugador A (${state.scores.A} a ${state.scores.B}).`;
    } else if (state.winner === "B") {
      msg = `La partida terminó. Ganó el jugador B (${state.scores.B} a ${state.scores.A}).`;
    } else {
      msg = `La partida terminó en empate (${state.scores.A} a ${state.scores.B}).`;
    }
    gameEvent.textContent = msg;
    return;
  }

  const q = state.question;
  if (!q) {
    questionArea.classList.add("hidden");
    return;
  }

  questionArea.classList.remove("hidden");

  questionCategorySpan.textContent = q.category || "";
  questionDifficultySpan.textContent = q.difficulty
    ? `Dificultad: ${q.difficulty}`
    : "";
  questionText.textContent = q.question || "";
  currentQuestionId = q.id;

  renderOptions(q.options || [], state.turn);
}

function renderOptions(options, currentTurn) {
  optionsContainer.innerHTML = "";
  const isMyTurn = myRole && currentTurn === myRole;

  options.forEach((opt, idx) => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.textContent = opt;

    if (!isMyTurn) {
      btn.disabled = true;
    } else {
      btn.onclick = () => sendAnswer(idx);
    }

    optionsContainer.appendChild(btn);
  });

  if (!isMyTurn && myRole) {
    gameEvent.textContent =
      (gameEvent.textContent || "") +
      ` (No es tu turno, está jugando ${currentTurn}).`;
  }
}

// ---------------------------
// Responder
// ---------------------------
function sendAnswer(selectedIndex) {
  if (currentQuestionId == null || !myRole) return;

  const all = optionsContainer.querySelectorAll(".option-btn");
  all.forEach((b) => (b.disabled = true));

  fetch("/api/vs/answer", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      role: myRole,
      selectedIndex: selectedIndex,
    }),
  })
    .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
    .then(({ ok, data }) => {
      if (!ok || !data.ok) {
        console.error("Error al responder:", data.error);
        gameEvent.textContent =
          data.error || "Hubo un problema al enviar tu respuesta.";
        return;
      }
      fetchState();
    })
    .catch((err) => {
      console.error("Error al enviar respuesta:", err);
      gameEvent.textContent = "Error al comunicar con el servidor.";
    });
}

// ---------------------------
// Reset VS
// ---------------------------
resetBtn.onclick = () => {
  const ok = confirm(
    "¿Seguro que querés resetear completamente la partida y la sala?"
  );
  if (!ok) return;

  fetch("/api/vs/reset", {
    method: "POST",
  })
    .then((r) => r.json())
    .then((data) => {
      alert(data.msg || "Partida reseteada.");
      window.location.reload();
    })
    .catch((err) => {
      console.error("Error al resetear:", err);
      alert("No se pudo resetear la partida.");
    });
};

// ---------------------------
// On load
// ---------------------------
window.onload = () => {
  checkServer();
  setInterval(checkServer, 5000);
};
