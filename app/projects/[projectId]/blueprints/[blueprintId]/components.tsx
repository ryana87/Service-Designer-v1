"use client";

import React, { useState, useRef, useEffect, useCallback, createContext, useContext, useMemo } from "react";
import { AppIcon } from "../../../../components/Icon";
import { useUndo } from "../../../../contexts/UndoContext";
import { ExportButton } from "../../../../components/ExportButton";
import ShareButton from "../../../../components/ShareButton";
import { CompletenessButton } from "../../../../components/CompletenessButton";
import { Minimap } from "../../../../components/Minimap";
import { ZoomControls } from "../../../../components/ZoomControls";
import { useCanvasNavigation } from "../../../../components/useCanvasNavigation";
import { IconPicker } from "../../../../components/IconPicker";
import {
  TEAM_COLOR_TOKENS,
  SOFTWARE_COLOR_TOKENS,
  getContrastTextColor,
  type TeamColorToken,
  type SoftwareColorToken,
} from "../../../../lib/colorTokens";
import {
  ConnectionOverlay,
  type Connection,
  type CardPosition,
} from "./ConnectionOverlay";
import { useBlueprintCache } from "./BlueprintCacheContext";
import type { PainPoint } from "./cache-types";
import { BlueprintInsightsControls } from "./InsightsWrapper";
import { useSelectMode } from "../../../../contexts/SelectModeContext";

// ============================================
// TYPES
// ============================================

type Team = {
  id: string;
  name: string;
  iconName: string;
  colorHex: string;
};

type SoftwareService = {
  id: string;
  label: string;
  colorHex: string;
};

type BasicCard = {
  id: string;
  order: number;
  laneType: string;
  title: string;
  description: string | null;
  painPoints: string | null;
  isStart: boolean;
  isEnd: boolean;
};

type ComplexCard = {
  id: string;
  order: number;
  title: string;
  description: string | null;
  painPoints: string | null;
  softwareIds: string | null;
  isStart: boolean;
  isEnd: boolean;
};

type DecisionCard = {
  id: string;
  order: number;
  laneType: string;
  title: string;
  question: string;
  description: string | null;
  isStart: boolean;
  isEnd: boolean;
};

type TeamSectionData = {
  id: string;
  order: number;
  laneType: string;
  teamId: string;
  team: Team;
  cards: ComplexCard[];
};

type Column = {
  id: string;
  order: number;
  basicCards: BasicCard[];
  decisionCards: DecisionCard[];
  teamSections: TeamSectionData[];
};

type Phase = {
  id: string;
  order: number;
  title: string;
  timeframe: string | null;
  columns: Column[];
};

type BlueprintConnection = {
  id: string;
  sourceCardId: string;
  sourceCardType: string;
  targetCardId: string;
  targetCardType: string;
  connectorType: string;
  label: string | null;
  arrowDirection: string;
  strokeWeight: string;
  strokePattern: string;
  strokeColor: string;
};

type Blueprint = {
  id: string;
  name: string;
  phases: Phase[];
  teams: Team[];
  softwareServices: SoftwareService[];
  connections: BlueprintConnection[];
};

type BlueprintEditorProps = {
  blueprint?: Blueprint;
  projectId: string;
  journeyMaps: Array<{ id: string; name: string }>;
  blueprints: Array<{ id: string; name: string }>;
  personas: Array<{ id: string; name: string }>;
};

// ============================================
// CONNECTION DRAG CONTEXT
// ============================================

type Point = { x: number; y: number };

type CardType = "basic" | "complex" | "decision";

type ConnectionDragContextValue = {
  isDragging: boolean;
  isDraggingFromBottom: boolean; // true when dragging from bottom anchor
  dragSourceCardId: string | null;
  startDrag: (cardId: string, cardType: CardType, point: Point, fromBottom?: boolean) => void;
  setHoveredTarget: (cardId: string | null) => void;
  hoveredTargetId: string | null;
  registerCard: (id: string, type: CardType, columnIndex: number, element: HTMLElement | null) => void;
  hasVerticalDecisionConnector: (cardId: string) => boolean;
  getCardBelow: (cardId: string) => string | null; // Get the card directly below this one
  // Hover highlighting for connection tracing
  highlightedCardId: string | null;
  setHighlightedCardId: (cardId: string | null) => void;
  highlightedCardIds: Set<string>; // Cards connected to the highlighted card
  highlightedConnectionIds: Set<string>; // Connections to/from the highlighted card
};

const ConnectionDragContext = createContext<ConnectionDragContextValue>({
  isDragging: false,
  isDraggingFromBottom: false,
  dragSourceCardId: null,
  startDrag: () => {},
  setHoveredTarget: () => {},
  hoveredTargetId: null,
  registerCard: () => {},
  hasVerticalDecisionConnector: () => false,
  getCardBelow: () => null,
  highlightedCardId: null,
  setHighlightedCardId: () => {},
  highlightedCardIds: new Set(),
  highlightedConnectionIds: new Set(),
});

function useConnectionDrag() {
  return useContext(ConnectionDragContext);
}

// ============================================
// CARD REORDER DRAG & DROP
// ============================================

type CardReorderState = {
  draggingCardId: string | null;
  draggingCardType: CardType | null;
  sourceIndex: number;
  dropTargetIndex: number | null;
};

type CardReorderContextValue = {
  reorderState: CardReorderState;
  startCardDrag: (cardId: string, cardType: CardType, index: number) => void;
  updateDropTarget: (index: number | null) => void;
  endCardDrag: () => void;
  isDraggingCards: boolean;
};

// Initial/reset state for card reordering - used by context default and useState
const INITIAL_REORDER_STATE: CardReorderState = {
  draggingCardId: null,
  draggingCardType: null,
  sourceIndex: -1,
  dropTargetIndex: null,
};

const CardReorderContext = createContext<CardReorderContextValue>({
  reorderState: INITIAL_REORDER_STATE,
  startCardDrag: () => {},
  updateDropTarget: () => {},
  endCardDrag: () => {},
  isDraggingCards: false,
});

function useCardReorder() {
  return useContext(CardReorderContext);
}

// Lane configuration
const LANE_CONFIG = [
  { type: "PHYSICAL_EVIDENCE", label: "Physical Evidence", isComplex: false },
  { type: "CUSTOMER_ACTION", label: "Customer Action", isComplex: false },
  { type: "FRONTSTAGE_ACTION", label: "Frontstage", isComplex: true },
  { type: "BACKSTAGE_ACTION", label: "Backstage", isComplex: true },
  { type: "SUPPORT_PROCESS", label: "Support Process", isComplex: false },
];

// ============================================
// BLUEPRINT SELECT MODE
// ============================================

function getAllCardIds(blueprint: Blueprint): string[] {
  const ids: string[] = [];
  for (const phase of blueprint.phases) {
    for (const col of phase.columns) {
      for (const c of col.basicCards) ids.push(`basic:${c.id}`);
      for (const c of col.decisionCards) ids.push(`decision:${c.id}`);
      for (const section of col.teamSections) {
        for (const c of section.cards) ids.push(`complex:${c.id}`);
      }
    }
  }
  return ids;
}

function BlueprintSelectModeToolbar({ allCardIds }: { allCardIds: string[] }) {
  const ctx = useSelectMode();
  const cache = useBlueprintCache();
  if (!ctx) return null;

  const { isSelectMode, setSelectMode, selectedIds, selectAll, clearSelection } = ctx;
  const count = selectedIds.size;

  const handleBulkDelete = () => {
    for (const composite of selectedIds) {
      const [type, id] = composite.split(":");
      if (type === "basic") cache.deleteBasicCard(id);
      else if (type === "complex") cache.deleteComplexCard(id);
      else if (type === "decision") cache.deleteDecisionCard(id);
    }
    clearSelection();
    setSelectMode(false);
  };

  const handleBulkDuplicate = () => {
    for (const composite of selectedIds) {
      const [type, id] = composite.split(":");
      if (type === "basic") cache.duplicateBasicCard(id);
      else if (type === "complex") cache.duplicateComplexCard(id);
      else if (type === "decision") cache.duplicateDecisionCard(id);
    }
    clearSelection();
    setSelectMode(false);
  };

  return (
    <>
      <button
        onClick={() => {
          setSelectMode(!isSelectMode);
          if (isSelectMode) clearSelection();
        }}
        className={`flex items-center gap-1.5 rounded px-2 py-1 text-sm transition-colors ${
          isSelectMode
            ? "bg-[var(--accent-primary)] text-white"
            : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
        }`}
      >
        <AppIcon name="check_box_outline_blank" size="xs" />
        Select
      </button>
      {isSelectMode && count > 0 && (
        <div className="flex items-center gap-2 rounded border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] px-3 py-1.5">
          <span className="text-sm text-[var(--text-secondary)]">{count} selected</span>
          <button
            onClick={() => selectAll(allCardIds)}
            className="text-sm text-[var(--accent-primary)] hover:underline"
          >
            Select all
          </button>
          <button
            onClick={clearSelection}
            className="text-sm text-[var(--text-muted)] hover:underline"
          >
            Clear
          </button>
          <span className="h-4 w-px bg-[var(--border-subtle)]" />
          <button
            onClick={handleBulkDuplicate}
            className="flex items-center gap-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <AppIcon name="duplicate" size="xs" />
            Duplicate
          </button>
          <button
            onClick={handleBulkDelete}
            className="flex items-center gap-1 text-sm text-red-500 hover:text-red-600"
          >
            <AppIcon name="delete" size="xs" />
            Delete
          </button>
        </div>
      )}
    </>
  );
}

function BlueprintSelectModeCheckbox({
  cardId: id,
  cardType,
}: {
  cardId: string;
  cardType: "basic" | "complex" | "decision";
}) {
  const ctx = useSelectMode();
  if (!ctx) return null;
  const { isSelectMode, isSelected, toggleSelect } = ctx;
  if (!isSelectMode) return null;

  const composite = `${cardType}:${id}`;
  const checked = isSelected(composite);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        toggleSelect(composite);
      }}
      className="mr-2 shrink-0 rounded p-0.5 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--accent-primary)]"
    >
      <AppIcon
        name={checked ? "check_box" : "check_box_outline_blank"}
        size="xs"
      />
    </button>
  );
}

// ============================================
// MAIN EDITOR COMPONENT
// ============================================

