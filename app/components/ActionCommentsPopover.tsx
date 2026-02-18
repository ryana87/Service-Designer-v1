"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { AppIcon } from "./Icon";

type Comment = {
  id: string;
  content: string;
  author: string | null;
  createdAt: string;
};

type ActionCommentsPopoverProps = {
  actionId: string;
  actionTitle: string;
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
};

export function ActionCommentsPopover({
  actionId,
  actionTitle,
  anchorRef,
  onClose,
}: ActionCommentsPopoverProps) {
  const router = useRouter();
  const popoverRef = useRef<HTMLDivElement>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/comments?actionId=${actionId}`)
      .then((r) => r.json())
      .then(setComments)
      .finally(() => setIsLoading(false));
  }, [actionId]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose, anchorRef]);

  const handleAdd = async () => {
    if (!newComment.trim()) return;
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newComment.trim(), actionId }),
    });
    if (res.ok) {
      const comment = await res.json();
      setComments((prev) => [...prev, comment]);
      setNewComment("");
      router.refresh();
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/comments?id=${id}`, { method: "DELETE" });
    setComments((prev) => prev.filter((c) => c.id !== id));
    router.refresh();
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });

  const [position, setPosition] = useState({ top: 0, left: 0 });
  useEffect(() => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPosition({ top: rect.bottom + 4, left: rect.left });
    }
  }, [anchorRef]);

  return (
    <div
      ref={popoverRef}
      className="fixed z-[100] w-72 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] shadow-lg"
      style={{ top: position.top, left: position.left }}
    >
      <div className="border-b border-[var(--border-subtle)] px-3 py-2">
        <p className="text-xs font-medium text-[var(--text-secondary)]">
          Comments: {actionTitle}
        </p>
      </div>
      <div className="max-h-48 overflow-y-auto p-2 space-y-2">
        {isLoading ? (
          <p className="text-xs text-[var(--text-muted)]">Loading...</p>
        ) : comments.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)]">No comments yet</p>
        ) : (
          comments.map((c) => (
            <div
              key={c.id}
              className="group rounded bg-[var(--bg-sidebar)] p-2 text-sm"
            >
              <p className="text-[var(--text-primary)]">{c.content}</p>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-xs text-[var(--text-muted)]">
                  {formatDate(c.createdAt)}
                </span>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="opacity-0 group-hover:opacity-100 rounded p-0.5 text-[var(--text-muted)] hover:text-red-500"
                >
                  <AppIcon name="delete" size="xs" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="border-t border-[var(--border-subtle)] p-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Add a comment..."
            className="flex-1 rounded border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] px-2 py-1.5 text-sm text-[var(--text-primary)] outline-none"
          />
          <button
            onClick={handleAdd}
            disabled={!newComment.trim()}
            className="rounded bg-[var(--accent-primary)] px-2 py-1.5 text-sm text-white disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
