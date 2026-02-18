"use client";

import React, { useState } from "react";
import { AppIcon } from "./Icon";
import { CompletenessModal } from "./CompletenessModal";

export function CompletenessButton({
  artifactType,
  data,
}: {
  artifactType: "journeyMap" | "blueprint";
  data: unknown;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-2.5 py-1.5 font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)]"
        style={{ fontSize: "var(--font-size-cell)" }}
        title="Completeness checklist"
      >
        <AppIcon name="check_circle" size="xs" />
        <span>Completeness</span>
      </button>

      {open && (
        <CompletenessModal
          artifactType={artifactType}
          data={data}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