export function BlueprintEditor({ projectId, journeyMaps, blueprints, personas }: BlueprintEditorProps) {
  const cache = useBlueprintCache();
  const blueprint = cache.data;
  if (!blueprint) return null; // Provider is always seeded with initialData
  const columnWidth = 220; // Extra width for connection anchor spacing
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [saveToast, setSaveToast] = useState<"saved" | "error" | null>(null);
  const handleSave = useCallback(async () => {
    const result = await cache.syncNow();
    if (result.success) setSaveToast("saved");
    else setSaveToast("error");
    setTimeout(() => setSaveToast(null), 2000);
  }, [cache]);
  
  // Canvas navigation (zoom, pan, minimap)
  const {
    zoom,
    handleZoomChange,
    handlePanTo,
  } = useCanvasNavigation({ containerRef });

  // Detect if AI sidebar is open
  useEffect(() => {
    const checkSidebar = () => {
      // Check for AI sidebar by looking for elements with the AI sidebar width
      const aiSidebarElements = document.querySelectorAll('aside');
      let isOpen = false;
      
      aiSidebarElements.forEach((aside) => {
        const style = window.getComputedStyle(aside);
        const width = style.width;
        // Check if width is 300px (AI sidebar width)
        if (width === '300px') {
          isOpen = true;
        }
      });
      
      setIsSidebarOpen(isOpen);
    };

    // Check initially and on mutations
    checkSidebar();
    
    // Use MutationObserver to detect DOM changes
    const observer = new MutationObserver(() => {
      // Delay check to allow styles to apply
      setTimeout(checkSidebar, 50);
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style'],
    });

    // Also check on window resize
    window.addEventListener('resize', checkSidebar);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', checkSidebar);
    };
  }, []);
  
  // Connection drag state
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingFromBottom, setIsDraggingFromBottom] = useState(false);
  const [dragStart, setDragStart] = useState<{ cardId: string; cardType: CardType; point: Point } | null>(null);
  const [dragEnd, setDragEnd] = useState<Point | null>(null);
  const [hoveredTargetId, setHoveredTargetId] = useState<string | null>(null);
  
  // Hover highlighting for connection tracing
  const [highlightedCardId, setHighlightedCardId] = useState<string | null>(null);
  
  // Card position registry
  const cardRegistryRef = useRef<Map<string, { type: CardType; columnIndex: number; element: HTMLElement }>>(new Map());
  const [cardPositions, setCardPositions] = useState<CardPosition[]>([]);

  // Register a card element for position tracking
  const registerCard = useCallback((id: string, type: CardType, columnIndex: number, element: HTMLElement | null) => {
    if (element) {
      cardRegistryRef.current.set(id, { type, columnIndex, element });
    } else {
      cardRegistryRef.current.delete(id);
    }
  }, []);

  // Update card positions when needed
  const updateCardPositions = useCallback(() => {
    if (!containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const scrollLeft = containerRef.current.scrollLeft;
    const scrollTop = containerRef.current.scrollTop;
    
    const positions: CardPosition[] = [];
    cardRegistryRef.current.forEach((data, id) => {
      const rect = data.element.getBoundingClientRect();
      positions.push({
        id,
        type: data.type,
        x: rect.left - containerRect.left + scrollLeft,
        y: rect.top - containerRect.top + scrollTop,
        width: rect.width,
        height: rect.height,
        columnIndex: data.columnIndex,
      });
    });
    
    setCardPositions(positions);
  }, []);

  // Update positions on scroll, resize, or data change
  useEffect(() => {
    updateCardPositions();
    
    const container = containerRef.current;
    if (!container) return;
    
    const handleScroll = () => updateCardPositions();
    container.addEventListener("scroll", handleScroll);
    
    const resizeObserver = new ResizeObserver(updateCardPositions);
    resizeObserver.observe(container);
    
    return () => {
      container.removeEventListener("scroll", handleScroll);
      resizeObserver.disconnect();
    };
  }, [updateCardPositions, blueprint]);

  // Start dragging a connection
  const startDrag = useCallback((cardId: string, cardType: CardType, point: Point, fromBottom?: boolean) => {
    setIsDragging(true);
    setIsDraggingFromBottom(fromBottom ?? false);
    setDragStart({ cardId, cardType, point });
    setDragEnd(point);
  }, []);

  // Handle mouse move during drag
  useEffect(() => {
    if (!isDragging) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const scrollLeft = containerRef.current.scrollLeft;
      const scrollTop = containerRef.current.scrollTop;
      
      setDragEnd({
        x: e.clientX - rect.left + scrollLeft,
        y: e.clientY - rect.top + scrollTop,
      });
    };
    
    const handleMouseUp = async () => {
      if (dragStart && hoveredTargetId) {
        const sourceCard = cardPositions.find(c => c.id === dragStart.cardId);
        const targetCard = cardPositions.find(c => c.id === hoveredTargetId);
        
        // Prevent self-connections
        if (sourceCard && targetCard && sourceCard.id !== targetCard.id) {
          // Check if same column
          const isSameColumn = sourceCard.columnIndex === targetCard.columnIndex;
          
          // Check if this is a vertical connector (same column, downward)
          const isVerticalDownward = 
            isSameColumn &&
            targetCard.y > sourceCard.y + sourceCard.height - 10;
          
          // RULE: Same-column connections only allowed for Decision → card directly below
          if (isSameColumn) {
            if (dragStart.cardType !== "decision") {
              alert("Same-column connections are only allowed from a Decision to the card directly below.");
              setIsDragging(false);
              setIsDraggingFromBottom(false);
              setDragStart(null);
              setDragEnd(null);
              setHoveredTargetId(null);
              return;
            }
            
            // Only allow downward connection for decisions
            if (!isVerticalDownward) {
              alert("Decision cards can only connect vertically to the card directly below.");
              setIsDragging(false);
              setIsDraggingFromBottom(false);
              setDragStart(null);
              setDragEnd(null);
              setHoveredTargetId(null);
              return;
            }
          }
          
          // RULE: No backward connections (loops) - only allow left-to-right
          if (targetCard.columnIndex < sourceCard.columnIndex) {
            alert("Backward connections are not supported. Connections must go from left to right.");
            setIsDragging(false);
            setIsDraggingFromBottom(false);
            setDragStart(null);
            setDragEnd(null);
            setHoveredTargetId(null);
            return;
          }
          
          // Prevent multiple vertical connectors from the same decision card
          if (isVerticalDownward && dragStart.cardType === "decision") {
            const existingVertical = blueprint.connections.find(conn => 
              conn.sourceCardId === dragStart.cardId &&
              conn.sourceCardType === "decision"
            );
            
            // Check if existing connection is also vertical (same column, downward)
            if (existingVertical) {
              const existingTarget = cardPositions.find(c => c.id === existingVertical.targetCardId);
              if (existingTarget && existingTarget.columnIndex === sourceCard.columnIndex && existingTarget.y > sourceCard.y) {
                alert("Decision cards can only have one vertical connector. Please delete the existing vertical connector first.");
                setIsDragging(false);
                setIsDraggingFromBottom(false);
                setDragStart(null);
                setDragEnd(null);
                setHoveredTargetId(null);
                return;
              }
            }
          }
          
          cache.createConnection(
            dragStart.cardId,
            dragStart.cardType,
            hoveredTargetId,
            targetCard.type
          );
        }
      }
      
      setIsDragging(false);
      setIsDraggingFromBottom(false);
      setDragStart(null);
      setDragEnd(null);
      setHoveredTargetId(null);
    };
    
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragStart, hoveredTargetId, cardPositions, blueprint.id, cache]);

  const handleAddPhase = () => {
    cache.createBlankPhase();
  };

  // Convert blueprint connections to the format needed by ConnectionOverlay
  const connections: Connection[] = blueprint.connections.map(c => ({
    id: c.id,
    sourceCardId: c.sourceCardId,
    sourceCardType: c.sourceCardType as "basic" | "complex" | "decision",
    targetCardId: c.targetCardId,
    targetCardType: c.targetCardType as "basic" | "complex" | "decision",
    connectorType: c.connectorType as "standard" | "dependency" | "feedback" | "wait",
    label: c.label,
    arrowDirection: c.arrowDirection as "forward" | "backward" | "bidirectional" | "none",
    strokeWeight: c.strokeWeight as "thin" | "normal" | "thick",
    strokePattern: c.strokePattern as "solid" | "dashed" | "dotted",
    strokeColor: c.strokeColor as "grey" | "red" | "green",
  }));

  // Track cards that have a vertical connector from a decision card above them (for extra spacing)
  const cardsWithVerticalDecisionConnector = useMemo(() => {
    const result = new Set<string>();
    blueprint.connections.forEach(conn => {
      if (conn.sourceCardType === "decision") {
        // Check if this is a vertical connector (same column, downward)
        const sourceCardData = cardRegistryRef.current.get(conn.sourceCardId);
        const targetCardData = cardRegistryRef.current.get(conn.targetCardId);
        if (sourceCardData && targetCardData && sourceCardData.columnIndex === targetCardData.columnIndex) {
          result.add(conn.targetCardId);
        }
      }
    });
    return result;
  }, [blueprint.connections]);

  // Check if drag target is valid
  // Allow connections in any direction (including loops/backwards)
  // Only prevent self-connections
  const isDragTargetValid = useCallback(() => {
    if (!dragStart || !hoveredTargetId) return false;
    const sourceCard = cardPositions.find(c => c.id === dragStart.cardId);
    const targetCard = cardPositions.find(c => c.id === hoveredTargetId);
    if (!sourceCard || !targetCard) return false;
    return sourceCard.id !== targetCard.id;
  }, [dragStart, hoveredTargetId, cardPositions]);

  // Build column index map for cards and track columns with team sections
  const columnIndexMap = new Map<string, number>();
  const columnsWithTeams = new Set<number>();
  let globalColumnIndex = 0;
  
  blueprint.phases.forEach(phase => {
    phase.columns.forEach(column => {
      column.basicCards.forEach(card => columnIndexMap.set(card.id, globalColumnIndex));
      column.decisionCards.forEach(card => columnIndexMap.set(card.id, globalColumnIndex));
      column.teamSections.forEach(section => {
        section.cards.forEach(card => columnIndexMap.set(card.id, globalColumnIndex));
      });
      // Track if this column has team sections
      if (column.teamSections.length > 0) {
        columnsWithTeams.add(globalColumnIndex);
      }
      globalColumnIndex++;
    });
  });
  
  // Build column boundaries (x positions) for routing
  const columnBoundaries: number[] = [];
  const rowLabelWidth = 140;
  let xPos = rowLabelWidth;
  blueprint.phases.forEach(phase => {
    phase.columns.forEach(() => {
      columnBoundaries.push(xPos);
      xPos += columnWidth;
    });
  });
  columnBoundaries.push(xPos); // Final boundary

  // Get the card directly below a given card (same column, immediately below)
  const getCardBelow = useCallback((cardId: string): string | null => {
    const sourceCard = cardPositions.find(c => c.id === cardId);
    if (!sourceCard) return null;
    
    // Find cards in the same column that are below this card
    const cardsBelow = cardPositions
      .filter(c => 
        c.id !== cardId && 
        c.columnIndex === sourceCard.columnIndex && 
        c.y > sourceCard.y + sourceCard.height - 10
      )
      .sort((a, b) => a.y - b.y);
    
    return cardsBelow.length > 0 ? cardsBelow[0].id : null;
  }, [cardPositions]);

  // Calculate highlighted cards and connections based on hovered card
  const { highlightedCardIds, highlightedConnectionIds } = useMemo(() => {
    if (!highlightedCardId) {
      return { highlightedCardIds: new Set<string>(), highlightedConnectionIds: new Set<string>() };
    }
    
    const cardIds = new Set<string>([highlightedCardId]);
    const connectionIds = new Set<string>();
    
    // Find all connections involving the highlighted card
    blueprint.connections.forEach(conn => {
      if (conn.sourceCardId === highlightedCardId || conn.targetCardId === highlightedCardId) {
        connectionIds.add(conn.id);
        cardIds.add(conn.sourceCardId);
        cardIds.add(conn.targetCardId);
      }
    });
    
    return { highlightedCardIds: cardIds, highlightedConnectionIds: connectionIds };
  }, [highlightedCardId, blueprint.connections]);

  const connectionDragValue: ConnectionDragContextValue = {
    isDragging,
    isDraggingFromBottom,
    dragSourceCardId: dragStart?.cardId ?? null,
    startDrag,
    setHoveredTarget: setHoveredTargetId,
    hoveredTargetId,
    registerCard,
    hasVerticalDecisionConnector: (cardId: string) => cardsWithVerticalDecisionConnector.has(cardId),
    getCardBelow,
    highlightedCardId,
    setHighlightedCardId,
    highlightedCardIds,
    highlightedConnectionIds,
  };

  // Build data for validation
  const blueprintValidationData = {
    id: blueprint.id,
    name: blueprint.name,
    phases: blueprint.phases.map(phase => ({
      id: phase.id,
      title: phase.title,
      timeframe: phase.timeframe,
      columns: phase.columns.map(column => ({
        id: column.id,
        order: column.order,
        basicCards: column.basicCards.map(card => ({
          id: card.id,
          laneType: card.laneType,
          title: card.title,
          description: card.description,
          painPoints: card.painPoints,
        })),
        decisionCards: column.decisionCards.map(card => ({
          id: card.id,
          laneType: card.laneType,
          title: card.title,
          question: card.question,
          description: card.description,
        })),
        teamSections: column.teamSections.map(section => ({
          id: section.id,
          laneType: section.laneType,
          teamId: section.teamId,
          team: section.team,
          cards: section.cards.map(card => ({
            id: card.id,
            title: card.title,
            description: card.description,
            painPoints: card.painPoints,
            softwareIds: card.softwareIds,
          })),
        })),
      })),
    })),
    connections: blueprint.connections.map(conn => ({
      id: conn.id,
      sourceCardId: conn.sourceCardId,
      sourceCardType: conn.sourceCardType,
      targetCardId: conn.targetCardId,
      targetCardType: conn.targetCardType,
      connectorType: conn.connectorType,
      label: conn.label,
    })),
  };

  return (
    <ConnectionDragContext.Provider value={connectionDragValue}>
      <div className="relative flex h-full flex-col bg-[var(--bg-panel)]">
        {/* Header */}
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-panel)] px-4">
          <h1
            className="font-medium text-[var(--text-primary)]"
            style={{ fontSize: "var(--font-size-action)" }}
          >
            {blueprint.name}
          </h1>
          <div className="flex items-center gap-3">
            <BlueprintSelectModeToolbar allCardIds={getAllCardIds(blueprint)} />
            <BlueprintInsightsControls blueprintData={blueprintValidationData} />
            <CompletenessButton artifactType="blueprint" data={blueprintValidationData} />
            <div className="h-6 w-px bg-[var(--border-subtle)]" />
            <ShareButton
              projectId={projectId}
              itemType="blueprint"
              itemId={blueprint.id}
              itemName={blueprint.name}
              size="sm"
            />
            <ZoomControls zoom={zoom} onZoomChange={handleZoomChange} />
            <ExportButton
              projectId={projectId}
              journeyMaps={journeyMaps}
              blueprints={blueprints}
              personas={personas}
              defaultSelectedId={blueprint.id}
              defaultSelectedType="blueprint"
              size="sm"
            />
            <button
              onClick={handleAddPhase}
              className="flex items-center gap-1 rounded bg-[var(--accent-primary)] px-3 py-1 font-medium text-white transition-colors hover:bg-[var(--accent-primary-hover)]"
              style={{ fontSize: "var(--font-size-cell)" }}
            >
              <AppIcon name="add" size="xs" />
              Add Phase
            </button>
            <div className="flex items-center gap-2">
              {cache.dirty && (
                <span className="text-xs text-[var(--text-muted)]">Unsaved</span>
              )}
              <button
                onClick={handleSave}
                disabled={!cache.dirty || cache.syncStatus === "saving"}
                className="rounded border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-2 py-1 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-50"
              >
                {cache.syncStatus === "saving" ? "Saving…" : "Save"}
              </button>
              {cache.syncStatus === "saved" && (
                <span className="text-xs text-green-600">Saved</span>
              )}
              {saveToast === "error" && (
                <span className="text-xs text-red-600">Save failed</span>
              )}
            </div>
          </div>
        </header>

        {/* Editor area */}
        <div 
          ref={containerRef}
          className="relative flex-1 overflow-auto"
          data-connection-container
        >
          <div 
            ref={contentRef}
            className="origin-top-left transition-transform duration-200"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "0 0",
            }}
          >
            {blueprint.phases.length === 0 ? (
              <EmptyState onAddPhase={handleAddPhase} />
            ) : (
              <div className="relative min-w-max p-4">
              {/* Phase header bands */}
              <PhaseHeaderRow
                phases={blueprint.phases}
                blueprintId={blueprint.id}
                columnWidth={columnWidth}
              />

              {/* Column header row (Step labels only) */}
              <ColumnLabelRow phases={blueprint.phases} columnWidth={columnWidth} />

              {/* Lane rows - each with column insertion buttons */}
              {LANE_CONFIG.map((lane) => (
                <LaneRow
                  key={lane.type}
                  lane={lane}
                  phases={blueprint.phases}
                  teams={blueprint.teams}
                  softwareServices={blueprint.softwareServices}
                  blueprintId={blueprint.id}
                  columnWidth={columnWidth}
                  columnIndexMap={columnIndexMap}
                />
              ))}

              {/* Connection overlay */}
              <ConnectionOverlay
                blueprintId={blueprint.id}
                connections={connections}
                cardPositions={cardPositions}
                containerRef={containerRef}
                columnsWithTeams={columnsWithTeams}
                columnBoundaries={columnBoundaries}
                highlightedConnectionIds={highlightedConnectionIds}
                onConnectionHover={(cardId) => setHighlightedCardId(cardId)}
              />

              {/* Drag preview line */}
              {isDragging && dragStart && dragEnd && (
                <svg
                  className="pointer-events-none absolute left-0 top-0"
                  style={{ width: "100%", height: "100%", overflow: "visible" }}
                >
                  <DragPreviewLine
                    startPoint={dragStart.point}
                    endPoint={dragEnd}
                    isValid={isDragTargetValid()}
                  />
                </svg>
              )}
            </div>
          )}
          </div>
        </div>

        {/* Minimap */}
        <Minimap
          containerRef={containerRef}
          contentRef={contentRef}
          zoom={zoom}
          onZoomChange={handleZoomChange}
          onPanTo={handlePanTo}
          isSidebarOpen={isSidebarOpen}
        />
      </div>
    </ConnectionDragContext.Provider>
  );
}

