"use client";

import React from "react";
import { AppIcon } from "./Icon";

type CheckItem = {
  id: string;
  title: string;
  done: boolean;
  why: string;
};

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function pct(done: number, total: number) {
  if (total === 0) return 0;
  return Math.round((done / total) * 100);
}

function getJourneyMapChecks(jm: unknown): { checks: CheckItem[]; percent: number } {
  const obj = asRecord(jm);
  const phases = asArray(obj.phases);
  const actions = phases.flatMap((p) => asArray(asRecord(p).actions));

  const checks: CheckItem[] = [
    {
      id: "has_phases",
      title: "At least 1 phase",
      done: phases.length > 0,
      why: "Phases make the journey scannable and help stakeholders align on the big moments.",
    },
    {
      id: "has_actions",
      title: "At least 1 action per phase",
      done: phases.length > 0 && phases.every((p) => asArray(asRecord(p).actions).length > 0),
      why: "Actions are the building blocks used for pain points, opportunities, and evidence later.",
    },
    {
      id: "descriptions",
      title: "Descriptions filled",
      done:
        actions.length > 0 &&
        actions.every((a) => String(asRecord(a).description ?? "").trim().length > 0),
      why: "Descriptions reduce ambiguity and keep the map consistent across contributors.",
    },
    {
      id: "channel_touchpoint",
      title: "Channel + touchpoint captured",
      done:
        actions.length > 0 &&
        actions.every((a) => {
          const r = asRecord(a);
          return (
            String(r.channel ?? "").trim().length > 0 &&
            String(r.touchpoint ?? "").trim().length > 0
          );
        }),
      why: "Channels and touchpoints help identify where to improve experiences and where handoffs occur.",
    },
    {
      id: "emotion",
      title: "Emotion captured",
      done: actions.length > 0 && actions.every((a) => asRecord(a).emotion != null),
      why: "Emotion helps prioritize the moments that matter and identify pain spikes and delight.",
    },
    {
      id: "pain_opps",
      title: "Pain points + opportunities captured",
      done:
        actions.length > 0 &&
        actions.every((a) => {
          const r = asRecord(a);
          return (
            String(r.painPoints ?? "").trim().length > 0 &&
            String(r.opportunities ?? "").trim().length > 0
          );
        }),
      why: "Pain points and opportunities make the map actionable and easier to convert into next steps.",
    },
  ];

  const doneCount = checks.filter((c) => c.done).length;
  return { checks, percent: pct(doneCount, checks.length) };
}

function getBlueprintChecks(bp: unknown): { checks: CheckItem[]; percent: number } {
  const obj = asRecord(bp);
  const phases = asArray(obj.phases);
  const cols = phases.flatMap((p) => asArray(asRecord(p).columns));
  const basicCards = cols.flatMap((c) => asArray(asRecord(c).basicCards));
  const teamCards = cols.flatMap((c) =>
    asArray(asRecord(c).teamSections).flatMap((s) => asArray(asRecord(s).cards))
  );

  const checks: CheckItem[] = [
    {
      id: "has_phases",
      title: "At least 1 phase",
      done: phases.length > 0,
      why: "Phases group steps into meaningful stages and reduce cognitive load in workshops.",
    },
    {
      id: "has_columns",
      title: "At least 1 step column per phase",
      done: phases.length > 0 && phases.every((p) => asArray(asRecord(p).columns).length > 0),
      why: "Columns represent the sequence of the service. Without them, lanes can’t be interpreted consistently.",
    },
    {
      id: "customer_lane",
      title: "Customer Action lane populated",
      done: basicCards.some((c) => asRecord(c).laneType === "CUSTOMER_ACTION"),
      why: "A blueprint should anchor on what the customer does before mapping internal work.",
    },
    {
      id: "front_back",
      title: "Frontstage or Backstage lanes populated",
      done: teamCards.length > 0,
      why: "Frontstage/backstage clarifies ownership, handoffs, and where work actually happens.",
    },
    {
      id: "support_process",
      title: "Support Process lane populated",
      done: basicCards.some((c) => asRecord(c).laneType === "SUPPORT_PROCESS"),
      why: "Support processes capture rules, policies, and systems that shape the service but aren’t visible to customers.",
    },
  ];

  const doneCount = checks.filter((c) => c.done).length;
  return { checks, percent: pct(doneCount, checks.length) };
}

export function CompletenessModal({
  artifactType,
  data,
  onClose,
}: {
  artifactType: "journeyMap" | "blueprint";
  data: unknown;
  onClose: () => void;
}) {
  const { checks, percent } =
    artifactType === "journeyMap" ? getJourneyMapChecks(data) : getBlueprintChecks(data);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3">
          <div className="flex items-center gap-2">
            <AppIcon name="check_circle" size="sm" className="text-[var(--accent-primary)]" />
            <h2 className="font-medium text-[var(--text-primary)]">Completeness</h2>
            <span className="rounded-full bg-[var(--bg-sidebar)] px-2 py-0.5 text-xs text-[var(--text-muted)]">
              {percent}% ready
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
            title="Close"
          >
            <AppIcon name="close" size="sm" />
          </button>
        </div>

        <div className="space-y-3 p-4">
          <p className="text-sm text-[var(--text-muted)]">
            This checklist helps you reach a “minimum viable” artifact that’s easy to discuss with stakeholders.
          </p>

          <div className="space-y-2">
            {checks.map((c) => (
              <div
                key={c.id}
                className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full ${
                          c.done ? "bg-green-100 text-green-700" : "bg-[var(--bg-sidebar)] text-[var(--text-muted)]"
                        }`}
                      >
                        <AppIcon name={c.done ? "check" : "remove"} size="xs" />
                      </span>
                      <div className="font-medium text-[var(--text-primary)]">{c.title}</div>
                    </div>
                    <div className="mt-1 text-sm text-[var(--text-muted)]">{c.why}</div>
                  </div>
                  <div className="shrink-0 text-xs text-[var(--text-muted)]">
                    {c.done ? "Done" : "Missing"}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="rounded-md border border-[var(--border-subtle)] px-3 py-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)]"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

