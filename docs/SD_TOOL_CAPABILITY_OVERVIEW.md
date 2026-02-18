# Service Design Tool — Capability Overview

This document describes what the Service Design tool can and cannot model based on the current implementation.

It serves as a reference for designers, stakeholders, and anyone evaluating the tool's suitability for their modelling needs.

---

## 1. Purpose & Scope

### What This Tool Models

The Service Design tool is designed to capture and visualize:

- **Customer journeys** — the sequence of touchpoints, emotions, and experiences a customer has with a service over time
- **Service blueprints** — the operational structure behind a service, showing how customer actions connect to frontstage and backstage processes

### Class of Problems Addressed

This tool addresses:

- **Service experience mapping** — understanding what customers go through
- **Operational transparency** — revealing the teams, systems, and handoffs behind customer-facing moments
- **Evidence documentation** — capturing pain points and opportunities with structured severity and impact ratings
- **Flow visualization** — showing dependencies, sequences, and feedback loops

### What This Tool Is Not

- **Not a process execution engine** — the tool does not execute or automate workflows
- **Not BPMN** — it does not use or enforce BPMN notation, gateways, or formal process semantics
- **Not a project management tool** — it does not track tasks, assignments, or timelines
- **Not a data analysis tool** — it does not compute metrics or generate analytics

---

## 2. Journey Maps — Supported Concepts

### Phases

- A Journey Map contains one or more **Phases**
- Phases represent macro stages of the customer journey (e.g., "Awareness", "Purchase", "Support")
- Each phase has:
  - **Title** (required)
  - **Timeframe** (optional) — descriptive label for duration
- Phases are ordered left-to-right
- Phase titles should be unique within a map (convention, not enforced)

### Actions

- Each Phase contains one or more **Actions**
- Actions represent discrete steps or moments within a phase
- Each action has:
  - **Title** (required)
  - **Description** (optional, multi-line)
  - **Thought** (optional) — represents the customer's internal monologue
  - **Channel** (optional) — the interaction channel used
  - **Touchpoint** (optional) — the specific interface or contact point
  - **Emotion** (optional) — rating from 1 to 5
  - **Thumbnail** (optional) — visual reference image stored as data URL
- Actions are ordered within their phase

### Ordering Rules

- Phases and actions follow strict left-to-right ordering
- Order is defined by numeric `order` fields (0-indexed, ascending)
- Users can insert actions before or after existing actions
- Users can insert phases before or after existing phases
- **No branching logic is supported** — the journey is a single linear sequence

### Emotions & Emotion Continuity

- Emotion is captured per action on a **1 to 5 scale**:
  - 1 = Very negative (red)
  - 2 = Negative (orange)
  - 3 = Neutral (yellow)
  - 4 = Positive (light green)
  - 5 = Very positive (green)
- The **Emotion Trend Row** visualizes emotions as a connected line graph
- Consecutive actions with emotions are connected with gradient lines
- Actions without emotions appear as unfilled circles on the trend line
- **Emotion continuity is not validated** — gaps between emotion values are allowed

### Quotes

- Each action can have multiple **Quotes** (verbatim customer statements)
- Quotes have:
  - **Quote text** (required)
  - **Source** (optional) — attribution
- Quotes appear as bubble indicators on the emotion trend row
- Clicking the trend row opens a quote management interface

### Pain Points

- Actions can have multiple **Pain Points**
- Each pain point has:
  - **Text** (required) — paragraph-friendly description
  - **Severity** (required) — Low / Medium / High
- Pain points are stored as JSON arrays in the action record
- Pain points render as rectangular cards with severity-based coloring:
  - Low → light yellow
  - Medium → light orange
  - High → light red/rose
- Pain points are editable inline within the table row

### Opportunities

- Actions can have multiple **Opportunities**
- Each opportunity has:
  - **Text** (required) — paragraph-friendly description
  - **Impact** (required) — Low impact / Medium impact / High impact
- Opportunities are stored as JSON arrays in the action record
- Opportunities render as rectangular cards with impact-based green tones:
  - Low impact → very light green/mint
  - Medium impact → light green
  - High impact → slightly stronger soft green
- Opportunities are editable inline within the table row

### Channels

Default channel options:
- Web, Mobile App, Email, Phone, In-Person, Chat, Social Media, SMS

- Custom channels can be added per journey map
- Channels are selectable per action (single selection)

### Touchpoints

Default touchpoint options:
- Homepage, Checkout, Support, Onboarding, Dashboard, Notification, Form, Search, Profile

- Custom touchpoints can be added per journey map
- Touchpoints are selectable per action (single selection)

### Personas (Lightweight)

- Journey maps can reference a **Persona** defined at the project level
- Personas are lightweight and narrative-focused:
  - **Name** (required)
  - **Short description** (required)
  - **Icon** (optional) — Material icon name
  - **Avatar URL** (optional)
