"use client";

import React, { useState, useEffect, useRef } from "react";
import { AppIcon } from "./Icon";

// ============================================
// TYPES
// ============================================

export type Opportunity = {
  text: string;
  impact: "LOW" | "MEDIUM" | "HIGH";
};

type ImpactLabel = "Low impact" | "Medium impact" | "High impact";

// ============================================
// IMPACT COLORS (WCAG AA compliant)
// Green tones only - optimistic visual language
// ============================================

const IMPACT_STYLES: Record<"LOW" | "MEDIUM" | "HIGH", {
  background: string;
  border: string;
  text: string;
  label: ImpactLabel;
}> = {
  LOW: {
    background: "#ecfdf5", // Very light green / mint
    border: "#6ee7b7",     // Light green border
    text: "#065f46",       // Dark green text for contrast
    label: "Low impact",
  },
  MEDIUM: {
    background: "#d1fae5", // Light green
    border: "#34d399",     // Medium green border
    text: "#064e3b",       // Dark green text for contrast
    label: "Medium impact",
  },
  HIGH: {
    background: "#a7f3d0", // Slightly stronger but still soft green
    border: "#10b981",     // Stronger green border
    text: "#064e3b",       // Dark green text for contrast
    label: "High impact",
  },
};

// ============================================
// OPPORTUNITY CARD COMPONENT
// ============================================

