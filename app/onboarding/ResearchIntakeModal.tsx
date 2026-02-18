"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import { AppIcon } from "../components/Icon";
import { DEMO_MOCK_UPLOAD_FILES, DEMO_RESEARCH_NOTES } from "../demo/demoChatData";
import type { ArtifactType, BlueprintDraftSpec, JourneyMapDraftSpec } from "./types";
import { createJourneyMapFromSpec } from "../projects/[projectId]/actions";
import { createBlueprintFromSpec } from "../projects/[projectId]/blueprints/actions";

type TaggedLine = {
  id: string;
  text: string;
  isStep: boolean;
  isQuote: boolean;
  isPainPoint: boolean;
  isOpportunity: boolean;
  isPhase?: boolean;
};

type UploadedFile = { name: string; content: string };

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function parseLines(raw: string): TaggedLine[] {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 200);

  return lines.map((text) => {
    const lower = text.toLowerCase();
    const afterBullet = text.replace(/^(\d+\.|\-|•)\s+/, "");
    const looksPhase =
      /^(phase|stage|section):\s*/i.test(text) ||
      (lower.startsWith("phase ") || lower.startsWith("stage "));
    const looksQuote =
      /^["\u201C\u201D]/.test(text) || /^quote:\s*/i.test(afterBullet);
    const looksPain =
      /^(pain\s*point|pain):\s*/i.test(text) ||
      /^(pain\s*point|pain):\s*/i.test(afterBullet) ||
      (lower.includes("pain point") && !lower.includes("painting"));
    const looksOpp =
      /^(opportunity|opp):\s*/i.test(text) ||
      /^(opportunity|opp):\s*/i.test(afterBullet) ||
      (lower.includes("opportunity") && (lower.includes("could") || lower.includes("would")));
    const looksStep =
      /^(\d+\.|\-|•)\s+/.test(text) ||
      (lower.startsWith("step ") && /^\d/.test(text)) ||
      lower.startsWith("then ") ||
      lower.startsWith("when ");

    return {
      id: uid(),
      text,
      isStep: looksStep && !looksPhase && !looksPain && !looksQuote && !looksOpp,
      isQuote: looksQuote,
      isPainPoint: looksPain,
      isOpportunity: looksOpp,
      isPhase: looksPhase,
    };
  });
}

function buildJourneyMapFromTags(name: string, personaName: string | null, tags: TaggedLine[]): JourneyMapDraftSpec {
  const phasesFromTags = tags
    .filter((t) => t.isPhase)
    .map((t) => t.text.replace(/^(phase|stage|section):\s*/i, "").trim())
    .filter(Boolean);
  const phaseTitles = (() => {
    const seen = new Set<string>();
    const unique = phasesFromTags.filter((p) => {
      if (seen.has(p)) return false;
      seen.add(p);
      return true;
    });
    return unique.length >= 2 ? unique : ["Submit enquiry", "Wait for response", "Follow up"];
  })();

  const steps = tags
    .filter((t) => t.isStep)
    .map((t) =>
      t.text
        .replace(/^(\d+\.|\-|•)\s+/, "")
        .replace(/^step:\s*/i, "")
        .trim()
    );
  const quotes = tags
    .filter((t) => t.isQuote)
    .map((t) =>
      t.text
        .replace(/^(\d+\.|\-|•)\s+/, "")
        .replace(/^quote:\s*/i, "")
        .trim()
    );
  const painPoints = tags
    .filter((t) => t.isPainPoint)
    .map((t) =>
      t.text
        .replace(/^(\d+\.|\-|•)\s+/, "")
        .replace(/^(pain\s*point|pain):\s*/i, "")
        .trim()
    );
  const opportunities = tags
    .filter((t) => t.isOpportunity)
    .map((t) =>
      t.text
        .replace(/^(\d+\.|\-|•)\s+/, "")
        .replace(/^(opportunity|opp):\s*/i, "")
        .trim()
    );

  const fallbackSteps = ["Find contact form", "Complete form", "Receive confirmation", "Wait", "Follow up"];
  const allSteps = (steps.length ? steps : fallbackSteps).slice(0, 18);
  const chunkSize = Math.max(1, Math.ceil(allSteps.length / phaseTitles.length));

  return {
    name: name.trim() || "Journey Map (from research)",
    personaName,
    phases: phaseTitles.map((pt, idx) => {
      const phaseSteps = allSteps.slice(idx * chunkSize, (idx + 1) * chunkSize);
      return {
        title: pt,
        timeframe: null,
        actions: phaseSteps.map((s, i) => {
          const globalIdx = idx * chunkSize + i;
          const painForAction =
            painPoints.length > 0 ? painPoints[globalIdx % painPoints.length] : null;
          const oppForAction =
            opportunities.length > 0
              ? opportunities[globalIdx % opportunities.length]
              : null;
          const inferred = inferActionFields(s, idx, i);
          return {
            title: s,
            description: inferred.description,
            thought: inferred.thought,
            channel: inferred.channel,
            touchpoint: inferred.touchpoint,
            emotion: inferred.emotion,
            painPoints: painForAction || null,
            opportunities: oppForAction || null,
            quotes:
              quotes.length
                ? [{ quoteText: quotes[globalIdx % quotes.length], source: null }]
                : undefined,
          };
        }),
      };
    }),
  };
}

