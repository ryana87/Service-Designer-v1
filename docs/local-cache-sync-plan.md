# Implementation Plan: Local Cache + Periodic Server Sync for Journey Maps and Service Blueprints

**Status:** Journey map editor is implemented (Phases 1–4). Service blueprint editor still uses per-action server calls; blueprint cache can be added following the same pattern.

## Goal

Make the journey map and service blueprint editors feel **instant**: user edits apply immediately from a local cache, and the server is updated in the background on a timer (e.g. every 2–5 minutes), on explicit "Save", or when leaving the page. Single-user / single-tab; "last write wins" on sync is acceptable for v1.

---

## Current Behavior (Summary)

- **Journey map editor**  
  - **Page:** `app/projects/[projectId]/journey-maps/[journeyMapId]/page.tsx` (server component) fetches the full journey map via Prisma (`journeyMap` with `phases`, `actions`, `quotes`, `customChannels`, `customTouchpoints`, `project`, `personaRef`) and passes it as props into client components.  
  - **Actions:** `app/projects/[projectId]/journey-maps/actions.ts` exposes granular server actions: `updatePhase`, `updateActionField`, `createBlankPhase`, `insertBlankPhaseAt`, `createBlankAction`, `insertBlankActionAt`, `deleteAction`, `duplicateAction`, `updateActionPainPoints`, `updateActionOpportunities`, `createQuote`, `createCustomChannel`, `createCustomTouchpoint`, `updateJourneyMapPersona`, `getCustomOptions`.  
  - **Components:** `app/projects/[projectId]/journey-maps/[journeyMapId]/components.tsx` (client) uses these actions and then calls `router.refresh()` so the server component re-runs and refetches data. Every keystroke/rename/add column triggers a server round-trip + revalidatePath + router.refresh → 1–2 s delay.

- **Service blueprint editor**  
  - **Page:** `app/projects/[projectId]/blueprints/[blueprintId]/page.tsx` (server component) fetches the full blueprint (phases, columns, basicCards, decisionCards, teamSections with cards, teams, softwareServices, connections) and passes it to `BlueprintEditor`.  
  - **Actions:** `app/projects/[projectId]/blueprints/actions.ts` exposes many granular actions: phase (create, insert, update, delete), column (insert, delete), basic/decision/complex card CRUD, team section CRUD, team/software CRUD, connection CRUD, order updates, etc.  
  - **Components:** `app/projects/[projectId]/blueprints/[blueprintId]/components.tsx` (client) calls these actions and then `onRefresh()` (i.e. `router.refresh()`). Same latency pattern.

- **Data shapes**  
  - Journey map: `JourneyMap` → `phases[]` (order, title, timeframe) → `actions[]` (order, title, description, thought, channel, touchpoint, emotion, painPoints, opportunities, thumbnailUrl) → `quotes[]`; map-level `customChannels`, `customTouchpoints`.  
  - Blueprint: `ServiceBlueprint` → `phases[]` → `columns[]` → `basicCards`, `decisionCards`, `teamSections[]` (→ `cards`), plus `teams`, `softwareServices`, `connections`.  
  - Prisma schema: `prisma/schema.prisma` (JourneyMap, JourneyPhase, JourneyAction, JourneyQuote, CustomChannel, CustomTouchpoint; ServiceBlueprint, BlueprintPhase, BlueprintColumn, BlueprintBasicCard, BlueprintDecisionCard, BlueprintComplexCard, TeamSection, BlueprintTeam, SoftwareService, BlueprintConnection).

---

## Where the Cache Lives

- **Primary: React state + Context (in-memory)**  
  - One **context provider per editor type** (journey map vs blueprint) that holds the **full document** for the active map/blueprint.  
  - **Journey map:** e.g. `JourneyMapCacheContext` with value `{ data: JourneyMapDocument | null; setData: (updater) => void; dirty: boolean; ... }`.  
  - **Blueprint:** e.g. `BlueprintCacheContext` with value `{ data: BlueprintDocument | null; setData: (updater) => void; dirty: boolean; ... }`.  
  - The editor page (server) still fetches once; the initial payload is passed into a client wrapper that seeds the context and renders the existing editor tree. All UI reads from context; writes update context first (instant), then enqueue for sync.  
  - No IndexedDB in the first version: cache is in-memory only and is lost on full page reload (reload will refetch from server).

- **Optional later: IndexedDB**  
  - For v2: persist the same document shape to IndexedDB keyed by `journeyMapId` / `blueprintId` so that on reload we can show last cached state immediately while revalidating from server (and optionally support offline edits).

---

## Sync Strategy

