# Demo Data Schema Definition

This document defines the **expected data structure** for demo project content.  
It serves as a contract for:
- Safe demo content insertion
- Scripted AI response references
- Future real AI integration

---

## 1. Demo Project Structure

### Project Metadata

| Field         | Type     | Required | Description                          |
|---------------|----------|----------|--------------------------------------|
| `id`          | string   | Auto     | Unique identifier (cuid)             |
| `name`        | string   | Yes      | Display name of the project          |
| `description` | string   | No       | Optional project description         |
| `createdAt`   | datetime | Auto     | Creation timestamp                   |
| `updatedAt`   | datetime | Auto     | Last update timestamp                |

### Project Contents

A demo project may contain:

| Content Type       | Min | Max  | Notes                              |
|--------------------|-----|------|------------------------------------|
| Journey Maps       | 0   | Many | Ordered by `sortOrder`             |
| Service Blueprints | 0   | Many | Ordered by `sortOrder`             |
| Personas           | 0   | Many | Reusable across journey maps       |

---

## 1.1 Persona Schema (Project-level)

### Persona

| Field             | Type     | Required | Description                        |
|-------------------|----------|----------|------------------------------------|
| `id`              | string   | Auto     | Unique identifier                  |
| `name`            | string   | Yes      | Persona display name               |
| `shortDescription`| string   | Yes      | Brief description of the persona   |
| `iconName`        | string   | No       | Material icon name                 |
| `avatarUrl`       | string   | No       | Data URL or external URL           |
| `projectId`       | string   | Yes      | Parent project reference           |

**Usage:**
- Personas are defined at the project level
- Journey maps can reference one persona via `personaId`
- Personas are lightweight and narrative-focused
- No behavioral modelling, goals, or demographics

---

## 2. Journey Map Schema

### JourneyMap

| Field             | Type     | Required | Description                        |
|-------------------|----------|----------|------------------------------------|
| `id`              | string   | Auto     | Unique identifier                  |
| `name`            | string   | Yes      | Journey map display name           |
| `persona`         | string   | No       | Legacy: plain text persona description |
| `personaId`       | string   | No       | Reference to Persona entity        |
| `sortOrder`       | int      | Auto     | Display order (0-indexed)          |
| `projectId`       | string   | Yes      | Parent project reference           |

**Note:** Prefer using `personaId` to reference a project-level Persona rather than inline `persona` text.

### JourneyPhase

| Field         | Type     | Required | Constraints                        |
|---------------|----------|----------|------------------------------------|
| `id`          | string   | Auto     | Unique identifier                  |
| `order`       | int      | Yes      | Phase ordering (0-indexed, unique within map) |
| `title`       | string   | Yes      | Phase name (e.g., "Awareness")     |
| `timeframe`   | string   | No       | Duration label (e.g., "Week 1-2")  |
| `journeyMapId`| string   | Yes      | Parent journey map reference       |

**Constraints:**
- Phases are ordered by `order` field (ascending)
- Phase titles should be unique within a journey map (convention, not enforced)

### JourneyAction

| Field         | Type     | Required | Constraints                        |
|---------------|----------|----------|------------------------------------|
| `id`          | string   | Auto     | Unique identifier                  |
| `order`       | int      | Yes      | Action ordering within phase (0-indexed) |
| `title`       | string   | Yes      | Action title                       |
| `description` | string   | No       | Multi-line description             |
| `thought`     | string   | No       | User's internal thought            |
| `channel`     | string   | No       | Channel identifier (see below)     |
| `touchpoint`  | string   | No       | Touchpoint identifier (see below)  |
| `emotion`     | int      | No       | Emotion rating: 1-5 (1=negative, 5=positive) |
| `painPoints`  | string   | No       | JSON array (see Pain Points format)|
| `opportunities`| string  | No       | JSON array (see Opportunities format)|
| `thumbnailUrl`| string   | No       | Data URL for thumbnail image       |
| `phaseId`     | string   | Yes      | Parent phase reference             |

**Constraints:**
- Actions are ordered by `order` field (ascending) within their phase
- `emotion` must be integer 1-5 or null
- `painPoints` and `opportunities` are JSON-encoded arrays

### Pain Points Format (Journey Map)

