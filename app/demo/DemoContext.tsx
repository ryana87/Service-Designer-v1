"use client";

import React, { createContext, useContext, useState, useCallback, useMemo, useRef } from "react";
import { DEMO_PROJECT_ID } from "./constants";
import { seedDemo, generateFutureState as generateFutureStateAction, generateDemoThumbnails } from "./actions";
import { SCRIPTED_PROMPTS, ScriptedPrompt } from "./demoChatData";

// ============================================
// TYPES
// ============================================

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export type DemoViewType = "journeyMap" | "blueprint" | "project" | null;

interface DemoContextValue {
  // Demo mode state
  isDemo: boolean;
  enterDemo: () => Promise<void>;
  exitDemo: () => void;
  
  // Current view (set by layout based on pathname)
  currentView: DemoViewType;
  setCurrentView: (view: DemoViewType) => void;
  
  // Current journey map ID when viewing a journey map (for thumbnail generation)
  currentJourneyMapId: string | null;
  setCurrentJourneyMapId: (id: string | null) => void;
  
  // Chat state
  chatMessages: ChatMessage[];
  suggestedPrompts: ScriptedPrompt[];
  sendMessage: (content: string) => void;
  
  // Future state generation
  showGenerateButton: boolean;
  futureStateJourneyMapGenerated: boolean;
  futureStateBlueprintGenerated: boolean;
  generateFutureState: (type: "journeyMap" | "blueprint") => Promise<void>;
  isGenerating: boolean;
  
  // Track newly generated items for animation
  newlyGeneratedIds: Set<string>;
  
  // Callback to refresh sidebar after generation (use setOnFutureStateGenerated to register)
  setOnFutureStateGenerated: (callback: (() => void) | undefined) => void;
}

const DemoContext = createContext<DemoContextValue | null>(null);

// ============================================
// PROVIDER
// ============================================

// IDs of items generated when future state is created
const FUTURE_STATE_IDS = new Set(["demo_jm_future", "demo_bp_future"]);