- **Full-document (bulk) save**  
  - Sync step sends the **entire current cache document** to the server.  
  - Server has **two new server actions**: `syncJourneyMap(journeyMapId, payload)` and `syncBlueprint(blueprintId, payload)`.  
  - Server runs a **single transaction** that makes the stored document match the payload (e.g. delete orphaned children, then upsert/insert phases, actions, quotes, custom options; same idea for blueprint with phases/columns/cards/teams/software/connections).  
  - **IDs:** Client keeps using existing server IDs for existing entities. For **new** entities created in the client (e.g. new phase/action/column/card), the client generates stable IDs (e.g. `cuid()`) and sends them in the payload; server uses those IDs when inserting so the cache and DB stay in sync.  
  - This avoids N round-trips (replaying every granular action) and keeps the sync step simple and predictable.

- **When to sync**  
  1. **Timer:** e.g. every **3 minutes** (configurable 2–5), only if `dirty === true`.  
  2. **Explicit "Save"** (optional but recommended): button in the header that calls sync and shows status (e.g. "Saving…" / "Saved" / "Save failed").  
  3. **On leave:** When the user navigates away or closes the tab, if dirty, attempt one sync (e.g. `beforeunload` or Next.js route change); optionally show "You have unsaved changes" if sync fails or is not possible.

---

## Sync Failure Handling

- **Retry:** On network or server error, retry 2–3 times with short backoff (e.g. 1 s, 2 s).  
- **Toasts:**  
  - "Saving…" when sync starts (optional, or only for explicit Save).  
  - "Saved" on success (optional for timer; recommended for explicit Save).  
  - "Couldn't save changes. Retrying…" then either "Saved" or "Save failed. Please try again."  
- **State:** Keep `dirty` true until a successful sync; do not clear dirty on failure so the next timer or Save will retry.  
- **No automatic router.refresh()** after sync for v1; the cache remains source of truth on the client. Optional: after successful sync, call `router.refresh()` once so server component tree has fresh data for any future navigation.

---

## Minimal API Changes (Bulk Save)

- **New server actions (new file or added to existing actions):**  
  - **`syncJourneyMap(journeyMapId: string, payload: JourneyMapSyncPayload)`**  
    - Payload: full document (name, personaId, phases with order/title/timeframe, actions with all fields and order, quotes per action, customChannels, customTouchpoints).  
    - Implementation: single Prisma transaction that updates the journey map root, then replaces phases/actions/quotes/customChannels/customTouchpoints to match payload (delete missing, create new with payload ids, update existing).  
  - **`syncBlueprint(blueprintId: string, payload: BlueprintSyncPayload)`**  
    - Payload: full document (name, phases with columns, basicCards, decisionCards, teamSections with cards, teams, softwareServices, connections).  
    - Implementation: single Prisma transaction that updates the blueprint root and reconciles all nested entities to match payload (same idea: delete orphans, upsert/insert by id).  
- **Existing granular actions** can remain for now; they are not used during the sync step. Optionally they could be deprecated later or used only for one-off operations (e.g. from a non-editor screen).  
- **No new REST routes required** if we stick to server actions; the client will call these two actions from the sync layer.

---

## Step-by-Step Implementation Plan

### Phase 1: Cache layer (in-memory context)

1. **Define cache types and context for journey map**  
   - Add types (e.g. in `app/projects/[projectId]/journey-maps/[journeyMapId]/types.ts` or in the same file as the provider) that mirror the server shape used by the page: journey map with phases, actions, quotes, customChannels, customTouchpoints (and whatever the page needs from project/personas for sidebar/insights).  
   - Create `JourneyMapCacheProvider` (client component) that:  
     - Accepts `initialData` (the same shape the server currently passes).  
     - Holds state: `data`, `dirty` (boolean), and a setter/updater for `data` that also sets `dirty = true`.  
     - Exposes context: `{ data, setData, dirty, setDirty, journeyMapId }`.  
   - **File touch points:** New file e.g. `app/projects/[projectId]/journey-maps/[journeyMapId]/JourneyMapCacheContext.tsx` (or under a `cache/` folder); optionally shared types in a small `types.ts`.

2. **Wire journey map page to cache**  
   - In `app/projects/[projectId]/journey-maps/[journeyMapId]/page.tsx`: keep the existing Prisma fetch and construction of `journeyMap`, `channelOptions`, `touchpointOptions`, `actionColumns`, etc.  
   - Wrap the client subtree (e.g. everything inside or below `OverlayProvider`) with `JourneyMapCacheProvider` and pass the server-fetched journey map as `initialData`.  
   - Ensure the provider initializes `data` from `initialData` on mount and when `initialData` identity changes (e.g. when navigating to a different map).

