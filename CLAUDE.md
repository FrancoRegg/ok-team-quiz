# CLAUDE.md — OK TEAM Quiz

Guía para retomar el trabajo en este repo. Se actualiza al cerrar cada tanda (ver [Cómo mantener este archivo](#cómo-mantener-este-archivo)).

> **El repositorio es público.** Acá no van secretos, datos del cliente ni el detalle explotable de vulnerabilidades sin corregir: ese detalle vive en la checklist privada.

## Contexto que cambia cómo se trabaja

- Trivia en tiempo real para eventos presenciales. El **Host** (proyector) muestra las preguntas, los **jugadores** responden desde el celular y el **Admin** gestiona preguntas y puntajes.
- **Está en producción, en uso por una empresa cliente.** Deploy en Render: https://ok-team-quiz.onrender.com
- **Un push a `master` despliega solo en producción.** No hay acceso al Render del cliente (ni logs ni rollback).
- **Staging propio de Franco** (Render, capa gratuita, desde 2026-09-17): despliega la rama `mejoras-cliente` de GitHub. Un push a `mejoras-cliente` actualiza el staging, no producción. Se duerme tras un rato sin uso (el primer pedido tarda y se pierde la partida en memoria).
- El estado de la partida vive en memoria de un único proceso: un reinicio o deploy corta la partida en curso.
- El esquema se sincroniza con `sequelize.sync({ alter: true })` en cada arranque, contra la base viva: **cambiar un modelo altera la tabla de producción en el próximo deploy.** Confirmar con Franco antes de tocar modelos o el flujo de sockets.

## Flujo de trabajo acordado

1. El trabajo va en **tandas** tomadas de la checklist privada [Mantenimiento OK TEAM Quiz](https://claude.ai/artifact/WGtSSiWaWNhvNxPgMNeqaX): lista **A** = hallazgos propios, lista **B** = requerimientos del cliente. Los IDs de este archivo son los de la checklist.
2. Los worktrees nuevos nacen de `master`. Antes de trabajar, avanzar la rama del worktree: `git merge --ff-only mejoras-cliente`.
3. Investigar cada ítem contra el código antes de tocarlo. Si el diagnóstico estaba mal, corregirlo en la checklist.
4. **Un commit por ítem** o unidad lógica. Mensaje con el estilo de Franco: **una sola línea en inglés**, mayúscula inicial, sin punto final, **sin cuerpo y sin trailer `Co-Authored-By`**; a veces con prefijo de área (`Security: Rate Limit on admin login`). Los commits hasta `dc30b1f` tienen cuerpo largo: quedaron así porque ya estaban pusheados. Comentarios en el código en **español**.
5. Verificar cada cambio: tests del server, build del cliente y, cuando aplique, la app corriendo. El server de prueba va en el **puerto 3100** (Franco suele tener el suyo en 3000). Borrar los datos de prueba de la base local al terminar.
6. Llevar los commits a **`mejoras-cliente`** con fast-forward, comprobando antes que la carpeta principal del repo esté limpia.
7. **Nunca tocar `master`**: ni merge ni push. Lo hace Franco o lo pide explícitamente. Push a GitHub solo cuando lo pida: un push a `mejoras-cliente` despliega el staging.
8. Al cerrar la tanda: tildar lo terminado en la checklist y actualizar este archivo.

## Estado de ramas (2026-09-26)

| Rama | Estado |
|---|---|
| `master` | `7deb2ad`, igual en GitHub. Es lo que corre en producción. |
| `mejoras-cliente` | En GitHub (`8ca52a6`): tandas 1 a 4 completas, pusheadas y probadas por Franco en el staging. En local, además, la primera parte de la tanda 5 (A1, A3, A25, A32, A33, A31), sin pushear. |
| `feature_*`, `IC`, `password`, `refactoring` | Históricas, ya integradas en `master`. |

Plan de entrega: tanda por tanda, push a `mejoras-cliente`, CI en verde y prueba de Franco en el staging. No fusionar a `master` sin la decisión de Franco.

## Comandos

| Comando | Dónde | Para qué |
|---|---|---|
| `npm start` | raíz | Server de producción (`node server/server.js`) |
| `npm run build` | raíz | Instala y compila el cliente en `client/dist`. En Render no sirve tal cual (ver Trampas) |
| `npm run dev` | `server/` | Server con nodemon |
| `npm test` / `npm run test:watch` | `server/` | Tests (Vitest). No necesitan base ni `.env` |
| `npx vitest run --sequence.shuffle` | `server/` | Suite en orden aleatorio |
| `node seed.js --confirm` | `server/` | Preguntas de ejemplo. **Borra todas las preguntas.** Se niega a correr contra producción |
| `npm run dev` | `client/` | Vite en 5173, con proxy de `/api` a 3000 |
| `npm run dev:https` | `client/` | Vite por HTTPS, para probar Wake Lock desde el celular |
| `npm run lint` | `client/` | ESLint. Está en cero y el CI falla ante cualquier hallazgo (`--max-warnings=0`) |

- Logs del server en los tests: `TEST_LOGS=1 npm test` (bash) o `$env:TEST_LOGS=1; npm test` (PowerShell).
- **Probar sin pisar lo de Franco**, que suele tener su server en 3000 y su Vite en 5173: copiar `server/.env` de la carpeta principal y levantar `PORT=3100 NODE_ENV=production CLIENT_URL=http://localhost:5180 node server.js` en `server/` y `VITE_API_URL=http://localhost:3100 VITE_SOCKET_URL=http://localhost:3100 npx vite --port 5180 --strictPort` en `client/`. `NODE_ENV=production` hace que CORS acepte solo `CLIENT_URL`; en desarrollo el 5180 no está en la lista. Al terminar: cortar solo los PID de 3100 y 5180, borrar los jugadores de prueba de su base y el `.env` copiado.
- Variables: `server/.env` (ver `server/.env.example`; `JWT_SECRET` es obligatoria) y `client/.env.local` (`VITE_API_URL`, `VITE_SOCKET_URL`). En producción la base sale de `DATABASE_URL` y las `VITE_*` quedan vacías (mismo origen).

## Arquitectura

Monorepo sin workspaces. El `package.json` de la raíz es el del deploy: dependencias del server más los scripts `start` y `build`.

- **`server/`**: CommonJS. Express 5, Socket.io 4, Sequelize 6 sobre PostgreSQL, JWT, bcrypt.
- **`client/`**: ESM. React 19, Vite 7, React Router 7, socket.io-client.
- En producción Express sirve `client/dist` y devuelve `index.html` para cualquier ruta que no sea `/api`.

### Servidor

- `server.js`: corta si falta `JWT_SECRET`. Monta CORS, Socket.io, handlers, rutas `/api/*`, un 404 JSON para `/api` desconocido, los estáticos y el manejador global de errores. Arranque: `testConnection → sync({ alter }) → initializePassword → loadQuestions → listen`. Si algo falla, `process.exit(1)`.
- `config/`: `db.js` (`DATABASE_URL` con SSL o variables `PG*`), `cors.js` (orígenes por entorno más `LOCAL_IP`), `socket.js`, `sync.js`.
- `utils/gameState.js`: todo el estado de la partida en variables de módulo, con getters y setters. `players` y `playerTimeouts` se exportan por referencia: se mutan, nunca se reasignan. `resetGame()` vuelve la partida al lobby con sesión nueva pero **no toca los jugadores**: eso lo decide `reset_game` según la opción elegida.
- `utils/gameLogics.js`: `loadQuestions` y `sendNextQuestion`.
- `sockets/authorization.js`: `isGameController(socket)`. Los cinco eventos de control (`next_question`, `previous_question`, `activate_answers`, `show_answer`, `reset_game`) solo se aceptan del socket que entró como HOST o de uno del panel admin, que manda su token en el handshake (`middleware/socketAuth.js`). El acceso a `/host` sigue abierto, por decisión de Franco: el evento es chico y controlado.
- `sockets/`: `playerHandlers` (`join_game`, `disconnect` con 30 s de gracia), `gameHandlers` (`next_question`, `previous_question`, `activate_answers` con timer, `show_answer`), `answerHandlers` (`submit_answer` y puntaje), `adminHandlers` (`reset_game`).
- REST: `/api/auth` (`login` con rate limit, `change-password` con JWT, `recover-with-code`), `/api/questions` (CRUD con JWT), `/api/players` (listar, `PUT /:id` con `scoreChange`, `DELETE /clean-season`; con JWT).
- Modelos: `Question` (`title`, `type` TEXT|IMAGE|VIDEO, `options[]`, `mediaUrl`, `correctIndex`, `timeLimit` 5–120), `Player` (`name` **único**, `score`, `isConnected`), `Password` (fila única: hash, `isDefault`, `recoveryCode`). Si la tabla está vacía, se crea la contraseña por defecto `Admin2024!`.

### Flujo de una partida

```
LOBBY ─next_question→ QUESTION_LOCKED ─activate_answers→ QUESTION_ACTIVE ─show_answer→ SHOW_ANSWER ─next_question→ QUESTION_LOCKED …
                                                                              (sin más preguntas) ─next_question→ GAME_OVER
reset_game (desde cualquier estado) → LOBBY
```

- `QUESTION_LOCKED`: la pregunta va solo al HOST (`new_question`, con `canGoBack` para el botón «Atrás»); los jugadores esperan.
- `previous_question` (botón «Atrás»): solo en `QUESTION_LOCKED` y si no es la primera pregunta. Retrocede el índice y deja la partida en `SHOW_ANSWER` sobre la pregunta anterior, la pantalla que el Host acababa de perder. No toca puntajes: nadie respondió la pregunta nueva y en `SHOW_ANSWER` no se aceptan respuestas.
- `QUESTION_ACTIVE`: `new_question` a la sala `game_room` y timer con `timer_update` cada segundo hasta `timer_finished`. Si todos respondieron, el timer se corta, pero la partida **no avanza sola**: siempre avanza el Host.
- `SHOW_ANSWER`: `show_correct_answer { correctIndex, correctOption }` a toda la sala (proyector y celulares).
- Puntaje: primera respuesta correcta +100, las siguientes correctas +90, incorrecta 0. El puntaje en memoria sube solo si se guardó en la base; si el guardado falla, el jugador puede responder de nuevo (A29).

**Invariantes que confunden:**

- `currentQuestionIndex` apunta a la **siguiente** pregunta: la que está en pantalla es `questions[index - 1]`. Ese `- 1` no se repite más: usar `getCurrentQuestion()` de `gameState`.
- Las preguntas se recargan desde la base al arrancar la partida (índice 0) y en cada reset. Editarlas a mitad de partida no cambia la partida en curso.
- El HOST es un jugador más en `players`, identificado por `name === 'HOST'`, y se filtra por nombre en todos lados.
- Sesión del jugador: al conectar, el server emite `server_check { serverId, gameId, gameState }`. El cliente lo compara con `localStorage` (`server_run_id`, `game_session_id`, `savedGroupName`) para reconectar solo o volver al login. En producción, un `join_game` con `gameId` viejo recibe `session_expired`.
- `reset_game` con `cleanPlayers: true` vacía la tabla `players` y emite `force_refresh`. El panel admin limpia la temporada por esta vía, no por `DELETE /api/players/clean-season`.

### Cliente

- Rutas (`main.jsx`): `/` detecta si es móvil y redirige a `/play` o `/host`. `/play` → `App.jsx` (flujo del jugador). `/host` → `pages/HostView.jsx`. `/admin` → `guards/AdminGuard.jsx` (login y recuperación, token en `localStorage.admin_token`) envolviendo `pages/AdminView.jsx`.
- Hooks: `useSocket` (socket único, creado la primera vez que se pide, así existe desde el primer render; `isConnected` sale de `useSyncExternalStore`; 5 reintentos), `useGameSession` (`server_check` y reconexión), `useGameSocket` (eventos del juego; el efecto depende de los setters, no del objeto que arma `App` en cada render), `useWakeLock` (pantalla encendida; requiere HTTPS e iOS 16.4 o superior).
- Componentes: no definirlos dentro de otro componente (HostView tenía sus modales así y se desmontaban con cada tic del temporizador). ESLint lo marca con `react-hooks/static-components`.
- `App.jsx` elige la pantalla de `components/screens/` según `gameState`. Hay un CSS por componente en `src/styles/`.

## Tests y CI

- `server/test/`: Vitest 3 con **globals** (`describe`, `it`, `expect` y `vi` sin importar), porque el server es CommonJS y Vitest no se puede `require()`ar.
- `vi.mock` no intercepta `require`: los modelos se simulan con `vi.spyOn(Player, 'findOne')`.
- `test/setup.js` hace fallar cualquier consulta real a la base, así un test sin simular no escribe en la base local.
- Helpers: `test/helpers/game.js` (`resetGameState`, `addPlayer`, `putQuestionInState`) y `test/helpers/sockets.js` (`createFakeIo`, `createFakeSocket`, `sentToRoom`, `sentToSocket`).
- Los tests describen el comportamiento **actual**. Si destapan un bug, no se consagra en un test: se anota en la checklist.
- Cada suite nueva se valida con una mutación (romper el código a propósito y ver que falla) y corriendo todo en orden aleatorio.
- El cliente no tiene tests.
- CI (`.github/workflows/ci.yml`), en cada push y cada PR a `master`, con Node 22: tests del server, ESLint del cliente sin tolerar advertencias y build del cliente.

## Trampas conocidas

- **Worktrees** (`.claude/worktrees/`): no traen `node_modules`, `server/.env` ni `client/.env.local`. Instalar dependencias en `server/` y `client/`; los `.env` están en la carpeta principal del repo.
- Desde un worktree, el fallback de React no anda con el build: `res.sendFile` rechaza con 404 las rutas absolutas que contienen una carpeta con punto (`.claude`). En producción no pasa.
- **Dos `package.json` con dependencias duplicadas**: la raíz es lo que instala Render y `server/` es lo que usan el desarrollo y los tests. Una dependencia nueva del server va **en los dos** (A26).
- `engines` declara Node 18.x, pero Vite 7 exige 20.19 o superior (A30).
- **Build en Render:** con `NODE_ENV=production`, `npm install` omite las devDependencies, y Vite lo es. Por eso el `npm run build` de la raíz fallaría ahí. El Build Command del staging es `npm install && cd client && npm install --include=dev && npm run build`.
- Wake Lock no funciona por `http://` con la IP local: usar `npm run dev:https`.

## Estado del trabajo

### Hecho (en `mejoras-cliente`, todavía no en producción)

- **Tanda 1:** A2 el jugador que entra tarde recibe la pregunta en curso · A22 manejador global de errores y arranque que falla sin base · B1 pantalla encendida · B2 respuesta correcta en el celular. Además, modo `dev:https` e indicador de Wake Lock en desarrollo.
- **Tanda 2:** A4 404 JSON en `/api` · A5 dependencias faltantes en `server/` · A6 `VITE_API_URL` en AdminGuard · A7 ESLint analiza `.js`/`.jsx` · A8 README al día · A9 fuera `ADMIN_PASSWORD` · A13 listener de conexión duplicado · A15 logs de debug y códigos de recuperación fuera de los logs · A19 guardas en `seed.js` · A24 `JWT_SECRET` obligatoria.
- **Tanda 3:** A17 tests del server · A18 CI en GitHub Actions · A21 descartado (el HOST no se acumula en memoria).
- **Tanda 5 (primera parte):** A1 los eventos de control solo se aceptan del proyector o del panel autenticado · A3 `trust proxy` · A25 rate limit en la recuperación · A32 los avisos del server se ven en el celular · A33 CORS responde 403 · A31 aviso cuando la imagen no carga, en el proyector y en el panel.
- **Tanda 4:** A12 fuera el avance automático comentado · A11 fuera el feedback de acierto sin uso (decisión de Franco: la partida no avanza sola y el jugador ve la respuesta recién cuando el Host la muestra) · A29 el puntaje en memoria sube solo si se guardó en la base · A16 `getCurrentQuestion()` · B5 botón «Atrás» · A10 `reset_game` usa `resetGame()` y ya no reinicia a medias si falla la base · A14 sin `require` circular (el controller de jugadores ahora tiene tests) · A27 los 4xx se informan como «Solicitud inválida» · A28 ESLint en cero y en el CI.

### Tanda 5: seguridad, esquema y deploy

Hecho: A1, A3, A25, A32, A33 y A31. Lo que queda toca el esquema o el deploy, así que necesita una decisión de Franco antes de empezar.

| ID | Qué | Dónde | Notas |
|---|---|---|---|
| A20 | Un nombre de equipo repetido hereda el puntaje anterior | `models/Players.js`, `playerHandlers.js` | Riesgo medio |
| A26 | Unificar los dos `package.json` | raíz y `server/` | Cambia cómo instala Render |
| A30 | Alinear la versión de Node | `package.json`, README, CI | Requiere ver el log de build de Render |
| B4 | Reordenar preguntas sin borrarlas | `question.controller.js:136`, `gameLogics.js:18` | Causa: `findAll()` sin `order`. Toca esquema |
| B6 | Respuestas múltiples | `correctIndex` (unas 22 referencias entre server y cliente) | **Bloqueado**: definir si vale cualquiera de las correctas o hay que marcarlas todas. Función nueva, fuera del mantenimiento |

### Bloqueado o diferido

- **B3 «Server Error» en producción**: falta que el cliente diga en qué pantalla pasó, cuántas veces y si venía de un rato sin usar la app. Los logs de Render lo resolverían.
- **A23 migraciones y estado en un solo proceso**: diferido por decisión de Franco. B4 y B6 lo van a poner sobre la mesa.
- **Pendiente del cliente** (conviene pedirlo en un solo mensaje): acceso a Render, detalles de B3 y definición de B6. Sin novedades al 2026-09-22.

### Observaciones sin cargar en la checklist

No suman robustez por sí solas; se retoman si se toca esa zona.

- `DELETE /api/players/clean-season` no lo usa nadie: el panel limpia la temporada con `reset_game` por socket.
- `disconnectSocket` (`client/src/hooks/useSocket.js:50`) se exporta y no se usa.
- El script `build` de la raíz no instala Vite con `NODE_ENV=production` (ver Trampas); el README lo presenta como la estrategia de deploy.

## Registro de tandas

| Fecha | Tanda | Resultado |
|---|---|---|
| 2026-09-11 | Exploración | Checklist con A1–A23 y B1–B6. A24–A30 se sumaron en las tandas 2 y 3 |
| 2026-09-11 / 13 | 1 | A2, A22, B1, B2. Franco los probó en su celular; B1 validado en iPhone con `dev:https` |
| 2026-09-13 | 2 | A4–A9, A13, A15, A19, A24 |
| 2026-09-13 | 3 | A17, A18; A21 descartado |
| 2026-09-16 | — | CLAUDE.md creado. Sin acceso a Render: se sigue con la tanda 4 |
| 2026-09-17 | — | Franco monta un staging propio en Render que despliega `mejoras-cliente` |
| 2026-09-17 | 4 | A12 y A11 eliminados (139 tests, lint sin cambios). Fuera del primer push al staging |
| 2026-09-17 | — | Push de `mejoras-cliente` con las tandas 1 a 3: primera corrida de CI en verde |
| 2026-09-17 | — | Franco valida en el staging: admin, partida, respuesta en el celular, Wake Lock en iPhone, entrada tarde, reinicio manteniendo participantes y 404 JSON. La imagen no se vio por la URL usada (ver A31). Commits de la tanda 4 reescritos a una línea |
| 2026-09-20 | 4 | A29, A16 y B5 (155 tests, mutaciones verificadas, flujo probado contra la base local). B5: «Atrás» solo antes de activar respuestas, decidido por Franco ante la falta de respuesta del cliente |
| 2026-09-20 | — | Franco pushea la primera parte de la tanda 4 (`d8774c5`), CI en verde |
| 2026-09-22 | 4 | A10, A14, A27 y A28: tanda 4 cerrada. 160 tests, lint en cero y en el CI. Probado en el navegador con el server en 3100: modales del proyector estables durante el temporizador, «Atrás», reinicio, redirección de `/` y login del admin. Falta ver en el staging la carga inicial del panel admin (necesita login) |
| 2026-09-22 | — | Franco pushea el resto de la tanda 4 (`8ca52a6`) y valida el panel admin en el staging. Se cargan A31, A32 y A33 en la checklist y se fija el orden de la tanda 5 |
| 2026-09-26 | 5 | A1, A3, A25, A32, A33 y A31 (177 tests, mutaciones verificadas, lint en cero). Probado con el server en 3100: el proyector maneja la partida igual que antes, un socket ajeno recibe «No tienes permiso» en `next_question` y `reset_game`, el rate limit corta al 6.º login y al 11.º intento de recuperación por IP, un origen ajeno recibe 403, el aviso de respuesta no guardada se ve en el celular y deja reintentar, y el proyector avisa cuando la imagen no carga. Falta probar en el staging el reinicio desde el panel admin (necesita login) |

## Cómo mantener este archivo

- Al cerrar una tanda: pasar los ítems a «Hecho», sumar una fila al registro, actualizar «Estado de ramas» y tildar en la checklist.
- Un hallazgo nuevo lleva el siguiente ID libre (A34, …) en la checklist y en la tabla que corresponda.
- El detalle de cada ítem vive en la checklist. Acá va lo justo para retomar el trabajo.
- Las referencias de línea se corren con cada cambio: verificarlas al empezar un ítem.
