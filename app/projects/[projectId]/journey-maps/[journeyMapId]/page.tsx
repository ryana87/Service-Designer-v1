import { notFound } from "next/navigation";
import { prisma } from "../../../../lib/db";
import { AppShell, ProjectSidebar } from "../../../../components/AppShell";
import { ExportButton } from "../../../../components/ExportButton";
import ShareButton from "../../../../components/ShareButton";
import { CommentProvider } from "../../../../contexts/CommentContext";
import { CommentMenuRenderer } from "../../../../components/CommentMenuRenderer";
import { HideCommentsButton } from "../../../../components/HideCommentsButton";
import { CommentableCell } from "../../../../components/CommentableCell";
import { CommentableGridHandler } from "../../../../components/CommentableGridHandler";
import { CanvasWithMinimap } from "./CanvasWithMinimap";
import { HeaderZoomControls } from "./HeaderZoomControls";
import { JourneyMapCanvasContent } from "./JourneyMapCanvasContent";
import {
  OverlayProvider,
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
  PersonaSelector,
} from "./components";
import {
  DEFAULT_CHANNEL_OPTIONS,
  DEFAULT_TOUCHPOINT_OPTIONS,
} from "./shared";
import { JourneyMapInsightsControls } from "./InsightsWrapper";
import { CompletenessButton } from "../../../../components/CompletenessButton";
import { DEMO_PROJECT_ID } from "../../../../demo/constants";
import { SelectModeProvider } from "../../../../contexts/SelectModeContext";

type PageProps = {
  params: Promise<{ projectId: string; journeyMapId: string }>;
};

type Phase = {
  id: string;
  order: number;
  title: string;
  timeframe: string | null;
  actions: Action[];
};

type Action = {
  id: string;
  order: number;
  title: string;
  description: string | null;
  thought: string | null;
  channel: string | null;
  touchpoint: string | null;
  emotion: number | null;
  painPoints: string | null;
  opportunities: string | null;
  thumbnailUrl: string | null;
  quotes: Quote[];
};

type Quote = {
  id: string;
  quoteText: string;
  source: string | null;
};

type CustomOption = {
  id: string;
  label: string;
  iconName: string;
};

// Fixed column widths for alignment
const LABEL_COLUMN_WIDTH = 110;
const ACTION_COLUMN_WIDTH = 160;

