"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

export type CommentTarget =
  | { type: "action"; actionId: string; rowKey?: string }
  | { type: "blueprint"; targetType: string; targetId: string };

type MenuState = {
  x: number;
  y: number;
  target: CommentTarget;
  positionX: number;
  positionY: number;
} | null;

type CommentContextValue = {
  commentsVisible: boolean;
  setCommentsVisible: (v: boolean) => void;
  toggleCommentsVisible: () => void;
  menuState: MenuState;
  openCommentMenu: (target: CommentTarget, e: React.MouseEvent, rect: DOMRect) => void;
  closeCommentMenu: () => void;
};

const CommentContext = createContext<CommentContextValue | null>(null);

export function CommentProvider({ children }: { children: React.ReactNode }) {
  const [commentsVisible, setCommentsVisible] = useState(true);
  const [menuState, setMenuState] = useState<MenuState>(null);

  const toggleCommentsVisible = useCallback(() => {
    setCommentsVisible((v) => !v);
  }, []);

  const openCommentMenu = useCallback(
    (target: CommentTarget, e: React.MouseEvent, rect: DOMRect) => {
      e.preventDefault();
      e.stopPropagation();
      const positionX = (e.clientX - rect.left) / rect.width;
      const positionY = (e.clientY - rect.top) / rect.height;
      setMenuState({
        x: e.clientX,
        y: e.clientY,
        target,
        positionX,
        positionY,
      });
    },
    []
  );

  const closeCommentMenu = useCallback(() => setMenuState(null), []);

  return (
    <CommentContext.Provider
      value={{
        commentsVisible,
        setCommentsVisible,
        toggleCommentsVisible,
        menuState,
        openCommentMenu,
        closeCommentMenu,
      }}
    >
      {children}
    </CommentContext.Provider>
  );
}

export function useCommentContext() {
  return useContext(CommentContext);
}
