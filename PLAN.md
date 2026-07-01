# Dominó Online — Plan del Webapp

> Webapp para jugar dominó online con amigos. Prioridad: **rápido y fácil de entrar, conectar e iniciar partida**. Mobile-first + **instalable como PWA**. Se comparte por WhatsApp.

> **Equipo:** se trabaja en paralelo en este mismo repo entre **Gosto** (diseño, frontend, PWA, deploy en Vercel) y **Ferreira** (servidor autoritativo, motor de reglas, tiempo real, deploy del backend). El **contrato compartido** (§5) es el límite que permite avanzar sin pisarse.

---

## 1. Decisiones tomadas (resultado del grill)

| Tema | Decisión |
|------|----------|
| **Identidad** | Invitado con apodo. Sin registro. Se guarda en `localStorage`. Cero fricción. |
| **Conexión a sala privada** | Link + código corto de sala (ej. `ABCD`). Se comparte por WhatsApp; al abrir el link entras directo. |
| **Matchmaking** | **Backlog (post-v1).** En v1 **solo salas privadas** por link/código, **bajo demanda**. App funcional para **uso interno** desde el inicio. |
| **Reglamentos** | 3 en v1: **Cubano/latino 2v2**, **Bloqueo (Block)**, **Robar (Draw)**. (Sin Mexican Train/All Fives). |
| **4 modos de partida** | Son **configuraciones de jugadores**, no reglamentos (ver §2). |
| **Stack** | Next.js (React) en Vercel + servidor Node con **Socket.IO** en host con websockets. TypeScript en todo. |
| **Autoridad** | **Servidor autoritativo**: reparte fichas, valida cada jugada, los rivales nunca ven tu mano. |
| **Desconexión** | Reconexión con timeout (~60–90s) → si no vuelve, lo cubre un **bot**. |
| **Timer de turno** | Cuenta regresiva que **avisa** (presión visual), no auto-juega. |
| **Anti-AFK** | Si un jugador presente deja vencer ~2–3 turnos seguidos → se considera AFK y lo cubre el bot. |
| **Comunicación** | **Emotes/reacciones rápidas + chat de texto** in-game. |
| **Bots** | Bot simple reutilizable: modo práctica vs IA **y** relleno de asientos/AFK. |
| **Persistencia** | **Nada en v1**: estado en memoria del servidor, se borra al terminar. Sin base de datos. |
| **Puntaje cubano** | Meta configurable (50/100/200), **default 100**. Capicúa suma extra. |
| **Fin de partida** | Botón **Revancha** (mismos equipos, misma sala, 1 clic) o salir. |
| **Diseño** | Mesa verde fieltro + fichas marfil/negro, mobile-first, **instalable como PWA**. |

---

## 2. Modos de partida (los "4 estilos")

Los modos describen **cómo se llenan los asientos**. El reglamento (Cubano / Bloqueo / Robar) se elige por separado al crear la sala. **En v1 todos los asientos se llenan por invitación privada (link/código) o con bots** — no hay emparejamiento con desconocidos.

**Modos en v1 (salas privadas):**
1. **2v2 — Invito pareja + invito rivales**: creo sala, comparto el link, se unen mi compañero y 2 rivales (o los cubro con bots).
2. **1v1**: duelo directo (ideal con reglamento Robar).
3. **Todos contra todos (3–4 jug.)**: individual, sin parejas (ideal con Bloqueo/Robar).

**Backlog (post-v1):**
- **2v2 — Entro solo y me emparejan**: requiere la cola pública (matchmaking). Ver §Backlog.

> En v1 el **Cubano** aplica a 2v2; **Bloqueo** y **Robar** a 1v1 / todos-contra-todos. Combos no estándar se ocultan en la UI.

---

## 3. Arquitectura técnica (dos despliegues)

