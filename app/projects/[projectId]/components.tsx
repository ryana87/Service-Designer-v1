"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppIcon } from "../../components/Icon";
import { ExportModal } from "../../components/ExportModal";
import { CompareModal } from "../../components/CompareModal";
import { VersionHistoryModal } from "../../components/VersionHistoryModal";
import { CreateArtifactModal } from "../../components/CreateArtifactModal";
import { TraceabilityExportModal } from "./TraceabilityExportModal";
import { PatternsModal } from "./PatternsModal";
import { OnboardingWizardModal } from "../../onboarding/OnboardingWizardModal";
import { ResearchIntakeModal } from "../../onboarding/ResearchIntakeModal";
import { updateProject, createJourneyMapInProject, createJourneyMapFromSpec, renameJourneyMap, deleteJourneyMap, duplicateJourneyMap, addPersonaFromTemplate, deletePersona } from "./actions";
import { PERSONA_LIBRARY_SEGMENTS, getPersonaTemplateById, type PersonaTemplate } from "../../lib/persona-library";
import { createBlueprint, createBlueprintFromSpec, renameBlueprint, deleteBlueprint, duplicateBlueprint } from "./blueprints/actions";
import { useProjectCache } from "./ProjectCacheContext";
import { useDemoOptional } from "../../demo/DemoContext";
import { DEMO_PROJECT_ID } from "../../demo/constants";
import { BLUEPRINT_TEMPLATES, JOURNEY_MAP_TEMPLATES } from "../../onboarding/templates";

type JourneyMapItem = {
  id: string;
  name: string;
  personaName: string | null;
  createdAt: string;
  updatedAt: string;
  phaseCount: number;
  actionCount: number;
};

type BlueprintItem = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  phaseCount: number;
  columnCount: number;
  connectionCount: number;
};

type PersonaItem = {
  id: string;
  name: string;
  shortDescription: string | null;
  role: string | null;
  context: string | null;
  goals: string | null;
  needs: string | null;
  painPoints: string | null;
  notes: string | null;
  avatarUrl: string | null;
  templateId: string | null;
};

type SortField = "updatedAt" | "createdAt" | "name";

type ProjectOverviewContentProps = {
  projectId: string;
};

