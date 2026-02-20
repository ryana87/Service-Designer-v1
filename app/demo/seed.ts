import { prisma } from "../lib/db";
import { DEMO_PROJECT_ID, DEMO_PROJECT_NAME, DEMO_PROJECT_DESCRIPTION } from "./constants";
import { getPersonaTemplateById, PERSONA_TEMPLATE_ID_FRONTLINE } from "../lib/persona-library";

// ============================================
// SEED DEMO ACTION
// Idempotent: deletes and recreates demo data on every call
// ============================================

export async function seedDemo(): Promise<{ projectId: string }> {
  // Step 1: Delete existing demo project if it exists (cascades to personas, journey maps, etc.)
  await prisma.project.deleteMany({
    where: { id: DEMO_PROJECT_ID }
  });

  // Step 2: Create demo project (ownerId null so any logged-in demo user can run actions)
  const project = await prisma.project.create({
    data: {
      id: DEMO_PROJECT_ID,
      name: DEMO_PROJECT_NAME,
      description: DEMO_PROJECT_DESCRIPTION,
      ownerId: null,
    }
  });

  // Step 3: Add Frontline Service Specialist persona from library (for scripted Persona Chat)
  const frontlineTemplate = getPersonaTemplateById(PERSONA_TEMPLATE_ID_FRONTLINE);
  if (frontlineTemplate) {
    await prisma.persona.create({
      data: {
        name: frontlineTemplate.name,
        shortDescription: frontlineTemplate.shortDescription,
        role: frontlineTemplate.role,
        context: frontlineTemplate.context,
        goals: frontlineTemplate.goals,
        needs: frontlineTemplate.needs,
        painPoints: frontlineTemplate.painPoints,
        notes: frontlineTemplate.notes,
        avatarUrl: frontlineTemplate.avatarUrl,
        templateId: frontlineTemplate.id,
        projectId: project.id,
      },
    });
  }

  return { projectId: project.id };
}

// ============================================
// HELPER: Serialize pain points
// ============================================

function serializePainPoints(points: Array<{ text: string; severity: "LOW" | "MEDIUM" | "HIGH" }>): string {
  return JSON.stringify(points);
}

function serializeOpportunities(opps: Array<{ text: string; impact: "LOW" | "MEDIUM" | "HIGH" }>): string {
  return JSON.stringify(opps);
}

// ============================================
// CURRENT STATE JOURNEY MAP
// ============================================

async function createCurrentStateJourneyMap(projectId: string, personaId: string | null) {
  const journeyMap = await prisma.journeyMap.create({
    data: {
      id: "demo_jm_current",
      name: "Current State — Contact Enquiry",
      persona: personaId ? "Alex (busy customer)" : null,
      personaId: personaId,
      sortOrder: 0,
      projectId,
    }
  });

  // Phase 1: Submit enquiry
  const phase1 = await prisma.journeyPhase.create({
    data: {
      id: "demo_jm_phase_1",
      order: 0,
      title: "Submit enquiry",
      timeframe: "2–5 minutes",
      journeyMapId: journeyMap.id,
    }
  });

  // Action 1
  const action1 = await prisma.journeyAction.create({
    data: {
      id: "demo_jm_action_1",
      order: 0,
      title: "Find the contact form",
      description: "Customer navigates the website to locate the general contact form.",
      thought: "Where do I actually ask this?",
      channel: "Web",
      touchpoint: "Homepage",
      emotion: 3,
      painPoints: serializePainPoints([
        { text: "The 'Contact us' link is not obvious and is buried in the footer.", severity: "MEDIUM" }
      ]),
      opportunities: serializeOpportunities([
        { text: "Add a prominent 'Contact us' entry point in the primary navigation.", impact: "MEDIUM" }
      ]),
      phaseId: phase1.id,
    }
  });
  await prisma.journeyQuote.create({
    data: {
      quoteText: "I had to scroll to the bottom to find where to contact you.",
      source: "Interview note",
      actionId: action1.id,
    }
  });

  // Action 2
  const action2 = await prisma.journeyAction.create({
    data: {
      id: "demo_jm_action_2",
      order: 1,
      title: "Complete the form",
      description: "Customer enters details and writes a message in a single free-text field.",
      thought: "I hope I'm giving the right information.",
      channel: "Web",
      touchpoint: "Form",
      emotion: 3,
      painPoints: serializePainPoints([
        { text: "The form gives no guidance on what information to include.", severity: "MEDIUM" }
      ]),
      opportunities: serializeOpportunities([
        { text: "Add guided fields (topic, urgency, reference number) to reduce ambiguity.", impact: "HIGH" }
      ]),
      phaseId: phase1.id,
    }
  });
  await prisma.journeyQuote.create({
    data: {
      quoteText: "I wasn't sure what to write, so I just guessed.",
      source: "Interview note",
      actionId: action2.id,
    }
  });

  // Action 3
  const action3 = await prisma.journeyAction.create({
    data: {
      id: "demo_jm_action_3",
      order: 2,
      title: "Submit and wait",
      description: "Customer submits the form and receives a generic confirmation.",
      thought: "Did that actually go through?",
      channel: "Web",
      touchpoint: "Notification",
      emotion: 2,
      painPoints: serializePainPoints([
        { text: "Confirmation message is generic and provides no tracking or expected response time.", severity: "HIGH" }
      ]),
      opportunities: serializeOpportunities([
        { text: "Provide a reference number and an expected response window.", impact: "HIGH" }
      ]),
      phaseId: phase1.id,
    }
  });
  await prisma.journeyQuote.create({
    data: {
      quoteText: "It just said 'Thanks' — I didn't know what happens next.",
      source: "Interview note",
      actionId: action3.id,
    }
  });

  // Phase 2: Wait for response
  const phase2 = await prisma.journeyPhase.create({
    data: {
      id: "demo_jm_phase_2",
      order: 1,
      title: "Wait for response",
      timeframe: "1–3 days",
      journeyMapId: journeyMap.id,
    }
  });

  // Action 4
  const action4 = await prisma.journeyAction.create({
    data: {
      id: "demo_jm_action_4",
      order: 0,
      title: "Check inbox",
      description: "Customer repeatedly checks email for an update.",
      thought: "Maybe they missed it.",
      channel: "Email",
      touchpoint: "Notification",
      emotion: 2,
      painPoints: serializePainPoints([
        { text: "No updates are sent until someone replies.", severity: "HIGH" }
      ]),
      opportunities: serializeOpportunities([
        { text: "Send status updates when the enquiry is received, triaged, and assigned.", impact: "HIGH" }
      ]),
      phaseId: phase2.id,
    }
  });
  await prisma.journeyQuote.create({
    data: {
      quoteText: "I kept refreshing my inbox because I had no idea if anyone saw it.",
      source: "Interview note",
      actionId: action4.id,
    }
  });

  // Action 5
  const action5 = await prisma.journeyAction.create({
    data: {
      id: "demo_jm_action_5",
      order: 1,
      title: "Follow up",
      description: "Customer calls or re-emails to chase progress and repeats context.",
      thought: "I shouldn't have to explain this again.",
      channel: "Phone",
      touchpoint: "Support",
      emotion: 2,
      painPoints: serializePainPoints([
        { text: "Customer must repeat the same information because there is no reference context.", severity: "HIGH" }
      ]),
      opportunities: serializeOpportunities([
        { text: "Use the reference number to surface the original enquiry context instantly.", impact: "HIGH" }
      ]),
      phaseId: phase2.id,
    }
  });
  await prisma.journeyQuote.create({
    data: {
      quoteText: "I had to tell the whole story again.",
      source: "Interview note",
      actionId: action5.id,
    }
  });

  // Action 6
  const action6 = await prisma.journeyAction.create({
    data: {
      id: "demo_jm_action_6",
      order: 2,
      title: "Receive response",
      description: "Customer receives a final response and decides whether it's resolved.",
      thought: "I hope they understood what I needed.",
      channel: "Email",
      touchpoint: "Notification",
      emotion: 3,
      painPoints: serializePainPoints([
        { text: "Responses can be delayed or incomplete depending on who picked it up.", severity: "MEDIUM" }
      ]),
      opportunities: serializeOpportunities([
        { text: "Route enquiries to the right team first time and standardise response templates.", impact: "MEDIUM" }
      ]),
      phaseId: phase2.id,
    }
  });
  await prisma.journeyQuote.create({
    data: {
      quoteText: "It depended who replied — sometimes it was great, sometimes not.",
      source: "Interview note",
      actionId: action6.id,
    }
  });
}

