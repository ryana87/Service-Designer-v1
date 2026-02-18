"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AppIcon } from "../../../components/Icon";
import type { ArtifactType, BlueprintDraftSpec, JourneyMapDraftSpec } from "../../../onboarding/types";
import { createJourneyMapFromSpec } from "../actions";
import { createBlueprintFromSpec } from "../blueprints/actions";

type Sticky = {
  id: string;
  text: string;
  votes: number;
  category: "step" | "pain" | "opportunity";
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

const PROMPTS: Array<{ id: string; title: string; seconds: number; category: Sticky["category"]; help: string }> = [
  { id: "steps", title: "Capture steps / moments", seconds: 180, category: "step", help: "One sticky per step or moment, in plain language." },
  { id: "pain", title: "Capture pain points", seconds: 120, category: "pain", help: "What hurts or slows things down? Where do errors happen?" },
  { id: "opp", title: "Capture opportunities", seconds: 120, category: "opportunity", help: "Where could we improve? Automate? Remove friction?" },
];

function buildDraftFromWorkshop(type: ArtifactType, name: string, personaName: string | null, stickies: Sticky[]) {
  const steps = stickies.filter((s) => s.category === "step").sort((a, b) => b.votes - a.votes);
  const pains = stickies.filter((s) => s.category === "pain").sort((a, b) => b.votes - a.votes);
  const opps = stickies.filter((s) => s.category === "opportunity").sort((a, b) => b.votes - a.votes);

  const stepTitles = steps.map((s) => s.text).slice(0, 12);
  const painText = pains.map((p) => p.text).slice(0, 8).join("\n") || null;
  const oppText = opps.map((o) => o.text).slice(0, 8).join("\n") || null;

  if (type === "journeyMap") {
    const phaseTitles = ["Start", "In progress", "Finish"];
    const chunk = Math.max(1, Math.ceil((stepTitles.length || 3) / phaseTitles.length));
    const fallback = ["Start", "Do the thing", "Confirm"];
    const all = (stepTitles.length ? stepTitles : fallback).slice(0, 18);
    const draft: JourneyMapDraftSpec = {
      name: name.trim() || "Workshop Journey Map",
      personaName,
      phases: phaseTitles.map((pt, idx) => ({
        title: pt,
        timeframe: null,
        actions: all.slice(idx * chunk, (idx + 1) * chunk).map((t) => ({
          title: t,
          painPoints: painText,
          opportunities: oppText,
        })),
      })),
    };
    return draft;
  }

  const phaseTitles = ["Intake", "Work", "Resolution"];
  const chunk = Math.max(1, Math.ceil((stepTitles.length || 3) / phaseTitles.length));
  const fallback = ["Submit", "Assess", "Resolve"];
  const all = (stepTitles.length ? stepTitles : fallback).slice(0, 12);
  const draft: BlueprintDraftSpec = {
    name: name.trim() || "Workshop Blueprint",
    teams: [{ name: "Team" }],
    phases: phaseTitles.map((pt, idx) => ({
      title: pt,
      timeframe: null,
      steps: all.slice(idx * chunk, (idx + 1) * chunk).map((label) => ({
        label,
        lanes: {
          PHYSICAL_EVIDENCE: [{ title: label }],
          CUSTOMER_ACTION: [{ title: label }],
          FRONTSTAGE_ACTION: [{ title: "Frontstage action" }],
          BACKSTAGE_ACTION: [{ title: "Backstage action" }],
          SUPPORT_PROCESS: [
            ...(painText ? painText.split("\n").filter(Boolean).map((t) => ({ title: t })) : []),
            ...(oppText ? oppText.split("\n").filter(Boolean).map((t) => ({ title: t })) : []),
          ],
        },
      })),
    })),
  };
  return draft;
}

export function FacilitationFlow({
  projectId,
  initialType,
}: {
  projectId: string;
  initialType: ArtifactType;
}) {
  const [type, setType] = useState<ArtifactType>(initialType);
  const [workshopName, setWorkshopName] = useState("");
  const [personaName, setPersonaName] = useState("");
  const [promptIdx, setPromptIdx] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(PROMPTS[0].seconds);
  const [running, setRunning] = useState(false);
  const [stickies, setStickies] = useState<Sticky[]>([]);
  const [newSticky, setNewSticky] = useState("");
  const [mode, setMode] = useState<"capture" | "vote" | "generate">("capture");
  const [isCreating, setIsCreating] = useState(false);

  const currentPrompt = PROMPTS[promptIdx];

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) return 0;
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [running]);

  useEffect(() => {
    if (!running) return;
    if (secondsLeft !== 0) return;
    setRunning(false);
  }, [secondsLeft, running]);

  const addSticky = () => {
    const text = newSticky.trim();
    if (!text) return;
    setStickies((prev) => [
      { id: uid(), text, votes: 0, category: currentPrompt.category },
      ...prev,
    ]);
    setNewSticky("");
  };

  const grouped = useMemo(() => {
    const by: Record<Sticky["category"], Sticky[]> = { step: [], pain: [], opportunity: [] };
    for (const s of stickies) by[s.category].push(s);
    for (const k of Object.keys(by) as Sticky["category"][]) by[k].sort((a, b) => b.votes - a.votes);
    return by;
  }, [stickies]);

  const createArtifact = async () => {
    setIsCreating(true);
    try {
      const draft = buildDraftFromWorkshop(type, workshopName, personaName.trim() || null, stickies);
      if (type === "journeyMap") {
        const created = await createJourneyMapFromSpec(projectId, draft as JourneyMapDraftSpec);
        if (created?.id) window.location.href = `/projects/${projectId}/journey-maps/${created.id}`;
      } else {
        const created = await createBlueprintFromSpec(projectId, draft as BlueprintDraftSpec);
        if (created?.id) window.location.href = `/projects/${projectId}/blueprints/${created.id}`;
      }
    } finally {
      setIsCreating(false);
    }
  };

  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-panel)] px-4">
        <div className="flex items-center gap-2">
          <AppIcon name="play" size="sm" className="text-[var(--accent-primary)]" />
          <h1 className="font-medium text-[var(--text-primary)]" style={{ fontSize: "var(--font-size-action)" }}>
            Facilitation mode
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as ArtifactType)}
            className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] px-2 py-1 text-[var(--text-primary)] outline-none"
            style={{ fontSize: "var(--font-size-cell)" }}
          >
            <option value="journeyMap">Journey Map</option>
            <option value="blueprint">Service Blueprint</option>
          </select>
          <button
            onClick={() => setMode("vote")}
            className="rounded-md border border-[var(--border-subtle)] px-3 py-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)]"
            style={{ fontSize: "var(--font-size-cell)" }}
          >
            Vote
          </button>
          <button
            onClick={() => setMode("generate")}
            className="rounded-md bg-[var(--accent-primary)] px-3 py-1.5 font-medium text-white transition-colors hover:bg-[var(--accent-primary-hover)]"
            style={{ fontSize: "var(--font-size-cell)" }}
          >
            Generate artifact
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 gap-4 p-4">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Workshop label</label>
              <input
                value={workshopName}
                onChange={(e) => setWorkshopName(e.target.value)}
                className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] px-3 py-2 text-[var(--text-primary)] outline-none"
              />
            </div>
            {type === "journeyMap" && (
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Persona label (optional)</label>
                <input
                  value={personaName}
                  onChange={(e) => setPersonaName(e.target.value)}
                  className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] px-3 py-2 text-[var(--text-primary)] outline-none"
                />
              </div>
            )}
          </div>

          {mode === "capture" && (
            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium text-[var(--text-primary)]">{currentPrompt.title}</div>
                  <div className="text-sm text-[var(--text-muted)]">{currentPrompt.help}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-medium text-[var(--text-muted)]">Timer</div>
                  <div className="font-mono text-lg text-[var(--text-primary)]">{mmss(secondsLeft)}</div>
                  <button
                    onClick={() => setRunning((r) => !r)}
                    className="mt-1 rounded-md border border-[var(--border-subtle)] px-2 py-1 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)]"
                    style={{ fontSize: "var(--font-size-meta)" }}
                  >
                    {running ? "Pause" : "Start"}
                  </button>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <input
                  value={newSticky}
                  onChange={(e) => setNewSticky(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addSticky();
                  }}
                  placeholder="Add a sticky…"
                  className="flex-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] px-3 py-2 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                />
                <button
                  onClick={addSticky}
                  disabled={!newSticky.trim()}
                  className="rounded-md bg-[var(--accent-primary)] px-3 py-2 font-medium text-white transition-colors hover:bg-[var(--accent-primary-hover)] disabled:opacity-60"
                >
                  Add
                </button>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div className="text-xs text-[var(--text-muted)]">
                  Prompt {promptIdx + 1} of {PROMPTS.length}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const next = Math.max(0, promptIdx - 1);
                      setPromptIdx(next);
                      setSecondsLeft(PROMPTS[next].seconds);
                      setRunning(false);
                    }}
                    className="rounded-md border border-[var(--border-subtle)] px-3 py-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)]"
                    style={{ fontSize: "var(--font-size-cell)" }}
                  >
                    Back
                  </button>
                  <button
                    onClick={() => {
                      const next = Math.min(PROMPTS.length - 1, promptIdx + 1);
                      setPromptIdx(next);
                      setSecondsLeft(PROMPTS[next].seconds);
                      setRunning(false);
                    }}
                    className="rounded-md bg-[var(--accent-primary)] px-3 py-1.5 font-medium text-white transition-colors hover:bg-[var(--accent-primary-hover)]"
                    style={{ fontSize: "var(--font-size-cell)" }}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}

          {mode === "vote" && (
            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-4">
              <div className="font-medium text-[var(--text-primary)]">Dot voting</div>
              <div className="text-sm text-[var(--text-muted)]">
                Click a sticky to add votes. Use this to prioritize what matters most.
              </div>
            </div>
          )}

          {mode === "generate" && (
            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-4">
              <div className="font-medium text-[var(--text-primary)]">Generate an artifact</div>
              <div className="text-sm text-[var(--text-muted)]">
                We’ll use the top-voted steps/pains/opportunities to draft a {type === "journeyMap" ? "Journey Map" : "Service Blueprint"}.
              </div>
              <button
                onClick={createArtifact}
                disabled={isCreating}
                className="mt-3 w-full rounded-md bg-[var(--accent-primary)] px-4 py-2 font-medium text-white transition-colors hover:bg-[var(--accent-primary-hover)] disabled:opacity-60"
              >
                {isCreating ? "Creating…" : "Create draft artifact"}
              </button>
            </div>
          )}
        </div>

        <div className="w-[420px] shrink-0 space-y-3">
          {(["step", "pain", "opportunity"] as const).map((cat) => (
            <div key={cat} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-medium text-[var(--text-primary)]">
                  {cat === "step" ? "Steps" : cat === "pain" ? "Pain points" : "Opportunities"}
                </div>
                <div className="text-xs text-[var(--text-muted)]">{grouped[cat].length}</div>
              </div>
              <div className="space-y-2">
                {grouped[cat].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      if (mode !== "vote") return;
                      setStickies((prev) => prev.map((p) => (p.id === s.id ? { ...p, votes: p.votes + 1 } : p)));
                    }}
                    className={`w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] px-3 py-2 text-left transition-colors ${
                      mode === "vote" ? "hover:bg-[var(--bg-hover)]" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-sm text-[var(--text-primary)]">{s.text}</div>
                      <div className="shrink-0 rounded-full bg-[var(--bg-panel)] px-2 py-0.5 text-xs text-[var(--text-muted)]">
                        {s.votes}
                      </div>
                    </div>
                  </button>
                ))}
                {grouped[cat].length === 0 && (
                  <div className="text-sm text-[var(--text-muted)]">No items yet.</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

