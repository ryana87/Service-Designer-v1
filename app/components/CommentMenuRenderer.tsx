"use client";

import React from "react";
import { useCommentContext } from "../contexts/CommentContext";
import { CommentContextMenu } from "./CommentContextMenu";
import { useRouter } from "next/navigation";

export function CommentMenuRenderer() {
  const ctx = useCommentContext();
  const router = useRouter();

  if (!ctx?.menuState) return null;

  const { menuState, closeCommentMenu } = ctx;

  const handleAddComment = async (
    content: string,
    positionX: number,
    positionY: number
  ) => {
    const { target } = menuState;
    const body: Record<string, unknown> = {
      content,
      positionX,
      positionY,
    };
    if (target.type === "action") {
      body.actionId = target.actionId;
      if (target.rowKey) body.rowKey = target.rowKey;
    } else {
      body.targetType = target.targetType;
      body.targetId = target.targetId;
    }
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const newComment = await res.json();
      router.refresh();
      window.dispatchEvent(
        new CustomEvent("comments-updated", {
          detail: { comment: newComment, actionId: target.type === "action" ? target.actionId : null, rowKey: target.type === "action" ? target.rowKey : null },
        })
      );
    }
  };

  return (
    <CommentContextMenu
      x={menuState.x}
      y={menuState.y}
      target={menuState.target}
      positionX={menuState.positionX}
      positionY={menuState.positionY}
      onAddComment={handleAddComment}
      onClose={closeCommentMenu}
    />
  );
}
