"use client";

import React, { useState, useCallback } from "react";
import { AppIcon } from "./Icon";
import type { Insight, InsightSeverity } from "../lib/validation";

// ============================================
// INSIGHTS PANEL COMPONENT
// ============================================

type InsightsPanelProps = {
  insights: Insight[];
  onDismiss?: (insightId: string) => void;
  onNavigate?: (elementId: string, elementType: string) => void;
};

export function InsightsPanel({ insights, onDismiss, onNavigate }: InsightsPanelProps) {
  const [filter, setFilter] = useState<"all" | "warning" | "info">("all");
  
  const activeInsights = insights.filter(i => !i.dismissed);
  
  const filteredInsights = activeInsights.filter(i => {
    if (filter === "all") return true;
    return i.severity === filter;
  });

  const warningCount = activeInsights.filter(i => i.severity === "warning").length;
  const infoCount = activeInsights.filter(i => i.severity === "info").length;

  const getCategoryLabel = (category: Insight["category"]) => {
    switch (category) {
      case "structure": return "Structure";
      case "flow": return "Flow";
      case "content": return "Content";
      default: return category;
    }
  };

  const handleNavigate = (insight: Insight) => {
    if (insight.elementId && insight.elementType && onNavigate) {
      onNavigate(insight.elementId, insight.elementType);
    }
  };

  if (activeInsights.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--bg-sidebar)]">
          <AppIcon name="check_circle" className="text-[var(--emotion-5)]" />
        </div>
        <p
          className="font-medium text-[var(--text-primary)]"
          style={{ fontSize: "var(--font-size-cell)" }}
        >
          Looking good!
        </p>
        <p
          className="mt-1 text-[var(--text-muted)]"
          style={{ fontSize: "var(--font-size-meta)" }}
        >
          No issues detected
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Summary header */}
      <div className="border-b border-[var(--border-subtle)] p-3">
        <div className="flex items-center gap-2">
          <span
            className="font-medium text-[var(--text-primary)]"
            style={{ fontSize: "var(--font-size-cell)" }}
          >
            Insights
          </span>
          <span
            className="rounded-full bg-[var(--bg-sidebar)] px-2 py-0.5 text-[var(--text-muted)]"
            style={{ fontSize: "10px" }}
          >
            {activeInsights.length}
          </span>
        </div>
        
        {/* Filter tabs */}
        <div className="mt-2 flex gap-1">
          <FilterTab
            label="All"
            count={activeInsights.length}
            isActive={filter === "all"}
            onClick={() => setFilter("all")}
          />
          <FilterTab
            label="Warnings"
            count={warningCount}
            isActive={filter === "warning"}
            onClick={() => setFilter("warning")}
            severity="warning"
          />
          <FilterTab
            label="Info"
            count={infoCount}
            isActive={filter === "info"}
            onClick={() => setFilter("info")}
            severity="info"
          />
        </div>
      </div>

      {/* Insights list */}
      <div className="flex-1 overflow-y-auto">
        {filteredInsights.length === 0 ? (
          <div className="p-4 text-center">
            <p
              className="text-[var(--text-muted)]"
              style={{ fontSize: "var(--font-size-meta)" }}
            >
              No {filter === "warning" ? "warnings" : "info items"} to show
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-muted)]">
            {filteredInsights.map((insight) => (
              <InsightItem
                key={insight.id}
                insight={insight}
                onDismiss={onDismiss}
                onNavigate={() => handleNavigate(insight)}
                getCategoryLabel={getCategoryLabel}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// FILTER TAB
// ============================================

function FilterTab({
  label,
  count,
  isActive,
  onClick,
  severity,
}: {
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
  severity?: InsightSeverity;
}) {
  const getSeverityIndicator = () => {
    if (!severity) return null;
    if (severity === "warning") {
      return (
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: "var(--emotion-2)" }}
        />
      );
    }
    return (
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: "var(--accent-primary)" }}
      />
    );
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 rounded px-2 py-1 transition-colors ${
        isActive
          ? "bg-[var(--accent-primary)] text-white"
          : "text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
      }`}
      style={{ fontSize: "var(--font-size-meta)" }}
    >
      {getSeverityIndicator()}
      <span>{label}</span>
      <span className={isActive ? "opacity-75" : "opacity-50"}>({count})</span>
    </button>
  );
}

// ============================================
// INSIGHT ITEM
// ============================================

function InsightItem({
  insight,
  onDismiss,
  onNavigate,
  getCategoryLabel,
}: {
  insight: Insight;
  onDismiss?: (id: string) => void;
  onNavigate: () => void;
  getCategoryLabel: (category: Insight["category"]) => string;
}) {
  const getSeverityIcon = () => {
    if (insight.severity === "warning") {
      return (
        <span
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: "var(--emotion-2)", opacity: 0.2 }}
        >
          <AppIcon name="warning" size="xs" className="text-[var(--emotion-2)]" />
        </span>
      );
    }
    return (
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: "var(--accent-primary)", opacity: 0.15 }}
      >
        <AppIcon name="info" size="xs" className="text-[var(--accent-primary)]" />
      </span>
    );
  };

  return (
    <div className="group relative p-3 hover:bg-[var(--bg-hover)]">
      <div className="flex gap-2">
        {getSeverityIcon()}
        <div className="min-w-0 flex-1">
          <p
            className="text-[var(--text-primary)]"
            style={{ fontSize: "var(--font-size-cell)", lineHeight: 1.4 }}
          >
            {insight.message}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span
              className="rounded bg-[var(--bg-sidebar)] px-1.5 py-0.5 text-[var(--text-muted)]"
              style={{ fontSize: "9px" }}
            >
              {getCategoryLabel(insight.category)}
            </span>
            {insight.elementId && (
              <button
                onClick={onNavigate}
                className="flex items-center gap-0.5 text-[var(--accent-primary)] hover:underline"
                style={{ fontSize: "var(--font-size-meta)" }}
              >
                <AppIcon name="arrow_forward" size="xs" />
                Go to element
              </button>
            )}
          </div>
        </div>
      </div>
      
      {onDismiss && (
        <button
          onClick={() => onDismiss(insight.id)}
          className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded text-[var(--text-muted)] opacity-0 transition-opacity hover:bg-[var(--bg-sidebar)] hover:text-[var(--text-primary)] group-hover:opacity-100"
          title="Dismiss"
        >
          <AppIcon name="close" size="xs" />
        </button>
      )}
    </div>
  );
}

// ============================================
// INSIGHTS TOGGLE BUTTON
// ============================================

export function InsightsToggleButton({
  insights,
  isOpen,
  onClick,
}: {
  insights: Insight[];
  isOpen: boolean;
  onClick: () => void;
}) {
  const activeInsights = insights.filter(i => !i.dismissed);
  const warningCount = activeInsights.filter(i => i.severity === "warning").length;
  const hasWarnings = warningCount > 0;

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 transition-colors ${
        isOpen
          ? "bg-[var(--accent-primary)] text-white"
          : hasWarnings
            ? "bg-[var(--emotion-2-tint)] text-[var(--text-primary)] hover:bg-[var(--emotion-2)]"
            : "bg-[var(--bg-sidebar)] text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
      }`}
      style={{ fontSize: "var(--font-size-meta)" }}
      title={`${activeInsights.length} insight${activeInsights.length !== 1 ? "s" : ""}`}
    >
      <AppIcon name={hasWarnings ? "warning" : "lightbulb"} size="xs" />
      <span className="font-medium">Insights</span>
      {activeInsights.length > 0 && (
        <span
          className={`rounded-full px-1.5 py-0.5 ${
            isOpen
              ? "bg-white/20"
              : hasWarnings
                ? "bg-[var(--emotion-2)] text-white"
                : "bg-[var(--bg-panel)]"
          }`}
          style={{ fontSize: "10px" }}
        >
          {activeInsights.length}
        </span>
      )}
    </button>
  );
}

