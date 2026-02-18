"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { AppIcon } from "../components/Icon";
import type { ArtifactType, BlueprintDraftSpec, JourneyMapDraftSpec } from "./types";
import {
  acceptUserMessage,
  getCurrentQuestionKey,
  initOnboarding,
  startFutureConstraints,
  type OnboardingState,
} from "./scriptedProvider";
import { DEMO_FUTURE_ANSWERS, DEMO_ONBOARDING_ANSWERS } from "../demo/demoChatData";
import { createJourneyMapFromSpec } from "../projects/[projectId]/actions";
import { createBlueprintFromSpec } from "../projects/[projectId]/blueprints/actions";

type Props = {
  projectId: string;
  artifactType: ArtifactType;
  isDemo?: boolean;
  onClose: () => void;
};

function DraftPreview({ artifactType, draft }: { artifactType: ArtifactType; draft: JourneyMapDraftSpec | BlueprintDraftSpec }) {
  if (artifactType === "journeyMap") {
    const jm = draft as JourneyMapDraftSpec;
    return (
      <div className="space-y-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Phases</div>
          <ul className="mt-1 space-y-2">
            {jm.phases.map((p, idx) => (
              <li key={`${p.title}-${idx}`} className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-2">
                <div className="font-medium text-[var(--text-primary)]">{p.title}</div>
                <div className="mt-1 text-sm text-[var(--text-muted)]">
                  {p.actions.slice(0, 6).map((a) => a.title).join(" • ")}
                  {p.actions.length > 6 ? " …" : ""}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  const bp = draft as BlueprintDraftSpec;
  const steps = bp.phases.flatMap((p) => p.steps.map((s) => s.label || "Step"));
  return (
    <div className="space-y-3">
      <div className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Phases & steps</div>
      <div className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-2 text-sm text-[var(--text-muted)]">
        {steps.slice(0, 18).join(" • ")}
        {steps.length > 18 ? " …" : ""}
      </div>
    </div>
  );
}

export function OnboardingWizardModal({ projectId, artifactType, isDemo = false, onClose }: Props) {
  const [state, setState] = useState<OnboardingState>(() => initOnboarding(artifactType));
  const [input, setInput] = useState("");
  const [hasPrefilledInput, setHasPrefilledInput] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const demoAnswerForCurrentQuestion =
    isDemo
      ? (() => {
          const key = getCurrentQuestionKey(state);
          if (!key) return null;
          if (state.stage === "future_constraints") return DEMO_FUTURE_ANSWERS[key] ?? null;
          return DEMO_ONBOARDING_ANSWERS[state.artifactType][key] ?? null;
        })()
      : null;

  const handleInputFocus = () => {
    if (!isDemo || hasPrefilledInput || !demoAnswerForCurrentQuestion) return;
    setInput(demoAnswerForCurrentQuestion);
    setHasPrefilledInput(true);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.messages.length]);

  // Reset prefill flag when advancing to next question so user can click-to-fill again
  useEffect(() => {
    setHasPrefilledInput(false);
  }, [state.stepIndex, state.stage]);

  const title = artifactType === "journeyMap" ? "Guided setup — Journey Map" : "Guided setup — Service Blueprint";

  const activeDraft = useMemo(() => {
    if (state.stage === "review_future" && state.futureDraft) return state.futureDraft;
    return state.currentDraft;
  }, [state.stage, state.currentDraft, state.futureDraft]);

  const canCreateCurrent = state.stage === "review_current" && !!state.currentDraft && !isCreating;
  const canStartFuture = state.stage === "review_current" && !!state.currentDraft && !state.futureDraft && !isCreating;
  const canCreateFuture = state.stage === "review_future" && !!state.futureDraft && !isCreating;

  const send = (text?: string) => {
    const raw = text ?? input;
    const content = typeof raw === "string" ? raw.trim() : "";
    if (!content) return;
    const next = acceptUserMessage(state, content);
    setState(next);
    setInput("");
  };

  const handlePromptClick = (text: string) => {
    send(text);
  };

  const handleCreate = async (which: "current" | "future") => {
    setIsCreating(true);
    try {
      if (artifactType === "journeyMap") {
        const spec = (which === "current" ? state.currentDraft : state.futureDraft) as JourneyMapDraftSpec;
        const created = await createJourneyMapFromSpec(projectId, spec);
        if (created?.id) {
          onClose();
          window.location.href = `/projects/${projectId}/journey-maps/${created.id}`;
        }
      } else {
        const spec = (which === "current" ? state.currentDraft : state.futureDraft) as BlueprintDraftSpec;
        const created = await createBlueprintFromSpec(projectId, spec);
        if (created?.id) {
          onClose();
          window.location.href = `/projects/${projectId}/blueprints/${created.id}`;
        }
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="flex h-[80vh] w-full max-w-4xl overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--border-subtle)] px-4">
            <div className="flex items-center gap-2">
              <AppIcon name="ai" size="sm" className="text-[var(--accent-primary)]" />
              <h2 className="font-medium text-[var(--text-primary)]">{title}</h2>
            </div>
            <button
              onClick={onClose}
              className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
              title="Close"
            >
              <AppIcon name="close" size="sm" />
            </button>
          </div>

          <div className="flex min-h-0 flex-1">
            {/* Chat */}
            <div className="flex min-w-0 flex-1 flex-col border-r border-[var(--border-subtle)]">
              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                <div className="space-y-3">
                  {state.messages.map((m) => (
                    <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[85%] rounded-lg px-3 py-2 ${
                          m.role === "user"
                            ? "bg-[var(--accent-primary)] text-white"
                            : "bg-[var(--bg-sidebar)] text-[var(--text-primary)]"
                        }`}
                        style={{ fontSize: "var(--font-size-cell)", lineHeight: 1.5 }}
                      >
                        <p style={{ whiteSpace: "pre-wrap" }}>{m.content}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </div>
              {isDemo && demoAnswerForCurrentQuestion && (state.stage === "describe" || state.stage === "future_constraints") && (
                <div className="shrink-0 border-t border-[var(--border-subtle)] p-3">
                  <p
                    className="mb-2 font-medium text-[var(--text-muted)]"
                    style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.05em" }}
                  >
                    Try asking:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handlePromptClick(demoAnswerForCurrentQuestion)}
                      className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-3 py-1.5 text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
                      style={{ fontSize: "var(--font-size-meta)" }}
                    >
                      {demoAnswerForCurrentQuestion.length > 60
                        ? demoAnswerForCurrentQuestion.slice(0, 60) + "…"
                        : demoAnswerForCurrentQuestion}
                    </button>
                  </div>
                </div>
              )}
              <div className="shrink-0 border-t border-[var(--border-subtle)] p-3">
                <div className="flex items-center gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] px-3 py-2">
                  <textarea
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      if (e.target.value) setHasPrefilledInput(true);
                    }}
                    onFocus={handleInputFocus}
                    placeholder={isDemo && demoAnswerForCurrentQuestion ? "Click to fill with demo answer…" : "Type your answer…"}
                    rows={2}
                    className="min-h-[42px] flex-1 resize-none bg-transparent text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                    style={{ fontSize: "var(--font-size-cell)" }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (input.trim()) send();
                      }
                    }}
                  />
                  <button
                    onClick={() => send()}
                    disabled={!input.trim()}
                    className={`transition-colors ${
                      input.trim()
                        ? "text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)]"
                        : "text-[var(--text-muted)]"
                    }`}
                    title="Send"
                  >
                    <AppIcon name="send" size="sm" />
                  </button>
                </div>
              </div>
            </div>

            {/* Preview & actions */}
            <div className="w-[360px] shrink-0 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-medium text-[var(--text-primary)]">Draft preview</div>
              </div>
              {activeDraft ? (
                <DraftPreview artifactType={artifactType} draft={activeDraft} />
              ) : (
                <div className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] p-3 text-sm text-[var(--text-muted)]">
                  Answer the questions to generate a draft.
                </div>
              )}

              <div className="mt-4 space-y-2">
                {canCreateCurrent && (
                  <button
                    onClick={() => handleCreate("current")}
                    className="w-full rounded-md bg-[var(--accent-primary)] px-4 py-2 font-medium text-white transition-colors hover:bg-[var(--accent-primary-hover)] disabled:opacity-60"
                    disabled={isCreating}
                  >
                    {isCreating ? "Creating…" : "Create Current State"}
                  </button>
                )}
                {canStartFuture && (
                  <button
                    onClick={() => setState(startFutureConstraints(state))}
                    className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-4 py-2 font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)]"
                  >
                    Generate Future State (guided)
                  </button>
                )}
                {canCreateFuture && (
                  <button
                    onClick={() => handleCreate("future")}
                    className="w-full rounded-md bg-[var(--accent-primary)] px-4 py-2 font-medium text-white transition-colors hover:bg-[var(--accent-primary-hover)] disabled:opacity-60"
                    disabled={isCreating}
                  >
                    {isCreating ? "Creating…" : "Create Future State"}
                  </button>
                )}

                <button
                  onClick={onClose}
                  className="w-full rounded-md border border-[var(--border-subtle)] px-4 py-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