```
┌──────────────────────────────────────┐        ┌──────────────────────────────────────┐
│  WEB APP  (Vercel)            [Gosto] │        │  SERVIDOR REALTIME (Railway/Render) [Ferreira]
│  Next.js / React, mobile-first, PWA   │        │  Node + Socket.IO, autoritativo       │
│  - Lobby, crear/unir sala, cola       │  WS    │  - RoomManager (salas en memoria)     │
│  - Mesa de juego (render/animaciones) │◄──────►│  - GameEngine (reglas, reparto)       │
│  - Service worker / instalable        │ socket │  - Matchmaking (cola pública)         │
│  - SOLO MUESTRA; nunca valida         │ events │  - BotPlayer, Timers, AFK, reconexión │
│  NEXT_PUBLIC_SOCKET_URL ─────────────────────► │  estado en RAM, 1 instancia (v1)      │
└──────────────────────────────────────┘        └──────────────────────────────────────┘
                  ▲                                              ▲
                  └──────────── packages/shared (CONTRATO) ──────┘
                     tipos TS + eventos socket + reglas puras
```

- **Por qué dos hosts:** Vercel es serverless (no mantiene conexiones websocket con estado en memoria). El web app/PWA va perfecto en Vercel; el servidor Socket.IO **stateful** va en un host con websockets persistentes (Railway, Render o Fly.io). El cliente apunta al server por `NEXT_PUBLIC_SOCKET_URL`.
- **Monorepo** (un repo, dos apps + paquete compartido):
  ```
  /apps/web        → Next.js (cliente, PWA)        ── Gosto
  /apps/server     → Node + Socket.IO (autoritativo) ── Ferreira
  /packages/shared → tipos, eventos socket, reglas puras (CONTRATO) ── ambos
  ```
- **Reglas puras en `shared`**: "¿es válida esta jugada?", "¿quién gana?", "¿está trancado?" son funciones puras. El cliente las usa para resaltar jugadas legales (UX); el servidor las usa como verdad (anti-trampa).
- **Lenguaje**: TypeScript en todo el stack. Gestor de monorepo: **pnpm workspaces** (simple) + Turborepo opcional.

---

## 4. Modelo de estado (en memoria, lo posee el servidor)

```ts
Room {
  code: string                 // "ABCD"
  ruleset: 'cuban' | 'block' | 'draw'
  mode: 'team2v2' | 'ffa' | '1v1'
  targetScore: number          // 50 | 100 | 200 (cubano)
  status: 'lobby' | 'playing' | 'handOver' | 'matchOver'
  seats: Seat[]                // 2–4 asientos
  game: GameState | null
  hostId: string
}
Seat   { playerId: string|null, name: string, team: 'A'|'B'|null, connection: 'online'|'reconnecting'|'bot' }
GameState {
  boneyard: Tile[]; board: PlacedTile[]; hands: Record<playerId, Tile[]>;
  turn: playerId; passesInARow: number; scores: { A:number, B:number } | Record<playerId, number>;
}
```

- El servidor **emite a cada socket solo lo que ese jugador ve**: su mano + nº de fichas de los demás + mesa + turno.
- Reconexión: `playerId` en `localStorage`; al reconectar con el mismo id dentro del timeout, recupera asiento y mano.

---

## 5. Contrato compartido (`packages/shared`) — el límite del trabajo paralelo

Este paquete se define **primero y en conjunto** (Fase 0). Una vez fijado, Gosto y Ferreira avanzan sin bloquearse: cada uno simula el otro lado contra estos tipos/eventos.

**Tipos:** `Tile`, `PlacedTile`, `Seat`, `Room`, `GameState`, `Ruleset`, `Mode`, vistas filtradas por jugador (`PlayerView`).

**Eventos cliente → servidor (v1):**
`createRoom`, `joinRoom`, `addBot`, `startGame`, `playTile`, `pass`, `drawTile`, `sendEmote`, `sendChat`, `requestRematch`, `leaveRoom`.
> Reservados para backlog (matchmaking): `joinQueue`, `leaveQueue` — se dejan definidos en tipos pero **no se implementan** en v1.

**Eventos servidor → cliente:**
`roomUpdate` (estado de la sala/asientos), `gameUpdate` (PlayerView filtrada), `yourTurn`, `turnTimer`, `handResult`, `matchResult`, `emote`, `chat`, `playerConnection` (online/reconnecting/bot), `error`.

**Reglas puras exportadas:** `dealTiles()`, `legalMoves(view)`, `applyMove(state, move)`, `isBlocked(state)`, `scoreHand(state, ruleset)`, `whoStarts(state)`.

> **Mocks para paralelizar:** Ferreira entrega un `mock-server` mínimo que emite eventos de ejemplo; Gosto entrega fixtures de `GameState`/`PlayerView`. Así el frontend se desarrolla sin el backend real y viceversa.

