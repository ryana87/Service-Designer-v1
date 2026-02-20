"use client";

import React, { useState } from "react";
import { useJourneyMapCache } from "./JourneyMapCacheContext";
import { CommentableCell } from "../../../../components/CommentableCell";
import { CommentableGridHandler } from "../../../../components/CommentableGridHandler";
import { JourneyMapCanvasContent } from "./JourneyMapCanvasContent";
import { HideCommentsButton } from "../../../../components/HideCommentsButton";
import ShareButton from "../../../../components/ShareButton";
import { HeaderZoomControls } from "./HeaderZoomControls";
import { ExportButton } from "../../../../components/ExportButton";
import { CompletenessButton } from "../../../../components/CompletenessButton";
import { JourneyMapInsightsControls } from "./InsightsWrapper";
import { SuggestBlueprintModal } from "./SuggestBlueprintModal";
import { AppIcon } from "../../../../components/Icon";
import {
  PhaseHeader,
  ActionColumnHeader,
  SelectModeToolbar,
  EmotionTrendRow,
  AddFirstPhaseCard,
  EditableCell,
  EmotionCell,
  ThumbnailCell,
  ChannelCell,
  TouchpointCell,
  PainPointCell,
  OpportunityCell,
  SuggestedTagsCell,
  PersonaSelector,
} from "./components";
import { DEFAULT_CHANNEL_OPTIONS, DEFAULT_TOUCHPOINT_OPTIONS } from "./shared";
import type { JourneyMapAction, JourneyMapPhase } from "./cache-types";
import type { SelectOption } from "./shared";

const LABEL_COLUMN_WIDTH = 110;
const ACTION_COLUMN_WIDTH = 160;

type RowDef = {
  key: string;
  label: string;
  type: "text" | "textarea" | "select" | "emotion" | "thumbnail" | "channel" | "touchpoint" | "painPoints" | "opportunities" | "suggestedTags";
  placeholder?: string;
};

const ROWS_BEFORE_TREND: RowDef[] = [
  { key: "description", label: "Description", type: "textarea", placeholder: "Describe what happens..." },
  { key: "thumbnail", label: "Thumbnail", type: "thumbnail" },
  { key: "thought", label: "Thought", type: "text", placeholder: "What are they thinking?" },
  { key: "channel", label: "Channel", type: "channel" },
  { key: "touchpoint", label: "Touchpoint", type: "touchpoint" },
  { key: "emotion", label: "Emotion", type: "emotion" },
];

const ROWS_AFTER_TREND: RowDef[] = [
  { key: "painPoints", label: "Pain Points", type: "painPoints" },
  { key: "opportunities", label: "Opportunities", type: "opportunities" },
  { key: "suggestedTags", label: "Suggested tags", type: "suggestedTags" },
];

type ActionColumn = {
  phase: JourneyMapPhase;
  action: JourneyMapAction | null;
  isPlaceholder: boolean;
  index: number;
};

function InsightsStrip({
  lowestEmotionAction,
  highestEmotionAction,
  totalQuotes,
}: {
  lowestEmotionAction: { action: JourneyMapAction; index: number } | null;
  highestEmotionAction: { action: JourneyMapAction; index: number } | null;
  totalQuotes: number;
}) {
  const emotionEmoji: Record<number, string> = {
    1: "😠", 2: "😟", 3: "😐", 4: "🙂", 5: "😊",
  };
  return (
    <div className="flex items-center gap-2">
      {lowestEmotionAction && (
        <a
          href={`#action-col-${lowestEmotionAction.index}`}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)]"
          style={{ fontSize: "var(--font-size-meta)", background: "var(--emotion-1-tint)" }}
        >
          <span>{emotionEmoji[lowestEmotionAction.action.emotion!]}</span>
          <span className="max-w-[60px] truncate">{lowestEmotionAction.action.title}</span>
        </a>
      )}
      {highestEmotionAction && (
        <a
          href={`#action-col-${highestEmotionAction.index}`}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)]"
          style={{ fontSize: "var(--font-size-meta)", background: "var(--emotion-5-tint)" }}
        >
          <span>{emotionEmoji[highestEmotionAction.action.emotion!]}</span>
          <span className="max-w-[60px] truncate">{highestEmotionAction.action.title}</span>
        </a>
      )}
      <div className="flex items-center gap-1 rounded-md bg-[var(--bg-sidebar)] px-2 py-1 text-[var(--text-muted)]" style={{ fontSize: "var(--font-size-meta)" }}>
        <span className="font-medium text-[var(--text-secondary)]">{totalQuotes}</span>
        <span>quotes</span>
      </div>
    </div>
  );
}

