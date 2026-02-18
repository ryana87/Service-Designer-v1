"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  InsightsToggleButton,
  InsightsDrawer,
  WarningIndicator,
} from "../../../../components/InsightsPanel";
import {
  validateJourneyMap,
  type Insight,
  type JourneyMapData,
} from "../../../../lib/validation";

// ============================================
// JOURNEY MAP INSIGHTS CONTEXT
// ============================================

type JourneyMapInsightsContextType = {
  insights: Insight[];
  dismissedIds: Set<string>;
  dismissInsight: (id: string) => void;
  getElementInsights: (elementId: string) => Insight[];
};

const JourneyMapInsightsContext = React.createContext<JourneyMapInsightsContextType | null>(null);

export function useJourneyMapInsights() {
  const ctx = React.useContext(JourneyMapInsightsContext);
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
// JOURNEY MAP INSIGHTS PROVIDER
// ============================================

type JourneyMapInsightsProviderProps = {
  journeyMapData: JourneyMapData;
  children: React.ReactNode;
};

export function JourneyMapInsightsProvider({
  journeyMapData,
  children,
}: JourneyMapInsightsProviderProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Compute insights from data
  const insights = useMemo(() => {
    const rawInsights = validateJourneyMap(journeyMapData);
    return rawInsights.map(i => ({
      ...i,
      dismissed: dismissedIds.has(i.id),
    }));
  }, [journeyMapData, dismissedIds]);

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
    <JourneyMapInsightsContext.Provider value={value}>
      {children}
    </JourneyMapInsightsContext.Provider>
  );
}

// ============================================
// INSIGHTS HEADER CONTROLS
// ============================================

export function JourneyMapInsightsControls({
  journeyMapData,
}: {
  journeyMapData: JourneyMapData;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const insights = useMemo(() => {
    const rawInsights = validateJourneyMap(journeyMapData);
    return rawInsights.map(i => ({
      ...i,
      dismissed: dismissedIds.has(i.id),
    }));
  }, [journeyMapData, dismissedIds]);

  const handleDismiss = useCallback((id: string) => {
    setDismissedIds(prev => new Set([...prev, id]));
  }, []);

  const handleNavigate = useCallback((elementId: string, elementType: string) => {
    // Navigate to the element - for now, just scroll to it if it's an action
    if (elementType === "action" || elementType === "phase") {
      const element = document.getElementById(`element-${elementId}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", inline: "center", block: "center" });
        // Flash the element briefly
        element.classList.add("ring-2", "ring-[var(--accent-primary)]");
        setTimeout(() => {
          element.classList.remove("ring-2", "ring-[var(--accent-primary)]");
        }, 2000);
      }
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
// INLINE WARNING INDICATOR
// ============================================

export function JourneyMapWarningDot({
  elementId,
  size = "sm",
}: {
  elementId: string;
  size?: "xs" | "sm";
}) {
  const { insights } = useJourneyMapInsights();
  
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