function inferActionFields(
  stepText: string,
  phaseIdx: number,
  actionIdx: number
): {
  description: string | null;
  thought: string | null;
  channel: string | null;
  touchpoint: string | null;
  emotion: number | null;
} {
  const lower = stepText.toLowerCase();
  let channel: string | null = null;
  let touchpoint: string | null = null;
  if (lower.includes("website") || lower.includes("web") || lower.includes("form")) {
    channel = "Web";
    if (lower.includes("form")) touchpoint = "Form";
    else if (lower.includes("contact")) touchpoint = "Homepage";
  }
  if (lower.includes("email")) {
    channel = channel || "Email";
    touchpoint = touchpoint || "Email";
  }
  if (lower.includes("call") || lower.includes("phone")) {
    channel = channel || "Phone";
    touchpoint = touchpoint || "Phone";
  }
  if (lower.includes("confirmation")) touchpoint = touchpoint || "Confirmation page";

  let emotion: number | null = 3;
  if (lower.includes("wait") || lower.includes("repeat") || lower.includes("frustrat")) emotion = 2;
  if (lower.includes("confirm") || lower.includes("receive") || lower.includes("complete")) emotion = 4;

  const description = stepText.length > 10 ? stepText : null;
  const thought =
    lower.includes("hope") || lower.includes("where")
      ? "Where do I actually ask this?"
      : null;

  return {
    description,
    thought,
    channel,
    touchpoint,
    emotion,
  };
}

function buildBlueprintFromTags(name: string, tags: TaggedLine[]): BlueprintDraftSpec {
  const steps = tags
    .filter((t) => t.isStep)
    .map((t) =>
      t.text
        .replace(/^(\d+\.|\-|•)\s+/, "")
        .replace(/^step:\s*/i, "")
        .trim()
    )
    .slice(0, 12);
  const painPoints = tags
    .filter((t) => t.isPainPoint)
    .map((t) =>
      t.text
        .replace(/^(\d+\.|\-|•)\s+/, "")
        .replace(/^(pain\s*point|pain):\s*/i, "")
        .trim()
    )
    .slice(0, 8);

  const phaseTitles = ["Intake", "Work", "Resolution"];
  const fallbackSteps = ["Submit", "Assess", "Resolve"];
  const allSteps = (steps.length ? steps : fallbackSteps).slice(0, 12);
  const chunkSize = Math.max(1, Math.ceil(allSteps.length / phaseTitles.length));

  return {
    name: name.trim() || "Blueprint (from research)",
    teams: [{ name: "Team" }],
    phases: phaseTitles.map((pt, idx) => {
      const phaseSteps = allSteps.slice(idx * chunkSize, (idx + 1) * chunkSize);
      return {
        title: pt,
        timeframe: null,
        steps: phaseSteps.map((s) => ({
          label: s,
          lanes: {
            PHYSICAL_EVIDENCE: [{ title: s }],
            CUSTOMER_ACTION: [{ title: s }],
            FRONTSTAGE_ACTION: [{ title: "Support responds" }],
            BACKSTAGE_ACTION: [{ title: "Internal processing" }],
            SUPPORT_PROCESS: painPoints.length ? painPoints.map((p) => ({ title: p })) : [{ title: "System rules apply" }],
          },
        })),
      };
    }),
  };
}

const DEMO_ARTIFACT_NAME =
  (type: ArtifactType) => (type === "journeyMap" ? "Contact Enquiry Journey" : "Contact Enquiry Blueprint");