---

## 6. PWA (instalable en celular) — [Gosto]

Requisito de diseño: que se pueda **"descargar" e instalar en el celular** (Add to Home Screen) y abrir a pantalla completa.

- **`manifest.webmanifest`**: `name`, `short_name` ("Dominó"), `display: standalone`, `theme_color` (verde fieltro), `background_color`, orientación `portrait`.
- **Iconos**: set completo (192, 512, maskable) + apple-touch-icon para iOS.
- **Service worker** (vía `next-pwa` o Workbox): cachea el *app shell* (HTML/CSS/JS/iconos/fichas) para carga instantánea y arranque offline del shell. **La partida en sí requiere conexión** (es tiempo real) — offline solo cubre cargar la app y mostrar estado de "sin conexión".
- **Instalable**: cumplir criterios (manifest + SW + HTTPS, que Vercel da) → aparece el prompt de instalación; añadir botón propio "Instalar app".
- **iOS**: meta tags `apple-mobile-web-app-*`, splash screens; banner guiando "Compartir → Añadir a inicio".
- **UX de red**: banner de reconexión, estados claros cuando el socket cae (encaja con la reconexión del servidor).

---

## 7. Reglas por reglamento (motor — [Ferreira])

- **Común**: set doble-6 (28 fichas). Reparto según modo. Quien tiene doble-6 (o doble más alto) abre la 1ª mano; luego abre quien ganó la anterior.
- **Cubano 2v2**: sin robar; si no puedes, pasas. Gana la mano quien se pega (o el equipo con menos puntos si se tranca). Puntos = suma de fichas rivales. **Capicúa** = bonus configurable. Acumula hasta `targetScore`.
- **Bloqueo**: sin pozo; al trancarse gana el de menor suma.
- **Robar (Draw)**: si no puedes, robas del pozo hasta poder; si se agota, pasas. Ideal 1v1.
- Detalle de capicúa, salida obligada y desempates → se cierran con casos de prueba en Fase 1.

---

## 8. Bot / IA simple — [Ferreira]

1. Filtra jugadas legales. 2. Suelta ficha de mayor valor / dobles pesados. 3. En 2v2, evita abrir extremos que el rival no pudo jugar. 4. Si nada legal: pasa (o roba en Draw).
Reutilizable: práctica vs IA, relleno de asientos, cobertura de AFK/desconexión.

---

## 9. Diseño / UX — [Gosto]

- **Paleta**: tapete verde fieltro (`#0f6b3a`–`#0a4d2a`), fichas marfil (`#f5f0e1`) con puntos negros, acento madera/dorado mínimo. Alto contraste.
- **Mobile-first**: tu mano en abanico abajo; mesa al centro; rivales arriba/laterales con nº de fichas. Gestos tap.
- **Claridad**: turno actual visible, jugadas legales resaltadas, marcador siempre a la vista.
- Botones grandes, flujo de ≤ 3 toques para empezar. Idioma **Español** v1.

---

## 10. Fases — trabajo en paralelo

> **Etiquetas:** `[Gosto]` = diseño/frontend/PWA/Vercel · `[Ferreira]` = servidor/motor/realtime/deploy backend · `[Ambos]` = se hace en conjunto primero.

### 🤝 Fase 0 — Andamiaje + Contrato `[Ambos]` (bloqueante, va primero)
- Monorepo (pnpm workspaces): `apps/web`, `apps/server`, `packages/shared`.
- Definir el **contrato** (§5): tipos, eventos socket, firmas de reglas puras (sin implementar aún).
- `mock-server` mínimo + fixtures de estado para que cada uno simule el otro lado.
- CI básica (typecheck + lint) y convención de ramas (§11).
- **Salida:** ambos pueden arrancar `apps/web` y `apps/server` por separado contra el contrato. **A partir de aquí, paralelo.**

---

### Track A — Gosto (diseño, frontend, PWA, Vercel)

**A1 · Design system + shell**
- Theme (paleta, tipografía, tokens), layout mobile-first, navegación Next.js.
- Pantallas: apodo/inicio, menú (crear sala / unir por código / vs IA), lobby de sala, pantalla fin de partida.

**A2 · Componentes de mesa**
- `Tile`, `Board` (extremos abiertos), `Hand` (abanico), marcador, indicadores de turno/timer. Datos desde fixtures.

