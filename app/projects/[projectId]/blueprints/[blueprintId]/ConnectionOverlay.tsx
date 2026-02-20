"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { ConnectorType, ArrowDirection, StrokeWeight, StrokePattern, StrokeColor } from "../actions";
import { useBlueprintCache } from "./BlueprintCacheContext";

// ============================================
// TYPES
// ============================================

export type Connection = {
  id: string;
  sourceCardId: string;
  sourceCardType: "basic" | "complex" | "decision";
  targetCardId: string;
  targetCardType: "basic" | "complex" | "decision";
  connectorType: ConnectorType;
  label: string | null;
  arrowDirection: ArrowDirection;
  strokeWeight: StrokeWeight;
  strokePattern: StrokePattern;
  strokeColor: StrokeColor;
};

export type CardPosition = {
  id: string;
  type: "basic" | "complex" | "decision";
  x: number;
  y: number;
  width: number;
  height: number;
  columnIndex: number;
};

type Point = { x: number; y: number };

// Parallel arrow spacing - offset for multiple arrows in same routing lane
const PARALLEL_OFFSET = 8;

// Distance from column edge to the routing lane inside the column
const LANE_INSET = 15;

// Modal positioning constants
const MODAL_CONFIG = {
  width: 260,         // Estimated modal width
  height: 450,        // Conservative estimate for modal with all sections
  padding: 16,        // Minimum distance from viewport edges
  preferAboveOffset: 20, // Gap when positioning above click point
} as const;

// ============================================
// VISUAL STYLE HELPERS
// ============================================

function getStrokeWidth(weight: StrokeWeight, isHovered: boolean, isSelected: boolean): number {
  const baseWidth = weight === "thin" ? 0.75 : weight === "thick" ? 2 : 1;
  if (isSelected) return baseWidth + 1;
  if (isHovered) return baseWidth + 0.5;
  return baseWidth;
}

function getStrokeDasharray(pattern: StrokePattern, connectorType: ConnectorType): string {
  // Connector type can override pattern for specific types
  if (connectorType === "dependency") return "6,4"; // Dashed
  if (connectorType === "wait") return "2,3"; // Dotted
  
  // Otherwise use explicit pattern
  if (pattern === "dashed") return "6,4";
  if (pattern === "dotted") return "2,3";
  return ""; // Solid
}

function getStrokeColor(strokeColor: StrokeColor, isSelected: boolean, isHovered: boolean): string {
  if (isSelected) return "var(--accent-primary)";
  
  // Color mapping
  const colorMap: Record<StrokeColor, { default: string; hover: string }> = {
    grey: { default: "#94a3b8", hover: "#64748b" },
    red: { default: "#f87171", hover: "#dc2626" },
    green: { default: "#4ade80", hover: "#16a34a" },
  };
  
  const colors = colorMap[strokeColor] || colorMap.grey;
  return isHovered ? colors.hover : colors.default;
}

// ============================================
// ARROWHEAD COMPONENTS
// ============================================

type ArrowheadProps = {
  x: number;
  y: number;
  angle: number;
  color: string;
  type: ConnectorType;
  size: "normal" | "large";
};

function Arrowhead({ x, y, angle, color, type, size }: ArrowheadProps) {
  const scale = size === "large" ? 1.4 : 1;
  
  if (type === "dependency") {
    // Open arrowhead (unfilled)
    return (
      <polyline
        points={`${-5 * scale},${-3.5 * scale} 0,0 ${-5 * scale},${3.5 * scale}`}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        transform={`translate(${x}, ${y}) rotate(${angle})`}
        style={{ pointerEvents: "none" }}
      />
    );
  }
  
  if (type === "wait") {
    // Pause-style marker (two short vertical lines)
    return (
      <g transform={`translate(${x}, ${y}) rotate(${angle})`} style={{ pointerEvents: "none" }}>
        <rect x={-8 * scale} y={-3 * scale} width={2 * scale} height={6 * scale} fill={color} />
        <rect x={-4 * scale} y={-3 * scale} width={2 * scale} height={6 * scale} fill={color} />
      </g>
    );
  }
  
  // Standard filled arrowhead (for standard and feedback)
  return (
    <polygon
      points={`${-5 * scale},${-3.5 * scale} 0,0 ${-5 * scale},${3.5 * scale}`}
      fill={color}
      transform={`translate(${x}, ${y}) rotate(${angle})`}
      style={{ pointerEvents: "none" }}
    />
  );
}

