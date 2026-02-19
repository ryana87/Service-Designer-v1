"use client";

import React, {
  useState,
  useRef,
  useEffect,
  createContext,
  useContext,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import {
  type PainPoint,
} from "../actions";
import { useJourneyMapCache } from "./JourneyMapCacheContext";
import { AppIcon } from "../../../../components/Icon";
import { useUndo } from "../../../../contexts/UndoContext";
import { useSelectMode } from "../../../../contexts/SelectModeContext";
import { useCommentContext } from "../../../../contexts/CommentContext";
import { FloatingCommentIcon } from "../../../../components/FloatingCommentIcon";
import type { SelectOption } from "./shared";
import { getDemoThumbnailForIndex, DEMO_ASSETS } from "../../../../demo/assets";

// Common icons for custom option picker
const COMMON_ICONS = [
  "label", "star", "favorite", "bookmark", "flag",
  "help", "info", "warning", "error", "check_circle",
  "add_circle", "remove_circle", "settings", "tune", "build",
  "extension", "category", "folder", "inventory", "package_2",
];

// ============================================
// GLOBAL OVERLAY CONTEXT
// ============================================

type OverlayState =
  | { type: "closed" }
  | {
      type: "quotes";
      action: {
        id: string;
        title: string;
        quotes: { id: string; quoteText: string; source: string | null }[];
      };
      anchorRect: DOMRect;
    }
  | {
      type: "customOption";
      optionType: "channel" | "touchpoint";
      anchorRect: DOMRect;
      onSave: (label: string, iconName: string) => void;
    };

type OverlayContextType = {
  overlay: OverlayState;
  journeyMapId: string;
  openQuotes: (
    action: {
      id: string;
      title: string;
      quotes: { id: string; quoteText: string; source: string | null }[];
    },
    anchorRect: DOMRect
  ) => void;
  openCustomOption: (
    optionType: "channel" | "touchpoint",
    anchorRect: DOMRect,
    onSave: (label: string, iconName: string) => void
  ) => void;
  closeOverlay: () => void;
};

const OverlayContext = createContext<OverlayContextType | null>(null);

function useOverlay() {
  const ctx = useContext(OverlayContext);
  if (!ctx) throw new Error("useOverlay must be used within OverlayProvider");
  return ctx;
}

import type { JourneyMapCacheDocument } from "./cache-types";
import { JourneyMapCacheProvider } from "./JourneyMapCacheContext";

export function OverlayProvider({
  children,
  journeyMapId,
  cacheInitialData,
}: {
  children: React.ReactNode;
  journeyMapId: string;
  cacheInitialData?: JourneyMapCacheDocument | null;
}) {
  const [overlay, setOverlay] = useState<OverlayState>({ type: "closed" });

  const openQuotes = useCallback(
    (
      action: {
        id: string;
        title: string;
        quotes: { id: string; quoteText: string; source: string | null }[];
      },
      anchorRect: DOMRect
    ) => {
      setOverlay({ type: "quotes", action, anchorRect });
    },
    []
  );

  const openCustomOption = useCallback(
    (
      optionType: "channel" | "touchpoint",
      anchorRect: DOMRect,
      onSave: (label: string, iconName: string) => void
    ) => {
      setOverlay({ type: "customOption", optionType, anchorRect, onSave });
    },
    []
  );

  const closeOverlay = useCallback(() => {
    setOverlay({ type: "closed" });
  }, []);

  const content = (
    <>
      {children}
      <GlobalOverlay />
    </>
  );

  return (
    <OverlayContext.Provider
      value={{ overlay, journeyMapId, openQuotes, openCustomOption, closeOverlay }}
    >
      {cacheInitialData ? (
        <JourneyMapCacheProvider initialData={cacheInitialData} journeyMapId={journeyMapId}>
          {content}
        </JourneyMapCacheProvider>
      ) : (
        content
      )}
    </OverlayContext.Provider>
  );
}

// ============================================
// GLOBAL OVERLAY
// ============================================

function GlobalOverlay() {
  const { overlay, closeOverlay } = useOverlay();
  const overlayRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (overlay.type === "closed") return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeOverlay();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [overlay.type, closeOverlay]);

  useEffect(() => {
    if (overlay.type === "closed") return;
    const handleClickOutside = (e: MouseEvent) => {
      if (overlayRef.current && !overlayRef.current.contains(e.target as Node)) {
        closeOverlay();
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 10);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [overlay.type, closeOverlay]);

  if (!mounted || overlay.type === "closed") return null;

  const rect = overlay.anchorRect;
  const top = rect.bottom + 8;
  const left = Math.min(rect.left, window.innerWidth - 280);

  let content: React.ReactNode = null;

  if (overlay.type === "quotes") {
    content = (
      <div
        ref={overlayRef}
        className="fixed z-[9999] w-64 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-3 shadow-lg"
        style={{ top, left: Math.max(8, left) }}
      >
        <QuotesPanel action={overlay.action} onClose={closeOverlay} />
      </div>
    );
  } else if (overlay.type === "customOption") {
    content = (
      <div
        ref={overlayRef}
        className="fixed z-[9999] w-56 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-3 shadow-lg"
        style={{ top, left: Math.max(8, left) }}
      >
        <CustomOptionPanel
          optionType={overlay.optionType}
          onSave={overlay.onSave}
          onClose={closeOverlay}
        />
      </div>
    );
  }

  return createPortal(content, document.body);
}

// ============================================
// QUOTES PANEL
// ============================================

function QuotesPanel({
  action,
  onClose,
}: {
  action: {
    id: string;
    title: string;
    quotes: { id: string; quoteText: string; source: string | null }[];
  };
  onClose: () => void;
}) {
  const cache = useJourneyMapCache();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = (formData: FormData) => {
    const quoteText = formData.get("quoteText") as string;
    const source = (formData.get("source") as string) || null;
    if (quoteText?.trim()) {
      cache.createQuote(action.id, quoteText.trim(), source?.trim() || null);
    }
    onClose();
  };

  return (
    <>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <AppIcon name="quote" size="xs" className="text-[var(--text-muted)]" />
          <span
            className="font-medium text-[var(--text-primary)]"
            style={{ fontSize: "var(--font-size-action)" }}
          >
            Quotes
          </span>
        </div>
        <button
          onClick={onClose}
          className="flex h-5 w-5 items-center justify-center rounded text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
        >
          <AppIcon name="close" size="xs" />
        </button>
      </div>
      <p
        className="mb-2 text-[var(--text-muted)]"
        style={{ fontSize: "var(--font-size-meta)", lineHeight: 1.4 }}
      >
        For &quot;{action.title}&quot;
      </p>

      {action.quotes.length > 0 ? (
        <div className="mb-3 max-h-32 space-y-1.5 overflow-y-auto">
          {action.quotes.map((quote) => (
            <div
              key={quote.id}
              className="rounded border border-[var(--border-muted)] bg-[var(--bg-sidebar)] p-2"
            >
              <p
                className="italic text-[var(--text-secondary)]"
                style={{ fontSize: "var(--font-size-meta)", lineHeight: 1.4 }}
              >
                &quot;{quote.quoteText}&quot;
              </p>
              {quote.source && (
                <p
                  className="mt-1 text-[var(--text-muted)]"
                  style={{ fontSize: "var(--font-size-meta)" }}
                >
                  — {quote.source}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p
          className="mb-3 text-[var(--text-muted)]"
          style={{ fontSize: "var(--font-size-meta)" }}
        >
          No quotes yet. Add customer feedback below.
        </p>
      )}

      <form action={handleSubmit} className="space-y-2">
        <textarea
          ref={inputRef}
          name="quoteText"
          required
          placeholder="Add a quote..."
          rows={2}
          className="w-full rounded border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-2 py-1.5 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none"
          style={{ fontSize: "var(--font-size-cell)" }}
        />
        <input
          type="text"
          name="source"
          placeholder="Source (optional)"
          className="w-full rounded border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-2 py-1.5 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none"
          style={{ fontSize: "var(--font-size-cell)" }}
        />
        <div className="flex gap-2">
          <button
            type="submit"
            className="flex-1 rounded bg-[var(--accent-primary)] px-2 py-1 font-medium text-white hover:bg-[var(--accent-primary-hover)]"
            style={{ fontSize: "var(--font-size-cell)" }}
          >
            Add
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-1 text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
            style={{ fontSize: "var(--font-size-cell)" }}
          >
            Cancel
          </button>
        </div>
      </form>
    </>
  );
}

// ============================================
// CUSTOM OPTION PANEL (for adding custom channel/touchpoint)
// ============================================

function CustomOptionPanel({
  optionType,
  onSave,
  onClose,
}: {
  optionType: "channel" | "touchpoint";
  onSave: (label: string, iconName: string) => void;
  onClose: () => void;
}) {
  const [label, setLabel] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("label");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleSave = () => {
    if (label.trim()) {
      onSave(label.trim(), selectedIcon);
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <>
      <div className="mb-2 flex items-center justify-between">
        <span
          className="font-medium text-[var(--text-primary)]"
          style={{ fontSize: "var(--font-size-action)" }}
        >
          Add Custom {optionType === "channel" ? "Channel" : "Touchpoint"}
        </span>
        <button
          onClick={onClose}
          className="flex h-5 w-5 items-center justify-center rounded text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
        >
          <AppIcon name="close" size="xs" />
        </button>
      </div>

      <div className="space-y-3">
        <input
          ref={inputRef}
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Name..."
          className="w-full rounded border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-2 py-1.5 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none"
          style={{ fontSize: "var(--font-size-cell)" }}
        />

        <div>
          <p
            className="mb-1.5 text-[var(--text-muted)]"
            style={{ fontSize: "var(--font-size-meta)" }}
          >
            Choose an icon:
          </p>
          <div className="grid grid-cols-5 gap-1">
            {COMMON_ICONS.map((icon) => (
              <button
                key={icon}
                type="button"
                onClick={() => setSelectedIcon(icon)}
                className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${
                  selectedIcon === icon
                    ? "bg-[var(--accent-primary)] text-white"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                }`}
              >
                <span className="material-symbols-outlined icon-xs">{icon}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={!label.trim()}
            className="flex-1 rounded bg-[var(--accent-primary)] px-2 py-1 font-medium text-white hover:bg-[var(--accent-primary-hover)] disabled:opacity-50"
            style={{ fontSize: "var(--font-size-cell)" }}
          >
            Add
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-1 text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
            style={{ fontSize: "var(--font-size-cell)" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}

// ============================================
// PHASE HEADER
// ============================================

type PhaseHeaderProps = {
  phase: {
    id: string;
    title: string;
    timeframe: string | null;
  };
  journeyMapId: string;
  colSpan: number;
  isLast?: boolean;
};

export function PhaseHeader({
  phase,
  journeyMapId,
  colSpan,
  isLast = false,
}: PhaseHeaderProps) {
  const undo = useUndo();
  const cache = useJourneyMapCache();
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(phase.title);
  const [timeframe, setTimeframe] = useState(phase.timeframe || "");
  const [originalTitle, setOriginalTitle] = useState(phase.title);
  const [originalTimeframe, setOriginalTimeframe] = useState(phase.timeframe || "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitle(phase.title);
    setTimeframe(phase.timeframe || "");
    setOriginalTitle(phase.title);
    setOriginalTimeframe(phase.timeframe || "");
  }, [phase.title, phase.timeframe]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleInsertLeft = () => {
    const result = cache.insertBlankPhaseAt(phase.id, "before");
    if (result?.actionId) sessionStorage.setItem("focusActionId", result.actionId);
  };

  const handleInsertRight = () => {
    const result = cache.insertBlankPhaseAt(phase.id, "after");
    if (result?.actionId) sessionStorage.setItem("focusActionId", result.actionId);
  };

  const commitTitle = () => {
    setIsEditing(false);
    if (title.trim() !== originalTitle) {
      const newVal = title.trim() || "Untitled";
      const oldVal = originalTitle;
      undo?.pushUndo({
        undo: async () => { cache.updatePhase(phase.id, "title", oldVal); },
        redo: async () => { cache.updatePhase(phase.id, "title", newVal); },
      });
      cache.updatePhase(phase.id, "title", newVal);
    }
  };

  const commitTimeframe = () => {
    if (timeframe.trim() !== originalTimeframe) {
      const newVal = timeframe.trim();
      const oldVal = originalTimeframe || "";
      undo?.pushUndo({
        undo: async () => { cache.updatePhase(phase.id, "timeframe", oldVal); },
        redo: async () => { cache.updatePhase(phase.id, "timeframe", newVal); },
      });
      cache.updatePhase(phase.id, "timeframe", newVal);
    }
  };

  const cancelEdit = () => {
    setTitle(originalTitle);
    setTimeframe(originalTimeframe);
    setIsEditing(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitTitle();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEdit();
    }
  };

  const handleTimeframeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitTimeframe();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEdit();
    }
  };

  return (
    <div
      className={`group relative sticky top-0 z-20 border-b border-[var(--border-subtle)] px-3 py-2 ${
        isLast ? "rounded-tr-md" : "border-r"
      }`}
      style={{ 
        gridColumn: `span ${colSpan}`, 
        overflow: "visible",
        backgroundColor: "var(--bg-phase-header)",
        borderRightColor: isLast ? undefined : "var(--bg-phase-header-border)",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isHovered && (
        <>
          <button
            onClick={handleInsertLeft}
            className="absolute -left-2.5 top-1/2 z-[100] flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--accent-primary)] text-white shadow hover:bg-[var(--accent-primary-hover)]"
            title="Insert phase before"
          >
            <AppIcon name="add" size="xs" />
          </button>
          <button
            onClick={handleInsertRight}
            className="absolute -right-2.5 top-1/2 z-[100] flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--accent-primary)] text-white shadow hover:bg-[var(--accent-primary-hover)]"
            title="Insert phase after"
          >
            <AppIcon name="add" size="xs" />
          </button>
        </>
      )}

      {isEditing ? (
        <div className="space-y-0.5">
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={handleTitleKeyDown}
            className="w-full bg-transparent font-semibold text-white outline-none placeholder:text-white/50"
            style={{ fontSize: "var(--font-size-phase)", lineHeight: 1.3 }}
            placeholder="Phase title"
          />
          <input
            type="text"
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            onBlur={commitTimeframe}
            onKeyDown={handleTimeframeKeyDown}
            className="w-full bg-transparent text-white/70 outline-none placeholder:text-white/40"
            style={{ fontSize: "var(--font-size-meta)", lineHeight: 1.4 }}
            placeholder="Timeframe"
          />
        </div>
      ) : (
        <div onClick={() => setIsEditing(true)} className="cursor-text">
          <h2
            className="font-semibold text-white"
            style={{ fontSize: "var(--font-size-phase)", lineHeight: 1.3 }}
          >
            {phase.title}
          </h2>
          {phase.timeframe ? (
            <p
              className="text-white/70"
              style={{ fontSize: "var(--font-size-meta)", lineHeight: 1.4 }}
            >
              {phase.timeframe}
            </p>
          ) : (
            <p
              className="text-white/50 opacity-0 group-hover:opacity-100"
              style={{ fontSize: "var(--font-size-meta)" }}
            >
              + timeframe
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// ADD FIRST PHASE CARD
// ============================================

export function AddFirstPhaseCard({ journeyMapId }: { journeyMapId: string }) {
  const cache = useJourneyMapCache();
  const handleCreate = () => {
    const result = cache.createBlankPhase();
    if (result?.actionId) sessionStorage.setItem("focusActionId", result.actionId);
  };

  return (
    <div className="flex h-full items-center justify-center">
      <button
        onClick={handleCreate}
        className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-[var(--border-subtle)] bg-[var(--bg-panel)] px-12 py-8 text-[var(--text-muted)] transition-colors hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-sidebar)]">
          <AppIcon name="add" />
        </span>
        <span
          className="font-medium"
          style={{ fontSize: "var(--font-size-action)" }}
        >
          Add First Phase
        </span>
        <span style={{ fontSize: "var(--font-size-meta)" }}>
          Start building your journey map
        </span>
      </button>
    </div>
  );
}

// ============================================
// ACTION COLUMN HEADER
// ============================================

type ActionColumnHeaderProps = {
  action: {
    id: string;
    title: string;
  } | null;
  phase: { id: string; title: string };
  isPlaceholder: boolean;
  index: number;
};

export function ActionColumnHeader({
  action,
  phase,
  isPlaceholder,
  index,
}: ActionColumnHeaderProps) {
  const undo = useUndo();
  const cache = useJourneyMapCache();
  const commentCtx = useCommentContext();
  const [comments, setComments] = useState<Array<{ id: string; content: string; createdAt: string; positionX: number | null; positionY: number | null; rowKey?: string | null }>>([]);
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(action?.title || "");
  const [originalTitle, setOriginalTitle] = useState(action?.title || "");
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchComments = () => {
    if (!action?.id) return;
    fetch(`/api/comments?actionId=${encodeURIComponent(action.id)}`)
      .then((r) => r.json())
      .then((list: typeof comments) => list.filter((c) => !c.rowKey || c.rowKey === "header"))
      .then(setComments)
      .catch(() => setComments([]));
  };

  useEffect(() => {
    fetchComments();
  }, [action?.id]);

  useEffect(() => {
    const handler = (ev: Event) => {
      const detail = (ev as CustomEvent<{ comment?: { id: string; content: string; createdAt: string; positionX: number | null; positionY: number | null }; actionId?: string; rowKey?: string }>)?.detail;
      if (detail?.actionId === action?.id && detail?.rowKey === "header" && detail?.comment) {
        const c = detail.comment;
        setComments((prev) => {
          if (prev.some((p) => p.id === c.id)) return prev;
          return [...prev, c];
        });
      } else {
        fetchComments();
      }
    };
    window.addEventListener("comments-updated", handler);
    return () => window.removeEventListener("comments-updated", handler);
  }, [action?.id]);

  // Check for focus request on mount
  useEffect(() => {
    const focusId = sessionStorage.getItem("focusActionId");
    if (focusId && action?.id === focusId) {
      sessionStorage.removeItem("focusActionId");
      setIsEditing(true);
    }
  }, [action?.id]);

  useEffect(() => {
    setTitle(action?.title || "");
    setOriginalTitle(action?.title || "");
  }, [action?.title]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleAddActionLeft = () => {
    const result = cache.insertBlankActionAt(phase.id, action?.id || null, "before");
    if (result?.actionId) sessionStorage.setItem("focusActionId", result.actionId);
  };

  const handleAddActionRight = () => {
    const result = cache.insertBlankActionAt(phase.id, action?.id || null, "after");
    if (result?.actionId) sessionStorage.setItem("focusActionId", result.actionId);
  };

  const commitTitle = () => {
    setIsEditing(false);
    if (action && title.trim() !== originalTitle) {
      const newVal = title.trim() || "Untitled";
      const oldVal = originalTitle;
      undo?.pushUndo({
        undo: async () => { cache.updateActionField(action.id, "title", oldVal); },
        redo: async () => { cache.updateActionField(action.id, "title", newVal); },
      });
      cache.updateActionField(action.id, "title", newVal);
    }
  };

  const cancelEdit = () => {
    setTitle(originalTitle);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitTitle();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEdit();
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (!action?.id || !commentCtx) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    commentCtx.openCommentMenu({ type: "action", actionId: action.id, rowKey: "header" }, e, rect);
  };

  const commentsVisible = commentCtx?.commentsVisible ?? true;

  return (
    <div
      id={`action-col-${index}`}
      className="group relative sticky top-[38px] z-20 border-b border-r border-[var(--border-subtle)] bg-[var(--bg-header)] px-3 py-1.5"
      style={{ overflow: "visible" }}
      data-commentable={action ? "true" : undefined}
      data-action-id={action?.id || undefined}
      data-row-key={action ? "header" : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onContextMenu={action ? handleContextMenu : undefined}
    >
      {isHovered && (
        <>
          <button
            onClick={handleAddActionLeft}
            className="absolute -left-2.5 top-1/2 z-[100] flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--accent-primary)] text-white shadow hover:bg-[var(--accent-primary-hover)]"
            title="Add action before"
          >
            <AppIcon name="add" size="xs" />
          </button>
          <button
            onClick={handleAddActionRight}
            className="absolute -right-2.5 top-1/2 z-[100] flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--accent-primary)] text-white shadow hover:bg-[var(--accent-primary-hover)]"
            title="Add action after"
          >
            <AppIcon name="add" size="xs" />
          </button>
        </>
      )}

      {isPlaceholder ? (
        <span
          className="text-[var(--text-muted)]"
          style={{ fontSize: "var(--font-size-meta)" }}
        >
          Empty
        </span>
      ) : (
        <div className="flex min-w-0 items-center">
          <SelectModeCheckbox actionId={action?.id ?? null} />
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent font-medium text-[var(--text-primary)] outline-none"
              style={{ fontSize: "var(--font-size-action)", lineHeight: 1.4 }}
            />
          ) : (
            <h3
              onClick={() => setIsEditing(true)}
              className="min-w-0 cursor-text truncate font-medium text-[var(--text-primary)]"
              style={{ fontSize: "var(--font-size-action)", lineHeight: 1.4 }}
            >
              {action!.title}
            </h3>
          )}
        </div>
      )}
      {action && commentsVisible && comments.length > 0 && (
        <>
          {comments.map((c, i) => (
            <FloatingCommentIcon
              key={c.id}
              comment={c}
              index={i}
              onDelete={async (id) => {
                await fetch(`/api/comments?id=${id}`, { method: "DELETE" });
                setComments((prev) => prev.filter((x) => x.id !== id));
              }}
            />
          ))}
        </>
      )}
    </div>
  );
}

// ============================================
// SELECT MODE TOOLBAR & CHECKBOX
// ============================================

type SelectModeToolbarProps = {
  allActionIds: string[];
};

export function SelectModeToolbar({ allActionIds }: SelectModeToolbarProps) {
  const ctx = useSelectMode();
  const cache = useJourneyMapCache();
  if (!ctx) return null;

  const { isSelectMode, setSelectMode, selectedIds, selectAll, clearSelection } = ctx;
  const count = selectedIds.size;

  const handleBulkDelete = () => {
    for (const id of selectedIds) {
      cache.deleteAction(id);
    }
    clearSelection();
    setSelectMode(false);
  };

  const handleBulkDuplicate = () => {
    for (const id of selectedIds) {
      cache.duplicateAction(id);
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
            onClick={() => selectAll(allActionIds)}
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

type SelectModeCheckboxProps = {
  actionId: string | null;
};

export function SelectModeCheckbox({ actionId }: SelectModeCheckboxProps) {
  const ctx = useSelectMode();
  if (!ctx || !actionId) return null;
  const { isSelectMode, isSelected, toggleSelect } = ctx;
  if (!isSelectMode) return null;

  const checked = isSelected(actionId);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        toggleSelect(actionId);
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
// INLINE EDITABLE CELLS
// ============================================

type EditableCellProps = {
  actionId: string;
  field: string;
  value: string | null;
  type: "text" | "textarea" | "select";
  options?: string[];
  placeholder?: string;
};

export function EditableCell({
  actionId,
  field,
  value,
  type,
  options,
  placeholder,
}: EditableCellProps) {
  const undo = useUndo();
  const cache = useJourneyMapCache();
  const [localValue, setLocalValue] = useState(value || "");
  const [originalValue, setOriginalValue] = useState(value || "");
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    setLocalValue(value || "");
    setOriginalValue(value || "");
  }, [value]);

  const commitValue = async () => {
    setIsFocused(false);
    if (localValue !== originalValue) {
      const newVal = localValue.trim() || null;
      const oldVal = originalValue.trim() || null;
      undo?.pushUndo({
        undo: async () => { cache.updateActionField(actionId, field, oldVal); },
        redo: async () => { cache.updateActionField(actionId, field, newVal); },
      });
      cache.updateActionField(actionId, field, newVal);
    }
  };

  const cancelEdit = () => {
    setLocalValue(originalValue);
    setIsFocused(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      cancelEdit();
      (e.target as HTMLElement).blur();
    }
    if (e.key === "Enter" && type === "text") {
      e.preventDefault();
      commitValue();
      (e.target as HTMLElement).blur();
    }
  };

  const baseStyle = {
    fontSize: "var(--font-size-cell)",
    lineHeight: 1.5,
  };

  const baseClass =
    "w-full bg-transparent text-[var(--text-secondary)] outline-none placeholder:text-[var(--text-muted)]";

  if (type === "select") {
    return (
      <select
        value={localValue}
        onChange={(e) => {
          setLocalValue(e.target.value);
        }}
        onBlur={commitValue}
        onKeyDown={handleKeyDown}
        className={`${baseClass} cursor-pointer`}
        style={baseStyle}
      >
        {options?.map((opt) => (
          <option key={opt} value={opt}>
            {opt || "—"}
          </option>
        ))}
      </select>
    );
  }

  if (type === "textarea") {
    return (
      <textarea
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={commitValue}
        onKeyDown={handleKeyDown}
        placeholder={isFocused ? placeholder : "—"}
        rows={2}
        className={`${baseClass} resize-none`}
        style={baseStyle}
      />
    );
  }

  return (
    <input
      type="text"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onFocus={() => setIsFocused(true)}
      onBlur={commitValue}
      onKeyDown={handleKeyDown}
      placeholder={isFocused ? placeholder : "—"}
      className={baseClass}
      style={baseStyle}
    />
  );
}

// ============================================
// EMOTION CELL
// ============================================

export function EmotionCell({
  actionId,
  value,
}: {
  actionId: string;
  value: number | null;
}) {
  const undo = useUndo();
  const cache = useJourneyMapCache();
  const [localValue, setLocalValue] = useState(value?.toString() || "");

  useEffect(() => {
    setLocalValue(value?.toString() || "");
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    const oldValue = value;
    const newNum = newValue ? parseInt(newValue, 10) : null;
    setLocalValue(newValue);
    undo?.pushUndo({
      undo: async () => { cache.updateActionField(actionId, "emotion", oldValue); },
      redo: async () => { cache.updateActionField(actionId, "emotion", newNum); },
    });
    cache.updateActionField(actionId, "emotion", newNum);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setLocalValue(value?.toString() || "");
      (e.target as HTMLElement).blur();
    }
  };

  return (
    <select
      value={localValue}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      className="w-full cursor-pointer bg-transparent text-[var(--text-secondary)] outline-none"
      style={{ fontSize: "var(--font-size-cell)", lineHeight: 1.5 }}
    >
      <option value="">—</option>
      <option value="1">😠 Very Low</option>
      <option value="2">😟 Low</option>
      <option value="3">😐 Neutral</option>
      <option value="4">🙂 Good</option>
      <option value="5">😊 Great</option>
    </select>
  );
}

// ============================================
// THUMBNAIL CELL (with modal for upload/generate)
// ============================================

// Thumbnail display size (2x the original: was h-10 w-16, now h-20 w-32)
const THUMBNAIL_WIDTH = 128; // px
const THUMBNAIL_HEIGHT = 80; // px

export function ThumbnailCell({
  actionId,
  actionTitle,
  actionIndex = 0,
  value,
  isDemo = false,
}: {
  actionId: string;
  actionTitle?: string;
  actionIndex?: number;
  value: string | null;
  isDemo?: boolean;
}) {
  const undo = useUndo();
  const cache = useJourneyMapCache();
  const [preview, setPreview] = useState<string | null>(value);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    setPreview(value);
  }, [value]);

  const handleThumbnailSet = (url: string) => {
    const oldVal = value;
    setPreview(url);
    undo?.pushUndo({
      undo: async () => { cache.updateActionField(actionId, "thumbnailUrl", oldVal); },
      redo: async () => { cache.updateActionField(actionId, "thumbnailUrl", url); },
    });
    cache.updateActionField(actionId, "thumbnailUrl", url);
    setShowModal(false);
  };

  const handleRemove = () => {
    const oldVal = value;
    setPreview(null);
    undo?.pushUndo({
      undo: async () => { cache.updateActionField(actionId, "thumbnailUrl", oldVal); },
      redo: async () => { cache.updateActionField(actionId, "thumbnailUrl", null); },
    });
    cache.updateActionField(actionId, "thumbnailUrl", null);
  };

  return (
    <div className="flex items-center justify-center">
      {preview ? (
        <div 
          className="group relative shrink-0 overflow-hidden rounded border border-[var(--border-subtle)]"
          style={{ width: THUMBNAIL_WIDTH, height: THUMBNAIL_HEIGHT }}
        >
          <img
            src={preview}
            alt={`Thumbnail for ${actionTitle || "action"}`}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={() => setShowModal(true)}
              className="rounded bg-white/20 p-1 text-white hover:bg-white/30"
              title="Change thumbnail"
            >
              <AppIcon name="edit" size="xs" />
            </button>
            <button
              onClick={handleRemove}
              className="rounded bg-white/20 p-1 text-white hover:bg-white/30"
              title="Remove thumbnail"
            >
              <AppIcon name="close" size="xs" />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center rounded border border-dashed border-[var(--border-subtle)] bg-[var(--bg-sidebar)] text-[var(--text-muted)] transition-colors hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
          style={{ width: THUMBNAIL_WIDTH, height: THUMBNAIL_HEIGHT }}
          title="Add thumbnail"
        >
          <AppIcon name="add" size="sm" />
        </button>
      )}
      
      {showModal && (
        <ThumbnailModal
          actionId={actionId}
          actionTitle={actionTitle}
          actionIndex={actionIndex}
          isDemo={isDemo}
          currentValue={preview}
          onSetThumbnail={handleThumbnailSet}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

// ============================================
// THUMBNAIL MODAL (Upload + Generate split)
// ============================================

function ThumbnailModal({
  actionId,
  actionTitle,
  actionIndex,
  isDemo,
  currentValue,
  onSetThumbnail,
  onClose,
}: {
  actionId: string;
  actionTitle?: string;
  actionIndex: number;
  isDemo: boolean;
  currentValue: string | null;
  onSetThumbnail: (url: string) => void;
  onClose: () => void;
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentValue);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Clamp modal position within viewport
  useEffect(() => {
    if (modalRef.current) {
      const rect = modalRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const padding = 16;
      
      let translateX = 0;
      let translateY = 0;
      
      if (rect.right > viewportWidth - padding) {
        translateX = viewportWidth - padding - rect.right;
      }
      if (rect.left < padding) {
        translateX = padding - rect.left;
      }
      if (rect.bottom > viewportHeight - padding) {
        translateY = viewportHeight - padding - rect.bottom;
      }
      if (rect.top < padding) {
        translateY = padding - rect.top;
      }
      
      if (translateX !== 0 || translateY !== 0) {
        modalRef.current.style.transform = `translate(${translateX}px, ${translateY}px)`;
      }
    }
  }, []);

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleFileSelect = async (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setPreview(dataUrl);
      onSetThumbnail(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleGenerate = async () => {
    if (!isDemo) return;
    setIsGenerating(true);
    
    // Simulate generation delay (800-1200ms)
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400));
    
    // Use deterministic thumbnail based on action index
    const thumbnailUrl = getDemoThumbnailForIndex(actionIndex);
    setPreview(thumbnailUrl);
    onSetThumbnail(thumbnailUrl);
    setIsGenerating(false);
  };

  const handleRemove = () => {
    setPreview(null);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="w-[480px] rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3">
          <h3 className="font-medium text-[var(--text-primary)]">Thumbnail</h3>
          <button
            onClick={onClose}
            className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
          >
            <AppIcon name="close" size="sm" />
          </button>
        </div>

        {/* Content - Two columns */}
        <div className="flex divide-x divide-[var(--border-subtle)]">
          {/* Left side - Upload */}
          <div className="flex-1 p-4">
            <h4 className="mb-3 text-sm font-medium text-[var(--text-secondary)]">Upload</h4>
            
            {preview ? (
              <div className="space-y-3">
                <div className="relative aspect-video overflow-hidden rounded border border-[var(--border-subtle)]">
                  <img
                    src={preview}
                    alt="Preview"
                    className="h-full w-full object-cover"
                  />
                </div>
                <button
                  onClick={handleRemove}
                  className="flex w-full items-center justify-center gap-1 rounded border border-[var(--border-subtle)] py-2 text-sm text-[var(--text-muted)] transition-colors hover:border-red-300 hover:text-red-500"
                >
                  <AppIcon name="delete" size="xs" />
                  Remove
                </button>
              </div>
            ) : (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={handleBrowseClick}
                className={`flex aspect-video cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
                  isDragging
                    ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/5"
                    : "border-[var(--border-subtle)] bg-[var(--bg-sidebar)] hover:border-[var(--accent-primary)]"
                }`}
              >
                <AppIcon name="upload" size="lg" className="mb-2 text-[var(--text-muted)]" />
                <p className="text-sm text-[var(--text-secondary)]">Drag an image here</p>
                <p className="text-xs text-[var(--text-muted)]">or click to browse</p>
              </div>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Right side - Generate */}
          <div className="flex-1 p-4">
            <h4 className="mb-3 text-sm font-medium text-[var(--text-secondary)]">Generate</h4>
            
            <div className="flex flex-col items-center justify-center space-y-3">
              <button
                onClick={handleGenerate}
                disabled={!isDemo || isGenerating}
                className={`flex w-full items-center justify-center gap-2 rounded-lg py-3 font-medium transition-colors ${
                  isDemo
                    ? "bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary-hover)]"
                    : "cursor-not-allowed bg-[var(--bg-sidebar)] text-[var(--text-muted)]"
                }`}
              >
                <AppIcon name="ai" size="sm" />
                {isGenerating ? "Generating..." : "Generate thumbnail"}
              </button>
              
              <p className="text-center text-xs text-[var(--text-muted)]">
                {isDemo 
                  ? "Uses persona + action details (demo)"
                  : "Coming soon"
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// CHANNEL CELL (with icons + custom option)
// ============================================

export function ChannelCell({
  actionId,
  value,
  options,
  journeyMapId,
}: {
  actionId: string;
  value: string | null;
  options: SelectOption[];
  journeyMapId: string;
}) {
  const undo = useUndo();
  const cache = useJourneyMapCache();
  const { openCustomOption } = useOverlay();
  const [localValue, setLocalValue] = useState(value || "");
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    setLocalValue(value || "");
  }, [value]);

  const currentOption = options.find((o) => o.value === localValue);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;

    if (newValue === "__custom__") {
      const rect = selectRef.current?.getBoundingClientRect();
      if (rect) {
        const oldVal = value || "";
        openCustomOption("channel", rect, (label, iconName) => {
          cache.createCustomChannel(label, iconName);
          setLocalValue(label);
          undo?.pushUndo({
            undo: async () => { cache.updateActionField(actionId, "channel", oldVal); },
            redo: async () => { cache.updateActionField(actionId, "channel", label); },
          });
          cache.updateActionField(actionId, "channel", label);
        });
      }
      e.target.value = localValue;
      return;
    }

    const oldVal = value || "";
    setLocalValue(newValue);
    undo?.pushUndo({
      undo: async () => { cache.updateActionField(actionId, "channel", oldVal); },
      redo: async () => { cache.updateActionField(actionId, "channel", newValue); },
    });
    cache.updateActionField(actionId, "channel", newValue);
  };

  return (
    <div className="flex items-center gap-1.5">
      {currentOption && currentOption.icon !== "remove" && (
        <span className="material-symbols-outlined icon-xs text-[var(--text-muted)]">
          {currentOption.icon}
        </span>
      )}
      <select
        ref={selectRef}
        value={localValue}
        onChange={handleChange}
        className="flex-1 cursor-pointer bg-transparent text-[var(--text-secondary)] outline-none"
        style={{ fontSize: "var(--font-size-cell)", lineHeight: 1.5 }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
        <option value="__custom__">+ Add custom...</option>
      </select>
    </div>
  );
}

// ============================================
// TOUCHPOINT CELL (with icons + custom option)
// ============================================

export function TouchpointCell({
  actionId,
  value,
  options,
  journeyMapId,
}: {
  actionId: string;
  value: string | null;
  options: SelectOption[];
  journeyMapId: string;
}) {
  const undo = useUndo();
  const cache = useJourneyMapCache();
  const { openCustomOption } = useOverlay();
  const [localValue, setLocalValue] = useState(value || "");
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    setLocalValue(value || "");
  }, [value]);

  const currentOption = options.find((o) => o.value === localValue);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;

    if (newValue === "__custom__") {
      const rect = selectRef.current?.getBoundingClientRect();
      if (rect) {
        const oldVal = value || "";
        openCustomOption("touchpoint", rect, (label, iconName) => {
          cache.createCustomTouchpoint(label, iconName);
          setLocalValue(label);
          undo?.pushUndo({
            undo: async () => { cache.updateActionField(actionId, "touchpoint", oldVal); },
            redo: async () => { cache.updateActionField(actionId, "touchpoint", label); },
          });
          cache.updateActionField(actionId, "touchpoint", label);
        });
      }
      e.target.value = localValue;
      return;
    }

    const oldVal = value || "";
    setLocalValue(newValue);
    undo?.pushUndo({
      undo: async () => { cache.updateActionField(actionId, "touchpoint", oldVal); },
      redo: async () => { cache.updateActionField(actionId, "touchpoint", newValue); },
    });
    cache.updateActionField(actionId, "touchpoint", newValue);
  };

  return (
    <div className="flex items-center gap-1.5">
      {currentOption && currentOption.icon !== "remove" && (
        <span className="material-symbols-outlined icon-xs text-[var(--text-muted)]">
          {currentOption.icon}
        </span>
      )}
      <select
        ref={selectRef}
        value={localValue}
        onChange={handleChange}
        className="flex-1 cursor-pointer bg-transparent text-[var(--text-secondary)] outline-none"
        style={{ fontSize: "var(--font-size-cell)", lineHeight: 1.5 }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
        <option value="__custom__">+ Add custom...</option>
      </select>
    </div>
  );
}

// ============================================
// EMOTION TREND ROW WITH QUOTE BUBBLES
// ============================================

type EmotionTrendRowProps = {
  actionColumns: {
    action: {
      id: string;
      title: string;
      emotion: number | null;
      quotes: { id: string; quoteText: string; source: string | null }[];
    } | null;
    index: number;
    isPlaceholder: boolean;
  }[];
  columnWidth: number;
};

// Helper: Generate smooth cubic bezier path through points
function generateSmoothPath(
  points: { x: number; y: number }[],
  tension: number = 0.3
): string {
  if (points.length < 2) return "";
  if (points.length === 2) {
    // Just two points: draw a straight line
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  const path: string[] = [];
  path.push(`M ${points[0].x} ${points[0].y}`);

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    // Calculate control points using Catmull-Rom to Bezier conversion
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;

    path.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`);
  }

  return path.join(" ");
}

// Helper: Find consecutive runs of points with emotions
function findEmotionRuns(
  points: { hasEmotion: boolean; x: number; y: number; emotion: number | null }[]
): { x: number; y: number; emotion: number }[][] {
  const runs: { x: number; y: number; emotion: number }[][] = [];
  let currentRun: { x: number; y: number; emotion: number }[] = [];

  for (const point of points) {
    if (point.hasEmotion && point.emotion !== null) {
      currentRun.push({ x: point.x, y: point.y, emotion: point.emotion });
    } else {
      if (currentRun.length >= 2) {
        runs.push(currentRun);
      }
      currentRun = [];
    }
  }

  // Don't forget the last run
  if (currentRun.length >= 2) {
    runs.push(currentRun);
  }

  return runs;
}

export function EmotionTrendRow({
  actionColumns,
  columnWidth,
}: EmotionTrendRowProps) {
  const { openQuotes } = useOverlay();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const rowHeight = 60;
  const dotRadius = 8;
  const paddingY = 12;
  const plotHeight = rowHeight - paddingY * 2 - 8;
  const totalWidth = actionColumns.length * columnWidth;

  const emotionColors: Record<number, string> = {
    1: "var(--emotion-1)",
    2: "var(--emotion-2)",
    3: "var(--emotion-3)",
    4: "var(--emotion-4)",
    5: "var(--emotion-5)",
  };

  const points = actionColumns.map((col, i) => {
    const x = (i + 0.5) * columnWidth;
    const hasEmotion = col.action?.emotion != null;
    const emotion = col.action?.emotion ?? 3;
    const y = paddingY + plotHeight - ((emotion - 1) / 4) * plotHeight;
    return {
      x,
      y: hasEmotion ? y : paddingY + plotHeight / 2,
      emotion: hasEmotion ? emotion : null,
      index: col.index,
      action: col.action,
      hasEmotion,
    };
  });

  const handleDotClick = (
    e: React.MouseEvent,
    action: NonNullable<(typeof actionColumns)[0]["action"]>
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    openQuotes(action, rect);
  };

  const labelCell = (
    <div
      className="sticky left-0 z-10 flex items-center border-b border-r border-[var(--border-subtle)] bg-[var(--bg-header)] px-3 py-1.5 font-medium text-[var(--text-muted)]"
      style={{ fontSize: "var(--font-size-label)", lineHeight: 1.4 }}
    >
      <div className="flex flex-col">
        <span>Emotion</span>
        <span
          className="opacity-50"
          style={{ fontSize: "var(--font-size-meta)" }}
        >
          Trend
        </span>
      </div>
    </div>
  );

  // SSR placeholder
  if (!isMounted) {
    return (
      <>
        {labelCell}
        <div
          className="border-b border-[var(--border-subtle)] bg-[var(--bg-panel)]"
          style={{
            gridColumn: `span ${actionColumns.length}`,
            height: rowHeight,
          }}
        />
      </>
    );
  }

  // Find consecutive runs of points with emotions
  const emotionRuns = findEmotionRuns(points);

  // Build smooth curved paths for each run
  const pathElements: React.ReactNode[] = [];
  let gradientDefs: React.ReactNode[] = [];

  emotionRuns.forEach((run, runIndex) => {
    if (run.length < 2) return;

    // Create a gradient that spans the entire run
    const gradientId = `trend-gradient-${runIndex}`;
    const runStartX = run[0].x;
    const runEndX = run[run.length - 1].x;
    const runWidth = runEndX - runStartX;

    // Build gradient stops based on emotion colors at each point
    const stops = run.map((point, i) => {
      const offset = runWidth > 0 ? ((point.x - runStartX) / runWidth) * 100 : 0;
      return (
        <stop
          key={`stop-${runIndex}-${i}`}
          offset={`${offset}%`}
          stopColor={emotionColors[point.emotion]}
        />
      );
    });

    gradientDefs.push(
      <linearGradient
        key={`gradient-${runIndex}`}
        id={gradientId}
        x1="0%"
        y1="0%"
        x2="100%"
        y2="0%"
      >
        {stops}
      </linearGradient>
    );

    // Generate smooth path
    const pathD = generateSmoothPath(run, 0.25);

    pathElements.push(
      <path
        key={`path-${runIndex}`}
        d={pathD}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  });

  return (
    <>
      {labelCell}

      <div
        className="relative border-b border-[var(--border-subtle)] bg-[var(--bg-panel)]"
        style={{ gridColumn: `span ${actionColumns.length}` }}
      >
        <svg
          width={totalWidth}
          height={rowHeight}
          className="block"
          aria-label="Emotion trend chart"
        >
          <defs>{gradientDefs}</defs>

          {/* Reference lines */}
          <line
            x1={0}
            y1={paddingY}
            x2={totalWidth}
            y2={paddingY}
            stroke="var(--border-muted)"
            strokeWidth="1"
            strokeDasharray="2,4"
          />
          <line
            x1={0}
            y1={paddingY + plotHeight / 2}
            x2={totalWidth}
            y2={paddingY + plotHeight / 2}
            stroke="var(--border-muted)"
            strokeWidth="1"
          />
          <line
            x1={0}
            y1={paddingY + plotHeight}
            x2={totalWidth}
            y2={paddingY + plotHeight}
            stroke="var(--border-muted)"
            strokeWidth="1"
            strokeDasharray="2,4"
          />

          {/* Smooth curved paths */}
          {pathElements}

          {/* Dots */}
          {points.map((point, i) => (
            <g key={`point-${i}`}>
              {point.hasEmotion ? (
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={dotRadius}
                  fill={emotionColors[point.emotion!]}
                  stroke="white"
                  strokeWidth="2"
                  className="cursor-pointer"
                  onClick={() => {
                    const el = document.getElementById(
                      `action-col-${point.index}`
                    );
                    el?.scrollIntoView({
                      behavior: "smooth",
                      inline: "center",
                    });
                  }}
                />
              ) : (
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={dotRadius - 2}
                  fill="none"
                  stroke="var(--border-subtle)"
                  strokeWidth="1.5"
                  strokeDasharray="2,2"
                />
              )}
            </g>
          ))}
        </svg>

        {/* Clickable overlay buttons for each dot - clicking opens quotes */}
        {points.map((point, i) => {
          if (!point.action) return null;

          return (
            <button
              key={`dot-btn-${i}`}
              onClick={(e) => handleDotClick(e, point.action!)}
              className="absolute flex items-center justify-center"
              style={{
                left: point.x - dotRadius - 2,
                top: point.y - dotRadius - 2,
                width: (dotRadius + 2) * 2,
                height: (dotRadius + 2) * 2,
              }}
              title={`${point.action.title}${point.hasEmotion ? `: ${point.emotion}/5` : ""} - Click to add quotes`}
            />
          );
        })}

        {/* Quote count badges - only show if count >= 1 */}
        {points.map((point, i) => {
          if (!point.action) return null;
          const quoteCount = point.action.quotes.length;
          if (quoteCount === 0) return null;

          const bubbleLeft = point.x + dotRadius + 2;
          const bubbleTop = point.y - dotRadius - 6;

          return (
            <button
              key={`quote-badge-${i}`}
              onClick={(e) => handleDotClick(e, point.action!)}
              className="absolute flex h-4 w-4 items-center justify-center rounded-full bg-[var(--accent-primary)] text-white"
              style={{
                left: bubbleLeft,
                top: bubbleTop,
                fontSize: "8px",
                fontWeight: 500,
              }}
              title={`${quoteCount} quote${quoteCount !== 1 ? "s" : ""}`}
            >
              {quoteCount}
            </button>
          );
        })}
      </div>
    </>
  );
}

// ============================================
// PAIN POINT CELL (uses shared PainPointEditor)
// ============================================

import { PainPointEditor, parsePainPoints } from "../../../../components/PainPointEditor";
import type { PainPoint as SharedPainPoint } from "../../../../components/PainPointEditor";

export function PainPointCell({
  actionId,
  value,
}: {
  actionId: string;
  value: string | null;
}) {
  const undo = useUndo();
  const cache = useJourneyMapCache();
  const [painPoints, setPainPoints] = useState<SharedPainPoint[]>(parsePainPoints(value));

  useEffect(() => {
    setPainPoints(parsePainPoints(value));
  }, [value]);

  const handleUpdate = (newPainPoints: SharedPainPoint[]) => {
    const oldPainPoints = painPoints;
    setPainPoints(newPainPoints);
    undo?.pushUndo({
      undo: async () => { cache.updateActionPainPoints(actionId, oldPainPoints as PainPoint[]); },
      redo: async () => { cache.updateActionPainPoints(actionId, newPainPoints as PainPoint[]); },
    });
    cache.updateActionPainPoints(actionId, newPainPoints as PainPoint[]);
  };

  return (
    <div className="space-y-1">
      <PainPointEditor
        painPoints={painPoints}
        onUpdate={handleUpdate}
        fontSize="11px"
        compact={true}
      />
    </div>
  );
}

// ============================================
// OPPORTUNITY CELL (uses shared OpportunityEditor)
// ============================================

import { OpportunityEditor, parseOpportunities } from "../../../../components/OpportunityEditor";
import type { Opportunity as SharedOpportunity } from "../../../../components/OpportunityEditor";
import { type Opportunity } from "../actions";
import { DEMO_OPPORTUNITY_SUGGESTIONS } from "../../../../demo/demoChatData";

export function OpportunityCell({
  actionId,
  value,
  isDemo = false,
}: {
  actionId: string;
  value: string | null;
  isDemo?: boolean;
}) {
  const undo = useUndo();
  const cache = useJourneyMapCache();
  const [opportunities, setOpportunities] = useState<SharedOpportunity[]>(parseOpportunities(value));

  useEffect(() => {
    setOpportunities(parseOpportunities(value));
  }, [value]);

  const handleUpdate = (newOpportunities: SharedOpportunity[]) => {
    const oldOpportunities = opportunities;
    setOpportunities(newOpportunities);
    undo?.pushUndo({
      undo: async () => { cache.updateActionOpportunities(actionId, oldOpportunities as Opportunity[]); },
      redo: async () => { cache.updateActionOpportunities(actionId, newOpportunities as Opportunity[]); },
    });
    cache.updateActionOpportunities(actionId, newOpportunities as Opportunity[]);
  };

  const handleSuggest = () => {
    const suggested = DEMO_OPPORTUNITY_SUGGESTIONS as SharedOpportunity[];
    handleUpdate([...opportunities, ...suggested]);
  };

  return (
    <div className="space-y-1">
      <OpportunityEditor
        opportunities={opportunities}
        onUpdate={handleUpdate}
        fontSize="11px"
        compact={true}
        onSuggestOpportunities={isDemo ? handleSuggest : undefined}
      />
    </div>
  );
}

// ============================================
// PERSONA SELECTOR (Selector-only, no inline editing)
// ============================================

import { createPersona } from "../../actions";
import { useDemoOptional } from "../../../../demo/DemoContext";
import { DEMO_PERSONA_PREFILL } from "../../../../demo/demoChatData";
import Link from "next/link";

type Persona = {
  id: string;
  name: string;
  shortDescription: string | null;
  avatarUrl: string | null;
};

export function PersonaSelector({
  journeyMapId,
  currentPersonaId,
  personas,
  projectId,
}: {
  journeyMapId: string;
  currentPersonaId: string | null;
  personas: Persona[];
  projectId: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const cache = useJourneyMapCache();
  const demo = useDemoOptional();
  const isDemo = demo?.isDemo ?? false;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectPersona = (personaId: string | null) => {
    cache.updatePersonaId(personaId);
    setIsOpen(false);
  };

  const handlePersonaCreated = (personaId: string) => {
    cache.updatePersonaId(personaId);
    setShowCreateModal(false);
  };

  const currentPersona = personas.find(p => p.id === currentPersonaId);

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 rounded border border-[var(--border-subtle)] px-2 py-1 text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
          style={{ fontSize: "var(--font-size-meta)" }}
        >
          <AppIcon name="persona" size="xs" />
          {currentPersona ? currentPersona.name : "Persona"}
          <AppIcon name="chevronDown" size="xs" />
        </button>

        {isOpen && (
          <div className="absolute right-0 top-full z-50 mt-1 min-w-[220px] rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] shadow-lg">
            {personas.length === 0 ? (
              // Empty state
              <div className="p-3 text-center">
                <p className="text-[var(--text-muted)] mb-2" style={{ fontSize: "var(--font-size-meta)" }}>
                  No personas yet
                </p>
                <button
                  onClick={() => { setIsOpen(false); setShowCreateModal(true); }}
                  className="flex w-full items-center justify-center gap-1.5 rounded bg-[var(--accent-primary)] px-3 py-1.5 text-white hover:bg-[var(--accent-primary-hover)]"
                  style={{ fontSize: "var(--font-size-meta)" }}
                >
                  <AppIcon name="add" size="xs" />
                  Create persona
                </button>
              </div>
            ) : (
              <>
                {/* None option */}
                <button
                  onClick={() => handleSelectPersona(null)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[var(--bg-hover)] ${
                    !currentPersonaId ? "bg-[var(--bg-sidebar)]" : ""
                  }`}
                  style={{ fontSize: "var(--font-size-meta)" }}
                >
                  <span className="text-[var(--text-muted)]">None</span>
                </button>

                {/* Divider */}
                <div className="border-t border-[var(--border-muted)]" />

                {/* Existing personas */}
                <div className="max-h-48 overflow-auto">
                  {personas.map(persona => (
                    <button
                      key={persona.id}
                      onClick={() => handleSelectPersona(persona.id)}
                      className={`flex w-full flex-col items-start px-3 py-2 text-left hover:bg-[var(--bg-hover)] ${
                        persona.id === currentPersonaId ? "bg-[var(--bg-sidebar)]" : ""
                      }`}
                    >
                      <span
                        className="font-medium text-[var(--text-primary)]"
                        style={{ fontSize: "var(--font-size-meta)" }}
                      >
                        {persona.name}
                      </span>
                      {persona.shortDescription && (
                        <span
                          className="text-[var(--text-muted)]"
                          style={{ fontSize: "10px" }}
                        >
                          {persona.shortDescription}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Divider */}
                <div className="border-t border-[var(--border-muted)]" />

                {/* Actions */}
                <button
                  onClick={() => { setIsOpen(false); setShowCreateModal(true); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[var(--accent-primary)] hover:bg-[var(--bg-hover)]"
                  style={{ fontSize: "var(--font-size-meta)" }}
                >
                  <AppIcon name="add" size="xs" />
                  Create persona
                </button>
                <Link
                  href={`/projects/${projectId}#personas`}
                  onClick={() => setIsOpen(false)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
                  style={{ fontSize: "var(--font-size-meta)" }}
                >
                  <AppIcon name="settings" size="xs" />
                  Manage personas
                </Link>
              </>
            )}
          </div>
        )}
      </div>

      {/* Create Persona Modal */}
      {showCreateModal && (
        <CreatePersonaModal
          projectId={projectId}
          isDemo={isDemo}
          onClose={() => setShowCreateModal(false)}
          onCreated={handlePersonaCreated}
        />
      )}
    </>
  );
}

// ============================================
// CREATE PERSONA MODAL (with demo prefill)
// ============================================

function CreatePersonaModal({
  projectId,
  isDemo,
  onClose,
  onCreated,
}: {
  projectId: string;
  isDemo: boolean;
  onClose: () => void;
  onCreated: (personaId: string) => void;
}) {
  // In demo mode: start blank; populate on focus
  const [name, setName] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [role, setRole] = useState("");
  const [context, setContext] = useState("");
  const [goals, setGoals] = useState("");
  const [needs, setNeeds] = useState("");
  const [painPoints, setPainPoints] = useState("");
  const [notes, setNotes] = useState("");

  const demoFocus = (key: keyof typeof DEMO_PERSONA_PREFILL, setter: (v: string) => void, current: string) => {
    if (!isDemo || current) return;
    const v = DEMO_PERSONA_PREFILL[key];
    if (typeof v === "string") setter(v);
  };
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const handleGenerateHeadshot = async () => {
    if (!isDemo) return;
    setIsGeneratingAvatar(true);
    // Simulate loading (800-1200ms)
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400));
    setAvatarUrl(DEMO_ASSETS.PERSONA_HEADSHOT);
    setIsGeneratingAvatar(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setAvatarUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    
    try {
      const persona = await createPersona(projectId, {
        name: name.trim(),
        shortDescription: shortDescription.trim() || null,
        role: role.trim() || null,
        context: context.trim() || null,
        goals: goals.trim() || null,
        needs: needs.trim() || null,
        painPoints: painPoints.trim() || null,
        notes: notes.trim() || null,
        avatarUrl: avatarUrl || null,
      });
      if (persona) {
        onCreated(persona.id);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-[600px] max-h-[85vh] overflow-auto rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-4">
          <h3 className="font-semibold text-[var(--text-primary)]" style={{ fontSize: "16px" }}>
            Create Persona
          </h3>
          <button
            onClick={onClose}
            className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
          >
            <AppIcon name="close" size="sm" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 p-5">
          {/* Avatar section */}
          <div className="flex items-start gap-4">
            <div
              className="h-20 w-20 shrink-0 overflow-hidden rounded-full bg-[var(--bg-sidebar)] cursor-pointer border-2 border-dashed border-[var(--border-subtle)] hover:border-[var(--accent-primary)]"
              onClick={() => fileInputRef.current?.click()}
              title="Click to upload"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[var(--text-muted)]">
                  <AppIcon name="persona" size="lg" />
                </div>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <p className="text-[var(--text-muted)]" style={{ fontSize: "var(--font-size-meta)" }}>
                Click the circle to upload or drag an image
              </p>
              <button
                onClick={handleGenerateHeadshot}
                disabled={!isDemo || isGeneratingAvatar}
                className={`flex items-center gap-1.5 rounded px-3 py-1.5 font-medium transition-colors ${
                  isDemo
                    ? "bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary-hover)]"
                    : "bg-[var(--bg-sidebar)] text-[var(--text-muted)] cursor-not-allowed"
                }`}
                style={{ fontSize: "var(--font-size-cell)" }}
              >
                <AppIcon name="ai" size="xs" />
                {isGeneratingAvatar ? "Generating..." : "Generate headshot"}
              </button>
              <p className="text-[var(--text-muted)]" style={{ fontSize: "10px" }}>
                {isDemo ? "Uses demo placeholder image" : "Coming soon"}
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Name (required) */}
          <div>
            <label className="mb-1 block text-[var(--text-secondary)]" style={{ fontSize: "var(--font-size-meta)" }}>
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={() => demoFocus("name", setName, name)}
              placeholder={isDemo ? "Click to fill with demo…" : "e.g., Alex"}
              className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] px-3 py-2 text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
              style={{ fontSize: "var(--font-size-cell)" }}
            />
          </div>

          {/* Short Description */}
          <div>
            <label className="mb-1 block text-[var(--text-secondary)]" style={{ fontSize: "var(--font-size-meta)" }}>
              Short descriptor / tagline
            </label>
            <input
              type="text"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              onFocus={() => demoFocus("shortDescription", setShortDescription, shortDescription)}
              placeholder={isDemo ? "Click to fill with demo…" : "e.g., Busy customer"}
              className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] px-3 py-2 text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
              style={{ fontSize: "var(--font-size-cell)" }}
            />
          </div>

          {/* Role */}
          <div>
            <label className="mb-1 block text-[var(--text-secondary)]" style={{ fontSize: "var(--font-size-meta)" }}>
              Role / archetype
            </label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              onFocus={() => demoFocus("role", setRole, role)}
              placeholder={isDemo ? "Click to fill with demo…" : "e.g., Time-poor resident"}
              className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] px-3 py-2 text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
              style={{ fontSize: "var(--font-size-cell)" }}
            />
          </div>

          {/* Context */}
          <div>
            <label className="mb-1 block text-[var(--text-secondary)]" style={{ fontSize: "var(--font-size-meta)" }}>
              Context
            </label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              onFocus={() => demoFocus("context", setContext, context)}
              placeholder={isDemo ? "Click to fill with demo…" : "Background and situation..."}
              rows={2}
              className="w-full resize-none rounded-md border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] px-3 py-2 text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
              style={{ fontSize: "var(--font-size-cell)" }}
            />
          </div>

          {/* Goals */}
          <div>
            <label className="mb-1 block text-[var(--text-secondary)]" style={{ fontSize: "var(--font-size-meta)" }}>
              Goals
            </label>
            <textarea
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              onFocus={() => demoFocus("goals", setGoals, goals)}
              placeholder={isDemo ? "Click to fill with demo…" : "What they want to achieve..."}
              rows={2}
              className="w-full resize-none rounded-md border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] px-3 py-2 text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
              style={{ fontSize: "var(--font-size-cell)" }}
            />
          </div>

          {/* Needs */}
          <div>
            <label className="mb-1 block text-[var(--text-secondary)]" style={{ fontSize: "var(--font-size-meta)" }}>
              Needs
            </label>
            <textarea
              value={needs}
              onChange={(e) => setNeeds(e.target.value)}
              onFocus={() => demoFocus("needs", setNeeds, needs)}
              placeholder={isDemo ? "Click to fill with demo…" : "What they require..."}
              rows={2}
              className="w-full resize-none rounded-md border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] px-3 py-2 text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
              style={{ fontSize: "var(--font-size-cell)" }}
            />
          </div>

          {/* Pain Points */}
          <div>
            <label className="mb-1 block text-[var(--text-secondary)]" style={{ fontSize: "var(--font-size-meta)" }}>
              Pain points
            </label>
            <textarea
              value={painPoints}
              onChange={(e) => setPainPoints(e.target.value)}
              onFocus={() => demoFocus("painPoints", setPainPoints, painPoints)}
              placeholder={isDemo ? "Click to fill with demo…" : "Frustrations and challenges..."}
              rows={2}
              className="w-full resize-none rounded-md border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] px-3 py-2 text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
              style={{ fontSize: "var(--font-size-cell)" }}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1 block text-[var(--text-secondary)]" style={{ fontSize: "var(--font-size-meta)" }}>
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onFocus={() => demoFocus("notes", setNotes, notes)}
              placeholder={isDemo ? "Click to fill with demo…" : "Additional notes..."}
              rows={2}
              className="w-full resize-none rounded-md border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] px-3 py-2 text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
              style={{ fontSize: "var(--font-size-cell)" }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-[var(--border-subtle)] px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-4 py-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)]"
            style={{ fontSize: "var(--font-size-cell)" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || isSaving}
            className="rounded-md bg-[var(--accent-primary)] px-4 py-2 font-medium text-white transition-colors hover:bg-[var(--accent-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ fontSize: "var(--font-size-cell)" }}
          >
            {isSaving ? "Creating..." : "Create Persona"}
          </button>
        </div>
      </div>
    </div>
  );
}
