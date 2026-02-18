import type { BlueprintTemplate, JourneyMapTemplate } from "./types";

export const JOURNEY_MAP_TEMPLATES: JourneyMapTemplate[] = [
  {
    id: "jm_support_request",
    name: "Support request (intake to resolution)",
    description: "A common journey for raising an issue, triage, and resolution.",
    draft: {
      name: "Support request journey",
      personaName: "Customer",
      phases: [
        {
          title: "Recognize issue",
          timeframe: null,
          actions: [
            { title: "Notice a problem", description: "Something isn’t working as expected." },
            { title: "Decide to seek help", thought: "Is this worth contacting support?" },
          ],
        },
        {
          title: "Submit request",
          timeframe: null,
          actions: [
            { title: "Find the help channel", channel: "Web", touchpoint: "Help center" },
            { title: "Describe the issue", description: "Provide details and context." },
          ],
        },
        {
          title: "Wait and collaborate",
          timeframe: null,
          actions: [
            { title: "Receive confirmation", touchpoint: "Email" },
            { title: "Provide more info", description: "Answer follow-up questions." },
          ],
        },
        {
          title: "Resolution",
          timeframe: null,
          actions: [
            { title: "Try the fix", description: "Validate it works." },
            { title: "Close the loop", description: "Give feedback / confirm resolved." },
          ],
        },
      ],
    },
  },
  {
    id: "jm_customer_onboarding",
    name: "Customer onboarding (signup to first value)",
    description: "Getting started journey until the customer achieves initial success.",
    draft: {
      name: "Customer onboarding journey",
      personaName: "New customer",
      phases: [
        {
          title: "Discover",
          timeframe: null,
          actions: [
            { title: "Research options", channel: "Web" },
            { title: "Compare plans", touchpoint: "Pricing page" },
          ],
        },
        {
          title: "Sign up",
          timeframe: null,
          actions: [
            { title: "Create account", touchpoint: "Signup form" },
            { title: "Verify email", touchpoint: "Email" },
          ],
        },
        {
          title: "Set up",
          timeframe: null,
          actions: [
            { title: "Connect required tools", description: "Integrations / access." },
            { title: "Configure preferences", description: "Defaults and settings." },
          ],
        },
        {
          title: "First value",
          timeframe: null,
          actions: [
            { title: "Complete first task", description: "Reach the first success milestone." },
            { title: "Share with team", description: "Invite others if applicable." },
          ],
        },
      ],
    },
  },
];

export const BLUEPRINT_TEMPLATES: BlueprintTemplate[] = [
  {
    id: "bp_support_case",
    name: "Support case handling",
    description: "Customer submits a request; team triages, resolves, and communicates.",
    draft: {
      name: "Support case blueprint",
      teams: [{ name: "Support" }, { name: "Engineering" }],
      phases: [
        {
          title: "Intake",
          timeframe: null,
          steps: [
            {
              label: "Submit",
              lanes: {
                PHYSICAL_EVIDENCE: [{ title: "Help center / contact form" }],
                CUSTOMER_ACTION: [{ title: "Submit support request" }],
                FRONTSTAGE_ACTION: [{ title: "Acknowledge receipt" }],
                BACKSTAGE_ACTION: [{ title: "Create case in ticketing system" }],
                SUPPORT_PROCESS: [{ title: "Routing rules apply" }],
              },
            },
          ],
        },
        {
          title: "Triage",
          timeframe: null,
          steps: [
            {
              label: "Assess",
              lanes: {
                CUSTOMER_ACTION: [{ title: "Wait / respond to questions" }],
                FRONTSTAGE_ACTION: [{ title: "Clarify details with customer" }],
                BACKSTAGE_ACTION: [{ title: "Reproduce issue" }],
                SUPPORT_PROCESS: [{ title: "Prioritize and assign" }],
              },
            },
          ],
        },
        {
          title: "Resolve",
          timeframe: null,
          steps: [
            {
              label: "Fix",
              lanes: {
                FRONTSTAGE_ACTION: [{ title: "Share workaround or fix steps" }],
                BACKSTAGE_ACTION: [{ title: "Implement fix / change" }],
                SUPPORT_PROCESS: [{ title: "QA and deploy" }],
              },
            },
          ],
        },
      ],
    },
  },
  {
    id: "bp_billing_issue",
    name: "Billing issue resolution",
    description: "Dispute/charge issue intake to resolution across customer and internal teams.",
    draft: {
      name: "Billing issue blueprint",
      teams: [{ name: "Billing Ops" }, { name: "Support" }],
      phases: [
        {
          title: "Report issue",
          steps: [
            {
              label: "Report",
              lanes: {
                PHYSICAL_EVIDENCE: [{ title: "Invoice / receipt" }],
                CUSTOMER_ACTION: [{ title: "Report billing issue" }],
                FRONTSTAGE_ACTION: [{ title: "Confirm receipt" }],
                BACKSTAGE_ACTION: [{ title: "Locate account and transaction" }],
                SUPPORT_PROCESS: [{ title: "Verify identity" }],
              },
            },
          ],
        },
        {
          title: "Investigate",
          steps: [
            {
              label: "Investigate",
              lanes: {
                CUSTOMER_ACTION: [{ title: "Provide documentation" }],
                FRONTSTAGE_ACTION: [{ title: "Explain next steps" }],
                BACKSTAGE_ACTION: [{ title: "Check payment processor logs" }],
                SUPPORT_PROCESS: [{ title: "Apply policy rules" }],
              },
            },
          ],
        },
        {
          title: "Resolve",
          steps: [
            {
              label: "Resolve",
              lanes: {
                FRONTSTAGE_ACTION: [{ title: "Communicate outcome" }],
                BACKSTAGE_ACTION: [{ title: "Issue refund/adjustment" }],
                SUPPORT_PROCESS: [{ title: "Update records" }],
              },
            },
          ],
        },
      ],
    },
  },
];