function OpportunityCard({
  opportunity,
  index,
  onUpdateText,
  onUpdateImpact,
  onRemove,
  fontSize = "12px",
}: {
  opportunity: Opportunity;
  index: number;
  onUpdateText: (index: number, text: string) => void;
  onUpdateImpact: (index: number, impact: "LOW" | "MEDIUM" | "HIGH") => void;
  onRemove: (index: number) => void;
  fontSize?: string;
}) {
  const [isEditingText, setIsEditingText] = useState(false);
  const [editText, setEditText] = useState(opportunity.text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const styles = IMPACT_STYLES[opportunity.impact];

  useEffect(() => {
    setEditText(opportunity.text);
  }, [opportunity.text]);

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
    if (editText.trim() && editText.trim() !== opportunity.text) {
      onUpdateText(index, editText.trim());
    } else {
      setEditText(opportunity.text);
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
      {/* Impact dropdown and remove button */}
      <div className="flex items-center justify-between mb-1.5">
        <select
          value={opportunity.impact}
          onChange={(e) => onUpdateImpact(index, e.target.value as "LOW" | "MEDIUM" | "HIGH")}
          className="rounded border px-1.5 py-0.5 cursor-pointer outline-none text-xs font-medium"
          style={{
            backgroundColor: styles.background,
            borderColor: styles.border,
            color: styles.text,
            fontSize: "11px",
          }}
        >
          <option value="LOW">Low impact</option>
          <option value="MEDIUM">Medium impact</option>
          <option value="HIGH">High impact</option>
        </select>

        <button
          onClick={() => onRemove(index)}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-black/10"
          title="Remove opportunity"
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
              setEditText(opportunity.text);
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
          placeholder="Describe the opportunity..."
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
          {opportunity.text || (
            <span className="opacity-60 italic">Click to add description...</span>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// ADD OPPORTUNITY INPUT
// ============================================

function AddOpportunityInput({
  onAdd,
  onSuggest,
  fontSize = "12px",
}: {
  onAdd: (text: string, impact: "LOW" | "MEDIUM" | "HIGH") => void;
  onSuggest?: () => void;
  fontSize?: string;
}) {
  const [text, setText] = useState("");
  const [impact, setImpact] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const [isAdding, setIsAdding] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isAdding && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isAdding]);

  const handleAdd = () => {
    if (text.trim()) {
      onAdd(text.trim(), impact);
      setText("");
      setImpact("MEDIUM");
      setIsAdding(false);
    }
  };

  const handleCancel = () => {
    setText("");
    setImpact("MEDIUM");
    setIsAdding(false);
  };

  if (!isAdding) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors"
          style={{ fontSize }}
        >
          <AppIcon name="add" size="xs" />
          <span>Add opportunity</span>
        </button>
        {onSuggest && (
          <button
            onClick={onSuggest}
            className="flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors"
            style={{ fontSize }}
          >
            <AppIcon name="ai" size="xs" />
            <span>Suggest opportunities</span>
          </button>
        )}
      </div>
    );
  }

  const styles = IMPACT_STYLES[impact];

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
          value={impact}
          onChange={(e) => setImpact(e.target.value as "LOW" | "MEDIUM" | "HIGH")}
          className="rounded border px-1.5 py-0.5 cursor-pointer outline-none text-xs font-medium"
          style={{
            backgroundColor: styles.background,
            borderColor: styles.border,
            color: styles.text,
            fontSize: "11px",
          }}
        >
          <option value="LOW">Low impact</option>
          <option value="MEDIUM">Medium impact</option>
          <option value="HIGH">High impact</option>
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
        placeholder="Describe the opportunity..."
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
// MAIN OPPORTUNITY EDITOR COMPONENT
// ============================================

type OpportunityEditorProps = {
  opportunities: Opportunity[];
  onUpdate: (opportunities: Opportunity[]) => void;
  fontSize?: string;
  compact?: boolean;
  readOnly?: boolean;
  onSuggestOpportunities?: () => void;
};

export function OpportunityEditor({
  opportunities,
  onUpdate,
  fontSize = "12px",
  compact = false,
  readOnly = false,
  onSuggestOpportunities,
}: OpportunityEditorProps) {
  const handleUpdateText = (index: number, text: string) => {
    const newOpportunities = [...opportunities];
    newOpportunities[index] = { ...newOpportunities[index], text };
    onUpdate(newOpportunities);
  };

  const handleUpdateImpact = (index: number, impact: "LOW" | "MEDIUM" | "HIGH") => {
    const newOpportunities = [...opportunities];
    newOpportunities[index] = { ...newOpportunities[index], impact };
    onUpdate(newOpportunities);
  };

  const handleRemove = (index: number) => {
    const newOpportunities = opportunities.filter((_, i) => i !== index);
    onUpdate(newOpportunities);
  };

  const handleAdd = (text: string, impact: "LOW" | "MEDIUM" | "HIGH") => {
    onUpdate([...opportunities, { text, impact }]);
  };

  // Compact mode: show summary when empty or collapsed
  const [isExpanded, setIsExpanded] = useState(!compact || opportunities.length > 0);

  // Read-only display mode
  if (readOnly) {
    if (opportunities.length === 0) {
      return (
        <div className="text-[var(--text-muted)]" style={{ fontSize }}>
          —
        </div>
      );
    }
    
    return (
      <div className="space-y-2">
        {opportunities.map((opp, i) => {
          const styles = IMPACT_STYLES[opp.impact];
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
                {opp.text}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (compact && !isExpanded && opportunities.length === 0) {
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

  return (
    <div className="space-y-2">
      {/* Header for compact mode */}
      {compact && opportunities.length > 0 && (
        <div className="flex items-center justify-between">
          <span
            className="text-[var(--text-muted)]"
            style={{ fontSize: "11px" }}
          >
            {opportunities.length} opportunit{opportunities.length !== 1 ? "ies" : "y"}
          </span>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <AppIcon name={isExpanded ? "chevronUp" : "chevronDown"} size="xs" />
          </button>
        </div>
      )}

      {/* Opportunity cards */}
      {isExpanded && (
        <>
          <div className="space-y-2">
            {opportunities.map((opp, i) => (
              <OpportunityCard
                key={i}
                opportunity={opp}
                index={i}
                onUpdateText={handleUpdateText}
                onUpdateImpact={handleUpdateImpact}
                onRemove={handleRemove}
                fontSize={fontSize}
              />
            ))}
          </div>

          <AddOpportunityInput onAdd={handleAdd} onSuggest={onSuggestOpportunities} fontSize={fontSize} />
        </>
      )}

      {/* Compact collapsed view */}
      {compact && !isExpanded && opportunities.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {opportunities.map((opp, i) => {
            const styles = IMPACT_STYLES[opp.impact];
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
                title={`${styles.label}: ${opp.text}`}
              >
                {opp.text.length > 20 ? opp.text.slice(0, 18) + "…" : opp.text}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================
// HELPER: Parse opportunities from JSON string
// ============================================

export function parseOpportunities(value: string | null): Opportunity[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    // Old plain text format - convert to opportunity
    if (value.trim()) {
      return [{ text: value.trim(), impact: "MEDIUM" }];
    }
    return [];
  }
}
