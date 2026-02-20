"use client";

import React, { useState, useRef, useCallback } from "react";
import { AppIcon } from "../../../components/Icon";
import { WhatChangedButtonAndModal } from "./WhatChangedButtonAndModal";

const LABEL_WIDTH = 110;
const COL_WIDTH = 160;

type ActionData = {
  id: string;
  title: string;
  description: string | null;
  thought: string | null;
  channel: string | null;
  touchpoint: string | null;
  emotion: number | null;
  painPoints: string | null;
  opportunities: string | null;
  thumbnailUrl: string | null;
};

type JourneyMapData = {
  id: string;
  name: string;
  phases: {
    id: string;
    title: string;
    timeframe: string | null;
    actions: ActionData[];
  }[];
};

export function CompareJourneyMapsView({
  projectId,
  left,
  right,
  leftLabel,
  rightLabel,
}: {
  projectId: string;
  left: JourneyMapData;
  right: JourneyMapData;
  leftLabel: string;
  rightLabel: string;
}) {
  const [scrollLock, setScrollLock] = useState(true);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const isSyncing = useRef(false);

  const syncScroll = useCallback((source: "left" | "right") => {
    if (!scrollLock || isSyncing.current) return;
    const src = source === "left" ? leftRef.current : rightRef.current;
    const dst = source === "left" ? rightRef.current : leftRef.current;
    if (!src || !dst) return;
    isSyncing.current = true;
    dst.scrollLeft = src.scrollLeft;
    dst.scrollTop = src.scrollTop;
    requestAnimationFrame(() => {
      isSyncing.current = false;
    });
  }, [scrollLock]);

  const handleLeftScroll = () => syncScroll("left");
  const handleRightScroll = () => syncScroll("right");

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-panel)] px-4">
        <h1 className="font-medium text-[var(--text-primary)]" style={{ fontSize: "var(--font-size-action)" }}>
          Compare Journey Maps
        </h1>
        <div className="flex items-center gap-2">
          <WhatChangedButtonAndModal
            projectId={projectId}
            leftId={left.id}
            rightId={right.id}
            type="journeyMap"
            leftLabel={leftLabel}
            rightLabel={rightLabel}
          />
          <button
            onClick={() => setScrollLock(!scrollLock)}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors ${
              scrollLock ? "bg-[var(--accent-primary)] text-white" : "bg-[var(--bg-sidebar)] text-[var(--text-muted)]"
            }`}
          >
            <AppIcon name={scrollLock ? "lock" : "lock_open"} size="xs" />
            {scrollLock ? "Scroll sync on" : "Scroll sync off"}
          </button>
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden sm:flex-row">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col border-r border-[var(--border-subtle)]">
          <div className="shrink-0 border-b border-[var(--border-subtle)] bg-[var(--bg-header)] px-3 py-2 font-medium text-[var(--text-muted)]" style={{ fontSize: "var(--font-size-meta)" }}>
            {leftLabel} — {left.name}
          </div>
          <div
            ref={leftRef}
            className="min-h-0 min-w-0 flex-1 overflow-auto p-4"
            onScroll={handleLeftScroll}
          >
            <JourneyMapPanel map={left} />
          </div>
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="shrink-0 border-b border-[var(--border-subtle)] bg-[var(--bg-header)] px-3 py-2 font-medium text-[var(--text-muted)]" style={{ fontSize: "var(--font-size-meta)" }}>
            {rightLabel} — {right.name}
          </div>
          <div
            ref={rightRef}
            className="min-h-0 min-w-0 flex-1 overflow-auto p-4"
            onScroll={handleRightScroll}
          >
            <JourneyMapPanel map={right} />
          </div>
        </div>
      </div>
    </div>
  );
}

const ROW_LABELS = [
  { key: "action", label: "Action" },
  { key: "description", label: "Description" },
  { key: "thumbnail", label: "Thumbnail" },
  { key: "thought", label: "Thought" },
  { key: "channel", label: "Channel" },
  { key: "touchpoint", label: "Touchpoint" },
  { key: "emotion", label: "Emotion" },
  { key: "painPoints", label: "Pain Points" },
  { key: "opportunities", label: "Opportunities" },
];

function JourneyMapPanel({ map }: { map: JourneyMapData }) {
  const actionColumns = map.phases.flatMap((phase) =>
    phase.actions.length
      ? phase.actions
      : [{ id: `empty-${phase.id}`, title: "—", description: null, thought: null, channel: null, touchpoint: null, emotion: null, painPoints: null, opportunities: null, thumbnailUrl: null }]
  );
  const totalCols = actionColumns.length;

  const getCellValue = (action: ActionData, key: string): string => {
    switch (key) {
      case "action":
        return action.title;
      case "description":
        return action.description ?? "—";
      case "thought":
        return action.thought ?? "—";
      case "channel":
        return action.channel ?? "—";
      case "touchpoint":
        return action.touchpoint ?? "—";
      case "emotion":
        return action.emotion != null ? String(action.emotion) : "—";
      case "painPoints":
        return action.painPoints ?? "—";
      case "opportunities":
        return action.opportunities ?? "—";
      default:
        return "—";
    }
  };

  return (
    <div
      className="inline-grid min-w-max rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)]"
      style={{ gridTemplateColumns: `${LABEL_WIDTH}px repeat(${totalCols}, ${COL_WIDTH}px)` }}
    >
      {/* Row 1: Phase headers */}
      <div className="border-b border-r border-[var(--border-subtle)] bg-[var(--bg-header)] p-2" />
      {map.phases.map((phase) => (
        <div
          key={phase.id}
          className="border-b border-r border-[var(--border-subtle)] bg-[var(--bg-phase-header)] px-3 py-2"
          style={{ gridColumn: `span ${Math.max(phase.actions.length, 1)}` }}
        >
          <div className="font-semibold text-white" style={{ fontSize: "var(--font-size-phase)" }}>{phase.title}</div>
          {phase.timeframe && <div className="text-xs text-white/70">{phase.timeframe}</div>}
        </div>
      ))}
      {/* Data rows */}
      {ROW_LABELS.map((row) => (
        <React.Fragment key={row.key}>
          <div className="border-b border-r border-[var(--border-subtle)] bg-[var(--bg-header)] p-2 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            {row.label}
          </div>
          {actionColumns.map((action) =>
            row.key === "thumbnail" ? (
              <div key={action.id} className="border-b border-r border-[var(--border-subtle)] bg-[var(--bg-panel)] p-2" style={{ fontSize: "var(--font-size-cell)" }}>
                {action.thumbnailUrl ? (
                  <img src={action.thumbnailUrl} alt="" className="h-12 w-12 rounded object-cover" />
                ) : (
                  "—"
                )}
              </div>
            ) : (
              <div
                key={action.id}
                className="border-b border-r border-[var(--border-subtle)] bg-[var(--bg-panel)] p-2 line-clamp-3"
                style={{ fontSize: "var(--font-size-cell)" }}
                title={getCellValue(action, row.key)}
              >
                {getCellValue(action, row.key)}
              </div>
            )
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
