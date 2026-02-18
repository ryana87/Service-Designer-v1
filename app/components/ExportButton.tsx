"use client";

import { useState } from "react";
import { AppIcon } from "./Icon";
import { ExportModal } from "./ExportModal";

type ExportButtonProps = {
  projectId: string;
  journeyMaps: Array<{ id: string; name: string }>;
  blueprints: Array<{ id: string; name: string }>;
  personas: Array<{ id: string; name: string }>;
  defaultSelectedId?: string;
  defaultSelectedType?: "journeyMap" | "blueprint" | "persona";
  variant?: "primary" | "secondary";
  size?: "sm" | "md";
};

export function ExportButton({
  projectId,
  journeyMaps,
  blueprints,
  personas,
  defaultSelectedId,
  defaultSelectedType,
  variant = "secondary",
  size = "md",
}: ExportButtonProps) {
  const [showModal, setShowModal] = useState(false);

  const buttonClasses =
    variant === "primary"
      ? "bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary-hover)]"
      : "border border-[var(--border-subtle)] bg-[var(--bg-panel)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]";

  const padding = size === "sm" ? "px-2 py-1" : "px-3 py-1.5";

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`flex items-center gap-1.5 rounded-md font-medium transition-colors ${buttonClasses} ${padding}`}
        style={{ fontSize: "var(--font-size-cell)" }}
        title="Export to PDF or PNG"
      >
        <AppIcon name="download" size="xs" />
        <span>Export</span>
      </button>

      {showModal && (
        <ExportModal
          projectId={projectId}
          journeyMaps={journeyMaps}
          blueprints={blueprints}
          personas={personas}
          defaultSelectedId={defaultSelectedId}
          defaultSelectedType={defaultSelectedType}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
