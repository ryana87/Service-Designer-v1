"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AppIcon } from "./Icon";
import {
  createJourneyMapInProject,
  renameJourneyMap,
  deleteJourneyMap,
  duplicateJourneyMap,
  moveJourneyMapUp,
  moveJourneyMapDown,
  searchProjectContent,
  type SearchResult,
} from "../projects/[projectId]/actions";
import {
  createBlueprint,
  renameBlueprint,
  deleteBlueprint,
  duplicateBlueprint,
  moveBlueprintUp,
  moveBlueprintDown,
} from "../projects/[projectId]/blueprints/actions";
import { useDemoOptional, DEMO_PROJECT_ID } from "../demo/DemoContext";
import { UI_COPY, ScriptedPrompt } from "../demo/demoChatData";
import { DEMO_ASSETS } from "../demo/assets";
import { useTheme } from "../contexts/ThemeContext";
import { useOptionalProjectCache } from "../projects/[projectId]/ProjectCacheContext";
import {
  DEMO_CHAT_ALLOWED_TEMPLATE_ID,
  getScriptedResponse,
  ARCHETYPE_OPTIONS,
  SUGGESTED_CHIPS,
  type PersonaChatArchetype,
} from "../lib/persona-chat-scripted";
import { CompareModal } from "./CompareModal";
import { logout } from "../login/actions";

export type AppShellUser = {
  userId: string;
  userDisplayName: string;
};

// ============================================
// APP SHELL - Full-screen application layout
// ============================================

type AppShellProps = {
  children: React.ReactNode;
  projectSidebar?: React.ReactNode;
  showAiSidebar?: boolean;
  user?: AppShellUser | null;
};

export function AppShell({
  children,
  projectSidebar,
  showAiSidebar = true,
  user = null,
}: AppShellProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isNavExpanded, setIsNavExpanded] = useState(false);

  return (
    <>
      <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg-app)]">
        {/* Far-left navigation rail (sits directly on background, full height) */}
        <NavRail 
          hasProjectSidebar={!!projectSidebar}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          isExpanded={isNavExpanded}
          onToggleExpand={() => setIsNavExpanded(!isNavExpanded)}
          user={user ?? undefined}
        />

        {/* Content area with panels - sits to the right of nav rail */}
        <div className="flex flex-1 h-full overflow-hidden" style={{ paddingLeft: "var(--panel-gap)" }}>
          {/* Project assets sidebar (optional, collapsible, rounded panel - all 4 corners) */}
          {projectSidebar && !isSidebarCollapsed && (
            <aside
              className="flex flex-col bg-[var(--bg-sidebar)] transition-all duration-300 ease-in-out"
              style={{ 
                width: "var(--sidebar-assets-width)",
                marginTop: "var(--panel-gap)",
                marginBottom: "var(--panel-gap)",
                marginRight: "var(--panel-gap)",
                borderRadius: "var(--panel-radius)",
                boxShadow: "var(--panel-shadow)"
              }}
            >
              <ProjectSidebarWrapper onCollapse={() => setIsSidebarCollapsed(true)}>
                {projectSidebar}
              </ProjectSidebarWrapper>
            </aside>
          )}

          {/* Main content area (rounded panel with gap, explicit background) */}
          <main 
            className="relative flex-1 overflow-hidden transition-all duration-300 ease-in-out"
            style={{
              backgroundColor: "var(--bg-panel)",
              marginTop: "var(--panel-gap)",
              marginBottom: "var(--panel-gap)",
              marginLeft: isSidebarCollapsed ? 0 : 0,
              marginRight: isAiOpen ? "var(--panel-gap)" : "var(--panel-gap)",
              borderRadius: "var(--panel-radius)",
              boxShadow: "var(--panel-shadow)"
            }}
          >
            {children}
          </main>

          {/* AI assistant sidebar (collapsible from right, rounded panel - all 4 corners) */}
          {showAiSidebar && isAiOpen && (
            <aside
              className="flex flex-col overflow-hidden bg-[var(--bg-panel)] transition-all duration-300 ease-in-out"
              style={{ 
                width: "var(--sidebar-ai-width)",
                marginTop: "var(--panel-gap)",
                marginBottom: "var(--panel-gap)",
                marginRight: "var(--panel-gap)",
                borderRadius: "var(--panel-radius)",
                boxShadow: "var(--panel-shadow)"
              }}
            >
              <AiSidebar onClose={() => setIsAiOpen(false)} />
            </aside>
          )}
        </div>
      </div>
      
      {/* AI Floating button - rendered as portal-like element outside main flex container */}
      {showAiSidebar && !isAiOpen && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 9999,
          }}
        >
          <button
            onClick={() => setIsAiOpen(true)}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent-primary)] text-white shadow-lg transition-all hover:scale-110 hover:bg-[var(--accent-primary-hover)]"
            style={{ boxShadow: "0 4px 24px rgba(59, 130, 246, 0.5)" }}
            title="Open AI Assistant"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "26px" }}>
              auto_awesome
            </span>
          </button>
        </div>
      )}
    </>
  );
}

// ============================================
// PROJECT SIDEBAR WRAPPER (adds collapse button)
// ============================================

