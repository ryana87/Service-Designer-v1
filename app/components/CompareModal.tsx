"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AppIcon } from "./Icon";

type ArtefactItem = { id: string; name: string };

type CompareModalProps = {
  projectId: string;
  journeyMaps: ArtefactItem[];
  blueprints: ArtefactItem[];
  onClose: () => void;
};

export function CompareModal({
  projectId,
  journeyMaps,
  blueprints,
  onClose,
}: CompareModalProps) {
  const router = useRouter();
  const [left, setLeft] = useState<{ id: string; name: string; type: "journeyMap" | "blueprint" } | null>(null);
  const [right, setRight] = useState<{ id: string; name: string; type: "journeyMap" | "blueprint" } | null>(null);

  const category = left?.type ?? null;
  const journeyMapsDisabled = category === "blueprint";
  const blueprintsDisabled = category === "journeyMap";

  const canCompare = left && right && left.type === right.type;

  const handleSelect = (item: ArtefactItem, type: "journeyMap" | "blueprint") => {
    const entry = { id: item.id, name: item.name, type };
    if (!left) {
      setLeft(entry);
      setRight(null);
    } else if (left.type !== type) return; // Wrong category locked
    else if (left.id === item.id) {
      setLeft(right);
      setRight(null);
    } else if (right?.id === item.id) {
      setRight(null);
    } else if (!right) {
      setRight(entry);
    } else {
      setLeft(right);
      setRight(entry);
    }
  };

  const handleCompare = () => {
    if (!canCompare) return;
    router.push(
      `/projects/${projectId}/compare?type=${left!.type}&left=${left!.id}&right=${right!.id}`
    );
    onClose();
  };

  const isSelected = (id: string, slot: "left" | "right") => {
    if (slot === "left") return left?.id === id;
    return right?.id === id;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-md rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3">
          <h2 className="font-medium text-[var(--text-primary)]">Compare</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
          >
            <AppIcon name="close" size="sm" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
          <p className="text-sm text-[var(--text-muted)]">
            Select two items from the same category to compare side by side.
          </p>

          {/* Journey Maps */}
          <div>
            <h3
              className={`mb-2 text-sm font-medium ${
                journeyMapsDisabled ? "text-[var(--text-muted)] opacity-60" : "text-[var(--text-secondary)]"
              }`}
            >
              Journey Maps
            </h3>
            <div className="space-y-1">
              {journeyMaps.map((item) => (
                <button
                  key={item.id}
                  disabled={journeyMapsDisabled}
                  onClick={() => handleSelect(item, "journeyMap")}
                  className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left transition-colors ${
                    journeyMapsDisabled
                      ? "cursor-not-allowed opacity-50"
                      : isSelected(item.id, "left") || isSelected(item.id, "right")
                        ? "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]"
                        : "hover:bg-[var(--bg-hover)] text-[var(--text-primary)]"
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      isSelected(item.id, "left") || isSelected(item.id, "right")
                        ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]"
                        : "border-[var(--border-subtle)]"
                    }`}
                  >
                    {(isSelected(item.id, "left") || isSelected(item.id, "right")) && (
                      <AppIcon name="check" size="xs" className="text-white" />
                    )}
                  </span>
                  <span className="truncate">{item.name}</span>
                  {isSelected(item.id, "left") && (
                    <span className="ml-auto text-xs text-[var(--text-muted)]">Left</span>
                  )}
                  {isSelected(item.id, "right") && (
                    <span className="ml-auto text-xs text-[var(--text-muted)]">Right</span>
                  )}
                </button>
              ))}
              {journeyMaps.length < 2 && (
                <p className="px-3 py-2 text-xs text-[var(--text-muted)]">
                  Need at least 2 journey maps to compare
                </p>
              )}
            </div>
          </div>

          {/* Service Blueprints */}
          <div>
            <h3
              className={`mb-2 text-sm font-medium ${
                blueprintsDisabled ? "text-[var(--text-muted)] opacity-60" : "text-[var(--text-secondary)]"
              }`}
            >
              Service Blueprints
            </h3>
            <div className="space-y-1">
              {blueprints.map((item) => (
                <button
                  key={item.id}
                  disabled={blueprintsDisabled}
                  onClick={() => handleSelect(item, "blueprint")}
                  className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left transition-colors ${
                    blueprintsDisabled
                      ? "cursor-not-allowed opacity-50"
                      : isSelected(item.id, "left") || isSelected(item.id, "right")
                        ? "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]"
                        : "hover:bg-[var(--bg-hover)] text-[var(--text-primary)]"
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      isSelected(item.id, "left") || isSelected(item.id, "right")
                        ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]"
                        : "border-[var(--border-subtle)]"
                    }`}
                  >
                    {(isSelected(item.id, "left") || isSelected(item.id, "right")) && (
                      <AppIcon name="check" size="xs" className="text-white" />
                    )}
                  </span>
                  <span className="truncate">{item.name}</span>
                  {isSelected(item.id, "left") && (
                    <span className="ml-auto text-xs text-[var(--text-muted)]">Left</span>
                  )}
                  {isSelected(item.id, "right") && (
                    <span className="ml-auto text-xs text-[var(--text-muted)]">Right</span>
                  )}
                </button>
              ))}
              {blueprints.length < 2 && (
                <p className="px-3 py-2 text-xs text-[var(--text-muted)]">
                  Need at least 2 blueprints to compare
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[var(--border-subtle)] px-4 py-3">
          <button
            onClick={onClose}
            className="rounded-md border border-[var(--border-subtle)] px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
          >
            Cancel
          </button>
          <button
            onClick={handleCompare}
            disabled={!canCompare}
            className="flex items-center gap-2 rounded-md bg-[var(--accent-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <AppIcon name="compare" size="xs" />
            Compare
          </button>
        </div>
      </div>
    </div>
  );
}
