// ============================================
// TRACEABILITY MATRIX
// Journey Step → Blueprint Step → Team → System → Outcome
// Aligns by phase order (journey phase i ↔ blueprint phase i) and step index.
// ============================================

export type TraceabilityRow = {
  journeyPhase: string;
  journeyAction: string;
  blueprintPhase: string;
  blueprintStep: string;
  teams: string;
  systems: string;
  outcome: string;
};

export type JourneyForTrace = {
  phases: { title: string; actions: { title: string }[] }[];
};

export type BlueprintForTrace = {
  phases: {
    title: string;
    columns: {
      basicCards: { title: string; laneType: string }[];
      teamSections: { team: { name: string }; cards: { title: string; softwareIds?: string | null }[] }[];
      decisionCards: { title: string }[];
    }[];
  }[];
  softwareServices?: { id: string; label: string }[];
};

function resolveSoftwareLabels(
  softwareIdsJson: string | null,
  softwareServices: { id: string; label: string }[]
): string[] {
  if (!softwareIdsJson || !softwareServices.length) return [];
  try {
    const ids = JSON.parse(softwareIdsJson) as string[];
    if (!Array.isArray(ids)) return [];
    return ids
      .map((id) => softwareServices.find((s) => s.id === id)?.label)
      .filter((l): l is string => !!l);
  } catch {
    return [];
  }
}

/**
 * Build traceability matrix by aligning journey phases/actions with blueprint phases/columns by index.
 */
export function buildTraceabilityMatrix(
  journey: JourneyForTrace,
  blueprint: BlueprintForTrace
): TraceabilityRow[] {
  const softwareServices = blueprint.softwareServices ?? [];
  const rows: TraceabilityRow[] = [];

  for (let phaseIdx = 0; phaseIdx < journey.phases.length; phaseIdx++) {
    const jPhase = journey.phases[phaseIdx];
    const bPhase = blueprint.phases[phaseIdx];
    const bPhaseTitle = bPhase?.title ?? "—";
    const maxSteps = Math.max(
      jPhase.actions.length,
      bPhase?.columns.length ?? 0,
      1
    );

    for (let stepIdx = 0; stepIdx < maxSteps; stepIdx++) {
      const jAction = jPhase.actions[stepIdx];
      const bColumn = bPhase?.columns[stepIdx];
      const journeyActionTitle = jAction?.title ?? "—";
      let blueprintStepTitle = "—";
      let teams: string[] = [];
      let systems: string[] = [];
      let outcome = "—";

      if (bColumn) {
        const cardTitles: string[] = [];
        bColumn.basicCards.forEach((c) => cardTitles.push(c.title));
        bColumn.decisionCards.forEach((c) => cardTitles.push(c.title));
        bColumn.teamSections.forEach((ts) => {
          teams.push(ts.team.name);
          ts.cards.forEach((card) => {
            cardTitles.push(card.title);
            systems.push(...resolveSoftwareLabels(card.softwareIds ?? null, softwareServices));
          });
        });
        blueprintStepTitle = cardTitles.length ? cardTitles.join("; ") : "—";
        outcome = cardTitles.length ? cardTitles[cardTitles.length - 1] : "—";
      }

      rows.push({
        journeyPhase: jPhase.title,
        journeyAction: journeyActionTitle,
        blueprintPhase: bPhaseTitle,
        blueprintStep: blueprintStepTitle,
        teams: [...new Set(teams)].join("; ") || "—",
        systems: [...new Set(systems)].join("; ") || "—",
        outcome,
      });
    }
  }

  return rows;
}

/** Serialize matrix to CSV string. */
export function traceabilityToCsv(rows: TraceabilityRow[]): string {
  const header = "Journey Phase,Journey Action,Blueprint Phase,Blueprint Step,Teams,Systems,Outcome";
  const escape = (s: string) => {
    const t = s.replace(/"/g, '""');
    return t.includes(",") || t.includes('"') || t.includes("\n") ? `"${t}"` : t;
  };
  const body = rows.map((r) =>
    [r.journeyPhase, r.journeyAction, r.blueprintPhase, r.blueprintStep, r.teams, r.systems, r.outcome].map(escape).join(",")
  ).join("\n");
  return header + "\n" + body;
}