3. **Define cache types and context for blueprint**  
   - Add types that mirror the blueprint shape the page fetches (phases, columns, basicCards, decisionCards, teamSections with cards, teams, softwareServices, connections).  
   - Create `BlueprintCacheProvider` that holds `data`, `dirty`, and updater, keyed by `blueprintId`.  
   - **File touch points:** New file e.g. `app/projects/[projectId]/blueprints/[blueprintId]/BlueprintCacheContext.tsx` (and optional `types.ts`).

4. **Wire blueprint page to cache**  
   - In `app/projects/[projectId]/blueprints/[blueprintId]/page.tsx`: keep the existing Prisma fetch; pass the fetched `blueprint` into a client wrapper that provides `BlueprintCacheProvider` with `initialData={blueprint}` and renders `BlueprintEditor` inside.  
   - `BlueprintEditor` will later read from context instead of props.

---

### Phase 2: UI reads from cache; writes update cache (no immediate server call)

5. **Journey map: switch reads to cache**  
   - Refactor the journey map grid and all cells (e.g. `PhaseHeader`, `ActionColumnHeader`, `EditableCell`, `EmotionCell`, `ChannelCell`, `TouchpointCell`, `PainPointCell`, `OpportunityCell`, `ThumbnailCell`) to read from `useJourneyMapCache()` (or equivalent) instead of receiving data via props from the server.  
   - Derive `actionColumns`, `channelOptions`, `touchpointOptions`, and any other derived values inside the client tree from cache `data` (either in the provider or in a hook that returns a normalized view).  
   - **File touch points:** `app/projects/[projectId]/journey-maps/[journeyMapId]/page.tsx` (may pass minimal props such as `projectId`, `journeyMapId`; data comes from context), `app/projects/[projectId]/journey-maps/[journeyMapId]/components.tsx` (all components that currently receive phases/actions/options as props).

6. **Journey map: writes update cache only**  
   - For every mutation (rename phase/action, add phase/action, update emotion, channel, touchpoint, pain points, opportunities, thumbnail, add quote, add custom channel/touchpoint, delete/duplicate action):  
     - Call a cache updater that applies the change to the in-memory document (and sets `dirty = true`).  
     - **Do not** call the existing server action from the UI path; do not call `router.refresh()`.  
   - Implement cache updaters (e.g. `updatePhaseInCache(phaseId, field, value)`, `updateActionInCache(actionId, field, value)`, `addPhaseInCache(...)`, etc.) that mirror the semantics of the current server actions but only mutate the context state. For new entities, generate a client-side id (e.g. `cuid()`) so the payload is ready for bulk sync.  
   - **File touch points:** `app/projects/[projectId]/journey-maps/[journeyMapId]/components.tsx` (replace server action calls + router.refresh with cache updater calls); cache context file (implement the updaters or expose a single `applyMutation` that the components call).

7. **Blueprint: switch reads to cache**  
   - Refactor `BlueprintEditor` and all child components to read from `useBlueprintCache()` (or equivalent) instead of the `blueprint` prop.  
   - Derive phases, columns, cards, teams, software, connections from cache `data`.  
   - **File touch points:** `app/projects/[projectId]/blueprints/[blueprintId]/page.tsx`, `app/projects/[projectId]/blueprints/[blueprintId]/components.tsx`.

8. **Blueprint: writes update cache only**  
   - For every mutation (phase/column/card create, update, delete, reorder; team/software/connection CRUD): implement cache updaters that apply the change in memory and set `dirty = true`. Use client-generated ids for new entities.  
   - Remove server action calls and `onRefresh()` / `router.refresh()` from the edit paths.  
   - **File touch points:** `app/projects/[projectId]/blueprints/[blueprintId]/components.tsx`, blueprint cache context.

---

### Phase 3: Sync API (bulk server actions)

9. **Implement `syncJourneyMap` server action**  
   - Add `syncJourneyMap(journeyMapId, payload)` in `app/projects/[projectId]/journey-maps/actions.ts` (or a dedicated `sync.ts`).  
   - Payload type: full document (name, personaId, phases[], actions[], quotes[], customChannels[], customTouchpoints[]).  
   - Implementation: one Prisma transaction that updates the journey map row, then reconciles phases (by id), actions (by id), quotes (by id), custom channels/touchpoints (by id). Delete entities that exist in DB but not in payload; create or update from payload.  
   - **File touch points:** `app/projects/[projectId]/journey-maps/actions.ts` (or new `sync.ts`), plus a shared payload type (e.g. in types).

