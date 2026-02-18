# Service Design Tool — Feature Review & Future Suggestions

**Date:** 2026-01-29  
**Version:** 1.0

---

## 📋 Current Features Inventory

### **Project Management**
- ✅ Create, rename, delete projects
- ✅ Project description
- ✅ Project dashboard with asset counts
- ✅ Project sidebar with collapsible navigation
- ✅ Search across project content (journey maps, blueprints, personas)
- ✅ Sort order management for journey maps and blueprints
- ✅ Duplicate journey maps and blueprints
- ✅ Move items up/down in lists

### **Persona Management**
- ✅ Project-level personas (reusable across journey maps)
- ✅ Rich persona fields:
  - Name (required)
  - Short descriptor/tagline
  - Role/archetype
  - Context (multi-line)
  - Goals (multi-line)
  - Needs (multi-line)
  - Pain points (multi-line)
  - Notes (multi-line)
  - Headshot image (upload)
- ✅ Demo mode: Prefilled persona creation with "Generate headshot" button
- ✅ Persona selector in journey map top bar
- ✅ Persona management view in project dashboard
- ✅ Safe deletion (sets personaId to null if referenced)

### **Journey Maps**

#### Structure
- ✅ Phases with titles and timeframes
- ✅ Actions within phases
- ✅ Insert phases before/after existing phases
- ✅ Insert actions before/after existing actions
- ✅ Inline editing of phase titles and timeframes
- ✅ Inline editing of action titles, descriptions, thoughts

#### Data Capture
- ✅ Emotion tracking (1-5 scale) with visual trend line
- ✅ Customer quotes with sources (multiple per action)
- ✅ Pain points (Low/Medium/High severity) with inline editing
- ✅ Opportunities (Low/Medium/High impact) with inline editing
- ✅ Channels (default + custom per journey map)
- ✅ Touchpoints (default + custom per journey map)
- ✅ Thumbnails (upload + demo-only AI generation)
- ✅ Persona linking (one persona per journey map)

#### UI/UX
- ✅ Sticky phase headers with dark background for contrast
- ✅ Emotion trend row visualization
- ✅ Grid-based table layout
- ✅ Hover affordances for adding content
- ✅ Modal for thumbnail upload/generation
- ✅ Quotes panel overlay
- ✅ Custom channel/touchpoint picker with icons

### **Service Blueprints**

#### Structure
- ✅ Phases with titles and timeframes
- ✅ Columns within phases (time progression)
- ✅ 5-lane structure:
  - Physical Evidence
  - Customer Action
  - Frontstage Action
  - Backstage Action
  - Support Process
- ✅ Insert phases and columns
- ✅ Continuous step numbering across entire blueprint

#### Card Types
- ✅ **Basic Cards** (Physical Evidence, Customer Action, Support Process)
  - Title, description, pain points, opportunities
  - Start/End markers
- ✅ **Complex Cards** (Frontstage, Backstage)
  - Title, description, pain points, opportunities
  - Software/service tags
  - Team ownership via TeamSection
  - Start/End markers
- ✅ **Decision Cards** (Customer Action, Frontstage, Backstage)
  - Title, question, description
  - Multiple outgoing connectors
  - Vertical connector to card below (same column only)

#### Teams & Software
- ✅ Blueprint-level teams with icons and colors
- ✅ Software/Service tags with colors
- ✅ One-team-per-column rule (Frontstage OR Backstage, not both)
- ✅ Team sections for organizing complex cards

#### Connectors
- ✅ Orthogonal routing (right angles only)
- ✅ Multiple connector types: standard, dependency, feedback, wait
- ✅ Arrow directions: forward, backward, bidirectional, none
- ✅ Stroke customization: weight, pattern, color
- ✅ Labels on connectors
- ✅ Connection hover highlighting (NEW!)
  - Highlights connected cards and arrows
  - Dims non-related elements
- ✅ Connection edit modal
- ✅ Decision card vertical connectors (to card below)
- ✅ Same-column connections blocked (except Decision → below)

#### UI/UX
- ✅ Drag-and-drop card reordering
- ✅ Connection drag-and-drop creation
- ✅ Card position tracking for routing
- ✅ Connection anchor points (left, right, top, bottom)
- ✅ Visual feedback for valid/invalid connections
- ✅ Column-first flow enforcement

### **Validation & Insights**
- ✅ Real-time validation engine
- ✅ Warnings for structural issues:
  - Empty phases/columns with content to the right
  - Cards with incoming but no outgoing connectors