function GridRow({
  row,
  actionColumns,
  labelWidth,
  channelOptions,
  touchpointOptions,
  journeyMapId,
  isLast = false,
  isDemo = false,
}: {
  row: RowDef;
  actionColumns: ActionColumn[];
  labelWidth: number;
  channelOptions: SelectOption[];
  touchpointOptions: SelectOption[];
  journeyMapId: string;
  isLast?: boolean;
  isDemo?: boolean;
}) {
  return (
    <>
      <div
        className={`sticky left-0 z-10 flex items-start border-r border-[var(--border-subtle)] bg-[var(--bg-header)] px-3 py-1.5 font-medium text-[var(--text-muted)] ${isLast ? "rounded-bl-md" : "border-b"}`}
        style={{ minWidth: labelWidth, fontSize: "var(--font-size-label)", lineHeight: 1.4 }}
      >
        {row.label}
      </div>
      {actionColumns.map((col, idx) => (
        <DataCell
          key={`${row.key}-${col.action?.id ?? `empty-${col.phase.id}`}-${idx}`}
          row={row}
          action={col.action}
          actionIndex={col.index}
          isPlaceholder={col.isPlaceholder}
          isLast={isLast}
          isLastCol={idx === actionColumns.length - 1}
          channelOptions={channelOptions}
          touchpointOptions={touchpointOptions}
          journeyMapId={journeyMapId}
          isDemo={isDemo}
        />
      ))}
    </>
  );
}

function DataCell({
  row,
  action,
  actionIndex = 0,
  isPlaceholder,
  isLast = false,
  isLastCol = false,
  channelOptions,
  touchpointOptions,
  journeyMapId,
  isDemo = false,
}: {
  row: RowDef;
  action: JourneyMapAction | null;
  actionIndex?: number;
  isPlaceholder: boolean;
  isLast?: boolean;
  isLastCol?: boolean;
  channelOptions: SelectOption[];
  touchpointOptions: SelectOption[];
  journeyMapId: string;
  isDemo?: boolean;
}) {
  const baseClass = `px-3 py-1.5 ${isLast ? "" : "border-b"} ${isLastCol ? (isLast ? "rounded-br-md" : "") : "border-r"} border-[var(--border-subtle)] bg-[var(--bg-panel)]`;

  if (isPlaceholder || !action) {
    return (
      <div className={`${baseClass} bg-[var(--bg-sidebar)]`}>
        <span className="text-[var(--text-muted)] opacity-40" style={{ fontSize: "var(--font-size-cell)" }}>—</span>
      </div>
    );
  }
  if (row.type === "thumbnail") {
    return (
      <CommentableCell actionId={action.id} rowKey={row.key} className={baseClass}>
        <ThumbnailCell actionId={action.id} actionTitle={action.title} actionIndex={actionIndex} value={action.thumbnailUrl} isDemo={isDemo} />
      </CommentableCell>
    );
  }
  if (row.type === "emotion") {
    return (
      <CommentableCell actionId={action.id} rowKey={row.key} className={baseClass}>
        <EmotionCell actionId={action.id} value={action.emotion} />
      </CommentableCell>
    );
  }
  if (row.type === "channel") {
    return (
      <CommentableCell actionId={action.id} rowKey={row.key} className={baseClass}>
        <ChannelCell actionId={action.id} value={action.channel} options={channelOptions} journeyMapId={journeyMapId} />
      </CommentableCell>
    );
  }
  if (row.type === "touchpoint") {
    return (
      <CommentableCell actionId={action.id} rowKey={row.key} className={baseClass}>
        <TouchpointCell actionId={action.id} value={action.touchpoint} options={touchpointOptions} journeyMapId={journeyMapId} />
      </CommentableCell>
    );
  }
  if (row.type === "painPoints") {
    return (
      <CommentableCell actionId={action.id} rowKey={row.key} className={baseClass}>
        <PainPointCell actionId={action.id} value={action.painPoints} />
      </CommentableCell>
    );
  }
  if (row.type === "opportunities") {
    return (
      <CommentableCell actionId={action.id} rowKey={row.key} className={baseClass}>
        <OpportunityCell actionId={action.id} value={action.opportunities} isDemo={isDemo} />
      </CommentableCell>
    );
  }
  if (row.type === "suggestedTags") {
    return (
      <CommentableCell actionId={action.id} rowKey={row.key} className={baseClass}>
        <SuggestedTagsCell
          actionId={action.id}
          title={action.title}
          description={action.description}
          painPointsValue={action.painPoints}
        />
      </CommentableCell>
    );
  }
  const value = action[row.key as keyof JourneyMapAction] as string | null;
  return (
    <CommentableCell actionId={action.id} rowKey={row.key} className={baseClass}>
      <EditableCell actionId={action.id} field={row.key} value={value} type={row.type === "select" ? "select" : row.type} placeholder={row.placeholder} />
    </CommentableCell>
  );
}

