"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useCommentContext } from "../contexts/CommentContext";
import { FloatingCommentIcon } from "./FloatingCommentIcon";

type Comment = {
  id: string;
  content: string;
  createdAt: string;
  positionX: number | null;
  positionY: number | null;
  rowKey: string | null;
};

type CommentableCellProps = {
  actionId: string | null;
  rowKey: string;
  className: string;
  children: React.ReactNode;
};

export function CommentableCell({ actionId, rowKey, className, children }: CommentableCellProps) {
  const ctx = useCommentContext();
  const [comments, setComments] = useState<Comment[]>([]);

  const fetchComments = useCallback(() => {
    if (!actionId) return;
    fetch(`/api/comments?actionId=${encodeURIComponent(actionId)}`)
      .then((r) => r.json())
      .then((list: Comment[]) => list.filter((c) => !c.rowKey || c.rowKey === rowKey))
      .then(setComments)
      .catch(() => setComments([]));
  }, [actionId, rowKey]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  useEffect(() => {
    const handler = (ev: Event) => {
      const detail = (ev as CustomEvent<{ comment?: unknown; actionId?: string; rowKey?: string }>)?.detail;
      if (detail?.actionId === actionId && detail?.rowKey === rowKey && detail?.comment) {
        const c = detail.comment as Comment;
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
  }, [actionId, rowKey, fetchComments]);

  const handleContextMenu = (e: React.MouseEvent) => {
    if (!actionId || !ctx) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    ctx.openCommentMenu({ type: "action", actionId, rowKey }, e, rect);
  };

  const handleDeleteComment = async (id: string) => {
    await fetch(`/api/comments?id=${id}`, { method: "DELETE" });
    if (actionId) {
      setComments((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const commentsVisible = ctx?.commentsVisible ?? true;

  return (
    <div
      className={className}
      style={{ position: "relative" }}
      data-commentable={actionId ? "true" : undefined}
      data-action-id={actionId || undefined}
      data-row-key={actionId ? rowKey : undefined}
      onContextMenu={actionId ? handleContextMenu : undefined}
    >
      {children}
      {actionId && commentsVisible && comments.length > 0 && (
        <>
          {comments.map((c, i) => (
            <FloatingCommentIcon
              key={c.id}
              comment={c}
              index={i}
              onDelete={handleDeleteComment}
            />
          ))}
        </>
      )}
    </div>
  );
}