export function ProjectOverviewContent({ projectId }: ProjectOverviewContentProps) {
  const router = useRouter();
  const cache = useProjectCache();
  const { name: projectName, description: projectDescription, journeyMaps, blueprints, personas, createdAt, updatedAt } = cache.data;
  const demo = useDemoOptional();
  const isDemo = (demo?.isDemo ?? false) || projectId === DEMO_PROJECT_ID;
  const [name, setName] = useState(projectName);
  const [description, setDescription] = useState(projectDescription || "");
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setName(projectName);
    setDescription(projectDescription || "");
  }, [projectName, projectDescription]);

  // Search and sort state
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("updatedAt");
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [showVersionHistoryModal, setShowVersionHistoryModal] = useState(false);
  const [showCreateArtifactModal, setShowCreateArtifactModal] = useState(false);
  const [createArtifactType, setCreateArtifactType] = useState<"journeyMap" | "blueprint">("journeyMap");
  const [showOnboardingWizard, setShowOnboardingWizard] = useState(false);
  const [showResearchIntake, setShowResearchIntake] = useState(false);

  // Export modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [showTraceabilityModal, setShowTraceabilityModal] = useState(false);
  const [showPatternsModal, setShowPatternsModal] = useState(false);

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  useEffect(() => {
    if (isEditingDescription && descriptionInputRef.current) {
      descriptionInputRef.current.focus();
    }
  }, [isEditingDescription]);

  const handleNameBlur = async () => {
    setIsEditingName(false);
    if (name.trim() !== projectName) {
      await updateProject(projectId, "name", name.trim());
      cache.updateProjectName(name.trim());
    }
  };

  const handleDescriptionBlur = async () => {
    setIsEditingDescription(false);
    if (description.trim() !== (projectDescription || "")) {
      await updateProject(projectId, "description", description.trim());
      cache.updateProjectDescription(description.trim());
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleNameBlur();
    } else if (e.key === "Escape") {
      setName(projectName);
      setIsEditingName(false);
    }
  };

  const handleDescriptionKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setDescription(projectDescription || "");
      setIsEditingDescription(false);
    }
  };

  const createBlankJourneyMap = async () => {
    const newMap = await createJourneyMapInProject(projectId);
    if (!newMap) return;
    cache.addJourneyMap({
      id: newMap.id,
      name: newMap.name,
      personaName: null,
      createdAt: newMap.createdAt.toISOString(),
      updatedAt: newMap.updatedAt.toISOString(),
      phaseCount: 0,
      actionCount: 0,
    });
    sessionStorage.setItem("focusMapRename", newMap.id);
    router.push(`/projects/${projectId}/journey-maps/${newMap.id}`);
  };

  const createBlankBlueprint = async () => {
    const newBp = await createBlueprint(projectId);
    if (!newBp) return;
    cache.addBlueprint({
      id: newBp.id,
      name: newBp.name,
      createdAt: newBp.createdAt.toISOString(),
      updatedAt: newBp.updatedAt.toISOString(),
      phaseCount: 1,
      columnCount: 1,
      connectionCount: 0,
    });
    sessionStorage.setItem("focusBlueprintRename", newBp.id);
    router.push(`/projects/${projectId}/blueprints/${newBp.id}`);
  };

  const handleCreateFromTemplate = async (templateId: string) => {
    if (createArtifactType === "journeyMap") {
      const template = JOURNEY_MAP_TEMPLATES.find((t) => t.id === templateId);
      if (!template) return;
      const newMap = await createJourneyMapFromSpec(projectId, template.draft);
      if (!newMap) return;
      cache.addJourneyMap({
        id: newMap.id,
        name: newMap.name,
        personaName: null,
        createdAt: newMap.createdAt.toISOString(),
        updatedAt: newMap.updatedAt.toISOString(),
        phaseCount: template.draft.phases?.length ?? 0,
        actionCount: 0,
      });
      router.push(`/projects/${projectId}/journey-maps/${newMap.id}`);
      return;
    }

    const template = BLUEPRINT_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;
    const newBp = await createBlueprintFromSpec(projectId, template.draft);
    if (!newBp) return;
    cache.addBlueprint({
      id: newBp.id,
      name: newBp.name,
      createdAt: newBp.createdAt.toISOString(),
      updatedAt: newBp.updatedAt.toISOString(),
      phaseCount: template.draft.phases?.length ?? 0,
      columnCount: 0,
      connectionCount: 0,
    });
    router.push(`/projects/${projectId}/blueprints/${newBp.id}`);
  };

  // Filter and sort items
  const filteredMaps = useMemo(() => {
    let result = [...journeyMaps];
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(query) ||
          m.personaName?.toLowerCase().includes(query)
      );
    }
    result.sort((a, b) => {
      if (sortField === "name") return a.name.localeCompare(b.name);
      if (sortField === "createdAt") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
    return result;
  }, [journeyMaps, searchQuery, sortField]);

  const filteredBlueprints = useMemo(() => {
    let result = [...blueprints];
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((b) => b.name.toLowerCase().includes(query));
    }
    result.sort((a, b) => {
      if (sortField === "name") return a.name.localeCompare(b.name);
      if (sortField === "createdAt") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
    return result;
  }, [blueprints, searchQuery, sortField]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  return (
    <div className="flex h-full flex-col bg-[var(--bg-panel)]">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-panel)] px-6">
        <h1
          className="font-semibold text-[var(--text-primary)]"
          style={{ fontSize: "18px" }}
        >
          Project Overview
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowVersionHistoryModal(true)}
            className="flex items-center gap-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-3 py-1.5 font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)]"
            style={{ fontSize: "var(--font-size-cell)" }}
          >
            <AppIcon name="undo" size="xs" />
            <span>Version History</span>
          </button>
          {(journeyMaps.length >= 2 || blueprints.length >= 2) && (
            <button
              onClick={() => setShowCompareModal(true)}
              className="flex items-center gap-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-3 py-1.5 font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)]"
              style={{ fontSize: "var(--font-size-cell)" }}
            >
              <AppIcon name="compare" size="xs" />
              <span>Compare</span>
            </button>
          )}
          {journeyMaps.length >= 1 && blueprints.length >= 1 && (
            <button
              onClick={() => setShowTraceabilityModal(true)}
              className="flex items-center gap-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-3 py-1.5 font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)]"
              style={{ fontSize: "var(--font-size-cell)" }}
            >
              <AppIcon name="article" size="xs" />
              <span>Traceability</span>
            </button>
          )}
          <button
            onClick={() => setShowPatternsModal(true)}
            className="flex items-center gap-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-3 py-1.5 font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)]"
            style={{ fontSize: "var(--font-size-cell)" }}
          >
            <AppIcon name="lightbulb" size="xs" />
            <span>Patterns</span>
          </button>
          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-3 py-1.5 font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)]"
            style={{ fontSize: "var(--font-size-cell)" }}
          >
            <AppIcon name="download" size="xs" />
            <span>Export</span>
          </button>
        </div>
      </header>

      {showCreateArtifactModal && (
        <CreateArtifactModal
          artifactType={createArtifactType}
          onClose={() => setShowCreateArtifactModal(false)}
          onCreateBlank={
            createArtifactType === "journeyMap"
              ? createBlankJourneyMap
              : createBlankBlueprint
          }
          onStartGuided={() => setShowOnboardingWizard(true)}
          onStartResearchIntake={() => setShowResearchIntake(true)}
          onStartFacilitation={() =>
            router.push(`/projects/${projectId}/facilitate?type=${createArtifactType}`)
          }
          onCreateFromTemplate={handleCreateFromTemplate}
        />
      )}

      {showOnboardingWizard && (
        <OnboardingWizardModal
          projectId={projectId}
          artifactType={createArtifactType}
          isDemo={isDemo}
          onClose={() => setShowOnboardingWizard(false)}
        />
      )}

      {showResearchIntake && (
        <ResearchIntakeModal
          projectId={projectId}
          artifactType={createArtifactType}
          isDemo={isDemo}
          onClose={() => setShowResearchIntake(false)}
        />
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-4xl">
          {/* Project Info Card */}
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-5">
            {/* Project Name */}
            <div className="mb-3">
              {isEditingName ? (
                <input
                  ref={nameInputRef}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={handleNameBlur}
                  onKeyDown={handleNameKeyDown}
                  className="w-full border-b-2 border-[var(--accent-primary)] bg-transparent font-semibold text-[var(--text-primary)] outline-none"
                  style={{ fontSize: "20px", lineHeight: 1.3 }}
                />
              ) : (
                <h2
                  onClick={() => setIsEditingName(true)}
                  className="cursor-text font-semibold text-[var(--text-primary)] hover:text-[var(--accent-primary)]"
                  style={{ fontSize: "20px", lineHeight: 1.3 }}
                  title="Click to edit"
                >
                  {projectName}
                </h2>
              )}
            </div>

            {/* Project Description */}
            <div className="mb-4">
              {isEditingDescription ? (
                <textarea
                  ref={descriptionInputRef}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={handleDescriptionBlur}
                  onKeyDown={handleDescriptionKeyDown}
                  placeholder="Add a project description..."
                  rows={2}
                  className="w-full resize-none rounded border border-[var(--accent-primary)] bg-transparent p-2 text-[var(--text-secondary)] outline-none"
                  style={{ fontSize: "var(--font-size-cell)", lineHeight: 1.5 }}
                />
              ) : (
                <p
                  onClick={() => setIsEditingDescription(true)}
                  className={`cursor-text rounded p-2 -m-2 transition-colors hover:bg-[var(--bg-hover)] ${
                    projectDescription
                      ? "text-[var(--text-secondary)]"
                      : "text-[var(--text-muted)] italic"
                  }`}
                  style={{ fontSize: "var(--font-size-cell)", lineHeight: 1.5 }}
                  title="Click to edit"
                >
                  {projectDescription || "Add a project description..."}
                </p>
              )}
            </div>

            {/* Metadata */}
            <div className="flex flex-wrap gap-4 border-t border-[var(--border-muted)] pt-3">
              <dl style={{ fontSize: "var(--font-size-meta)" }}>
                <div className="flex gap-1.5">
                  <dt className="text-[var(--text-muted)]">Created:</dt>
                  <dd className="text-[var(--text-secondary)]">{formatDate(createdAt)}</dd>
                </div>
              </dl>
              <dl style={{ fontSize: "var(--font-size-meta)" }}>
                <div className="flex gap-1.5">
                  <dt className="text-[var(--text-muted)]">Updated:</dt>
                  <dd className="text-[var(--text-secondary)]">{formatDate(updatedAt)}</dd>
                </div>
              </dl>
              <dl style={{ fontSize: "var(--font-size-meta)" }}>
                <div className="flex gap-1.5">
                  <dt className="text-[var(--text-muted)]">Journey Maps:</dt>
                  <dd className="text-[var(--text-secondary)]">{journeyMaps.length}</dd>
                </div>
              </dl>
              <dl style={{ fontSize: "var(--font-size-meta)" }}>
                <div className="flex gap-1.5">
                  <dt className="text-[var(--text-muted)]">Blueprints:</dt>
                  <dd className="text-[var(--text-secondary)]">{blueprints.length}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Search and Sort */}
          <div className="mt-6 flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <div className="flex items-center gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] px-3 py-2">
                <AppIcon name="search" size="xs" className="text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search maps & blueprints..."
                  className="flex-1 bg-transparent text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                  style={{ fontSize: "var(--font-size-cell)" }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                  >
                    <AppIcon name="close" size="xs" />
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="text-[var(--text-muted)]"
                style={{ fontSize: "var(--font-size-meta)" }}
              >
                Sort:
              </span>
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] px-2 py-1 text-[var(--text-primary)] outline-none"
                style={{ fontSize: "var(--font-size-cell)" }}
              >
                <option value="updatedAt">Updated</option>
                <option value="createdAt">Created</option>
                <option value="name">Name</option>
              </select>
            </div>
          </div>

          {/* Journey Maps Section */}
          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h3
                className="font-semibold text-[var(--text-primary)]"
                style={{ fontSize: "var(--font-size-action)" }}
              >
                Journey Maps
                <span
                  className="ml-2 rounded-full bg-[var(--bg-sidebar)] px-2 py-0.5 font-normal text-[var(--text-muted)]"
                  style={{ fontSize: "var(--font-size-meta)" }}
                >
                  {filteredMaps.length}
                </span>
              </h3>
              <button
                onClick={() => {
                  setCreateArtifactType("journeyMap");
                  setShowCreateArtifactModal(true);
                }}
                className="flex items-center gap-1.5 rounded-md bg-[var(--accent-primary)] px-3 py-1.5 font-medium text-white transition-colors hover:bg-[var(--accent-primary-hover)]"
                style={{ fontSize: "var(--font-size-cell)" }}
              >
                <AppIcon name="add" size="xs" />
                <span>+ New</span>
              </button>
            </div>

            {filteredMaps.length > 0 ? (
              <div className="space-y-2">
                {filteredMaps.map((map) => (
                  <JourneyMapCard
                    key={map.id}
                    item={map}
                    projectId={projectId}
                    formatDate={formatDate}
                  />
                ))}
              </div>
            ) : journeyMaps.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[var(--border-subtle)] bg-[var(--bg-sidebar)] p-6 text-center">
                <AppIcon
                  name="journeyMap"
                  className="mx-auto mb-2 text-[var(--text-muted)]"
                />
                <p
                  className="text-[var(--text-muted)]"
                  style={{ fontSize: "var(--font-size-cell)" }}
                >
                  No journey maps yet
                </p>
                <button
                  onClick={() => {
                    setCreateArtifactType("journeyMap");
                    setShowCreateArtifactModal(true);
                  }}
                  className="mt-2 text-[var(--accent-primary)] hover:underline"
                  style={{ fontSize: "var(--font-size-cell)" }}
                >
                  Create your first map
                </button>
              </div>
            ) : (
              <p
                className="text-center text-[var(--text-muted)] py-4"
                style={{ fontSize: "var(--font-size-cell)" }}
              >
                No maps match your search
              </p>
            )}
          </div>

          {/* Service Blueprints Section */}
          <div className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <h3
                className="font-semibold text-[var(--text-primary)]"
                style={{ fontSize: "var(--font-size-action)" }}
              >
                Service Blueprints
                <span
                  className="ml-2 rounded-full bg-[var(--bg-sidebar)] px-2 py-0.5 font-normal text-[var(--text-muted)]"
                  style={{ fontSize: "var(--font-size-meta)" }}
                >
                  {filteredBlueprints.length}
                </span>
              </h3>
              <button
                onClick={() => {
                  setCreateArtifactType("blueprint");
                  setShowCreateArtifactModal(true);
                }}
                className="flex items-center gap-1.5 rounded-md bg-[var(--accent-primary)] px-3 py-1.5 font-medium text-white transition-colors hover:bg-[var(--accent-primary-hover)]"
                style={{ fontSize: "var(--font-size-cell)" }}
              >
                <AppIcon name="add" size="xs" />
                <span>+ New</span>
              </button>
            </div>

            {filteredBlueprints.length > 0 ? (
              <div className="space-y-2">
                {filteredBlueprints.map((bp) => (
                  <BlueprintCard
                    key={bp.id}
                    item={bp}
                    projectId={projectId}
                    formatDate={formatDate}
                  />
                ))}
              </div>
            ) : blueprints.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[var(--border-subtle)] bg-[var(--bg-sidebar)] p-6 text-center">
                <AppIcon
                  name="blueprint"
                  className="mx-auto mb-2 text-[var(--text-muted)]"
                />
                <p
                  className="text-[var(--text-muted)]"
                  style={{ fontSize: "var(--font-size-cell)" }}
                >
                  No blueprints yet
                </p>
                <button
                  onClick={() => {
                    setCreateArtifactType("blueprint");
                    setShowCreateArtifactModal(true);
                  }}
                  className="mt-2 text-[var(--accent-primary)] hover:underline"
                  style={{ fontSize: "var(--font-size-cell)" }}
                >
                  Create your first blueprint
                </button>
              </div>
            ) : (
              <p
                className="text-center text-[var(--text-muted)] py-4"
                style={{ fontSize: "var(--font-size-cell)" }}
              >
                No blueprints match your search
              </p>
            )}
          </div>

          {/* Persona Library: 3 segments, 8 templates, Add to project only */}
          <PersonaLibrarySection projectId={projectId} personas={personas} />
          {/* Customer Personas: visible, disabled, Coming Soon */}
          <CustomerPersonasComingSoon />
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <ExportModal
          projectId={projectId}
          journeyMaps={journeyMaps.map((m) => ({ id: m.id, name: m.name }))}
          blueprints={blueprints.map((b) => ({ id: b.id, name: b.name }))}
          personas={personas.map((p) => ({ id: p.id, name: p.name }))}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {/* Compare Modal */}
      {showCompareModal && (
        <CompareModal
          projectId={projectId}
          journeyMaps={journeyMaps.map((m) => ({ id: m.id, name: m.name }))}
          blueprints={blueprints.map((b) => ({ id: b.id, name: b.name }))}
          onClose={() => setShowCompareModal(false)}
        />
      )}

      {/* Version History Modal */}
      {showVersionHistoryModal && (
        <VersionHistoryModal
          projectId={projectId}
          journeyMaps={journeyMaps.map((m) => ({ id: m.id, name: m.name }))}
          blueprints={blueprints.map((b) => ({ id: b.id, name: b.name }))}
          onClose={() => setShowVersionHistoryModal(false)}
        />
      )}
      {showTraceabilityModal && (
        <TraceabilityExportModal
          projectId={projectId}
          journeyMaps={journeyMaps.map((m) => ({ id: m.id, name: m.name }))}
          blueprints={blueprints.map((b) => ({ id: b.id, name: b.name }))}
          onClose={() => setShowTraceabilityModal(false)}
        />
      )}
      {showPatternsModal && (
        <PatternsModal projectId={projectId} onClose={() => setShowPatternsModal(false)} />
      )}
    </div>
  );
}

