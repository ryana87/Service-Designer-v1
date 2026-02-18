# SD4 Service Design Tool — Handoff Context Document

**Purpose:** Full context for transferring this project to another computer or Cursor session.  
**Date:** 2026-01-31  
**Do not make up information — if there are knowledge gaps, ask the user.**

---

## 1. Project Overview

**SD4** is a Service Design tool for creating and managing:
- **Journey Maps** — customer experience flows with phases, actions, emotions, pain points, opportunities
- **Service Blueprints** — operational process flows with 5 lanes (Physical Evidence, Customer Action, Frontstage, Backstage, Support Process)
- **Personas** — project-level reusable personas with rich fields

The tool uses an Intercom-inspired visual style: three shades of light grey panels, rounded corners, shadows, nav rail on dark grey background.

---

## 2. Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16.1.4 (App Router, Turbopack) |
| React | 19.2.3 |
| Database | SQLite via Prisma 7.3 + libsql adapter |
| Styling | Tailwind CSS 4 |
| Icons | Material Symbols Outlined (Google Fonts) |
| Font | Inter (Google Fonts) |
| Export | Playwright (server-side PDF/PNG/JPG) |
| Share links | nanoid for slug generation |

**Key dependencies:** `@prisma/adapter-libsql`, `@libsql/client`, `archiver`, `nanoid`, `playwright`

---

## 3. Setup & Run

### Prerequisites
- Node.js (compatible with Next 16)
- npm

### Environment
- `.env` in project root with: `DATABASE_URL="file:./dev.db"`
- SQLite database file: `prisma/dev.db` (created by Prisma)

### Commands
```bash
npm install
npx prisma generate
npx prisma migrate dev   # or: npx prisma migrate reset --force (wipes data)
npm run dev             # http://localhost:3000
```

### First Run
- Root `/` redirects to `/projects`
- Demo mode: user clicks "Try Demo" on projects page → seeds demo project and navigates to it
- Demo project ID: `demo_contact_routing_project` (see `app/demo/constants.ts`)

### Demo PNG Assets (Transfer Separately)
- Demo persona headshot and journey thumbnails are PNGs (SVGs in repo were superseded)
- Required files in `public/demo/`: `demo_persona_headshot.png`, `demo_thumb_01_find_contact.png` through `demo_thumb_05_receive_response.png`
- Transfer these from the source computer when setting up on a new machine

---

## 4. Database & Prisma

### Schema Location
- `prisma/schema.prisma`
- Prisma client output: `app/generated/prisma`
- **Import path:** Use `@/app/lib/db` — NOT `@/app/lib/prisma` (that module does not exist)

### Known Import Bug
- `app/share/[slug]/page.tsx` incorrectly imports from `@/app/lib/prisma`
- **Fix:** Change to `import { prisma } from '@/app/lib/db'`

### Key Models
- `Project` → `JourneyMap`, `ServiceBlueprint`, `Persona`, `ShareLink`
- `JourneyMap` has `personaId` (optional) and legacy `persona` (plain text)
- `Persona` has rich fields: name, shortDescription, role, context, goals, needs, painPoints, notes, avatarUrl
- `BlueprintConnection` links cards with sourceCardId/targetCardId, sourceCardType/targetCardType ("basic"|"complex"|"decision")
- `ShareLink` has slug, projectId, journeyMapId?, blueprintId?, personaId?

### Cost/Time Fields
- **Removed** — User requested removal. Do not add costEstimate/timeEstimate to cards.

---

## 5. Architecture Conventions

### Path Aliases
- `@/*` maps to project root (e.g. `@/app/lib/db`)

### Server vs Client
- Server Components by default; use `'use client'` for interactivity
- Server Actions in `app/*/actions.ts` with `'use server'`
- Prisma/db access is server-side only

### Key Directories
- `app/` — Next.js App Router
- `app/components/` — Shared UI (AppShell, Icon, ExportModal, ShareModal, Minimap, ZoomControls, etc.)
- `app/contexts/` — ThemeContext, (UndoRedoContext was removed)
- `app/demo/` — Demo seeding, DemoContext, demoChatData, assets, constants
- `app/lib/` — db.ts, validation.ts, colorTokens.ts
- `app/api/` — export, share routes and actions
- `docs/` — FEATURE_REVIEW_AND_SUGGESTIONS.md, SD_TOOL_CAPABILITY_OVERVIEW.md, DEMO_DATA_SCHEMA.md

