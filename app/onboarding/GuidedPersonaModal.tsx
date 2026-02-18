"use client";

import React, { useMemo, useState } from "react";
import { AppIcon } from "../components/Icon";
import { createPersona } from "../projects/[projectId]/actions";
import { DEMO_PERSONA_PREFILL } from "../demo/demoChatData";

type StepKey = "name" | "role" | "context" | "goals" | "needs" | "painPoints";

const STEPS: { key: StepKey; title: string; prompt: string; multiLine?: boolean }[] = [
  { key: "name", title: "Name", prompt: "What’s the persona name or label?" },
  { key: "role", title: "Role", prompt: "What’s their role / archetype?" },
  { key: "context", title: "Context", prompt: "What context are they operating in?", multiLine: true },
  { key: "goals", title: "Goals", prompt: "What are their goals?", multiLine: true },
  { key: "needs", title: "Needs", prompt: "What do they need to succeed?", multiLine: true },
  { key: "painPoints", title: "Pain points", prompt: "What frustrates them most?", multiLine: true },
];

function computeWatchOuts(painPoints: string, context: string, goals: string) {
  const text = `${painPoints}\n${context}\n${goals}`.toLowerCase();
  const outs: string[] = [];
  if (text.includes("wait") || text.includes("delay")) outs.push("Watch for long waits and uncertainty.");
  if (text.includes("handoff") || text.includes("transfer")) outs.push("Watch for handoffs and ownership gaps.");
  if (text.includes("repeat") || text.includes("again")) outs.push("Watch for repeated data entry or repeated explanations.");
  if (text.includes("confus") || text.includes("unclear")) outs.push("Watch for unclear instructions and ambiguous language.");
  if (text.includes("trust") || text.includes("safe")) outs.push("Watch for trust, risk, and reassurance moments.");
  if (outs.length === 0) outs.push("Watch for friction points, rework, and moments of confusion.");
  return outs;
}

export function GuidedPersonaModal({
  projectId,
  isDemo = false,
  onClose,
  onCreated,
}: {
  projectId: string;
  isDemo?: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const [values, setValues] = useState<Record<StepKey, string>>({
    name: "",
    role: "",
    context: "",
    goals: "",
    needs: "",
    painPoints: "",
  });
  const [hasFocused, setHasFocused] = useState<Record<StepKey, boolean>>({
    name: false,
    role: false,
    context: false,
    goals: false,
    needs: false,
    painPoints: false,
  });

  const handleFocus = (key: StepKey) => {
    if (!isDemo || hasFocused[key]) return;
    const prefill = DEMO_PERSONA_PREFILL[key] ?? "";
    if (prefill) {
      setValues((v) => ({ ...v, [key]: prefill }));
      setHasFocused((h) => ({ ...h, [key]: true }));
    }
  };
  const [isSaving, setIsSaving] = useState(false);

  const step = STEPS[idx];
  const watchOuts = useMemo(
    () => computeWatchOuts(values.painPoints, values.context, values.goals),
    [values.painPoints, values.context, values.goals]
  );

  const canNext = values[step.key].trim().length > 0 || step.key !== "name";

  const save = async () => {
    setIsSaving(true);
    try {
      const notes = `Watch-outs:\n- ${watchOuts.join("\n- ")}`;
      await createPersona(projectId, {
        name: values.name.trim() || "Untitled Persona",
        role: values.role.trim() || null,
        context: values.context.trim() || null,
        goals: values.goals.trim() || null,
        needs: values.needs.trim() || null,
        painPoints: values.painPoints.trim() || null,
        notes,
      });
      onCreated();
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3">
          <div className="flex items-center gap-2">
            <AppIcon name="persona" size="sm" />
            <h2 className="font-medium text-[var(--text-primary)]">Guided persona builder</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
            title="Close"
          >
            <AppIcon name="close" size="sm" />
          </button>
        </div>

        <div className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-[var(--text-primary)]">
                Step {idx + 1} of {STEPS.length}: {step.title}
              </div>
              <div className="text-sm text-[var(--text-muted)]">{step.prompt}</div>
            </div>
          </div>

          {step.multiLine ? (
            <textarea
              value={values[step.key]}
              onChange={(e) => setValues({ ...values, [step.key]: e.target.value })}
              onFocus={() => handleFocus(step.key)}
              rows={5}
              className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] px-3 py-2 text-[var(--text-primary)] outline-none"
            />
          ) : (
            <input
              value={values[step.key]}
              onChange={(e) => setValues({ ...values, [step.key]: e.target.value })}
              onFocus={() => handleFocus(step.key)}
              className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] px-3 py-2 text-[var(--text-primary)] outline-none"
            />
          )}

          {idx === STEPS.length - 1 && (
            <div className="mt-4 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-3">
              <div className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                Suggested watch-outs
              </div>
              <ul className="mt-2 list-disc pl-5 text-sm text-[var(--text-secondary)]">
                {watchOuts.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-4 flex justify-between">
            <button
              onClick={() => setIdx((i) => Math.max(0, i - 1))}
              disabled={idx === 0}
              className="rounded-md border border-[var(--border-subtle)] px-3 py-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-50"
            >
              Back
            </button>

            {idx < STEPS.length - 1 ? (
              <button
                onClick={() => setIdx((i) => Math.min(STEPS.length - 1, i + 1))}
                disabled={!canNext}
                className="rounded-md bg-[var(--accent-primary)] px-3 py-2 font-medium text-white transition-colors hover:bg-[var(--accent-primary-hover)] disabled:opacity-60"
              >
                Next
              </button>
            ) : (
              <button
                onClick={save}
                disabled={isSaving || !values.name.trim()}
                className="rounded-md bg-[var(--accent-primary)] px-3 py-2 font-medium text-white transition-colors hover:bg-[var(--accent-primary-hover)] disabled:opacity-60"
              >
                {isSaving ? "Creating…" : "Create persona"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

