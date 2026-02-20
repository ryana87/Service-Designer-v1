"use client";

import React, { useState } from "react";
import { AppIcon } from "../../../components/Icon";
import { generateWhatChangedSummary, type WhatChangedResult } from "./actions";

export function WhatChangedButtonAndModal({
  projectId,
  leftId,
  rightId,
  type,
  leftLabel,
  rightLabel,
}: {
  projectId: string;
  leftId: string;
  rightId: string;
  type: "journeyMap" | "blueprint";
  leftLabel: string;
  rightLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WhatChangedResult | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setResult(null);
    setOpen(true);
    try {
      const res = await generateWhatChangedSummary(
        projectId,
        leftId,
        rightId,
        type,
        leftLabel,
        rightLabel
      );
      setResult(res);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (result?.ok) {
      void navigator.clipboard.writeText(result.markdown);
    }
  };

  const handleDownload = () => {
    if (!result?.ok) return;
    const blob = new Blob([result.markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `what-changed-${result.beforeName.replace(/\s+/g, "-")}-vs-${result.afterName.replace(/\s+/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleGenerate}
        disabled={loading}
        className="flex items-center gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] px-3 py-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-50"
      >
        <AppIcon name="article" size="xs" />
        {loading ? "Generating…" : "What changed?"}
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => !loading && setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="What changed summary"
        >
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-header)] px-4 py-3">
              <h2 className="font-medium text-[var(--text-primary)]" style={{ fontSize: "var(--font-size-action)" }}>
                What changed
              </h2>
              <button
                type="button"
                onClick={() => !loading && setOpen(false)}
                className="rounded p-1 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
                aria-label="Close"
              >
                <AppIcon name="close" size="sm" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-4">
              {loading && (
                <p className="text-[var(--text-muted)]" style={{ fontSize: "var(--font-size-meta)" }}>
                  Generating summary…
                </p>
              )}
              {!loading && result?.ok && (
                <div className="space-y-4">
                  <div>
                    <h3 className="mb-1 font-medium text-[var(--text-secondary)]" style={{ fontSize: "var(--font-size-meta)" }}>
                      Operational delta
                    </h3>
                    <p className="text-[var(--text-primary)]" style={{ fontSize: "var(--font-size-cell)" }}>
                      {result.narrative.operationalDelta}
                    </p>
                  </div>
                  <div>
                    <h3 className="mb-1 font-medium text-[var(--text-secondary)]" style={{ fontSize: "var(--font-size-meta)" }}>
                      Experience delta
                    </h3>
                    <p className="text-[var(--text-primary)]" style={{ fontSize: "var(--font-size-cell)" }}>
                      {result.narrative.experienceDelta}
                    </p>
                  </div>
                  <div>
                    <h3 className="mb-1 font-medium text-[var(--text-secondary)]" style={{ fontSize: "var(--font-size-meta)" }}>
                      Automation delta
                    </h3>
                    <p className="text-[var(--text-primary)]" style={{ fontSize: "var(--font-size-cell)" }}>
                      {result.narrative.automationDelta}
                    </p>
                  </div>
                  <div>
                    <h3 className="mb-1 font-medium text-[var(--text-secondary)]" style={{ fontSize: "var(--font-size-meta)" }}>
                      Risk delta
                    </h3>
                    <p className="text-[var(--text-primary)]" style={{ fontSize: "var(--font-size-cell)" }}>
                      {result.narrative.riskDelta}
                    </p>
                  </div>
                  {result.narrative.bullets.length > 0 && (
                    <div>
                      <h3 className="mb-1 font-medium text-[var(--text-secondary)]" style={{ fontSize: "var(--font-size-meta)" }}>
                        Summary
                      </h3>
                      <ul className="list-inside list-disc space-y-0.5 text-[var(--text-primary)]" style={{ fontSize: "var(--font-size-cell)" }}>
                        {result.narrative.bullets.map((b, i) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              {!loading && result && !result.ok && (
                <p className="text-red-600" style={{ fontSize: "var(--font-size-cell)" }}>
                  {result.error}
                </p>
              )}
            </div>
            {!loading && result?.ok && (
              <div className="flex items-center gap-2 border-t border-[var(--border-subtle)] bg-[var(--bg-sidebar)] px-4 py-3">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                >
                  <AppIcon name="duplicate" size="xs" />
                  Copy
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex items-center gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                >
                  <AppIcon name="download" size="xs" />
                  Download .md
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