- ✅ INFO-level insights:
  - Multiple flow starting points
  - Flow endpoints
  - Cards in loops
  - Decision cards with <2 outgoing connectors
  - Missing labels on decision connectors
- ✅ Insights panel with filtering (All/Warnings/Info)
- ✅ Dismissible insights
- ✅ Navigate to element from insight

### **Demo Mode**
- ✅ Scripted AI chat with sequential prompts
- ✅ Future state generation (journey map + blueprint)
- ✅ Persona prefill flow
- ✅ Deterministic thumbnail generation
- ✅ "Generate all thumbnails" via AI chat
- ✅ Sidebar animation for newly generated items
- ✅ Demo project seeding

### **UI Framework**
- ✅ Responsive layout with collapsible sidebars
- ✅ Navigation rail (far-left)
- ✅ Project sidebar (left, collapsible)
- ✅ AI sidebar (right, collapsible)
- ✅ Floating AI button
- ✅ CSS variable theming
- ✅ Material Icons integration
- ✅ Modal/overlay system with viewport clamping

---

## 🎯 UX Pain Points & Improvement Opportunities

### **Critical UX Issues**

1. **No Undo/Redo**
   - **Impact:** High — Users may accidentally delete or modify content
   - **Current State:** No undo stack exists
   - **Suggestion:** Implement command pattern with Ctrl+Z/Ctrl+Shift+Z

2. **No Export Functionality**
   - **Impact:** High — Users can't share work outside the tool
   - **Current State:** No PDF, PNG, or other export options
   - **Suggestion:** Add export to PDF, PNG, and potentially Miro/FigJam formats

3. **Limited Keyboard Shortcuts**
   - **Impact:** Medium — Power users expect keyboard navigation
   - **Current State:** Only Enter/Escape in some inputs
   - **Suggestion:** Add shortcuts for common actions (Cmd+N, Cmd+S, etc.)

4. **No Bulk Operations**
   - **Impact:** Medium — Repetitive tasks are tedious
   - **Current State:** Must edit items one-by-one
   - **Suggestion:** Multi-select for bulk edit/delete

5. **No Version History**
   - **Impact:** Medium — Can't revert mistakes or see evolution
   - **Current State:** No change tracking
   - **Suggestion:** Track changes with restore capability

### **Moderate UX Issues**

6. **No Minimap for Large Blueprints**
   - **Impact:** Medium — Hard to navigate large blueprints
   - **Suggestion:** Overview panel showing full blueprint with current viewport

7. **No Zoom Controls**
   - **Impact:** Medium — Can't zoom in/out for detail work
   - **Suggestion:** Zoom slider or mouse wheel zoom

8. **No Drag-and-Drop for Phases/Columns**
   - **Impact:** Low — Must use insert buttons
   - **Suggestion:** Allow dragging phase headers to reorder

9. **Limited Search Functionality**
   - **Impact:** Low — Search exists but could be more powerful
   - **Suggestion:** Full-text search with filters, highlight matches

10. **No Dark Mode Toggle**
    - **Impact:** Low — Some users prefer dark themes
    - **Suggestion:** User preference toggle

---

## 🚀 Feature Suggestions by Category

### **Category 1: Export & Sharing** (High Priority)

| Feature | Description | Effort | Impact | Priority |
|--------|-------------|--------|--------|----------|
| **PDF Export** | Export journey maps and blueprints as PDF documents | Medium | Very High | 🔴 Critical |
| **PNG/Image Export** | Export as high-resolution images for presentations | Low | High | 🔴 Critical |
| **Share Links** | Generate read-only shareable links (no auth required) | Medium | High | 🟠 High |
| **Export to Miro/FigJam** | Generate JSON or embed-friendly formats | High | Medium | 🟡 Medium |
| **Print Preview** | Optimize layout for printing | Low | Medium | 🟡 Medium |

**Rationale:** Export is essential for stakeholder communication and documentation. PDF/PNG should be prioritized.

---

### **Category 2: Editing & Workflow** (High Priority)

| Feature | Description | Effort | Impact | Priority |
|--------|-------------|--------|--------|----------|
| **Undo/Redo Stack** | Command pattern with Ctrl+Z/Ctrl+Shift+Z | High | Very High | 🔴 Critical |
| **Bulk Edit** | Multi-select actions/cards for batch operations | Medium | High | 🟠 High |
| **Copy/Paste** | Copy cards/actions between phases/columns | Medium | High | 🟠 High |
| **Templates** | Pre-built journey map and blueprint templates | Low | Medium | 🟡 Medium |
| **Keyboard Shortcuts** | Comprehensive shortcut system | Medium | Medium | 🟡 Medium |
| **Drag Phase Headers** | Reorder phases by dragging | Low | Low | 🟢 Low |