```json
[
  {
    "text": "Long wait times frustrate users",
    "severity": "HIGH"
  },
  {
    "text": "Unclear pricing information",
    "severity": "MEDIUM"
  }
]
```

| Field     | Type   | Required | Stored Value | UI Display |
|-----------|--------|----------|--------------|------------|
| `text`    | string | Yes      | Multi-line text | As-is |
| `severity`| string | Yes      | `"LOW"` / `"MEDIUM"` / `"HIGH"` | "Low" / "Medium" / "High" |

> **Note:** Severity is stored as uppercase enum but displayed in Title Case in the UI.

### Opportunities Format (Journey Map)

```json
[
  {
    "text": "Implement real-time queue updates",
    "impact": "HIGH"
  },
  {
    "text": "Add comparison tool for plans",
    "impact": "MEDIUM"
  }
]
```

| Field   | Type   | Required | Stored Value | UI Display |
|---------|--------|----------|--------------|------------|
| `text`  | string | Yes      | Multi-line text | As-is |
| `impact`| string | Yes      | `"LOW"` / `"MEDIUM"` / `"HIGH"` | "Low impact" / "Medium impact" / "High impact" |

> **Note:** Impact is stored as uppercase enum but displayed as Title Case phrases in the UI.

### JourneyQuote (Emotion Quote)

| Field     | Type   | Required | Description                |
|-----------|--------|----------|----------------------------|
| `id`      | string | Auto     | Unique identifier          |
| `quoteText`| string| Yes      | The quote text             |
| `source`  | string | No       | Quote attribution          |
| `actionId`| string | Yes      | Parent action reference    |

### Channels (Default Options)

The app provides these default channel options:

| Value         | Label        | Icon         |
|---------------|--------------|--------------|
| `Web`         | Web          | `language`   |
| `Mobile App`  | Mobile App   | `smartphone` |
| `Email`       | Email        | `mail`       |
| `Phone`       | Phone        | `call`       |
| `In-Person`   | In-Person    | `person`     |
| `Chat`        | Chat         | `chat`       |
| `Social Media`| Social Media | `share`      |
| `SMS`         | SMS          | `sms`        |

> **Note:** Channel values are stored as-is (e.g., `"Web"`, `"Mobile App"`). An empty string `""` indicates no channel selected.

**Custom Channels:** Can be added per journey map with custom label and icon.

### Touchpoints (Default Options)

The app provides these default touchpoint options:

| Value          | Label         | Icon             |
|----------------|---------------|------------------|
| `Homepage`     | Homepage      | `home`           |
| `Checkout`     | Checkout      | `shopping_cart`  |
| `Support`      | Support       | `support_agent`  |
| `Onboarding`   | Onboarding    | `start`          |
| `Dashboard`    | Dashboard     | `dashboard`      |
| `Notification` | Notification  | `notifications`  |
| `Form`         | Form          | `edit_note`      |
| `Search`       | Search        | `search`         |
| `Profile`      | Profile       | `account_circle` |

> **Note:** Touchpoint values are stored as-is (e.g., `"Homepage"`, `"Checkout"`). An empty string `""` indicates no touchpoint selected.

**Custom Touchpoints:** Can be added per journey map with custom label and icon.

---

## 3. Service Blueprint Schema

### ServiceBlueprint

| Field       | Type     | Required | Description                        |
|-------------|----------|----------|------------------------------------|
| `id`        | string   | Auto     | Unique identifier                  |
| `name`      | string   | Yes      | Blueprint display name             |
| `sortOrder` | int      | Auto     | Display order (0-indexed)          |
| `projectId` | string   | Yes      | Parent project reference           |

### BlueprintPhase

| Field        | Type     | Required | Constraints                       |
|--------------|----------|----------|-----------------------------------|
| `id`         | string   | Auto     | Unique identifier                 |
| `order`      | int      | Yes      | Phase ordering (0-indexed)        |
| `title`      | string   | Yes      | Phase name                        |
| `timeframe`  | string   | No       | Duration label                    |
| `blueprintId`| string   | Yes      | Parent blueprint reference        |

### BlueprintColumn

