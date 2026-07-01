# 🁡 Dominó Online

Webapp para jugar dominó con amigos — rápido y fácil de entrar, conectar e iniciar partida. Mobile-first e instalable como PWA.

Ver el plan completo en [PLAN.md](./PLAN.md).

## Estructura (monorepo pnpm)

```
apps/
  web/        → Next.js + PWA (cliente)              — Gosto
  server/     → Node + Socket.IO (autoritativo)      — Ferreira
packages/
  shared/     → contrato: tipos, eventos socket, reglas puras (co-propiedad)
```

## Requisitos

- Node.js >= 20 (recomendado 22+)
- pnpm 11 (`npm install -g pnpm`)

## Arranque

```bash
pnpm install          # instala todo el monorepo

pnpm dev              # levanta web + server en paralelo
# o por separado:
pnpm dev:server       # http://localhost:4000
pnpm dev:web          # http://localhost:3000
```

Abre http://localhost:3000 — si el servidor está arriba, verás "Servidor: conectado".

## Scripts útiles

```bash
pnpm typecheck        # typecheck de todos los paquetes
pnpm build            # build de producción (web)
```

## Variables de entorno

- `apps/web`: `NEXT_PUBLIC_SOCKET_URL` (URL del servidor Socket.IO). Default `http://localhost:4000`.
- `apps/server`: `PORT` (default `4000`), `CLIENT_ORIGIN` (default `http://localhost:3000`).

Ver `.env.example` en cada app.

## Flujo de trabajo

- Ramas por track: `gosto/*` y `ferreira/*`; PRs a `main`.
- `packages/shared` es co-propiedad: cambios al contrato se revisan entre ambos.
