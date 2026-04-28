# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Artifacts

- **tower-defense**: 2D tower defense game (React + Vite + Tailwind v4 + canvas).
  - Modes: Solo (30 waves), 1v1, 2v2 (vs AI commanders, single-browser).
  - Lane architecture: `lanesRef: Lane[]` in `Game.tsx`. Player is lane 0; AI lanes auto-play with a tower-placement + upgrade brain.
  - Recon HQ tower's `intelLevel` (1–3) gates visibility of opponent towers (~30/60/100%) and unlocks opponent funds (L2+).
  - 2v2 income split: 50% of every kill is shared with allied teammate.
  - Boss damage scales with wave: minibosses ~40+, bosses ~60+, final overlord ~90+.
  - Files: `Game.tsx` (sim+render), `screens/MainMenu.tsx`, `screens/MultiplayerLobby.tsx`, `screens/MapSelect.tsx`, `game/data.ts` (towers/enemies/waves).

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