// ============================================
// WARNING INDICATOR (for inline use)
// ============================================

export function WarningIndicator({
  insights,
  elementId,
  showCount = false,
  size = "sm",
}: {
  insights: Insight[];
  elementId: string;
  showCount?: boolean;
  size?: "xs" | "sm";
}) {
  const elementInsights = insights.filter(
    i => i.elementId === elementId && !i.dismissed
  );
  
  if (elementInsights.length === 0) return null;

  const hasWarning = elementInsights.some(i => i.severity === "warning");
  const bgColor = hasWarning ? "var(--emotion-2)" : "var(--accent-primary)";
  
  const sizeClasses = size === "xs" 
    ? "h-3 w-3" 
    : "h-4 w-4";
  
  return (
    <div
      className={`${sizeClasses} flex shrink-0 items-center justify-center rounded-full`}
      style={{ backgroundColor: bgColor }}
      title={`${elementInsights.length} issue${elementInsights.length !== 1 ? "s" : ""}`}
    >
      {showCount && elementInsights.length > 1 ? (
        <span className="text-white" style={{ fontSize: "8px" }}>
          {elementInsights.length}
        </span>
      ) : (
        <span className="text-white" style={{ fontSize: size === "xs" ? "8px" : "10px" }}>
          !
        </span>
      )}
    </div>
  );
}

// ============================================
// INSIGHTS DRAWER (Collapsible Side Panel)
// ============================================

export function InsightsDrawer({
  insights,
  isOpen,
  onClose,
  onDismiss,
  onNavigate,
}: {
  insights: Insight[];
  isOpen: boolean;
  onClose: () => void;
  onDismiss?: (insightId: string) => void;
  onNavigate?: (elementId: string, elementType: string) => void;
}) {
  if (!isOpen) return null;

  return (
    <div
      className="flex h-full w-72 shrink-0 flex-col border-l border-[var(--border-subtle)] bg-[var(--bg-panel)]"
      style={{ maxWidth: 320 }}
    >
      {/* Header */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--border-subtle)] px-3">
        <div className="flex items-center gap-2">
          <AppIcon name="lightbulb" size="sm" className="text-[var(--text-muted)]" />
          <span
            className="font-medium text-[var(--text-primary)]"
            style={{ fontSize: "var(--font-size-action)" }}
          >
            Insights
          </span>
        </div>
        <button
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
        >
          <AppIcon name="close" size="xs" />
        </button>
      </div>

      {/* Panel content */}
      <InsightsPanel
        insights={insights}
        onDismiss={onDismiss}
        onNavigate={onNavigate}
      />
    </div>
  );
}
