"use client";

import React, { useState } from "react";
import { AppIcon } from "./Icon";

type Comment = {
  id: string;
  content: string;
  createdAt: string;
  positionX: number | null;
  positionY: number | null;
};

type FloatingCommentIconProps = {
  comment: Comment;
  index: number;
  onDelete?: (id: string) => void;
};

export function FloatingCommentIcon({ comment, index, onDelete }: FloatingCommentIconProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const left = (comment.positionX ?? 0.5) * 100;
  const top = (comment.positionY ?? 0.5) * 100;

  return (
    <div
      className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${left}%`, top: `${top}%` }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div
        className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent-primary)] text-white shadow cursor-pointer hover:bg-[var(--accent-primary-hover)]"
        style={{ fontSize: "10px", fontWeight: 600 }}
      >
        {index + 1}
      </div>
      {showTooltip && (
        <div className="absolute left-1/2 top-full z-20 mt-1 min-w-[120px] max-w-[200px] -translate-x-1/2 rounded border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-2 shadow-lg">
          <p className="text-xs text-[var(--text-primary)] whitespace-pre-wrap">{comment.content}</p>
          {onDelete ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(comment.id);
              }}
              className="mt-2 text-xs text-red-500 hover:underline"
            >
              Delete
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
