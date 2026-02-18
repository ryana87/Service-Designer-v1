"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";

type UndoEntry = {
  undo: () => Promise<void>;
  redo: () => Promise<void>;
};

type UndoContextType = {
  undoStack: UndoEntry[];
  redoStack: UndoEntry[];
  pushUndo: (entry: UndoEntry) => void;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  canUndo: boolean;
  canRedo: boolean;
};

const UndoContext = createContext<UndoContextType | null>(null);

const MAX_STACK_SIZE = 50;

export function UndoProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);
  const [redoStack, setRedoStack] = useState<UndoEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const pushUndo = useCallback((entry: UndoEntry) => {
    setRedoStack([]); // Clear redo on new action
    setUndoStack((prev) => [...prev.slice(-(MAX_STACK_SIZE - 1)), entry]);
  }, []);

  const undo = useCallback(async () => {
    if (undoStack.length === 0 || isRunning) return;
    const entry = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, entry]);
    setIsRunning(true);
    try {
      await entry.undo();
      router.refresh();
    } finally {
      setIsRunning(false);
    }
  }, [undoStack, isRunning, router]);

  const redo = useCallback(async () => {
    if (redoStack.length === 0 || isRunning) return;
    const entry = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, entry]);
    setIsRunning(true);
    try {
      await entry.redo();
      router.refresh();
    } finally {
      setIsRunning(false);
    }
  }, [redoStack, isRunning, router]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      const isMac = typeof navigator !== "undefined" && navigator.platform?.toUpperCase().includes("MAC");
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (mod && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  const value: UndoContextType = {
    undoStack,
    redoStack,
    pushUndo,
    undo,
    redo,
    canUndo: undoStack.length > 0 && !isRunning,
    canRedo: redoStack.length > 0 && !isRunning,
  };

  return <UndoContext.Provider value={value}>{children}</UndoContext.Provider>;
}

export function useUndo() {
  return useContext(UndoContext);
}