**Rationale:** Undo/Redo is critical for user confidence. Bulk operations save time on repetitive tasks.

---

### **Category 3: Visualization & Navigation** (Medium Priority)

| Feature | Description | Effort | Impact | Priority |
|--------|-------------|--------|--------|----------|
| **Minimap** | Overview panel for large blueprints | Medium | Medium | 🟡 Medium |
| **Zoom Controls** | Zoom in/out with slider or mouse wheel | Medium | Medium | 🟡 Medium |
| **Journey Comparison View** | Side-by-side current vs future state | High | High | 🟠 High |
| **Swimlanes View** | Alternative horizontal role-based view | High | Medium | 🟡 Medium |
| **Full-Screen Mode** | Hide sidebars for focused editing | Low | Low | 🟢 Low |

**Rationale:** Comparison view is valuable for demonstrating improvements. Minimap helps with large blueprints.

---

### **Category 4: AI & Intelligence** (Medium Priority)

| Feature | Description | Effort | Impact | Priority |
|--------|-------------|--------|--------|----------|
| **AI Pain Point Suggestions** | Analyze journey flow and suggest pain points | High | High | 🟠 High |
| **AI Opportunity Generation** | Suggest improvements based on pain points | High | High | 🟠 High |
| **AI Journey Summarization** | Generate executive summaries | Medium | Medium | 🟡 Medium |
| **AI Persona Generation** | Generate personas from interview notes | High | Medium | 🟡 Medium |
| **AI Thumbnail Generation (Real)** | Use image generation APIs | High | Low | 🟢 Low |
| **AI Blueprint Validation** | Intelligent flow gap analysis | High | Medium | 🟡 Medium |

**Rationale:** AI suggestions can accelerate the design process. Pain point/opportunity suggestions are high-value.

---

### **Category 5: Collaboration & Versioning** (Medium Priority)

| Feature | Description | Effort | Impact | Priority |
|--------|-------------|--------|--------|----------|
| **Version History** | Track changes with restore capability | High | Medium | 🟡 Medium |
| **Comments/Annotations** | Threaded discussions on cards/actions | High | Medium | 🟡 Medium |
| **Activity Feed** | See recent changes across projects | Medium | Low | 🟢 Low |
| **User Roles** | Admin, Editor, Viewer permissions | High | Medium | 🟡 Medium |
| **Real-Time Collaboration** | Multi-user editing (WebSockets) | Very High | Low | 🟢 Low |

**Rationale:** Version history is valuable for teams. Comments enable asynchronous feedback.

---

### **Category 6: Data & Integration** (Low Priority)

| Feature | Description | Effort | Impact | Priority |
|--------|-------------|--------|--------|----------|
| **Import from CSV/Excel** | Bulk import journey data | Medium | Medium | 🟡 Medium |
| **Jira/Linear Integration** | Create tasks from opportunities | High | Low | 🟢 Low |
| **Analytics Dashboard** | Aggregate pain points across projects | High | Medium | 🟡 Medium |
| **REST API** | Programmatic access | Very High | Low | 🟢 Low |
| **Webhook Notifications** | Notify external systems on changes | High | Low | 🟢 Low |

**Rationale:** CSV import is useful for migrating existing data. Integrations are nice-to-have.

---

### **Category 7: Enhanced Modelling** (Low Priority)

| Feature | Description | Effort | Impact | Priority |
|--------|-------------|--------|--------|----------|
| **Multi-Persona Journeys** | Show how different personas experience service | High | Medium | 🟡 Medium |
| **Action Dependencies** | Link actions across journey maps | Medium | Low | 🟢 Low |
| **Cost/Time Annotations** | Optional fields for estimated cost/duration | Low | Medium | 🟡 Medium |
| **KPI/Metric Tracking** | Attach measurable outcomes to opportunities | Medium | Low | 🟢 Low |
| **Journey Variants** | Model different paths through same journey | High | Low | 🟢 Low |

**Rationale:** Cost/time annotations are simple and useful. Multi-persona journeys are valuable for complex services.

---

### **Category 8: UI/UX Polish** (Low Priority)

