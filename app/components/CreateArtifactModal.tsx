"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppIcon } from "./Icon";
import type {
  ArtifactType,
  BlueprintTemplate,
  JourneyMapTemplate,
} from "../onboarding/types";
import { BLUEPRINT_TEMPLATES, JOURNEY_MAP_TEMPLATES } from "../onboarding/templates";

type CreateArtifactModalProps = {
  artifactType: ArtifactType;
  onClose: () => void;
  onCreateBlank: () => Promise<void> | void;
  onStartGuided: () => void;
  onStartResearchIntake: () => void;
  onStartFacilitation: () => void;
  onCreateFromTemplate: (templateId: string) => Promise<void> | void;
};

type Mode = "choose" | "template";

export function CreateArtifactModal({
  artifactType,
  onClose,
  onCreateBlank,
  onStartGuided,
  onStartResearchIntake,
  onStartFacilitation,
  onCreateFromTemplate,
}: CreateArtifactModalProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("choose");
  const templates = useMemo(
    () =>
      (artifactType === "journeyMap"
        ? (JOURNEY_MAP_TEMPLATES as JourneyMapTemplate[])
        : (BLUEPRINT_TEMPLATES as BlueprintTemplate[])) ?? [],
    [artifactType]
  );

  const title = artifactType === "journeyMap" ? "New Journey Map" : "New Service Blueprint";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3">
          <div className="flex items-center gap-2">
            <AppIcon name={artifactType === "journeyMap" ? "journeyMap" : "blueprint"} size="sm" />
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

        {mode === "choose" ? (
          <div className="space-y-4 p-4">
            <p className="text-sm text-[var(--text-muted)]">
              Choose how you want to start. You can always edit everything after it’s created.
            </p>

            <div className="grid gap-2">
              <button
                onClick={async () => {
                  await onCreateBlank();
                  onClose();
                }}
                className="flex w-full items-start gap-3 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-3 py-3 text-left transition-colors hover:bg-[var(--bg-hover)]"
              >
                <div className="mt-0.5 text-[var(--text-muted)]">
                  <AppIcon name="add" size="sm" />
                </div>
                <div>
                  <div className="font-medium text-[var(--text-primary)]">Start blank</div>
                  <div className="text-sm text-[var(--text-muted)]">
                    Create an empty artifact and build it manually.
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  onStartGuided();
                  onClose();
                }}
                className="flex w-full items-start gap-3 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-3 py-3 text-left transition-colors hover:bg-[var(--bg-hover)]"
              >
                <div className="mt-0.5 text-[var(--accent-primary)]">
                  <AppIcon name="ai" size="sm" />
                </div>
                <div>
                  <div className="font-medium text-[var(--text-primary)]">Guided setup</div>
                  <div className="text-sm text-[var(--text-muted)]">
                    Describe it in plain language, answer a few questions, then generate an artifact.
                  </div>
                </div>
              </button>

              <button
                onClick={() => setMode("template")}
                className="flex w-full items-start gap-3 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-3 py-3 text-left transition-colors hover:bg-[var(--bg-hover)]"
              >
                <div className="mt-0.5 text-[var(--text-muted)]">
                  <AppIcon name="grid_view" size="sm" />
                </div>
                <div>
                  <div className="font-medium text-[var(--text-primary)]">Start from a template</div>
                  <div className="text-sm text-[var(--text-muted)]">
                    Pick a common pattern and customize it.
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  onStartResearchIntake();
                  onClose();
                }}
                className="flex w-full items-start gap-3 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-3 py-3 text-left transition-colors hover:bg-[var(--bg-hover)]"
              >
                <div className="mt-0.5 text-[var(--text-muted)]">
                  <AppIcon name="upload" size="sm" />
                </div>
                <div>
                  <div className="font-medium text-[var(--text-primary)]">Create from research notes</div>
                  <div className="text-sm text-[var(--text-muted)]">
                    Paste notes and tag moments, quotes, and pain points to generate structure.
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  onStartFacilitation();
                  onClose();
                }}
                className="flex w-full items-start gap-3 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-3 py-3 text-left transition-colors hover:bg-[var(--bg-hover)]"
              >
                <div className="mt-0.5 text-[var(--text-muted)]">
                  <AppIcon name="play" size="sm" />
                </div>
                <div>
                  <div className="font-medium text-[var(--text-primary)]">Facilitation mode</div>
                  <div className="text-sm text-[var(--text-muted)]">
                    Run a workshop flow (timed prompts + voting) and generate an artifact from the output.
                  </div>
                </div>
              </button>
            </div>

            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="rounded-md border border-[var(--border-subtle)] px-3 py-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)]"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="font-medium text-[var(--text-primary)]">Choose a template</div>
                <div className="text-sm text-[var(--text-muted)]">
                  Templates are starting points — you can edit everything afterward.
                </div>
              </div>
              <button
                onClick={() => setMode("choose")}
                className="rounded-md border border-[var(--border-subtle)] px-3 py-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)]"
              >
                Back
              </button>
            </div>

            <div className="max-h-[55vh] space-y-2 overflow-y-auto">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={async () => {
                    await onCreateFromTemplate(t.id);
                    onClose();
                    router.refresh();
                  }}
                  className="flex w-full items-start gap-3 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-3 py-3 text-left transition-colors hover:bg-[var(--bg-hover)]"
                >
                  <div className="mt-0.5 text-[var(--text-muted)]">
                    <AppIcon name={artifactType === "journeyMap" ? "journeyMap" : "blueprint"} size="sm" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-[var(--text-primary)]">{t.name}</div>
                    <div className="mt-0.5 text-sm text-[var(--text-muted)]">{t.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

