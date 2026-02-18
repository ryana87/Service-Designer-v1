"use client";

import React, { useState, useEffect, useRef } from "react";
import { AppIcon } from "./Icon";

// ============================================
// TYPES
// ============================================

export type PainPoint = {
  text: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
};

type SeverityLabel = "Low" | "Medium" | "High";

// ============================================
// SEVERITY COLORS (WCAG AA compliant)
// No green, soft tints only
// ============================================

const SEVERITY_STYLES: Record<"LOW" | "MEDIUM" | "HIGH", {
  background: string;
  border: string;
  text: string;
  label: SeverityLabel;
}> = {
  LOW: {
    background: "#fef9c3", // Light yellow
    border: "#facc15",     // Yellow border
    text: "#713f12",       // Dark brown text for contrast
    label: "Low",
  },
  MEDIUM: {
    background: "#ffedd5", // Light orange
    border: "#fb923c",     // Orange border
    text: "#7c2d12",       // Dark brown-red text for contrast
    label: "Medium",
  },
  HIGH: {
    background: "#fee2e2", // Light red/rose
    border: "#f87171",     // Red border
    text: "#7f1d1d",       // Dark red text for contrast
    label: "High",
  },
};

// ============================================
// PAIN POINT CARD COMPONENT
// ============================================