// Drag preview line component
function DragPreviewLine({
  startPoint,
  endPoint,
  isValid,
}: {
  startPoint: Point;
  endPoint: Point;
  isValid: boolean;
}) {
  const midX = (startPoint.x + endPoint.x) / 2;
  const pathString = `M ${startPoint.x} ${startPoint.y} L ${midX} ${startPoint.y} L ${midX} ${endPoint.y} L ${endPoint.x} ${endPoint.y}`;
  
  return (
    <path
      d={pathString}
      fill="none"
      stroke={isValid ? "var(--accent-primary)" : "var(--emotion-1)"}
      strokeWidth={2}
      strokeDasharray="6 4"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={0.7}
    />
  );
}

// ============================================
// EMPTY STATE
// ============================================

function EmptyState({ onAddPhase }: { onAddPhase: () => void }) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--bg-sidebar)]">
          <AppIcon name="blueprint" className="text-[var(--text-muted)]" />
        </div>
        <h2
          className="mb-2 font-medium text-[var(--text-primary)]"
          style={{ fontSize: "var(--font-size-action)" }}
        >
          No phases yet
        </h2>
        <p
          className="mb-4 text-[var(--text-muted)]"
          style={{ fontSize: "var(--font-size-cell)" }}
        >
          Add your first phase to start building the blueprint
        </p>
        <button
          onClick={onAddPhase}
          className="rounded bg-[var(--accent-primary)] px-4 py-2 font-medium text-white transition-colors hover:bg-[var(--accent-primary-hover)]"
          style={{ fontSize: "var(--font-size-cell)" }}
        >
          Add First Phase
        </button>
      </div>
    </div>
  );
}

// ============================================
// PHASE HEADER ROW
// ============================================

function PhaseHeaderRow({
  phases,
  blueprintId,
  columnWidth,
}: {
  phases: Phase[];
  blueprintId: string;
  columnWidth: number;
}) {
  return (
    <div className="mb-1 flex">
      <div
        className="shrink-0 border-r border-[var(--bg-phase-header-border)] bg-[var(--bg-phase-header)]"
        style={{ width: 140 }}
      />
      {phases.map((phase, phaseIndex) => (
        <PhaseHeaderBand
          key={phase.id}
          phase={phase}
          blueprintId={blueprintId}
          columnWidth={columnWidth}
          isFirst={phaseIndex === 0}
          isLast={phaseIndex === phases.length - 1}
        />
      ))}
    </div>
  );
}

function PhaseHeaderBand({
  phase,
  blueprintId,
  columnWidth,
  isFirst,
  isLast,
}: {
  phase: Phase;
  blueprintId: string;
  columnWidth: number;
  isFirst: boolean;
  isLast: boolean;
}) {
  const cache = useBlueprintCache();
  const undo = useUndo();
  const [isHovered, setIsHovered] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingTimeframe, setIsEditingTimeframe] = useState(false);
  const [title, setTitle] = useState(phase.title);
  const [timeframe, setTimeframe] = useState(phase.timeframe || "");
  const titleRef = useRef<HTMLInputElement>(null);
  const timeframeRef = useRef<HTMLInputElement>(null);

  const bandWidth = phase.columns.length * columnWidth;

  useEffect(() => {
    if (isEditingTitle && titleRef.current) {
      titleRef.current.focus();
      titleRef.current.select();
    }
  }, [isEditingTitle]);

  useEffect(() => {
    if (isEditingTimeframe && timeframeRef.current) {
      timeframeRef.current.focus();
    }
  }, [isEditingTimeframe]);

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
    if (title.trim() !== phase.title) {
      const newVal = title.trim();
      const oldVal = phase.title;
      undo?.pushUndo({
        undo: async () => cache.updatePhase(phase.id, "title", oldVal),
        redo: async () => cache.updatePhase(phase.id, "title", newVal),
        skipRefresh: true,
      });
      cache.updatePhase(phase.id, "title", newVal);
    }
  };

  const handleTimeframeBlur = () => {
    setIsEditingTimeframe(false);
    if (timeframe.trim() !== (phase.timeframe || "")) {
      const newVal = timeframe.trim();
      const oldVal = phase.timeframe || "";
      undo?.pushUndo({
        undo: async () => cache.updatePhase(phase.id, "timeframe", oldVal),
        redo: async () => cache.updatePhase(phase.id, "timeframe", newVal),
        skipRefresh: true,
      });
      cache.updatePhase(phase.id, "timeframe", newVal);
    }
  };

  const handleInsertLeft = () => {
    cache.insertPhaseAt(phase.id, "before");
  };

  const handleInsertRight = () => {
    cache.insertPhaseAt(phase.id, "after");
  };

  const handleDelete = () => {
    if (confirm(`Delete phase "${phase.title}" and all its contents?`)) {
      cache.deletePhase(phase.id);
    }
  };

  return (
    <div
      className="relative shrink-0 border-b border-[var(--bg-phase-header-border)] bg-[var(--bg-phase-header)] p-2"
      style={{ width: bandWidth, borderRightColor: "var(--bg-phase-header-border)" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isHovered && (
        <>
          <button
            onClick={handleInsertLeft}
            className="absolute -left-3 top-1/2 z-50 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--accent-primary)] text-white shadow-md transition-transform hover:scale-110"
            title="Insert phase before"
          >
            <AppIcon name="add" size="xs" />
          </button>
          <button
            onClick={handleInsertRight}
            className="absolute -right-3 top-1/2 z-50 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--accent-primary)] text-white shadow-md transition-transform hover:scale-110"
            title="Insert phase after"
          >
            <AppIcon name="add" size="xs" />
          </button>
        </>
      )}

      <div className="flex items-center gap-2">
        {isEditingTitle ? (
          <input
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleTitleBlur();
              if (e.key === "Escape") { setTitle(phase.title); setIsEditingTitle(false); }
            }}
            className="flex-1 rounded border border-white/50 bg-white/10 px-1 font-medium text-white outline-none placeholder:text-white/60"
            style={{ fontSize: "var(--font-size-cell)" }}
          />
        ) : (
          <div
            onClick={() => setIsEditingTitle(true)}
            className="flex-1 cursor-text truncate font-medium text-white hover:text-white/90"
            style={{ fontSize: "var(--font-size-cell)" }}
          >
            {phase.title}
          </div>
        )}
        <span
          className="rounded bg-white/20 px-1.5 py-0.5 text-white/90"
          style={{ fontSize: "10px" }}
        >
          {phase.columns.length} col{phase.columns.length !== 1 ? "s" : ""}
        </span>
      </div>

      {isEditingTimeframe ? (
        <input
          ref={timeframeRef}
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value)}
          onBlur={handleTimeframeBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleTimeframeBlur();
            if (e.key === "Escape") { setTimeframe(phase.timeframe || ""); setIsEditingTimeframe(false); }
          }}
          placeholder="Timeframe"
          className="mt-1 w-full rounded border border-white/50 bg-white/10 px-1 text-white/80 outline-none placeholder:text-white/50"
          style={{ fontSize: "var(--font-size-meta)" }}
        />
      ) : (
        <div
          onClick={() => setIsEditingTimeframe(true)}
          className="mt-1 cursor-text truncate text-white/70 hover:text-white/90"
          style={{ fontSize: "var(--font-size-meta)" }}
        >
          {phase.timeframe || "Add timeframe"}
        </div>
      )}

      {isHovered && (
        <button
          onClick={handleDelete}
          className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded text-white/70 transition-colors hover:bg-white/20 hover:text-white"
          title="Delete phase"
        >
          <AppIcon name="close" size="xs" />
        </button>
      )}
    </div>
  );
}

// ============================================
// COLUMN LABEL ROW (just labels, no buttons)
// ============================================

function ColumnLabelRow({
  phases,
  columnWidth,
}: {
  phases: Phase[];
  columnWidth: number;
}) {
  // Compute continuous step index across all columns
  let stepIndex = 0;
  const columnStepIndices = new Map<string, number>();
  for (const phase of phases) {
    for (const column of phase.columns) {
      columnStepIndices.set(column.id, ++stepIndex);
    }
  }
  
  return (
    <div className="mb-1 flex">
      <div
        className="shrink-0 border-r border-[var(--bg-phase-header-border)] bg-[var(--bg-phase-header)]"
        style={{ width: 140, height: 20 }}
      />
      {phases.map((phase) =>
        phase.columns.map((column) => (
          <div
            key={column.id}
            className="shrink-0 flex items-center justify-center border-b border-r border-[var(--bg-phase-header-border)] bg-[var(--bg-phase-header)]"
            style={{ width: columnWidth, height: 20 }}
          >
            <span className="text-white/80" style={{ fontSize: "9px" }}>
              Step {columnStepIndices.get(column.id)}
            </span>
          </div>
        ))
      )}
    </div>
  );
}

// ============================================
// LANE ROW
// ============================================

function LaneRow({
  lane,
  phases,
  teams,
  softwareServices,
  blueprintId,
  columnWidth,
  columnIndexMap,
}: {
  lane: { type: string; label: string; isComplex: boolean };
  phases: Phase[];
  teams: Team[];
  softwareServices: SoftwareService[];
  blueprintId: string;
  columnWidth: number;
  columnIndexMap: Map<string, number>;
}) {
  return (
    <div className="flex">
      <div
        className="shrink-0 flex items-start border-b border-r border-[var(--border-subtle)] bg-[var(--bg-sidebar)] p-2"
        style={{ width: 140, minHeight: 100 }}
      >
        <span
          className="font-medium text-[var(--text-muted)]"
          style={{ fontSize: "var(--font-size-meta)" }}
        >
          {lane.label}
        </span>
      </div>

      {phases.map((phase) =>
        phase.columns.map((column) => (
          <LaneCellWithInsertButtons
            key={`${lane.type}-${column.id}`}
            lane={lane}
            column={column}
            teams={teams}
            softwareServices={softwareServices}
            blueprintId={blueprintId}
            columnWidth={columnWidth}
            columnIndexMap={columnIndexMap}
          />
        ))
      )}
    </div>
  );
}

// ============================================
// LANE CELL WITH INSERT BUTTONS (on every row)
// ============================================

