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

### Neon Dodge (`artifacts/neon-dodge`)
- **Type**: React + Vite web app (frontend only, no backend)
- **Framework**: Phaser 3.90 (game engine) via npm + React container
- **Path**: `artifacts/neon-dodge/src/`
  - `game/constants.ts` — all tunable game values
  - `game/audio.ts` — Web Audio API synth SFX
  - `game/index.ts` — Phaser game factory
  - `game/scenes/StartScene.ts` — animated intro screen
  - `game/scenes/GameScene.ts` — core gameplay loop
  - `game/scenes/GameOverScene.ts` — game over + watch ad placeholder
  - `App.tsx` — React shell that mounts Phaser canvas
- **Features**: tap to switch direction, neon obstacles + lasers, slow-motion near-miss, particle trail, screen shake, 5-skin system, high score in localStorage, Web Audio sound effects, responsive/mobile-ready, multiplayer lobby (Socket.io), planet backgrounds, shrink power-up
- **Capacitor (Android native)**:
  - Config: `capacitor.config.ts` — appId `tr.com.toov.neon.twa`, webDir `dist/public`
  - Native bridge: `src/game/native.ts` — haptic feedback, status bar, keep awake, screen orientation
  - Plugins: `@capacitor/haptics`, `@capacitor/status-bar`, `@capacitor/screen-orientation`, `@capacitor-community/keep-awake`
  - Keystore: `/root/neondodge-android/android.keystore`, alias `android`
  - Build: `pnpm cap:build` (builds web + syncs to android)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
