// ============================================
// DEMO CHAT DATA & UI COPY
// All demo strings in one place for easy editing
// ============================================

// Prefilled demo persona data for the create modal
export const DEMO_PERSONA_PREFILL = {
  name: "Alex",
  shortDescription: "Busy customer",
  role: "Time-poor resident",
  context: "Alex is trying to contact the organisation about a service request and wants a quick, clear path to the right team.",
  goals: "Submit the request quickly with confidence it reached the right team.\nGet a clear confirmation and know what happens next.",
  needs: "Simple form.\nClear confirmation.\nVisibility of progress.\nMinimal back-and-forth.",
  painPoints: "Unclear where to go.\nNo status updates.\nSlow response times.\nRepeating information to different teams.",
  notes: "This is a demo persona used to illustrate how journey maps and blueprints can be improved.",
};

export const UI_COPY = {
  // Navigation
  NAV_DEMO_TOOLTIP: "Demo Mode",
  
  // AI sidebar - disabled state (non-demo)
  AI_HEADER_DISABLED: "AI Assistant",
  AI_DISABLED_TITLE: "Coming soon",
  AI_DISABLED_BODY: "AI-powered analysis will be available in a future update.",
  AI_INPUT_PLACEHOLDER_DISABLED: "Coming soon",
  
  // AI sidebar - demo mode
  AI_HEADER_DEMO: "AI Assistant (Demo)",
  AI_INPUT_PLACEHOLDER_DEMO: "Type a message...",
  AI_SUGGESTED_PROMPTS_TITLE: "Try asking:",
  
  // Generate future state
  GENERATE_HELPER_TEXT: "Ready to see how AI-assisted routing could improve this flow?",
  GENERATE_BUTTON_LABEL: "Generate future state",
  
  // Toast messages
  TOAST_TITLE: "Future state generated",
  TOAST_BODY: "New journey map and service blueprint have been added to the project.",
};

// Scripted prompts and responses
// context: which view must be open for this prompt to appear
// requiresAllCurrentState: only show future-state prompt after all current-state questions answered
export interface ScriptedPrompt {
  id: string;
  text: string;
  response: string;
  showGenerateButton?: boolean;
  visibleAfterGenerate?: boolean;
  triggersAction?: string;
  context: "journeyMap" | "blueprint" | "both"; // journeyMap = only when journey map open, blueprint = only when blueprint open, both = either
  requiresAllCurrentState?: boolean; // future-state prompt: only after all 4 current-state questions done
}

export const SCRIPTED_PROMPTS: ScriptedPrompt[] = [
  {
    id: "generate-thumbnails",
    text: "Generate thumbnails for this journey map.",
    response: `Done — I've generated thumbnails using the persona headshot and the action descriptions. Each thumbnail visualizes the customer interacting with the touchpoint at that step.`,
    triggersAction: "generate-thumbnails",
    context: "journeyMap",
  },
  {
    id: "pain-points",
    text: "Summarise the biggest pain points in this journey.",
    response: `Across the journey, the biggest pain points are:
1) Discoverability: customers struggle to find the contact entry point.
2) Ambiguity: the free-text form gives no guidance, leading to incomplete requests.
3) Uncertainty: the confirmation provides no reference or expected response time.
4) Silence: customers receive no status updates while waiting.
5) Repetition: follow-ups force customers to repeat the same context.`,
    context: "journeyMap",
  },
  {
    id: "slow-down",
    text: "Where does the process slow down in the service blueprint?",
    response: `The main slow-down happens during Triage:
- 'Manually read enquiry' relies on staff interpretation of free-text.
- 'Route to correct team' is manual and can be delayed or misassigned.
This creates follow-up loops and clarification emails, extending resolution time.`,
    context: "blueprint",
  },
  {
    id: "repetition",
    text: "Show me where the customer has to repeat themselves.",
    response: `In the journey map, repetition occurs at 'Follow up' where the customer calls or re-emails and restates context.
In the blueprint, this aligns with 'Repeat details' and the feedback connection labelled 'Rework / missing info'.`,
    context: "both",
  },
  {
    id: "future-state-journeyMap",
    text: "What would a good future state look like for this journey map if we introduced AI-assisted routing?",
    response: `A future state journey map could:
- Add guided fields to capture topic, urgency, and key details.
- Generate a reference number instantly.
- Send status updates as the enquiry moves from received → triaged → assigned → resolved.
If you'd like, I can generate a Future State Journey Map now.`,
    showGenerateButton: true,
    context: "journeyMap",
    requiresAllCurrentState: true,
  },
  {
    id: "future-state-blueprint",
    text: "What would a good future state look like for this service blueprint if we introduced AI-assisted routing?",
    response: `A future state blueprint could:
- Auto-triage and route to the correct team based on intent.
- Shift from manual interpretation to AI-assisted routing.
- Reduce clarification loops and rework.
If you'd like, I can generate a Future State Service Blueprint now.`,
    showGenerateButton: true,
    context: "blueprint",
    requiresAllCurrentState: true,
  },
  {
    id: "changes",
    text: "Explain what changed between current and future state.",
    response: `Key changes:
- The form becomes guided, reducing ambiguity.
- A reference number and ETA remove uncertainty.
- Triage and routing shift from manual interpretation to AI-assisted routing.
- Status updates reduce follow-up behaviour.
- Clarification becomes the exception, not the default.`,
    visibleAfterGenerate: true,
    context: "both",
  },
];