function PainPointCard({
  painPoint,
  index,
  onUpdateText,
  onUpdateSeverity,
  onRemove,
  fontSize = "12px",
}: {
  painPoint: PainPoint;
  index: number;
  onUpdateText: (index: number, text: string) => void;
  onUpdateSeverity: (index: number, severity: "LOW" | "MEDIUM" | "HIGH") => void;
  onRemove: (index: number) => void;
  fontSize?: string;
}) {
  const [isEditingText, setIsEditingText] = useState(false);
  const [editText, setEditText] = useState(painPoint.text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const styles = SEVERITY_STYLES[painPoint.severity];

  useEffect(() => {
    setEditText(painPoint.text);
  }, [painPoint.text]);

  useEffect(() => {
    if (isEditingText && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
      // Auto-resize
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [isEditingText]);

  const handleSaveText = () => {
    if (editText.trim() && editText.trim() !== painPoint.text) {
      onUpdateText(index, editText.trim());
    } else {
      setEditText(painPoint.text);
    }
    setIsEditingText(false);
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditText(e.target.value);
    // Auto-resize
    e.target.style.height = "auto";
    e.target.style.height = e.target.scrollHeight + "px";
  };

  return (
    <div
      className="group relative rounded-md border p-2"
      style={{
        backgroundColor: styles.background,
        borderColor: styles.border,
      }}
    >
      {/* Severity dropdown and remove button */}
      <div className="flex items-center justify-between mb-1.5">
        <select
          value={painPoint.severity}
          onChange={(e) => onUpdateSeverity(index, e.target.value as "LOW" | "MEDIUM" | "HIGH")}
          className="rounded border px-1.5 py-0.5 cursor-pointer outline-none text-xs font-medium"
          style={{
            backgroundColor: styles.background,
            borderColor: styles.border,
            color: styles.text,
            fontSize: "11px",
          }}
        >
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
        </select>

        <button
          onClick={() => onRemove(index)}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-black/10"
          title="Remove pain point"
        >
          <AppIcon name="close" size="xs" />
        </button>
      </div>

      {/* Text content - editable */}
      {isEditingText ? (
        <textarea
          ref={textareaRef}
          value={editText}
          onChange={handleTextareaChange}
          onBlur={handleSaveText}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setEditText(painPoint.text);
              setIsEditingText(false);
            }
            // Allow Enter for newlines, Cmd/Ctrl+Enter to save
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              handleSaveText();
            }
          }}
          className="w-full rounded border bg-white/80 px-1.5 py-1 outline-none resize-none overflow-hidden"
          style={{
            fontSize,
            color: styles.text,
            borderColor: styles.border,
            minHeight: "2.5rem",
          }}
          placeholder="Describe the pain point..."
        />
      ) : (
        <div
          onClick={() => setIsEditingText(true)}
          className="cursor-text whitespace-pre-wrap leading-relaxed"
          style={{
            fontSize,
            color: styles.text,
            minHeight: "1.25rem",
          }}
        >
          {painPoint.text || (
            <span className="opacity-60 italic">Click to add description...</span>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// ADD PAIN POINT INPUT
// ============================================

function AddPainPointInput({
  onAdd,
  fontSize = "12px",
}: {
  onAdd: (text: string, severity: "LOW" | "MEDIUM" | "HIGH") => void;
  fontSize?: string;
}) {
  const [text, setText] = useState("");
  const [severity, setSeverity] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const [isAdding, setIsAdding] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isAdding && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isAdding]);

  const handleAdd = () => {
    if (text.trim()) {
      onAdd(text.trim(), severity);
      setText("");
      setSeverity("MEDIUM");
      setIsAdding(false);
    }
  };

  const handleCancel = () => {
    setText("");
    setSeverity("MEDIUM");
    setIsAdding(false);
  };

  if (!isAdding) {
    return (
      <button
        onClick={() => setIsAdding(true)}
        className="flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors"
        style={{ fontSize }}
      >
        <AppIcon name="add" size="xs" />
        <span>Add pain point</span>
      </button>
    );
  }

  const styles = SEVERITY_STYLES[severity];

  return (
    <div
      className="rounded-md border p-2"
      style={{
        backgroundColor: styles.background,
        borderColor: styles.border,
      }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value as "LOW" | "MEDIUM" | "HIGH")}
          className="rounded border px-1.5 py-0.5 cursor-pointer outline-none text-xs font-medium"
          style={{
            backgroundColor: styles.background,
            borderColor: styles.border,
            color: styles.text,
            fontSize: "11px",
          }}
        >
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
        </select>
      </div>

      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          e.target.style.height = "auto";
          e.target.style.height = e.target.scrollHeight + "px";
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") handleCancel();
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAdd();
        }}
        placeholder="Describe the pain point..."
        className="w-full rounded border bg-white/80 px-1.5 py-1 outline-none resize-none overflow-hidden mb-2"
        style={{
          fontSize,
          color: styles.text,
          borderColor: styles.border,
          minHeight: "2.5rem",
        }}
      />

      <div className="flex items-center gap-2">
        <button
          onClick={handleAdd}
          disabled={!text.trim()}
          className="rounded bg-[var(--accent-primary)] px-2 py-0.5 text-white text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add
        </button>
        <button
          onClick={handleCancel}
          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ============================================
// MAIN PAIN POINT EDITOR COMPONENT
// ============================================

type PainPointEditorProps = {
  painPoints: PainPoint[];
  onUpdate: (painPoints: PainPoint[]) => void;
  fontSize?: string;
  compact?: boolean;
  readOnly?: boolean;
};

export function PainPointEditor({
  painPoints,
  onUpdate,
  fontSize = "12px",
  compact = false,
  readOnly = false,
}: PainPointEditorProps) {
  const handleUpdateText = (index: number, text: string) => {
    const newPainPoints = [...painPoints];
    newPainPoints[index] = { ...newPainPoints[index], text };
    onUpdate(newPainPoints);
  };

  const handleUpdateSeverity = (index: number, severity: "LOW" | "MEDIUM" | "HIGH") => {
    const newPainPoints = [...painPoints];
    newPainPoints[index] = { ...newPainPoints[index], severity };
    onUpdate(newPainPoints);
  };

  const handleRemove = (index: number) => {
    const newPainPoints = painPoints.filter((_, i) => i !== index);
    onUpdate(newPainPoints);
  };

  const handleAdd = (text: string, severity: "LOW" | "MEDIUM" | "HIGH") => {
    onUpdate([...painPoints, { text, severity }]);
  };

  // Compact mode: show summary when empty or collapsed
  const [isExpanded, setIsExpanded] = useState(!compact || painPoints.length > 0);

  if (compact && !isExpanded && painPoints.length === 0) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="text-[var(--text-muted)] hover:text-[var(--accent-primary)]"
        style={{ fontSize }}
      >
        —
      </button>
    );
  }

  // Read-only display mode
  if (readOnly) {
    if (painPoints.length === 0) {
      return (
        <div className="text-[var(--text-muted)]" style={{ fontSize }}>
          —
        </div>
      );
    }
    
    return (
      <div className="space-y-2">
        {painPoints.map((pp, i) => {
          const styles = SEVERITY_STYLES[pp.severity];
          return (
            <div
              key={i}
              className="rounded-md border p-2"
              style={{
                backgroundColor: styles.background,
                borderColor: styles.border,
              }}
            >
              <div
                className="text-xs font-medium mb-1"
                style={{ color: styles.text, fontSize: "11px" }}
              >
                {styles.label}
              </div>
              <div
                className="whitespace-pre-wrap leading-relaxed"
                style={{ fontSize, color: styles.text }}
              >
                {pp.text}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header for compact mode */}
      {compact && painPoints.length > 0 && (
        <div className="flex items-center justify-between">
          <span
            className="text-[var(--text-muted)]"
            style={{ fontSize: "11px" }}
          >
            {painPoints.length} pain point{painPoints.length !== 1 ? "s" : ""}
          </span>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <AppIcon name={isExpanded ? "chevronUp" : "chevronDown"} size="xs" />
          </button>
        </div>
      )}

      {/* Pain point cards */}
      {isExpanded && (
        <>
          <div className="space-y-2">
            {painPoints.map((pp, i) => (
              <PainPointCard
                key={i}
                painPoint={pp}
                index={i}
                onUpdateText={handleUpdateText}
                onUpdateSeverity={handleUpdateSeverity}
                onRemove={handleRemove}
                fontSize={fontSize}
              />
            ))}
          </div>

          <AddPainPointInput onAdd={handleAdd} fontSize={fontSize} />
        </>
      )}

      {/* Compact collapsed view */}
      {compact && !isExpanded && painPoints.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {painPoints.map((pp, i) => {
            const styles = SEVERITY_STYLES[pp.severity];
            return (
              <div
                key={i}
                className="rounded px-1.5 py-0.5 text-xs truncate max-w-[120px]"
                style={{
                  backgroundColor: styles.background,
                  color: styles.text,
                  borderWidth: 1,
                  borderColor: styles.border,
                }}
                title={`${styles.label}: ${pp.text}`}
              >
                {pp.text.length > 20 ? pp.text.slice(0, 18) + "…" : pp.text}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================
// HELPER: Parse pain points from JSON string
// ============================================

export function parsePainPoints(value: string | null): PainPoint[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    // Old plain text format - convert to pain point
    if (value.trim()) {
      return [{ text: value.trim(), severity: "MEDIUM" }];
    }
    return [];
  }
}