- Personas are **reusable** across multiple journey maps in the same project
- Personas do not include goals, motivations, demographics, or behavioral models
- The demo AI may reference persona names and descriptions

### Explicit Limitations

- **No branching** — a journey is a single linear path
- **No parallel paths** — cannot model concurrent customer activities
- **No conditional logic** — cannot model "if/then" decisions within the journey
- **No timeline enforcement** — timeframes are labels only, not enforced intervals
- **Personas are lightweight** — no behavioral modelling, goals, or demographics

---

## 3. Service Blueprints — Supported Concepts

### Phases and Columns

- A Service Blueprint contains one or more **Phases**
- Each Phase contains one or more **Columns**
- Columns represent discrete time steps in the service flow
- Phases provide grouping headers spanning multiple columns
- Each phase and column has:
  - **Order** (required) — determines left-to-right sequence
  - **Title** (phases only)
  - **Timeframe** (optional)

### Lane Types

The blueprint has five horizontal lanes (rows), top to bottom:

| Lane | Type | Card Types | Description |
|------|------|------------|-------------|
| Physical Evidence | Basic | BasicCard | Tangible evidence the customer sees |
| Customer Action | Basic | BasicCard, DecisionCard | What the customer does or decides |
| Frontstage Action | Complex | ComplexCard, DecisionCard | Visible employee actions (team-owned) |
| Backstage Action | Complex | ComplexCard, DecisionCard | Invisible employee actions (team-owned) |
| Support Process | Basic | BasicCard | Backend systems and processes |

Note: Decision cards are allowed in Customer Action, Frontstage, and Backstage lanes, but NOT in Physical Evidence or Support Process.

### Basic Cards vs Complex Cards

**Basic Cards** (Physical Evidence, Customer Action, Support Process):
- Contain: title, description, pain points, opportunities
- No team ownership
- Multiple cards can exist per lane per column

**Complex Cards** (Frontstage Action, Backstage Action):
- Contain: title, description, pain points, opportunities, software/service tags
- Owned by a team via TeamSection
- Multiple cards can exist within a team section

### Teams and Ownership Rules

- **BlueprintTeam** represents an organizational team
- Each team has:
  - Name (required)
  - Icon (Material icon)
  - Color (hex code)
- Teams are defined at the blueprint level and reusable across columns

**One-Team-Per-Column Rule:**
- Each column may have **at most one team total** across both Frontstage and Backstage
- If a team exists in Frontstage, Backstage **cannot** have a team for that column (and vice versa)
- To change team ownership, create a new column (representing a handoff)
- This enforces clean handoff semantics: team transitions occur at column boundaries

### Software / Services Tagging

- **SoftwareService** represents a system, tool, or service
- Each service has:
  - Label (required)
  - Color (pastel hex code)
- Services are defined at the blueprint level
- Complex cards can be tagged with multiple software services
- Services appear as small colored tags on the card

### Decision Cards

- **Decision Cards** are a first-class card type for routing/conditional logic
- Decision cards are **flow nodes** that participate in the same vertical ordering as action cards
- Decision cards **do not perform work** — they only route flow
- Each decision card has:
  - **Title** (required) — short label, e.g., "Payment outcome"
  - **Question** (required) — decision logic phrased as a question, e.g., "Did the payment succeed?"
  - **Description** (optional) — clarifying notes

**Where Decision Cards Are Allowed:**
- **Customer Action lane** — alongside basic cards
- **Frontstage Action lane** — alongside complex cards within team sections
- **Backstage Action lane** — alongside complex cards within team sections

**Where Decision Cards Are NOT Allowed:**
- Physical Evidence lane
- Support Process lane

**Why These Lanes:**
- Decisions represent branching points in the journey and process flow
- They answer questions like "Did the action succeed?" or "What path does the process take?"
- In Customer Action: represents customer-facing decision points
- In Frontstage/Backstage: represents internal process routing decisions

**Decision Cards Do NOT Have:**
- Team ownership (even in Frontstage/Backstage, they are independent of the team section)
- Pain points
- Opportunities
- Software/service tags

**Unified Flow Ordering:**
- In Customer Action: Decision cards share the same `order` field as basic cards
- In Frontstage/Backstage: Decision cards share the same `order` field as complex cards within the team section
- They can be interleaved: Action → Decision → Action → Action → Decision
- Users can reorder cards using up/down controls that appear on hover
- Users can insert new cards (action or decision) between existing cards using hover affordances

