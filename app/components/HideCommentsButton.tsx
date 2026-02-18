"use client";

import React from "react";
import { useCommentContext } from "../contexts/CommentContext";
import { AppIcon } from "./Icon";

export function HideCommentsButton() {
  const ctx = useCommentContext();
  if (!ctx) return null;

  const { commentsVisible, toggleCommentsVisible } = ctx;

  return (
    <button
      onClick={toggleCommentsVisible}
      className="flex items-center gap-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-2 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
      title={commentsVisible ? "Hide comments" : "Show comments"}
    >
      <AppIcon name="quote" size="xs" />
      <span>{commentsVisible ? "Hide comments" : "Show comments"}</span>
    </button>
  );
}