// ============================================
// CURRENT STATE BLUEPRINT
// ============================================

async function createCurrentStateBlueprint(projectId: string) {
  const blueprint = await prisma.serviceBlueprint.create({
    data: {
      id: "demo_bp_current",
      name: "Current State — Contact Enquiry Handling",
      sortOrder: 0,
      projectId,
    }
  });

  // Create teams
  const teamCustomerSupport = await prisma.blueprintTeam.create({
    data: {
      id: "demo_team_cs",
      name: "Customer Support",
      iconName: "support_agent",
      colorHex: "#2563EB",
      blueprintId: blueprint.id,
    }
  });

  const teamBackOffice = await prisma.blueprintTeam.create({
    data: {
      id: "demo_team_bo",
      name: "Back Office",
      iconName: "inventory_2",
      colorHex: "#7C3AED",
      blueprintId: blueprint.id,
    }
  });

  // Create software services
  const swEmail = await prisma.softwareService.create({
    data: {
      id: "demo_sw_email",
      label: "Email",
      colorHex: "#D1FAE5",
      blueprintId: blueprint.id,
    }
  });

  const swTicketing = await prisma.softwareService.create({
    data: {
      id: "demo_sw_ticketing",
      label: "Ticketing",
      colorHex: "#E0E7FF",
      blueprintId: blueprint.id,
    }
  });

  const swKnowledgeBase = await prisma.softwareService.create({
    data: {
      id: "demo_sw_kb",
      label: "Knowledge base",
      colorHex: "#FEF3C7",
      blueprintId: blueprint.id,
    }
  });

  // Create phases
  const phase1 = await prisma.blueprintPhase.create({
    data: {
      id: "demo_bp_phase_1",
      order: 0,
      title: "Submit",
      timeframe: "Minutes",
      blueprintId: blueprint.id,
    }
  });

  const phase2 = await prisma.blueprintPhase.create({
    data: {
      id: "demo_bp_phase_2",
      order: 1,
      title: "Triage",
      timeframe: "Hours–Days",
      blueprintId: blueprint.id,
    }
  });

  const phase3 = await prisma.blueprintPhase.create({
    data: {
      id: "demo_bp_phase_3",
      order: 2,
      title: "Resolve",
      timeframe: "Same day",
      blueprintId: blueprint.id,
    }
  });

  // Create columns
  const col1 = await prisma.blueprintColumn.create({
    data: {
      id: "demo_bp_col_1",
      order: 0,
      phaseId: phase1.id,
      blueprintId: blueprint.id,
    }
  });

  const col2 = await prisma.blueprintColumn.create({
    data: {
      id: "demo_bp_col_2",
      order: 0,
      phaseId: phase2.id,
      blueprintId: blueprint.id,
    }
  });

  const col3 = await prisma.blueprintColumn.create({
    data: {
      id: "demo_bp_col_3",
      order: 1,
      phaseId: phase2.id,
      blueprintId: blueprint.id,
    }
  });

  // Col 3b: New column for backstage routing (to satisfy Frontstage/Backstage exclusivity rule)
  const col3b = await prisma.blueprintColumn.create({
    data: {
      id: "demo_bp_col_3b",
      order: 2,
      phaseId: phase2.id,
      blueprintId: blueprint.id,
    }
  });

  const col4 = await prisma.blueprintColumn.create({
    data: {
      id: "demo_bp_col_4",
      order: 0,
      phaseId: phase3.id,
      blueprintId: blueprint.id,
    }
  });

  // Col 5: Separate column for customer receiving/reading outcome (time progresses left-to-right)
  const col5 = await prisma.blueprintColumn.create({
    data: {
      id: "demo_bp_col_5",
      order: 1,
      phaseId: phase3.id,
      blueprintId: blueprint.id,
    }
  });

  // Add more columns for demonstration
  const col6 = await prisma.blueprintColumn.create({
    data: {
      id: "demo_bp_col_6",
      order: 2,
      phaseId: phase3.id,
      blueprintId: blueprint.id,
    }
  });

  const col7 = await prisma.blueprintColumn.create({
    data: {
      id: "demo_bp_col_7",
      order: 3,
      phaseId: phase3.id,
      blueprintId: blueprint.id,
    }
  });

  const col8 = await prisma.blueprintColumn.create({
    data: {
      id: "demo_bp_col_8",
      order: 4,
      phaseId: phase3.id,
      blueprintId: blueprint.id,
    }
  });

  // ============================================
  // PHYSICAL EVIDENCE LANE (Basic cards)
  // ============================================

  await prisma.blueprintBasicCard.create({
    data: {
      id: "demo_pe_col1",
      order: 0,
      laneType: "PHYSICAL_EVIDENCE",
      title: "Contact form page",
      description: "General enquiry form with a single free-text message field.",
      columnId: col1.id,
    }
  });

  await prisma.blueprintBasicCard.create({
    data: {
      id: "demo_pe_col2",
      order: 0,
      laneType: "PHYSICAL_EVIDENCE",
      title: "No status updates",
      description: "Customer sees nothing change after submitting.",
      columnId: col2.id,
    }
  });

  await prisma.blueprintBasicCard.create({
    data: {
      id: "demo_pe_col3",
      order: 0,
      laneType: "PHYSICAL_EVIDENCE",
      title: "Clarification request",
      description: "Customer receives request for more info.",
      columnId: col3.id,
    }
  });

  await prisma.blueprintBasicCard.create({
    data: {
      id: "demo_pe_col3b",
      order: 0,
      laneType: "PHYSICAL_EVIDENCE",
      title: "Internal routing",
      description: "Enquiry is routed internally (not visible to customer).",
      columnId: col3b.id,
    }
  });

  await prisma.blueprintBasicCard.create({
    data: {
      id: "demo_pe_col4",
      order: 0,
      laneType: "PHYSICAL_EVIDENCE",
      title: "Email sent",
      description: "Resolution email is dispatched.",
      columnId: col4.id,
    }
  });

  await prisma.blueprintBasicCard.create({
    data: {
      id: "demo_pe_col5",
      order: 0,
      laneType: "PHYSICAL_EVIDENCE",
      title: "Email received",
      description: "Customer receives the final answer in their inbox.",
      columnId: col5.id,
    }
  });

  await prisma.blueprintBasicCard.create({
    data: {
      id: "demo_pe_col6",
      order: 0,
      laneType: "PHYSICAL_EVIDENCE",
      title: "Satisfaction survey",
      description: "Customer receives follow-up survey email.",
      columnId: col6.id,
    }
  });

  await prisma.blueprintBasicCard.create({
    data: {
      id: "demo_pe_col7",
      order: 0,
      laneType: "PHYSICAL_EVIDENCE",
      title: "Feedback form",
      description: "Simple star rating and comment field.",
      columnId: col7.id,
    }
  });

  await prisma.blueprintBasicCard.create({
    data: {
      id: "demo_pe_col8",
      order: 0,
      laneType: "PHYSICAL_EVIDENCE",
      title: "Thank you message",
      description: "Automated thank you after feedback submission.",
      columnId: col8.id,
    }
  });

  // ============================================
  // CUSTOMER ACTION LANE (Basic + Decision cards)
  // ============================================

  const caCard1 = await prisma.blueprintBasicCard.create({
    data: {
      id: "demo_ca_col1",
      order: 0,
      laneType: "CUSTOMER_ACTION",
      title: "Submit enquiry",
      description: "Customer submits the form.",
      isStart: true,
      columnId: col1.id,
    }
  });

  // Decision card in col2
  const decisionFollowUp = await prisma.blueprintDecisionCard.create({
    data: {
      id: "demo_ca_decision_followup",
      order: 0,
      laneType: "CUSTOMER_ACTION",
      title: "Follow up?",
      question: "Customer decides whether to wait or chase progress.",
      description: "Customer decides whether to wait or chase progress.",
      columnId: col2.id,
      blueprintId: blueprint.id,
    }
  });

  const caCard3 = await prisma.blueprintBasicCard.create({
    data: {
      id: "demo_ca_col3",
      order: 0,
      laneType: "CUSTOMER_ACTION",
      title: "Repeat details",
      description: "Customer repeats the same context when they call or re-email.",
      columnId: col3.id,
    }
  });

  // Note: "Read outcome" is in col5 (separate from col4 "Send resolution")
  // to enforce column-first flow: time progression must be left-to-right
  const caCard4 = await prisma.blueprintBasicCard.create({
    data: {
      id: "demo_ca_col5",
      order: 0,
      laneType: "CUSTOMER_ACTION",
      title: "Read outcome",
      description: "Customer reads the response and decides if resolved.",
      columnId: col5.id,
    }
  });

  const caCard6 = await prisma.blueprintBasicCard.create({
    data: {
      id: "demo_ca_col6",
      order: 0,
      laneType: "CUSTOMER_ACTION",
      title: "Receive survey",
      description: "Customer gets satisfaction survey email.",
      columnId: col6.id,
    }
  });

  const caCard7 = await prisma.blueprintBasicCard.create({
    data: {
      id: "demo_ca_col7",
      order: 0,
      laneType: "CUSTOMER_ACTION",
      title: "Provide feedback",
      description: "Customer rates experience and adds comments.",
      columnId: col7.id,
    }
  });

  const caCard8 = await prisma.blueprintBasicCard.create({
    data: {
      id: "demo_ca_col8",
      order: 0,
      laneType: "CUSTOMER_ACTION",
      title: "Complete",
      description: "Customer journey ends with closure.",
      isEnd: true,
      columnId: col8.id,
    }
  });

  // ============================================
  // FRONTSTAGE ACTION LANE (Complex cards under team sections)
  // ============================================

  // Col 1: Customer Support
  const fsSection1 = await prisma.teamSection.create({
    data: {
      id: "demo_fs_section_col1",
      order: 0,
      laneType: "FRONTSTAGE_ACTION",
      columnId: col1.id,
      teamId: teamCustomerSupport.id,
      blueprintId: blueprint.id,
    }
  });
  const fsCard1 = await prisma.blueprintComplexCard.create({
    data: {
      id: "demo_fs_card_col1",
      order: 0,
      title: "Send generic confirmation",
      description: "A generic confirmation is sent with no tracking.",
      painPoints: serializePainPoints([
        { text: "Confirmation does not include a reference number.", severity: "HIGH" }
      ]),
      softwareIds: JSON.stringify([swEmail.id]),
      teamSectionId: fsSection1.id,
    }
  });

  // Col 2: Customer Support
  const fsSection2 = await prisma.teamSection.create({
    data: {
      id: "demo_fs_section_col2",
      order: 0,
      laneType: "FRONTSTAGE_ACTION",
      columnId: col2.id,
      teamId: teamCustomerSupport.id,
      blueprintId: blueprint.id,
    }
  });
  const fsCard2 = await prisma.blueprintComplexCard.create({
    data: {
      id: "demo_fs_card_col2",
      order: 0,
      title: "Manually read enquiry",
      description: "Staff scan the message to understand intent.",
      painPoints: serializePainPoints([
        { text: "Free-text enquiries take time to interpret.", severity: "HIGH" }
      ]),
      softwareIds: JSON.stringify([swTicketing.id]),
      teamSectionId: fsSection2.id,
    }
  });

  // Col 3: Customer Support
  const fsSection3 = await prisma.teamSection.create({
    data: {
      id: "demo_fs_section_col3",
      order: 0,
      laneType: "FRONTSTAGE_ACTION",
      columnId: col3.id,
      teamId: teamCustomerSupport.id,
      blueprintId: blueprint.id,
    }
  });
  const fsCard3 = await prisma.blueprintComplexCard.create({
    data: {
      id: "demo_fs_card_col3",
      order: 0,
      title: "Ask for clarification",
      description: "Staff email back to request missing info.",
      painPoints: serializePainPoints([
        { text: "Back-and-forth increases resolution time.", severity: "MEDIUM" }
      ]),
      softwareIds: JSON.stringify([swEmail.id]),
      teamSectionId: fsSection3.id,
    }
  });

  // Col 4: Customer Support
  const fsSection4 = await prisma.teamSection.create({
    data: {
      id: "demo_fs_section_col4",
      order: 0,
      laneType: "FRONTSTAGE_ACTION",
      columnId: col4.id,
      teamId: teamCustomerSupport.id,
      blueprintId: blueprint.id,
    }
  });
  const fsCard4 = await prisma.blueprintComplexCard.create({
    data: {
      id: "demo_fs_card_col4",
      order: 0,
      title: "Send resolution",
      description: "Staff send final response.",
      painPoints: serializePainPoints([
        { text: "Quality varies depending on who responds.", severity: "MEDIUM" }
      ]),
      softwareIds: JSON.stringify([swEmail.id, swKnowledgeBase.id]),
      teamSectionId: fsSection4.id,
    }
  });

  // Col 6: Customer Support (Follow-up)
  const fsSection6 = await prisma.teamSection.create({
    data: {
      id: "demo_fs_section_col6",
      order: 0,
      laneType: "FRONTSTAGE_ACTION",
      columnId: col6.id,
      teamId: teamCustomerSupport.id,
      blueprintId: blueprint.id,
    }
  });
  const fsCard6 = await prisma.blueprintComplexCard.create({
    data: {
      id: "demo_fs_card_col6",
      order: 0,
      title: "Send satisfaction survey",
      description: "Automated email sent 24 hours after resolution.",
      painPoints: serializePainPoints([
        { text: "Low response rate from generic surveys.", severity: "LOW" }
      ]),
      softwareIds: JSON.stringify([swEmail.id]),
      teamSectionId: fsSection6.id,
    }
  });

  // Col 7: Customer Support (Feedback)
  const fsSection7 = await prisma.teamSection.create({
    data: {
      id: "demo_fs_section_col7",
      order: 0,
      laneType: "FRONTSTAGE_ACTION",
      columnId: col7.id,
      teamId: teamCustomerSupport.id,
      blueprintId: blueprint.id,
    }
  });
  const fsCard7 = await prisma.blueprintComplexCard.create({
    data: {
      id: "demo_fs_card_col7",
      order: 0,
      title: "Receive feedback",
      description: "Customer ratings captured in system.",
      painPoints: serializePainPoints([
        { text: "Feedback not always reviewed or acted upon.", severity: "MEDIUM" }
      ]),
      softwareIds: JSON.stringify([swTicketing.id]),
      teamSectionId: fsSection7.id,
    }
  });

  // ============================================
  // BACKSTAGE ACTION LANE (Complex cards under team sections)
  // Note: Backstage content is in col3b (separate from Frontstage col3) 
  // to satisfy the Frontstage/Backstage exclusivity rule per column
  // ============================================

  // Col 3b: Back Office (routing step)
  const bsSection3b = await prisma.teamSection.create({
    data: {
      id: "demo_bs_section_col3b",
      order: 0,
      laneType: "BACKSTAGE_ACTION",
      columnId: col3b.id,
      teamId: teamBackOffice.id,
      blueprintId: blueprint.id,
    }
  });
  const bsCard3b = await prisma.blueprintComplexCard.create({
    data: {
      id: "demo_bs_card_col3b",
      order: 0,
      title: "Route to correct team",
      description: "Staff forward or reassign the enquiry manually.",
      painPoints: serializePainPoints([
        { text: "Manual routing causes delays and misassignment.", severity: "HIGH" }
      ]),
      softwareIds: JSON.stringify([swTicketing.id]),
      teamSectionId: bsSection3b.id,
    }
  });

  // Col 8: Back Office (Analytics)
  const bsSection8 = await prisma.teamSection.create({
    data: {
      id: "demo_bs_section_col8",
      order: 0,
      laneType: "BACKSTAGE_ACTION",
      columnId: col8.id,
      teamId: teamBackOffice.id,
      blueprintId: blueprint.id,
    }
  });
  const bsCard8 = await prisma.blueprintComplexCard.create({
    data: {
      id: "demo_bs_card_col8",
      order: 0,
      title: "Analyze feedback trends",
      description: "Data team reviews satisfaction scores and identifies patterns.",
      painPoints: serializePainPoints([
        { text: "Analysis done manually each month.", severity: "MEDIUM" }
      ]),
      softwareIds: JSON.stringify([swTicketing.id]),
      teamSectionId: bsSection8.id,
    }
  });

  // ============================================
  // SUPPORT PROCESS LANE (Basic cards)
  // ============================================

  await prisma.blueprintBasicCard.create({
    data: {
      id: "demo_sp_col2",
      order: 0,
      laneType: "SUPPORT_PROCESS",
      title: "Manual triage checklist",
      description: "Staff rely on experience to decide who should handle it.",
      columnId: col2.id,
    }
  });

  await prisma.blueprintBasicCard.create({
    data: {
      id: "demo_sp_col3",
      order: 0,
      laneType: "SUPPORT_PROCESS",
      title: "Ticketing system",
      description: "Enquiry is copied or forwarded into a ticket.",
      columnId: col3.id,
    }
  });

  await prisma.blueprintBasicCard.create({
    data: {
      id: "demo_sp_col4",
      order: 0,
      laneType: "SUPPORT_PROCESS",
      title: "Knowledge base lookup",
      description: "Staff search articles to craft a response.",
      columnId: col4.id,
    }
  });

  await prisma.blueprintBasicCard.create({
    data: {
      id: "demo_sp_col6",
      order: 0,
      laneType: "SUPPORT_PROCESS",
      title: "Survey automation",
      description: "Scheduled task triggers survey emails.",
      columnId: col6.id,
    }
  });

  await prisma.blueprintBasicCard.create({
    data: {
      id: "demo_sp_col7",
      order: 0,
      laneType: "SUPPORT_PROCESS",
      title: "Feedback database",
      description: "Responses stored for analysis.",
      columnId: col7.id,
    }
  });

  await prisma.blueprintBasicCard.create({
    data: {
      id: "demo_sp_col8",
      order: 0,
      laneType: "SUPPORT_PROCESS",
      title: "Analytics dashboard",
      description: "Reporting tools for trend analysis.",
      columnId: col8.id,
    }
  });

  // ============================================
  // CONNECTORS
  // ============================================

  // Connection 1: Customer Action col1 -> Frontstage col2 (left-to-right)
  await prisma.blueprintConnection.create({
    data: {
      blueprintId: blueprint.id,
      sourceCardId: caCard1.id,
      sourceCardType: "basic",
      targetCardId: fsCard2.id,
      targetCardType: "complex",
      connectorType: "standard",
      arrowDirection: "forward",
      strokeWeight: "normal",
      strokePattern: "solid",
      strokeColor: "grey",
    }
  });

  // Connection 2: Frontstage col2 -> Backstage col3b (left-to-right)
  await prisma.blueprintConnection.create({
    data: {
      blueprintId: blueprint.id,
      sourceCardId: fsCard2.id,
      sourceCardType: "complex",
      targetCardId: bsCard3b.id,
      targetCardType: "complex",
      connectorType: "dependency",
      arrowDirection: "forward",
      strokeWeight: "normal",
      strokePattern: "dashed",
      strokeColor: "grey",
    }
  });

  // Connection 3: Backstage col3b -> Frontstage col4 (left-to-right)
  await prisma.blueprintConnection.create({
    data: {
      blueprintId: blueprint.id,
      sourceCardId: bsCard3b.id,
      sourceCardType: "complex",
      targetCardId: fsCard4.id,
      targetCardType: "complex",
      connectorType: "standard",
      arrowDirection: "forward",
      strokeWeight: "normal",
      strokePattern: "solid",
      strokeColor: "grey",
    }
  });

  // Connection 4: Decision col2 -> Customer Action col3 (Yes - green)
  await prisma.blueprintConnection.create({
    data: {
      blueprintId: blueprint.id,
      sourceCardId: decisionFollowUp.id,
      sourceCardType: "decision",
      targetCardId: caCard3.id,
      targetCardType: "basic",
      connectorType: "standard",
      label: "Yes",
      arrowDirection: "forward",
      strokeWeight: "normal",
      strokePattern: "solid",
      strokeColor: "green",
    }
  });

  // 5) Decision "Follow up?" -> Customer Action "Read outcome" (No - red)
  await prisma.blueprintConnection.create({
    data: {
      blueprintId: blueprint.id,
      sourceCardId: decisionFollowUp.id,
      sourceCardType: "decision",
      targetCardId: caCard4.id,
      targetCardType: "basic",
      connectorType: "standard",
      label: "No",
      arrowDirection: "forward",
      strokeWeight: "normal",
      strokePattern: "solid",
      strokeColor: "red",
    }
  });

  // Note: Removed same-column connections per new rules
  // Connection 6: Customer Action col3 -> Frontstage col4 (left-to-right)
  await prisma.blueprintConnection.create({
    data: {
      blueprintId: blueprint.id,
      sourceCardId: caCard3.id,
      sourceCardType: "basic",
      targetCardId: fsCard4.id,
      targetCardType: "complex",
      connectorType: "standard",
      arrowDirection: "forward",
      strokeWeight: "normal",
      strokePattern: "solid",
      strokeColor: "grey",
    }
  });

  // Connection 7: Frontstage col4 "Send resolution" -> Customer Action col5 "Read outcome" (left-to-right)
  await prisma.blueprintConnection.create({
    data: {
      blueprintId: blueprint.id,
      sourceCardId: fsCard4.id,
      sourceCardType: "complex",
      targetCardId: caCard4.id,
      targetCardType: "basic",
      connectorType: "standard",
      arrowDirection: "forward",
      strokeWeight: "normal",
      strokePattern: "solid",
      strokeColor: "grey",
    }
  });
}

