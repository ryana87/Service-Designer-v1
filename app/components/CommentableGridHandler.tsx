"use client";

import React from "react";
import { useCommentContext } from "../contexts/CommentContext";

/**
 * Wraps the journey map grid and captures context menu events at the document level.
 * This ensures "Add comment" shows even when right-clicking on inputs, buttons, etc.
 */
export function CommentableGridHandler({ children }: { children: React.ReactNode }) {
  const ctx = useCommentContext();

  const handleContextMenu = React.useCallback(
    (e: React.MouseEvent) => {
      if (!ctx) return;
      const target = e.target as HTMLElement;
      const cell = target.closest("[data-commentable='true']");
      if (!cell) return;
      const actionId = cell.getAttribute("data-action-id");
      const rowKey = cell.getAttribute("data-row-key");
      if (!actionId || !rowKey) return;
      e.preventDefault();
      e.stopPropagation();
      const rect = cell.getBoundingClientRect();
      ctx.openCommentMenu({ type: "action", actionId, rowKey }, e, rect);
    },
    [ctx]
  );

  return (
    <div onContextMenuCapture={handleContextMenu}>
      {children}
    </div>
  );
}