export function ResearchIntakeModal({
  projectId,
  artifactType,
  isDemo = false,
  onClose,
}: {
  projectId: string;
  artifactType: ArtifactType;
  isDemo?: boolean;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"upload" | "text">("upload");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [notes, setNotes] = useState("");
  const [name, setName] = useState("");
  const [personaName, setPersonaName] = useState("");
  const [nameFocused, setNameFocused] = useState(false);
  const [personaFocused, setPersonaFocused] = useState(false);
  const [lines, setLines] = useState<TaggedLine[] | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const combinedContent = useMemo(() => {
    if (mode === "upload") {
      return uploadedFiles.map((f) => `--- ${f.name} ---\n${f.content}`).join("\n\n");
    }
    return notes;
  }, [mode, uploadedFiles, notes]);

  const parsed = useMemo(() => parseLines(combinedContent), [combinedContent]);
  const title = artifactType === "journeyMap" ? "Create from research (Journey Map)" : "Create from research (Blueprint)";

  const loadDemoFiles = useCallback(() => {
    if (!isDemo) return;
    setUploadedFiles(DEMO_MOCK_UPLOAD_FILES.map((f) => ({ name: f.name, content: f.content })));
    setMode("upload");
  }, [isDemo]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const toAdd: UploadedFile[] = [];
    let pending = 0;
    const checkDone = () => {
      pending--;
      if (pending === 0) {
        setUploadedFiles((prev) => [...prev, ...toAdd]);
        e.target.value = "";
      }
    };
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (!/\.(txt|md|text)$/i.test(f.name)) continue;
      pending++;
      const reader = new FileReader();
      reader.onload = () => {
        toAdd.push({ name: f.name, content: (reader.result as string) || "" });
        checkDone();
      };
      reader.onerror = checkDone;
      reader.readAsText(f);
    }
    if (pending === 0) e.target.value = "";
  }, []);

  const removeFile = useCallback((idx: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (isDemo && uploadedFiles.length === 0) {
        loadDemoFiles();
        return;
      }
      const files = e.dataTransfer.files;
      if (!files?.length) return;
      const toAdd: UploadedFile[] = [];
      let pending = 0;
      const checkDone = () => {
        pending--;
        if (pending === 0) setUploadedFiles((prev) => [...prev, ...toAdd]);
      };
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        if (!/\.(txt|md|text)$/i.test(f.name)) continue;
        pending++;
        const reader = new FileReader();
        reader.onload = () => {
          toAdd.push({ name: f.name, content: (reader.result as string) || "" });
          checkDone();
        };
        reader.onerror = checkDone;
        reader.readAsText(f);
      }
    },
    [isDemo, uploadedFiles.length, loadDemoFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const proceedToTagging = () => {
    setLines(parsed);
  };

  const toggle = (id: string, key: keyof Omit<TaggedLine, "id" | "text">) => {
    setLines((prev) =>
      (prev ?? []).map((l) => (l.id === id ? { ...l, [key]: !l[key] } : l))
    );
  };

  const create = async () => {
    if (!lines) return;
    setIsCreating(true);
    try {
      if (artifactType === "journeyMap") {
        const spec = buildJourneyMapFromTags(name, personaName.trim() || null, lines);
        const created = await createJourneyMapFromSpec(projectId, spec);
        if (created?.id) {
          onClose();
          window.location.href = `/projects/${projectId}/journey-maps/${created.id}`;
        }
      } else {
        const spec = buildBlueprintFromTags(name, lines);
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

  const hasContent = mode === "upload" ? uploadedFiles.length > 0 : notes.trim().length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-4xl overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3">
          <div className="flex items-center gap-2">
            <AppIcon name="upload" size="sm" />
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

        {!lines ? (
          <div className="space-y-3 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Artifact name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onFocus={() => {
                    if (isDemo && !nameFocused) {
                      setName(DEMO_ARTIFACT_NAME(artifactType));
                      setNameFocused(true);
                    }
                  }}
                  className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] px-3 py-2 text-[var(--text-primary)] outline-none"
                />
              </div>
              {artifactType === "journeyMap" && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Persona label (optional)</label>
                  <input
                    value={personaName}
                    onChange={(e) => setPersonaName(e.target.value)}
                    onFocus={() => {
                      if (isDemo && !personaFocused) {
                        setPersonaName("Alex");
                        setPersonaFocused(true);
                      }
                    }}
                    className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] px-3 py-2 text-[var(--text-primary)] outline-none"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setMode("upload")}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  mode === "upload"
                    ? "bg-[var(--accent-primary)] text-white"
                    : "border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                }`}
              >
                Upload files
              </button>
              <button
                onClick={() => setMode("text")}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  mode === "text"
                    ? "bg-[var(--accent-primary)] text-white"
                    : "border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                }`}
              >
                Paste text
              </button>
            </div>

            {mode === "upload" ? (
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Upload interview notes</label>
                <div
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      if (isDemo && uploadedFiles.length === 0) {
                        loadDemoFiles();
                        return;
                      }
                      fileInputRef.current?.click();
                    }
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // Demo: first click always loads mock files (never opens native picker)
                    if (isDemo && uploadedFiles.length === 0) {
                      loadDemoFiles();
                      return;
                    }
                    fileInputRef.current?.click();
                  }}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  className="flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-[var(--border-subtle)] bg-[var(--bg-sidebar)] p-4 transition-colors hover:border-[var(--accent-primary)] hover:bg-[var(--bg-hover)]"
                >
                  <AppIcon name="upload" size="lg" className="mb-2 text-[var(--text-muted)]" />
                  <p className="text-sm text-[var(--text-secondary)]">
                    {isDemo && uploadedFiles.length === 0
                      ? "Click to load demo interview files"
                      : "Click or drop .txt, .md files"}
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.md,.text"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {uploadedFiles.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {uploadedFiles.map((f, i) => (
                      <li key={i} className="flex items-center justify-between rounded-md bg-[var(--bg-sidebar)] px-3 py-2 text-sm">
                        <span className="text-[var(--text-primary)]">{f.name}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(i);
                          }}
                          className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
                        >
                          <AppIcon name="close" size="xs" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">Paste interview notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onFocus={() => {
                    if (isDemo && !notes) setNotes(DEMO_RESEARCH_NOTES);
                  }}
                  rows={10}
                  className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] px-3 py-2 text-[var(--text-primary)] outline-none"
                  placeholder="Paste notes here… Each line will become a taggable item."
                />
              </div>
            )}

            <div className="mt-2 text-xs text-[var(--text-muted)]">
              Tip: Use Phase/Stage prefixes, bullet steps, and Pain point:/Opportunity: for better tagging.
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={onClose}
                className="rounded-md border border-[var(--border-subtle)] px-3 py-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)]"
              >
                Cancel
              </button>
              <button
                onClick={proceedToTagging}
                disabled={!hasContent}
                className="rounded-md bg-[var(--accent-primary)] px-3 py-2 font-medium text-white transition-colors hover:bg-[var(--accent-primary-hover)] disabled:opacity-60"
              >
                Tag & generate
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="font-medium text-[var(--text-primary)]">Tag your notes</div>
                <div className="text-sm text-[var(--text-muted)]">
                  Toggle what each line represents. We'll generate a first draft from the tags.
                </div>
              </div>
              <button
                onClick={() => setLines(null)}
                className="rounded-md border border-[var(--border-subtle)] px-3 py-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)]"
              >
                Back
              </button>
            </div>

            <div className="max-h-[55vh] overflow-y-auto rounded-md border border-[var(--border-subtle)]">
              {(lines ?? []).map((l) => (
                <div key={l.id} className="border-b border-[var(--border-subtle)] p-3">
                  <div className="text-sm text-[var(--text-primary)]">{l.text}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(
                      [
                        ["isPhase", "Phase"],
                        ["isStep", "Step"],
                        ["isQuote", "Quote"],
                        ["isPainPoint", "Pain point"],
                        ["isOpportunity", "Opportunity"],
                      ] as const
                    ).map(([key, label]) => {
                        const active = l[key as keyof TaggedLine];
                        return (
                          <button
                            key={key}
                            onClick={() => toggle(l.id, key as keyof Omit<TaggedLine, "id" | "text">)}
                            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                              active
                                ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                                : "border-[var(--border-subtle)] bg-[var(--bg-panel)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={onClose}
                className="rounded-md border border-[var(--border-subtle)] px-3 py-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)]"
              >
                Cancel
              </button>
              <button
                onClick={create}
                disabled={isCreating}
                className="rounded-md bg-[var(--accent-primary)] px-3 py-2 font-medium text-white transition-colors hover:bg-[var(--accent-primary-hover)] disabled:opacity-60"
              >
                {isCreating ? "Creating…" : "Create draft artifact"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