// ============================================
// GENERATE FUTURE STATE
// ============================================

export type FutureStateType = "journeyMap" | "blueprint" | "both";

export async function generateFutureState(type: FutureStateType = "both"): Promise<void> {
  const persona = await prisma.persona.findFirst({
    where: { projectId: DEMO_PROJECT_ID },
  });

  if (type === "journeyMap" || type === "both") {
    const existing = await prisma.journeyMap.findUnique({ where: { id: "demo_jm_future" } });
    if (!existing) {
      await createFutureStateJourneyMap(DEMO_PROJECT_ID, persona?.id || null);
    }
  }

  if (type === "blueprint" || type === "both") {
    const existing = await prisma.serviceBlueprint.findUnique({ where: { id: "demo_bp_future" } });
    if (!existing) {
      await createFutureStateBlueprint(DEMO_PROJECT_ID);
    }
  }
}

async function createFutureStateJourneyMap(projectId: string, personaId: string | null) {
  const journeyMap = await prisma.journeyMap.create({
    data: {
      id: "demo_jm_future",
      name: "Future State — AI-Assisted Enquiry",
      persona: personaId ? "Alex (busy customer)" : null,
      personaId: personaId,
      sortOrder: 1,
      projectId,
    }
  });

  // Phase 1: Submit enquiry
  const phase1 = await prisma.journeyPhase.create({
    data: {
      id: "demo_jm_future_phase_1",
      order: 0,
      title: "Submit enquiry",
      timeframe: "2–3 minutes",
      journeyMapId: journeyMap.id,
    }
  });

  // Action 1
  const action1 = await prisma.journeyAction.create({
    data: {
      order: 0,
      title: "Open contact",
      description: "Customer finds a clear 'Contact' entry point in the navigation.",
      thought: "That was easy.",
      channel: "Web",
      touchpoint: "Homepage",
      emotion: 4,
      painPoints: null,
      opportunities: serializeOpportunities([
        { text: "Keep a single, consistent contact entry point across the site.", impact: "HIGH" }
      ]),
      phaseId: phase1.id,
    }
  });
  await prisma.journeyQuote.create({
    data: {
      quoteText: "I found it straight away.",
      source: "Interview note",
      actionId: action1.id,
    }
  });

  // Action 2
  const action2 = await prisma.journeyAction.create({
    data: {
      order: 1,
      title: "Guided form",
      description: "Customer selects a topic and urgency and enters details in structured fields.",
      thought: "This is telling me exactly what to provide.",
      channel: "Web",
      touchpoint: "Form",
      emotion: 4,
      painPoints: null,
      opportunities: serializeOpportunities([
        { text: "Use guided fields to reduce back-and-forth.", impact: "HIGH" }
      ]),
      phaseId: phase1.id,
    }
  });
  await prisma.journeyQuote.create({
    data: {
      quoteText: "It asked the right questions.",
      source: "Interview note",
      actionId: action2.id,
    }
  });

  // Action 3
  const action3 = await prisma.journeyAction.create({
    data: {
      order: 2,
      title: "Instant confirmation",
      description: "Customer receives a reference number and an expected response window.",
      thought: "Great — I can track it.",
      channel: "Web",
      touchpoint: "Notification",
      emotion: 4,
      painPoints: null,
      opportunities: serializeOpportunities([
        { text: "Provide reference + ETA every time.", impact: "HIGH" }
      ]),
      phaseId: phase1.id,
    }
  });
  await prisma.journeyQuote.create({
    data: {
      quoteText: "Now I know what happens next.",
      source: "Interview note",
      actionId: action3.id,
    }
  });

  // Phase 2: Get updates
  const phase2 = await prisma.journeyPhase.create({
    data: {
      id: "demo_jm_future_phase_2",
      order: 1,
      title: "Get updates",
      timeframe: "Same day",
      journeyMapId: journeyMap.id,
    }
  });

  // Action 4
  const action4 = await prisma.journeyAction.create({
    data: {
      order: 0,
      title: "Status updates",
      description: "Customer receives updates: received, triaged, assigned.",
      thought: "I don't need to chase.",
      channel: "Email",
      touchpoint: "Notification",
      emotion: 4,
      painPoints: null,
      opportunities: serializeOpportunities([
        { text: "Automate updates at key milestones.", impact: "HIGH" }
      ]),
      phaseId: phase2.id,
    }
  });
  await prisma.journeyQuote.create({
    data: {
      quoteText: "I didn't have to follow up.",
      source: "Interview note",
      actionId: action4.id,
    }
  });

  // Action 5
  const action5 = await prisma.journeyAction.create({
    data: {
      order: 1,
      title: "Receive answer",
      description: "Customer receives a clear response that matches their topic.",
      thought: "They understood first time.",
      channel: "Email",
      touchpoint: "Notification",
      emotion: 5,
      painPoints: null,
      opportunities: serializeOpportunities([
        { text: "Use templates + knowledge to standardise quality.", impact: "MEDIUM" }
      ]),
      phaseId: phase2.id,
    }
  });
  await prisma.journeyQuote.create({
    data: {
      quoteText: "It was the right answer straight away.",
      source: "Interview note",
      actionId: action5.id,
    }
  });
}