export default async function JourneyMapDetailPage({ params }: PageProps) {
  const { projectId, journeyMapId } = await params;
  
  // Check if this is the demo project
  const isDemo = projectId === DEMO_PROJECT_ID;

  const journeyMap = await prisma.journeyMap.findUnique({
    where: { id: journeyMapId },
    include: {
      project: {
        include: {
          journeyMaps: {
            select: { id: true, name: true },
            orderBy: { sortOrder: "asc" },
          },
          serviceBlueprints: {
            select: { id: true, name: true },
            orderBy: { sortOrder: "asc" },
          },
          personas: {
            orderBy: { createdAt: "asc" },
          },
        },
      },
      personaRef: true,
      phases: {
        orderBy: { order: "asc" },
        include: {
          actions: {
            orderBy: { order: "asc" },
            include: {
              quotes: {
                orderBy: { createdAt: "desc" },
              },
            },
          },
        },
      },
      customChannels: {
        orderBy: { createdAt: "asc" },
      },
      customTouchpoints: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!journeyMap || journeyMap.projectId !== projectId) {
    notFound();
  }

  // Build channel options: defaults + custom
  const channelOptions = [
    ...DEFAULT_CHANNEL_OPTIONS,
    ...journeyMap.customChannels.map((c) => ({
      value: c.label,
      label: c.label,
      icon: c.iconName,
      isCustom: true,
    })),
  ];

  // Build touchpoint options: defaults + custom
  const touchpointOptions = [
    ...DEFAULT_TOUCHPOINT_OPTIONS,
    ...journeyMap.customTouchpoints.map((t) => ({
      value: t.label,
      label: t.label,
      icon: t.iconName,
      isCustom: true,
    })),
  ];

  const totalActionColumns = journeyMap.phases.reduce(
    (sum, phase) => sum + Math.max(phase.actions.length, 1),
    0
  );

  type ActionColumn = {
    phase: Phase;
    action: Action | null;
    isPlaceholder: boolean;
    index: number;
  };
  const actionColumns: ActionColumn[] = [];
  let actionIndex = 0;
  for (const phase of journeyMap.phases) {
    if (phase.actions.length === 0) {
      actionColumns.push({
        phase,
        action: null,
        isPlaceholder: true,
        index: actionIndex++,
      });
    } else {
      for (const action of phase.actions) {
        actionColumns.push({
          phase,
          action,
          isPlaceholder: false,
          index: actionIndex++,
        });
      }
    }
  }

  const actionsWithEmotion = actionColumns.filter(
    (col): col is ActionColumn & { action: Action } =>
      col.action !== null && col.action.emotion !== null
  );

  const lowestEmotionAction =
    actionsWithEmotion.length > 0
      ? actionsWithEmotion.reduce((min, col) =>
          col.action.emotion! < min.action.emotion! ? col : min
        )
      : null;

  const highestEmotionAction =
    actionsWithEmotion.length > 0
      ? actionsWithEmotion.reduce((max, col) =>
          col.action.emotion! > max.action.emotion! ? col : max
        )
      : null;

  const totalQuotes = actionColumns.reduce(
    (sum, col) => sum + (col.action?.quotes.length ?? 0),
    0
  );

  // Build data for validation
  const journeyMapValidationData = {
    id: journeyMap.id,
    name: journeyMap.name,
    phases: journeyMap.phases.map(phase => ({
      id: phase.id,
      title: phase.title,
      timeframe: phase.timeframe,
      actions: phase.actions.map(action => ({
        id: action.id,
        title: action.title,
        description: action.description,
        thought: action.thought,
        channel: action.channel,
        touchpoint: action.touchpoint,
        emotion: action.emotion,
        painPoints: action.painPoints,
        opportunities: action.opportunities,
        quotes: action.quotes,
      })),
    })),
  };

  type RowDef = {
    key: string;
    label: string;
    type: "text" | "textarea" | "select" | "emotion" | "thumbnail" | "channel" | "touchpoint" | "painPoints" | "opportunities";
    placeholder?: string;
  };

  const ROWS_BEFORE_TREND: RowDef[] = [
    {
      key: "description",
      label: "Description",
      type: "textarea",
      placeholder: "Describe what happens...",
    },
    { key: "thumbnail", label: "Thumbnail", type: "thumbnail" },
    {
      key: "thought",
      label: "Thought",
      type: "text",
      placeholder: "What are they thinking?",
    },
    { key: "channel", label: "Channel", type: "channel" },
    { key: "touchpoint", label: "Touchpoint", type: "touchpoint" },
    { key: "emotion", label: "Emotion", type: "emotion" },
  ];

  const ROWS_AFTER_TREND: RowDef[] = [
    {
      key: "painPoints",
      label: "Pain Points",
      type: "painPoints",
    },
    {
      key: "opportunities",
      label: "Opportunities",
      type: "opportunities",
    },
  ];

  const allActionIds = actionColumns
    .filter((col) => col.action)
    .map((col) => col.action!.id);

  return (
    <OverlayProvider journeyMapId={journeyMapId}>
      <SelectModeProvider>
      <AppShell
        projectSidebar={
          <ProjectSidebar
            projectId={projectId}
            projectName={journeyMap.project.name}
            journeyMaps={journeyMap.project.journeyMaps}
            blueprints={journeyMap.project.serviceBlueprints}
            personas={journeyMap.project.personas.map(p => ({
              id: p.id,
              name: p.name,
              shortDescription: p.shortDescription,
            }))}
            currentItemId={journeyMapId}
            currentItemType="journeyMap"
          />
        }
      >
        <CanvasWithMinimap>
          <CommentProvider>
          <CommentMenuRenderer />
          <div className="relative flex h-full flex-col bg-[var(--bg-panel)]">
            {/* Canvas header */}
            <header className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-panel)] px-4">
            <div className="min-w-0 flex-1">
              <h1
                className="truncate font-medium text-[var(--text-primary)]"
                style={{ fontSize: "var(--font-size-action)" }}
              >
                {journeyMap.name}
              </h1>
              {/* Show persona reference if available, otherwise fallback to legacy persona text */}
              {journeyMap.personaRef ? (
                <p
                  className="truncate text-[var(--text-muted)]"
                  style={{ fontSize: "var(--font-size-meta)" }}
                >
                  <span className="font-medium">{journeyMap.personaRef.name}</span>
                  {journeyMap.personaRef.shortDescription && (
                    <span className="ml-1 opacity-70">— {journeyMap.personaRef.shortDescription}</span>
                  )}
                </p>
              ) : journeyMap.persona ? (
                <p
                  className="truncate text-[var(--text-muted)]"
                  style={{ fontSize: "var(--font-size-meta)" }}
                >
                  Persona: {journeyMap.persona}
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-3">
              <SelectModeToolbar allActionIds={allActionIds} />
              <PersonaSelector
                journeyMapId={journeyMapId}
                currentPersonaId={journeyMap.personaId}
                personas={journeyMap.project.personas}
                projectId={projectId}
              />
              <InsightsStrip
                lowestEmotionAction={lowestEmotionAction}
                highestEmotionAction={highestEmotionAction}
                totalQuotes={totalQuotes}
              />
              <JourneyMapInsightsControls journeyMapData={journeyMapValidationData} />
              <CompletenessButton artifactType="journeyMap" data={journeyMapValidationData} />
              <div className="h-6 w-px bg-[var(--border-subtle)]" />
              <HideCommentsButton />
              <ShareButton
                projectId={projectId}
                itemType="journey-map"
                itemId={journeyMapId}
                itemName={journeyMap.name}
                size="sm"
              />
              <HeaderZoomControls />
              <ExportButton
                projectId={projectId}
                journeyMaps={journeyMap.project.journeyMaps.map((m) => ({
                  id: m.id,
                  name: m.name,
                }))}
                blueprints={journeyMap.project.serviceBlueprints.map((b) => ({
                  id: b.id,
                  name: b.name,
                }))}
                personas={journeyMap.project.personas.map((p) => ({
                  id: p.id,
                  name: p.name,
                }))}
                defaultSelectedId={journeyMapId}
                defaultSelectedType="journeyMap"
                size="sm"
              />
            </div>
          </header>

          {/* Journey Map Content */}
          <JourneyMapCanvasContent>
            {journeyMap.phases.length === 0 ? (
              <AddFirstPhaseCard journeyMapId={journeyMapId} />
            ) : (
              <>
                {/* CSS Grid Table */}
                <CommentableGridHandler>
                <div
                  className="grid rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)]"
                  style={{
                    gridTemplateColumns: `${LABEL_COLUMN_WIDTH}px repeat(${totalActionColumns}, ${ACTION_COLUMN_WIDTH}px)`,
                    overflow: "visible",
                  }}
                >
                  {/* Row 1: Phase Header Band */}
                  <div className="sticky left-0 top-0 z-30 rounded-tl-md border-b border-r border-[var(--border-subtle)] bg-[var(--bg-header)]" />
                  {journeyMap.phases.map((phase, phaseIdx) => {
                    const colSpan = Math.max(phase.actions.length, 1);
                    const isLast = phaseIdx === journeyMap.phases.length - 1;
                    return (
                      <PhaseHeader
                        key={`phase-header-${phase.id}`}
                        phase={phase}
                        journeyMapId={journeyMapId}
                        colSpan={colSpan}
                        isLast={isLast}
                      />
                    );
                  })}

                  {/* Row 2: Action Title Headers */}
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

                  {/* Rows before Emotion Trend */}
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

                  {/* Emotion Trend Row */}
                  <EmotionTrendRow
                    actionColumns={actionColumns.map((col) => ({
                      action: col.action
                        ? {
                            id: col.action.id,
                            title: col.action.title,
                            emotion: col.action.emotion,
                            quotes: col.action.quotes,
                          }
                        : null,
                      index: col.index,
                      isPlaceholder: col.isPlaceholder,
                    }))}
                    columnWidth={ACTION_COLUMN_WIDTH}
                  />

                  {/* Rows after Emotion Trend */}
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

                {/* Footer hint */}
                <p
                  className="mt-3 text-center text-[var(--text-muted)]"
                  style={{ fontSize: "var(--font-size-meta)" }}
                >
                  Hover headers to add phases and actions • Click cells to edit
                </p>
              </>
            )}
          </JourneyMapCanvasContent>
          </div>
          </CommentProvider>
        </CanvasWithMinimap>
      </AppShell>
      </SelectModeProvider>
    </OverlayProvider>
  );
}

// ============================================
// INSIGHTS STRIP
// ============================================

function InsightsStrip({
  lowestEmotionAction,
  highestEmotionAction,
  totalQuotes,
}: {
  lowestEmotionAction: { action: Action; index: number } | null;
  highestEmotionAction: { action: Action; index: number } | null;
  totalQuotes: number;
}) {
  const emotionEmoji: Record<number, string> = {
    1: "😠",
    2: "😟",
    3: "😐",
    4: "🙂",
    5: "😊",
  };

  return (
    <div className="flex items-center gap-2">
      {lowestEmotionAction && (
        <a
          href={`#action-col-${lowestEmotionAction.index}`}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)]"
          style={{
            fontSize: "var(--font-size-meta)",
            background: "var(--emotion-1-tint)",
          }}
        >
          <span>{emotionEmoji[lowestEmotionAction.action.emotion!]}</span>
          <span className="max-w-[60px] truncate">
            {lowestEmotionAction.action.title}
          </span>
        </a>
      )}

      {highestEmotionAction && (
        <a
          href={`#action-col-${highestEmotionAction.index}`}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)]"
          style={{
            fontSize: "var(--font-size-meta)",
            background: "var(--emotion-5-tint)",
          }}
        >
          <span>{emotionEmoji[highestEmotionAction.action.emotion!]}</span>
          <span className="max-w-[60px] truncate">
            {highestEmotionAction.action.title}
          </span>
        </a>
      )}

      <div
        className="flex items-center gap-1 rounded-md bg-[var(--bg-sidebar)] px-2 py-1 text-[var(--text-muted)]"
        style={{ fontSize: "var(--font-size-meta)" }}
      >
        <span className="font-medium text-[var(--text-secondary)]">
          {totalQuotes}
        </span>
        <span>quotes</span>
      </div>
    </div>
  );
}

