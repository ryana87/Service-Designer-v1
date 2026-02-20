"use client";

import React, { useState } from "react";
import { AppIcon } from "../../components/Icon";
import { getTraceabilityMatrix } from "./actions";

type Item = { id: string; name: string };

export function TraceabilityExportModal({
  projectId,
  journeyMaps,
  blueprints,
  onClose,
}: {
  projectId: string;
  journeyMaps: Item[];
  blueprints: Item[];
  onClose: () => void;
}) {
  const [journeyId, setJourneyId] = useState(journeyMaps[0]?.id ?? "");
  const [blueprintId, setBlueprintId] = useState(blueprints[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    if (!journeyId || !blueprintId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getTraceabilityMatrix(projectId, journeyId, blueprintId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const blob = new Blob([result.csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "traceability-matrix.csv";
      a.click();
      URL.revokeObjectURL(url);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Export traceability matrix"
    >
      <div
        className="w-full max-w-md rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-4 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-medium text-[var(--text-primary)]" style={{ fontSize: "var(--font-size-action)" }}>
          Export Traceability Matrix
        </h2>
        <p className="mt-1 text-[var(--text-muted)]" style={{ fontSize: "var(--font-size-meta)" }}>
          Journey Step → Blueprint Step → Team → System → Outcome
        </p>
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-[var(--text-muted)]" style={{ fontSize: "var(--font-size-meta)" }}>Journey map</span>
            <select
              value={journeyId}
              onChange={(e) => setJourneyId(e.target.value)}
              className="mt-1 w-full rounded border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] px-3 py-2 text-[var(--text-primary)]"
            >
              {journeyMaps.map((jm) => (
                <option key={jm.id} value={jm.id}>{jm.name}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[var(--text-muted)]" style={{ fontSize: "var(--font-size-meta)" }}>Blueprint</span>
            <select
              value={blueprintId}
              onChange={(e) => setBlueprintId(e.target.value)}
              className="mt-1 w-full rounded border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] px-3 py-2 text-[var(--text-primary)]"
            >
              {blueprints.map((bp) => (
                <option key={bp.id} value={bp.id}>{bp.name}</option>
              ))}
            </select>
          </label>
        </div>
        {error && (
          <p className="mt-2 text-red-600" style={{ fontSize: "var(--font-size-meta)" }}>{error}</p>
        )}
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
            onClick={handleDownload}
            disabled={loading || !journeyId || !blueprintId}
            className="flex items-center gap-2 rounded bg-[var(--accent-primary)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--accent-primary-hover)] disabled:opacity-50"
          >
            <AppIcon name="download" size="xs" />
            {loading ? "Exporting…" : "Download CSV"}
          </button>
        </div>
      </div>
    </div>
  );
}