| Field        | Type     | Required | Constraints                       |
|--------------|----------|----------|-----------------------------------|
| `id`         | string   | Auto     | Unique identifier                 |
| `order`      | int      | Yes      | Column ordering within phase      |
| `phaseId`    | string   | Yes      | Parent phase reference            |
| `blueprintId`| string   | Yes      | Parent blueprint reference        |

**Constraints:**
- Columns are ordered by phase order, then column order
- Each column represents one time step in the service flow

### Lane Types

The blueprint has 5 horizontal lanes (rows):

| Lane Type           | Position | Card Types          | Description                    |
|---------------------|----------|---------------------|--------------------------------|
| `PHYSICAL_EVIDENCE` | Top      | Basic               | Tangible evidence customer sees|
| `CUSTOMER_ACTION`   | 2nd      | Basic, Decision     | What the customer does/decides |
| `FRONTSTAGE_ACTION` | 3rd      | Complex, Decision   | Visible employee actions       |
| `BACKSTAGE_ACTION`  | 4th      | Complex, Decision   | Invisible employee actions     |
| `SUPPORT_PROCESS`   | Bottom   | Basic               | Backend systems/processes      |

### BlueprintBasicCard

For: Physical Evidence, Customer Action, Support Process lanes

| Field         | Type     | Required | Constraints                       |
|---------------|----------|----------|-----------------------------------|
| `id`          | string   | Auto     | Unique identifier                 |
| `order`       | int      | Yes      | Card ordering within lane/column  |
| `laneType`    | string   | Yes      | `PHYSICAL_EVIDENCE` / `CUSTOMER_ACTION` / `SUPPORT_PROCESS` |
| `title`       | string   | Yes      | Card title                        |
| `description` | string   | No       | Card description                  |
| `painPoints`  | string   | No       | JSON array (see format below)     |
| `opportunities`| string  | No       | JSON array (see format below)     |
| `isStart`     | boolean  | No       | Visual marker only (default: false)|
| `isEnd`       | boolean  | No       | Visual marker only (default: false)|
| `columnId`    | string   | Yes      | Parent column reference           |

### BlueprintComplexCard

For: Frontstage Action, Backstage Action lanes (team-owned)

| Field          | Type     | Required | Constraints                     |
|----------------|----------|----------|---------------------------------|
| `id`           | string   | Auto     | Unique identifier               |
| `order`        | int      | Yes      | Card ordering within team section|
| `title`        | string   | Yes      | Card title                      |
| `description`  | string   | No       | Card description                |
| `painPoints`   | string   | No       | JSON array (see format below)   |
| `opportunities`| string   | No       | JSON array (see format below)   |
| `softwareIds`  | string   | No       | JSON array of SoftwareService IDs|
| `isStart`      | boolean  | No       | Visual marker only (default: false)|
| `isEnd`        | boolean  | No       | Visual marker only (default: false)|
| `teamSectionId`| string   | Yes      | Parent team section reference   |

### BlueprintDecisionCard

For: **Customer Action, Frontstage Action, and Backstage Action lanes** (routing-only flow nodes)

| Field          | Type     | Required | Constraints                     |
|----------------|----------|----------|---------------------------------|
| `id`           | string   | Auto     | Unique identifier               |
| `order`        | int      | Yes      | Card ordering within column (shared with action cards)|
| `laneType`     | string   | Yes      | `CUSTOMER_ACTION` / `FRONTSTAGE_ACTION` / `BACKSTAGE_ACTION` |
| `title`        | string   | Yes      | Short label (e.g., "Payment outcome") |
| `question`     | string   | Yes      | Decision logic as question (e.g., "Did the payment succeed?") |
| `description`  | string   | No       | Clarifying notes                |
| `isStart`      | boolean  | No       | Visual marker only (default: false)|
| `isEnd`        | boolean  | No       | Visual marker only (default: false)|
| `columnId`     | string   | Yes      | Parent column reference         |
| `blueprintId`  | string   | Yes      | Parent blueprint reference      |

**Decision Cards Do NOT Have:**
- Team ownership
- Pain points
- Opportunities
- Software/service tags

**Decision Cards Are NOT Allowed In:**
- Physical Evidence lane
- Support Process lane

