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

## Estado de ramas (2026-09-17)

| Rama | Estado |
|---|---|
| `master` | `7deb2ad`, igual en GitHub. Es lo que corre en producción. |
| `mejoras-cliente` | En GitHub: tandas 1 a 3 (`dc30b1f`), CI en verde, validadas por Franco en el staging. En local, además, lo hecho de la tanda 4, sin pushear. |
| `feature_*`, `IC`, `password`, `refactoring` | Históricas, ya integradas en `master`. |

Plan de entrega: pushear `mejoras-cliente` (respaldo, primera corrida de CI y deploy al staging), validar las tandas 1 a 3 en el staging y después trabajar tanda por tanda: push, CI en verde, prueba en staging. No fusionar a `master` sin la decisión de Franco.

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
| `npm run lint` | `client/` | ESLint (hoy con 19 hallazgos, ver A28) |

- Logs del server en los tests: `TEST_LOGS=1 npm test` (bash) o `$env:TEST_LOGS=1; npm test` (PowerShell).
- Server de prueba en 3100: `PORT=3100 node server.js` en `server/`, y el cliente con `VITE_API_URL=http://localhost:3100 VITE_SOCKET_URL=http://localhost:3100 npm run dev`.
- Variables: `server/.env` (ver `server/.env.example`; `JWT_SECRET` es obligatoria) y `client/.env.local` (`VITE_API_URL`, `VITE_SOCKET_URL`). En producción la base sale de `DATABASE_URL` y las `VITE_*` quedan vacías (mismo origen).

## Arquitectura

Monorepo sin workspaces. El `package.json` de la raíz es el del deploy: dependencias del server más los scripts `start` y `build`.

- **`server/`**: CommonJS. Express 5, Socket.io 4, Sequelize 6 sobre PostgreSQL, JWT, bcrypt.
- **`client/`**: ESM. React 19, Vite 7, React Router 7, socket.io-client.
- En producción Express sirve `client/dist` y devuelve `index.html` para cualquier ruta que no sea `/api`.

### Servidor

- `server.js`: corta si falta `JWT_SECRET`. Monta CORS, Socket.io, handlers, rutas `/api/*`, un 404 JSON para `/api` desconocido, los estáticos y el manejador global de errores. Arranque: `testConnection → sync({ alter }) → initializePassword → loadQuestions → listen`. Si algo falla, `process.exit(1)`.
- `config/`: `db.js` (`DATABASE_URL` con SSL o variables `PG*`), `cors.js` (orígenes por entorno más `LOCAL_IP`), `socket.js`, `sync.js`.
- `utils/gameState.js`: todo el estado de la partida en variables de módulo, con getters y setters. `players` y `playerTimeouts` se exportan por referencia: se mutan, nunca se reasignan.
- `utils/gameLogics.js`: `loadQuestions` y `sendNextQuestion`.
- `sockets/`: `playerHandlers` (`join_game`, `disconnect` con 30 s de gracia), `gameHandlers` (`next_question`, `activate_answers` con timer, `show_answer`), `answerHandlers` (`submit_answer` y puntaje), `adminHandlers` (`reset_game`).
- REST: `/api/auth` (`login` con rate limit, `change-password` con JWT, `recover-with-code`), `/api/questions` (CRUD con JWT), `/api/players` (listar, `PUT /:id` con `scoreChange`, `DELETE /clean-season`; con JWT).
- Modelos: `Question` (`title`, `type` TEXT|IMAGE|VIDEO, `options[]`, `mediaUrl`, `correctIndex`, `timeLimit` 5–120), `Player` (`name` **único**, `score`, `isConnected`), `Password` (fila única: hash, `isDefault`, `recoveryCode`). Si la tabla está vacía, se crea la contraseña por defecto `Admin2024!`.

### Flujo de una partida

```
LOBBY ─next_question→ QUESTION_LOCKED ─activate_answers→ QUESTION_ACTIVE ─show_answer→ SHOW_ANSWER ─next_question→ QUESTION_LOCKED …
                                                                              (sin más preguntas) ─next_question→ GAME_OVER
reset_game (desde cualquier estado) → LOBBY
```

- `QUESTION_LOCKED`: la pregunta va solo al HOST (`new_question`); los jugadores esperan.
- `QUESTION_ACTIVE`: `new_question` a la sala `game_room` y timer con `timer_update` cada segundo hasta `timer_finished`. Si todos respondieron, el timer se corta, pero la partida **no avanza sola**: siempre avanza el Host.
- `SHOW_ANSWER`: `show_correct_answer { correctIndex, correctOption }` a toda la sala (proyector y celulares).
- Puntaje: primera respuesta correcta +100, las siguientes correctas +90, incorrecta 0.

**Invariantes que confunden:**

