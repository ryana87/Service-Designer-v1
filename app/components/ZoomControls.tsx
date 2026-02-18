"use client";

import { useState, useRef, useEffect } from "react";
import { AppIcon } from "./Icon";

type ZoomControlsProps = {
  zoom: number;
  onZoomChange: (zoom: number) => void;
};

const ZOOM_LEVELS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3];
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;

export function ZoomControls({ zoom, onZoomChange }: ZoomControlsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleZoomIn = () => {
    const currentIndex = ZOOM_LEVELS.findIndex((z) => z >= zoom);
    const nextIndex = Math.min(currentIndex + 1, ZOOM_LEVELS.length - 1);
    onZoomChange(ZOOM_LEVELS[nextIndex]);
  };

  const handleZoomOut = () => {
    const currentIndex = ZOOM_LEVELS.findIndex((z) => z >= zoom);
    const prevIndex = Math.max(currentIndex - 1, 0);
    onZoomChange(ZOOM_LEVELS[prevIndex]);
  };

  const handleZoomReset = () => {
    onZoomChange(1);
    setIsOpen(false);
  };

  const handleZoomToLevel = (level: number) => {
    onZoomChange(level);
    setIsOpen(false);
  };

  const canZoomIn = zoom < MAX_ZOOM;
  const canZoomOut = zoom > MIN_ZOOM;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-3 py-1.5 font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)]"
        style={{ fontSize: "var(--font-size-cell)" }}
        title="Zoom controls"
      >
        <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
          search
        </span>
        <span>{Math.round(zoom * 100)}%</span>
        <AppIcon name="chevronDown" size="xs" />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-1 w-48 bg-[var(--bg-panel)] rounded-lg border border-[var(--border-subtle)] shadow-lg py-2 z-50"
        >
          {/* Quick actions */}
          <div className="px-3 py-2 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2">
              <button
                onClick={handleZoomOut}
                disabled={!canZoomOut}
                className="flex-1 flex items-center justify-center h-8 rounded border border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Zoom out"
              >
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                  remove
                </span>
              </button>
              <button
                onClick={handleZoomReset}
                className="flex-1 h-8 rounded border border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] transition-colors text-[var(--text-secondary)]"
                style={{ fontSize: "12px", fontWeight: 600 }}
                title="Reset to 100%"
              >
                Reset
              </button>
              <button
                onClick={handleZoomIn}
                disabled={!canZoomIn}
                className="flex-1 flex items-center justify-center h-8 rounded border border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Zoom in"
              >
                <AppIcon name="add" size="sm" />
              </button>
            </div>
          </div>

          {/* Preset levels */}
          <div className="py-1">
            {ZOOM_LEVELS.map((level) => (
              <button
                key={level}
                onClick={() => handleZoomToLevel(level)}
                className={`w-full px-4 py-2 text-left transition-colors hover:bg-[var(--bg-hover)] ${
                  Math.abs(zoom - level) < 0.01
                    ? "text-[var(--accent-primary)] font-medium"
                    : "text-[var(--text-secondary)]"
                }`}
                style={{ fontSize: "var(--font-size-cell)" }}
              >
                {Math.round(level * 100)}%
                {Math.abs(zoom - level) < 0.01 && (
                  <AppIcon name="check" size="xs" className="inline-block ml-2" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
