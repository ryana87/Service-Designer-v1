"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppIcon } from "../components/Icon";
import { createProject, deleteProject } from "./actions";

type Project = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  journeyMapCount: number;
  blueprintCount: number;
};

type SortField = "updatedAt" | "createdAt" | "name";
type FilterType = "all" | "hasJourneyMaps" | "hasBlueprints";

export default function ProjectsPageContent({ projects }: { projects: Project[] }) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("updatedAt");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");

  // Filter and sort projects
  const filteredProjects = useMemo(() => {
    let result = [...projects];

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query)
      );
    }

    // Filter by type
    if (filterType === "hasJourneyMaps") {
      result = result.filter((p) => p.journeyMapCount > 0);
    } else if (filterType === "hasBlueprints") {
      result = result.filter((p) => p.blueprintCount > 0);
    }

    // Sort
    result.sort((a, b) => {
      if (sortField === "name") {
        return a.name.localeCompare(b.name);
      } else if (sortField === "createdAt") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });

    return result;
  }, [projects, searchQuery, sortField, filterType]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    const formData = new FormData();
    formData.append("name", newProjectName.trim());
    formData.append("description", newProjectDescription.trim());

    await createProject(formData);
    setNewProjectName("");
    setNewProjectDescription("");
    setIsCreating(false);
    router.refresh();
  };

  const handleDeleteProject = async (project: Project, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm(`Delete "${project.name}"? This cannot be undone.`)) {
      await deleteProject(project.id);
      router.refresh();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return "Today";
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      });
    }
  };

  return (
    <div className="flex h-full flex-col bg-[var(--bg-panel)]">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-panel)] px-6">
        <div className="flex items-center gap-3">
          <h1
            className="font-semibold text-[var(--text-primary)]"
            style={{ fontSize: "18px" }}
          >
            All Projects
          </h1>
          <span
            className="rounded-full bg-[var(--bg-sidebar)] px-2 py-0.5 text-[var(--text-muted)]"
            style={{ fontSize: "var(--font-size-meta)" }}
          >
            {projects.length}
          </span>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 rounded-md bg-[var(--accent-primary)] px-4 py-2 font-medium text-white transition-colors hover:bg-[var(--accent-primary-hover)]"
          style={{ fontSize: "var(--font-size-cell)" }}
        >
          <AppIcon name="add" size="xs" />
          <span>New Project</span>
        </button>
      </header>

      {/* Search and filters */}
      <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-panel)] px-6 py-3">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <div className="flex items-center gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] px-3 py-2">
              <AppIcon name="search" size="xs" className="text-[var(--text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects..."
                className="flex-1 bg-transparent text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                style={{ fontSize: "var(--font-size-cell)" }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                >
                  <AppIcon name="close" size="xs" />
                </button>
              )}
            </div>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <span
              className="text-[var(--text-muted)]"
              style={{ fontSize: "var(--font-size-meta)" }}
            >
              Sort by:
            </span>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] px-2 py-1 text-[var(--text-primary)] outline-none"
              style={{ fontSize: "var(--font-size-cell)" }}
            >
              <option value="updatedAt">Updated</option>
              <option value="createdAt">Created</option>
              <option value="name">Name</option>
            </select>
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2">
            <span
              className="text-[var(--text-muted)]"
              style={{ fontSize: "var(--font-size-meta)" }}
            >
              Filter:
            </span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as FilterType)}
              className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] px-2 py-1 text-[var(--text-primary)] outline-none"
              style={{ fontSize: "var(--font-size-cell)" }}
            >
              <option value="all">All projects</option>
              <option value="hasJourneyMaps">Has Journey Maps</option>
              <option value="hasBlueprints">Has Blueprints</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-4xl">
          {/* Create Project Modal */}
          {isCreating && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="w-full max-w-md rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-6 shadow-xl">
                <div className="mb-4 flex items-center justify-between">
                  <h2
                    className="font-semibold text-[var(--text-primary)]"
                    style={{ fontSize: "var(--font-size-action)" }}
                  >
                    Create New Project
                  </h2>
                  <button
                    onClick={() => setIsCreating(false)}
                    className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                  >
                    <AppIcon name="close" size="sm" />
                  </button>
                </div>
                <form onSubmit={handleCreateProject} className="space-y-4">
                  <div>
                    <label
                      htmlFor="name"
                      className="mb-1 block font-medium text-[var(--text-muted)]"
                      style={{ fontSize: "var(--font-size-meta)" }}
                    >
                      Name <span className="text-[var(--emotion-1)]">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      required
                      autoFocus
                      className="w-full rounded border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none"
                      style={{ fontSize: "var(--font-size-cell)" }}
                      placeholder="Enter project name"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="description"
                      className="mb-1 block font-medium text-[var(--text-muted)]"
                      style={{ fontSize: "var(--font-size-meta)" }}
                    >
                      Description
                    </label>
                    <textarea
                      id="description"
                      value={newProjectDescription}
                      onChange={(e) => setNewProjectDescription(e.target.value)}
                      rows={3}
                      className="w-full rounded border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none"
                      style={{ fontSize: "var(--font-size-cell)" }}
                      placeholder="Optional project description"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsCreating(false)}
                      className="rounded-md border border-[var(--border-subtle)] px-4 py-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)]"
                      style={{ fontSize: "var(--font-size-cell)" }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-md bg-[var(--accent-primary)] px-4 py-2 font-medium text-white transition-colors hover:bg-[var(--accent-primary-hover)]"
                      style={{ fontSize: "var(--font-size-cell)" }}
                    >
                      Create Project
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Projects List */}
          {filteredProjects.length > 0 ? (
            <div className="space-y-3">
              {filteredProjects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="group flex items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-4 transition-colors hover:border-[var(--accent-primary)] hover:bg-[var(--bg-hover)]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <AppIcon
                        name="folder"
                        size="sm"
                        className="text-[var(--text-muted)] group-hover:text-[var(--accent-primary)]"
                      />
                      <span
                        className="font-semibold text-[var(--text-primary)]"
                        style={{ fontSize: "var(--font-size-action)" }}
                      >
                        {project.name}
                      </span>
                    </div>
                    {project.description && (
                      <p
                        className="mt-1 truncate pl-6 text-[var(--text-muted)]"
                        style={{ fontSize: "var(--font-size-cell)" }}
                      >
                        {project.description}
                      </p>
                    )}
                    <div
                      className="mt-2 flex items-center gap-4 pl-6 text-[var(--text-muted)]"
                      style={{ fontSize: "var(--font-size-meta)" }}
                    >
                      <span className="flex items-center gap-1">
                        <AppIcon name="journeyMap" size="xs" />
                        {project.journeyMapCount} map{project.journeyMapCount !== 1 ? "s" : ""}
                      </span>
                      <span className="flex items-center gap-1">
                        <AppIcon name="blueprint" size="xs" />
                        {project.blueprintCount} blueprint{project.blueprintCount !== 1 ? "s" : ""}
                      </span>
                      <span className="text-[var(--border-subtle)]">•</span>
                      <span>Created {formatDate(project.createdAt)}</span>
                      <span className="text-[var(--border-subtle)]">•</span>
                      <span>Updated {formatDate(project.updatedAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleDeleteProject(project, e)}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-muted)] opacity-0 transition-all hover:bg-[var(--emotion-1-tint)] hover:text-[var(--emotion-1)] group-hover:opacity-100"
                      title="Delete project"
                    >
                      <AppIcon name="delete" size="sm" />
                    </button>
                    <AppIcon
                      name="chevronRight"
                      size="sm"
                      className="text-[var(--text-muted)] group-hover:text-[var(--accent-primary)]"
                    />
                  </div>
                </Link>
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--border-subtle)] bg-[var(--bg-sidebar)] py-16">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--bg-panel)]">
                <AppIcon name="folder" className="text-[var(--text-muted)]" />
              </div>
              <h3
                className="mb-1 font-medium text-[var(--text-primary)]"
                style={{ fontSize: "var(--font-size-action)" }}
              >
                No projects yet
              </h3>
              <p
                className="mb-4 text-[var(--text-muted)]"
                style={{ fontSize: "var(--font-size-cell)" }}
              >
                Create your first project to get started
              </p>
              <button
                onClick={() => setIsCreating(true)}
                className="flex items-center gap-2 rounded-md bg-[var(--accent-primary)] px-4 py-2 font-medium text-white transition-colors hover:bg-[var(--accent-primary-hover)]"
                style={{ fontSize: "var(--font-size-cell)" }}
              >
                <AppIcon name="add" size="xs" />
                <span>New Project</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--border-subtle)] bg-[var(--bg-sidebar)] py-16">
              <AppIcon name="search" className="mb-4 text-[var(--text-muted)]" />
              <h3
                className="mb-1 font-medium text-[var(--text-primary)]"
                style={{ fontSize: "var(--font-size-action)" }}
              >
                No projects found
              </h3>
              <p
                className="text-[var(--text-muted)]"
                style={{ fontSize: "var(--font-size-cell)" }}
              >
                Try adjusting your search or filters
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