### Icon System
- `app/components/Icon.tsx` exports `AppIcon` (not default `Icon`)
- Uses Material Symbols via `name` prop (e.g. `name="add"`, `name="close"`)

---

## 6. Demo Mode

### How It Works
- `DemoProvider` wraps the app in `app/layout.tsx`
- "Try Demo" on projects page calls `enterDemo()` → `seedDemo()` → navigates to demo project
- Demo project is identified by `DEMO_PROJECT_ID = "demo_contact_routing_project"`
- `useDemoOptional()` / `useDemo()` from `DemoContext` for components that need demo state

### Demo Seeding
- `app/demo/seed.ts` — `seedDemo()` deletes and recreates demo project
- **No personas by default** — user creates persona via UI; Create Persona modal is prefilled with `DEMO_PERSONA_PREFILL` from `demoChatData.ts`
- Creates: empty project (no journey maps or blueprints initially); user creates them via research upload (journey map) and guided setup (blueprint). See `docs/DEMO_RUNTHROUGH.md` for flow.

### Demo AI Chat
- Scripted responses only (no real AI)
- `SCRIPTED_PROMPTS` in `demoChatData.ts` — exact text match for user input
- Special action: `triggersAction: "generate-thumbnails"` for "Generate thumbnails for this journey map"
- "Generate future state" creates future-state journey map and blueprint

### Demo Persona Prefill (exact text)
- Name: Alex
- Short descriptor: Busy customer
- Role: Time-poor resident
- Context, Goals, Needs, Pain points, Notes — see `DEMO_PERSONA_PREFILL` in `app/demo/demoChatData.ts`

### Demo Assets
- `app/demo/assets.ts` defines paths
- **Persona headshot:** `/demo/demo_persona_headshot.png`
- **Thumbnails:** `/demo/demo_thumb_01_find_contact.png` through `demo_thumb_05_receive_response.png`
- **Note:** SVGs in `public/demo/` were superseded by PNGs. PNG files must be transferred separately to the new computer — the code expects PNGs at these paths.

---

## 7. Visual Design

### CSS Variables (globals.css)
- `--bg-app`, `--bg-sidebar`, `--bg-panel`, `--bg-header` — three-tier grey system
- `--panel-radius`, `--panel-shadow`, `--panel-gap`
- Typography: `--font-size-phase`, `--font-size-action`, `--font-size-label`, `--font-size-cell`, `--font-size-meta` — all in `:root` (same in light/dark)
- Dark mode: `[data-theme="dark"]` overrides colours; ThemeContext toggles via `data-theme` attribute

### Nav Rail
- Sits on `--bg-app` (darkest grey), not its own panel
- Collapsible: icons only vs icons + labels
- Toggle at bottom to expand/collapse
- **Not open by default** — user must expand

---

## 8. Key Features (Current State)

### Implemented
- PDF/PNG/JPG export via Playwright (server-side, high quality)
- Minimap (collapsible, bottom-right of main panel; repositions when AI sidebar open/closed)
- Zoom controls (in header dropdown, not floating)
- Share links (create, copy; modal shows dummy link if generation fails)
- Dark/light theme toggle
- Keyboard shortcuts modal (`?` to open)
- Connector hover highlighting on blueprints
- Column-first flow rule (time = left-to-right)
- Persona management (project-level, rich fields, selector in journey map header)

### Removed / Disabled
- Undo/Redo — removed; undo buttons don't exist
- Cost/time on cards — removed from backend

### Pending / Pinned (User Asked to Defer)
- Minimap button animation — "put a pin in"
- Spacebar cursor (grab/grabbing) — "put a pin in"
- Tooltips with shortcuts on buttons — from quick-win batch

---

## 9. Known Issues & Fixes

| Issue | Location | Fix |
|-------|----------|-----|
| Share link page import error | `app/share/[slug]/page.tsx` | Change `@/app/lib/prisma` → `@/app/lib/db` |
| Share modal no link | `ShareModal.tsx` | Uses `displayUrl = shareUrl \|\| ${origin}/share/example-link` as fallback |
| Export hides UI | `app/api/export/route.ts` | `page.evaluate()` hides header buttons, floating AI button, etc. |
| Minimap vs AI button overlap | `Minimap.tsx` | `rightOffset`: 16px when sidebar open, 92px when closed |