// ============================================
// JOURNEY MAP CARD
// ============================================

function JourneyMapCard({
  item,
  projectId,
  formatDate,
}: {
  item: JourneyMapItem;
  projectId: string;
  formatDate: (date: string) => string;
}) {
  const router = useRouter();
  const cache = useProjectCache();
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(item.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  useEffect(() => {
    if (!showMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showMenu]);

  const handleMenuClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPos({ x: rect.right, y: rect.bottom });
    setShowMenu(true);
  };

  const handleRename = async () => {
    setIsRenaming(false);
    if (newName.trim() && newName.trim() !== item.name) {
      await renameJourneyMap(item.id, newName.trim());
      cache.updateJourneyMapName(item.id, newName.trim());
    } else {
      setNewName(item.name);
    }
  };

  const handleDuplicate = async () => {
    setShowMenu(false);
    const duplicate = await duplicateJourneyMap(item.id);
    if (duplicate) {
      cache.addJourneyMapFromDuplicate({
        id: duplicate.id,
        name: duplicate.name,
        personaName: item.personaName,
        createdAt: duplicate.createdAt.toISOString(),
        updatedAt: duplicate.updatedAt.toISOString(),
        phaseCount: 0,
        actionCount: 0,
      });
      router.push(`/projects/${projectId}/journey-maps/${duplicate.id}`);
    }
  };

  const handleDelete = async () => {
    setShowMenu(false);
    if (confirm(`Delete "${item.name}"? This cannot be undone.`)) {
      await deleteJourneyMap(item.id);
      cache.removeJourneyMap(item.id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleRename();
    if (e.key === "Escape") {
      setNewName(item.name);
      setIsRenaming(false);
    }
  };

  if (isRenaming) {
    return (
      <div className="rounded-lg border border-[var(--accent-primary)] bg-[var(--bg-panel)] p-4">
        <input
          ref={inputRef}
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onBlur={handleRename}
          onKeyDown={handleKeyDown}
          className="w-full border-b border-[var(--accent-primary)] bg-transparent font-medium text-[var(--text-primary)] outline-none"
          style={{ fontSize: "var(--font-size-action)" }}
        />
      </div>
    );
  }

  return (
    <div ref={cardRef} className="relative">
      <Link
        href={`/projects/${projectId}/journey-maps/${item.id}`}
        className="group flex items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-4 transition-colors hover:border-[var(--accent-primary)] hover:bg-[var(--bg-hover)]"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <AppIcon
              name="journeyMap"
              size="sm"
              className="shrink-0 text-[var(--text-muted)] group-hover:text-[var(--accent-primary)]"
            />
            <span
              className="truncate font-medium text-[var(--text-primary)]"
              style={{ fontSize: "var(--font-size-action)" }}
            >
              {item.name}
            </span>
            {item.personaName && (
              <span
                className="shrink-0 rounded bg-[var(--bg-sidebar)] px-2 py-0.5 text-[var(--text-muted)]"
                style={{ fontSize: "var(--font-size-meta)" }}
              >
                {item.personaName}
              </span>
            )}
          </div>
          <div
            className="mt-1 flex items-center gap-3 pl-6 text-[var(--text-muted)]"
            style={{ fontSize: "var(--font-size-meta)" }}
          >
            <span>{item.phaseCount} phase{item.phaseCount !== 1 ? "s" : ""}</span>
            <span className="text-[var(--border-subtle)]">•</span>
            <span>{item.actionCount} action{item.actionCount !== 1 ? "s" : ""}</span>
            <span className="text-[var(--border-subtle)]">•</span>
            <span>Updated {formatDate(item.updatedAt)}</span>
          </div>
        </div>
        <button
          onClick={handleMenuClick}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[var(--text-muted)] opacity-0 transition-all hover:bg-[var(--bg-hover)] group-hover:opacity-100"
        >
          <AppIcon name="more" size="sm" />
        </button>
      </Link>

      {showMenu && (
        <DropdownMenu
          x={menuPos.x}
          y={menuPos.y}
          onClose={() => setShowMenu(false)}
          items={[
            { label: "Rename", onClick: () => { setShowMenu(false); setIsRenaming(true); } },
            { label: "Duplicate", onClick: handleDuplicate },
            { type: "divider" },
            { label: "Delete", onClick: handleDelete, danger: true },
          ]}
        />
      )}
    </div>
  );
}

// ============================================
// BLUEPRINT CARD
// ============================================

function BlueprintCard({
  item,
  projectId,
  formatDate,
}: {
  item: BlueprintItem;
  projectId: string;
  formatDate: (date: string) => string;
}) {
  const router = useRouter();
  const cache = useProjectCache();
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(item.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  useEffect(() => {
    if (!showMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showMenu]);

  const handleMenuClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPos({ x: rect.right, y: rect.bottom });
    setShowMenu(true);
  };

  const handleRename = async () => {
    setIsRenaming(false);
    if (newName.trim() && newName.trim() !== item.name) {
      await renameBlueprint(item.id, newName.trim());
      cache.updateBlueprintName(item.id, newName.trim());
    } else {
      setNewName(item.name);
    }
  };

  const handleDuplicate = async () => {
    setShowMenu(false);
    const duplicate = await duplicateBlueprint(item.id);
    if (duplicate) {
      cache.addBlueprintFromDuplicate({
        id: duplicate.id,
        name: duplicate.name,
        createdAt: duplicate.createdAt.toISOString(),
        updatedAt: duplicate.updatedAt.toISOString(),
        phaseCount: 0,
        columnCount: 0,
        connectionCount: 0,
      });
      router.push(`/projects/${projectId}/blueprints/${duplicate.id}`);
    }
  };

  const handleDelete = async () => {
    setShowMenu(false);
    if (confirm(`Delete "${item.name}"? This cannot be undone.`)) {
      await deleteBlueprint(item.id);
      cache.removeBlueprint(item.id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleRename();
    if (e.key === "Escape") {
      setNewName(item.name);
      setIsRenaming(false);
    }
  };

  if (isRenaming) {
    return (
      <div className="rounded-lg border border-[var(--accent-primary)] bg-[var(--bg-panel)] p-4">
        <input
          ref={inputRef}
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onBlur={handleRename}
          onKeyDown={handleKeyDown}
          className="w-full border-b border-[var(--accent-primary)] bg-transparent font-medium text-[var(--text-primary)] outline-none"
          style={{ fontSize: "var(--font-size-action)" }}
        />
      </div>
    );
  }

  return (
    <div ref={cardRef} className="relative">
      <Link
        href={`/projects/${projectId}/blueprints/${item.id}`}
        className="group flex items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-4 transition-colors hover:border-[var(--accent-primary)] hover:bg-[var(--bg-hover)]"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <AppIcon
              name="blueprint"
              size="sm"
              className="shrink-0 text-[var(--text-muted)] group-hover:text-[var(--accent-primary)]"
            />
            <span
              className="truncate font-medium text-[var(--text-primary)]"
              style={{ fontSize: "var(--font-size-action)" }}
            >
              {item.name}
            </span>
          </div>
          <div
            className="mt-1 flex items-center gap-3 pl-6 text-[var(--text-muted)]"
            style={{ fontSize: "var(--font-size-meta)" }}
          >
            <span>{item.phaseCount} phase{item.phaseCount !== 1 ? "s" : ""}</span>
            <span className="text-[var(--border-subtle)]">•</span>
            <span>{item.columnCount} column{item.columnCount !== 1 ? "s" : ""}</span>
            <span className="text-[var(--border-subtle)]">•</span>
            <span>{item.connectionCount} connection{item.connectionCount !== 1 ? "s" : ""}</span>
            <span className="text-[var(--border-subtle)]">•</span>
            <span>Updated {formatDate(item.updatedAt)}</span>
          </div>
        </div>
        <button
          onClick={handleMenuClick}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[var(--text-muted)] opacity-0 transition-all hover:bg-[var(--bg-hover)] group-hover:opacity-100"
        >
          <AppIcon name="more" size="sm" />
        </button>
      </Link>

      {showMenu && (
        <DropdownMenu
          x={menuPos.x}
          y={menuPos.y}
          onClose={() => setShowMenu(false)}
          items={[
            { label: "Rename", onClick: () => { setShowMenu(false); setIsRenaming(true); } },
            { label: "Duplicate", onClick: handleDuplicate },
            { type: "divider" },
            { label: "Delete", onClick: handleDelete, danger: true },
          ]}
        />
      )}
    </div>
  );
}

// ============================================
// PERSONA LIBRARY (3 segments, 8 templates — Add to project only)
// ============================================

function PersonaLibrarySection({
  projectId,
  personas,
}: {
  projectId: string;
  personas: PersonaItem[];
}) {
  const cache = useProjectCache();
  const [addingId, setAddingId] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<PersonaTemplate | null>(null);

  const addedTemplateIds = useMemo(
    () => new Set(personas.map((p) => p.templateId).filter(Boolean) as string[]),
    [personas]
  );

  const handleAddToProject = async (templateId: string) => {
    setAddingId(templateId);
    try {
      const persona = await addPersonaFromTemplate(projectId, templateId);
      if (persona) {
        cache.addPersona({
          id: persona.id,
          name: persona.name,
          shortDescription: persona.shortDescription,
          role: persona.role,
          context: persona.context,
          goals: persona.goals,
          needs: persona.needs,
          painPoints: persona.painPoints,
          notes: persona.notes,
          avatarUrl: persona.avatarUrl,
          templateId: persona.templateId,
        });
      }
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="mt-8" id="personas">
      <h3
        className="mb-3 font-semibold text-[var(--text-primary)]"
        style={{ fontSize: "var(--font-size-action)" }}
      >
        Persona Library
      </h3>
      {PERSONA_LIBRARY_SEGMENTS.map((segment) => {
        const templates = segment.templateIds
          .map((id) => getPersonaTemplateById(id))
          .filter((t): t is NonNullable<typeof t> => t != null);
        return (
          <div key={segment.id} className="mb-6">
            <h4
              className="mb-2 font-medium text-[var(--text-secondary)]"
              style={{ fontSize: "var(--font-size-meta)" }}
            >
              {segment.name}
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((t) => {
                const added = addedTemplateIds.has(t.id);
                return (
                  <div
                    key={t.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedTemplate(t)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedTemplate(t); } }}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-4 transition-colors hover:border-[var(--accent-primary)] hover:bg-[var(--bg-hover)]"
                  >
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-[var(--bg-sidebar)]">
                      {t.avatarUrl ? (
                        <img src={t.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[var(--text-muted)]">
                          <AppIcon name="persona" size="sm" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 break-words">
                      <h5 className="font-medium text-[var(--text-primary)]" style={{ fontSize: "var(--font-size-cell)" }}>
                        {t.personaName}
                      </h5>
                      <p className="text-[var(--text-secondary)]" style={{ fontSize: "var(--font-size-meta)" }}>
                        {t.name}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-[var(--text-muted)]" style={{ fontSize: "var(--font-size-meta)" }}>
                        {t.shortDescription}
                      </p>
                      <button
                        onClick={(e) => { e.stopPropagation(); if (!added) handleAddToProject(t.id); }}
                        disabled={added || addingId === t.id}
                        className="mt-2 flex items-center gap-1 rounded border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] px-2 py-1 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-60 disabled:cursor-not-allowed"
                        style={{ fontSize: "var(--font-size-meta)" }}
                      >
                        {addingId === t.id ? "Adding…" : added ? "Added" : "Add to project"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      {personas.length > 0 && (
        <div className="mt-4">
          <h4 className="mb-2 font-medium text-[var(--text-secondary)]" style={{ fontSize: "var(--font-size-meta)" }}>
            In this project
          </h4>
          <div className="flex flex-wrap gap-2">
            {personas.map((p) => (
              <ProjectPersonaChip key={p.id} persona={p} onRemove={() => { if (confirm(`Remove "${p.name}" from project?`)) { deletePersona(p.id); cache.removePersona(p.id); } }} />
            ))}
          </div>
        </div>
      )}

      {selectedTemplate && (
        <PersonaDetailModal
          template={selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
          onAddToProject={addedTemplateIds.has(selectedTemplate.id) ? undefined : () => handleAddToProject(selectedTemplate.id)}
          isAdding={addingId === selectedTemplate.id}
          added={addedTemplateIds.has(selectedTemplate.id)}
        />
      )}
    </div>
  );
}

function PersonaDetailModal({
  template,
  onClose,
  onAddToProject,
  isAdding,
  added,
}: {
  template: PersonaTemplate;
  onClose: () => void;
  onAddToProject?: () => void;
  isAdding: boolean;
  added: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="persona-modal-title"
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4 p-6">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-[var(--bg-sidebar)]">
            {template.avatarUrl ? (
              <img src={template.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[var(--text-muted)]">
                <AppIcon name="persona" size="sm" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="persona-modal-title" className="font-semibold text-[var(--text-primary)]" style={{ fontSize: "var(--font-size-action)" }}>
              {template.personaName}
            </h2>
            <p className="text-[var(--text-secondary)]" style={{ fontSize: "var(--font-size-cell)" }}>
              {template.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
            aria-label="Close"
          >
            <AppIcon name="close" size="sm" />
          </button>
        </div>
        <div className="space-y-4 px-6 pb-6">
          {template.shortDescription && (
            <p className="text-[var(--text-muted)]" style={{ fontSize: "var(--font-size-meta)" }}>
              {template.shortDescription}
            </p>
          )}
          {template.context && (
            <div>
              <h4 className="mb-1 font-medium text-[var(--text-secondary)]" style={{ fontSize: "var(--font-size-meta)" }}>Context</h4>
              <p className="text-[var(--text-muted)] whitespace-pre-wrap" style={{ fontSize: "var(--font-size-meta)" }}>{template.context}</p>
            </div>
          )}
          {template.goals && (
            <div>
              <h4 className="mb-1 font-medium text-[var(--text-secondary)]" style={{ fontSize: "var(--font-size-meta)" }}>Goals</h4>
              <p className="text-[var(--text-muted)] whitespace-pre-wrap" style={{ fontSize: "var(--font-size-meta)" }}>{template.goals}</p>
            </div>
          )}
          {template.needs && (
            <div>
              <h4 className="mb-1 font-medium text-[var(--text-secondary)]" style={{ fontSize: "var(--font-size-meta)" }}>Needs</h4>
              <p className="text-[var(--text-muted)] whitespace-pre-wrap" style={{ fontSize: "var(--font-size-meta)" }}>{template.needs}</p>
            </div>
          )}
          {template.painPoints && (
            <div>
              <h4 className="mb-1 font-medium text-[var(--text-secondary)]" style={{ fontSize: "var(--font-size-meta)" }}>Pain points</h4>
              <p className="text-[var(--text-muted)] whitespace-pre-wrap" style={{ fontSize: "var(--font-size-meta)" }}>{template.painPoints}</p>
            </div>
          )}
          {template.notes && (
            <div>
              <h4 className="mb-1 font-medium text-[var(--text-secondary)]" style={{ fontSize: "var(--font-size-meta)" }}>Notes</h4>
              <p className="text-[var(--text-muted)] whitespace-pre-wrap" style={{ fontSize: "var(--font-size-meta)" }}>{template.notes}</p>
            </div>
          )}
          {onAddToProject && (
            <button
              onClick={onAddToProject}
              disabled={isAdding || added}
              className="flex items-center gap-1.5 rounded border border-[var(--accent-primary)] bg-[var(--accent-primary)] px-3 py-2 text-white transition-colors hover:bg-[var(--accent-primary-hover)] disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ fontSize: "var(--font-size-meta)" }}
            >
              {isAdding ? "Adding…" : added ? "Added to project" : "Add to project"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ProjectPersonaChip({
  persona,
  onRemove,
}: {
  persona: PersonaItem;
  onRemove: () => void;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] pl-2 pr-1 py-0.5"
      style={{ fontSize: "var(--font-size-meta)" }}
    >
      {persona.name}
      <button
        type="button"
        onClick={onRemove}
        className="rounded-full p-0.5 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
        title="Remove from project"
      >
        <AppIcon name="close" size="xs" />
      </button>
    </span>
  );
}

// ============================================
// CUSTOMER PERSONAS — Visible, disabled, Coming Soon
// ============================================

function CustomerPersonasComingSoon() {
  return (
    <div className="mt-8 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] p-6 text-center opacity-80">
      <h3
        className="font-semibold text-[var(--text-muted)]"
        style={{ fontSize: "var(--font-size-action)" }}
      >
        Customer Personas — Coming Soon
      </h3>
      <p className="mt-1 text-[var(--text-muted)]" style={{ fontSize: "var(--font-size-meta)" }}>
        Customer persona management will be available in a future update.
      </p>
    </div>
  );
}

// ============================================
// DROPDOWN MENU
// ============================================

type MenuItem =
  | { type: "divider" }
  | { label: string; onClick: () => void; danger?: boolean };

function DropdownMenu({
  x,
  y,
  onClose,
  items,
}: {
  x: number;
  y: number;
  onClose: () => void;
  items: MenuItem[];
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x, y });

  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      let newX = x;
      let newY = y;

      if (x + rect.width > window.innerWidth) {
        newX = x - rect.width;
      }
      if (y + rect.height > window.innerHeight) {
        newY = y - rect.height;
      }

      setPosition({ x: Math.max(8, newX), y: Math.max(8, newY) });
    }
  }, [x, y]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed z-[9999] min-w-[120px] rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] py-1 shadow-lg"
      style={{ left: position.x, top: position.y }}
    >
      {items.map((item, i) => {
        if ("type" in item && item.type === "divider") {
          return <div key={i} className="my-1 border-t border-[var(--border-muted)]" />;
        }

        const menuItem = item as Exclude<MenuItem, { type: "divider" }>;
        return (
          <button
            key={i}
            onClick={menuItem.onClick}
            className={`flex w-full items-center px-3 py-1.5 text-left transition-colors ${
              menuItem.danger
                ? "text-[var(--emotion-1)] hover:bg-[var(--emotion-1-tint)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
            }`}
            style={{ fontSize: "var(--font-size-cell)" }}
          >
            {menuItem.label}
          </button>
        );
      })}
    </div>
  );
}
