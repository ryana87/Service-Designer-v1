// ============================================
// PERSONA LIBRARY — Static templates (3 segments, 8 templates)
// Personas can only be added from here; no custom creation.
// ============================================

export const PERSONA_TEMPLATE_ID_FRONTLINE = "pt_frontline_service_specialist";

export type PersonaTemplate = {
  id: string;
  /** Display name of the person (e.g. "Sarah Chen") */
  personaName: string;
  /** Job role / title */
  name: string;
  shortDescription: string;
  role: string | null;
  context: string | null;
  goals: string | null;
  needs: string | null;
  painPoints: string | null;
  notes: string | null;
  avatarUrl: string | null; // Use demo headshot for frontline; null for others
  segmentId: string;
};

export type PersonaLibrarySegment = {
  id: string;
  name: string;
  templateIds: string[];
};

// 3 segments
export const PERSONA_LIBRARY_SEGMENTS: PersonaLibrarySegment[] = [
  { id: "seg_frontline_ops", name: "Frontline & operations", templateIds: ["pt_frontline_service_specialist", "pt_operations_coordinator", "pt_support_lead"] },
  { id: "seg_customer_facing", name: "Customer-facing", templateIds: ["pt_customer_success", "pt_sales_rep", "pt_onboarding_specialist"] },
  { id: "seg_strategy", name: "Strategy & leadership", templateIds: ["pt_product_owner", "pt_service_designer"] },
];

// 8 persona templates — only Frontline Service Specialist has full content
export const PERSONA_TEMPLATES: PersonaTemplate[] = [
  {
    id: PERSONA_TEMPLATE_ID_FRONTLINE,
    personaName: "Sarah Chen",
    name: "Frontline Service Specialist",
    shortDescription: "Contact centre frontline",
    role: "Frontline Service Specialist",
    context: "Works in a contact centre handling customer enquiries. Deals with web form intake, manual triage, and follow-up repetition.",
    goals: "Process enquiries efficiently. Reduce manual triage and clarification loops.",
    needs: "Structured intake, clear routing, visibility of status.",
    painPoints: "Free-text submissions, no reference numbers, manual routing, clarification loops.",
    notes: "Female business professional. Capable, time-aware, practical tone. Uses existing demo headshot.",
    avatarUrl: "/demo/demo_persona_headshot.png",
    segmentId: "seg_frontline_ops",
  },
  {
    id: "pt_operations_coordinator",
    personaName: "Marcus Webb",
    name: "Operations Coordinator",
    shortDescription: "Coordinates back-office flow",
    role: "Operations Coordinator",
    context: null,
    goals: null,
    needs: null,
    painPoints: null,
    notes: null,
    avatarUrl: null,
    segmentId: "seg_frontline_ops",
  },
  {
    id: "pt_support_lead",
    personaName: "Priya Sharma",
    name: "Support Team Lead",
    shortDescription: "Leads support team",
    role: "Support Team Lead",
    context: null,
    goals: null,
    needs: null,
    painPoints: null,
    notes: null,
    avatarUrl: null,
    segmentId: "seg_frontline_ops",
  },
  {
    id: "pt_customer_success",
    personaName: "Jordan Taylor",
    name: "Customer Success Manager",
    shortDescription: "Customer success",
    role: "Customer Success Manager",
    context: null,
    goals: null,
    needs: null,
    painPoints: null,
    notes: null,
    avatarUrl: null,
    segmentId: "seg_customer_facing",
  },
  {
    id: "pt_sales_rep",
    personaName: "Alex Rivera",
    name: "Sales Representative",
    shortDescription: "Sales representative",
    role: "Sales Representative",
    context: null,
    goals: null,
    needs: null,
    painPoints: null,
    notes: null,
    avatarUrl: null,
    segmentId: "seg_customer_facing",
  },
  {
    id: "pt_onboarding_specialist",
    personaName: "Sam Foster",
    name: "Onboarding Specialist",
    shortDescription: "Onboarding specialist",
    role: "Onboarding Specialist",
    context: null,
    goals: null,
    needs: null,
    painPoints: null,
    notes: null,
    avatarUrl: null,
    segmentId: "seg_customer_facing",
  },
  {
    id: "pt_product_owner",
    personaName: "Nina Okonkwo",
    name: "Product Owner",
    shortDescription: "Product owner",
    role: "Product Owner",
    context: null,
    goals: null,
    needs: null,
    painPoints: null,
    notes: null,
    avatarUrl: null,
    segmentId: "seg_strategy",
  },
  {
    id: "pt_service_designer",
    personaName: "James Park",
    name: "Service Designer",
    shortDescription: "Service designer",
    role: "Service Designer",
    context: null,
    goals: null,
    needs: null,
    painPoints: null,
    notes: null,
    avatarUrl: null,
    segmentId: "seg_strategy",
  },
];

export function getPersonaTemplateById(id: string): PersonaTemplate | undefined {
  return PERSONA_TEMPLATES.find((t) => t.id === id);
}

export function getTemplatesBySegment(): Map<string, PersonaTemplate[]> {
  const map = new Map<string, PersonaTemplate[]>();
  for (const seg of PERSONA_LIBRARY_SEGMENTS) {
    const templates = seg.templateIds
      .map((tid) => PERSONA_TEMPLATES.find((t) => t.id === tid))
      .filter((t): t is PersonaTemplate => !!t);
    map.set(seg.id, templates);
  }
  return map;
}
