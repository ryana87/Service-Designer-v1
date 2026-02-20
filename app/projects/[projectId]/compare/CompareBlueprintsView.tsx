"use client";

import React, { useState, useRef, useCallback } from "react";
import { AppIcon } from "../../../components/Icon";
import { WhatChangedButtonAndModal } from "./WhatChangedButtonAndModal";

type BlueprintData = {
  id: string;
  name: string;
  phases: {
    id: string;
    title: string;
    timeframe: string | null;
    columns: {
      id: string;
      order: number;
      basicCards: { id: string; title: string; laneType: string }[];
      teamSections: { laneType: string; team: { name: string }; cards: { id: string; title: string }[] }[];
      decisionCards: { id: string; title: string; laneType: string }[];
    }[];
  }[];
};

const LANE_CONFIG = [
  { type: "PHYSICAL_EVIDENCE", label: "Physical Evidence" },
  { type: "CUSTOMER_ACTION", label: "Customer Action" },
  { type: "FRONTSTAGE_ACTION", label: "Frontstage" },
  { type: "BACKSTAGE_ACTION", label: "Backstage" },
  { type: "SUPPORT_PROCESS", label: "Support Process" },
];

export function CompareBlueprintsView({
  projectId,
  left,
  right,
  leftLabel,
  rightLabel,
}: {
  projectId: string;
  left: BlueprintData;
  right: BlueprintData;
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

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-panel)] px-4">
        <h1 className="font-medium text-[var(--text-primary)]" style={{ fontSize: "var(--font-size-action)" }}>
          Compare Service Blueprints
        </h1>
        <div className="flex items-center gap-2">
          <WhatChangedButtonAndModal
            projectId={projectId}
            leftId={left.id}
            rightId={right.id}
            type="blueprint"
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
          <div ref={leftRef} className="min-h-0 min-w-0 flex-1 overflow-auto p-4" onScroll={() => syncScroll("left")}>
            <BlueprintPanel bp={left} />
          </div>
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="shrink-0 border-b border-[var(--border-subtle)] bg-[var(--bg-header)] px-3 py-2 font-medium text-[var(--text-muted)]" style={{ fontSize: "var(--font-size-meta)" }}>
            {rightLabel} — {right.name}
          </div>
          <div ref={rightRef} className="min-h-0 min-w-0 flex-1 overflow-auto p-4" onScroll={() => syncScroll("right")}>
            <BlueprintPanel bp={right} />
          </div>
        </div>
      </div>
    </div>
  );
}

function BlueprintPanel({ bp }: { bp: BlueprintData }) {
  const colWidth = 140;
  const labelWidth = 140;
  return (
    <div className="inline-flex min-w-max flex-col rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)]">
      {/* Phase headers */}
      <div className="flex">
        <div className="shrink-0 border-r border-[var(--border-subtle)] bg-[var(--bg-phase-header)] p-2" style={{ width: labelWidth }} />
        {bp.phases.map((phase) => (
          <div
            key={phase.id}
            className="shrink-0 border-b border-r border-[var(--bg-phase-header-border)] bg-[var(--bg-phase-header)] px-3 py-2"
            style={{ width: phase.columns.length * colWidth }}
          >
            <div className="font-semibold text-white" style={{ fontSize: "var(--font-size-phase)" }}>{phase.title}</div>
            {phase.timeframe && <div className="text-xs text-white/70">{phase.timeframe}</div>}
          </div>
        ))}
      </div>
      {/* Column labels */}
      <div className="flex">
        <div className="shrink-0 border-r border-[var(--border-subtle)] bg-[var(--bg-phase-header)] p-1 text-center text-[9px] text-white/80" style={{ width: labelWidth }}>Step</div>
        {bp.phases.flatMap((phase) =>
          phase.columns.map((col, i) => (
            <div
              key={col.id}
              className="shrink-0 border-b border-r border-[var(--bg-phase-header-border)] bg-[var(--bg-phase-header)] p-1 text-center text-[9px] text-white/80"
              style={{ width: colWidth }}
            >
              {phase.columns.length > 1 ? i + 1 : ""}
            </div>
          ))
        )}
      </div>
      {/* Lane rows */}
      {LANE_CONFIG.map((lane) => (
        <div key={lane.type} className="flex">
          <div
            className="shrink-0 border-b border-r border-[var(--border-subtle)] bg-[var(--bg-sidebar)] p-2"
            style={{ width: labelWidth, minHeight: 80 }}
          >
            <span className="font-medium text-[var(--text-muted)]" style={{ fontSize: "var(--font-size-meta)" }}>
              {lane.label}
            </span>
          </div>
          {bp.phases.flatMap((phase) =>
            phase.columns.map((col) => {
              const isComplex = lane.type === "FRONTSTAGE_ACTION" || lane.type === "BACKSTAGE_ACTION";
              const cards = isComplex
                ? col.teamSections
                    .filter((ts) => ts.laneType === lane.type)
                    .flatMap((ts) => ts.cards)
                : [
                    ...col.basicCards.filter((c) => c.laneType === lane.type),
                    ...(col.decisionCards?.filter((c) => c.laneType === lane.type) ?? []),
                  ];
              return (
                <div
                  key={col.id}
                  className="shrink-0 border-b border-r border-[var(--border-muted)] bg-[var(--bg-panel)] p-2"
                  style={{ width: colWidth, minHeight: 80 }}
                >
                  <div className="flex flex-col gap-1">
                    {cards.map((card) => (
                      <div key={card.id} className="rounded border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] px-2 py-1 text-xs">
                        {card.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ))}
    </div>
  );
}