// ============================================
// GRID ROW
// ============================================

type RowDef = {
  key: string;
  label: string;
  type: "text" | "textarea" | "select" | "emotion" | "thumbnail" | "channel" | "touchpoint" | "painPoints" | "opportunities";
  placeholder?: string;
};

type SelectOption = {
  value: string;
  label: string;
  icon: string;
  isCustom?: boolean;
};

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
  actionColumns: {
    phase: { id: string };
    action: Action | null;
    isPlaceholder: boolean;
    index: number;
  }[];
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
        className={`sticky left-0 z-10 flex items-start border-r border-[var(--border-subtle)] bg-[var(--bg-header)] px-3 py-1.5 font-medium text-[var(--text-muted)] ${
          isLast ? "rounded-bl-md" : "border-b"
        }`}
        style={{
          minWidth: labelWidth,
          fontSize: "var(--font-size-label)",
          lineHeight: 1.4,
        }}
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

// ============================================
// DATA CELL
// ============================================

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
  action: Action | null;
  actionIndex?: number;
  isPlaceholder: boolean;
  isLast?: boolean;
  isLastCol?: boolean;
  channelOptions: SelectOption[];
  touchpointOptions: SelectOption[];
  journeyMapId: string;
  isDemo?: boolean;
}) {
  const baseClass = `px-3 py-1.5 ${isLast ? "" : "border-b"} ${
    isLastCol ? (isLast ? "rounded-br-md" : "") : "border-r"
  } border-[var(--border-subtle)] bg-[var(--bg-panel)]`;

  if (isPlaceholder || !action) {
    return (
      <div className={`${baseClass} bg-[var(--bg-sidebar)]`}>
        <span
          className="text-[var(--text-muted)] opacity-40"
          style={{ fontSize: "var(--font-size-cell)" }}
        >
          —
        </span>
      </div>
    );
  }

  if (row.type === "thumbnail") {
    return (
      <CommentableCell actionId={action.id} rowKey={row.key} className={baseClass}>
        <ThumbnailCell 
          actionId={action.id} 
          actionTitle={action.title}
          actionIndex={actionIndex}
          value={action.thumbnailUrl}
          isDemo={isDemo}
        />
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
        <ChannelCell
          actionId={action.id}
          value={action.channel}
          options={channelOptions}
          journeyMapId={journeyMapId}
        />
      </CommentableCell>
    );
  }

  if (row.type === "touchpoint") {
    return (
      <CommentableCell actionId={action.id} rowKey={row.key} className={baseClass}>
        <TouchpointCell
          actionId={action.id}
          value={action.touchpoint}
          options={touchpointOptions}
          journeyMapId={journeyMapId}
        />
      </CommentableCell>
    );
  }

  if (row.type === "painPoints") {
    return (
      <CommentableCell actionId={action.id} rowKey={row.key} className={baseClass}>
        <PainPointCell
          actionId={action.id}
          value={action.painPoints}
        />
      </CommentableCell>
    );
  }

  if (row.type === "opportunities") {
    return (
      <CommentableCell actionId={action.id} rowKey={row.key} className={baseClass}>
        <OpportunityCell
          actionId={action.id}
          value={action.opportunities}
          isDemo={isDemo}
        />
      </CommentableCell>
    );
  }

  const value = action[row.key as keyof Action] as string | null;

  return (
    <CommentableCell actionId={action.id} rowKey={row.key} className={baseClass}>
      <EditableCell
        actionId={action.id}
        field={row.key}
        value={value}
        type={row.type === "select" ? "select" : row.type}
        placeholder={row.placeholder}
      />
    </CommentableCell>
  );
}