function ProjectSidebarWrapper({
  children,
  onCollapse,
}: {
  children: React.ReactNode;
  onCollapse: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      {/* Collapse button row */}
      <div className="flex h-10 items-center justify-end border-b border-[var(--border-muted)] px-2">
        <button
          onClick={onCollapse}
          className="flex h-6 w-6 items-center justify-center rounded text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
          title="Collapse sidebar"
        >
          <AppIcon name="chevronLeft" size="sm" />
        </button>
      </div>
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}

// ============================================
// NAV RAIL (far-left)
// ============================================

function NavRail({
  hasProjectSidebar,
  isSidebarCollapsed,
  onToggleSidebar,
  isExpanded,
  onToggleExpand,
  user,
}: {
  hasProjectSidebar: boolean;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  user?: AppShellUser;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const demo = useDemoOptional();
  const isInDemo = demo?.isDemo ?? false;
  const { theme, toggleTheme } = useTheme();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current?.contains(e.target as Node)) return;
      setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [userMenuOpen]);

  const handleDemoClick = async () => {
    if (demo) {
      await demo.enterDemo();
      // Navigate to the actual demo project overview
      router.push(`/projects/${DEMO_PROJECT_ID}`);
    }
  };

  const navWidth = isExpanded ? "var(--sidebar-nav-width-expanded)" : "var(--sidebar-nav-width)";

  return (
    <nav
      className="flex h-full flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-nav-rail)] transition-all duration-300 ease-in-out"
      style={{ width: navWidth }}
    >
      {/* Logo area */}
      <div className="flex h-12 items-center border-b border-[var(--border-muted)] px-3">
        {isExpanded ? (
          <span className="text-[15px] font-semibold text-[var(--text-primary)]">Service Design</span>
        ) : (
          <span className="text-[15px] font-semibold text-[var(--text-primary)] mx-auto">S</span>
        )}
      </div>

      {/* Navigation items */}
      <div className="flex flex-1 flex-col gap-1 px-2 pt-2">
        {/* All Projects (now the home/default) */}
        <Link
          href="/projects"
          className={`flex h-9 items-center rounded-md transition-colors ${
            isExpanded ? "px-3 gap-3" : "w-9 justify-center"
          } ${
            (pathname === "/" || pathname === "/projects") && !isInDemo
              ? "bg-[var(--bg-nav-rail-active)] text-[var(--text-nav-rail-active)]"
              : "text-[var(--text-nav-rail)] hover:bg-[var(--bg-nav-rail-hover)] hover:text-[var(--text-nav-rail-active)]"
          }`}
          title={!isExpanded ? "All Projects" : undefined}
        >
          <AppIcon name="home" size="sm" />
          {isExpanded && <span className="text-xs font-medium">Projects</span>}
        </Link>

        {/* Project sidebar toggle - only shown when there's a project sidebar */}
        {hasProjectSidebar && (
          <button
            onClick={onToggleSidebar}
            className={`flex h-9 items-center rounded-md transition-colors ${
              isExpanded ? "px-3 gap-3" : "w-9 justify-center"
            } ${
              isSidebarCollapsed
                ? "bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary-hover)]"
                : "text-[var(--text-nav-rail)] hover:bg-[var(--bg-nav-rail-hover)] hover:text-[var(--text-nav-rail-active)]"
            }`}
            title={!isExpanded ? (isSidebarCollapsed ? "Expand project sidebar" : "Collapse project sidebar") : undefined}
          >
            <AppIcon name="folder" size="sm" />
            {isExpanded && <span className="text-xs font-medium">Sidebar</span>}
          </button>
        )}

        {/* Demo button */}
        <button
          onClick={handleDemoClick}
          className={`flex h-9 items-center rounded-md transition-colors ${
            isExpanded ? "px-3 gap-3" : "w-9 justify-center"
          } ${
            isInDemo
              ? "bg-amber-500 text-white hover:bg-amber-600"
              : "text-[var(--text-nav-rail)] hover:bg-[var(--bg-nav-rail-hover)] hover:text-[var(--text-nav-rail-active)]"
          }`}
          title={!isExpanded ? UI_COPY.NAV_DEMO_TOOLTIP : undefined}
        >
          <AppIcon name="play" size="sm" />
          {isExpanded && <span className="text-xs font-medium">Demo</span>}
        </button>

        {/* Settings (disabled) */}
        <Link
          href="#"
          className={`flex h-9 items-center rounded-md text-[var(--text-nav-rail)] opacity-40 pointer-events-none ${
            isExpanded ? "px-3 gap-3" : "w-9 justify-center"
          }`}
          title={!isExpanded ? "Settings" : undefined}
        >
          <AppIcon name="settings" size="sm" />
          {isExpanded && <span className="text-xs font-medium">Settings</span>}
        </Link>
      </div>

      {/* Bottom actions */}
      <div className="px-2 pb-3 space-y-1">
        {/* User menu - same size as other icons, above dark mode */}
        {user && (
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setUserMenuOpen((o) => !o)}
              className={`flex h-9 items-center rounded-md text-[var(--text-nav-rail)] transition-colors hover:bg-[var(--bg-nav-rail-hover)] hover:text-[var(--text-nav-rail-active)] ${
                isExpanded ? "w-full px-3 gap-3" : "w-9 justify-center"
              }`}
              aria-expanded={userMenuOpen}
              aria-haspopup="true"
              title={!isExpanded ? user.userDisplayName : undefined}
            >
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent-primary)] text-[10px] font-medium text-white"
                aria-hidden
              >
                {user.userDisplayName.charAt(0).toUpperCase()}
              </span>
              {isExpanded && <span className="text-xs font-medium truncate">{user.userDisplayName}</span>}
              {isExpanded && <AppIcon name="chevronDown" size="xs" className="text-[var(--text-muted)] shrink-0 ml-auto" />}
            </button>
            {userMenuOpen && (
              <div
                className="absolute left-0 bottom-full z-50 mb-1 min-w-[180px] rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] py-1 shadow-lg"
                role="menu"
              >
                <div className="border-b border-[var(--border-subtle)] px-3 py-2">
                  <p className="text-xs font-medium text-[var(--text-muted)]">
                    Signed in as {user.userDisplayName}
                  </p>
                </div>
                <button
                  type="button"
                  disabled
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--text-muted)] disabled:cursor-not-allowed"
                  role="menuitem"
                >
                  <AppIcon name="settings" size="xs" />
                  User settings (coming soon)
                </button>
                <form action={logout} className="block">
                  <button
                    type="submit"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                    role="menuitem"
                  >
                    <AppIcon name="logout" size="xs" />
                    Sign out
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* Dark mode toggle */}
        <button
          onClick={toggleTheme}
          className={`flex h-9 items-center rounded-md text-[var(--text-nav-rail)] transition-colors hover:bg-[var(--bg-nav-rail-hover)] hover:text-[var(--text-nav-rail-active)] ${
            isExpanded ? "w-full px-3 gap-3" : "w-9 justify-center"
          }`}
          title={!isExpanded ? (theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode') : undefined}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
            {theme === 'light' ? 'dark_mode' : 'light_mode'}
          </span>
          {isExpanded && <span className="text-xs font-medium">{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>}
        </button>

        {/* Help button */}
        <button
          className={`flex h-9 items-center rounded-md text-[var(--text-nav-rail)] transition-colors hover:bg-[var(--bg-nav-rail-hover)] hover:text-[var(--text-nav-rail-active)] ${
            isExpanded ? "w-full px-3 gap-3" : "w-9 justify-center"
          }`}
          title={!isExpanded ? "Help" : undefined}
        >
          <AppIcon name="help" size="sm" />
          {isExpanded && <span className="text-xs font-medium">Help</span>}
        </button>

        {/* Collapse/Expand toggle */}
        <button
          onClick={onToggleExpand}
          className={`flex h-9 items-center rounded-md text-[var(--text-nav-rail)] transition-colors hover:bg-[var(--bg-nav-rail-hover)] hover:text-[var(--text-nav-rail-active)] ${
            isExpanded ? "w-full px-3 gap-3 justify-start" : "w-9 justify-center"
          }`}
          title={isExpanded ? "Collapse menu" : "Expand menu"}
        >
          <AppIcon name={isExpanded ? "chevronLeft" : "chevronRight"} size="sm" />
          {isExpanded && <span className="text-xs font-medium">Collapse</span>}
        </button>
      </div>
    </nav>
  );
}

// ============================================
// AI ASSISTANT SIDEBAR (Collapsible)
// ============================================

function AiSidebar({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const demo = useDemoOptional();
  const projectCache = useOptionalProjectCache();
  const isDemo = demo?.isDemo ?? false;
  const isOnDemoProject = pathname?.includes(`/projects/${DEMO_PROJECT_ID}`) ?? false;
  const personas = projectCache?.data.personas ?? [];

  // Sync current view and journey map ID from pathname for demo prompt filtering
  useEffect(() => {
    if (!demo) return;
    if (pathname?.includes("/journey-maps/") && !pathname.endsWith("/journey-maps")) {
      demo.setCurrentView("journeyMap");
      const match = pathname.match(/\/journey-maps\/([^/]+)/);
      demo.setCurrentJourneyMapId?.(match?.[1] ?? null);
    } else if (pathname?.includes("/blueprints/")) {
      demo.setCurrentView("blueprint");
      demo.setCurrentJourneyMapId?.(null);
    } else {
      demo.setCurrentView("project");
      demo.setCurrentJourneyMapId?.(null);
    }
  }, [pathname, demo]);

  // Show demo chat if in demo mode or on demo project (auto-enters above)
  if ((isDemo || isOnDemoProject) && demo) {
    return <DemoAiSidebar demo={demo} onClose={onClose} personas={personas} />;
  }
  
  // Non-demo: show "Coming soon" state
  return (
    <>
      {/* Header */}
      <div className="flex h-12 items-center justify-between border-b border-[var(--border-muted)] px-4">
        <div className="flex items-center gap-2">
          <AppIcon name="ai" size="sm" className="text-[var(--accent-primary)]" />
          <span
            className="font-medium text-[var(--text-primary)]"
            style={{ fontSize: "var(--font-size-action)" }}
          >
            {UI_COPY.AI_HEADER_DISABLED}
          </span>
        </div>
        <button
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
          title="Close"
        >
          <AppIcon name="close" size="sm" />
        </button>
      </div>

      {/* Empty state */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--bg-sidebar)]">
          <AppIcon name="ai" className="text-[var(--accent-primary)]" />
        </div>
        <h3
          className="mb-1 font-medium text-[var(--text-primary)]"
          style={{ fontSize: "var(--font-size-action)" }}
        >
          {UI_COPY.AI_DISABLED_TITLE}
        </h3>
        <p
          className="text-[var(--text-muted)]"
          style={{ fontSize: "var(--font-size-meta)", lineHeight: 1.4 }}
        >
          {UI_COPY.AI_DISABLED_BODY}
        </p>
      </div>

      {/* Placeholder input */}
      <div className="border-t border-[var(--border-muted)] p-3">
        <div className="flex items-center gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] px-3 py-2">
          <input
            type="text"
            placeholder={UI_COPY.AI_INPUT_PLACEHOLDER_DISABLED}
            disabled
            className="flex-1 bg-transparent text-[var(--text-muted)] outline-none placeholder:text-[var(--text-muted)]"
            style={{ fontSize: "var(--font-size-cell)" }}
          />
          <button disabled className="text-[var(--text-muted)]">
            <AppIcon name="send" size="sm" />
          </button>
        </div>
      </div>
    </>
  );
}

// ============================================
// DEMO AI SIDEBAR (Scripted chat)
// ============================================

type DemoContextType = NonNullable<ReturnType<typeof useDemoOptional>>;

type SidebarPersona = { id: string; name: string; avatarUrl: string | null; templateId: string | null };

function DemoAiSidebar({ demo, onClose, personas = [] }: { demo: DemoContextType; onClose: () => void; personas?: SidebarPersona[] }) {
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const personaMessagesEndRef = useRef<HTMLDivElement>(null);
  const [showToast, setShowToast] = useState(false);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  const [personaMessages, setPersonaMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const [personaArchetype, setPersonaArchetype] = useState<PersonaChatArchetype>("pragmatist");
  const [personaInput, setPersonaInput] = useState("");

  const selectedPersona = selectedPersonaId ? personas.find((p) => p.id === selectedPersonaId) : null;
  const isFrontlinePersona = selectedPersona?.templateId === DEMO_CHAT_ALLOWED_TEMPLATE_ID;
  const headshotUrl = selectedPersona?.avatarUrl || DEMO_ASSETS.personaHeadshot;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  const scrollPersonaToBottom = () => {
    personaMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [demo.chatMessages]);
  useEffect(() => {
    scrollPersonaToBottom();
  }, [personaMessages]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    demo.sendMessage(inputValue.trim());
    setInputValue("");
  };

  const handlePromptClick = (promptText: string) => {
    demo.sendMessage(promptText);
    setInputValue("");
  };

  const handlePersonaSend = (text: string) => {
    if (!text.trim() || !isFrontlinePersona) return;
    setPersonaMessages((prev) => [...prev, { role: "user", text: text.trim() }]);
    setPersonaInput("");
    const response = getScriptedResponse(text.trim(), personaArchetype);
    setPersonaMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        text: response ?? "I'm not sure how to answer that in this demo. Try one of the suggested questions above.",
      },
    ]);
  };

  const handleGenerate = () => {
    const type = demo.currentView === "blueprint" ? "blueprint" : "journeyMap";
    demo.generateFutureState(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 5000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (selectedPersonaId) {
        handlePersonaSend(personaInput);
      } else {
        handleSend();
      }
    }
  };

  const isPersonaMode = selectedPersonaId != null;
  const gradientBg = isPersonaMode
    ? "linear-gradient(to bottom, rgb(253 246 227) 0%, rgb(254 251 238) 25%, rgb(255 253 248) 55%, white 100%)"
    : "linear-gradient(to bottom, rgb(224 242 254) 0%, rgb(255 255 255) 33%, white 33%)";

  return (
    <>
    <div
      className="flex min-h-0 flex-1 flex-col"
      style={{ background: gradientBg }}
    >
      {/* Header */}
      <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-[var(--border-muted)] px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <AppIcon name="ai" size="sm" className={isPersonaMode ? "text-amber-600" : "text-blue-500"} />
          <span
            className="truncate font-medium text-[var(--text-primary)]"
            style={{ fontSize: "var(--font-size-action)" }}
          >
            {UI_COPY.AI_HEADER_DEMO}
          </span>
          <select
            value={selectedPersonaId ?? ""}
            onChange={(e) => setSelectedPersonaId(e.target.value || null)}
            className="min-w-0 max-w-[140px] truncate rounded-md border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] px-2 py-1 text-[var(--text-primary)] outline-none"
            style={{ fontSize: "var(--font-size-meta)" }}
          >
            <option value="">AI Assistant</option>
            {personas.length > 0 && <option disabled>—</option>}
            {personas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={onClose}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
          title="Close"
        >
          <AppIcon name="close" size="sm" />
        </button>
      </div>

      {isPersonaMode ? (
        /* Persona chat mode */
        <>
          {!isFrontlinePersona ? (
            <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
              <p className="font-medium text-[var(--text-primary)]" style={{ fontSize: "var(--font-size-cell)" }}>
                Demo chat not available yet
              </p>
              <p className="mt-1 text-[var(--text-muted)]" style={{ fontSize: "var(--font-size-meta)" }}>
                Scripted chat is only available for the Frontline Service Specialist persona in this demo.
              </p>
            </div>
          ) : (
            <>
              {/* Archetype */}
              <div className="shrink-0 border-b border-[var(--border-muted)] px-4 py-2">
                <label className="mb-1 block text-[var(--text-muted)]" style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Archetype</label>
                <select
                  value={personaArchetype}
                  onChange={(e) => setPersonaArchetype(e.target.value as PersonaChatArchetype)}
                  className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] px-3 py-1.5 text-[var(--text-primary)] outline-none"
                  style={{ fontSize: "var(--font-size-meta)" }}
                >
                  {ARCHETYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              {/* Persona messages */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-3">
                  {personaMessages.length === 0 && (
                    <p className="text-[var(--text-muted)]" style={{ fontSize: "var(--font-size-meta)" }}>
                      Ask about the contact enquiry process. Choose an archetype and tap a suggested question or type your own.
                    </p>
                  )}
                  {personaMessages.map((m, i) => (
                    <div
                      key={i}
                      className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      {m.role === "assistant" && (
                        <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-[var(--bg-sidebar)]">
                          <img src={headshotUrl} alt="" className="h-full w-full object-cover" />
                        </div>
                      )}
                      <div
                        className={`max-w-[85%] rounded-lg px-3 py-2 ${
                          m.role === "user"
                            ? "bg-[var(--accent-primary)] text-white"
                            : "bg-[var(--bg-sidebar)] text-[var(--text-primary)]"
                        }`}
                        style={{ fontSize: "var(--font-size-cell)", lineHeight: 1.5 }}
                      >
                        <p style={{ whiteSpace: "pre-wrap" }}>{m.text}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={personaMessagesEndRef} />
                </div>
              </div>
              {/* Suggested chips */}
              {SUGGESTED_CHIPS[personaArchetype].length > 0 && (
                <div className="shrink-0 border-t border-[var(--border-muted)] p-3">
                  <p className="mb-2 font-medium text-[var(--text-muted)]" style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Suggested questions</p>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTED_CHIPS[personaArchetype].map((chip) => (
                      <button
                        key={chip}
                        onClick={() => handlePersonaSend(chip)}
                        className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-3 py-1.5 text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
                        style={{ fontSize: "var(--font-size-meta)" }}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {/* Input */}
              <div className="shrink-0 border-t border-[var(--border-muted)] p-3">
                <div className="flex items-center gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] px-3 py-2">
                  <input
                    type="text"
                    value={personaInput}
                    onChange={(e) => setPersonaInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handlePersonaSend(personaInput);
                      }
                    }}
                    placeholder="Type a message..."
                    className="flex-1 bg-transparent text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                    style={{ fontSize: "var(--font-size-cell)" }}
                  />
                  <button
                    onClick={() => handlePersonaSend(personaInput)}
                    disabled={!personaInput.trim()}
                    className={`transition-colors ${
                      personaInput.trim()
                        ? "text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)]"
                        : "text-[var(--text-muted)]"
                    }`}
                  >
                    <AppIcon name="send" size="sm" />
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      ) : (
        /* AI Assistant mode */
        <>
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {demo.chatMessages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 ${
                  message.role === "user"
                    ? "bg-[var(--accent-primary)] text-white"
                    : "bg-[var(--bg-sidebar)] text-[var(--text-primary)]"
                }`}
                style={{ fontSize: "var(--font-size-cell)", lineHeight: 1.5 }}
              >
                <p style={{ whiteSpace: "pre-wrap" }}>{message.content}</p>
              </div>
            </div>
          ))}
          
          {/* Generate button (shown only at step 6) */}
          {demo.showGenerateButton && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p
                className="mb-3 text-amber-800"
                style={{ fontSize: "var(--font-size-cell)" }}
              >
                {UI_COPY.GENERATE_HELPER_TEXT}
              </p>
              <button
                onClick={handleGenerate}
                className="w-full rounded-md bg-amber-500 px-4 py-2 font-medium text-white transition-colors hover:bg-amber-600"
              >
                {UI_COPY.GENERATE_BUTTON_LABEL}
              </button>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Suggested prompts */}
      {demo.suggestedPrompts.length > 0 && (
        <div className="border-t border-[var(--border-muted)] p-3">
          <p
            className="mb-2 font-medium text-[var(--text-muted)]"
            style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.05em" }}
          >
            {UI_COPY.AI_SUGGESTED_PROMPTS_TITLE}
          </p>
          <div className="flex flex-wrap gap-2">
            {demo.suggestedPrompts.map((prompt: ScriptedPrompt) => (
              <button
                key={prompt.id}
                onClick={() => handlePromptClick(prompt.text)}
                className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-3 py-1.5 text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
                style={{ fontSize: "var(--font-size-meta)" }}
              >
                {prompt.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-[var(--border-muted)] p-3">
        <div className="flex items-center gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] px-3 py-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={UI_COPY.AI_INPUT_PLACEHOLDER_DEMO}
            className="flex-1 bg-transparent text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
            style={{ fontSize: "var(--font-size-cell)" }}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className={`transition-colors ${
              inputValue.trim()
                ? "text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)]"
                : "text-[var(--text-muted)]"
            }`}
          >
            <AppIcon name="send" size="sm" />
          </button>
        </div>
      </div>
        </>
      )}
    </div>
      
      {/* Toast notification */}
      {showToast && (
        <div className="fixed bottom-24 right-6 z-50 animate-in fade-in slide-in-from-bottom-4">
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                <AppIcon name="check" size="sm" className="text-green-600" />
              </div>
              <div>
                <h4 className="font-medium text-green-800" style={{ fontSize: "var(--font-size-action)" }}>
                  {UI_COPY.TOAST_TITLE}
                </h4>
                <p className="text-green-700" style={{ fontSize: "var(--font-size-cell)" }}>
                  {UI_COPY.TOAST_BODY}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ============================================
// PROJECT SIDEBAR COMPONENT
// ============================================

type ArtefactItem = {
  id: string;
  name: string;
};

type PersonaItem = {
  id: string;
  name: string;
  shortDescription: string | null;
  templateId?: string | null;
};

type ProjectSidebarProps = {
  projectId: string;
  projectName: string;
  journeyMaps: ArtefactItem[];
  blueprints: ArtefactItem[];
  personas?: PersonaItem[];
  currentItemId?: string;
  currentItemType?: "journeyMap" | "blueprint";
};

function CompareButton({
  projectId,
  journeyMaps,
  blueprints,
  isActive,
}: {
  projectId: string;
  journeyMaps: ArtefactItem[];
  blueprints: ArtefactItem[];
  isActive: boolean;
}) {
  const [showModal, setShowModal] = useState(false);
  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 transition-colors ${
          isActive
            ? "bg-[var(--bg-active)] text-[var(--text-primary)]"
            : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
        }`}
        style={{ fontSize: "var(--font-size-cell)" }}
      >
        <AppIcon name="compare" size="xs" />
        <span>Compare</span>
      </button>
      {showModal && (
        <CompareModal
          projectId={projectId}
          journeyMaps={journeyMaps}
          blueprints={blueprints}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

export function ProjectSidebar({
  projectId,
  projectName,
  journeyMaps,
  blueprints,
  personas = [],
  currentItemId,
  currentItemType,
}: ProjectSidebarProps) {
  const router = useRouter();
  const demo = useDemoOptional();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{
    nameMatches: SearchResult[];
    contentMatches: SearchResult[];
  } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Set up callback to refresh sidebar when demo future state is generated
  useEffect(() => {
    if (demo) {
      demo.setOnFutureStateGenerated(() => {
        router.refresh();
      });
      return () => {
        demo.setOnFutureStateGenerated(undefined);
      };
    }
  }, [demo, router]);

  // Debounced search
  const handleSearchChange = useCallback(
    (query: string) => {
      setSearchQuery(query);

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      if (!query.trim()) {
        setSearchResults(null);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      searchTimeoutRef.current = setTimeout(async () => {
        const results = await searchProjectContent(projectId, query);
        setSearchResults(results);
        setIsSearching(false);
      }, 300);
    },
    [projectId]
  );

  const handleCreateMap = async () => {
    const newMap = await createJourneyMapInProject(projectId);
    if (newMap) {
      sessionStorage.setItem("focusMapRename", newMap.id);
      router.push(`/projects/${projectId}/journey-maps/${newMap.id}`);
    }
  };

  const handleCreateBlueprint = async () => {
    const newBp = await createBlueprint(projectId);
    if (newBp) {
      sessionStorage.setItem("focusBlueprintRename", newBp.id);
      router.push(`/projects/${projectId}/blueprints/${newBp.id}`);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults(null);
  };

  const pathname = usePathname();
  const isOverviewActive = pathname === `/projects/${projectId}`;

  return (
    <>
      {/* Project header */}
      <div className="border-b border-[var(--border-muted)] px-3 py-2">
        <p
          className="mb-1 truncate font-medium text-[var(--text-primary)]"
          style={{ fontSize: "var(--font-size-action)" }}
        >
          {projectName}
        </p>
        <Link
          href={`/projects/${projectId}`}
          className={`flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors ${
            isOverviewActive
              ? "bg-[var(--bg-active)] text-[var(--text-primary)]"
              : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
          }`}
          style={{ fontSize: "var(--font-size-cell)" }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
            dashboard
          </span>
          <span>Project Overview</span>
        </Link>
        {(journeyMaps.length >= 2 || blueprints.length >= 2) && (
          <div className="mt-1">
            <CompareButton
              projectId={projectId}
              journeyMaps={journeyMaps}
              blueprints={blueprints}
              isActive={pathname?.includes("/compare") && pathname?.includes(projectId)}
            />
          </div>
        )}
      </div>

      {/* Search bar */}
      <div className="border-b border-[var(--border-muted)] p-2">
        <div className="relative">
          <div className="flex items-center gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] px-2 py-1.5">
            <AppIcon name="search" size="xs" className="text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search artefacts..."
              className="flex-1 bg-transparent text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
              style={{ fontSize: "var(--font-size-cell)" }}
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              >
                <AppIcon name="close" size="xs" />
              </button>
            )}
          </div>

          {/* Search results dropdown */}
          {searchQuery && (
            <SearchResultsDropdown
              results={searchResults}
              isSearching={isSearching}
              projectId={projectId}
              onSelect={clearSearch}
            />
          )}
        </div>
      </div>

      {/* Asset categories */}
      <div className="flex-1 overflow-y-auto py-2">
        {/* Journey Maps section */}
        <JourneyMapsSection
          projectId={projectId}
          journeyMaps={journeyMaps}
          currentItemId={currentItemType === "journeyMap" ? currentItemId : undefined}
          onCreateMap={handleCreateMap}
        />

        {/* Service Blueprints section */}
        <BlueprintsSection
          projectId={projectId}
          blueprints={blueprints}
          currentItemId={currentItemType === "blueprint" ? currentItemId : undefined}
          onCreateBlueprint={handleCreateBlueprint}
        />

        {/* Personas section */}
        <PersonasSection
          projectId={projectId}
          personas={personas}
        />
      </div>
    </>
  );
}

// ============================================
// SEARCH RESULTS DROPDOWN
// ============================================

function SearchResultsDropdown({
  results,
  isSearching,
  projectId,
  onSelect,
}: {
  results: { nameMatches: SearchResult[]; contentMatches: SearchResult[] } | null;
  isSearching: boolean;
  projectId: string;
  onSelect: () => void;
}) {
  const router = useRouter();

  if (isSearching) {
    return (
      <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-3 shadow-lg">
        <p className="text-center text-[var(--text-muted)]" style={{ fontSize: "var(--font-size-cell)" }}>
          Searching...
        </p>
      </div>
    );
  }

  if (!results) return null;

  const { nameMatches, contentMatches } = results;
  const hasResults = nameMatches.length > 0 || contentMatches.length > 0;

  if (!hasResults) {
    return (
      <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-3 shadow-lg">
        <p className="text-center text-[var(--text-muted)]" style={{ fontSize: "var(--font-size-cell)" }}>
          No results found
        </p>
      </div>
    );
  }

  const handleResultClick = (result: SearchResult) => {
    onSelect();
    const url = result.artefactType === "blueprint"
      ? `/projects/${projectId}/blueprints/${result.artefactId}`
      : `/projects/${projectId}/journey-maps/${result.artefactId}`;
    if (result.actionIndex !== undefined) {
      sessionStorage.setItem("scrollToAction", String(result.actionIndex));
    }
    router.push(url);
  };

  return (
    <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-y-auto rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] shadow-lg">
      {/* Name matches */}
      {nameMatches.length > 0 && (
        <div className="border-b border-[var(--border-muted)] p-2">
          <p
            className="mb-1 px-1 font-medium uppercase tracking-wider text-[var(--text-muted)]"
            style={{ fontSize: "9px", letterSpacing: "0.05em" }}
          >
            Maps & Blueprints
          </p>
          {nameMatches.map((result, i) => (
            <button
              key={`name-${i}`}
              onClick={() => handleResultClick(result)}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition-colors hover:bg-[var(--bg-hover)]"
            >
              <AppIcon
                name={result.artefactType === "blueprint" ? "blueprint" : "journeyMap"}
                size="xs"
                className="text-[var(--text-muted)]"
              />
              <span
                className="truncate text-[var(--text-primary)]"
                style={{ fontSize: "var(--font-size-cell)" }}
              >
                {result.artefactName}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Content matches */}
      {contentMatches.length > 0 && (
        <div className="p-2">
          <p
            className="mb-1 px-1 font-medium uppercase tracking-wider text-[var(--text-muted)]"
            style={{ fontSize: "9px", letterSpacing: "0.05em" }}
          >
            Matches in content
          </p>
          {contentMatches.map((result, i) => (
            <button
              key={`content-${i}`}
              onClick={() => handleResultClick(result)}
              className="flex w-full flex-col gap-0.5 rounded px-2 py-1.5 text-left transition-colors hover:bg-[var(--bg-hover)]"
            >
              <div className="flex items-center gap-2">
                <span
                  className="truncate text-[var(--text-primary)]"
                  style={{ fontSize: "var(--font-size-cell)" }}
                >
                  {result.artefactName}
                </span>
                <span
                  className="shrink-0 rounded bg-[var(--bg-sidebar)] px-1 py-0.5 text-[var(--text-muted)]"
                  style={{ fontSize: "9px" }}
                >
                  {result.matchField}
                </span>
              </div>
              <p
                className="truncate text-[var(--text-muted)]"
                style={{ fontSize: "var(--font-size-meta)" }}
              >
                {result.matchText}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// JOURNEY MAPS SECTION
// ============================================

function JourneyMapsSection({
  projectId,
  journeyMaps,
  currentItemId,
  onCreateMap,
}: {
  projectId: string;
  journeyMaps: ArtefactItem[];
  currentItemId?: string;
  onCreateMap: () => void;
}) {
  return (
    <div className="mb-1">
      {/* Section header */}
      <div className="flex items-center justify-between px-3 py-2">
        <span
          className="font-medium uppercase tracking-wider text-[var(--text-muted)]"
          style={{ fontSize: "10px", letterSpacing: "0.05em" }}
        >
          Journey Maps
        </span>
        <button
          onClick={onCreateMap}
          className="flex h-5 w-5 items-center justify-center rounded text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
          title="Create Journey Map"
        >
          <AppIcon name="add" size="xs" />
        </button>
      </div>

      {/* Items list */}
      <div className="px-2">
        {journeyMaps.length > 0 ? (
          <ul className="space-y-0.5">
            {journeyMaps.map((item, index) => (
              <JourneyMapListItem
                key={item.id}
                item={item}
                projectId={projectId}
                isActive={item.id === currentItemId}
                isFirst={index === 0}
                isLast={index === journeyMaps.length - 1}
              />
            ))}
          </ul>
        ) : (
          <p
            className="px-2 py-1 text-[var(--text-muted)]"
            style={{ fontSize: "var(--font-size-meta)" }}
          >
            No journey maps
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================
// JOURNEY MAP LIST ITEM (with context menu)
// ============================================

function JourneyMapListItem({
  item,
  projectId,
  isActive,
  isFirst,
  isLast,
}: {
  item: ArtefactItem;
  projectId: string;
  isActive: boolean;
  isFirst: boolean;
  isLast: boolean;
}) {
  const router = useRouter();
  const demo = useDemoOptional();
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(item.name);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRef = useRef<HTMLLIElement>(null);
  
  // Check if this item should have the shine animation
  const shouldAnimate = demo?.newlyGeneratedIds?.has(item.id) ?? false;

  // Check if we should enter rename mode on mount
  useEffect(() => {
    const focusId = sessionStorage.getItem("focusMapRename");
    if (focusId === item.id) {
      sessionStorage.removeItem("focusMapRename");
      setIsRenaming(true);
    }
  }, [item.id]);

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  // Close context menu on outside click
  useEffect(() => {
    if (!showContextMenu) return;

    const handleClick = (e: MouseEvent) => {
      if (itemRef.current && !itemRef.current.contains(e.target as Node)) {
        setShowContextMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showContextMenu]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  const handleRename = async () => {
    setIsRenaming(false);
    if (newName.trim() && newName.trim() !== item.name) {
      await renameJourneyMap(item.id, newName.trim());
    } else {
      setNewName(item.name);
    }
  };

  const handleDelete = async () => {
    setShowContextMenu(false);
    if (confirm(`Delete "${item.name}"? This cannot be undone.`)) {
      const result = await deleteJourneyMap(item.id);
      if (result.projectId && isActive) {
        router.push(`/projects/${result.projectId}`);
      }
    }
  };

  const handleDuplicate = async () => {
    setShowContextMenu(false);
    const duplicate = await duplicateJourneyMap(item.id);
    if (duplicate) {
      router.push(`/projects/${projectId}/journey-maps/${duplicate.id}`);
    }
  };

  const handleMoveUp = async () => {
    setShowContextMenu(false);
    await moveJourneyMapUp(item.id);
  };

  const handleMoveDown = async () => {
    setShowContextMenu(false);
    await moveJourneyMapDown(item.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleRename();
    } else if (e.key === "Escape") {
      setNewName(item.name);
      setIsRenaming(false);
    }
  };

  return (
    <li ref={itemRef} className="relative">
      {isRenaming ? (
        <input
          ref={inputRef}
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onBlur={handleRename}
          onKeyDown={handleKeyDown}
          className="w-full rounded-md border border-[var(--accent-primary)] bg-[var(--bg-panel)] px-2 py-1.5 text-[var(--text-primary)] outline-none"
          style={{ fontSize: "var(--font-size-cell)" }}
        />
      ) : (
        <Link
          href={`/projects/${projectId}/journey-maps/${item.id}`}
          onContextMenu={handleContextMenu}
          className={`group flex items-center justify-between gap-1 rounded-md px-2 py-1.5 transition-colors ${
            isActive
              ? "bg-[var(--bg-active)] text-[var(--text-primary)]"
              : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
          } ${shouldAnimate ? "animate-shine" : ""}`}
          style={{ fontSize: "var(--font-size-cell)" }}
        >
          <div className="flex min-w-0 items-center gap-2">
            <AppIcon
              name="journeyMap"
              size="xs"
              className={isActive ? "text-[var(--accent-primary)]" : "text-[var(--text-muted)]"}
            />
            <span className="truncate">{item.name}</span>
          </div>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const rect = e.currentTarget.getBoundingClientRect();
              setContextMenuPos({ x: rect.right, y: rect.top });
              setShowContextMenu(true);
            }}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded opacity-0 transition-opacity hover:bg-[var(--bg-hover)] group-hover:opacity-100"
          >
            <AppIcon name="more" size="xs" className="text-[var(--text-muted)]" />
          </button>
        </Link>
      )}

      {/* Context menu */}
      {showContextMenu && (
        <ContextMenu
          x={contextMenuPos.x}
          y={contextMenuPos.y}
          onClose={() => setShowContextMenu(false)}
          items={[
            { label: "Rename", icon: "edit", onClick: () => { setShowContextMenu(false); setIsRenaming(true); } },
            { label: "Duplicate", icon: "add", onClick: handleDuplicate },
            { type: "divider" },
            { label: "Move up", icon: "chevronUp", onClick: handleMoveUp, disabled: isFirst },
            { label: "Move down", icon: "chevronDown", onClick: handleMoveDown, disabled: isLast },
            { type: "divider" },
            { label: "Delete", icon: "delete", onClick: handleDelete, danger: true },
          ]}
        />
      )}
    </li>
  );
}

// ============================================
// CONTEXT MENU
// ============================================

type ContextMenuItem =
  | { type: "divider" }
  | {
      label: string;
      icon: string;
      onClick: () => void;
      disabled?: boolean;
      danger?: boolean;
    };

function ContextMenu({
  x,
  y,
  onClose,
  items,
}: {
  x: number;
  y: number;
  onClose: () => void;
  items: ContextMenuItem[];
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x, y });

  // Adjust position to keep menu in viewport
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      let newX = x;
      let newY = y;

      if (x + rect.width > window.innerWidth) {
        newX = x - rect.width;
      }
      if (y + rect.height > window.innerHeight) {
        newY = y - rect.height;
      }

      setPosition({ x: Math.max(8, newX), y: Math.max(8, newY) });
    }
  }, [x, y]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed z-[9999] min-w-[140px] rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)] py-1 shadow-lg"
      style={{ left: position.x, top: position.y }}
    >
      {items.map((item, i) => {
        if ("type" in item && item.type === "divider") {
          return <div key={i} className="my-1 border-t border-[var(--border-muted)]" />;
        }

        const menuItem = item as Exclude<ContextMenuItem, { type: "divider" }>;
        return (
          <button
            key={i}
            onClick={menuItem.onClick}
            disabled={menuItem.disabled}
            className={`flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors ${
              menuItem.disabled
                ? "cursor-not-allowed opacity-40"
                : menuItem.danger
                ? "text-[var(--emotion-1)] hover:bg-[var(--emotion-1-tint)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
            }`}
            style={{ fontSize: "var(--font-size-cell)" }}
          >
            <AppIcon name={menuItem.icon as keyof typeof import("./Icon").ICON_MAP} size="xs" />
            <span>{menuItem.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ============================================
// BLUEPRINTS SECTION
// ============================================

function BlueprintsSection({
  projectId,
  blueprints,
  currentItemId,
  onCreateBlueprint,
}: {
  projectId: string;
  blueprints: ArtefactItem[];
  currentItemId?: string;
  onCreateBlueprint: () => void;
}) {
  return (
    <div className="mb-1">
      {/* Section header */}
      <div className="flex items-center justify-between px-3 py-2">
        <span
          className="font-medium uppercase tracking-wider text-[var(--text-muted)]"
          style={{ fontSize: "10px", letterSpacing: "0.05em" }}
        >
          Service Blueprints
        </span>
        <button
          onClick={onCreateBlueprint}
          className="flex h-5 w-5 items-center justify-center rounded text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
          title="Create Blueprint"
        >
          <AppIcon name="add" size="xs" />
        </button>
      </div>

      {/* Items list */}
      <div className="px-2">
        {blueprints.length > 0 ? (
          <ul className="space-y-0.5">
            {blueprints.map((item, index) => (
              <BlueprintListItem
                key={item.id}
                item={item}
                projectId={projectId}
                isActive={item.id === currentItemId}
                isFirst={index === 0}
                isLast={index === blueprints.length - 1}
              />
            ))}
          </ul>
        ) : (
          <p
            className="px-2 py-1 text-[var(--text-muted)]"
            style={{ fontSize: "var(--font-size-meta)" }}
          >
            No blueprints
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================
// BLUEPRINT LIST ITEM (with context menu)
// ============================================

function BlueprintListItem({
  item,
  projectId,
  isActive,
  isFirst,
  isLast,
}: {
  item: ArtefactItem;
  projectId: string;
  isActive: boolean;
  isFirst: boolean;
  isLast: boolean;
}) {
  const router = useRouter();
  const demo = useDemoOptional();
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(item.name);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRef = useRef<HTMLLIElement>(null);
  
  // Check if this item should have the shine animation
  const shouldAnimate = demo?.newlyGeneratedIds?.has(item.id) ?? false;

  // Check if we should enter rename mode on mount
  useEffect(() => {
    const focusId = sessionStorage.getItem("focusBlueprintRename");
    if (focusId === item.id) {
      sessionStorage.removeItem("focusBlueprintRename");
      setIsRenaming(true);
    }
  }, [item.id]);

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  // Close context menu on outside click
  useEffect(() => {
    if (!showContextMenu) return;

    const handleClick = (e: MouseEvent) => {
      if (itemRef.current && !itemRef.current.contains(e.target as Node)) {
        setShowContextMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showContextMenu]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  const handleRename = async () => {
    setIsRenaming(false);
    if (newName.trim() && newName.trim() !== item.name) {
      await renameBlueprint(item.id, newName.trim());
    } else {
      setNewName(item.name);
    }
  };

  const handleDelete = async () => {
    setShowContextMenu(false);
    if (confirm(`Delete "${item.name}"? This cannot be undone.`)) {
      const result = await deleteBlueprint(item.id);
      if (result.projectId && isActive) {
        router.push(`/projects/${result.projectId}`);
      }
    }
  };

  const handleDuplicate = async () => {
    setShowContextMenu(false);
    const duplicate = await duplicateBlueprint(item.id);
    if (duplicate) {
      router.push(`/projects/${projectId}/blueprints/${duplicate.id}`);
    }
  };

  const handleMoveUp = async () => {
    setShowContextMenu(false);
    await moveBlueprintUp(item.id);
  };

  const handleMoveDown = async () => {
    setShowContextMenu(false);
    await moveBlueprintDown(item.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleRename();
    } else if (e.key === "Escape") {
      setNewName(item.name);
      setIsRenaming(false);
    }
  };

  return (
    <li ref={itemRef} className="relative">
      {isRenaming ? (
        <input
          ref={inputRef}
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onBlur={handleRename}
          onKeyDown={handleKeyDown}
          className="w-full rounded-md border border-[var(--accent-primary)] bg-[var(--bg-panel)] px-2 py-1.5 text-[var(--text-primary)] outline-none"
          style={{ fontSize: "var(--font-size-cell)" }}
        />
      ) : (
        <Link
          href={`/projects/${projectId}/blueprints/${item.id}`}
          onContextMenu={handleContextMenu}
          className={`group flex items-center justify-between gap-1 rounded-md px-2 py-1.5 transition-colors ${
            isActive
              ? "bg-[var(--bg-active)] text-[var(--text-primary)]"
              : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
          } ${shouldAnimate ? "animate-shine" : ""}`}
          style={{ fontSize: "var(--font-size-cell)" }}
        >
          <div className="flex min-w-0 items-center gap-2">
            <AppIcon
              name="blueprint"
              size="xs"
              className={isActive ? "text-[var(--accent-primary)]" : "text-[var(--text-muted)]"}
            />
            <span className="truncate">{item.name}</span>
          </div>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const rect = e.currentTarget.getBoundingClientRect();
              setContextMenuPos({ x: rect.right, y: rect.top });
              setShowContextMenu(true);
            }}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded opacity-0 transition-opacity hover:bg-[var(--bg-hover)] group-hover:opacity-100"
          >
            <AppIcon name="more" size="xs" className="text-[var(--text-muted)]" />
          </button>
        </Link>
      )}

      {/* Context menu */}
      {showContextMenu && (
        <ContextMenu
          x={contextMenuPos.x}
          y={contextMenuPos.y}
          onClose={() => setShowContextMenu(false)}
          items={[
            { label: "Rename", icon: "edit", onClick: () => { setShowContextMenu(false); setIsRenaming(true); } },
            { label: "Duplicate", icon: "add", onClick: handleDuplicate },
            { type: "divider" },
            { label: "Move up", icon: "chevronUp", onClick: handleMoveUp, disabled: isFirst },
            { label: "Move down", icon: "chevronDown", onClick: handleMoveDown, disabled: isLast },
            { type: "divider" },
            { label: "Delete", icon: "delete", onClick: handleDelete, danger: true },
          ]}
        />
      )}
    </li>
  );
}

// ============================================
// PERSONAS SECTION
// ============================================

function PersonasSection({
  projectId,
  personas,
}: {
  projectId: string;
  personas: PersonaItem[];
}) {
  return (
    <div className="mb-1">
      {/* Section header */}
      <div className="flex items-center justify-between px-3 py-2">
        <span
          className="font-medium uppercase tracking-wider text-[var(--text-muted)]"
          style={{ fontSize: "10px", letterSpacing: "0.05em" }}
        >
          Personas ({personas.length})
        </span>
        <Link
          href={`/projects/${projectId}#personas`}
          className="flex h-5 w-5 items-center justify-center rounded text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"
          title="Manage Personas"
        >
          <AppIcon name="settings" size="xs" />
        </Link>
      </div>

      {/* Items list */}
      <div className="px-2">
        {personas.length > 0 ? (
          <ul className="space-y-0.5">
            {personas.map((persona) => (
              <li key={persona.id}>
                <Link
                  href={`/projects/${projectId}#personas`}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)]"
                  style={{ fontSize: "var(--font-size-cell)" }}
                >
                  <AppIcon name="persona" size="xs" className="shrink-0" />
                  <span className="truncate">{persona.name}</span>
                  {persona.shortDescription && (
                    <span className="truncate text-[var(--text-muted)]" style={{ fontSize: "var(--font-size-meta)" }}>
                      — {persona.shortDescription}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p
            className="px-2 py-1 text-[var(--text-muted)]"
            style={{ fontSize: "var(--font-size-meta)" }}
          >
            No personas yet
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================
// PLACEHOLDER SECTION
// ============================================

function PlaceholderSection({
  title,
  emptyText,
}: {
  title: string;
  emptyText: string;
}) {
  return (
    <div className="mb-1">
      <div className="flex items-center justify-between px-3 py-2">
        <span
          className="font-medium uppercase tracking-wider text-[var(--text-muted)]"
          style={{ fontSize: "10px", letterSpacing: "0.05em" }}
        >
          {title}
        </span>
      </div>
      <div className="px-2">
        <p
          className="px-2 py-1 text-[var(--text-muted)]"
          style={{ fontSize: "var(--font-size-meta)" }}
        >
          {emptyText}
        </p>
      </div>
    </div>
  );
}