---

## 10. Export System

- **Route:** `POST /api/export`
- **Uses:** Playwright chromium, viewport 3840×2160, deviceScaleFactor 2
- **Formats:** pdf, png, jpg
- **Mode:** combined (single file) or separate (ZIP for multiple)
- **Hiding:** Exports hide nav, sidebars, Export/Insights buttons, floating AI button
- **Playwright:** Must be installed (`npx playwright install chromium` if needed)

---

## 11. Planned Roadmap (From User Discussions)

**Not yet implemented:**
- Journey comparison view (split-screen, scroll lock toggle, column matching)
- Bulk edit / Select mode (checkboxes when in "Select" mode)
- AI pain point/opportunity suggestions (demo: dummy data; live: "Coming soon")
- Card templates — **not doing** (user declined)

---

## 12. Knowledge Gaps — Verify When Setting Up

1. **Database location:** Unknown whether `prisma/dev.db` is canonical or if production uses a different path. Verify when configuring the new environment.

2. **Environment variables:** Unknown whether any variables besides `DATABASE_URL` are required (e.g. for share links, export base URL). Check `.env.example` if one exists, or verify at runtime.

---

## 13. Deployment (Online Demo)

### Overview

The app can be deployed online with password protection so stakeholders can access a demo via link + password. Local development is unchanged; the password gate is **disabled** when `DEMO_ACCESS_PASSWORD` is not set.

### Recommended: Vercel + Turso

1. **Turso** (libsql cloud): `turso db create sd4-demo --region nrt`, then `turso db tokens create sd4-demo`
2. **Vercel**: Import from GitHub, add env vars: `DATABASE_URL` (libsql://...), `TURSO_AUTH_TOKEN`, `DEMO_ACCESS_PASSWORD`
3. **Schema sync**: `npx prisma db push` against Turso (or apply migration SQL via `turso db shell`)
4. **Seed demo**: After deploy, visit the app, log in with the password, click "Try Demo" to seed the demo project

### Environment Variables (Production)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | `libsql://your-db.turso.io` for Turso |
| `TURSO_AUTH_TOKEN` | Yes (Turso) | Auth token from `turso db tokens create` |
| `DEMO_ACCESS_PASSWORD` | Yes (for gate) | Password for `/demo-login`; unset = no gate |

### Password Gate

- **Middleware:** `middleware.ts` — redirects unauthenticated users to `/demo-login`
- **Login page:** `app/demo-login/page.tsx` — form that sets `demo_access` cookie on correct password
- **Shared auth:** `app/lib/demoAuth.ts` — token computation for middleware and login action

### Push-to-Deploy

- Push to `main` triggers Vercel deployment
- Data in Turso persists across deploys
- For a fresh demo, run `seedDemo()` (e.g. via "Try Demo" button) after deploy

---

## 14. File Reference Quick Links

| Purpose | Path |
|---------|------|
| Prisma schema | `prisma/schema.prisma` |
| DB client | `app/lib/db.ts` |
| Demo seed | `app/demo/seed.ts` |
| Demo constants | `app/demo/constants.ts` |
| Demo assets | `app/demo/assets.ts` |
| Demo chat copy | `app/demo/demoChatData.ts` |
| Demo context | `app/demo/DemoContext.tsx` |
| Share actions | `app/api/share/actions.ts` |
| Export API | `app/api/export/route.ts` |
| Theme | `app/contexts/ThemeContext.tsx` |
| Global styles | `app/globals.css` |
| App shell | `app/components/AppShell.tsx` |
| Capability overview | `docs/SD_TOOL_CAPABILITY_OVERVIEW.md` |
| Feature suggestions | `docs/FEATURE_REVIEW_AND_SUGGESTIONS.md` |
| Demo schema | `docs/DEMO_DATA_SCHEMA.md` |
| Demo login | `app/demo-login/page.tsx` |
| Demo auth lib | `app/lib/demoAuth.ts` |
| Middleware | `middleware.ts` |