**Unified Flow Ordering:**
- In Customer Action: Decision cards share the same vertical flow as BasicCards
- In Frontstage/Backstage: Decision cards share the same vertical flow as ComplexCards within the team section
- The `order` field determines position relative to all cards in the lane
- Example ordering: Action (order=0) → Decision (order=1) → Action (order=2)
- Users can reorder decision cards relative to action cards using up/down controls
- Users can insert new cards between existing cards using hover affordances

**Connector Behavior:**
- Decision cards may have multiple outgoing horizontal connectors
- Decision cards can have ONE vertical connector (from bottom to card directly below)
- Outgoing connectors should be labeled (e.g., "Yes", "No", "Retry")
- **Branch presets** available: Yes (green), No (red), Custom
- No restriction on incoming connectors
- Loops from decision cards are valid

**Vertical Connector Spacing:**
- When a vertical connector exists from a decision card to the card below, extra spacing is automatically added
- This ensures the connector arrow and label remain readable and not cramped

### Pain Points Format (Blueprint)

```json
[
  {
    "text": "Manual data entry causes errors",
    "severity": "HIGH"
  },
  {
    "text": "System timeout during peak hours",
    "severity": "MEDIUM"
  }
]
```

| Field     | Type   | Required | Stored Value | UI Display |
|-----------|--------|----------|--------------|------------|
| `text`    | string | Yes      | Multi-line text | As-is |
| `severity`| string | Yes      | `"LOW"` / `"MEDIUM"` / `"HIGH"` | "Low" / "Medium" / "High" |

> **Note:** Severity is stored as uppercase enum but displayed in Title Case in the UI.

### Opportunities Format (Blueprint)

Opportunities follow the same format as Journey Maps:

```json
[
  {
    "text": "Automate data validation to reduce errors",
    "impact": "HIGH"
  },
  {
    "text": "Add caching layer for improved response times",
    "impact": "MEDIUM"
  }
]
```

| Field   | Type   | Required | Stored Value | UI Display |
|---------|--------|----------|--------------|------------|
| `text`  | string | Yes      | Multi-line text | As-is |
| `impact`| string | Yes      | `"LOW"` / `"MEDIUM"` / `"HIGH"` | "Low impact" / "Medium impact" / "High impact" |

> **Note:** Impact is stored as uppercase enum but displayed as Title Case phrases in the UI.
>
> **Schema Note:** The `opportunities` field may require a database migration to add to `BlueprintBasicCard` and `BlueprintComplexCard` models if not already present.

### TeamSection

Groups complex cards under a team within a column.

| Field        | Type     | Required | Constraints                       |
|--------------|----------|----------|-----------------------------------|
| `id`         | string   | Auto     | Unique identifier                 |
| `order`      | int      | Yes      | Section ordering (if multiple)    |
| `laneType`   | string   | Yes      | `FRONTSTAGE_ACTION` / `BACKSTAGE_ACTION` |
| `columnId`   | string   | Yes      | Parent column reference           |
| `teamId`     | string   | Yes      | Team reference                    |
| `blueprintId`| string   | Yes      | Parent blueprint reference        |

**One-Team-Per-Column Rule:**
- Each column may have **at most ONE team total** across both Frontstage and Backstage
- If a team exists in Frontstage, Backstage **cannot** have a team for that column (and vice versa)
- To change team ownership, create a new column (representing a handoff)
- This enforces clean handoff semantics: team transitions occur at column boundaries

### BlueprintTeam

| Field        | Type     | Required | Constraints                       |
|--------------|----------|----------|-----------------------------------|
| `id`         | string   | Auto     | Unique identifier                 |
| `name`       | string   | Yes      | Team display name                 |
| `iconName`   | string   | Yes      | Material icon name (default: `group`) |
| `colorHex`   | string   | Yes      | Hex color code (e.g., `#6366f1`)  |
| `blueprintId`| string   | Yes      | Parent blueprint reference        |

### SoftwareService

| Field        | Type     | Required | Constraints                       |
|--------------|----------|----------|-----------------------------------|
| `id`         | string   | Auto     | Unique identifier                 |
| `label`      | string   | Yes      | Software/service name             |
| `colorHex`   | string   | Yes      | Pastel hex color (e.g., `#cbd5e1`)|
| `blueprintId`| string   | Yes      | Parent blueprint reference        |

