"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

type SelectModeContextType = {
  isSelectMode: boolean;
  setSelectMode: (v: boolean) => void;
  selectedIds: Set<string>;
  toggleSelect: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;
};

const SelectModeContext = createContext<SelectModeContextType | null>(null);

export function SelectModeProvider({ children }: { children: React.ReactNode }) {
  const [isSelectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);

  return (
    <SelectModeContext.Provider
      value={{
        isSelectMode,
        setSelectMode,
        selectedIds,
        toggleSelect,
        selectAll,
        clearSelection,
        isSelected,
      }}
    >
      {children}
    </SelectModeContext.Provider>
  );
}

export function useSelectMode() {
  return useContext(SelectModeContext);
}