**Connector Behavior:**
- Decision cards may have **multiple outgoing horizontal connectors**
- Decision cards can have **one vertical connector** (from bottom to card directly below)
- Extra vertical spacing is automatically added when a vertical connector exists
- Multiple vertical connectors from the same decision card are **prevented** with a gentle message
- Outgoing connectors **should be labeled** (e.g., "Yes", "No", "Retry")
- **Branch presets** are available when editing decision-origin connectors:
  - **Yes** — sets label "Yes", green color
  - **No** — sets label "No", red color
  - **Custom** — free label and color choice
- No restriction on incoming connectors
- Orthogonal routing rules apply
- Loops from decision cards are allowed

**Visual Design:**
- Same footprint as other cards (preserves grid alignment)
- Dashed border to distinguish from action cards
- "Decision" label with icon at top
- Neutral styling (not team color, not emotion colors)

**Validation (INFO-only, no warnings):**
- INFO-level insight if decision card has fewer than 2 outgoing connectors
- INFO-level insight if outgoing connectors are missing labels
- No "missing branch" warnings

### Start / End Visual Markers

- Any card (Basic, Complex, or Decision) can be flagged as **Start** or **End**
- These are **visual-only flags**:
  - No impact on flow logic
  - No impact on validation
  - No impact on AI reasoning
- Markers appear as small badges on the card ("Start" or "End")
- Cards are NOT start/end unless explicitly flagged
- Inferred start/end detection (based on connectors) remains unchanged

### Connectors and Flow Semantics

Connectors link cards to show flow and dependencies.

**Connector Properties:**
- Source card (basic or complex)
- Target card (basic or complex)
- Connector type: `standard`, `dependency`, `feedback`, `wait`
- Label (optional)
- Arrow direction: `forward`, `backward`, `bidirectional`, `none`
- Stroke weight: `thin`, `normal`, `thick`
- Stroke pattern: `solid`, `dashed`, `dotted`
- Stroke color: `grey`, `red`, `green`

**Connector Type Visual Styles:**
- Standard → solid line, filled arrowhead
- Dependency → dashed line, open arrowhead
- Feedback → solid line, filled arrowhead (for loops)
- Wait → dotted line, pause marker

**Routing Rules:**
- All connectors use **orthogonal paths** (right angles only)
- No diagonal lines
- No freeform curves (except same-column feedback loops use tight orthogonal shape)
- Connectors route around cards using invisible routing lanes
- Parallel connectors are offset to avoid overlap

### Loops and Rework Modelling

- Loops are supported as explicit, user-created connections
- A loop is a connector where:
  - Target column ≤ source column (backward or same-column)
- Loop connectors:
  - Use orthogonal routing
  - Route around the content area
  - Are treated as valid (not warnings)
- Loops detected in the flow are surfaced as **INFO-level insights** only
- Common loop use cases:
  - Rework cycles
  - Approval loops
  - Feedback processes

### Validation Philosophy

The blueprint validation follows these principles:

**Warnings are shown only when:**
- A phase or column is empty AND content exists to the right
- A card has incoming connectors but no outgoing, is not in the rightmost column, AND there's a connected column to the right

**INFO-level insights (non-blocking):**
- Multiple flow starting points
- Flow endpoints
- Cards participating in loops

**Explicitly NOT validated:**
- Missing team ownership (not required)
- Orphaned cards (cards with no connectors are valid)
- Trailing empty phases or columns (work-in-progress state)

---

## 4. Flow & Logic Semantics

### What a Connector Means

A connector represents a relationship between two cards:
- **Sequence** — one step follows another
- **Dependency** — one step depends on another (dashed style)
- **Feedback** — information or control returns to an earlier step
- **Wait/Delay** — a pause or waiting period (dotted style)

Connectors do **not** represent:
- Data flow volume
- Probability or frequency
- Mandatory vs optional paths
- Automated vs manual execution

### What a Loop Means

A loop represents:
- **Rework** — a process returns to an earlier step for correction
- **Iteration** — a step may be repeated
- **Feedback** — information flows backward in the process

Loops are intentional and explicit. The system does not auto-generate loops or infer cyclic behavior.

### What a Decision Represents

Decisions are modelled using **Decision Cards**:
- Decision cards represent conditional logic and routing points
- They **do not perform work** — they only route flow
- Decision cards have a **question** that describes the decision logic
- Multiple outgoing connectors represent different outcomes (e.g., "Yes", "No")
- Outgoing connectors should be labeled to indicate the outcome

**Important:**
- Decision cards are **routing-only constructs**, not BPMN gateways
- No XOR/AND semantics — all outgoing paths are simply alternatives
- No execution logic — the tool does not determine which path is taken

### How Time Is Implied

- Time flows **left to right** across columns
- Phase timeframes are descriptive labels (not enforced durations)
- Column boundaries represent moments in time
- Team transitions at column boundaries imply handoff events
- The tool does not calculate or display actual time durations

---