// Per-view: which prompts must be answered before future-state prompt appears
const JOURNEY_MAP_PROMPT_IDS = ["generate-thumbnails", "pain-points", "repetition"] as const;
const BLUEPRINT_PROMPT_IDS = ["slow-down", "repetition"] as const;

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [isDemo, setIsDemo] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [futureStateJourneyMapGenerated, setFutureStateJourneyMapGenerated] = useState(false);
  const [futureStateBlueprintGenerated, setFutureStateBlueprintGenerated] = useState(false);
  const [showGenerateButton, setShowGenerateButton] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentView, setCurrentView] = useState<DemoViewType>(null);
  const [currentJourneyMapId, setCurrentJourneyMapId] = useState<string | null>(null);
  
  // Track which current-state prompts have been answered (by id)
  const [answeredPromptIds, setAnsweredPromptIds] = useState<Set<string>>(new Set());
  
  // Track newly generated item IDs for animation
  const [newlyGeneratedIds, setNewlyGeneratedIds] = useState<Set<string>>(new Set());
  
  // Callback to refresh sidebar after generation (use ref to avoid render loops)
  const onFutureStateGeneratedRef = useRef<(() => void) | undefined>(undefined);
  
  const setOnFutureStateGenerated = useCallback((callback: (() => void) | undefined) => {
    onFutureStateGeneratedRef.current = callback;
  }, []);

  // Get suggested prompts filtered by current view; future-state only after all current-state questions done for THIS view
  const getSuggestedPrompts = useMemo((): ScriptedPrompt[] => {
    if (!currentView || currentView === "project") return [];
    
    const viewMatches = (p: ScriptedPrompt) =>
      p.context === "both" || p.context === currentView;
    
    const jmGenerated = futureStateJourneyMapGenerated;
    const bpGenerated = futureStateBlueprintGenerated;
    const bothGenerated = jmGenerated && bpGenerated;
    
    if (bothGenerated) {
      const prompt = SCRIPTED_PROMPTS.find(p => p.visibleAfterGenerate && viewMatches(p));
      return prompt ? [prompt] : [];
    }
    
    // Per-view: check if all required prompts for this view are answered
    const requiredForView =
      currentView === "journeyMap" ? JOURNEY_MAP_PROMPT_IDS : BLUEPRINT_PROMPT_IDS;
    const allCurrentStateDoneForView = requiredForView.every(id => answeredPromptIds.has(id));
    
    // Future-state prompt: only when all current-state questions for THIS view are done, and not yet generated
    const alreadyGenerated = currentView === "journeyMap" ? jmGenerated : bpGenerated;
    const futureStatePrompt = SCRIPTED_PROMPTS.find(
      p => p.requiresAllCurrentState && p.context === currentView && !alreadyGenerated
    );
    if (allCurrentStateDoneForView && futureStatePrompt) {
      return [futureStatePrompt];
    }
    
    // Current-state: show first unanswered prompt that matches current view
    const currentStatePrompts = SCRIPTED_PROMPTS.filter(
      p => !p.visibleAfterGenerate && !p.requiresAllCurrentState
    );
    const nextPrompt = currentStatePrompts.find(
      p => !answeredPromptIds.has(p.id) && viewMatches(p)
    );
    return nextPrompt ? [nextPrompt] : [];
  }, [futureStateJourneyMapGenerated, futureStateBlueprintGenerated, currentView, answeredPromptIds]);

  const enterDemo = useCallback(async () => {
    await seedDemo();
    setIsDemo(true);
    setChatMessages([]);
    setFutureStateJourneyMapGenerated(false);
    setFutureStateBlueprintGenerated(false);
    setShowGenerateButton(false);
    setAnsweredPromptIds(new Set());
    setNewlyGeneratedIds(new Set());
  }, []);

  const exitDemo = useCallback(() => {
    setIsDemo(false);
    setChatMessages([]);
    setFutureStateJourneyMapGenerated(false);
    setFutureStateBlueprintGenerated(false);
    setShowGenerateButton(false);
    setAnsweredPromptIds(new Set());
    setNewlyGeneratedIds(new Set());
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
    };
    setChatMessages(prev => [...prev, userMessage]);

    // Find matching scripted response
    const scripted = SCRIPTED_PROMPTS.find(
      p => p.text.toLowerCase() === content.toLowerCase()
    );
    
    // Mark current-state prompts as answered when user sends them
    const allPromptIds = [...JOURNEY_MAP_PROMPT_IDS, ...BLUEPRINT_PROMPT_IDS];
    const markAsAnswered = scripted && allPromptIds.includes(scripted.id as typeof allPromptIds[number]);

    // Handle triggered actions with progress
    if (scripted?.triggersAction === "generate-thumbnails") {
      // Show "generating" message
      const generatingMessage: ChatMessage = {
        id: `assistant-gen-${Date.now()}`,
        role: "assistant",
        content: "Generating thumbnails for empty slots...",
      };
      setChatMessages(prev => [...prev, generatingMessage]);
      
      try {
        const result = await generateDemoThumbnails(currentJourneyMapId);
        
        const successMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: result.generated > 0 
            ? `✓ Generated ${result.generated} thumbnail${result.generated !== 1 ? 's' : ''} for the journey map. ${scripted.response}`
            : `All thumbnails are already set. ${scripted.response}`,
        };
        setChatMessages(prev => [...prev, successMessage]);
        
        // Refresh the page to show new thumbnails
        if (result.generated > 0 && onFutureStateGeneratedRef.current) {
          onFutureStateGeneratedRef.current();
        }
        
        if (markAsAnswered) {
          setAnsweredPromptIds(prev => new Set([...prev, scripted.id]));
        }
      } catch (error) {
        const errorMessage: ChatMessage = {
          id: `assistant-error-${Date.now()}`,
          role: "assistant",
          content: "Error generating thumbnails. Please try again.",
        };
        setChatMessages(prev => [...prev, errorMessage]);
      }
      return;
    }

    // Regular scripted response handling
    setTimeout(() => {
      if (scripted) {
        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: scripted.response,
        };
        setChatMessages(prev => [...prev, assistantMessage]);
        
        if (scripted.showGenerateButton) {
          setShowGenerateButton(true);
        }
        
        if (markAsAnswered) {
          setAnsweredPromptIds(prev => new Set([...prev, scripted.id]));
        }
      } else {
        const defaultContent = !currentView || currentView === "project"
          ? "Open a journey map or blueprint to ask questions about it."
          : "I can help you understand this journey map and service blueprint. Try the suggested prompt above.";
        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: defaultContent,
        };
        setChatMessages(prev => [...prev, assistantMessage]);
      }
    }, 800);
  }, [futureStateJourneyMapGenerated, futureStateBlueprintGenerated, currentView, currentJourneyMapId]);

  const generateFutureState = useCallback(async (type: "journeyMap" | "blueprint") => {
    setIsGenerating(true);
    setShowGenerateButton(false);
    
    const label = type === "journeyMap" ? "Journey Map" : "Service Blueprint";
    const generatingMessage: ChatMessage = {
      id: `assistant-generating-${Date.now()}`,
      role: "assistant",
      content: `Generating Future State ${label}...`,
    };
    setChatMessages(prev => [...prev, generatingMessage]);

    try {
      await generateFutureStateAction(type);
      
      if (type === "journeyMap") {
        setFutureStateJourneyMapGenerated(true);
        setNewlyGeneratedIds(new Set(["demo_jm_future"]));
      } else {
        setFutureStateBlueprintGenerated(true);
        setNewlyGeneratedIds(new Set(["demo_bp_future"]));
      }
      
      setTimeout(() => setNewlyGeneratedIds(new Set()), 1500);
      
      const successMessage: ChatMessage = {
        id: `assistant-success-${Date.now()}`,
        role: "assistant",
        content: `✓ Future State ${label} has been generated. You can now view it in the project sidebar.`,
      };
      setChatMessages(prev => [...prev, successMessage]);
      
      if (onFutureStateGeneratedRef.current) {
        onFutureStateGeneratedRef.current();
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: `assistant-error-${Date.now()}`,
        role: "assistant",
        content: "Error generating future state. Please try again.",
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return (
    <DemoContext.Provider
      value={{
        isDemo,
        enterDemo,
        exitDemo,
        currentView,
        setCurrentView,
        currentJourneyMapId,
        setCurrentJourneyMapId,
        chatMessages,
        suggestedPrompts: getSuggestedPrompts,
        sendMessage,
        showGenerateButton,
        futureStateJourneyMapGenerated,
        futureStateBlueprintGenerated,
        generateFutureState,
        isGenerating,
        newlyGeneratedIds,
        setOnFutureStateGenerated,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
}

// ============================================
// HOOKS
// ============================================

export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error("useDemo must be used within a DemoProvider");
  }
  return context;
}

// Optional hook for components that may or may not be in demo context
export function useDemoOptional(): DemoContextValue | null {
  return useContext(DemoContext);
}

// Re-export the demo project ID for convenience
export { DEMO_PROJECT_ID } from "./constants";