**A3 · Integración socket (cliente)**
- Cliente Socket.IO contra el contrato (`NEXT_PUBLIC_SOCKET_URL`), manejo de `roomUpdate`/`gameUpdate`, resaltado de jugadas legales usando reglas puras de `shared`.
- Emotes + chat UI, banner de reconexión.

**A4 · PWA (§6)**
- Manifest, iconos, service worker (app shell), instalable iOS/Android, estados offline.

**A5 · Deploy en Vercel**
- Proyecto Vercel apuntando a `apps/web`, env `NEXT_PUBLIC_SOCKET_URL`, dominio, HTTPS, verificación PWA en celular real.

---

### Track B — Ferreira (servidor, motor, realtime, deploy backend)

**B1 · Motor de dominó `packages/shared` (testeado, offline)**
- Implementar reglas puras (reparto, validación, tranca, puntaje) para Cubano/Bloqueo/Robar. Tests unitarios por reglamento. **Esto desbloquea el resaltado de Gosto en A3.**

**B2 · Servidor autoritativo + salas**
- Socket.IO, `RoomManager` (crear/unir por código, asientos), estado en RAM, emisión **filtrada por jugador**. Jugar una mano Cubano 2v2 completa entre 4 clientes.

**B3 · Modos privados + configuración**
- Modos privados (2v2 invitando, 1v1, todos-contra-todos), `addBot` para asientos vacíos, selección reglamento/meta, validación de combos permitidos. (Cola pública → §Backlog.)

**B4 · Robustez**
- Timers de turno, detección AFK (2–3 turnos), reconexión con timeout, **bot** (relleno + práctica vs IA), revancha.

**B5 · Deploy backend**
- Desplegar `apps/server` en Railway/Render/Fly (websockets), CORS hacia el dominio de Vercel, healthcheck, variable de URL pública para el cliente.

---

### 🤝 Fase Final — Integración y pruebas `[Ambos]`
- Conectar web (Vercel) ↔ server (Railway) reales, pruebas E2E por WhatsApp con amigos, ajustes de UX/latencia, pulido.

**Dependencias clave entre tracks:**
- A3 (resaltado) depende de B1 (reglas puras) → priorizar B1.
- A3/A-completo contra real depende de B2 (salas) → mientras tanto, A trabaja con `mock-server`.
- B usa fixtures de A solo para validar formato de `PlayerView`.

---

## 11. Flujo de trabajo en el repo (para no pisarse)

- **`packages/shared` es co-propiedad**: cambios al contrato se acuerdan entre ambos (PR con review del otro). Es lo único que ambos tocan.
- **Ramas por track**: `gosto/*` y `ferreira/*`; PRs a `main`. Cada track edita sobre todo sus propias carpetas (`apps/web` vs `apps/server`), así casi no hay conflictos.
- **CI** corre typecheck/lint/tests en cada PR. Merge a `main` solo en verde.
- Convención de commits simple (Conventional Commits opcional).

---

## 12. Backlog (post-v1)

Funciones fuera del alcance de v1 (que debe ser funcional para **uso interno con partidas privadas bajo demanda**). Se retoman cuando el core esté sólido:

- **Matchmaking / cola pública**: botón "Buscar partida", emparejamiento con desconocidos, y el modo **2v2 entro-solo-y-me-emparejan**. Eventos `joinQueue`/`leaveQueue` ya reservados en el contrato.
- Ranking/ELO, stats persistentes e historial (requieren base de datos).
- Espectadores.
- Reglamentos extra (Mexican Train, All Fives).

> Diseñar v1 sin cerrar puertas: el contrato deja los huecos (`joinQueue`) para que agregar matchmaking después no obligue a rehacer las salas.

---

## 13. Riesgos / decisiones menores pendientes

- **Escalado**: estado en RAM = 1 instancia. Si crece, migrar salas a Redis (fuera de v1).
- **Moderación de chat**: filtro básico de groserías + silenciar en v1 (confirmar alcance).
- **Spectators**: pospuestos en v1.
- **iOS PWA**: install menos fluido que Android (sin prompt nativo); mitigar con guía visual.
- **Reglas finas** (capicúa, desempates, salida obligada): cerrar con casos de prueba en B1.