// AI-suggested pain points (demo mode) - from pain-points scripted response
export const DEMO_PAIN_POINT_SUGGESTIONS = [
  { text: "Discoverability: customers struggle to find the contact entry point", severity: "HIGH" as const },
  { text: "Ambiguity: the free-text form gives no guidance, leading to incomplete requests", severity: "HIGH" as const },
  { text: "Uncertainty: the confirmation provides no reference or expected response time", severity: "MEDIUM" as const },
  { text: "Silence: customers receive no status updates while waiting", severity: "HIGH" as const },
  { text: "Repetition: follow-ups force customers to repeat the same context", severity: "MEDIUM" as const },
];

// AI-suggested opportunities (demo mode) - from future-state scripted response
export const DEMO_OPPORTUNITY_SUGGESTIONS = [
  { text: "Add guided fields to capture topic, urgency, and key details", impact: "HIGH" as const },
  { text: "Generate a reference number instantly", impact: "MEDIUM" as const },
  { text: "Auto-triage and route to the correct team based on intent", impact: "HIGH" as const },
  { text: "Send status updates as the enquiry moves through stages", impact: "HIGH" as const },
  { text: "Reduce clarification to the exception, not the default", impact: "MEDIUM" as const },
];

// Demo onboarding answers — populate on focus in demo mode (keys match scriptedProvider QUESTIONS)
export const DEMO_ONBOARDING_ANSWERS: Record<
  "journeyMap" | "blueprint",
  Record<string, string>
> = {
  journeyMap: {
    name: "Contact Enquiry Journey",
    persona: "Alex",
    description:
      "A customer tries to contact the organisation about a service request, submits via a web form, waits for a response, and may follow up if needed.",
    phases: "Submit enquiry\nWait for response\nFollow up",
    steps: "Find the contact form\nComplete the form\nReceive confirmation\nWait for response\nFollow up if needed",
    painPoints:
      "Unclear where to go.\nNo status updates.\nSlow response times.\nRepeating information to different teams.",
    opportunities:
      "Add guided fields to capture topic and urgency.\nGenerate a reference number instantly.\nSend status updates as the enquiry moves through stages.",
  },
  blueprint: {
    name: "Contact Enquiry Blueprint",
    description:
      "The service for receiving, triaging, and resolving customer contact enquiries submitted via web form.",
    phases: "Intake\nTriage\nResolution",
    steps: "Receive enquiry\nManually read enquiry\nRoute to correct team\nResolve and respond",
    physicalEvidence: "Web form\nConfirmation page\nEmail",
    customerActions: "Submit form\nWait\nFollow up",
    frontstage: "Read enquiry\nRoute to team\nRespond to customer",
    backstage: "Internal processing\nTeam assignment",
    supportProcess: "Routing rules\nSLA targets",
  },
};

// Demo future-state constraint answers (keys match FUTURE_QUESTIONS)
export const DEMO_FUTURE_ANSWERS: Record<string, string> = {
  constraints: "Limited budget. Must use existing CRM. 6-month timeline.",
  mustKeep: "Human agents for complex cases. Current team structure.",
  canChange: "Form design, triage process, status notifications.",
  successMetrics: "Faster resolution time. Fewer follow-up contacts. Higher first-contact resolution.",
};

// Demo research notes — populate on focus in demo mode (legacy, used when pasting text)
export const DEMO_RESEARCH_NOTES = `Interview with Alex (time-poor resident) — Contact enquiry journey

- Step 1: Customer looks for contact form on website
- Step 2: Finds form in footer, fills in free-text message
- Quote: "I had to scroll to the bottom to find where to contact you."
- Step 3: Submits and gets generic "We received your message" confirmation
- Pain point: No reference number or expected response time
- Step 4: Waits several days with no status update
- Pain point: Customer doesn't know if it reached the right team
- Step 5: Calls to follow up, has to repeat entire story
- Opportunity: Could add guided fields and instant reference number
- Opportunity: Status updates would reduce follow-up calls`;

// Demo mock upload files — injected when user clicks upload area in demo mode
export const DEMO_MOCK_UPLOAD_FILES: { name: string; content: string }[] = [
  {
    name: "p1_summary.txt",
    content: `Interview summary — Participant 1 (Alex, time-poor resident)

Phase: Submit enquiry
- Step: Looked for contact form on website
- Step: Found form in footer, completed free-text message
- Quote: "I had to scroll to the bottom to find where to contact you."
- Pain point: No reference number after submitting
- Step: Received generic confirmation only

Phase: Wait for response
- Step: Waited several days
- Pain point: No status updates, didn't know if it reached the right team

Phase: Follow up
- Step: Called to follow up, had to repeat entire story
- Opportunity: Status updates would reduce follow-up calls`,
  },
  {
    name: "p2_transcript.txt",
    content: `Interview transcript — Participant 2

Phase: Submit enquiry
- Step: Searched website for contact option
- Step: Filled in the form
- Quote: "I hope I'm giving the right information."
- Pain point: Form gives no guidance on what to include
- Opportunity: Guided fields could help

Phase: Wait for response
- Pain point: Slow response times
- Step: Checked email daily, heard nothing

Phase: Follow up
- Step: Re-emailed with same details
- Opportunity: Reference number would help track progress`,
  },
];
