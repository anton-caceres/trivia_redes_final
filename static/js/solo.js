let questions = [];
let currentIndex = 0;
let answers = [];
let playerName = "";

// Timer
const timePerQuestion = 20;
let timeLeft = timePerQuestion;
let timerId = null;

// DOM
const setupSection = document.getElementById("setup-section");
const gameSection = document.getElementById("game-section");
const resultSection = document.getElementById("result-section");
const statusSpan = document.getElementById("network-status");

const playerInput = document.getElementById("player-name");
const questionCountSelect = document.getElementById("question-count");
const startBtn = document.getElementById("start-btn");

const labelPlayer = document.getElementById("label-player");
const currentQuestionIndexSpan = document.getElementById(
  "current-question-index"
);
const totalQuestionsSpan = document.getElementById("total-questions");
const questionCategorySpan = document.getElementById("question-category");
const questionDifficultySpan =
  document.getElementById("question-difficulty");
const questionText = document.getElementById("question-text");
const optionsContainer = document.getElementById("options-container");
const nextBtn = document.getElementById("next-btn");

const resultPlayerName = document.getElementById("result-player-name");
const resultScore = document.getElementById("result-score");
const resultExtra = document.getElementById("result-extra");
const networkDetail = document.getElementById("network-detail");
const playAgainBtn = document.getElementById("play-again-btn");
const answersDetail = document.getElementById("answers-detail");

const timerSpan = document.getElementById("timer");
const timeMessage = document.getElementById("time-message");

// Stats
const statsLoading = document.getElementById("stats-loading");
const statsError = document.getElementById("stats-error");
const statsList = document.getElementById("stats-list");
const statTotalGames = document.getElementById("stat-total-games");
const statBestScore = document.getElementById("stat-best-score");
const statAvgScore = document.getElementById("stat-avg-score");

// Reset data
const resetDataBtn = document.getElementById("reset-data-btn");

// ---------------------------
// Red
// ---------------------------
function checkNetworkStatus() {
  fetch("/api/questions?amount=1", { method: "GET" })
    .then((r) => {
      if (!r.ok) throw new Error("Error");
      statusSpan.textContent = "🟢 Conectado al servidor";
      statusSpan.classList.remove("status-error");
      statusSpan.classList.add("status-ok");
    })
    .catch(() => {
      statusSpan.textContent = "🔴 Servidor no disponible";
      statusSpan.classList.remove("status-ok");
      statusSpan.classList.add("status-error");
    });
}

// Stats
function loadStats() {
  if (!statsLoading || !statTotalGames) return;

  fetch("/api/stats")
    .then((r) => r.json())
    .then((data) => {
      statsLoading.classList.add("hidden");
      statsError.classList.add("hidden");
      statsList.classList.remove("hidden");

      const totalGames = data.total_games ?? 0;
      const bestScore = data.best_score ?? 0;
      const bestTotal = data.best_total ?? 0;
      const avgScore = data.avg_score ?? 0;

      statTotalGames.textContent = totalGames;
      statBestScore.textContent =
        totalGames > 0 ? `${bestScore} / ${bestTotal}` : "Sin partidas aún";
      statAvgScore.textContent =
        totalGames > 0 ? avgScore.toFixed(2) : "N/A";
    })
    .catch((err) => {
      console.error("Error al cargar estadísticas:", err);
      statsLoading.classList.add("hidden");
      statsError.classList.remove("hidden");
      statsList.classList.add("hidden");
    });
}

// Timer
function updateTimerDisplay() {
  if (!timerSpan) return;
  timerSpan.textContent = timeLeft;
  timerSpan.classList.remove("timer-ok", "timer-warning", "timer-danger");
  const ratio = timeLeft / timePerQuestion;
  if (ratio > 0.5) timerSpan.classList.add("timer-ok");
  else if (ratio > 0.2) timerSpan.classList.add("timer-warning");
  else timerSpan.classList.add("timer-danger");
}

function startTimer() {
  stopTimer();
  timeLeft = timePerQuestion;
  updateTimerDisplay();
  if (timeMessage) timeMessage.textContent = "";
  timerId = setInterval(() => {
    timeLeft -= 1;
    if (timeLeft >= 0) updateTimerDisplay();
    if (timeLeft <= 0) {
      stopTimer();
      handleTimeOut();
    }
  }, 1000);
}

function stopTimer() {
  if (timerId !== null) {
    clearInterval(timerId);
    timerId = null;
  }
}

function handleTimeOut() {
  const all = optionsContainer.querySelectorAll(".option-btn");
  all.forEach((b) => (b.disabled = true));
  if (timeMessage) {
    timeMessage.textContent = "⏱ Tiempo agotado para esta pregunta.";
  }
  nextBtn.classList.remove("hidden");
}

// ---------------------------
// Juego
// ---------------------------
startBtn.onclick = () => {
  playerName = playerInput.value.trim() || "Anónimo";
  const amount = parseInt(questionCountSelect.value, 10);

  startBtn.disabled = true;
  startBtn.textContent = "Cargando preguntas...";

  fetch(`/api/questions?amount=${amount}`)
    .then((r) => r.json())
    .then((data) => {
      questions = data.questions || [];
      currentIndex = 0;
      answers = [];

      totalQuestionsSpan.textContent = questions.length;
      labelPlayer.textContent = `Jugador/a: ${playerName}`;

      setupSection.classList.add("hidden");
      resultSection.classList.add("hidden");
      gameSection.classList.remove("hidden");

      if (questions.length > 0) {
        renderQuestion();
      } else {
        questionText.textContent =
          "No se recibieron preguntas del servidor.";
      }
    })
    .catch((err) => {
      console.error("Error al obtener preguntas", err);
      alert("No se pudieron cargar las preguntas. Ver consola.");
    })
    .finally(() => {
      startBtn.disabled = false;
      startBtn.textContent = "Comenzar partida";
    });
};

