📘 Trivia en Red – Proyecto de Redes (Flask + Cliente/Servidor)

Este proyecto implementa un servidor de juegos de trivia en red, accesible desde cualquier dispositivo dentro de la red local o mediante IP pública, cumpliendo la consigna de un sistema cliente–servidor real.

Incluye dos modos:

🎯 Modo Solo: el jugador responde preguntas y el servidor registra el puntaje, IP y navegador.

⚔️ Modo VS (1 vs 1): dos jugadores se conectan al mismo servidor para competir por turnos, en tiempo real.

El sistema registra logs, scoreboard, eventos de red y demuestra conceptos de puertos, IP, HTTP y comunicación entre cliente y servidor.

🚀 Características principales
✔️ 1. Servidor Flask accesible por red

El servidor se ejecuta usando:

host=0.0.0.0
port=8080


Esto permite que cualquier dispositivo conectado a tu red (o Internet si usás IP pública + port forwarding) acceda al juego mediante:

http://IP_DEL_SERVIDOR:8081

✔️ 2. Modo Solo (Single Player)

Preguntas aleatorias.

Temporizador de 20 segundos por pregunta ⏱.

Corrección automática.

Registro de puntaje en archivo scores.csv.

Registro de eventos de red en events_trivia.csv.

Detalle de respuestas correctas e incorrectas.

Estadísticas:

Total partidas jugadas

Mejor puntaje

Promedio general

✔️ 3. Modo VS (1 vs 1)

Dos jugadores se conectan al mismo servidor:

Sistema de lobby (sala).

Roles: Jugador A y Jugador B.

Turnos alternados.

Corrección de respuestas en tiempo real.

Polling cada 2 segundos para sincronizar el estado de la partida.

Ganador determinado por puntaje final.

Botón de “Resetear partida” (admin).

✔️ 4. Debug del servidor

Incluye página /debug para defender el proyecto:

Archivos CSV utilizados.

Cantidad de partidas registradas.

Preguntas totales configuradas.

Demostración del lado servidor de una arquitectura cliente–servidor real.

✔️ 5. Scoreboard

Página /scoreboard con tabla de partidas jugadas:

Fecha/hora.

Jugador.

Puntaje.

IP de origen.

User-Agent (navegador).

Perfecto para explicar redes: headers, IP, cliente, request, logs, etc.

📂 Estructura del proyecto
trivia_red/
│── app.py
│── scores.csv (se genera solo)
│── events_trivia.csv (se genera solo)
│
├── templates/
│   ├── home.html
│   ├── solo.html
│   ├── vs.html
│   ├── scoreboard.html
│   └── debug.html
│
├── static/
│   ├── css/styles.css
│   └── js/
│       ├── solo.js
│       └── vs.js
│
└── README.md

🖥️ Instalación y ejecución
1️⃣ Instalar dependencias
pip install flask

2️⃣ Ejecutar el servidor
python app.py

3️⃣ Ingresar al juego

Desde cualquier navegador:

http://127.0.0.1:8081/


o desde otro dispositivo en tu red:

http://IP_LOCAL_DEL_SERVIDOR:8080/

🌐 Uso con IP pública (Port Forwarding)

Para usarlo desde fuera de tu casa:

Abrir puerto 8081 en tu router.

Redirigirlo a la IP local de la PC del servidor.

Entrar desde Internet usando:

http://TU_IP_PUBLICA:8081/

🧠 Tecnologías usadas

Python 3

Flask (microframework web)

HTML + CSS + JS vanilla

CSV para persistencia

API REST + HTTP

Polling para sincronización en VS
