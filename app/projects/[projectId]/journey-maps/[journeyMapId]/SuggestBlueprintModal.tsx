"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AppIcon } from "../../../../components/Icon";
import { deriveBlueprintFromJourney } from "../../../../lib/journey-to-blueprint-derive";
import { createBlueprintFromSpec } from "../../blueprints/actions";
import type { JourneyMapData } from "../../../../lib/validation";

export function SuggestBlueprintModal({
  projectId,
  journeyData,
  onClose,
}: {
  projectId: string;
  journeyData: JourneyMapData;
  onClose: () => void;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const spec = React.useMemo(() => deriveBlueprintFromJourney(journeyData), [journeyData]);
  const stepCount = spec.phases.reduce((s, p) => s + p.steps.length, 0);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const blueprint = await createBlueprintFromSpec(projectId, spec);
      if (blueprint?.id) {
        onClose();
        router.push(`/projects/${projectId}/blueprints/${blueprint.id}`);
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Suggest blueprint"
    >
      <div
        className="w-full max-w-md rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-4 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-medium text-[var(--text-primary)]" style={{ fontSize: "var(--font-size-action)" }}>
          Suggested Blueprint
        </h2>
        <p className="mt-2 text-[var(--text-muted)]" style={{ fontSize: "var(--font-size-meta)" }}>
          Derived from this journey map: <strong className="text-[var(--text-secondary)]">{spec.name}</strong>
        </p>
        <ul className="mt-2 list-inside list-disc text-[var(--text-muted)]" style={{ fontSize: "var(--font-size-meta)" }}>
          <li>{spec.phases.length} phase(s)</li>
          <li>{stepCount} step(s)</li>
          <li>Teams: {spec.teams?.map((t) => t.name).join(", ") ?? "—"}</li>
        </ul>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center gap-2 rounded bg-[var(--accent-primary)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--accent-primary-hover)] disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create blueprint"}
            <AppIcon name="arrow_forward" size="xs" />
          </button>
        </div>
      </div>
    </div>
  );
}