// ============================================
// ORTHOGONAL ROUTING ENGINE
// Phase 9.1: Supports forward, backward, and same-column connections
// ============================================

function computeOrthogonalPath(
  source: CardPosition,
  target: CardPosition,
  columnBoundaries: number[],
  parallelOffset: number = 0,
  isVerticalConnection: boolean = false
): Point[] {
  const sourceCol = source.columnIndex;
  const targetCol = target.columnIndex;
  
  // Determine if this is a forward, backward, or same-column connection
  const isForward = targetCol > sourceCol;
  const isBackward = targetCol < sourceCol;
  const isSameColumn = targetCol === sourceCol;
  
  // ============================================
  // VERTICAL CONNECTION (bottom to top, same column)
  // This is used for decision card → card below connections
  // ============================================
  if (isVerticalConnection && isSameColumn) {
    // Route straight down from bottom of source to top of target
    const startX = source.x + source.width / 2;
    const startY = source.y + source.height;
    const endX = target.x + target.width / 2;
    const endY = target.y;
    
    // Simple straight vertical line
    return [
      { x: startX, y: startY },
      { x: endX, y: endY },
    ];
  }
  
  // For forward connections: source right → target left
  // For backward connections: source right → loop around → target left
  // For same-column: source right → loop around → target left
  
  const startX = source.x + source.width;
  const startY = source.y + source.height / 2;
  const endX = target.x;
  const endY = target.y + target.height / 2;

  // Same row - straight horizontal line (only for forward connections)
  if (Math.abs(endY - startY) < 5 && isForward) {
    return [
      { x: startX, y: startY },
      { x: endX, y: endY },
    ];
  }
  
  const goingDown = endY > startY;
  
  // ============================================
  // FORWARD CONNECTIONS (target to the right)
  // ============================================
  if (isForward) {
    let verticalX: number;
    
    if (goingDown) {
      // Going down: travel in right side lane of source column
      if (sourceCol + 1 < columnBoundaries.length) {
        verticalX = columnBoundaries[sourceCol + 1] - LANE_INSET;
      } else {
        verticalX = startX + 20;
      }
    } else {
      // Going up: travel in left side lane of target column
      if (targetCol < columnBoundaries.length) {
        verticalX = columnBoundaries[targetCol] + LANE_INSET;
      } else {
        verticalX = endX - 20;
      }
    }
    
    verticalX += parallelOffset;
    verticalX = Math.max(startX + 10, Math.min(endX - 10, verticalX));
    
    return [
      { x: startX, y: startY },
      { x: verticalX, y: startY },
      { x: verticalX, y: endY },
      { x: endX, y: endY },
    ];
  }
  
  // ============================================
  // BACKWARD CONNECTIONS (target to the left - LOOPS)
  // Route: go right, then up/down outside the columns, then left to target
  // ============================================
  if (isBackward) {
    // Calculate routing outside the content area
    const loopOffset = 40 + Math.abs(parallelOffset);
    
    // Go right from source
    const exitX = startX + 15;
    
    // Vertical segment outside the column area
    // Route above or below the cards based on relative Y positions
    let verticalY: number;
    if (goingDown) {
      // Target is below - route below both cards
      verticalY = Math.max(source.y + source.height, target.y + target.height) + loopOffset;
    } else {
      // Target is above - route above both cards
      verticalY = Math.min(source.y, target.y) - loopOffset;
    }
    
    // Horizontal position for vertical segment (in the leftmost boundary, or outside)
    let routeX: number;
    if (targetCol < columnBoundaries.length) {
      routeX = columnBoundaries[targetCol] - 20 - Math.abs(parallelOffset);
    } else {
      routeX = endX - 30;
    }
    
    // Entry point to target
    const entryX = endX - 15;
    
    return [
      { x: startX, y: startY },           // Start from source right edge
      { x: exitX, y: startY },            // Short horizontal exit
      { x: exitX, y: verticalY },         // Go up/down to routing lane
      { x: routeX, y: verticalY },        // Horizontal across to target area
      { x: routeX, y: endY },             // Vertical to target row
      { x: endX, y: endY },               // Connect to target left edge
    ];
  }
  
  // ============================================
  // SAME-COLUMN CONNECTIONS (loop within column)
  // Route: go right, loop around, come back to left
  // ============================================
  if (isSameColumn) {
    const loopOffset = 50 + Math.abs(parallelOffset);
    
    // Route to the right of the column
    let loopX: number;
    if (sourceCol + 1 < columnBoundaries.length) {
      loopX = columnBoundaries[sourceCol + 1] + loopOffset;
    } else {
      loopX = startX + loopOffset;
    }
    
    return [
      { x: startX, y: startY },         // Start from source right edge
      { x: loopX, y: startY },          // Go right to loop lane
      { x: loopX, y: endY },            // Vertical to target row
      { x: endX, y: endY },             // Connect to target left edge
    ];
  }
  
  // Fallback (shouldn't reach here)
  return [
    { x: startX, y: startY },
    { x: endX, y: endY },
  ];
}