10. **Implement `syncBlueprint` server action**  
    - Add `syncBlueprint(blueprintId, payload)` in `app/projects/[projectId]/blueprints/actions.ts` (or dedicated `sync.ts`).  
    - Payload type: full document (name, phases with columns, basicCards, decisionCards, teamSections with cards, teams, softwareServices, connections).  
    - Implementation: one Prisma transaction to reconcile entire blueprint tree; delete orphans, upsert/insert by id.  
    - **File touch points:** `app/projects/[projectId]/blueprints/actions.ts` (or new sync module), plus payload types.

---

### Phase 4: Periodic sync, Save button, leave-page flush

11. **Sync orchestrator (timer + Save + leave)**  
    - In the journey map cache layer (e.g. inside the provider or a small hook):  
      - Maintain a ref or state for "last sync time" and "dirty".  
      - Start an interval (e.g. 3 minutes) that, if `dirty`, calls `syncJourneyMap(journeyMapId, cacheData)`, then on success sets `dirty = false` and optionally shows a toast; on failure, retry 2–3 times with backoff and show toast on final failure.  
      - Expose a `syncNow()` function (e.g. from context) for the Save button.  
      - On `beforeunload` (and optionally on Next.js route change via a client effect), if `dirty`, call `syncNow()` or a fire-and-forget sync (with user warning if sync fails).  
    - Do the same for the blueprint editor (same pattern: interval, `syncNow()`, beforeunload).  
    - **File touch points:** Journey map cache context/provider; blueprint cache context/provider; optional small `useSyncOnLeave` hook.

12. **Save button and toasts**  
    - Add a "Save" button in the journey map header and in the blueprint header that calls `syncNow()` and shows "Saving…" / "Saved" / "Save failed. Please try again."  
    - Use existing toast system if the app has one; otherwise add a simple toast component or use a lightweight library.  
    - **File touch points:** `app/projects/[projectId]/journey-maps/[journeyMapId]/page.tsx` (header) or the client header component that lives under the cache provider; same for blueprint. Possibly a shared `SyncStatus` or `SaveButton` component.

13. **Undo integration**  
    - Current undo (e.g. `useUndo`) is applied on top of server actions. After switching to cache, ensure undo still works by undoing/redoing cache updates (same as now but targeting cache state instead of server). No change to undo semantics; only the "apply" step is now a cache updater instead of a server action.

---

### Phase 5 (optional): IndexedDB persistence

14. **Persist cache to IndexedDB**  
    - When cache `data` or `dirty` changes, write the current document to IndexedDB (keyed by journeyMapId/blueprintId).  
    - On mount, try to read from IndexedDB first; if present, use it as initial state and optionally trigger a background revalidate from server (then either replace or merge).  
    - This phase can be skipped for v1.

---

## File / Component Touch Points Summary

| Area | Files / components |
|------|--------------------|
| Journey map cache | New: `JourneyMapCacheContext.tsx` (or `cache/`), types. `page.tsx`: wrap with provider, pass initialData. |
| Journey map UI | `components.tsx`: PhaseHeader, ActionColumnHeader, EditableCell, EmotionCell, ChannelCell, TouchpointCell, PainPointCell, OpportunityCell, ThumbnailCell, quote/custom-option flows; all read from cache and call cache updaters instead of server actions; remove router.refresh(). |
| Blueprint cache | New: `BlueprintCacheContext.tsx`, types. `page.tsx`: wrap with provider, pass initialData. |
| Blueprint UI | `components.tsx`: BlueprintEditor and all children; read from cache; all edit handlers call cache updaters; remove onRefresh/router.refresh. |
| Sync API | `journey-maps/actions.ts` (or sync module): `syncJourneyMap`. `blueprints/actions.ts` (or sync module): `syncBlueprint`. |
| Sync orchestration | Inside cache providers or dedicated hooks: timer, syncNow(), beforeunload. |
| Save / toasts | Header components for journey map and blueprint: Save button, toast for save status. |

---

## Order of Work and Dependencies

- Phase 1 and Phase 2 can be done for **journey map first**, then **blueprint** (or in parallel once the pattern is set).  
- Phase 3 (sync API) is needed before Phase 4; Phase 4 depends on Phase 2 (cache is source of truth) and Phase 3 (bulk actions exist).  
- Recommended sequence: **Phase 1 (both editors) → Phase 2 (journey map, then blueprint) → Phase 3 (both sync actions) → Phase 4**. Optionally do Phase 2 for both editors in parallel after Phase 1.

---

## Out of Scope for v1

- Multi-tab or multi-user conflict resolution (last write wins only).  
- Optimistic rollback on sync failure (we keep dirty and retry; we do not revert the UI).  
- IndexedDB (optional Phase 5).  
- Changing existing granular server actions (they remain; sync uses only the new bulk actions).

---

This plan is ready for approval before implementation. After approval, implementation can proceed phase by phase with minimal code until the cache and sync layers are in place, then UI can be switched over to use them.