### BlueprintConnection (Connector)

| Field          | Type     | Required | Constraints                     |
|----------------|----------|----------|---------------------------------|
| `id`           | string   | Auto     | Unique identifier               |
| `blueprintId`  | string   | Yes      | Parent blueprint reference      |
| `sourceCardId` | string   | Yes      | Source card ID                  |
| `sourceCardType`| string  | Yes      | `"basic"` / `"complex"` / `"decision"` |
| `targetCardId` | string   | Yes      | Target card ID                  |
| `targetCardType`| string  | Yes      | `"basic"` / `"complex"` / `"decision"` |
| `connectorType`| string   | Yes      | `"standard"` / `"dependency"` / `"feedback"` / `"wait"` |
| `label`        | string   | No       | Optional connector label        |
| `arrowDirection`| string  | Yes      | `"forward"` / `"backward"` / `"bidirectional"` / `"none"` |
| `strokeWeight` | string   | Yes      | `"thin"` / `"normal"` / `"thick"` |
| `strokePattern`| string   | Yes      | `"solid"` / `"dashed"` / `"dotted"` |
| `strokeColor`  | string   | Yes      | `"grey"` / `"red"` / `"green"` |

**Connector Labels for Decision Cards:**
- Outgoing connectors from decision cards should be labeled
- Example labels: "Yes", "No", "Approved", "Rejected", "Retry"

**Connector Directionality:**
- **Forward flow:** Source column < Target column (left-to-right)
- **Loop (backward):** Source column > Target column (rework/feedback)
- **Same-column loop:** Source column = Target column

**Uniqueness Constraint:**
- Each (sourceCardId, targetCardId) pair must be unique

**Connector Color Independence:**
> Connector colors (`grey`, `red`, `green`) are **independent** of:
> - Pain point severity colors (yellow/orange/red warm tones)
> - Opportunity impact colors (green tones)
>
> Connector colors are used for visual emphasis or status indication on flow lines,
> not to represent evidence severity/impact.

### Loop Representation

Loops are valid connectors where the target is in an earlier column (or same column):

```
Loop Example:
  Column 1 (Card A) --------> Column 3 (Card B)   [forward]
                    <--------                      [loop back]
```

Loop connectors:
- Use `connectorType: "feedback"` for explicit feedback loops
- Use `connectorType: "standard"` for general rework
- Route orthogonally (no diagonal paths)
- Are treated as INFO-level insights (not warnings)

---

## 4. Scripted AI Reference Points

### Allowed Reference Fields

The demo AI may **read and reference** the following fields:

#### Project Level
- `project.name`
- `project.description`
- `persona.name`
- `persona.shortDescription`

#### Journey Map Level
- `journeyMap.name`
- `journeyMap.persona` (legacy text)
- `journeyMap.personaRef.name` (persona reference)
- `journeyMap.personaRef.shortDescription` (persona reference)
- `phase.title`
- `phase.timeframe`
- `action.title`
- `action.description`
- `action.thought`
- `action.emotion` (1-5 scale)
- `action.channel`
- `action.touchpoint`
- `painPoint.text`
- `painPoint.severity` - Display as "Low", "Medium", or "High"
- `opportunity.text`
- `opportunity.impact` - Display as "Low impact", "Medium impact", or "High impact"
- `quote.quoteText`
- `quote.source`

#### Service Blueprint Level
- `blueprint.name`
- `phase.title`
- `phase.timeframe`
- `basicCard.title`
- `basicCard.description`
- `basicCard.laneType`
- `basicCard.isStart` / `basicCard.isEnd` (flow markers)
- `complexCard.title`
- `complexCard.description`
- `complexCard.isStart` / `complexCard.isEnd` (flow markers)
- `decisionCard.title`
- `decisionCard.question`
- `decisionCard.description`
- `decisionCard.isStart` / `decisionCard.isEnd` (flow markers)
- Note: Decision cards are always in Customer Action lane
- `team.name`
- `teamSection.laneType`
- `painPoint.text`
- `painPoint.severity` - Display as "Low", "Medium", or "High"
- `opportunity.text`
- `opportunity.impact` - Display as "Low impact", "Medium impact", or "High impact"
- `softwareService.label`
- `connection.connectorType`
- `connection.label`