function pathToSvg(points: Point[]): string {
  if (points.length < 2) return "";
  for (const p of points) {
    if (typeof p.x !== "number" || typeof p.y !== "number" || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return "";
  }
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x} ${points[i].y}`;
  }
  return d;
}

function getVerticalSegment(points: Point[]): { x: number; y1: number; y2: number } | null {
  if (points.length < 4) return null;
  const turn1 = points[1];
  const turn2 = points[2];
  if (Math.abs(turn1.x - turn2.x) < 1) {
    return {
      x: turn1.x,
      y1: Math.min(turn1.y, turn2.y),
      y2: Math.max(turn1.y, turn2.y),
    };
  }
  return null;
}

function getLongestSegmentMidpoint(points: Point[]): Point | null {
  if (points.length < 2) return null;

  let longestLength = 0;
  let midpoint: Point | null = null;

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const length = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    if (!Number.isFinite(length)) continue;
    if (length > longestLength) {
      longestLength = length;
      const mx = (p1.x + p2.x) / 2;
      const my = (p1.y + p2.y) / 2;
      midpoint = Number.isFinite(mx) && Number.isFinite(my) ? { x: mx, y: my } : null;
    }
  }

  return midpoint;
}

// Calculate the angle of a segment (in degrees)
function getSegmentAngle(from: Point, to: Point): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return Math.atan2(dy, dx) * (180 / Math.PI);
}

// Get the angle for the forward arrowhead (based on last segment)
function getForwardArrowAngle(path: Point[]): number {
  if (path.length < 2) return 0;
  const lastPoint = path[path.length - 1];
  const secondLastPoint = path[path.length - 2];
  return getSegmentAngle(secondLastPoint, lastPoint);
}

// Get the angle for the backward arrowhead (based on first segment)
function getBackwardArrowAngle(path: Point[]): number {
  if (path.length < 2) return 180;
  const firstPoint = path[0];
  const secondPoint = path[1];
  return getSegmentAngle(secondPoint, firstPoint);
}

// ============================================
// CONNECTION LINE COMPONENT
// ============================================

function ConnectionLine({
  connection,
  path,
  isSelected,
  isHovered,
  isDimmed = false,
  showLabels,
  onSelect,
  onHover,
}: {
  connection: Connection;
  path: Point[];
  isSelected: boolean;
  isHovered: boolean;
  isDimmed?: boolean;
  showLabels: boolean;
  onSelect: () => void;
  onHover: (hovered: boolean) => void;
}) {
  const pathString = pathToSvg(path);
  if (!pathString || path.length < 2) return null;

  const startPoint = path[0];
  const endPoint = path[path.length - 1];
  const verticalSegment = getVerticalSegment(path);
  const labelPosition = getLongestSegmentMidpoint(path);
  
  const strokeColor = getStrokeColor(connection.strokeColor, isSelected, isHovered);
  const strokeWidth = getStrokeWidth(connection.strokeWeight, isHovered, isSelected);
  const strokeDasharray = getStrokeDasharray(connection.strokePattern, connection.connectorType);
  const arrowSize = isSelected || isHovered ? "large" : "normal";
  
  // Apply dimming when other cards are highlighted
  const opacity = isDimmed ? 0.2 : 1;
  
  // Always show label if it exists
  const shouldShowLabel = !!connection.label;

  return (
    <g style={{ opacity, transition: "opacity 0.15s" }}>
      {/* Invisible hit area for easier selection */}
      <path
        d={pathString}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        style={{ cursor: "pointer" }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onMouseEnter={() => onHover(true)}
        onMouseLeave={() => onHover(false)}
      />
      
      {/* Vertical segment hover highlight */}
      {isHovered && verticalSegment && (
        <line
          x1={verticalSegment.x}
          y1={verticalSegment.y1 - 4}
          x2={verticalSegment.x}
          y2={verticalSegment.y2 + 4}
          stroke="var(--accent-primary)"
          strokeWidth={12}
          strokeLinecap="round"
          opacity={0.08}
          style={{ pointerEvents: "none" }}
        />
      )}
      
      {/* Selection glow */}
      {isSelected && (
        <path
          d={pathString}
          fill="none"
          stroke="var(--accent-primary)"
          strokeWidth={8}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.15}
          style={{ pointerEvents: "none" }}
        />
      )}
      
      {/* Visible line */}
      <path
        d={pathString}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={strokeDasharray}
        style={{ 
          transition: "stroke 0.15s, stroke-width 0.15s",
          pointerEvents: "none",
        }}
      />
      
      {/* Arrowheads based on direction */}
      {(connection.arrowDirection === "forward" || connection.arrowDirection === "bidirectional") && (
        <Arrowhead
          x={endPoint.x}
          y={endPoint.y}
          angle={getForwardArrowAngle(path)}
          color={strokeColor}
          type={connection.connectorType}
          size={arrowSize}
        />
      )}
      
      {(connection.arrowDirection === "backward" || connection.arrowDirection === "bidirectional") && (
        <Arrowhead
          x={startPoint.x}
          y={startPoint.y}
          angle={getBackwardArrowAngle(path)}
          color={strokeColor}
          type={connection.connectorType}
          size={arrowSize}
        />
      )}
      
      {/* Label */}
      {shouldShowLabel && labelPosition && (() => {
        // Get label box colors based on arrow color
        const labelColors: Record<StrokeColor, { fill: string; stroke: string; text: string }> = {
          grey: { fill: "#f1f5f9", stroke: "#94a3b8", text: "#475569" },
          red: { fill: "#fef2f2", stroke: "#f87171", text: "#b91c1c" },
          green: { fill: "#f0fdf4", stroke: "#4ade80", text: "#166534" },
        };
        const colors = labelColors[connection.strokeColor] || labelColors.grey;
        
        const displayLabel = connection.label!.length > 16 ? connection.label!.slice(0, 14) + "…" : connection.label!;
        const boxWidth = Math.max(40, displayLabel.length * 6 + 12);
        
        return (
          <g transform={`translate(${labelPosition.x}, ${labelPosition.y})`}>
            <rect
              x={-boxWidth / 2}
              y={-10}
              width={boxWidth}
              height={20}
              fill={colors.fill}
              stroke={colors.stroke}
              strokeWidth={1}
              rx={4}
              style={{ pointerEvents: "none" }}
            />
            <text
              textAnchor="middle"
              dominantBaseline="middle"
              fill={colors.text}
              fontSize="11"
              fontWeight={500}
              style={{ pointerEvents: "none" }}
            >
              {displayLabel}
            </text>
          </g>
        );
      })()}
    </g>
  );
}

// ============================================
// CONNECTOR EDIT MODAL
// ============================================

type ConnectorEditModalProps = {
  connection: Connection;
  position: Point;
  containerRect: DOMRect | null;
  onClose: () => void;
  onUpdate: (updates: Partial<Connection>) => void;
  onDelete: () => void;
};

type BranchPreset = "yes" | "no" | "custom";

// Utility to clamp modal position within viewport
function clampToViewport(
  x: number, 
  y: number, 
  modalWidth: number, 
  modalHeight: number, 
  containerRect: DOMRect | null,
  padding: number = 12
): { x: number; y: number } {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  // Convert to screen coordinates if we have a container
  let screenX = x;
  let screenY = y;
  if (containerRect) {
    screenX = containerRect.left + x;
    screenY = containerRect.top + y;
  }
  
  // Clamp to viewport
  let clampedScreenX = Math.max(padding, Math.min(screenX, viewportWidth - modalWidth - padding));
  let clampedScreenY = Math.max(padding, Math.min(screenY, viewportHeight - modalHeight - padding));
  
  // Convert back to container coordinates
  if (containerRect) {
    return {
      x: clampedScreenX - containerRect.left,
      y: clampedScreenY - containerRect.top,
    };
  }
  
  return { x: clampedScreenX, y: clampedScreenY };
}

function ConnectorEditModal({ connection, position, containerRect, onClose, onUpdate, onDelete }: ConnectorEditModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [modalPosition, setModalPosition] = useState({ x: position.x - 140, y: position.y - 240 });
  
  // Calculate clamped position on mount and when position changes
  useEffect(() => {
    const { width: modalWidth, height: modalHeight, padding, preferAboveOffset } = MODAL_CONFIG;
    
    // First, calculate ideal position (centered horizontally, above the click point)
    let idealX = position.x - modalWidth / 2;
    let idealY = position.y - modalHeight - preferAboveOffset; // Position above the click by default
    
    // Convert to screen coordinates to check viewport bounds
    const screenY = containerRect ? containerRect.top + idealY : idealY;
    
    // If modal would go above viewport, position it below the click instead
    if (screenY < padding) {
      idealY = position.y + 30; // Position below the click
    }
    
    // Now clamp all edges to viewport
    const clamped = clampToViewport(idealX, idealY, modalWidth, modalHeight, containerRect, padding);
    setModalPosition(clamped);
  }, [position, containerRect]);
  
  // Branch preset state for decision card connectors
  const isFromDecision = connection.sourceCardType === "decision";
  const [branchPreset, setBranchPreset] = useState<BranchPreset>(() => {
    if (connection.label === "Yes" && connection.strokeColor === "green") return "yes";
    if (connection.label === "No" && connection.strokeColor === "red") return "no";
    return "custom";
  });

  // Immediately apply updates
  const applyUpdate = useCallback((updates: Partial<Connection>) => {
    onUpdate(updates);
  }, [onUpdate]);

  const applyBranchPreset = (preset: BranchPreset) => {
    setBranchPreset(preset);
    if (preset === "yes") {
      applyUpdate({ label: "Yes", strokeColor: "green", arrowDirection: "forward", connectorType: "standard" });
    } else if (preset === "no") {
      applyUpdate({ label: "No", strokeColor: "red", arrowDirection: "forward", connectorType: "standard" });
    }
    // Custom: no auto-apply, user sets values manually
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete();
  };

  const handleClose = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClose();
  };

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Delay adding listener to prevent immediate close
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 100);
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  // Handle ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const connectorTypes: { value: ConnectorType; label: string; icon: string }[] = [
    { value: "standard", label: "Standard", icon: "arrow_forward" },
    { value: "dependency", label: "Dependency", icon: "link" },
    { value: "feedback", label: "Feedback", icon: "sync" },
    { value: "wait", label: "Wait/Delay", icon: "pause" },
  ];

  // Note: backward and bidirectional removed - loops are disabled
  const arrowDirections: { value: ArrowDirection; label: string; icon: string }[] = [
    { value: "forward", label: "Forward", icon: "arrow_forward" },
    { value: "none", label: "None", icon: "remove" },
  ];

  return (
    <foreignObject
      x={modalPosition.x}
      y={modalPosition.y}
      width={300}
      height={500}
      style={{ overflow: "visible", pointerEvents: "auto" }}
    >
      <div
        ref={modalRef}
        style={{
          backgroundColor: "var(--bg-panel)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "12px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
          padding: "16px",
          pointerEvents: "auto",
          position: "relative",
          zIndex: 9999,
          width: "280px",
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
        }}
        data-connector-modal
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 500, color: "var(--text-primary)", margin: 0 }}>Edit Connector</h3>
          <button
            onClick={handleClose}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>close</span>
          </button>
        </div>

        {/* Branch Presets - Only for connectors from Decision Cards */}
        {isFromDecision && (
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "8px" }}>
              <span className="material-symbols-outlined" style={{ fontSize: "14px", verticalAlign: "middle", marginRight: "4px" }}>call_split</span>
              Branch Preset
            </label>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={(e) => { e.stopPropagation(); applyBranchPreset("yes"); }}
                onMouseDown={(e) => e.stopPropagation()}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "10px 12px",
                  borderRadius: "6px",
                  border: branchPreset === "yes" ? "2px solid #4ade80" : "2px solid transparent",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  backgroundColor: branchPreset === "yes" ? "rgba(74, 222, 128, 0.1)" : "var(--bg-hover)",
                  color: branchPreset === "yes" ? "#16a34a" : "var(--text-secondary)",
                  fontWeight: branchPreset === "yes" ? 600 : 400,
                  fontSize: "13px",
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "16px", color: "#4ade80" }}>check_circle</span>
                Yes
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); applyBranchPreset("no"); }}
                onMouseDown={(e) => e.stopPropagation()}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "10px 12px",
                  borderRadius: "6px",
                  border: branchPreset === "no" ? "2px solid #f87171" : "2px solid transparent",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  backgroundColor: branchPreset === "no" ? "rgba(248, 113, 113, 0.1)" : "var(--bg-hover)",
                  color: branchPreset === "no" ? "#dc2626" : "var(--text-secondary)",
                  fontWeight: branchPreset === "no" ? 600 : 400,
                  fontSize: "13px",
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "16px", color: "#f87171" }}>cancel</span>
                No
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); applyBranchPreset("custom"); }}
                onMouseDown={(e) => e.stopPropagation()}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "10px 12px",
                  borderRadius: "6px",
                  border: branchPreset === "custom" ? "2px solid var(--accent-primary)" : "2px solid transparent",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  backgroundColor: branchPreset === "custom" ? "var(--bg-active)" : "var(--bg-hover)",
                  color: branchPreset === "custom" ? "var(--text-primary)" : "var(--text-secondary)",
                  fontWeight: branchPreset === "custom" ? 600 : 400,
                  fontSize: "13px",
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>edit</span>
                Custom
              </button>
            </div>
          </div>
        )}

        {/* Connector Type - applies immediately */}
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "8px" }}>Type</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
            {connectorTypes.map((type) => (
              <button
                key={type.value}
                onClick={(e) => { e.stopPropagation(); applyUpdate({ connectorType: type.value }); }}
                onMouseDown={(e) => e.stopPropagation()}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "none",
                  fontSize: "12px",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  backgroundColor: connection.connectorType === type.value ? "var(--accent-primary)" : "var(--bg-hover)",
                  color: connection.connectorType === type.value ? "white" : "var(--text-secondary)",
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>{type.icon}</span>
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Label - applies on blur */}
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "8px" }}>Label (optional)</label>
          <input
            type="text"
            defaultValue={connection.label || ""}
            onBlur={(e) => applyUpdate({ label: e.target.value.trim() || null })}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                applyUpdate({ label: (e.target as HTMLInputElement).value.trim() || null });
                (e.target as HTMLInputElement).blur();
              }
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            placeholder="e.g. Approval required"
            style={{
              width: "100%",
              padding: "8px 12px",
              fontSize: "14px",
              borderRadius: "6px",
              border: "1px solid var(--border-subtle)",
              backgroundColor: "var(--bg-input)",
              color: "var(--text-primary)",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Arrow Direction - applies immediately */}
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "8px" }}>Arrow Direction</label>
          <div style={{ display: "flex", gap: "4px" }}>
            {arrowDirections.map((dir) => (
              <button
                key={dir.value}
                onClick={(e) => { e.stopPropagation(); applyUpdate({ arrowDirection: dir.value }); }}
                onMouseDown={(e) => e.stopPropagation()}
                title={dir.label}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "8px",
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  backgroundColor: connection.arrowDirection === dir.value ? "var(--accent-primary)" : "var(--bg-hover)",
                  color: connection.arrowDirection === dir.value ? "white" : "var(--text-secondary)",
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>{dir.icon}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Stroke Options - applies immediately */}
        <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "8px" }}>Weight</label>
            <select
              value={connection.strokeWeight}
              onChange={(e) => applyUpdate({ strokeWeight: e.target.value as StrokeWeight })}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                padding: "8px 12px",
                fontSize: "12px",
                borderRadius: "6px",
                border: "1px solid var(--border-subtle)",
                backgroundColor: "var(--bg-input)",
                color: "var(--text-primary)",
                cursor: "pointer",
              }}
            >
              <option value="thin">Thin</option>
              <option value="normal">Normal</option>
              <option value="thick">Thick</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "8px" }}>Pattern</label>
            <select
              value={connection.strokePattern}
              onChange={(e) => applyUpdate({ strokePattern: e.target.value as StrokePattern })}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                padding: "8px 12px",
                fontSize: "12px",
                borderRadius: "6px",
                border: "1px solid var(--border-subtle)",
                backgroundColor: "var(--bg-input)",
                color: "var(--text-primary)",
                cursor: "pointer",
              }}
            >
              <option value="solid">Solid</option>
              <option value="dashed">Dashed</option>
              <option value="dotted">Dotted</option>
            </select>
          </div>
        </div>

        {/* Color Selection - applies immediately */}
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "8px" }}>Color</label>
          <div style={{ display: "flex", gap: "8px" }}>
            {([
              { value: "grey" as StrokeColor, color: "#94a3b8", label: "Grey" },
              { value: "red" as StrokeColor, color: "#f87171", label: "Red" },
              { value: "green" as StrokeColor, color: "#4ade80", label: "Green" },
            ]).map((c) => (
              <button
                key={c.value}
                onClick={(e) => { e.stopPropagation(); applyUpdate({ strokeColor: c.value }); }}
                onMouseDown={(e) => e.stopPropagation()}
                title={c.label}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: connection.strokeColor === c.value ? "2px solid var(--accent-primary)" : "2px solid transparent",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  backgroundColor: connection.strokeColor === c.value ? "var(--bg-hover)" : "var(--bg-input)",
                }}
              >
                <span style={{
                  width: "16px",
                  height: "16px",
                  borderRadius: "50%",
                  backgroundColor: c.color,
                }} />
                <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{c.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Delete Button */}
        <button
          onClick={handleDelete}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: "6px",
            border: "none",
            backgroundColor: "transparent",
            color: "#dc2626",
            fontSize: "13px",
            cursor: "pointer",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#fef2f2";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          Delete Connection
        </button>
      </div>
    </foreignObject>
  );
}

// ============================================
// MAIN CONNECTION OVERLAY
// ============================================

type ConnectionOverlayProps = {
  blueprintId: string;
  connections: Connection[];
  cardPositions: CardPosition[];
  containerRef: React.RefObject<HTMLDivElement | null>;
  columnsWithTeams: Set<number>;
  columnBoundaries: number[];
  showLabels?: boolean;
  highlightedConnectionIds?: Set<string>; // Connections to highlight when a card is hovered
  onConnectionHover?: (sourceCardId: string | null) => void; // When hovering an arrow, highlight its connected cards
};

export function ConnectionOverlay({
  blueprintId,
  connections,
  cardPositions,
  containerRef,
  columnsWithTeams,
  columnBoundaries,
  showLabels = false,
  highlightedConnectionIds,
  onConnectionHover,
}: ConnectionOverlayProps) {
  const cache = useBlueprintCache();
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [hoveredConnectionId, setHoveredConnectionId] = useState<string | null>(null);

  const getCardById = useCallback((id: string) => {
    return cardPositions.find((c) => c.id === id);
  }, [cardPositions]);

  const connectionPaths = useMemo(() => {
    const routingLanes = new Map<string, number>();
    
    return connections.map((conn) => {
      const sourceCard = getCardById(conn.sourceCardId);
      const targetCard = getCardById(conn.targetCardId);
      
      if (!sourceCard || !targetCard) {
        return { connection: conn, path: [] };
      }
      
      // Detect vertical connection: same column, source is decision card, target is below
      const isVerticalConnection = 
        sourceCard.columnIndex === targetCard.columnIndex &&
        conn.sourceCardType === "decision" &&
        targetCard.y > sourceCard.y + sourceCard.height - 10;
      
      const laneKey = `${sourceCard.columnIndex}-${targetCard.columnIndex}`;
      const laneCount = routingLanes.get(laneKey) || 0;
      routingLanes.set(laneKey, laneCount + 1);
      
      const offset = laneCount === 0 ? 0 : 
        (laneCount % 2 === 1 ? Math.ceil(laneCount / 2) : -Math.ceil(laneCount / 2)) * PARALLEL_OFFSET;
      
      const path = computeOrthogonalPath(sourceCard, targetCard, columnBoundaries, offset, isVerticalConnection);
      
      return { connection: conn, path, isVerticalConnection };
    });
  }, [connections, getCardById, columnBoundaries]);

  // Get selected connection for toolbar/edit positioning
  const selectedConnection = useMemo(() => {
    if (!selectedConnectionId) return null;
    return connectionPaths.find(cp => cp.connection.id === selectedConnectionId);
  }, [selectedConnectionId, connectionPaths]);

  const selectedConnectionMidpoint = useMemo(() => {
    if (!selectedConnection || selectedConnection.path.length < 2) return null;
    return getLongestSegmentMidpoint(selectedConnection.path);
  }, [selectedConnection]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedConnectionId) {
        setSelectedConnectionId(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedConnectionId]);

  // Handle click outside to deselect
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Element;
      // Don't deselect if clicking on the modal or within the SVG
      if (!target.closest("svg") && !target.closest("[data-connector-modal]")) {
        setSelectedConnectionId(null);
      }
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  // Handle save from edit modal
  const handleSaveConnection = (updates: Partial<Connection>) => {
    if (!selectedConnectionId) return;
    cache.updateConnection(selectedConnectionId, {
      connectorType: updates.connectorType,
      label: updates.label,
      arrowDirection: updates.arrowDirection,
      strokeWeight: updates.strokeWeight,
      strokePattern: updates.strokePattern,
      strokeColor: updates.strokeColor,
    });
  };

  // Handle delete
  const handleDelete = () => {
    if (!selectedConnectionId) return;
    cache.deleteConnection(selectedConnectionId);
    setSelectedConnectionId(null);
  };

  // Get container rect for viewport clamping
  const [containerRectState, setContainerRectState] = useState<DOMRect | null>(null);
  useEffect(() => {
    if (containerRef.current) {
      setContainerRectState(containerRef.current.getBoundingClientRect());
    }
  }, [containerRef, selectedConnectionId]);

  // Calculate SVG dimensions
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.scrollWidth,
          height: containerRef.current.scrollHeight,
        });
      }
    };
    
    updateDimensions();
    
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(containerRef.current);
    
    return () => resizeObserver.disconnect();
  }, [containerRef]);

  if (connections.length === 0) return null;

  return (
    <svg
      className="pointer-events-none absolute left-0 top-0"
      style={{
        width: dimensions.width || "100%",
        height: dimensions.height || "100%",
        overflow: "visible",
        zIndex: selectedConnectionId ? 50 : 10,
      }}
    >
      <g className="pointer-events-auto">
        {connectionPaths.map(({ connection, path }) => {
          // Determine if this connection should be dimmed (another card is highlighted but this isn't related)
          const isHighlightActive = highlightedConnectionIds && highlightedConnectionIds.size > 0;
          const isPartOfHighlight = highlightedConnectionIds?.has(connection.id);
          const isDimmed = isHighlightActive && !isPartOfHighlight;
          
          return (
            <ConnectionLine
              key={connection.id}
              connection={connection}
              path={path}
              isSelected={selectedConnectionId === connection.id}
              isHovered={hoveredConnectionId === connection.id}
              isDimmed={isDimmed}
              showLabels={showLabels}
              onSelect={() => setSelectedConnectionId(connection.id)}
              onHover={(hovered) => {
                setHoveredConnectionId(hovered ? connection.id : null);
                onConnectionHover?.(hovered ? connection.sourceCardId : null);
              }}
            />
          );
        })}
      </g>

      {/* Edit modal - shown directly when a connection is selected */}
      {selectedConnectionId && selectedConnectionMidpoint && selectedConnection && (
        <ConnectorEditModal
          connection={selectedConnection.connection}
          position={selectedConnectionMidpoint}
          containerRect={containerRectState}
          onClose={() => setSelectedConnectionId(null)}
          onUpdate={handleSaveConnection}
          onDelete={handleDelete}
        />
      )}
    </svg>
  );
}