| Feature | Description | Effort | Impact | Priority |
|--------|-------------|--------|--------|----------|
| **Dark Mode Toggle** | User-selectable theme | Low | Low | 🟢 Low |
| **Card Templates** | Pre-built card templates for common scenarios | Low | Low | 🟢 Low |
| **Customizable Colors** | User-defined color schemes | Medium | Low | 🟢 Low |
| **Accessibility Improvements** | ARIA labels, keyboard navigation | Medium | Medium | 🟡 Medium |
| **Mobile Responsive** | Optimize for tablet/mobile viewing | High | Low | 🟢 Low |

**Rationale:** Accessibility is important for inclusivity. Other items are nice-to-have.

---

## 🎯 Recommended Implementation Roadmap

### **Phase 1: Critical Foundations** (Next 2-3 months)
1. ✅ **PDF/PNG Export** — Essential for stakeholder communication
2. ✅ **Undo/Redo** — Critical for user confidence
3. ✅ **Journey Comparison View** — High value for demonstrating improvements
4. ✅ **Bulk Edit** — Time-saving for repetitive tasks

### **Phase 2: Enhanced UX** (Months 4-6)
5. ✅ **AI Pain Point Suggestions** — Accelerate design process
6. ✅ **AI Opportunity Generation** — Leverage existing data
7. ✅ **Minimap & Zoom** — Improve navigation for large blueprints
8. ✅ **Keyboard Shortcuts** — Power user efficiency

### **Phase 3: Collaboration** (Months 7-9)
9. ✅ **Version History** — Track changes and enable rollback
10. ✅ **Comments/Annotations** — Enable asynchronous feedback
11. ✅ **Share Links** — Easy sharing without authentication

### **Phase 4: Advanced Features** (Months 10-12)
12. ✅ **Import from CSV** — Data migration support
13. ✅ **Multi-Persona Journeys** — Complex service modelling
14. ✅ **Analytics Dashboard** — Cross-project insights
15. ✅ **Export to Miro/FigJam** — Integration with design tools

---

## 📊 Feature Priority Matrix

```
High Impact
    │
    │  [PDF Export]  [Undo/Redo]  [Journey Comparison]
    │  [AI Pain Points]  [AI Opportunities]
    │
    │  [Bulk Edit]  [Minimap]  [Version History]
    │  [Share Links]  [Comments]
    │
    │  [Zoom]  [Keyboard Shortcuts]  [Import CSV]
    │  [Multi-Persona]  [Analytics]
    │
    │  [Templates]  [Dark Mode]  [Cost/Time]
    │  [API]  [Integrations]
    │
Low Impact ────────────────────────────────────────────────►
    Low Effort                          High Effort
```

---

## 💡 Quick Wins (Low Effort, High Impact)

1. **Print Preview** — Simple CSS media queries
2. **Keyboard Shortcuts** — Add event listeners for common actions
3. **Dark Mode Toggle** — CSS variable swap
4. **Cost/Time Annotations** — Add optional fields to schema
5. **Card Templates** — Pre-filled card creation

---

## 🔍 Feature Gaps Analysis

### **What Users Might Expect But Don't Have:**

- ❌ **Conditional Branching** — "If X then Y" logic in journeys
- ❌ **Parallel Paths** — Concurrent activities within a phase
- ❌ **Timeline View** — Actual dates, not just timeframes
- ❌ **Quantitative Metrics** — Cost, time, frequency, probability
- ❌ **Sub-processes** — Nested process containers
- ❌ **Data Flow** — Explicit data object modelling
- ❌ **Role-Based Permissions** — Currently single-user
- ❌ **Real-Time Collaboration** — Multi-user editing
- ❌ **Mobile App** — Currently web-only

**Note:** Many of these are intentional design decisions (see `SD_TOOL_CAPABILITY_OVERVIEW.md`). The tool focuses on service design documentation, not process execution or BPMN notation.

---

## 📝 Conclusion

The Service Design Tool has a solid foundation with comprehensive journey map and blueprint capabilities. The highest-impact improvements would be:

1. **Export functionality** (PDF/PNG) — Essential for sharing
2. **Undo/Redo** — Critical for user confidence
3. **AI-powered suggestions** — Accelerate the design process
4. **Comparison view** — Demonstrate improvements effectively

These four features would significantly enhance the tool's value proposition while maintaining its focus on service design documentation and communication.

---

**Document Status:** Living document — update as features are implemented or priorities change.