- `currentQuestionIndex` apunta a la **siguiente** pregunta: `sendNextQuestion` incrementa después de enviar, así que la pregunta en juego es `questions[index - 1]` (repetido en cuatro lugares; A16 lo encapsula).
- Las preguntas se recargan desde la base al arrancar la partida (índice 0) y en cada reset. Editarlas a mitad de partida no cambia la partida en curso.
- El HOST es un jugador más en `players`, identificado por `name === 'HOST'`, y se filtra por nombre en todos lados.
- Sesión del jugador: al conectar, el server emite `server_check { serverId, gameId, gameState }`. El cliente lo compara con `localStorage` (`server_run_id`, `game_session_id`, `savedGroupName`) para reconectar solo o volver al login. En producción, un `join_game` con `gameId` viejo recibe `session_expired`.
- `reset_game` con `cleanPlayers: true` vacía la tabla `players` y emite `force_refresh`. El panel admin limpia la temporada por esta vía, no por `DELETE /api/players/clean-season`.

### Cliente

- Rutas (`main.jsx`): `/` detecta si es móvil y redirige a `/play` o `/host`. `/play` → `App.jsx` (flujo del jugador). `/host` → `pages/HostView.jsx`. `/admin` → `guards/AdminGuard.jsx` (login y recuperación, token en `localStorage.admin_token`) envolviendo `pages/AdminView.jsx`.
- Hooks: `useSocket` (socket único compartido, 5 reintentos), `useGameSession` (`server_check` y reconexión), `useGameSocket` (eventos del juego), `useWakeLock` (pantalla encendida; requiere HTTPS e iOS 16.4 o superior).
- `App.jsx` elige la pantalla de `components/screens/` según `gameState`. Hay un CSS por componente en `src/styles/`.

## Tests y CI

- `server/test/`: Vitest 3 con **globals** (`describe`, `it`, `expect` y `vi` sin importar), porque el server es CommonJS y Vitest no se puede `require()`ar.
- `vi.mock` no intercepta `require`: los modelos se simulan con `vi.spyOn(Player, 'findOne')`.
- `test/setup.js` hace fallar cualquier consulta real a la base, así un test sin simular no escribe en la base local.
- Helpers: `test/helpers/game.js` (`resetGameState`, `addPlayer`, `putQuestionInState`) y `test/helpers/sockets.js` (`createFakeIo`, `createFakeSocket`, `sentToRoom`, `sentToSocket`).
- Los tests describen el comportamiento **actual**. Si destapan un bug, no se consagra en un test: se anota en la checklist.
- Cada suite nueva se valida con una mutación (romper el código a propósito y ver que falla) y corriendo todo en orden aleatorio.
- El cliente no tiene tests.
- CI (`.github/workflows/ci.yml`), en cada push y cada PR a `master`, con Node 22: tests del server y build del cliente. ESLint todavía no corre en CI (A28).

## Trampas conocidas

- **Worktrees** (`.claude/worktrees/`): no traen `node_modules`, `server/.env` ni `client/.env.local`. Instalar dependencias en `server/` y `client/`; los `.env` están en la carpeta principal del repo.
- Desde un worktree, el fallback de React no anda con el build: `res.sendFile` rechaza con 404 las rutas absolutas que contienen una carpeta con punto (`.claude`). En producción no pasa.
- **Dos `package.json` con dependencias duplicadas**: la raíz es lo que instala Render y `server/` es lo que usan el desarrollo y los tests. Una dependencia nueva del server va **en los dos** (A26).
- `engines` declara Node 18.x, pero Vite 7 exige 20.19 o superior (A30).
- **Build en Render:** con `NODE_ENV=production`, `npm install` omite las devDependencies, y Vite lo es. Por eso el `npm run build` de la raíz fallaría ahí. El Build Command del staging es `npm install && cd client && npm install --include=dev && npm run build`.
- Wake Lock no funciona por `http://` con la IP local: usar `npm run dev:https`.

## Estado del trabajo

### Hecho (en `mejoras-cliente`, sin desplegar)

- **Tanda 1:** A2 el jugador que entra tarde recibe la pregunta en curso · A22 manejador global de errores y arranque que falla sin base · B1 pantalla encendida · B2 respuesta correcta en el celular. Además, modo `dev:https` e indicador de Wake Lock en desarrollo.
- **Tanda 2:** A4 404 JSON en `/api` · A5 dependencias faltantes en `server/` · A6 `VITE_API_URL` en AdminGuard · A7 ESLint analiza `.js`/`.jsx` · A8 README al día · A9 fuera `ADMIN_PASSWORD` · A13 listener de conexión duplicado · A15 logs de debug y códigos de recuperación fuera de los logs · A19 guardas en `seed.js` · A24 `JWT_SECRET` obligatoria.
- **Tanda 3:** A17 tests del server · A18 CI en GitHub Actions · A21 descartado (el HOST no se acumula en memoria).
- **Tanda 4 (en curso):** A12 fuera el avance automático comentado · A11 fuera el feedback de acierto sin uso. Decisión de Franco: la partida no avanza sola y el jugador ve la respuesta recién cuando el Host la muestra.

