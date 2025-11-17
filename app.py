from flask import Flask, render_template, request, jsonify
import random
import csv
import datetime
import os

app = Flask(__name__)

# -------------------------- PREGUNTAS (REDES BÁSICO) --------------------------

TRIVIA_QUESTIONS = [
    {
        "id": 1,
        "category": "Redes",
        "difficulty": "Fácil",
        "question": "¿Qué significa la sigla IP en redes?",
        "options": ["Internet Protocol", "Internal Process", "Inter Password", "Input Package"],
        "answer_index": 0,
    },
    {
        "id": 2,
        "category": "Redes",
        "difficulty": "Fácil",
        "question": "¿Cuál es la máscara de red típica para una red clase C?",
        "options": ["255.255.0.0", "255.255.255.0", "255.0.0.0", "255.255.255.255"],
        "answer_index": 1,
    },
    {
        "id": 3,
        "category": "Protocolos",
        "difficulty": "Media",
        "question": "¿Cuál de estos protocolos se usa para obtener una dirección IP automáticamente?",
        "options": ["DNS", "HTTP", "DHCP", "FTP"],
        "answer_index": 2,
    },
    {
        "id": 4,
        "category": "Protocolos",
        "difficulty": "Media",
        "question": "¿Qué protocolo se utiliza para traducir nombres de dominio en direcciones IP?",
        "options": ["SMTP", "DNS", "TCP", "ARP"],
        "answer_index": 1,
    },
    {
        "id": 5,
        "category": "Capa física",
        "difficulty": "Fácil",
        "question": "¿Qué dispositivo se utiliza normalmente para conectar dispositivos en una red LAN?",
        "options": ["Switch", "Router", "Repetidor", "Firewall"],
        "answer_index": 0,
    },
    {
        "id": 6,
        "category": "Capa de enlace",
        "difficulty": "Fácil",
        "question": "¿Cuál de estos corresponde a una dirección MAC válida?",
        "options": ["192.168.1.1", "00:1A:2B:3C:4D:5E", "255.255.255.0", "A1-B2-C3"],
        "answer_index": 1,
    },
    {
        "id": 7,
        "category": "TCP/IP",
        "difficulty": "Media",
        "question": "¿Qué protocolo garantiza transmisión confiable de datos?",
        "options": ["UDP", "ARP", "TCP", "ICMP"],
        "answer_index": 2,
    },
    {
        "id": 8,
        "category": "TCP/IP",
        "difficulty": "Media",
        "question": "¿Cuál es la función principal de un router?",
        "options": [
            "Conectar redes diferentes",
            "Repetir señal eléctrica",
            "Asignar direcciones MAC",
            "Proteger contra virus",
        ],
        "answer_index": 0,
    },
    {
        "id": 9,
        "category": "Redes",
        "difficulty": "Media",
        "question": "¿Qué tipo de IP es '192.168.0.15'?",
        "options": ["IP pública", "IP privada", "IP de Loopback", "IP inválida"],
        "answer_index": 1,
    },
    {
        "id": 10,
        "category": "Servicios",
        "difficulty": "Fácil",
        "question": "¿Cuál es el puerto estándar de HTTP?",
        "options": ["21", "25", "80", "443"],
        "answer_index": 2,
    },
    {
        "id": 11,
        "category": "Servicios",
        "difficulty": "Media",
        "question": "¿Qué servicio funciona en el puerto 443?",
        "options": ["FTP Seguro", "HTTPS", "DHCP", "SSH"],
        "answer_index": 1,
    },
    {
        "id": 12,
        "category": "Diagnóstico",
        "difficulty": "Media",
        "question": "¿Qué comando sirve para verificar si un host responde en la red?",
        "options": ["dig", "ssh", "traceroute", "ping"],
        "answer_index": 3,
    },
]

QUESTION_BANK = {q["id"]: q for q in TRIVIA_QUESTIONS}

SCORES_FILE = "scores.csv"
EVENTS_FILE = "events_trivia.csv"


# -------------------------- HELPERS LOGS (MODO SOLO) --------------------------


