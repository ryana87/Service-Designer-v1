"use client";

import React, { useState, useEffect } from "react";
import { AppIcon } from "../../components/Icon";
import { getProjectPatterns } from "./actions";
import type { ProjectPatternsResult } from "../../lib/pattern-recognition";

export function PatternsModal({
  projectId,
  onClose,
}: {
  projectId: string;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ProjectPatternsResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getProjectPatterns(projectId).then((result) => {
      if (!cancelled) {
        setData(result);
        setLoading(false);
      }
    }).catch((e) => {
      if (!cancelled) {
        setError(e instanceof Error ? e.message : "Failed to load patterns");
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [projectId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Pattern recognition"
    >
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] shadow-lg flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-header)] px-4 py-3">
          <h2 className="font-medium text-[var(--text-primary)]" style={{ fontSize: "var(--font-size-action)" }}>
            Pattern recognition
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
            aria-label="Close"
          >
            <AppIcon name="close" size="sm" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {loading && (
            <p className="text-[var(--text-muted)]" style={{ fontSize: "var(--font-size-meta)" }}>Loading…</p>
          )}
          {error && (
            <p className="text-red-600" style={{ fontSize: "var(--font-size-cell)" }}>{error}</p>
          )}
          {!loading && data && (
            <div className="space-y-6">
              {data.recurringPainPoints.length > 0 && (
                <section>
                  <h3 className="font-medium text-[var(--text-secondary)]" style={{ fontSize: "var(--font-size-meta)" }}>
                    Recurring pain points
                  </h3>
                  <ul className="mt-2 space-y-2">
                    {data.recurringPainPoints.map((p, i) => (
                      <li key={i} className="rounded border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] px-3 py-2" style={{ fontSize: "var(--font-size-cell)" }}>
                        <span className="text-[var(--text-primary)]">{p.displayText}</span>
                        <span className="ml-2 text-[var(--text-muted)]">× {p.count}</span>
                        {p.sourceLabels.length > 0 && (
                          <p className="mt-1 text-[var(--text-muted)]" style={{ fontSize: "var(--font-size-meta)" }}>
                            In: {p.sourceLabels.join(", ")}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {data.manualTriagePatternCount > 0 && (
                <section>
                  <h3 className="font-medium text-[var(--text-secondary)]" style={{ fontSize: "var(--font-size-meta)" }}>
                    Manual triage pattern
                  </h3>
                  <p className="mt-1 text-[var(--text-primary)]" style={{ fontSize: "var(--font-size-cell)" }}>
                    This pattern appears in {data.manualTriagePatternCount} item(s): {data.manualTriageSources.join(", ")}
                  </p>
                </section>
              )}
              {data.blueprintSignatures.length > 0 && (
                <section>
                  <h3 className="font-medium text-[var(--text-secondary)]" style={{ fontSize: "var(--font-size-meta)" }}>
                    Repeating blueprint structures
                  </h3>
                  <ul className="mt-2 space-y-2">
                    {data.blueprintSignatures.map((sig, i) => (
                      <li key={i} className="rounded border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] px-3 py-2" style={{ fontSize: "var(--font-size-cell)" }}>
                        <span className="text-[var(--text-primary)]">
                          {sig.phaseCount} phases, {sig.decisionCount} decisions, {sig.handoffDensity} handoff density
                        </span>
                        <span className="ml-2 text-[var(--text-muted)]">× {sig.count}</span>
                        <p className="mt-1 text-[var(--text-muted)]" style={{ fontSize: "var(--font-size-meta)" }}>
                          {sig.blueprintNames.join(", ")}
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {data.recurringPainPoints.length === 0 && data.manualTriagePatternCount === 0 && data.blueprintSignatures.length === 0 && (
                <p className="text-[var(--text-muted)]" style={{ fontSize: "var(--font-size-cell)" }}>
                  No recurring patterns detected yet. Add more journey maps and blueprints to spot patterns.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