## 5. Validation & Warnings Philosophy

### What Triggers Warnings

| Context | Condition | Severity |
|---------|-----------|----------|
| Journey Map | Phase has no actions AND content exists to the right | Warning |
| Blueprint | Phase has no content AND content exists to the right | Warning |
| Blueprint | Column is empty AND content exists to the right | Warning |
| Blueprint | Card has incoming but no outgoing, not rightmost, connected column to right exists | Warning |

### What Is Informational Only

| Context | Condition | Severity |
|---------|-----------|----------|
| Journey Map | Action has no description | Info |
| Journey Map | Pain point has no severity set | Info |
| Blueprint | Multiple flow starting points | Info |
| Blueprint | Card is a flow endpoint | Info |
| Blueprint | Card is part of a feedback loop | Info |
| Blueprint | Decision card has fewer than 2 outgoing connectors | Info |
| Blueprint | Decision card has unlabeled outgoing connectors | Info |

### What Is Explicitly Allowed Without Warning

- Empty trailing phases or columns (work-in-progress)
- Cards with no connectors (valid standalone elements)
- Missing team ownership in Frontstage/Backstage lanes
- Actions without emotions
- Actions without pain points or opportunities
- Phases or actions without timeframes

---

## 6. Explicit Non-Goals

### Concepts Intentionally Not Modelled

| Concept | Reason |
|---------|--------|
| BPMN notation | Tool uses service design conventions, not formal process notation |
| BPMN gateways / XOR / AND splits | Decision cards are routing-only, no execution semantics |
| Parallel execution | Decision cards route to alternatives, not parallel paths |
| Swimlanes (per role) | Teams are per-column, not continuous horizontal lanes |
| Data objects | Software/services can be tagged but data flow is not modelled |
| BPMN events (start/end/intermediate) | Start/End markers are visual-only, not formal events |
| Sub-processes | No nested process containers |
| Probability / percentage splits | Connectors have no quantitative attributes |
| SLA / timing constraints | Timeframes are labels, not enforced durations |
| Version history | No built-in versioning or change tracking |
| Collaboration / multi-user | No real-time collaboration features |
| Export to BPMN / Visio / PDF | No export functionality exists |
| Persona behavior modelling | Personas are lightweight, narrative-only |

### Things Users Might Expect But Are Not Supported

- **Conditional paths** — "if X then Y" branching
- **Parallel execution** — concurrent activities within a phase
- **Quantitative metrics** — cost, time, frequency, probability
- **Integration with execution systems** — the tool does not trigger workflows
- **Auto-layout** — connectors and cards must be manually positioned
- **Undo/redo** — no explicit undo stack
- **Comments or annotations** — no threaded discussion on elements

### Boundaries of Responsibility

The tool is for **documentation and communication**, not:
- Process automation
- Workflow execution
- Performance measurement
- Compliance auditing

---

## 7. Demo & AI Readiness (Descriptive Only)

### What the Scripted Demo AI Can Reference

The demo AI has read-only access to existing data fields:

**Project Level:**
- Project name and description
- Persona names and short descriptions

**Journey Map Level:**
- Journey map name
- Referenced persona (name, short description)
- Phase titles and timeframes
- Action titles, descriptions, thoughts
- Emotion values (1-5 scale)
- Channels and touchpoints
- Pain point text and severity
- Opportunity text and impact
- Quote text and sources

**Blueprint Level:**
- Blueprint name
- Phase titles and timeframes
- Basic card titles, descriptions, lane types, start/end markers
- Complex card titles, descriptions, start/end markers
- Decision card titles, questions, descriptions, start/end markers
- Team names and lane types
- Pain point text and severity
- Opportunity text and impact
- Software service labels
- Connection types and labels

### What the Demo AI Cannot Do

| Constraint | Description |
|------------|-------------|
| No data invention | Cannot fabricate information not present in the demo project |
| No data modification | Cannot change, add, or delete existing elements |
| No external access | Cannot call APIs or access data outside the demo project |
| No assumptions | Cannot infer fields or relationships not explicitly stored |
| No content generation | Cannot create new actions, teams, cards, or connectors |

### AI Response Conventions

- Severity and impact values should be displayed as **Title Case** (Low, Medium, High)
- Team names should be referenced exactly as stored
- Phase and action titles should be quoted when referenced
- Loops should be described as "feedback loops" or "rework cycles"
- Handoffs should reference the team names on either side of the column boundary

---

## Document Version

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-29 | Initial capability overview |
| 1.1 | 2026-01-29 | Added Decision Cards, Lightweight Personas, Start/End Visual Markers |
| 1.2 | 2026-01-29 | Extended Decision Cards to Frontstage/Backstage lanes, added card reordering/insertion, vertical connector with auto-spacing |