def save_score(player_name, score, total, client_ip, user_agent):
    """Guarda resultado de una partida (para scoreboard de modo solo)."""
    file_exists = os.path.isfile(SCORES_FILE)
    with open(SCORES_FILE, "a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        if not file_exists:
            writer.writerow(
                [
                    "timestamp",
                    "player_name",
                    "score",
                    "total",
                    "client_ip",
                    "user_agent",
                ]
            )
        writer.writerow(
            [
                datetime.datetime.now().isoformat(timespec="seconds"),
                player_name,
                score,
                total,
                client_ip,
                user_agent,
            ]
        )


def log_event(event_type, extra=None):
    """Loguea eventos de red / juego (modo solo)."""
    if extra is None:
        extra = {}
    client_ip = request.remote_addr if request else "N/A"
    user_agent = request.headers.get("User-Agent", "Unknown") if request else "N/A"

    file_exists = os.path.isfile(EVENTS_FILE)
    with open(EVENTS_FILE, "a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        if not file_exists:
            writer.writerow(
                [
                    "timestamp",
                    "event_type",
                    "client_ip",
                    "user_agent",
                    "extra",
                ]
            )
        writer.writerow(
            [
                datetime.datetime.now().isoformat(timespec="seconds"),
                event_type,
                client_ip,
                user_agent,
                repr(extra),
            ]
        )


# -------------------------- ESTADO MODO VS --------------------------

vs_game = {
    "players": {"A": None, "B": None},
    "scores": {"A": 0, "B": 0},
    "turn": "A",
    "questions_order": [],
    "current_q_index": 0,
    "finished": False,
    "winner": None,
    "last_event": "",
}


def vs_reset_game():
    vs_game["players"] = {"A": None, "B": None}
    vs_game["scores"] = {"A": 0, "B": 0}
    vs_game["turn"] = "A"
    vs_game["questions_order"] = []
    vs_game["current_q_index"] = 0
    vs_game["finished"] = False
    vs_game["winner"] = None
    vs_game["last_event"] = ""


def vs_start_game_if_ready():
    if vs_game["players"]["A"] and vs_game["players"]["B"] and not vs_game["questions_order"]:
        ids = [q["id"] for q in TRIVIA_QUESTIONS]
        random.shuffle(ids)
        vs_game["questions_order"] = ids
        vs_game["current_q_index"] = 0
        vs_game["turn"] = random.choice(["A", "B"])
        vs_game["last_event"] = f"Comienza la partida. Turno de {vs_game['turn']}."


def vs_get_current_question():
    if vs_game["finished"]:
        return None
    if not vs_game["questions_order"]:
        return None
    if vs_game["current_q_index"] >= len(vs_game["questions_order"]):
        return None
    qid = vs_game["questions_order"][vs_game["current_q_index"]]
    return QUESTION_BANK.get(qid)


def vs_finish_if_no_more_questions():
    if vs_game["current_q_index"] >= len(vs_game["questions_order"]):
        vs_game["finished"] = True
        a = vs_game["scores"]["A"]
        b = vs_game["scores"]["B"]
        if a > b:
            vs_game["winner"] = "A"
            vs_game["last_event"] = f"Partida terminada. Gana el jugador A ({a} a {b})."
        elif b > a:
            vs_game["winner"] = "B"
            vs_game["last_event"] = f"Partida terminada. Gana el jugador B ({b} a {a})."
        else:
            vs_game["winner"] = "draw"
            vs_game["last_event"] = f"Partida terminada. Empate ({a} a {b})."


# -------------------------- RUTAS HTML --------------------------


@app.route("/")
def home():
    return render_template("home.html")


@app.route("/solo")
def solo_view():
    return render_template("solo.html")


@app.route("/vs")
def vs_view():
    return render_template("vs.html")


@app.route("/scoreboard")
def scoreboard():
    rows = []
    if os.path.isfile(SCORES_FILE):
        with open(SCORES_FILE, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            rows = list(reader)
    return render_template("scoreboard.html", rows=rows)


@app.route("/debug")
def debug_view():
    total_partidas = 0
    if os.path.isfile(SCORES_FILE):
        with open(SCORES_FILE, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            total_partidas = sum(1 for _ in reader)

    info = {
        "total_preguntas_configuradas": len(TRIVIA_QUESTIONS),
        "archivo_scores": SCORES_FILE,
        "archivo_eventos": EVENTS_FILE,
        "total_partidas_registradas": total_partidas,
    }
    return render_template("debug.html", info=info)


# -------------------------- API MODO SOLO --------------------------


@app.route("/api/questions")
def api_questions():
    amount = int(request.args.get("amount", 5))
    questions = random.sample(TRIVIA_QUESTIONS, min(amount, len(TRIVIA_QUESTIONS)))

    client_questions = []
    for q in questions:
        client_questions.append(
            {
                "id": q["id"],
                "category": q["category"],
                "difficulty": q["difficulty"],
                "question": q["question"],
                "options": q["options"],
            }
        )

    log_event("get_questions", {"amount": amount})
    return jsonify({"questions": client_questions})


@app.route("/api/submit", methods=["POST"])
def api_submit():
    data = request.get_json() or {}
    player_name = data.get("playerName", "Anónimo")
    answers = data.get("answers", [])

    correct = 0
    total = len(answers)

    question_map = {q["id"]: q for q in TRIVIA_QUESTIONS}
    details = []

    for ans in answers:
        qid = ans.get("questionId")
        selected = ans.get("selectedIndex")
        q = question_map.get(qid)
        if not q:
            continue

        is_correct = selected == q["answer_index"]
        if is_correct:
            correct += 1

        details.append(
            {
                "question": q["question"],
                "options": q["options"],
                "correctIndex": q["answer_index"],
                "selectedIndex": selected,
                "isCorrect": is_correct,
            }
        )

    client_ip = request.remote_addr
    user_agent = request.headers.get("User-Agent", "Unknown")

    save_score(player_name, correct, total, client_ip, user_agent)
    log_event(
        "submit_game",
        {
            "player_name": player_name,
            "score": correct,
            "total": total,
        },
    )

    return jsonify(
        {
            "playerName": player_name,
            "score": correct,
            "total": total,
            "clientIp": client_ip,
            "userAgent": user_agent,
            "details": details,
        }
    )


@app.route("/api/stats")
def api_stats():
    total_games = 0
    best_score = 0
    best_total = 0
    sum_scores = 0
    sum_totals = 0

    if os.path.isfile(SCORES_FILE):
        with open(SCORES_FILE, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    score = int(row["score"])
                    total = int(row["total"])
                except (KeyError, ValueError):
                    continue

                total_games += 1
                sum_scores += score
                sum_totals += total

                if score > best_score or (score == best_score and total > best_total):
                    best_score = score
                    best_total = total

    avg_score = 0.0
    if total_games > 0:
        avg_score = sum_scores / total_games

    return jsonify(
        {
            "total_games": total_games,
            "best_score": best_score,
            "best_total": best_total,
            "avg_score": avg_score,
        }
    )


@app.route("/reset_data", methods=["POST"])
def reset_data():
    deleted = []
    for file in (SCORES_FILE, EVENTS_FILE):
        if os.path.isfile(file):
            os.remove(file)
            deleted.append(file)

    return jsonify(
        {
            "ok": True,
            "deleted": deleted,
            "msg": "Datos de trivia (modo solo) reseteados correctamente.",
        }
    )


# -------------------------- API MODO VS --------------------------


@app.route("/api/vs/join", methods=["POST"])
def vs_join():
    data = request.get_json() or {}
    player_name = data.get("playerName", "").strip() or "Anónimo"

    if vs_game["players"]["A"] and vs_game["players"]["B"]:
        return jsonify({"ok": False, "error": "La sala ya tiene 2 jugadores."}), 409

    now = datetime.datetime.now().isoformat(timespec="seconds")

    if not vs_game["players"]["A"]:
        role = "A"
    else:
        role = "B"

    vs_game["players"][role] = {"name": player_name, "joined_at": now}
    vs_game["last_event"] = f"Jugador {role} ({player_name}) se unió a la partida."

    vs_start_game_if_ready()

    return jsonify({"ok": True, "role": role, "playerName": player_name})


@app.route("/api/vs/state")
def vs_state():
    if not vs_game["players"]["A"] or not vs_game["players"]["B"]:
        status = "waiting"
    elif vs_game["finished"]:
        status = "finished"
    else:
        status = "playing"

    q = vs_get_current_question()
    if q and not vs_game["finished"]:
        question_payload = {
            "id": q["id"],
            "category": q["category"],
            "difficulty": q["difficulty"],
            "question": q["question"],
            "options": q["options"],
        }
    else:
        question_payload = None

    return jsonify(
        {
            "status": status,
            "players": vs_game["players"],
            "scores": vs_game["scores"],
            "turn": vs_game["turn"],
            "question": question_payload,
            "finished": vs_game["finished"],
            "winner": vs_game["winner"],
            "lastEvent": vs_game["last_event"],
        }
    )


@app.route("/api/vs/answer", methods=["POST"])
def vs_answer():
    if not vs_game["players"]["A"] or not vs_game["players"]["B"]:
        return jsonify({"ok": False, "error": "La partida aún no tiene 2 jugadores."}), 400

    if vs_game["finished"]:
        return jsonify({"ok": False, "error": "La partida ya terminó."}), 400

    data = request.get_json() or {}
    role = data.get("role")
    selected_index = data.get("selectedIndex")

    if role not in ["A", "B"]:
        return jsonify({"ok": False, "error": "Rol inválido."}), 400

    if role != vs_game["turn"]:
        return jsonify({"ok": False, "error": "No es tu turno."}), 403

    q = vs_get_current_question()
    if not q:
        vs_finish_if_no_more_questions()
        return jsonify({"ok": False, "error": "No hay más preguntas."}), 400

    correct_index = q["answer_index"]
    is_correct = (selected_index == correct_index)
    player_name = vs_game["players"][role]["name"] if vs_game["players"][role] else role

    if is_correct:
        vs_game["scores"][role] += 1
        vs_game["last_event"] = f"{player_name} respondió BIEN y mantiene el turno."
    else:
        other = "B" if role == "A" else "A"
        vs_game["turn"] = other
        vs_game["last_event"] = f"{player_name} respondió MAL. Turno de {other}."

    vs_game["current_q_index"] += 1
    vs_finish_if_no_more_questions()

    return jsonify(
        {
            "ok": True,
            "correct": is_correct,
            "correctIndex": correct_index,
            "newScores": vs_game["scores"],
            "finished": vs_game["finished"],
            "winner": vs_game["winner"],
            "lastEvent": vs_game["last_event"],
            "nextTurn": vs_game["turn"],
        }
    )


@app.route("/api/vs/reset", methods=["POST"])
def vs_reset():
    vs_reset_game()
    return jsonify({"ok": True, "msg": "Partida VS reseteada."})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, debug=True)
