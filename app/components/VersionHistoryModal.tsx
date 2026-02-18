"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppIcon } from "./Icon";
import {
  createSnapshotFromJourneyMap,
  createSnapshotFromBlueprint,
  getSnapshots,
  deleteSnapshot,
} from "../projects/[projectId]/versions/actions";

type VersionHistoryModalProps = {
  projectId: string;
  journeyMaps: Array<{ id: string; name: string }>;
  blueprints: Array<{ id: string; name: string }>;
  onClose: () => void;
};

type Snapshot = {
  id: string;
  name: string;
  snapshotType: string;
  snapshotId: string;
  createdAt: Date;
};

export function VersionHistoryModal({
  projectId,
  journeyMaps,
  blueprints,
  onClose,
}: VersionHistoryModalProps) {
  const router = useRouter();
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createType, setCreateType] = useState<"journeyMap" | "blueprint">("journeyMap");
  const [createId, setCreateId] = useState("");

  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    getSnapshots(projectId).then((result) => {
      if (Array.isArray(result)) {
        setSnapshots(result);
        setLoadError(null);
      } else {
        setSnapshots([]);
        setLoadError(result.error);
      }
    });
  }, [projectId]);

  const handleCreate = async () => {
    if (!createName.trim() || !createId) return;
    const res =
      createType === "journeyMap"
        ? await createSnapshotFromJourneyMap(projectId, createId, createName.trim())
        : await createSnapshotFromBlueprint(projectId, createId, createName.trim());
    if (!res.ok) {
      alert(res.error);
      return;
    }
    setCreateName("");
    setCreateId("");
    setIsCreating(false);
    const updated = await getSnapshots(projectId);
    if (Array.isArray(updated)) setSnapshots(updated);
    router.refresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this snapshot?")) return;
    const res = await deleteSnapshot(id);
    if (!res.ok) {
      alert(res.error);
      return;
    }
    setSnapshots((prev) => prev.filter((s) => s.id !== id));
    router.refresh();
  };

  const formatDate = (d: Date) =>
    new Date(d).toLocaleString(undefined, {
      dateStyle: "short",
      timeStyle: "short",
    });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-lg rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3">
          <h2 className="font-medium text-[var(--text-primary)]">Version History</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
          >
            <AppIcon name="close" size="sm" />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
          {!isCreating ? (
            <button
              onClick={() => setIsCreating(true)}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-[var(--border-subtle)] py-3 text-[var(--text-secondary)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
            >
              <AppIcon name="add" size="sm" />
              Create snapshot
            </button>
          ) : (
            <div className="space-y-3 rounded-md border border-[var(--border-subtle)] p-3">
              <input
                type="text"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Snapshot name (e.g. Before redesign)"
                className="w-full rounded border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] px-3 py-2 text-[var(--text-primary)] outline-none"
              />
              <select
                value={createType}
                onChange={(e) => {
                  setCreateType(e.target.value as "journeyMap" | "blueprint");
                  setCreateId("");
                }}
                className="w-full rounded border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] px-3 py-2 text-[var(--text-primary)]"
              >
                <option value="journeyMap">Journey Map</option>
                <option value="blueprint">Service Blueprint</option>
              </select>
              <select
                value={createId}
                onChange={(e) => setCreateId(e.target.value)}
                className="w-full rounded border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] px-3 py-2 text-[var(--text-primary)]"
              >
                <option value="">Select...</option>
                {(createType === "journeyMap" ? journeyMaps : blueprints).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setCreateName("");
                    setCreateId("");
                  }}
                  className="rounded border border-[var(--border-subtle)] px-3 py-1.5 text-sm text-[var(--text-secondary)]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!createName.trim() || !createId}
                  className="rounded bg-[var(--accent-primary)] px-3 py-1.5 text-sm text-white disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </div>
          )}

          <div>
            <h3 className="mb-2 text-sm font-medium text-[var(--text-secondary)]">Snapshots</h3>
            {loadError && (
              <p className="mb-2 text-sm text-red-500">{loadError}</p>
            )}
            <div className="space-y-1">
              {snapshots.length === 0 && !loadError ? (
                <p className="py-4 text-center text-sm text-[var(--text-muted)]">
                  No snapshots yet
                </p>
              ) : (
                snapshots.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-md bg-[var(--bg-sidebar)] px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">{s.name}</p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {s.snapshotType === "journeyMap" ? "Journey Map" : "Blueprint"} •{" "}
                        {formatDate(s.createdAt)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="rounded p-1 text-[var(--text-muted)] hover:bg-red-500/20 hover:text-red-500"
                      title="Delete"
                    >
                      <AppIcon name="delete" size="xs" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
