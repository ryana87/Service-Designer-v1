# SD4 Service Design Tool — Feature Suggestions for Usability & Functionality

**Date:** 2026-02-16  
**Purpose:** Suggested features to improve usability and functionality, based on full codebase review.

---

## Current State Summary

The tool has a solid foundation: journey maps with phases/actions/emotions/pain points/opportunities, service blueprints with 5 lanes and connectors, personas, export (PDF/PNG/JPG), share links, minimap, zoom, dark mode, and a scripted demo AI. Several items from earlier roadmaps are implemented; some were deferred or removed.

---

## Suggested Features by Category

### 1. Editing & Workflow (High Impact)

| Feature | Description | Effort | Impact | Notes |
|---------|-------------|--------|--------|-------|
| **Undo/Redo** | Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z for edit history | High | Very High | Previously removed; keyboard modal still references it. Critical for user confidence. |
| **Copy/Paste Cards** | Copy cards or actions between phases/columns or across maps | Medium | High | Would speed up repetitive work and variant creation. |
| **Bulk Select Mode** | Multi-select with checkboxes for batch delete, duplicate, or edit | Medium | High | In roadmap; reduces repetitive tasks. |
| **Drag to Reorder Phases** | Drag phase headers to reorder instead of insert-before/after | Low | Medium | Journey map and blueprint phase headers. |
| **Duplicate with Connections** | When duplicating a blueprint, optionally copy connector layout | Medium | Medium | Duplicate exists; connections may need manual recreation. |

---

### 2. Visualization & Navigation

| Feature | Description | Effort | Impact | Notes |
|---------|-------------|--------|--------|-------|
| **Journey Comparison View** | Side-by-side current vs future state with scroll lock | High | High | In roadmap; valuable for demo and stakeholder presentations. |
| **Search Result Highlighting** | When navigating from search, highlight the matched text in context | Low | Medium | Search exists; results navigate but don't highlight the match. |
| **Full-Screen / Focus Mode** | Hide sidebars for focused editing or presentation | Low | Low | Toggle to maximize canvas. |
| **Minimap Click-to-Pan** | Click on minimap to jump viewport to that area | Low | Low | Minimap exists; add click-to-navigate. |
| **Breadcrumb Navigation** | Project > Journey Map > Phase in header for deep links | Low | Low | Helps orientation in nested views. |

---

### 3. Export & Sharing

| Feature | Description | Effort | Impact | Notes |
|---------|-------------|--------|--------|-------|
| **PDF Merge for Combined Mode** | Use pdf-lib to merge multiple PDFs in combined export | Medium | Medium | TODO in export route; currently returns first only. |
| **Export Personas** | Include persona cards in export (currently journey maps + blueprints) | Low | Low | Personas in export modal but may not render well. |
| **Share Link Expiration** | Optional expiry date when creating share links | Low | Medium | Schema supports `expiresAt`; UI may not expose it. |
| **Share Link Preview** | Thumbnail or preview in share modal before copying | Medium | Low | Improves share UX. |

---

### 4. AI & Intelligence

| Feature | Description | Effort | Impact | Notes |
|---------|-------------|--------|--------|-------|
| **AI Pain Point Suggestions** | Suggest pain points from journey/blueprint content | High | High | Demo has scripted responses; real AI would analyze structure. |
| **AI Opportunity Generation** | Suggest opportunities from pain points | High | High | Builds on pain point data. |
| **AI Thumbnail Generation** | Real image generation for action thumbnails | High | Medium | Demo uses deterministic mapping; real API would create images. |
| **"Coming Soon" for Non-Demo** | Clear messaging when AI is used outside demo | Low | Low | AI sidebar shows "Coming soon" for non-demo. |

---

### 5. Data & Content

| Feature | Description | Effort | Impact | Notes |
|---------|-------------|--------|--------|-------|
| **Import from CSV** | Bulk import journey actions from spreadsheet | Medium | Medium | Useful for migrating existing research. |
| **Export to JSON** | Export project/map/blueprint as structured JSON | Low | Low | Enables backup, migration, or integration. |
| **Persona Goals/Needs** | Richer persona fields (goals, needs) if not fully used | Low | Low | Schema may support; verify usage. |
| **Link Journey Actions to Blueprint Cards** | Explicit traceability between journey and blueprint | High | Medium | Conceptual link; no formal FK today. |

---

### 6. Validation & Insights

| Feature | Description | Effort | Impact | Notes |
|---------|-------------|--------|--------|-------|
| **Journey Map Validation** | Warnings for empty phases, missing emotions, etc. | Medium | Medium | Blueprint has validation; journey map could mirror. |
| **Insight Severity Filtering** | Filter by Warning vs Info in insights panel | Low | Low | May already exist; verify. |
| **Auto-Fix Suggestions** | "Fix" button for simple validation issues | Medium | Low | E.g. add missing label to connector. |

---

### 7. Collaboration & Versioning

