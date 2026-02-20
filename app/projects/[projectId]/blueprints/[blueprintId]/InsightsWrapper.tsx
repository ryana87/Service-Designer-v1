"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  InsightsToggleButton,
  InsightsDrawer,
} from "../../../../components/InsightsPanel";
import {
  validateBlueprint,
  type Insight,
  type BlueprintData,
} from "../../../../lib/validation";
import { scoreBlueprint } from "../../../../lib/blueprint-scoring";

// ============================================
// BLUEPRINT INSIGHTS CONTEXT
// ============================================

type BlueprintInsightsContextType = {
  insights: Insight[];
  dismissedIds: Set<string>;
  dismissInsight: (id: string) => void;
  getElementInsights: (elementId: string) => Insight[];
};

const BlueprintInsightsContext = React.createContext<BlueprintInsightsContextType | null>(null);

export function useBlueprintInsights() {
  const ctx = React.useContext(BlueprintInsightsContext);
  if (!ctx) {
    // Return a no-op context for components that might be rendered outside the provider
    return {
      insights: [],
      dismissedIds: new Set<string>(),
      dismissInsight: () => {},
      getElementInsights: () => [],
    };
  }
  return ctx;
}

// ============================================
// BLUEPRINT INSIGHTS PROVIDER
// ============================================

type BlueprintInsightsProviderProps = {
  blueprintData: BlueprintData;
  children: React.ReactNode;
};

export function BlueprintInsightsProvider({
  blueprintData,
  children,
}: BlueprintInsightsProviderProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Compute insights from data
  const insights = useMemo(() => {
    const rawInsights = validateBlueprint(blueprintData);
    return rawInsights.map(i => ({
      ...i,
      dismissed: dismissedIds.has(i.id),
    }));
  }, [blueprintData, dismissedIds]);

  const dismissInsight = useCallback((id: string) => {
    setDismissedIds(prev => new Set([...prev, id]));
  }, []);

  const getElementInsights = useCallback(
    (elementId: string) => {
      return insights.filter(i => i.elementId === elementId && !i.dismissed);
    },
    [insights]
  );

  const value = useMemo(
    () => ({
      insights,
      dismissedIds,
      dismissInsight,
      getElementInsights,
    }),
    [insights, dismissedIds, dismissInsight, getElementInsights]
  );

  return (
    <BlueprintInsightsContext.Provider value={value}>
      {children}
    </BlueprintInsightsContext.Provider>
  );
}

// ============================================
// BLUEPRINT SCORES STRIP
// ============================================

export function BlueprintScoresStrip({
  blueprintData,
}: {
  blueprintData: BlueprintData;
}) {
  const scores = React.useMemo(() => scoreBlueprint(blueprintData), [blueprintData]);
  return (
    <div
      className="flex items-center gap-3 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] px-3 py-1.5"
      style={{ fontSize: "var(--font-size-meta)" }}
      title="Automation opportunity (0–100), Risk of rework, Cross-team handoffs"
    >
      <span className="text-[var(--text-muted)]">
        Automation: <strong className="text-[var(--text-primary)]">{scores.automationOpportunity}</strong>
      </span>
      <span className="text-[var(--text-muted)]">
        Rework: <strong className="text-[var(--text-primary)]">{scores.riskOfRework}</strong>
      </span>
      <span className="text-[var(--text-muted)]">
        Handoffs: <strong className="text-[var(--text-primary)]">{scores.handoffDensity}</strong>
      </span>
    </div>
  );
}

// ============================================
// INSIGHTS HEADER CONTROLS
// ============================================

export function BlueprintInsightsControls({
  blueprintData,
}: {
  blueprintData: BlueprintData;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const insights = useMemo(() => {
    const rawInsights = validateBlueprint(blueprintData);
    return rawInsights.map(i => ({
      ...i,
      dismissed: dismissedIds.has(i.id),
    }));
  }, [blueprintData, dismissedIds]);

  const handleDismiss = useCallback((id: string) => {
    setDismissedIds(prev => new Set([...prev, id]));
  }, []);

  const handleNavigate = useCallback((elementId: string, elementType: string) => {
    // Navigate to the element
    const element = document.getElementById(`element-${elementId}`) 
      || document.querySelector(`[data-card-id="${elementId}"]`)
      || document.querySelector(`[data-column-id="${elementId}"]`);
    
    if (element) {
      element.scrollIntoView({ behavior: "smooth", inline: "center", block: "center" });
      // Flash the element briefly
      element.classList.add("ring-2", "ring-[var(--accent-primary)]");
      setTimeout(() => {
        element.classList.remove("ring-2", "ring-[var(--accent-primary)]");
      }, 2000);
    }
    setIsOpen(false);
  }, []);

  return (
    <>
      <InsightsToggleButton
        insights={insights}
        isOpen={isOpen}
        onClick={() => setIsOpen(!isOpen)}
      />
      
      {/* Drawer portal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          <div className="h-full animate-slide-in-right">
            <InsightsDrawer
              insights={insights}
              isOpen={isOpen}
              onClose={() => setIsOpen(false)}
              onDismiss={handleDismiss}
              onNavigate={handleNavigate}
            />
          </div>
        </div>
      )}
    </>
  );
}

// ============================================
// INLINE WARNING INDICATOR FOR CARDS
// ============================================

export function BlueprintWarningDot({
  elementId,
  size = "sm",
}: {
  elementId: string;
  size?: "xs" | "sm";
}) {
  const { insights } = useBlueprintInsights();
  
  const elementInsights = insights.filter(
    i => i.elementId === elementId && !i.dismissed
  );
  
  if (elementInsights.length === 0) return null;

  const hasWarning = elementInsights.some(i => i.severity === "warning");
  const bgColor = hasWarning ? "var(--emotion-2)" : "var(--accent-primary)";
  
  const sizeClasses = size === "xs" 
    ? "h-2 w-2" 
    : "h-2.5 w-2.5";
  
  return (
    <span
      className={`${sizeClasses} inline-flex shrink-0 rounded-full`}
      style={{ backgroundColor: bgColor }}
      title={`${elementInsights.length} issue${elementInsights.length !== 1 ? "s" : ""}`}
    />
  );
}