function renderQuestion() {
  const q = questions[currentIndex];
  if (!q) return;
  currentQuestionIndexSpan.textContent = currentIndex + 1;
  questionCategorySpan.textContent = q.category || "";
  questionDifficultySpan.textContent = q.difficulty
    ? `Dificultad: ${q.difficulty}`
    : "";
  questionText.textContent = q.question || "";
  optionsContainer.innerHTML = "";
  nextBtn.classList.add("hidden");
  if (timeMessage) timeMessage.textContent = "";

  (q.options || []).forEach((opt, idx) => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.textContent = opt;
    btn.onclick = () => selectOption(idx, btn);
    optionsContainer.appendChild(btn);
  });

  startTimer();
}

function selectOption(idx, btnElement) {
  stopTimer();
  const all = optionsContainer.querySelectorAll(".option-btn");
  all.forEach((b) => {
    b.classList.remove("option-selected");
    b.disabled = true;
  });
  btnElement.classList.add("option-selected");

  const qid = questions[currentIndex].id;
  const existingIndex = answers.findIndex((a) => a.questionId === qid);

  if (existingIndex >= 0) {
    answers[existingIndex].selectedIndex = idx;
  } else {
    answers.push({ questionId: qid, selectedIndex: idx });
  }

  nextBtn.classList.remove("hidden");
}

nextBtn.onclick = () => {
  stopTimer();
  if (currentIndex < questions.length - 1) {
    currentIndex++;
    renderQuestion();
  } else {
    finishGame();
  }
};

function finishGame() {
  stopTimer();
  gameSection.classList.add("hidden");
  resultSection.classList.remove("hidden");

  fetch("/api/submit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      playerName,
      answers,
    }),
  })
    .then((r) => r.json())
    .then((data) => {
      resultPlayerName.textContent = data.playerName || playerName;
      resultScore.textContent = `${data.score} / ${data.total}`;

      const ratio = data.total > 0 ? data.score / data.total : 0;
      let msg = "";
      if (ratio === 1) msg = "¡Perfecto! 🎉";
      else if (ratio >= 0.7) msg = "¡Muy bien! 🙌";
      else if (ratio >= 0.4) msg = "Bien, pero se puede mejorar 😉";
      else msg = "Toca estudiar un poquito más 😅";
      resultExtra.textContent = msg;

      networkDetail.textContent = `La partida se registró desde la IP ${data.clientIp} usando: ${data.userAgent}. Esto muestra la parte de redes del proyecto (cliente–servidor, HTTP y registro por IP).`;

      const details = data.details || [];
      if (answersDetail) {
        if (!details.length) {
          answersDetail.innerHTML =
            "<p class='note'>No se recibió detalle de respuestas.</p>";
        } else {
          let html = `
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Pregunta</th>
                  <th>Tu respuesta</th>
                  <th>Respuesta correcta</th>
                </tr>
              </thead>
              <tbody>
          `;
          details.forEach((d, idx) => {
            const num = idx + 1;
            const options = d.options || [];
            const selectedIndex = d.selectedIndex;
            const correctIndex = d.correctIndex;
            const selectedText =
              selectedIndex != null &&
              selectedIndex >= 0 &&
              selectedIndex < options.length
                ? options[selectedIndex]
                : "No respondió";
            const correctText =
              correctIndex != null &&
              correctIndex >= 0 &&
              correctIndex < options.length
                ? options[correctIndex]
                : "";
            const rowClass = d.isCorrect
              ? "answer-correct"
              : "answer-incorrect";
            const icon = d.isCorrect ? "✅" : "❌";
            html += `
              <tr class="${rowClass}">
                <td>${num}</td>
                <td>${d.question}</td>
                <td>${icon} ${selectedText}</td>
                <td>${correctText}</td>
              </tr>
            `;
          });
          html += "</tbody></table>";
          answersDetail.innerHTML = html;
        }
      }
    })
    .catch((err) => {
      console.error("Error al enviar resultados", err);
      resultExtra.textContent =
        "Hubo un problema al registrar el resultado en el servidor.";
    });
}

playAgainBtn.onclick = () => {
  stopTimer();
  setupSection.classList.remove("hidden");
  resultSection.classList.add("hidden");
  gameSection.classList.add("hidden");
};

// Reset datos
if (resetDataBtn) {
  resetDataBtn.onclick = () => {
    const ok = confirm(
      "¿Seguro que querés borrar el historial de partidas y eventos del servidor (modo solo)?"
    );
    if (!ok) return;
    fetch("/reset_data", { method: "POST" })
      .then((r) => r.json())
      .then((data) => {
        alert(data.msg || "Datos reseteados.");
        window.location.reload();
      })
      .catch((err) => {
        console.error("Error al resetear datos:", err);
        alert("Hubo un error al intentar resetear los datos.");
      });
  };
}

// On load
window.onload = () => {
  checkNetworkStatus();
  setInterval(checkNetworkStatus, 5000);
  loadStats();
};
