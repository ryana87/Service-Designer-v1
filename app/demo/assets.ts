// ============================================
// DEMO ASSETS - Centralized paths for all demo images
// These paths reference files in /public/demo/
// ============================================

export const DEMO_ASSETS = {
  // Persona headshot (capitalized for backwards compat)
  PERSONA_HEADSHOT: "/demo/demo_persona_headshot.png",
  personaHeadshot: "/demo/demo_persona_headshot.png",
  
  // Journey map thumbnails (indexed for deterministic mapping)
  // Uses demo_thumb_* files in /public/demo/
  thumbnails: [
    "/demo/demo_thumb_01_find_contact.png",
    "/demo/demo_thumb_02_complete_form.png",
    "/demo/demo_thumb_03_submit_wait.png",
    "/demo/demo_thumb_04_check_inbox.png",
    "/demo/demo_thumb_05_receive_response.png",
  ] as const,
};

// Helper to get deterministic thumbnail for a given action index
export function getDemoThumbnailForIndex(actionIndex: number): string {
  const thumbnails = DEMO_ASSETS.thumbnails;
  return thumbnails[actionIndex % thumbnails.length];
}

// Demo journey map IDs for reference
export const DEMO_JOURNEY_MAP_IDS = {
  currentState: "demo_jm_current",
  futureState: "demo_jm_future",
};

// Demo blueprint IDs for reference
export const DEMO_BLUEPRINT_IDS = {
  currentState: "demo_bp_current",
  futureState: "demo_bp_future",
};