async function createFutureStateBlueprint(projectId: string) {
  const blueprint = await prisma.serviceBlueprint.create({
    data: {
      id: "demo_bp_future",
      name: "Future State — AI-Assisted Routing",
      sortOrder: 1,
      projectId,
    }
  });

  // Reuse team definitions
  const teamCustomerSupport = await prisma.blueprintTeam.create({
    data: {
      name: "Customer Support",
      iconName: "support_agent",
      colorHex: "#2563EB",
      blueprintId: blueprint.id,
    }
  });

  const teamBackOffice = await prisma.blueprintTeam.create({
    data: {
      name: "Back Office",
      iconName: "inventory_2",
      colorHex: "#7C3AED",
      blueprintId: blueprint.id,
    }
  });

  // Software services
  const swEmail = await prisma.softwareService.create({
    data: {
      label: "Email",
      colorHex: "#D1FAE5",
      blueprintId: blueprint.id,
    }
  });

  const swTicketing = await prisma.softwareService.create({
    data: {
      label: "Ticketing",
      colorHex: "#E0E7FF",
      blueprintId: blueprint.id,
    }
  });

  const swKnowledgeBase = await prisma.softwareService.create({
    data: {
      label: "Knowledge base",
      colorHex: "#FEF3C7",
      blueprintId: blueprint.id,
    }
  });

  // Phases (same structure as current state)
  const phase1 = await prisma.blueprintPhase.create({
    data: {
      order: 0,
      title: "Submit",
      timeframe: "Minutes",
      blueprintId: blueprint.id,
    }
  });

  const phase2 = await prisma.blueprintPhase.create({
    data: {
      order: 1,
      title: "Triage",
      timeframe: "Hours–Days",
      blueprintId: blueprint.id,
    }
  });

  const phase3 = await prisma.blueprintPhase.create({
    data: {
      order: 2,
      title: "Resolve",
      timeframe: "Same day",
      blueprintId: blueprint.id,
    }
  });

  // Columns
  const col1 = await prisma.blueprintColumn.create({
    data: {
      order: 0,
      phaseId: phase1.id,
      blueprintId: blueprint.id,
    }
  });

  const col2 = await prisma.blueprintColumn.create({
    data: {
      order: 0,
      phaseId: phase2.id,
      blueprintId: blueprint.id,
    }
  });

  const col3 = await prisma.blueprintColumn.create({
    data: {
      order: 1,
      phaseId: phase2.id,
      blueprintId: blueprint.id,
    }
  });

  const col4 = await prisma.blueprintColumn.create({
    data: {
      order: 0,
      phaseId: phase3.id,
      blueprintId: blueprint.id,
    }
  });

  // Col 5: Separate column for customer receiving/reading outcome (time progresses left-to-right)
  const col5 = await prisma.blueprintColumn.create({
    data: {
      order: 1,
      phaseId: phase3.id,
      blueprintId: blueprint.id,
    }
  });

  // PHYSICAL EVIDENCE
  await prisma.blueprintBasicCard.create({
    data: {
      order: 0,
      laneType: "PHYSICAL_EVIDENCE",
      title: "Contact form page",
      description: "Guided enquiry form with topic selection.",
      columnId: col1.id,
    }
  });

  await prisma.blueprintBasicCard.create({
    data: {
      order: 0,
      laneType: "PHYSICAL_EVIDENCE",
      title: "Status updates sent",
      description: "Customer receives progress notifications.",
      columnId: col2.id,
    }
  });

  await prisma.blueprintBasicCard.create({
    data: {
      order: 0,
      laneType: "PHYSICAL_EVIDENCE",
      title: "Reply received",
      description: "Customer receives a structured response.",
      columnId: col3.id,
    }
  });

  await prisma.blueprintBasicCard.create({
    data: {
      order: 0,
      laneType: "PHYSICAL_EVIDENCE",
      title: "Email sent",
      description: "Resolution email is dispatched.",
      columnId: col4.id,
    }
  });

  await prisma.blueprintBasicCard.create({
    data: {
      order: 0,
      laneType: "PHYSICAL_EVIDENCE",
      title: "Email received",
      description: "Customer receives the final answer in their inbox.",
      columnId: col5.id,
    }
  });

  // CUSTOMER ACTION
  const caCard1 = await prisma.blueprintBasicCard.create({
    data: {
      order: 0,
      laneType: "CUSTOMER_ACTION",
      title: "Submit enquiry (guided)",
      description: "Customer submits a guided form.",
      isStart: true,
      columnId: col1.id,
    }
  });

  // Decision card in col2
  const decisionFollowUp = await prisma.blueprintDecisionCard.create({
    data: {
      order: 0,
      laneType: "CUSTOMER_ACTION",
      title: "Follow up?",
      question: "Customer decides whether to wait or chase progress.",
      description: "Customer decides whether to wait or chase progress.",
      columnId: col2.id,
      blueprintId: blueprint.id,
    }
  });

  const caCard3 = await prisma.blueprintBasicCard.create({
    data: {
      order: 0,
      laneType: "CUSTOMER_ACTION",
      title: "Repeat details",
      description: "Customer repeats context if needed (rare).",
      columnId: col3.id,
    }
  });

  // Note: "Read outcome" is in col5 (separate from col4 "Send resolution")
  // to enforce column-first flow: time progression must be left-to-right
  const caCard4 = await prisma.blueprintBasicCard.create({
    data: {
      order: 0,
      laneType: "CUSTOMER_ACTION",
      title: "Read outcome",
      description: "Customer reads the response and confirms resolved.",
      isEnd: true,
      columnId: col5.id,
    }
  });

  // FRONTSTAGE
  const fsSection1 = await prisma.teamSection.create({
    data: {
      order: 0,
      laneType: "FRONTSTAGE_ACTION",
      columnId: col1.id,
      teamId: teamCustomerSupport.id,
      blueprintId: blueprint.id,
    }
  });
  const fsCard1 = await prisma.blueprintComplexCard.create({
    data: {
      order: 0,
      title: "Send confirmation with reference",
      description: "Confirmation includes reference number and ETA.",
      softwareIds: JSON.stringify([swEmail.id]),
      teamSectionId: fsSection1.id,
    }
  });

  const fsSection2 = await prisma.teamSection.create({
    data: {
      order: 0,
      laneType: "FRONTSTAGE_ACTION",
      columnId: col2.id,
      teamId: teamCustomerSupport.id,
      blueprintId: blueprint.id,
    }
  });
  const fsCard2 = await prisma.blueprintComplexCard.create({
    data: {
      order: 0,
      title: "Review AI triage summary",
      description: "Staff review auto-classified enquiry.",
      softwareIds: JSON.stringify([swTicketing.id]),
      teamSectionId: fsSection2.id,
    }
  });

  const fsSection3 = await prisma.teamSection.create({
    data: {
      order: 0,
      laneType: "FRONTSTAGE_ACTION",
      columnId: col3.id,
      teamId: teamCustomerSupport.id,
      blueprintId: blueprint.id,
    }
  });
  const fsCard3 = await prisma.blueprintComplexCard.create({
    data: {
      order: 0,
      title: "Ask for clarification",
      description: "Staff request missing info (if needed).",
      softwareIds: JSON.stringify([swEmail.id]),
      teamSectionId: fsSection3.id,
    }
  });

  const fsSection4 = await prisma.teamSection.create({
    data: {
      order: 0,
      laneType: "FRONTSTAGE_ACTION",
      columnId: col4.id,
      teamId: teamCustomerSupport.id,
      blueprintId: blueprint.id,
    }
  });
  const fsCard4 = await prisma.blueprintComplexCard.create({
    data: {
      order: 0,
      title: "Send resolution",
      description: "Staff send final response.",
      softwareIds: JSON.stringify([swEmail.id, swKnowledgeBase.id]),
      teamSectionId: fsSection4.id,
    }
  });

  // BACKSTAGE
  const bsSection2 = await prisma.teamSection.create({
    data: {
      order: 0,
      laneType: "BACKSTAGE_ACTION",
      columnId: col2.id,
      teamId: teamBackOffice.id,
      blueprintId: blueprint.id,
    }
  });
  const bsCard2 = await prisma.blueprintComplexCard.create({
    data: {
      order: 0,
      title: "Auto-route to correct team",
      description: "AI-assisted routing assigns to correct team.",
      softwareIds: JSON.stringify([swTicketing.id]),
      teamSectionId: bsSection2.id,
    }
  });

  // SUPPORT PROCESS
  await prisma.blueprintBasicCard.create({
    data: {
      order: 0,
      laneType: "SUPPORT_PROCESS",
      title: "AI triage + routing",
      description: "System classifies and routes automatically.",
      columnId: col2.id,
    }
  });

  await prisma.blueprintBasicCard.create({
    data: {
      order: 0,
      laneType: "SUPPORT_PROCESS",
      title: "Ticketing system",
      description: "Ticket created with full context.",
      columnId: col3.id,
    }
  });

  await prisma.blueprintBasicCard.create({
    data: {
      order: 0,
      laneType: "SUPPORT_PROCESS",
      title: "Knowledge base lookup",
      description: "AI suggests relevant articles.",
      columnId: col4.id,
    }
  });

  // CONNECTORS
  await prisma.blueprintConnection.create({
    data: {
      blueprintId: blueprint.id,
      sourceCardId: caCard1.id,
      sourceCardType: "basic",
      targetCardId: fsCard1.id,
      targetCardType: "complex",
      connectorType: "standard",
      arrowDirection: "forward",
      strokeWeight: "normal",
      strokePattern: "solid",
      strokeColor: "grey",
    }
  });

  await prisma.blueprintConnection.create({
    data: {
      blueprintId: blueprint.id,
      sourceCardId: fsCard2.id,
      sourceCardType: "complex",
      targetCardId: bsCard2.id,
      targetCardType: "complex",
      connectorType: "dependency",
      arrowDirection: "forward",
      strokeWeight: "normal",
      strokePattern: "dashed",
      strokeColor: "grey",
    }
  });

  await prisma.blueprintConnection.create({
    data: {
      blueprintId: blueprint.id,
      sourceCardId: decisionFollowUp.id,
      sourceCardType: "decision",
      targetCardId: caCard3.id,
      targetCardType: "basic",
      connectorType: "standard",
      label: "Yes",
      arrowDirection: "forward",
      strokeWeight: "normal",
      strokePattern: "solid",
      strokeColor: "green",
    }
  });

  await prisma.blueprintConnection.create({
    data: {
      blueprintId: blueprint.id,
      sourceCardId: decisionFollowUp.id,
      sourceCardType: "decision",
      targetCardId: caCard4.id,
      targetCardType: "basic",
      connectorType: "standard",
      label: "No",
      arrowDirection: "forward",
      strokeWeight: "normal",
      strokePattern: "solid",
      strokeColor: "red",
    }
  });

  // Note: Removed same-column connections per new rules
  // Customer Action col3 -> Frontstage col4 (left-to-right)
  await prisma.blueprintConnection.create({
    data: {
      blueprintId: blueprint.id,
      sourceCardId: caCard3.id,
      sourceCardType: "basic",
      targetCardId: fsCard4.id,
      targetCardType: "complex",
      connectorType: "standard",
      arrowDirection: "forward",
      strokeWeight: "normal",
      strokePattern: "solid",
      strokeColor: "grey",
    }
  });

  // Frontstage col4 "Send resolution" -> Customer Action col5 "Read outcome" (left-to-right)
  await prisma.blueprintConnection.create({
    data: {
      blueprintId: blueprint.id,
      sourceCardId: fsCard4.id,
      sourceCardType: "complex",
      targetCardId: caCard4.id,
      targetCardType: "basic",
      connectorType: "standard",
      arrowDirection: "forward",
      strokeWeight: "normal",
      strokePattern: "solid",
      strokeColor: "grey",
    }
  });
}
