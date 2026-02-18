"use client";

import { useState } from "react";
import { AppIcon } from "./Icon";
import { captureFromUrl } from "../lib/clientExport";

type ExportItem = {
  id: string;
  type: "journeyMap" | "blueprint" | "persona";
  name: string;
  selected: boolean;
};

type ExportFormat = "pdf" | "png" | "jpg";
type ExportMode = "combined" | "separate";

type ExportModalProps = {
  projectId: string;
  journeyMaps: Array<{ id: string; name: string }>;
  blueprints: Array<{ id: string; name: string }>;
  personas: Array<{ id: string; name: string }>;
  defaultSelectedId?: string;
  defaultSelectedType?: "journeyMap" | "blueprint" | "persona";
  onClose: () => void;
};

export function ExportModal({
  projectId,
  journeyMaps,
  blueprints,
  personas,
  defaultSelectedId,
  defaultSelectedType,
  onClose,
}: ExportModalProps) {
  // Initialize items with default selection
  const initializeItems = (): ExportItem[] => {
    const items: ExportItem[] = [];

    journeyMaps.forEach((map) => {
      items.push({
        id: map.id,
        type: "journeyMap",
        name: map.name,
        selected: defaultSelectedId === map.id && defaultSelectedType === "journeyMap",
      });
    });

    blueprints.forEach((bp) => {
      items.push({
        id: bp.id,
        type: "blueprint",
        name: bp.name,
        selected: defaultSelectedId === bp.id && defaultSelectedType === "blueprint",
      });
    });

    personas.forEach((p) => {
      items.push({
        id: p.id,
        type: "persona",
        name: p.name,
        selected: defaultSelectedId === p.id && defaultSelectedType === "persona",
      });
    });

    return items;
  };

  const [items, setItems] = useState<ExportItem[]>(initializeItems());
  const [format, setFormat] = useState<ExportFormat>("pdf");
  const [mode, setMode] = useState<ExportMode>("separate");
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCount = items.filter((item) => item.selected).length;

  const toggleItem = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const toggleAll = () => {
    const allSelected = items.every((item) => item.selected);
    setItems((prev) =>
      prev.map((item) => ({ ...item, selected: !allSelected }))
    );
  };

  const handleExport = async () => {
    if (selectedCount === 0) {
      setError("Please select at least one item to export");
      return;
    }

    setIsExporting(true);
    setError(null);

    try {
      const selectedItems = items.filter((item) => item.selected);
      const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

      const exports: Array<{ name: string; blob: Blob }> = [];

      for (const item of selectedItems) {
        let url = `${baseUrl}/projects/${projectId}`;
        if (item.type === "journeyMap") {
          url += `/journey-maps/${item.id}?export=1`;
        } else if (item.type === "blueprint") {
          url += `/blueprints/${item.id}?export=1`;
        } else {
          continue; // Skip personas for now
        }

        const blob = await captureFromUrl(url, format);
        const ext = format === "pdf" ? "pdf" : format === "jpg" ? "jpg" : "png";
        const sanitizedName = item.name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
        exports.push({ name: `${sanitizedName}.${ext}`, blob });
      }

      if (exports.length === 1) {
        const a = document.createElement("a");
        a.href = window.URL.createObjectURL(exports[0].blob);
        a.download = exports[0].name;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(a.href);
        document.body.removeChild(a);
      } else if (exports.length > 1) {
        const { default: JSZip } = await import("jszip");
        const zip = new JSZip();
        for (const exp of exports) {
          zip.file(exp.name, exp.blob);
        }
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const a = document.createElement("a");
        a.href = window.URL.createObjectURL(zipBlob);
        a.download = `export-${Date.now()}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(a.href);
        document.body.removeChild(a);
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export. Please try again.");
      console.error("Export error:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const getItemIcon = (type: ExportItem["type"]) => {
    switch (type) {
      case "journeyMap":
        return "journeyMap";
      case "blueprint":
        return "blueprint";
      case "persona":
        return "person";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className="bg-[var(--bg-panel)] rounded-lg shadow-lg w-full max-w-2xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-6 py-4">
          <h2
            className="font-semibold text-[var(--text-primary)]"
            style={{ fontSize: "18px" }}
          >
            Export Project Assets
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <AppIcon name="close" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto px-6 py-4">
          {/* Selection List */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <label
                className="font-medium text-[var(--text-primary)]"
                style={{ fontSize: "var(--font-size-action)" }}
              >
                Select items to export
              </label>
              <button
                onClick={toggleAll}
                className="text-[var(--accent-primary)] hover:underline"
                style={{ fontSize: "var(--font-size-meta)" }}
              >
                {items.every((item) => item.selected) ? "Deselect all" : "Select all"}
              </button>
            </div>

            <div className="space-y-1 border border-[var(--border-subtle)] rounded-lg overflow-hidden">
              {items.length === 0 ? (
                <div className="p-4 text-center text-[var(--text-muted)]">
                  No items to export
                </div>
              ) : (
                items.map((item) => (
                  <label
                    key={item.id}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                      item.selected
                        ? "bg-[var(--accent-primary)]/10"
                        : "hover:bg-[var(--bg-hover)]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={() => toggleItem(item.id)}
                      className="w-4 h-4 rounded border-[var(--border-subtle)]"
                    />
                    <AppIcon
                      name={getItemIcon(item.type)}
                      size="sm"
                      className="text-[var(--text-muted)]"
                    />
                    <span
                      className="flex-1 text-[var(--text-primary)]"
                      style={{ fontSize: "var(--font-size-cell)" }}
                    >
                      {item.name}
                    </span>
                    <span
                      className="text-[var(--text-muted)] capitalize"
                      style={{ fontSize: "var(--font-size-meta)" }}
                    >
                      {item.type === "journeyMap"
                        ? "Journey Map"
                        : item.type === "blueprint"
                        ? "Blueprint"
                        : "Persona"}
                    </span>
                  </label>
                ))
              )}
            </div>

            {selectedCount > 0 && (
              <p
                className="mt-2 text-[var(--text-muted)]"
                style={{ fontSize: "var(--font-size-meta)" }}
              >
                {selectedCount} item{selectedCount !== 1 ? "s" : ""} selected
              </p>
            )}
          </div>

          {/* Format Selection */}
          <div className="mb-6">
            <label
              className="block mb-2 font-medium text-[var(--text-primary)]"
              style={{ fontSize: "var(--font-size-action)" }}
            >
              Export format
            </label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  value="pdf"
                  checked={format === "pdf"}
                  onChange={(e) => setFormat(e.target.value as ExportFormat)}
                  className="w-4 h-4"
                />
                <span
                  className="text-[var(--text-primary)]"
                  style={{ fontSize: "var(--font-size-cell)" }}
                >
                  PDF
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  value="png"
                  checked={format === "png"}
                  onChange={(e) => setFormat(e.target.value as ExportFormat)}
                  className="w-4 h-4"
                />
                <span
                  className="text-[var(--text-primary)]"
                  style={{ fontSize: "var(--font-size-cell)" }}
                >
                  PNG (recommended)
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  value="jpg"
                  checked={format === "jpg"}
                  onChange={(e) => setFormat(e.target.value as ExportFormat)}
                  className="w-4 h-4"
                />
                <span
                  className="text-[var(--text-primary)]"
                  style={{ fontSize: "var(--font-size-cell)" }}
                >
                  JPG
                </span>
              </label>
            </div>
          </div>

          {/* Mode Selection (only if multiple items selected and PDF format) */}
          {selectedCount > 1 && format === "pdf" && (
            <div className="mb-4">
              <label
                className="block mb-2 font-medium text-[var(--text-primary)]"
                style={{ fontSize: "var(--font-size-action)" }}
              >
                Export mode
              </label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="mode"
                    value="combined"
                    checked={mode === "combined"}
                    onChange={(e) => setMode(e.target.value as ExportMode)}
                    className="w-4 h-4"
                  />
                  <span
                    className="text-[var(--text-primary)]"
                    style={{ fontSize: "var(--font-size-cell)" }}
                  >
                    Combined PDF
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="mode"
                    value="separate"
                    checked={mode === "separate"}
                    onChange={(e) => setMode(e.target.value as ExportMode)}
                    className="w-4 h-4"
                  />
                  <span
                    className="text-[var(--text-primary)]"
                    style={{ fontSize: "var(--font-size-cell)" }}
                  >
                    Separate files (ZIP)
                  </span>
                </label>
              </div>
            </div>
          )}
          {selectedCount > 1 && format !== "pdf" && (
            <p
              className="mb-4 text-[var(--text-muted)]"
              style={{ fontSize: "var(--font-size-meta)" }}
            >
              Multiple {format.toUpperCase()} files will be packaged in a ZIP archive
            </p>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 rounded-md bg-red-50 border border-red-200">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-[var(--border-subtle)] px-6 py-4">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 rounded-md border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ fontSize: "var(--font-size-cell)" }}
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || selectedCount === 0}
            className="px-4 py-2 rounded-md bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            style={{ fontSize: "var(--font-size-cell)" }}
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <AppIcon name="download" size="xs" />
                Export {selectedCount > 0 ? `(${selectedCount})` : ""}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