function LaneCellWithInsertButtons({
  lane,
  column,
  teams,
  softwareServices,
  blueprintId,
  columnWidth,
  columnIndexMap,
}: {
  lane: { type: string; label: string; isComplex: boolean };
  column: Column;
  teams: Team[];
  softwareServices: SoftwareService[];
  blueprintId: string;
  columnWidth: number;
  columnIndexMap: Map<string, number>;
}) {
  const cache = useBlueprintCache();
  const [isHovered, setIsHovered] = useState(false);

  const handleInsertLeft = () => {
    cache.insertColumnAt(column.id, "before");
  };

  const handleInsertRight = () => {
    cache.insertColumnAt(column.id, "after");
  };

  return (
    <div
      data-column-id={column.id}
      className="relative shrink-0 border-b border-[var(--border-muted)] bg-[var(--bg-panel)]"
      style={{ width: columnWidth, minHeight: 100 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Column insert buttons on left and right edges */}
      {isHovered && (
        <>
          <button
            onClick={handleInsertLeft}
            className="absolute -left-2 top-1/2 z-50 flex h-4 w-4 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--accent-secondary)] text-white shadow transition-transform hover:scale-110"
            style={{ fontSize: "10px" }}
            title="Insert column before"
          >
            +
          </button>
          <button
            onClick={handleInsertRight}
            className="absolute -right-2 top-1/2 z-50 flex h-4 w-4 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--accent-secondary)] text-white shadow transition-transform hover:scale-110"
            style={{ fontSize: "10px" }}
            title="Insert column after"
          >
            +
          </button>
        </>
      )}

      {/* Cell content - NO padding wrapper, team headers span edge-to-edge */}
      {lane.isComplex ? (
        <ComplexLaneCellContent
          laneType={lane.type}
          column={column}
          sections={column.teamSections.filter((s) => s.laneType === lane.type)}
          teams={teams}
          softwareServices={softwareServices}
          blueprintId={blueprintId}
          columnIndexMap={columnIndexMap}
        />
      ) : (
        <div className="px-4 py-2">
          <BasicLaneCellContent
            laneType={lane.type}
            column={column}
            cards={column.basicCards.filter((c) => c.laneType === lane.type)}
            columnIndexMap={columnIndexMap}
          />
        </div>
      )}
    </div>
  );
}

// ============================================
// BASIC LANE CELL CONTENT
// ============================================

// Decision cards are allowed in Customer Action, Frontstage, and Backstage lanes
const DECISION_ALLOWED_LANES = ["CUSTOMER_ACTION", "FRONTSTAGE_ACTION", "BACKSTAGE_ACTION"];

// ============================================
// INSERTION POINT COMPONENT
// ============================================

function InsertionPoint({
  isVisible,
  onShowMenu,
  onInsert,
  allowDecision,
  onClose,
}: {
  isVisible: boolean;
  onShowMenu: () => void;
  onInsert: (type: "basic" | "decision") => void;
  allowDecision: boolean;
  onClose: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    if (!isVisible) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isVisible, onClose]);

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ height: isVisible || isHovered ? "24px" : "8px", transition: "height 0.15s ease" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {(isHovered || isVisible) && (
        <button
          onClick={onShowMenu}
          className="absolute flex items-center gap-1 rounded-full bg-[var(--bg-panel)] px-2 py-0.5 text-[var(--text-muted)] shadow-sm border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-all"
          style={{ fontSize: "10px", zIndex: 10 }}
        >
          <AppIcon name="add" size="xs" />
          Insert
        </button>
      )}
      {isVisible && (
        <div
          ref={menuRef}
          className="absolute top-full left-1/2 -translate-x-1/2 mt-1 flex gap-1 rounded-md bg-[var(--bg-panel)] p-1 shadow-lg border border-[var(--border-subtle)]"
          style={{ zIndex: 20 }}
        >
          <button
            onClick={() => onInsert("basic")}
            className="flex items-center gap-1 rounded px-2 py-1 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
            style={{ fontSize: "11px" }}
          >
            <AppIcon name="article" size="xs" />
            Card
          </button>
          {allowDecision && (
            <button
              onClick={() => onInsert("decision")}
              className="flex items-center gap-1 rounded px-2 py-1 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
              style={{ fontSize: "11px" }}
            >
              <AppIcon name="decision" size="xs" />
              Decision
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Flow node type for unified rendering
type FlowNode = 
  | { type: "basic"; card: BasicCard }
  | { type: "decision"; card: DecisionCard };

function BasicLaneCellContent({
  laneType,
  column,
  cards,
  columnIndexMap,
}: {
  laneType: string;
  column: Column;
  cards: BasicCard[];
  columnIndexMap: Map<string, number>;
}) {
  const cache = useBlueprintCache();
  const allowsDecisionCards = DECISION_ALLOWED_LANES.includes(laneType);
  const [insertMenuIndex, setInsertMenuIndex] = useState<number | null>(null);
  const { hasVerticalDecisionConnector } = useConnectionDrag();
  
  // Drag-and-drop reorder state
  const [dragState, setDragState] = useState<CardReorderState>(INITIAL_REORDER_STATE);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const handleAddCard = () => {
    const { cardId } = cache.createBasicCard(column.id, laneType);
    sessionStorage.setItem("focusCardTitle", cardId);
  };

  const handleAddDecisionCard = () => {
    const { cardId } = cache.createDecisionCard(column.id, laneType);
    sessionStorage.setItem("focusCardTitle", cardId);
  };

  const handleInsertCard = (atOrder: number, type: "basic" | "decision") => {
    setInsertMenuIndex(null);
    if (type === "basic") {
      const { cardId } = cache.insertBasicCardAt(column.id, laneType, atOrder);
      sessionStorage.setItem("focusCardTitle", cardId);
    } else {
      const { cardId } = cache.createDecisionCard(column.id, laneType, atOrder);
      sessionStorage.setItem("focusCardTitle", cardId);
    }
  };

  // Get decision cards for this lane - now works for Customer Action, Frontstage, Backstage
  const decisionCards = allowsDecisionCards 
    ? column.decisionCards.filter(c => c.laneType === laneType)
    : [];

  // Create unified, sorted flow nodes
  // Cards of different types share the same order space per lane
  const flowNodes: FlowNode[] = [
    ...cards.map(card => ({ type: "basic" as const, card })),
    ...decisionCards.map(card => ({ type: "decision" as const, card })),
  ].sort((a, b) => a.card.order - b.card.order);

  const hasCards = flowNodes.length > 0;

  // Drag handlers
  const handleStartCardDrag = (cardId: string, cardType: CardType, index: number) => {
    setDragState({
      draggingCardId: cardId,
      draggingCardType: cardType,
      sourceIndex: index,
      dropTargetIndex: index,
    });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState.draggingCardId || !containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const mouseY = e.clientY - containerRect.top;
    
    // Calculate drop target based on mouse Y position
    let targetIndex = flowNodes.length; // Default to end
    let cumY = 0;
    
    for (let i = 0; i < flowNodes.length; i++) {
      const node = flowNodes[i];
      const el = cardRefs.current.get(node.card.id);
      if (!el) continue;
      
      const cardHeight = el.offsetHeight + 8; // Include gap
      if (mouseY < cumY + cardHeight / 2) {
        targetIndex = i;
        break;
      }
      cumY += cardHeight;
    }
    
    setDragState(prev => ({ ...prev, dropTargetIndex: targetIndex }));
  }, [dragState.draggingCardId, flowNodes]);

  const handleMouseUp = useCallback(async () => {
    if (!dragState.draggingCardId || dragState.dropTargetIndex === null) {
      setDragState(INITIAL_REORDER_STATE);
      return;
    }

    const sourceIdx = dragState.sourceIndex;
    let targetIdx = dragState.dropTargetIndex;
    
    // Adjust target if dragging downward (account for removal)
    if (targetIdx > sourceIdx) {
      targetIdx = targetIdx - 1;
    }
    
    if (sourceIdx !== targetIdx && targetIdx >= 0 && targetIdx < flowNodes.length) {
      const targetNode = flowNodes[targetIdx];
      const targetOrder = targetNode.card.order;
      
      if (dragState.draggingCardType === "basic") {
        cache.updateBasicCardOrder(dragState.draggingCardId, targetOrder);
      } else if (dragState.draggingCardType === "decision") {
        cache.updateDecisionCardOrder(dragState.draggingCardId, targetOrder);
      }
    }
    
    setDragState(INITIAL_REORDER_STATE);
  }, [dragState, flowNodes, cache]);

  useEffect(() => {
    if (dragState.draggingCardId) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [dragState.draggingCardId, handleMouseMove, handleMouseUp]);

  const cardReorderValue: CardReorderContextValue = {
    reorderState: dragState,
    startCardDrag: handleStartCardDrag,
    updateDropTarget: (index) => setDragState(prev => ({ ...prev, dropTargetIndex: index })),
    endCardDrag: () => setDragState(INITIAL_REORDER_STATE),
    isDraggingCards: !!dragState.draggingCardId,
  };

  return (
    <CardReorderContext.Provider value={cardReorderValue}>
      <div ref={containerRef} className="space-y-2">
        {flowNodes.map((node, index) => {
          // Check if this card has a vertical decision connector targeting it
          const needsExtraSpacing = hasVerticalDecisionConnector(node.card.id);
          const isDragging = dragState.draggingCardId === node.card.id;
          const showDropPlaceholderBefore = dragState.draggingCardId && 
            dragState.dropTargetIndex === index && 
            dragState.sourceIndex !== index;
          const showDropPlaceholderAfter = dragState.draggingCardId && 
            dragState.dropTargetIndex === flowNodes.length && 
            index === flowNodes.length - 1 &&
            dragState.sourceIndex !== flowNodes.length;
          
          return (
            <React.Fragment key={node.card.id}>
              {/* Extra spacing for vertical decision connector - arrow is rendered by ConnectionOverlay */}
              {needsExtraSpacing && (
                <div className="h-12" />
              )}
              
              {/* Drop placeholder before this card */}
              {showDropPlaceholderBefore && (
                <div className="h-12 rounded border-2 border-dashed border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 transition-all" />
              )}
              
              {/* Insertion point before each card (only when not dragging) */}
              {!dragState.draggingCardId && (
                <InsertionPoint
                  isVisible={insertMenuIndex === index}
                  onShowMenu={() => setInsertMenuIndex(insertMenuIndex === index ? null : index)}
                  onInsert={(type) => handleInsertCard(node.card.order, type)}
                  allowDecision={allowsDecisionCards}
                  onClose={() => setInsertMenuIndex(null)}
                />
              )}
              
              {/* The card itself (or placeholder if being dragged) */}
              {isDragging ? (
                <div className="h-12 rounded border-2 border-dashed border-[var(--border-muted)] bg-[var(--bg-sidebar)]/50 transition-all" />
              ) : (
                <div ref={(el) => { if (el) cardRefs.current.set(node.card.id, el); }}>
                  {node.type === "basic" ? (
                    <BasicCardComponent
                      card={node.card}
                      columnIndex={columnIndexMap.get(node.card.id) ?? 0}
                      cardIndex={index}
                      onStartCardDrag={flowNodes.length > 1 ? handleStartCardDrag : undefined}
                    />
                  ) : (
                    <DecisionCardComponent
                      card={node.card}
                      columnIndex={columnIndexMap.get(node.card.id) ?? 0}
                      cardIndex={index}
                      onStartCardDrag={flowNodes.length > 1 ? handleStartCardDrag : undefined}
                    />
                  )}
                </div>
              )}
              
              {/* Drop placeholder after last card */}
              {showDropPlaceholderAfter && (
                <div className="h-12 rounded border-2 border-dashed border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 transition-all" />
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div className={`flex gap-1 ${hasCards ? "mt-2" : ""}`}>
        <button
          onClick={handleAddCard}
          className="flex flex-1 items-center justify-center gap-1 rounded border border-dashed border-[var(--border-subtle)] py-1.5 text-[var(--text-muted)] transition-all hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
          style={{ fontSize: "var(--font-size-meta)" }}
        >
          <AppIcon name="add" size="xs" />
          Card
        </button>
        {allowsDecisionCards && (
          <button
            onClick={handleAddDecisionCard}
            className="flex items-center justify-center gap-1 rounded border border-dashed border-[var(--border-subtle)] px-2 py-1.5 text-[var(--text-muted)] transition-all hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
            style={{ fontSize: "var(--font-size-meta)" }}
            title="Add Decision"
          >
            <AppIcon name="decision" size="xs" />
          </button>
        )}
      </div>
    </CardReorderContext.Provider>
  );
}

// ============================================
// COMPLEX LANE CELL CONTENT (Frontstage/Backstage)
// ============================================

function ComplexLaneCellContent({
  laneType,
  column,
  sections,
  teams,
  softwareServices,
  blueprintId,
  columnIndexMap,
}: {
  laneType: string;
  column: Column;
  sections: TeamSectionData[];
  teams: Team[];
  softwareServices: SoftwareService[];
  blueprintId: string;
  columnIndexMap: Map<string, number>;
}) {
  const cache = useBlueprintCache();
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Decision cards are now allowed in Frontstage/Backstage
  const allowsDecisionCards = DECISION_ALLOWED_LANES.includes(laneType);
  const decisionCards = allowsDecisionCards 
    ? column.decisionCards.filter(c => c.laneType === laneType).sort((a, b) => a.order - b.order)
    : [];

  useEffect(() => {
    if (isCreatingTeam && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [isCreatingTeam]);

  // Create team section WITHOUT auto-creating a card
  const handleCreateTeamSection = (teamId: string) => {
    cache.createTeamSection(column.id, laneType, teamId);
  };

  const handleCreateNewTeam = () => {
    if (!newTeamName.trim()) return;
    const { teamId } = cache.createTeam();
    cache.updateTeam(teamId, "name", newTeamName.trim());
    cache.createTeamSection(column.id, laneType, teamId);
    setNewTeamName("");
    setIsCreatingTeam(false);
  };

  // Check if ANY team exists in this column (Frontstage OR Backstage)
  // Only one team per column across both complex lanes
  const columnHasTeam = column.teamSections.length > 0;

  return (
    <>
      {/* Team Sections with integrated decision cards */}
      <div className="space-y-0">
        {sections.map((section) => (
          <TeamSectionComponent
            key={section.id}
            section={section}
            softwareServices={softwareServices}
            blueprintId={blueprintId}
            columnIndexMap={columnIndexMap}
            decisionCards={decisionCards}
            columnId={column.id}
            laneType={laneType}
          />
        ))}
      </div>

      {/* Add Team button - only shown when no team exists in this COLUMN (across all complex lanes) */}
      {!columnHasTeam && (
        <div className="p-2">
          {isCreatingTeam ? (
            <div className="space-y-1">
              <input
                ref={nameInputRef}
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateNewTeam();
                  if (e.key === "Escape") { setNewTeamName(""); setIsCreatingTeam(false); }
                }}
                placeholder="Team name"
                className="w-full rounded border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] px-2 py-1 text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                style={{ fontSize: "var(--font-size-meta)" }}
              />
              <div className="flex gap-1">
                <button
                  onClick={handleCreateNewTeam}
                  className="flex-1 rounded bg-[var(--accent-primary)] py-0.5 text-white"
                  style={{ fontSize: "var(--font-size-meta)" }}
                >
                  Create
                </button>
                <button
                  onClick={() => { setNewTeamName(""); setIsCreatingTeam(false); }}
                  className="flex-1 rounded bg-[var(--bg-hover)] py-0.5 text-[var(--text-muted)]"
                  style={{ fontSize: "var(--font-size-meta)" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : teams.length > 0 ? (
            <TeamSelector
              teams={teams}
              onSelectTeam={handleCreateTeamSection}
              onCreateNew={() => setIsCreatingTeam(true)}
            />
          ) : (
            <button
              onClick={() => setIsCreatingTeam(true)}
              className="flex w-full items-center justify-center gap-1 rounded border border-dashed border-[var(--border-subtle)] py-2 text-[var(--text-muted)] transition-colors hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
              style={{ fontSize: "var(--font-size-meta)" }}
            >
              <AppIcon name="add" size="xs" />
              Team
            </button>
          )}
        </div>
      )}
    </>
  );
}

// ============================================
// TEAM SELECTOR DROPDOWN
// ============================================

function TeamSelector({
  teams,
  onSelectTeam,
  onCreateNew,
  compact = false,
}: {
  teams: Team[];
  onSelectTeam: (teamId: string) => void;
  onCreateNew: () => void;
  compact?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  if (compact && teams.length === 0) {
    return (
      <button
        onClick={onCreateNew}
        className="flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--accent-primary)]"
        style={{ fontSize: "var(--font-size-meta)" }}
      >
        <AppIcon name="add" size="xs" />
        Team
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex w-full items-center justify-center gap-1 rounded border border-dashed border-[var(--border-subtle)] ${compact ? "py-1" : "py-2"} text-[var(--text-muted)] transition-colors hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]`}
        style={{ fontSize: "var(--font-size-meta)" }}
      >
        <AppIcon name="add" size="xs" />
        {compact ? "Team" : "Select team"}
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] py-1 shadow-lg">
          {teams.map((team) => (
            <button
              key={team.id}
              onClick={() => { onSelectTeam(team.id); setIsOpen(false); }}
              className="flex w-full items-center gap-2 px-2 py-1 text-left hover:bg-[var(--bg-hover)]"
              style={{ fontSize: "var(--font-size-meta)" }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "14px", color: team.colorHex }}
              >
                {team.iconName}
              </span>
              <span style={{ color: team.colorHex }}>{team.name}</span>
            </button>
          ))}
          <div className="border-t border-[var(--border-muted)] my-1" />
          <button
            onClick={() => { onCreateNew(); setIsOpen(false); }}
            className="flex w-full items-center gap-2 px-2 py-1 text-left text-[var(--accent-primary)] hover:bg-[var(--bg-hover)]"
            style={{ fontSize: "var(--font-size-meta)" }}
          >
            <AppIcon name="add" size="xs" />
            New team
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================
// TEAM SECTION COMPONENT (Header spans full width)
// ============================================

// Flow node type for complex lanes (unified ordering with decision cards)
type ComplexFlowNode = 
  | { type: "complex"; card: ComplexCard }
  | { type: "decision"; card: DecisionCard };

function TeamSectionComponent({
  section,
  softwareServices,
  blueprintId,
  columnIndexMap,
  decisionCards,
  columnId,
  laneType,
}: {
  section: TeamSectionData;
  softwareServices: SoftwareService[];
  blueprintId: string;
  columnIndexMap: Map<string, number>;
  decisionCards: DecisionCard[];
  columnId: string;
  laneType: string;
}) {
  const cache = useBlueprintCache();
  const [showMenu, setShowMenu] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [insertMenuIndex, setInsertMenuIndex] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { hasVerticalDecisionConnector, highlightedCardIds } = useConnectionDrag();
  
  // Dim team header when highlight is active but no cards in this section are highlighted
  const hasRelevantCard = section.cards.some((c) => highlightedCardIds.has(c.id)) ||
    decisionCards.some((c) => highlightedCardIds.has(c.id));
  const isTeamHeaderDimmed = highlightedCardIds.size > 0 && !hasRelevantCard;

  // Drag-and-drop reorder state
  const [dragState, setDragState] = useState<CardReorderState>(INITIAL_REORDER_STATE);
  const cardsContainerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Create unified flow nodes: complex cards + decision cards, sorted by order
  // Cards of different types share the same order space per lane
  const flowNodes: ComplexFlowNode[] = [
    ...section.cards.map(card => ({ type: "complex" as const, card })),
    ...decisionCards.map(card => ({ type: "decision" as const, card })),
  ].sort((a, b) => a.card.order - b.card.order);

  const handleAddCard = () => {
    const { cardId } = cache.createComplexCard(section.id);
    sessionStorage.setItem("focusCardTitle", cardId);
  };

  const handleAddDecisionCard = () => {
    const { cardId } = cache.createDecisionCard(columnId, laneType);
    sessionStorage.setItem("focusCardTitle", cardId);
  };

  const handleInsertCard = (atOrder: number, type: "complex" | "decision") => {
    setInsertMenuIndex(null);
    if (type === "complex") {
      const { cardId } = cache.insertComplexCardAt(section.id, atOrder);
      sessionStorage.setItem("focusCardTitle", cardId);
    } else {
      const { cardId } = cache.createDecisionCard(columnId, laneType, atOrder);
      sessionStorage.setItem("focusCardTitle", cardId);
    }
  };

  // Drag handlers for complex cards
  const handleStartCardDrag = (cardId: string, cardType: CardType, index: number) => {
    setDragState({
      draggingCardId: cardId,
      draggingCardType: cardType,
      sourceIndex: index,
      dropTargetIndex: index,
    });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState.draggingCardId || !cardsContainerRef.current) return;
    
    const containerRect = cardsContainerRef.current.getBoundingClientRect();
    const mouseY = e.clientY - containerRect.top;
    
    // Calculate drop target based on mouse Y position
    let targetIndex = flowNodes.length; // Default to end
    let cumY = 0;
    
    for (let i = 0; i < flowNodes.length; i++) {
      const node = flowNodes[i];
      const el = cardRefs.current.get(node.card.id);
      if (!el) continue;
      
      const cardHeight = el.offsetHeight + 8; // Include gap
      if (mouseY < cumY + cardHeight / 2) {
        targetIndex = i;
        break;
      }
      cumY += cardHeight;
    }
    
    setDragState(prev => ({ ...prev, dropTargetIndex: targetIndex }));
  }, [dragState.draggingCardId, flowNodes]);

  const handleMouseUp = useCallback(async () => {
    if (!dragState.draggingCardId || dragState.dropTargetIndex === null) {
      setDragState(INITIAL_REORDER_STATE);
      return;
    }

    const sourceIdx = dragState.sourceIndex;
    let targetIdx = dragState.dropTargetIndex;
    
    // Adjust target if dragging downward (account for removal)
    if (targetIdx > sourceIdx) {
      targetIdx = targetIdx - 1;
    }
    
    if (sourceIdx !== targetIdx && targetIdx >= 0 && targetIdx < flowNodes.length) {
      const targetNode = flowNodes[targetIdx];
      const targetOrder = targetNode.card.order;
      
      if (dragState.draggingCardType === "complex") {
        cache.updateComplexCardOrder(dragState.draggingCardId, targetOrder);
      } else if (dragState.draggingCardType === "decision") {
        cache.updateDecisionCardOrder(dragState.draggingCardId, targetOrder);
      }
    }
    
    setDragState(INITIAL_REORDER_STATE);
  }, [dragState, flowNodes, cache]);

  useEffect(() => {
    if (dragState.draggingCardId) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [dragState.draggingCardId, handleMouseMove, handleMouseUp]);

  const cardReorderValue: CardReorderContextValue = {
    reorderState: dragState,
    startCardDrag: handleStartCardDrag,
    updateDropTarget: (index) => setDragState(prev => ({ ...prev, dropTargetIndex: index })),
    endCardDrag: () => setDragState(INITIAL_REORDER_STATE),
    isDraggingCards: !!dragState.draggingCardId,
  };

  const handleColorSelect = (token: TeamColorToken) => {
    cache.updateTeam(section.team.id, "colorHex", token.background);
    setShowColorPicker(false);
    setShowMenu(false);
  };

  const handleIconSelect = (iconName: string) => {
    cache.updateTeam(section.team.id, "iconName", iconName);
    setShowIconPicker(false);
    setShowMenu(false);
  };

  const handleDuplicate = () => {
    cache.duplicateTeamSection(section.id);
    setShowMenu(false);
  };

  const handleDelete = () => {
    if (confirm(`Remove team "${section.team.name}" and its cards from this cell?`)) {
      cache.deleteTeamSection(section.id);
    }
    setShowMenu(false);
  };

  const textColor = getContrastTextColor(section.team.colorHex);

  return (
    <div>
      {/* Team header - FULL WIDTH, edge-to-edge; fades when all cards in section are dimmed */}
      <div
        className="flex items-center justify-between px-2 py-1.5 transition-opacity duration-150"
        style={{ backgroundColor: section.team.colorHex, opacity: isTeamHeaderDimmed ? 0.2 : 1 }}
      >
        <div className="flex items-center gap-1.5">
          <span
            className="material-symbols-outlined"
            style={{ fontSize: "14px", color: textColor }}
          >
            {section.team.iconName}
          </span>
          <span style={{ fontSize: "11px", fontWeight: 600, color: textColor }}>
            {section.team.name}
          </span>
        </div>

        {/* 3-dot menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex h-5 w-5 items-center justify-center rounded hover:bg-black/10"
            style={{ color: textColor }}
          >
            <AppIcon name="more" size="xs" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-full z-50 mt-1 min-w-[160px] rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] py-1 shadow-lg">
              {showColorPicker ? (
                <TeamColorTokenPicker
                  currentColor={section.team.colorHex}
                  onSelect={handleColorSelect}
                  onBack={() => setShowColorPicker(false)}
                />
              ) : showIconPicker ? (
                <div className="relative">
                  <IconPicker
                    currentIcon={section.team.iconName}
                    onSelect={handleIconSelect}
                    onClose={() => { setShowIconPicker(false); setShowMenu(false); }}
                  />
                </div>
              ) : (
                <>
                  <button
                    onClick={() => setShowColorPicker(true)}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                    style={{ fontSize: "var(--font-size-meta)" }}
                  >
                    <span
                      className="h-3 w-3 rounded border border-[var(--border-muted)]"
                      style={{ backgroundColor: section.team.colorHex }}
                    />
                    Change colour
                  </button>
                  <button
                    onClick={() => setShowIconPicker(true)}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                    style={{ fontSize: "var(--font-size-meta)" }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
                      {section.team.iconName}
                    </span>
                    Change icon
                  </button>
                  <button
                    onClick={handleDuplicate}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                    style={{ fontSize: "var(--font-size-meta)" }}
                  >
                    <AppIcon name="duplicate" size="xs" />
                    Duplicate team
                  </button>
                  <div className="border-t border-[var(--border-muted)] my-1" />
                  <button
                    onClick={handleDelete}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[var(--emotion-1)] hover:bg-[var(--bg-hover)]"
                    style={{ fontSize: "var(--font-size-meta)" }}
                  >
                    <AppIcon name="delete" size="xs" />
                    Delete team
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Cards - unified flow with complex cards and decision cards */}
      <CardReorderContext.Provider value={cardReorderValue}>
        <div ref={cardsContainerRef} className="space-y-2 px-4 py-2">
          {flowNodes.map((node, index) => {
            // Check if this card has a vertical decision connector targeting it
            const needsExtraSpacing = hasVerticalDecisionConnector(node.card.id);
            const isDragging = dragState.draggingCardId === node.card.id;
            const showDropPlaceholderBefore = dragState.draggingCardId && 
              dragState.dropTargetIndex === index && 
              dragState.sourceIndex !== index;
            const showDropPlaceholderAfter = dragState.draggingCardId && 
              dragState.dropTargetIndex === flowNodes.length && 
              index === flowNodes.length - 1 &&
              dragState.sourceIndex !== flowNodes.length;
            
            return (
              <React.Fragment key={node.card.id}>
                {/* Extra spacing for vertical decision connector - arrow is rendered by ConnectionOverlay */}
                {needsExtraSpacing && (
                  <div className="h-12" />
                )}
                
                {/* Drop placeholder before this card */}
                {showDropPlaceholderBefore && (
                  <div className="h-12 rounded border-2 border-dashed border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 transition-all" />
                )}
                
                {/* Insertion point before each card (only when not dragging) */}
                {!dragState.draggingCardId && (
                  <ComplexInsertionPoint
                    isVisible={insertMenuIndex === index}
                    onShowMenu={() => setInsertMenuIndex(insertMenuIndex === index ? null : index)}
                    onInsert={(type) => handleInsertCard(node.card.order, type)}
                    onClose={() => setInsertMenuIndex(null)}
                  />
                )}
                
                {/* The card itself (or placeholder if being dragged) */}
                {isDragging ? (
                  <div className="h-12 rounded border-2 border-dashed border-[var(--border-muted)] bg-[var(--bg-sidebar)]/50 transition-all" />
                ) : (
                  <div ref={(el) => { if (el) cardRefs.current.set(node.card.id, el); }}>
                    {node.type === "complex" ? (
                      <ComplexCardComponent
                        card={node.card}
                        softwareServices={softwareServices}
                        blueprintId={blueprintId}
                        teamColor={section.team.colorHex}
                        columnIndex={columnIndexMap.get(node.card.id) ?? 0}
                        cardIndex={index}
                        onStartCardDrag={flowNodes.length > 1 ? handleStartCardDrag : undefined}
                      />
                    ) : (
                      <DecisionCardComponent
                        card={node.card}
                        columnIndex={columnIndexMap.get(node.card.id) ?? 0}
                        cardIndex={index}
                        onStartCardDrag={flowNodes.length > 1 ? handleStartCardDrag : undefined}
                      />
                    )}
                  </div>
                )}
                
                {/* Drop placeholder after last card */}
                {showDropPlaceholderAfter && (
                  <div className="h-12 rounded border-2 border-dashed border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 transition-all" />
                )}
              </React.Fragment>
            );
          })}

          {/* Add card buttons */}
          <div className="flex gap-1 mt-1.5">
            <button
              onClick={handleAddCard}
              className="flex flex-1 items-center justify-center gap-1 rounded border border-dashed border-[var(--border-subtle)] py-1 text-[var(--text-muted)] transition-colors hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
              style={{ fontSize: "var(--font-size-meta)" }}
            >
              <AppIcon name="add" size="xs" />
              Card
            </button>
            <button
              onClick={handleAddDecisionCard}
              className="flex items-center justify-center gap-1 rounded border border-dashed border-[var(--border-subtle)] px-2 py-1 text-[var(--text-muted)] transition-all hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
              style={{ fontSize: "var(--font-size-meta)" }}
              title="Add Decision"
            >
              <AppIcon name="decision" size="xs" />
            </button>
          </div>
        </div>
      </CardReorderContext.Provider>
    </div>
  );
}

// Insertion point for complex lanes
function ComplexInsertionPoint({
  isVisible,
  onShowMenu,
  onInsert,
  onClose,
}: {
  isVisible: boolean;
  onShowMenu: () => void;
  onInsert: (type: "complex" | "decision") => void;
  onClose: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    if (!isVisible) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isVisible, onClose]);

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ height: isVisible || isHovered ? "20px" : "6px", transition: "height 0.15s ease" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {(isHovered || isVisible) && (
        <button
          onClick={onShowMenu}
          className="absolute flex items-center gap-1 rounded-full bg-[var(--bg-panel)] px-1.5 py-0.5 text-[var(--text-muted)] shadow-sm border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-all"
          style={{ fontSize: "9px", zIndex: 10 }}
        >
          <AppIcon name="add" size="xs" />
        </button>
      )}
      {isVisible && (
        <div
          ref={menuRef}
          className="absolute top-full left-1/2 -translate-x-1/2 mt-1 flex gap-1 rounded-md bg-[var(--bg-panel)] p-1 shadow-lg border border-[var(--border-subtle)]"
          style={{ zIndex: 20 }}
        >
          <button
            onClick={() => onInsert("complex")}
            className="flex items-center gap-1 rounded px-2 py-1 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
            style={{ fontSize: "10px" }}
          >
            <AppIcon name="article" size="xs" />
            Card
          </button>
          <button
            onClick={() => onInsert("decision")}
            className="flex items-center gap-1 rounded px-2 py-1 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
            style={{ fontSize: "10px" }}
          >
            <AppIcon name="decision" size="xs" />
            Decision
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================
// TEAM COLOR TOKEN PICKER (AA-safe palette)
// ============================================

function TeamColorTokenPicker({
  currentColor,
  onSelect,
  onBack,
}: {
  currentColor: string;
  onSelect: (token: TeamColorToken) => void;
  onBack: () => void;
}) {
  return (
    <div className="p-2">
      <button
        onClick={onBack}
        className="mb-2 flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        style={{ fontSize: "var(--font-size-meta)" }}
      >
        <AppIcon name="chevronLeft" size="xs" />
        Back
      </button>
      <div className="grid grid-cols-6 gap-1">
        {TEAM_COLOR_TOKENS.map((token) => (
          <button
            key={token.id}
            onClick={() => onSelect(token)}
            className={`h-6 w-6 rounded transition-transform hover:scale-110 ${
              token.background.toLowerCase() === currentColor.toLowerCase()
                ? "ring-2 ring-[var(--accent-primary)] ring-offset-1"
                : ""
            }`}
            style={{ backgroundColor: token.background }}
            title={token.name}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================
// BASIC CARD COMPONENT
// ============================================

function BasicCardComponent({
  card,
  columnIndex,
  cardIndex,
  onStartCardDrag,
}: {
  card: BasicCard;
  columnIndex: number;
  cardIndex: number;
  onStartCardDrag?: (cardId: string, cardType: CardType, index: number) => void;
}) {
  const cache = useBlueprintCache();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(card.title);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const { isDragging, isDraggingFromBottom, dragSourceCardId, startDrag, setHoveredTarget, hoveredTargetId, registerCard, getCardBelow, setHighlightedCardId, highlightedCardId, highlightedCardIds } = useConnectionDrag();
  const { reorderState } = useCardReorder();

  const painPoints: PainPoint[] = card.painPoints ? JSON.parse(card.painPoints) : [];
  
  // Check if this card should be dimmed (another card is highlighted but this isn't related)
  const isHighlightActive = highlightedCardId !== null;
  const isPartOfHighlight = highlightedCardIds.has(card.id);
  const isDimmed = isHighlightActive && !isPartOfHighlight;
  const isBeingDragged = reorderState.draggingCardId === card.id;
  
  // Top anchor is only visible when dragging from bottom of the card above
  const isTopAnchorVisible = isDraggingFromBottom && dragSourceCardId !== null && getCardBelow(dragSourceCardId) === card.id;

  // Register card element for position tracking
  useEffect(() => {
    registerCard(card.id, "basic", columnIndex, cardRef.current);
    return () => registerCard(card.id, "basic", columnIndex, null);
  }, [card.id, columnIndex, registerCard]);

  useEffect(() => {
    const focusId = sessionStorage.getItem("focusCardTitle");
    if (focusId === card.id) {
      sessionStorage.removeItem("focusCardTitle");
      setIsEditingTitle(true);
    }
  }, [card.id]);

  useEffect(() => {
    if (isEditingTitle && titleRef.current) {
      titleRef.current.focus();
      titleRef.current.select();
    }
  }, [isEditingTitle]);

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
    if (title.trim() !== card.title) {
      cache.updateBasicCard(card.id, "title", title.trim() || "Untitled");
    }
  };

  const handleDelete = () => {
    if (confirm("Delete this card?")) {
      cache.deleteBasicCard(card.id);
    }
  };

  const handleStartDrag = (point: Point) => {
    startDrag(card.id, "basic", point);
  };

  const isDropTarget = isDragging && hoveredTargetId === card.id;

  const handleDragStart = (e: React.MouseEvent) => {
    if (isEditingTitle) return;
    e.preventDefault();
    if (onStartCardDrag) {
      onStartCardDrag(card.id, "basic", cardIndex);
    }
  };

  return (
    <div
      ref={cardRef}
      data-card-id={card.id}
      className={`relative flex items-start gap-2 rounded border bg-[var(--bg-sidebar)] p-2 transition-all hover:shadow-sm ${
        isDropTarget ? "border-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)] ring-opacity-30" : "border-[var(--border-subtle)]"
      } ${isBeingDragged ? "opacity-50 scale-95" : ""} ${isDimmed ? "opacity-20" : ""}`}
      style={{ transition: "opacity 0.15s, box-shadow 0.15s, transform 0.15s" }}
      onMouseEnter={() => { setIsHovered(true); setHighlightedCardId(card.id); }}
      onMouseLeave={() => { setIsHovered(false); setHighlightedCardId(null); }}
    >
      <BlueprintSelectModeCheckbox cardId={card.id} cardType="basic" />
      <div className="min-w-0 flex-1">
      {/* Drag handle - hidden when dragging a connection */}
      {isHovered && onStartCardDrag && !isDragging && (
        <div
          className="absolute -top-1 left-1/2 -translate-x-1/2 cursor-grab active:cursor-grabbing rounded bg-[var(--bg-panel)] px-2 py-0.5 shadow-sm border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] transition-colors z-20"
          onMouseDown={handleDragStart}
          title="Drag to reorder"
        >
          <AppIcon name="dragHandle" size="xs" className="text-[var(--text-muted)]" />
        </div>
      )}
      {/* Start/End badge */}
      {(card.isStart || card.isEnd) && (
        <div className="absolute -top-2 left-2 flex gap-1">
          {card.isStart && (
            <span className="rounded bg-[var(--emotion-5)] px-1.5 py-0.5 text-white" style={{ fontSize: "8px", fontWeight: 600 }}>
              Start
            </span>
          )}
          {card.isEnd && (
            <span className="rounded bg-[var(--emotion-1)] px-1.5 py-0.5 text-white" style={{ fontSize: "8px", fontWeight: 600 }}>
              End
            </span>
          )}
        </div>
      )}

      {/* Connection anchors - left, right, and top (top only visible when dragging from bottom of card above) */}
      <ConnectionAnchorPoint
        side="top"
        isVisible={isTopAnchorVisible}
        isDropTarget={isDropTarget && isTopAnchorVisible}
        onHover={(hovering) => hovering ? setHoveredTarget(card.id) : setHoveredTarget(null)}
      />
      <ConnectionAnchorPoint
        side="left"
        isVisible={isHovered || isDragging}
        isDropTarget={isDropTarget}
        onHover={(hovering) => hovering ? setHoveredTarget(card.id) : setHoveredTarget(null)}
      />
      <ConnectionAnchorPoint
        side="right"
        isVisible={isHovered}
        onStartDrag={handleStartDrag}
      />

      {isEditingTitle ? (
        <input
          ref={titleRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleTitleBlur();
            if (e.key === "Escape") { setTitle(card.title); setIsEditingTitle(false); }
          }}
          className="w-full rounded border border-[var(--accent-primary)] bg-[var(--bg-panel)] px-1 text-[var(--text-primary)] outline-none"
          style={{ fontSize: "var(--font-size-cell)" }}
        />
      ) : (
        <div
          onClick={() => setIsEditingTitle(true)}
          className="cursor-text truncate text-[var(--text-primary)] hover:text-[var(--accent-primary)]"
          style={{ fontSize: "var(--font-size-cell)" }}
        >
          {card.title}
        </div>
      )}

      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="mt-1 flex items-center gap-0.5 text-[var(--text-muted)] hover:text-[var(--accent-primary)]"
        style={{ fontSize: "var(--font-size-meta)" }}
      >
        <AppIcon name={isExpanded ? "chevronUp" : "chevronDown"} size="xs" />
        {isExpanded ? "Less" : "More"}
      </button>

      {isExpanded && (
        <BasicCardExpanded
          card={card}
          painPoints={painPoints}
          onDelete={handleDelete}
        />
      )}
      </div>
    </div>
  );
}

// ============================================
// BASIC CARD EXPANDED
// ============================================

function BasicCardExpanded({
  card,
  painPoints,
  onDelete,
}: {
  card: BasicCard;
  painPoints: PainPoint[];
  onDelete: () => void;
}) {
  const cache = useBlueprintCache();
  const [description, setDescription] = useState(card.description || "");
  const [isEditingDesc, setIsEditingDesc] = useState(false);

  const handleDescBlur = () => {
    setIsEditingDesc(false);
    if (description.trim() !== (card.description || "")) {
      cache.updateBasicCard(card.id, "description", description.trim() || null);
    }
  };

  const handleToggleStart = () => {
    cache.updateBasicCardMarkers(card.id, { isStart: !card.isStart });
  };

  const handleToggleEnd = () => {
    cache.updateBasicCardMarkers(card.id, { isEnd: !card.isEnd });
  };

  return (
    <div className="mt-2 space-y-2 border-t border-[var(--border-muted)] pt-2">
      <div>
        <label className="mb-0.5 block text-[var(--text-muted)]" style={{ fontSize: "9px" }}>
          Description
        </label>
        {isEditingDesc ? (
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={handleDescBlur}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setDescription(card.description || "");
                setIsEditingDesc(false);
              }
            }}
            rows={2}
            autoFocus
            className="w-full resize-none rounded border border-[var(--accent-primary)] bg-[var(--bg-panel)] px-1 py-0.5 text-[var(--text-secondary)] outline-none"
            style={{ fontSize: "var(--font-size-meta)" }}
          />
        ) : (
          <div
            onClick={() => setIsEditingDesc(true)}
            className="cursor-text rounded bg-[var(--bg-panel)] px-1 py-0.5 text-[var(--text-secondary)] hover:ring-1 hover:ring-[var(--border-subtle)]"
            style={{ fontSize: "var(--font-size-meta)", minHeight: 32 }}
          >
            {card.description || <span className="text-[var(--text-muted)]">Add description...</span>}
          </div>
        )}
      </div>

      <InlinePainPointEditor
        cardId={card.id}
        cardType="basic"
        painPoints={painPoints}
      />

      {/* Start/End markers */}
      <div>
        <label className="mb-0.5 block text-[var(--text-muted)]" style={{ fontSize: "9px" }}>
          Flow Markers
        </label>
        <div className="flex gap-2">
          <button
            onClick={handleToggleStart}
            className={`flex items-center gap-1 rounded px-2 py-0.5 transition-colors ${
              card.isStart 
                ? "bg-[var(--emotion-5)] text-white" 
                : "bg-[var(--bg-hover)] text-[var(--text-muted)] hover:bg-[var(--bg-sidebar)]"
            }`}
            style={{ fontSize: "var(--font-size-meta)" }}
          >
            <AppIcon name="start" size="xs" />
            Start
          </button>
          <button
            onClick={handleToggleEnd}
            className={`flex items-center gap-1 rounded px-2 py-0.5 transition-colors ${
              card.isEnd 
                ? "bg-[var(--emotion-1)] text-white" 
                : "bg-[var(--bg-hover)] text-[var(--text-muted)] hover:bg-[var(--bg-sidebar)]"
            }`}
            style={{ fontSize: "var(--font-size-meta)" }}
          >
            <AppIcon name="stop" size="xs" />
            End
          </button>
        </div>
      </div>

      <button
        onClick={onDelete}
        className="flex items-center gap-1 text-[var(--emotion-1)] hover:underline"
        style={{ fontSize: "var(--font-size-meta)" }}
      >
        <AppIcon name="delete" size="xs" />
        Delete card
      </button>
    </div>
  );
}

// ============================================
// DECISION CARD COMPONENT
// ============================================

function DecisionCardComponent({
  card,
  columnIndex,
  cardIndex,
  onStartCardDrag,
}: {
  card: DecisionCard;
  columnIndex: number;
  cardIndex: number;
  onStartCardDrag?: (cardId: string, cardType: CardType, index: number) => void;
}) {
  const cache = useBlueprintCache();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(card.title);
  const [isEditingQuestion, setIsEditingQuestion] = useState(false);
  const [question, setQuestion] = useState(card.question);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const questionRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const { isDragging, isDraggingFromBottom, dragSourceCardId, startDrag, setHoveredTarget, hoveredTargetId, registerCard, getCardBelow, setHighlightedCardId, highlightedCardId, highlightedCardIds } = useConnectionDrag();
  const { reorderState } = useCardReorder();
  const isBeingDragged = reorderState.draggingCardId === card.id;
  
  // Top anchor is only visible when dragging from bottom of the card above
  const isTopAnchorVisible = isDraggingFromBottom && dragSourceCardId !== null && getCardBelow(dragSourceCardId) === card.id;
  
  // Check if this card should be dimmed (another card is highlighted but this isn't related)
  const isHighlightActive = highlightedCardId !== null;
  const isPartOfHighlight = highlightedCardIds.has(card.id);
  const isDimmed = isHighlightActive && !isPartOfHighlight;

  // Register card element for position tracking
  useEffect(() => {
    registerCard(card.id, "decision", columnIndex, cardRef.current);
    return () => registerCard(card.id, "decision", columnIndex, null);
  }, [card.id, columnIndex, registerCard]);

  useEffect(() => {
    const focusId = sessionStorage.getItem("focusCardTitle");
    if (focusId === card.id) {
      sessionStorage.removeItem("focusCardTitle");
      setIsEditingTitle(true);
    }
  }, [card.id]);

  useEffect(() => {
    if (isEditingTitle && titleRef.current) {
      titleRef.current.focus();
      titleRef.current.select();
    }
  }, [isEditingTitle]);

  useEffect(() => {
    if (isEditingQuestion && questionRef.current) {
      questionRef.current.focus();
      questionRef.current.select();
    }
  }, [isEditingQuestion]);

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
    if (title.trim() !== card.title) {
      cache.updateDecisionCard(card.id, "title", title.trim() || "Decision");
    }
  };

  const handleQuestionBlur = () => {
    setIsEditingQuestion(false);
    if (question.trim() !== card.question) {
      cache.updateDecisionCard(card.id, "question", question.trim() || "What condition?");
    }
  };

  const handleDelete = () => {
    if (confirm("Delete this decision card?")) {
      cache.deleteDecisionCard(card.id);
    }
  };

  const handleStartDrag = (point: Point) => {
    startDrag(card.id, "decision", point);
  };

  const isDropTarget = isDragging && hoveredTargetId === card.id;

  const handleCardDragStart = (e: React.MouseEvent) => {
    if (isEditingTitle || isEditingQuestion) return;
    e.preventDefault();
    if (onStartCardDrag) {
      onStartCardDrag(card.id, "decision", cardIndex);
    }
  };

  return (
    <div
      ref={cardRef}
      data-card-id={card.id}
      className={`relative flex items-start gap-2 rounded border-2 border-dashed p-2 transition-all hover:shadow-sm ${
        isDropTarget 
          ? "border-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)] ring-opacity-30" 
          : "border-[var(--border-subtle)] bg-[var(--bg-panel)]"
      } ${isBeingDragged ? "opacity-50 scale-95" : ""} ${isDimmed ? "opacity-20" : ""}`}
      style={{ backgroundColor: isDropTarget ? undefined : "var(--bg-app)", transition: "opacity 0.15s, box-shadow 0.15s, transform 0.15s" }}
      onMouseEnter={() => { setIsHovered(true); setHighlightedCardId(card.id); }}
      onMouseLeave={() => { setIsHovered(false); setHighlightedCardId(null); }}
    >
      <BlueprintSelectModeCheckbox cardId={card.id} cardType="decision" />
      <div className="min-w-0 flex-1">
      {/* Drag handle - hidden when dragging a connection */}
      {isHovered && onStartCardDrag && !isDragging && (
        <div
          className="absolute -top-1 left-1/2 -translate-x-1/2 cursor-grab active:cursor-grabbing rounded bg-[var(--bg-panel)] px-2 py-0.5 shadow-sm border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] transition-colors z-20"
          onMouseDown={handleCardDragStart}
          title="Drag to reorder"
        >
          <AppIcon name="dragHandle" size="xs" className="text-[var(--text-muted)]" />
        </div>
      )}
      {/* Start/End badge */}
      {(card.isStart || card.isEnd) && (
        <div className="absolute -top-2 left-2 flex gap-1">
          {card.isStart && (
            <span className="rounded bg-[var(--emotion-5)] px-1.5 py-0.5 text-white" style={{ fontSize: "8px", fontWeight: 600 }}>
              Start
            </span>
          )}
          {card.isEnd && (
            <span className="rounded bg-[var(--emotion-1)] px-1.5 py-0.5 text-white" style={{ fontSize: "8px", fontWeight: 600 }}>
              End
            </span>
          )}
        </div>
      )}

      {/* Connection anchors - top only visible when dragging from bottom of card above */}
      <ConnectionAnchorPoint
        side="top"
        isVisible={isTopAnchorVisible}
        isDropTarget={isDropTarget && isTopAnchorVisible}
        onHover={(hovering) => hovering ? setHoveredTarget(card.id) : setHoveredTarget(null)}
      />
      <ConnectionAnchorPoint
        side="left"
        isVisible={isHovered || isDragging}
        isDropTarget={isDropTarget}
        onHover={(hovering) => hovering ? setHoveredTarget(card.id) : setHoveredTarget(null)}
      />
      <ConnectionAnchorPoint
        side="right"
        isVisible={isHovered}
        onStartDrag={handleStartDrag}
      />
      <ConnectionAnchorPoint
        side="bottom"
        isVisible={isHovered}
        onStartDrag={handleStartDrag}
      />

      {/* Decision label with icon */}
      <div 
        className="mb-1 flex items-center gap-1 text-[var(--text-muted)] uppercase tracking-wider"
        style={{ fontSize: "9px", fontWeight: 600 }}
      >
        <AppIcon name="decision" size="xs" />
        Decision
      </div>

      {/* Title */}
      {isEditingTitle ? (
        <input
          ref={titleRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleTitleBlur();
            if (e.key === "Escape") { setTitle(card.title); setIsEditingTitle(false); }
          }}
          className="w-full rounded border border-[var(--accent-primary)] bg-[var(--bg-panel)] px-1 font-medium text-[var(--text-primary)] outline-none"
          style={{ fontSize: "var(--font-size-cell)" }}
        />
      ) : (
        <div
          onClick={() => setIsEditingTitle(true)}
          className="cursor-text truncate font-medium text-[var(--text-primary)] hover:text-[var(--accent-primary)]"
          style={{ fontSize: "var(--font-size-cell)" }}
        >
          {card.title}
        </div>
      )}

      {/* Question */}
      {isEditingQuestion ? (
        <input
          ref={questionRef}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onBlur={handleQuestionBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleQuestionBlur();
            if (e.key === "Escape") { setQuestion(card.question); setIsEditingQuestion(false); }
          }}
          className="mt-1 w-full rounded border border-[var(--accent-primary)] bg-[var(--bg-panel)] px-1 italic text-[var(--text-secondary)] outline-none"
          style={{ fontSize: "var(--font-size-meta)" }}
        />
      ) : (
        <div
          onClick={() => setIsEditingQuestion(true)}
          className="mt-1 cursor-text italic text-[var(--text-secondary)] hover:text-[var(--accent-primary)]"
          style={{ fontSize: "var(--font-size-meta)" }}
        >
          {card.question}
        </div>
      )}

      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="mt-1 flex items-center gap-0.5 text-[var(--text-muted)] hover:text-[var(--accent-primary)]"
        style={{ fontSize: "var(--font-size-meta)" }}
      >
        <AppIcon name={isExpanded ? "chevronUp" : "chevronDown"} size="xs" />
        {isExpanded ? "Less" : "More"}
      </button>

      {isExpanded && (
        <DecisionCardExpanded
          card={card}
          onDelete={handleDelete}
        />
      )}
      </div>
    </div>
  );
}

// ============================================
// DECISION CARD EXPANDED
// ============================================

function DecisionCardExpanded({
  card,
  onDelete,
}: {
  card: DecisionCard;
  onDelete: () => void;
}) {
  const cache = useBlueprintCache();
  const [description, setDescription] = useState(card.description || "");
  const [isEditingDesc, setIsEditingDesc] = useState(false);

  const handleDescBlur = () => {
    setIsEditingDesc(false);
    if (description.trim() !== (card.description || "")) {
      cache.updateDecisionCard(card.id, "description", description.trim() || null);
    }
  };

  const handleToggleStart = () => {
    cache.updateDecisionCard(card.id, "isStart", !card.isStart);
  };

  const handleToggleEnd = () => {
    cache.updateDecisionCard(card.id, "isEnd", !card.isEnd);
  };

  return (
    <div className="mt-2 space-y-2 border-t border-[var(--border-muted)] pt-2">
      <div>
        <label className="mb-0.5 block text-[var(--text-muted)]" style={{ fontSize: "9px" }}>
          Description (optional)
        </label>
        {isEditingDesc ? (
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={handleDescBlur}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setDescription(card.description || "");
                setIsEditingDesc(false);
              }
            }}
            rows={2}
            autoFocus
            className="w-full resize-none rounded border border-[var(--accent-primary)] bg-[var(--bg-panel)] px-1 py-0.5 text-[var(--text-secondary)] outline-none"
            style={{ fontSize: "var(--font-size-meta)" }}
          />
        ) : (
          <div
            onClick={() => setIsEditingDesc(true)}
            className="cursor-text rounded bg-[var(--bg-panel)] px-1 py-0.5 text-[var(--text-secondary)] hover:ring-1 hover:ring-[var(--border-subtle)]"
            style={{ fontSize: "var(--font-size-meta)", minHeight: 32 }}
          >
            {card.description || <span className="text-[var(--text-muted)]">Add notes...</span>}
          </div>
        )}
      </div>

      {/* Start/End markers */}
      <div>
        <label className="mb-0.5 block text-[var(--text-muted)]" style={{ fontSize: "9px" }}>
          Flow Markers
        </label>
        <div className="flex gap-2">
          <button
            onClick={handleToggleStart}
            className={`flex items-center gap-1 rounded px-2 py-0.5 transition-colors ${
              card.isStart 
                ? "bg-[var(--emotion-5)] text-white" 
                : "bg-[var(--bg-hover)] text-[var(--text-muted)] hover:bg-[var(--bg-sidebar)]"
            }`}
            style={{ fontSize: "var(--font-size-meta)" }}
          >
            <AppIcon name="start" size="xs" />
            Start
          </button>
          <button
            onClick={handleToggleEnd}
            className={`flex items-center gap-1 rounded px-2 py-0.5 transition-colors ${
              card.isEnd 
                ? "bg-[var(--emotion-1)] text-white" 
                : "bg-[var(--bg-hover)] text-[var(--text-muted)] hover:bg-[var(--bg-sidebar)]"
            }`}
            style={{ fontSize: "var(--font-size-meta)" }}
          >
            <AppIcon name="stop" size="xs" />
            End
          </button>
        </div>
      </div>

      <button
        onClick={onDelete}
        className="flex items-center gap-1 text-[var(--emotion-1)] hover:underline"
        style={{ fontSize: "var(--font-size-meta)" }}
      >
        <AppIcon name="delete" size="xs" />
        Delete card
      </button>
    </div>
  );
}

// ============================================
// COMPLEX CARD COMPONENT (Solid color block)
// ============================================

function ComplexCardComponent({
  card,
  softwareServices,
  blueprintId,
  teamColor,
  columnIndex,
  cardIndex,
  onStartCardDrag,
}: {
  card: ComplexCard;
  softwareServices: SoftwareService[];
  blueprintId: string;
  teamColor: string;
  columnIndex: number;
  cardIndex: number;
  onStartCardDrag?: (cardId: string, cardType: CardType, index: number) => void;
}) {
  const cache = useBlueprintCache();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(card.title);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const { isDragging, isDraggingFromBottom, dragSourceCardId, startDrag, setHoveredTarget, hoveredTargetId, registerCard, getCardBelow, setHighlightedCardId, highlightedCardId, highlightedCardIds } = useConnectionDrag();
  const { reorderState } = useCardReorder();

  const painPoints: PainPoint[] = card.painPoints ? JSON.parse(card.painPoints) : [];
  const cardSoftwareIds: string[] = card.softwareIds ? JSON.parse(card.softwareIds) : [];
  const isBeingDragged = reorderState.draggingCardId === card.id;
  const cardSoftware = softwareServices.filter((s) => cardSoftwareIds.includes(s.id));
  
  // Top anchor is only visible when dragging from bottom of the card above
  const isTopAnchorVisible = isDraggingFromBottom && dragSourceCardId !== null && getCardBelow(dragSourceCardId) === card.id;
  
  // Check if this card should be dimmed (another card is highlighted but this isn't related)
  const isHighlightActive = highlightedCardId !== null;
  const isPartOfHighlight = highlightedCardIds.has(card.id);
  const isDimmed = isHighlightActive && !isPartOfHighlight;

  // Register card element for position tracking
  useEffect(() => {
    registerCard(card.id, "complex", columnIndex, cardRef.current);
    return () => registerCard(card.id, "complex", columnIndex, null);
  }, [card.id, columnIndex, registerCard]);

  useEffect(() => {
    const focusId = sessionStorage.getItem("focusCardTitle");
    if (focusId === card.id) {
      sessionStorage.removeItem("focusCardTitle");
      setIsEditingTitle(true);
    }
  }, [card.id]);

  useEffect(() => {
    if (isEditingTitle && titleRef.current) {
      titleRef.current.focus();
      titleRef.current.select();
    }
  }, [isEditingTitle]);

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
    if (title.trim() !== card.title) {
      cache.updateComplexCard(card.id, "title", title.trim() || "Untitled");
    }
  };

  const handleDelete = () => {
    if (confirm("Delete this card?")) {
      cache.deleteComplexCard(card.id);
    }
  };

  const handleStartDrag = (point: Point) => {
    startDrag(card.id, "complex", point);
  };

  // Card uses a lighter tint of team color with dark text for readability
  const cardBgColor = teamColor + "25"; // 15% opacity tint
  const isDropTarget = isDragging && hoveredTargetId === card.id;

  const handleCardDragStart = (e: React.MouseEvent) => {
    if (isEditingTitle) return;
    e.preventDefault();
    if (onStartCardDrag) {
      onStartCardDrag(card.id, "complex", cardIndex);
    }
  };

  return (
    <div
      ref={cardRef}
      data-card-id={card.id}
      className={`relative flex items-start gap-2 rounded-md border-l-4 bg-[var(--bg-sidebar)] p-2 transition-all ${
        isDropTarget ? "ring-2 ring-[var(--accent-primary)] ring-opacity-30" : ""
      } ${isBeingDragged ? "opacity-50 scale-95" : ""} ${isDimmed ? "opacity-20" : ""}`}
      style={{ borderLeftColor: teamColor, transition: "opacity 0.15s, box-shadow 0.15s, transform 0.15s" }}
      onMouseEnter={() => { setIsHovered(true); setHighlightedCardId(card.id); }}
      onMouseLeave={() => { setIsHovered(false); setHighlightedCardId(null); }}
    >
      <BlueprintSelectModeCheckbox cardId={card.id} cardType="complex" />
      <div className="min-w-0 flex-1">
      {/* Drag handle - hidden when dragging a connection */}
      {isHovered && onStartCardDrag && !isDragging && (
        <div
          className="absolute -top-1 left-1/2 -translate-x-1/2 cursor-grab active:cursor-grabbing rounded bg-[var(--bg-panel)] px-2 py-0.5 shadow-sm border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] transition-colors z-20"
          onMouseDown={handleCardDragStart}
          title="Drag to reorder"
        >
          <AppIcon name="dragHandle" size="xs" className="text-[var(--text-muted)]" />
        </div>
      )}
      {/* Start/End badge */}
      {(card.isStart || card.isEnd) && (
        <div className="absolute -top-2 left-2 flex gap-1">
          {card.isStart && (
            <span className="rounded bg-[var(--emotion-5)] px-1.5 py-0.5 text-white" style={{ fontSize: "8px", fontWeight: 600 }}>
              Start
            </span>
          )}
          {card.isEnd && (
            <span className="rounded bg-[var(--emotion-1)] px-1.5 py-0.5 text-white" style={{ fontSize: "8px", fontWeight: 600 }}>
              End
            </span>
          )}
        </div>
      )}

      {/* Connection anchors - top only visible when dragging from bottom of card above */}
      <ConnectionAnchorPoint
        side="top"
        isVisible={isTopAnchorVisible}
        isDropTarget={isDropTarget && isTopAnchorVisible}
        onHover={(hovering) => hovering ? setHoveredTarget(card.id) : setHoveredTarget(null)}
      />
      <ConnectionAnchorPoint
        side="left"
        isVisible={isHovered || isDragging}
        isDropTarget={isDropTarget}
        onHover={(hovering) => hovering ? setHoveredTarget(card.id) : setHoveredTarget(null)}
      />
      <ConnectionAnchorPoint
        side="right"
        isVisible={isHovered}
        onStartDrag={handleStartDrag}
      />

      {isEditingTitle ? (
        <input
          ref={titleRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleTitleBlur();
            if (e.key === "Escape") { setTitle(card.title); setIsEditingTitle(false); }
          }}
          className="w-full rounded border border-[var(--accent-primary)] bg-[var(--bg-panel)] px-1 text-[var(--text-primary)] outline-none"
          style={{ fontSize: "11px" }}
        />
      ) : (
        <div
          onClick={() => setIsEditingTitle(true)}
          className="cursor-text truncate text-[var(--text-primary)] hover:text-[var(--accent-primary)]"
          style={{ fontSize: "11px", fontWeight: 500 }}
        >
          {card.title}
        </div>
      )}

      {cardSoftware.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-0.5">
          {cardSoftware.map((sw) => (
            <span
              key={sw.id}
              className="rounded px-1 py-0.5"
              style={{
                backgroundColor: sw.colorHex,
                color: getContrastTextColor(sw.colorHex),
                fontSize: "8px",
              }}
            >
              {sw.label}
            </span>
          ))}
        </div>
      )}

      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="mt-0.5 flex items-center gap-0.5 text-[var(--text-muted)] hover:text-[var(--accent-primary)]"
        style={{ fontSize: "9px" }}
      >
        <AppIcon name={isExpanded ? "chevronUp" : "chevronDown"} size="xs" />
        {isExpanded ? "Less" : "More"}
      </button>

      {isExpanded && (
        <ComplexCardExpanded
          card={card}
          painPoints={painPoints}
          softwareServices={softwareServices}
          cardSoftwareIds={cardSoftwareIds}
          blueprintId={blueprintId}
          teamColor={teamColor}
          onDelete={handleDelete}
        />
      )}
      </div>
    </div>
  );
}

// ============================================
// COMPLEX CARD EXPANDED
// ============================================

function ComplexCardExpanded({
  card,
  painPoints,
  softwareServices,
  cardSoftwareIds,
  blueprintId,
  teamColor,
  onDelete,
}: {
  card: ComplexCard;
  painPoints: PainPoint[];
  softwareServices: SoftwareService[];
  cardSoftwareIds: string[];
  blueprintId: string;
  teamColor: string;
  onDelete: () => void;
}) {
  const cache = useBlueprintCache();
  const [description, setDescription] = useState(card.description || "");
  const [isEditingDesc, setIsEditingDesc] = useState(false);

  const handleDescBlur = () => {
    setIsEditingDesc(false);
    if (description.trim() !== (card.description || "")) {
      cache.updateComplexCard(card.id, "description", description.trim() || null);
    }
  };

  const handleToggleStart = () => {
    cache.updateComplexCardMarkers(card.id, { isStart: !card.isStart });
  };

  const handleToggleEnd = () => {
    cache.updateComplexCardMarkers(card.id, { isEnd: !card.isEnd });
  };

  return (
    <div className="mt-2 space-y-2 border-t border-[var(--border-muted)] pt-2">
      <div>
        <label className="mb-0.5 block text-[var(--text-muted)]" style={{ fontSize: "9px" }}>
          Description
        </label>
        {isEditingDesc ? (
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={handleDescBlur}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setDescription(card.description || "");
                setIsEditingDesc(false);
              }
            }}
            rows={2}
            autoFocus
            className="w-full resize-none rounded border border-[var(--accent-primary)] bg-[var(--bg-panel)] px-1 py-0.5 text-[var(--text-secondary)] outline-none"
            style={{ fontSize: "var(--font-size-meta)" }}
          />
        ) : (
          <div
            onClick={() => setIsEditingDesc(true)}
            className="cursor-text rounded bg-[var(--bg-panel)] px-1 py-0.5 text-[var(--text-secondary)] hover:ring-1 hover:ring-[var(--border-subtle)]"
            style={{ fontSize: "var(--font-size-meta)", minHeight: 32 }}
          >
            {card.description || <span className="text-[var(--text-muted)]">Add description...</span>}
          </div>
        )}
      </div>

      <SoftwareServicesEditor
        cardId={card.id}
        softwareServices={softwareServices}
        cardSoftwareIds={cardSoftwareIds}
        blueprintId={blueprintId}
      />

      <InlinePainPointEditor
        cardId={card.id}
        cardType="complex"
        painPoints={painPoints}
      />

      {/* Start/End markers */}
      <div>
        <label className="mb-0.5 block text-[var(--text-muted)]" style={{ fontSize: "9px" }}>
          Flow Markers
        </label>
        <div className="flex gap-2">
          <button
            onClick={handleToggleStart}
            className={`flex items-center gap-1 rounded px-2 py-0.5 transition-colors ${
              card.isStart 
                ? "bg-[var(--emotion-5)] text-white" 
                : "bg-[var(--bg-hover)] text-[var(--text-muted)] hover:bg-[var(--bg-sidebar)]"
            }`}
            style={{ fontSize: "var(--font-size-meta)" }}
          >
            <AppIcon name="start" size="xs" />
            Start
          </button>
          <button
            onClick={handleToggleEnd}
            className={`flex items-center gap-1 rounded px-2 py-0.5 transition-colors ${
              card.isEnd 
                ? "bg-[var(--emotion-1)] text-white" 
                : "bg-[var(--bg-hover)] text-[var(--text-muted)] hover:bg-[var(--bg-sidebar)]"
            }`}
            style={{ fontSize: "var(--font-size-meta)" }}
          >
            <AppIcon name="stop" size="xs" />
            End
          </button>
        </div>
      </div>

      <button
        onClick={onDelete}
        className="flex items-center gap-1 text-[var(--emotion-1)] hover:underline"
        style={{ fontSize: "var(--font-size-meta)" }}
      >
        <AppIcon name="delete" size="xs" />
        Delete card
      </button>
    </div>
  );
}

// ============================================
// SOFTWARE/SERVICES EDITOR (with AA-safe colors)
// ============================================

function SoftwareServicesEditor({
  cardId,
  softwareServices,
  cardSoftwareIds,
  blueprintId,
}: {
  cardId: string;
  softwareServices: SoftwareService[];
  cardSoftwareIds: string[];
  blueprintId: string;
}) {
  const cache = useBlueprintCache();
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [editingColorId, setEditingColorId] = useState<string | null>(null);

  const toggleSoftware = (softwareId: string) => {
    const newIds = cardSoftwareIds.includes(softwareId)
      ? cardSoftwareIds.filter((id) => id !== softwareId)
      : [...cardSoftwareIds, softwareId];
    cache.updateComplexCardSoftware(cardId, newIds);
  };

  const handleCreate = () => {
    if (!newLabel.trim()) return;
    const { softwareId } = cache.createSoftwareService(newLabel.trim());
    cache.updateComplexCardSoftware(cardId, [...cardSoftwareIds, softwareId]);
    setNewLabel("");
    setIsCreating(false);
  };

  const handleColorSelect = (softwareId: string, token: SoftwareColorToken) => {
    cache.updateSoftwareService(softwareId, "colorHex", token.background);
    setEditingColorId(null);
  };

  return (
    <div className="relative">
      <label className="mb-0.5 block text-[var(--text-muted)]" style={{ fontSize: "8px" }}>
        Software/Services
      </label>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 rounded bg-white/20 px-1 py-0.5 text-[var(--text-primary)] hover:bg-white/30"
        style={{ fontSize: "9px" }}
      >
        <AppIcon name="add" size="xs" />
        Manage
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[160px] rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] py-1 shadow-lg">
          {softwareServices.map((sw) => (
            <div key={sw.id} className="flex items-center gap-1 px-2 py-1 hover:bg-[var(--bg-hover)]">
              <button
                onClick={() => toggleSoftware(sw.id)}
                className="flex items-center gap-1 flex-1 text-left"
                style={{ fontSize: "9px" }}
              >
                <span
                  className="h-2.5 w-2.5 rounded"
                  style={{
                    backgroundColor: cardSoftwareIds.includes(sw.id) ? sw.colorHex : "transparent",
                    border: `1px solid ${sw.colorHex}`,
                  }}
                />
                <span className="text-[var(--text-primary)]">{sw.label}</span>
              </button>
              {editingColorId === sw.id ? (
                <div className="absolute right-full top-0 mr-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-2 shadow-lg">
                  <div className="grid grid-cols-4 gap-1">
                    {SOFTWARE_COLOR_TOKENS.map((token) => (
                      <button
                        key={token.id}
                        onClick={() => handleColorSelect(sw.id, token)}
                        className={`h-5 w-5 rounded transition-transform hover:scale-110 ${
                          token.background.toLowerCase() === sw.colorHex.toLowerCase()
                            ? "ring-2 ring-[var(--accent-primary)] ring-offset-1"
                            : ""
                        }`}
                        style={{ backgroundColor: token.background }}
                        title={token.name}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => setEditingColorId(null)}
                    className="mt-1 w-full text-center text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    style={{ fontSize: "9px" }}
                  >
                    Done
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditingColorId(sw.id)}
                  className="h-3 w-3 rounded border border-[var(--border-muted)]"
                  style={{ backgroundColor: sw.colorHex }}
                  title="Change color"
                />
              )}
            </div>
          ))}
          <div className="border-t border-[var(--border-muted)] my-1" />
          {isCreating ? (
            <div className="px-2 py-1">
              <input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                  if (e.key === "Escape") setIsCreating(false);
                }}
                placeholder="Name"
                autoFocus
                className="w-full rounded border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] px-1 py-0.5 text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                style={{ fontSize: "9px" }}
              />
            </div>
          ) : (
            <button
              onClick={() => setIsCreating(true)}
              className="flex w-full items-center gap-1 px-2 py-1 text-left text-[var(--accent-primary)] hover:bg-[var(--bg-hover)]"
              style={{ fontSize: "9px" }}
            >
              <AppIcon name="add" size="xs" />
              New software
            </button>
          )}
          <button
            onClick={() => setIsOpen(false)}
            className="mt-1 flex w-full items-center justify-center py-0.5 text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
            style={{ fontSize: "9px" }}
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================
// INLINE PAIN POINT EDITOR (uses shared PainPointEditor)
// ============================================

import { PainPointEditor } from "../../../../components/PainPointEditor";
import type { PainPoint as SharedPainPoint } from "../../../../components/PainPointEditor";

function InlinePainPointEditor({
  cardId,
  cardType,
  painPoints,
}: {
  cardId: string;
  cardType: "basic" | "complex";
  painPoints: PainPoint[];
}) {
  const cache = useBlueprintCache();
  const [localPainPoints, setLocalPainPoints] = useState<SharedPainPoint[]>(painPoints);

  const handleUpdate = (newPainPoints: SharedPainPoint[]) => {
    setLocalPainPoints(newPainPoints);
    if (cardType === "basic") {
      cache.updateBasicCardPainPoints(cardId, newPainPoints as PainPoint[]);
    } else {
      cache.updateComplexCardPainPoints(cardId, newPainPoints as PainPoint[]);
    }
  };

  const fontSize = cardType === "basic" ? "11px" : "10px";
  const labelSize = cardType === "basic" ? "9px" : "8px";

  return (
    <div>
      <label className="mb-1 block text-[var(--text-muted)]" style={{ fontSize: labelSize }}>
        Pain Points
      </label>
      <PainPointEditor
        painPoints={localPainPoints}
        onUpdate={handleUpdate}
        fontSize={fontSize}
        compact={false}
      />
    </div>
  );
}

// ============================================
// CONNECTION ANCHOR POINT
// ============================================

function ConnectionAnchorPoint({
  side,
  isVisible,
  isDropTarget = false,
  onStartDrag,
  onHover,
  fromBottom = false, // For bottom anchor, indicates drag is from bottom
}: {
  side: "left" | "right" | "bottom" | "top";
  isVisible: boolean;
  isDropTarget?: boolean;
  onStartDrag?: (point: Point, fromBottom?: boolean) => void;
  onHover?: (hovering: boolean) => void;
  fromBottom?: boolean;
}) {
  const anchorRef = useRef<HTMLDivElement>(null);
  // Only right and bottom can START a drag (source anchors)
  // Left and top are receive-only (target anchors)
  const isDraggable = side === "right" || side === "bottom";
  const isReceiveOnly = side === "left" || side === "top";

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isDraggable || !onStartDrag || !anchorRef.current) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const rect = anchorRef.current.getBoundingClientRect();
    const container = anchorRef.current.closest("[data-connection-container]");
    if (!container) return;
    
    const containerRect = container.getBoundingClientRect();
    const scrollLeft = (container as HTMLElement).scrollLeft;
    const scrollTop = (container as HTMLElement).scrollTop;
    
    onStartDrag({
      x: rect.left - containerRect.left + scrollLeft + rect.width / 2,
      y: rect.top - containerRect.top + scrollTop + rect.height / 2,
    }, side === "bottom");
  };

  const handleMouseEnter = () => {
    if (isReceiveOnly && onHover) {
      onHover(true);
    }
  };

  const handleMouseLeave = () => {
    if (isReceiveOnly && onHover) {
      onHover(false);
    }
  };

  // Position based on side
  const getPositionStyles = (): React.CSSProperties => {
    switch (side) {
      case "top":
        return { top: "-7px", left: "50%", transform: "translateX(-50%)" };
      case "bottom":
        return { bottom: "-7px", left: "50%", transform: "translateX(-50%)" };
      case "left":
        return { top: "50%", left: "-7px", transform: "translateY(-50%)" };
      case "right":
        return { top: "50%", right: "-7px", transform: "translateY(-50%)" };
    }
  };

  return (
    <div
      ref={anchorRef}
      className="absolute z-10"
      style={getPositionStyles()}
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className={`h-3.5 w-3.5 rounded-full border-2 transition-all ${
          isVisible || isDropTarget
            ? "opacity-100 scale-100"
            : "opacity-0 scale-75"
        } ${
          isDraggable
            ? "bg-[var(--accent-primary)] border-[var(--accent-primary)] cursor-crosshair hover:scale-125"
            : isDropTarget
              ? "bg-[var(--accent-primary)] border-[var(--accent-primary)] scale-125"
              : "bg-[var(--bg-panel)] border-[var(--text-muted)]"
        }`}
        style={{
          boxShadow: isVisible || isDropTarget ? "0 0 0 3px rgba(59, 130, 246, 0.2)" : "none",
        }}
      />
    </div>
  );
}