| Feature | Description | Effort | Impact | Notes |
|---------|-------------|--------|--------|-------|
| **Version History** | Track changes with restore to previous version | High | Medium | No versioning today. |
| **Comments/Annotations** | Threaded comments on cards or actions | High | Medium | Enables async feedback. |
| **Activity Log** | Recent changes across project (created, updated, deleted) | Medium | Low | Lightweight audit trail. |

---

### 8. UI/UX Polish

| Feature | Description | Effort | Impact | Notes |
|---------|-------------|--------|--------|-------|
| **Tooltips with Shortcuts** | Show keyboard shortcut on button hover | Low | Low | Deferred; quick win. |
| **Spacebar Pan** | Spacebar + drag to pan canvas (grab cursor) | Low | Low | Deferred; common in design tools. |
| **Minimap Button Animation** | Subtle animation when minimap opens | Low | Low | Deferred. |
| **Empty State Improvements** | Clearer CTAs when no phases, actions, or cards | Low | Low | Improve onboarding. |
| **Loading Skeletons** | Skeleton UI during data fetch instead of blank | Low | Low | Better perceived performance. |
| **Accessibility** | ARIA labels, focus management, keyboard nav | Medium | Medium | Improves inclusivity. |

---

### 9. Keyboard Shortcuts (Actual Implementation)

| Feature | Description | Effort | Impact | Notes |
|---------|-------------|--------|--------|-------|
| **Wire Up Documented Shortcuts** | Implement Cmd+Z, Cmd+Shift+Z, Cmd+D, zoom shortcuts | Medium | High | Modal lists them; many may not be implemented. |
| **Contextual Shortcuts** | Different shortcuts in journey map vs blueprint vs project | Low | Medium | E.g. Cmd+N for new action when in journey map. |
| **Escape to Deselect** | Escape clears selection, closes modal, or exits edit mode | Low | Low | Partial today; make consistent. |

---

### 10. Service Blueprint Specific

| Feature | Description | Effort | Impact | Notes |
|---------|-------------|--------|--------|-------|
| **Connector Presets** | Quick-apply common connector configs (e.g. "Handoff", "Rework") | Low | Low | Reduces repetitive connector editing. |
| **Bulk Connector Styling** | Change stroke/color for multiple selected connectors | Medium | Low | When bulk select exists. |
| **Column Width Adjustment** | Resize column width for readability | Medium | Medium | Fixed width today. |
| **Lane Collapse** | Collapse lanes (e.g. Support Process) when not needed | Medium | Low | Reduces visual clutter. |

---

### 11. Journey Map Specific

| Feature | Description | Effort | Impact | Notes |
|---------|-------------|--------|--------|-------|
| **Emotion Presets** | Quick-set common emotion patterns (e.g. "Valley of despair") | Low | Low | Speeds up emotion entry. |
| **Quote Import** | Paste multiple quotes at once with optional sources | Low | Medium | Reduces one-by-one entry. |
| **Thumbnail from URL** | Add thumbnail by pasting image URL | Low | Low | Alternative to upload. |
| **Multi-Persona View** | Show same journey for different personas (overlay or tabs) | High | Medium | Complex; high value for some use cases. |

---

## Quick Wins (Low Effort, High Impact)

1. **Tooltips with shortcuts** — Show Cmd+Z etc. on hover where applicable.
2. **Search highlight** — Highlight matched text when navigating from search.
3. **Share link expiration UI** — Expose `expiresAt` in share modal if schema supports it.
4. **Escape consistency** — Ensure Escape always has a clear, consistent behavior.
5. **Empty state copy** — Improve CTAs for "No phases yet", "No actions", etc.

---

## Recommended Priority Order

### Phase 1 — Foundation (Next 1–2 months)
1. **Undo/Redo** — Restore or implement; high user expectation.
2. **Journey Comparison View** — High value for demos and stakeholder reviews.
3. **Bulk Select Mode** — Enables batch operations.

### Phase 2 — Efficiency (Months 2–4)
4. **Copy/Paste** — Cards and actions.
5. **Wire up keyboard shortcuts** — Match modal to actual behavior.
6. **PDF merge** — Complete combined export.

### Phase 3 — Intelligence (Months 4–6)
7. **AI pain point suggestions** — Real AI integration.
8. **AI opportunity generation** — Build on pain points.
9. **Search result highlighting** — Improve findability.

### Phase 4 — Collaboration (Months 6+)
10. **Version history** — Restore capability.
11. **Comments/annotations** — Async feedback.
12. **Import from CSV** — Data migration.

---

## Out of Scope (Per Existing Docs)

- Card templates (user declined)
- Cost/time on cards (removed)
- BPMN notation
- Real-time multi-user collaboration
- Mobile app

---

## Summary

The highest-impact improvements are **Undo/Redo**, **Journey Comparison View**, and **Bulk Select**. Quick wins like **tooltips**, **search highlighting**, and **escape consistency** can improve day-to-day UX with minimal effort. The AI features (pain points, opportunities) would differentiate the tool but require more investment.
