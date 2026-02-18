"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import type { CommentTarget } from "../contexts/CommentContext";

type CommentContextMenuProps = {
  x: number;
  y: number;
  target: CommentTarget;
  positionX: number;
  positionY: number;
  onAddComment: (content: string, positionX: number, positionY: number) => void;
  onClose: () => void;
};

export function CommentContextMenu({
  x,
  y,
  target,
  positionX,
  positionY,
  onAddComment,
  onClose,
}: CommentContextMenuProps) {
  const [showInput, setShowInput] = useState(false);
  const [content, setContent] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showInput]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  const handleAdd = () => {
    if (content.trim()) {
      onAddComment(content.trim(), positionX, positionY);
      onClose();
    }
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[200] min-w-[160px] rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] shadow-lg py-1"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      {!showInput ? (
        <button
          onClick={() => setShowInput(true)}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
        >
          Add comment
        </button>
      ) : (
        <div className="p-2 space-y-2">
          <input
            ref={inputRef}
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
              if (e.key === "Escape") onClose();
            }}
            placeholder="Comment text..."
            className="w-full rounded border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] px-2 py-1.5 text-sm text-[var(--text-primary)] outline-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={!content.trim()}
              className="flex-1 rounded bg-[var(--accent-primary)] px-2 py-1 text-xs text-white disabled:opacity-50"
            >
              Add
            </button>
            <button
              onClick={onClose}
              className="rounded border border-[var(--border-subtle)] px-2 py-1 text-xs text-[var(--text-secondary)]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