### Tanda 4: lógica del juego y limpieza (no depende de Render ni del cliente)

| ID | Qué | Dónde | Notas |
|---|---|---|---|
| A29 | Si falla el guardado del puntaje, los puntos quedan solo en memoria y el reintento se ignora | `server/sockets/answerHandlers.js:46-74` | Riesgo medio |
| A16 | Encapsular la pregunta en juego (`getCurrentQuestion()`) en lugar de `index - 1` | `gameHandlers.js:44,124`, `answerHandlers.js:47`, `playerHandlers.js:116` | Prerrequisito de B5. Riesgo medio |
| B5 | Botón «Atrás» en el proyector | `gameHandlers.js`, `HostView.jsx` | Definido: solo en `QUESTION_LOCKED`, deshace el último «Siguiente» (nadie respondió, no hay puntos que revertir). Propuesta: no mostrarlo en la primera pregunta |
| A10 | `resetGame()` no se usa: `adminHandlers` la reimplementa | `utils/gameState.js:84` | La usan los tests (`test/helpers/game.js`) |
| A14 | Dependencia circular `require('../server')` | `controllers/player.controller.js:42` | Tomar `players` de `gameState` y quitar `module.exports.players` de `server.js:70` |
| A27 | El manejador de errores rotula todo como «Error interno» | `server.js:127` | |
| A28 | 19 hallazgos de ESLint (9 en HostView por componentes definidos dentro del render) | `HostView.jsx`, `useGameSocket.js`, `AdminView.jsx`, `ErrorBoundary.jsx` | Riesgo medio: corregir dependencias de hooks cambia cuándo corren los efectos. Después, sumar lint al CI |

### Tanda 5: seguridad, esquema y deploy

| ID | Qué | Dónde | Notas |
|---|---|---|---|
| A1 | Autenticación en los eventos de socket | `server/sockets/` | Prioridad alta. Detalle en la checklist |
| A3 | `trust proxy` detrás de Render para el rate limit por IP | `server.js`, `routes/authRoutes.js` | |
| A25 | Rate limit en la recuperación de contraseña | `routes/authRoutes.js:91` | |
| A20 | Un nombre de equipo repetido hereda el puntaje anterior | `models/Players.js`, `playerHandlers.js` | Riesgo medio |
| A26 | Unificar los dos `package.json` | raíz y `server/` | Cambia cómo instala Render |
| A30 | Alinear la versión de Node | `package.json`, README, CI | Requiere ver el log de build de Render |
| B4 | Reordenar preguntas sin borrarlas | `question.controller.js:136`, `gameLogics.js:18` | Causa: `findAll()` sin `order`. Toca esquema |
| B6 | Respuestas múltiples | `correctIndex` (unas 22 referencias entre server y cliente) | **Bloqueado**: definir si vale cualquiera de las correctas o hay que marcarlas todas. Función nueva, fuera del mantenimiento |

### Bloqueado o diferido

- **B3 «Server Error» en producción**: falta que el cliente diga en qué pantalla pasó, cuántas veces y si venía de un rato sin usar la app. Los logs de Render lo resolverían.
- **A23 migraciones y estado en un solo proceso**: diferido por decisión de Franco. B4 y B6 lo van a poner sobre la mesa.
- **Pendiente del cliente** (conviene pedirlo en un solo mensaje): acceso a Render, detalles de B3 y definición de B6.

### Observaciones sin cargar en la checklist

- `DELETE /api/players/clean-season` no lo usa nadie: el panel limpia la temporada con `reset_game` por socket.
- `disconnectSocket` (`client/src/hooks/useSocket.js:50`) se exporta y no se usa.
- **Imágenes de preguntas (candidato a A31):** el admin acepta cualquier URL http(s) aunque no sea una imagen. En el staging se cargó `drive.google.com/drive/u/1/home`, la portada de Drive, y el proyector no mostró nada. Además, la ayuda confunde: el README recomienda enlaces de Drive `/preview` (páginas, no imágenes) y el formulario sugiere `drive.google.com/uc?id=`, que Google bloquea cada vez más para usarlo en otros sitios. Propuesta: vista previa de la imagen en el formulario y ayuda corregida.
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

## Cómo mantener este archivo

- Al cerrar una tanda: pasar los ítems a «Hecho», sumar una fila al registro, actualizar «Estado de ramas» y tildar en la checklist.
- Un hallazgo nuevo lleva el siguiente ID libre (A31, …) en la checklist y en la tabla que corresponda.
- El detalle de cada ítem vive en la checklist. Acá va lo justo para retomar el trabajo.
- Las referencias de línea se corren con cada cambio: verificarlas al empezar un ítem.