export type JourneyMapEditorContentProps = {
  projectId: string;
  journeyMapId: string;
  project: {
    name: string;
    journeyMaps: Array<{ id: string; name: string }>;
    serviceBlueprints: Array<{ id: string; name: string }>;
    personas: Array<{ id: string; name: string; shortDescription: string | null; avatarUrl: string | null; templateId: string | null }>;
  };
  isDemo: boolean;
};

export function JourneyMapEditorContent({ projectId, journeyMapId, project, isDemo }: JourneyMapEditorContentProps) {
  const cache = useJourneyMapCache();
  const data = cache.data;
  const [suggestBlueprintOpen, setSuggestBlueprintOpen] = useState(false);
  if (!data) return null;

  const channelOptions: SelectOption[] = [
    ...DEFAULT_CHANNEL_OPTIONS,
    ...data.customChannels.map((c) => ({ value: c.label, label: c.label, icon: c.iconName, isCustom: true })),
  ];
  const touchpointOptions: SelectOption[] = [
    ...DEFAULT_TOUCHPOINT_OPTIONS,
    ...data.customTouchpoints.map((t) => ({ value: t.label, label: t.label, icon: t.iconName, isCustom: true })),
  ];

  const actionColumns: ActionColumn[] = [];
  let actionIndex = 0;
  for (const phase of data.phases) {
    if (phase.actions.length === 0) {
      actionColumns.push({ phase, action: null, isPlaceholder: true, index: actionIndex++ });
    } else {
      for (const action of phase.actions) {
        actionColumns.push({ phase, action, isPlaceholder: false, index: actionIndex++ });
      }
    }
  }

  const totalActionColumns = data.phases.reduce((sum, p) => sum + Math.max(p.actions.length, 1), 0);
  const actionsWithEmotion = actionColumns.filter((col): col is ActionColumn & { action: JourneyMapAction } => col.action !== null && col.action.emotion !== null);
  const lowestEmotionAction = actionsWithEmotion.length > 0 ? actionsWithEmotion.reduce((min, col) => (col.action.emotion! < min.action.emotion! ? col : min)) : null;
  const highestEmotionAction = actionsWithEmotion.length > 0 ? actionsWithEmotion.reduce((max, col) => (col.action.emotion! > max.action.emotion! ? col : max)) : null;
  const totalQuotes = actionColumns.reduce((sum, col) => sum + (col.action?.quotes.length ?? 0), 0);
  const allActionIds = actionColumns.filter((col) => col.action).map((col) => col.action!.id);
  const journeyMapValidationData = {
    id: data.id,
    name: data.name,
    phases: data.phases.map((p) => ({
      id: p.id,
      title: p.title,
      timeframe: p.timeframe,
      actions: p.actions.map((a) => ({
        id: a.id,
        title: a.title,
        description: a.description,
        thought: a.thought,
        channel: a.channel,
        touchpoint: a.touchpoint,
        emotion: a.emotion,
        painPoints: a.painPoints,
        opportunities: a.opportunities,
        quotes: a.quotes,
      })),
    })),
  };

  const handleSave = async () => {
    const result = await cache.syncNow();
    if (result.success) {
      // optional: show toast "Saved"
    } else {
      // optional: show toast "Save failed"
    }
  };

  return (
    <div className="relative flex h-full flex-col bg-[var(--bg-panel)]">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-panel)] px-4">
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-medium text-[var(--text-primary)]" style={{ fontSize: "var(--font-size-action)" }}>
            {data.name}
          </h1>
          {data.personaRef ? (
            <p className="truncate text-[var(--text-muted)]" style={{ fontSize: "var(--font-size-meta)" }}>
              <span className="font-medium">{data.personaRef.name}</span>
              {data.personaRef.shortDescription && <span className="ml-1 opacity-70">— {data.personaRef.shortDescription}</span>}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <SelectModeToolbar allActionIds={allActionIds} />
          <PersonaSelector journeyMapId={journeyMapId} currentPersonaId={data.personaId} personas={project.personas} projectId={projectId} />
          <InsightsStrip lowestEmotionAction={lowestEmotionAction} highestEmotionAction={highestEmotionAction} totalQuotes={totalQuotes} />
          {data.phases.length > 0 && (
            <button
              type="button"
              onClick={() => setSuggestBlueprintOpen(true)}
              className="flex items-center gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
            >
              <AppIcon name="blueprint" size="xs" />
              Suggest blueprint
            </button>
          )}
          <JourneyMapInsightsControls journeyMapData={journeyMapValidationData} />
          <CompletenessButton artifactType="journeyMap" data={journeyMapValidationData} />
          <div className="h-6 w-px bg-[var(--border-subtle)]" />
          <HideCommentsButton />
          <button
            type="button"
            onClick={handleSave}
            disabled={cache.syncStatus === "saving" || !cache.dirty}
            className="rounded border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] px-2 py-1 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] disabled:opacity-50"
          >
            {cache.syncStatus === "saving" ? "Saving…" : cache.syncStatus === "saved" ? "Saved" : cache.dirty ? "Save" : "Saved"}
          </button>
          <ShareButton projectId={projectId} itemType="journey-map" itemId={journeyMapId} itemName={data.name} size="sm" />
          <HeaderZoomControls />
          <ExportButton
            projectId={projectId}
            journeyMaps={project.journeyMaps}
            blueprints={project.serviceBlueprints}
            personas={project.personas.map((p) => ({ id: p.id, name: p.name }))}
            defaultSelectedId={journeyMapId}
            defaultSelectedType="journeyMap"
            size="sm"
          />
        </div>
      </header>

      {suggestBlueprintOpen && (
        <SuggestBlueprintModal
          projectId={projectId}
          journeyData={journeyMapValidationData}
          onClose={() => setSuggestBlueprintOpen(false)}
        />
      )}

      <JourneyMapCanvasContent>
        {data.phases.length === 0 ? (
          <AddFirstPhaseCard journeyMapId={journeyMapId} />
        ) : (
          <>
            <CommentableGridHandler>
              <div
                className="grid rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)]"
                style={{
                  gridTemplateColumns: `${LABEL_COLUMN_WIDTH}px repeat(${totalActionColumns}, ${ACTION_COLUMN_WIDTH}px)`,
                  overflow: "visible",
                }}
              >
                <div className="sticky left-0 top-0 z-30 rounded-tl-md border-b border-r border-[var(--border-subtle)] bg-[var(--bg-header)]" />
                {data.phases.map((phase, phaseIdx) => {
                  const colSpan = Math.max(phase.actions.length, 1);
                  const isLast = phaseIdx === data.phases.length - 1;
                  return (
                    <PhaseHeader key={`phase-header-${phase.id}`} phase={phase} journeyMapId={journeyMapId} colSpan={colSpan} isLast={isLast} />
                  );
                })}
                <div
                  className="sticky left-0 top-[38px] z-30 flex items-center border-b border-r border-[var(--border-subtle)] bg-[var(--bg-header)] px-3 py-1.5 font-medium uppercase tracking-wider text-[var(--text-muted)]"
                  style={{ fontSize: "10px", letterSpacing: "0.05em" }}
                >
                  Action
                </div>
                {actionColumns.map((col) => (
                  <ActionColumnHeader
                    key={`action-header-${col.action?.id ?? `empty-${col.phase.id}-${col.index}`}`}
                    action={col.action}
                    phase={col.phase}
                    isPlaceholder={col.isPlaceholder}
                    index={col.index}
                  />
                ))}
                {ROWS_BEFORE_TREND.map((row) => (
                  <GridRow
                    key={row.key}
                    row={row}
                    actionColumns={actionColumns}
                    labelWidth={LABEL_COLUMN_WIDTH}
                    channelOptions={channelOptions}
                    touchpointOptions={touchpointOptions}
                    journeyMapId={journeyMapId}
                    isDemo={isDemo}
                  />
                ))}
                <EmotionTrendRow
                  actionColumns={actionColumns.map((col) => ({
                    action: col.action ? { id: col.action.id, title: col.action.title, emotion: col.action.emotion, quotes: col.action.quotes } : null,
                    index: col.index,
                    isPlaceholder: col.isPlaceholder,
                  }))}
                  columnWidth={ACTION_COLUMN_WIDTH}
                />
                {ROWS_AFTER_TREND.map((row, rowIdx) => (
                  <GridRow
                    key={row.key}
                    row={row}
                    actionColumns={actionColumns}
                    labelWidth={LABEL_COLUMN_WIDTH}
                    channelOptions={channelOptions}
                    touchpointOptions={touchpointOptions}
                    journeyMapId={journeyMapId}
                    isLast={rowIdx === ROWS_AFTER_TREND.length - 1}
                    isDemo={isDemo}
                  />
                ))}
              </div>
            </CommentableGridHandler>
            <p className="mt-3 text-center text-[var(--text-muted)]" style={{ fontSize: "var(--font-size-meta)" }}>
              Hover headers to add phases and actions • Click cells to edit
            </p>
          </>
        )}
      </JourneyMapCanvasContent>
    </div>
  );
}