### AI Behavior Rules

```
+-------------------------------------------------------------+
|                    DEMO AI CONSTRAINTS                       |
+-------------------------------------------------------------+
| ALLOWED:                                                     |
|   - Reference existing data fields listed above              |
|   - Summarize patterns across phases/actions                 |
|   - Identify pain points and opportunities                   |
|   - Describe team handoffs based on TeamSection changes      |
|   - Report loops based on connection directionality          |
|   - Reference decision card titles and questions             |
|   - Describe branches and outcomes from decision cards       |
|   - Explain loops that involve decision cards                |
|                                                              |
| NOT ALLOWED:                                                 |
|   - Invent data not present in the demo project              |
|   - Make assumptions about unlisted fields                   |
|   - Generate new content (actions, teams, decisions, etc.)   |
|   - Modify existing data                                     |
|   - Access external APIs or data sources                     |
|   - Suggest or invent new decision cards                     |
+-------------------------------------------------------------+
```

### Example AI Response References

**Referencing a Pain Point:**
```
"In the '{action.title}' step, users experience a High severity 
pain point: '{painPoint.text}'"
```

**Referencing a Team Handoff:**
```
"The flow transitions from '{teamA.name}' to '{teamB.name}' 
between columns {N} and {N+1}"
```

**Referencing a Loop:**
```
"There is a feedback loop from '{sourceCard.title}' back to 
'{targetCard.title}', indicating a rework cycle"
```

**Referencing a Decision:**
```
"At '{decisionCard.title}', the process asks: '{decisionCard.question}'. 
The '{connection.label}' path leads to '{targetCard.title}'."
```

**Referencing Opportunities:**
```
"A High impact opportunity exists in '{action.title}': 
'{opportunity.text}'"
```

> **Note:** AI responses should use Title Case for severity/impact labels
> (e.g., "High", "Medium", "Low") not uppercase enums.

---

## 5. Data Insertion Order

When inserting demo data, follow this order to satisfy foreign key constraints:

### Journey Map Insertion Order
1. `Project`
2. `JourneyMap`
3. `CustomChannel` (optional)
4. `CustomTouchpoint` (optional)
5. `JourneyPhase` (ordered by `order`)
6. `JourneyAction` (ordered by `order` within phase)
7. `JourneyQuote` (after actions)

### Service Blueprint Insertion Order
1. `Project` (if not exists)
2. `ServiceBlueprint`
3. `BlueprintTeam` (define teams first)
4. `SoftwareService` (define software first)
5. `BlueprintPhase` (ordered by `order`)
6. `BlueprintColumn` (ordered by phase, then `order`)
7. `BlueprintBasicCard` (for each column)
8. `TeamSection` (for Frontstage/Backstage lanes)
9. `BlueprintComplexCard` (within team sections)
10. `BlueprintConnection` (after all cards exist)

---

## 6. Validation Alignment

Demo data should avoid triggering validation warnings:

### Journey Map Validation
- Each phase should have at least one action (unless trailing)
- Actions should have descriptions (optional but recommended)
- Pain points should have severity set

### Service Blueprint Validation
- Each phase should have content (unless trailing)
- Columns with content should exist before empty trailing columns
- Cards in flow should have connections (unless endpoints)
- Loops are valid and reported as INFO only

---

## Document Version

| Version | Date       | Changes                              |
|---------|------------|--------------------------------------|
| 1.0     | 2026-01-28 | Initial schema definition            |
| 1.1     | 2026-01-29 | Aligned with product rules: severity/impact display labels, opportunities for blueprints, one-team-per-column clarification, connector color independence, channels/touchpoints updated |
| 1.2     | 2026-01-29 | Decision Cards refactored: restricted to Customer Action lane only, unified flow ordering with BasicCards, branch presets (Yes/No/Custom) documented, AI behavior rules updated for decisions |
| 1.3     | 2026-01-29 | Decision Cards expanded: now available in Customer Action, Frontstage, and Backstage lanes. Added card reordering, insertion between cards, vertical connector from decision cards with auto-spacing, connector edit modal improvements |