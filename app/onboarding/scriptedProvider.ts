import type { ArtifactType, BlueprintDraftSpec, JourneyMapDraftSpec } from "./types";

export type OnboardingMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

export type OnboardingStage =
  | "describe"
  | "clarify"
  | "review_current"
  | "create_current"
  | "future_constraints"
  | "review_future";

export type OnboardingState = {
  artifactType: ArtifactType;
  stage: OnboardingStage;
  stepIndex: number;
  answers: Record<string, string>;
  messages: OnboardingMessage[];
  currentDraft: JourneyMapDraftSpec | BlueprintDraftSpec | null;
  futureDraft: JourneyMapDraftSpec | BlueprintDraftSpec | null;
};

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function splitList(input: string): string[] {
  return input
    .split(/\n|,|•|- /g)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 24);
}

function titleCaseFallback(s: string, fallback: string) {
  const v = s.trim();
  return v || fallback;
}

/** True when the step is passive (customer waiting); no customer-action card (implied). */
function isPassiveCustomerStep(title: string): boolean {
  return /^(wait(\s+for\s+(response|reply|update))?|waiting|no\s+action|—)$/i.test(title?.trim() ?? "");
}

function buildJourneyMapDraft(a: Record<string, string>): JourneyMapDraftSpec {
  const name = titleCaseFallback(a.name ?? "", "Untitled Journey Map");
  const personaName = a.persona?.trim() || null;
  const phases = splitList(a.phases || "Discover, Do, Finish");
  const steps = splitList(a.steps || "Start, Complete, Confirm");
  const pain = a.painPoints?.trim() || null;
  const opp = a.opportunities?.trim() || null;

  return {
    name,
    personaName,
    phases: phases.map((p, idx) => ({
      title: p,
      timeframe: null,
      actions: steps.slice(0, 6).map((s, i) => ({
        title: idx === 0 ? s : `${s}`,
        description: a.description?.trim() || null,
        thought: a.thought?.trim() || null,
        channel: a.channel?.trim() || null,
        touchpoint: a.touchpoint?.trim() || null,
        emotion: null,
        painPoints: pain,
        opportunities: opp,
      })),
    })),
  };
}

function buildBlueprintDraft(a: Record<string, string>): BlueprintDraftSpec {
  const name = titleCaseFallback(a.name ?? "", "Untitled Blueprint");
  const phases = splitList(a.phases || "Intake, Work, Resolution");
  const rawSteps = splitList(a.steps || "Step 1, Step 2, Step 3").slice(0, 10);
  const allSteps = rawSteps.length ? rawSteps : ["Step 1"];

  const customer = splitList(a.customerActions || "");
  const frontstage = splitList(a.frontstage || "");
  const backstage = splitList(a.backstage || "");
  const support = splitList(a.supportProcess || "");
  const evidence = splitList(a.physicalEvidence || "");

  // Detect demo scenario (Contact Enquiry) for richer multi-team output
  const isDemoScenario =
    /contact\s*enquiry/i.test(name) ||
    (phases.length >= 2 && phases.some((p) => /intake|triage|resolution/i.test(p)));

  if (isDemoScenario && customer.length >= 2 && frontstage.length >= 2) {
    return buildDemoBlueprintDraft(name, phases, allSteps, customer, frontstage, backstage, support, evidence);
  }

  // Sequential chunking: distribute steps across phases (each phase gets a subset)
  const stepsPerPhase = Math.max(1, Math.ceil(allSteps.length / phases.length));
  const phaseSteps: string[][] = [];
  for (let i = 0; i < phases.length; i++) {
    const start = i * stepsPerPhase;
    const end = Math.min(start + stepsPerPhase, allSteps.length);
    phaseSteps.push(allSteps.slice(start, end));
  }

  // Sparse lanes: only populate where provided/meaningful; no placeholder for customer waiting
  const buildLanesForStep = (label: string, globalStepIdx: number) => {
    const lanes: BlueprintDraftSpec["phases"][number]["steps"][number]["lanes"] = {};
    const customerTitle = customer.length ? customer[globalStepIdx % customer.length] : label;
    if (!isPassiveCustomerStep(customerTitle)) {
      lanes.CUSTOMER_ACTION = [{ title: customerTitle }];
    }
    if (evidence.length) {
      lanes.PHYSICAL_EVIDENCE = [{ title: evidence[globalStepIdx % evidence.length] }];
    }
    if (frontstage.length) {
      lanes.FRONTSTAGE_ACTION = [{ title: frontstage[globalStepIdx % frontstage.length] }];
    }
    if (backstage.length) {
      lanes.BACKSTAGE_ACTION = [{ title: backstage[globalStepIdx % backstage.length] }];
    }
    if (support.length) {
      lanes.SUPPORT_PROCESS = [{ title: support[globalStepIdx % support.length] }];
    }
    return lanes;
  };

  const needsFrontstage = frontstage.length > 0;
  const needsBackstage = backstage.length > 0;
  const teams =
    needsFrontstage || needsBackstage
      ? [
          ...(needsFrontstage ? [{ name: "Customer Support" }] : []),
          ...(needsBackstage ? [{ name: "Back Office" }] : []),
        ]
      : undefined;

  let globalStepIdx = 0;
  return {
    name,
    teams,
    phases: phases.map((p, phaseIdx) => {
      const stepLabels = phaseSteps[phaseIdx] ?? [];
      const steps = stepLabels.map((s) => {
        const lanes = buildLanesForStep(s, globalStepIdx);
        globalStepIdx += 1;
        return { label: s, lanes };
      });
      return {
        title: p,
        timeframe: null,
        steps,
      };
    }),
  };
}

/** Demo blueprint: sparse cards, multiple teams, flow across customer→frontstage→backstage */
function buildDemoBlueprintDraft(
  name: string,
  phases: string[],
  allSteps: string[],
  customer: string[],
  frontstage: string[],
  backstage: string[],
  support: string[],
  evidence: string[]
): BlueprintDraftSpec {
  const teams = [
    { name: "Reception" },
    { name: "Triage Team" },
    { name: "Customer Support" },
    { name: "Back Office" },
    { name: "Resolution Team" },
  ];

  const stepsPerPhase = Math.max(1, Math.ceil(allSteps.length / phases.length));
  const phaseSteps: string[][] = [];
  for (let i = 0; i < phases.length; i++) {
    const start = i * stepsPerPhase;
    const end = Math.min(start + stepsPerPhase, allSteps.length);
    const chunk = allSteps.slice(start, end);
    if (chunk.length) phaseSteps.push(chunk);
    else if (i < phases.length - 1) phaseSteps.push([allSteps[Math.min(i, allSteps.length - 1)]]);
  }
  if (phaseSteps.length === 0) phaseSteps.push(allSteps.slice(0, 1));

  const frontstageTeams = ["Reception", "Triage Team", "Customer Support", "Resolution Team"];
  const backstageTeams = ["Back Office", "Back Office", "Back Office"];

  let globalStepIdx = 0;
  const phasesOut = phases.map((p, phaseIdx) => {
    const stepLabels = phaseSteps[phaseIdx] ?? [allSteps[0]];
    const steps = stepLabels.map((s) => {
      const idx = globalStepIdx++;
      const lanes: BlueprintDraftSpec["phases"][number]["steps"][number]["lanes"] = {};
      const customerTitle = customer[idx % customer.length] || s;
      if (!isPassiveCustomerStep(customerTitle)) {
        lanes.CUSTOMER_ACTION = [{ title: customerTitle }];
      }
      if (evidence[idx % evidence.length]) {
        lanes.PHYSICAL_EVIDENCE = [{ title: evidence[idx % evidence.length] }];
      }
      if (frontstage[idx % frontstage.length]) {
        lanes.FRONTSTAGE_ACTION = [
          {
            title: frontstage[idx % frontstage.length],
            teamName: frontstageTeams[idx % frontstageTeams.length],
          },
        ];
      }
      if (backstage[idx % backstage.length] && idx > 0) {
        lanes.BACKSTAGE_ACTION = [
          {
            title: backstage[idx % backstage.length],
            teamName: backstageTeams[idx % backstageTeams.length],
          },
        ];
      }
      if (support[idx % support.length] && idx % 2 === 1) {
        lanes.SUPPORT_PROCESS = [{ title: support[idx % support.length] }];
      }
      return { label: s, lanes };
    });
    return { title: p, timeframe: null, steps };
  });

  return { name, teams, phases: phasesOut };
}

function buildFutureJourneyMapDraft(current: JourneyMapDraftSpec, a: Record<string, string>): JourneyMapDraftSpec {
  const suffix = a.successMetrics?.trim() ? " (Future State)" : " (Future State)";
  return {
    ...current,
    name: `${current.name}${suffix}`,
    phases: current.phases.map((p) => ({
      ...p,
      actions: p.actions.map((act) => ({
        ...act,
        opportunities:
          [
            act.opportunities,
            a.mustKeep ? `Must keep: ${a.mustKeep}` : null,
            a.canChange ? `Can change: ${a.canChange}` : null,
            a.constraints ? `Constraints: ${a.constraints}` : null,
            a.successMetrics ? `Success: ${a.successMetrics}` : null,
          ]
            .filter(Boolean)
            .join("\n") || act.opportunities || null,
      })),
    })),
  };
}

function buildFutureBlueprintDraft(current: BlueprintDraftSpec, a: Record<string, string>): BlueprintDraftSpec {
  return {
    ...current,
    name: `${current.name} (Future State)`,
    phases: current.phases.map((p) => ({
      ...p,
      steps: p.steps.map((s) => ({
        ...s,
        lanes: {
          ...s.lanes,
          SUPPORT_PROCESS: [
            ...(s.lanes.SUPPORT_PROCESS ?? []),
            ...(a.constraints ? [{ title: `Constraints: ${a.constraints}` }] : []),
            ...(a.successMetrics ? [{ title: `Success: ${a.successMetrics}` }] : []),
          ],
        },
      })),
    })),
  };
}

const QUESTIONS: Record<
  ArtifactType,
  { key: string; prompt: string; placeholder?: string; multiLine?: boolean; followUp?: string[] }[]
> = {
  journeyMap: [
    { key: "name", prompt: "What should we call this journey?" },
    { key: "persona", prompt: "Who is the main persona (short label)?" },
    {
      key: "description",
      prompt: "In 1–2 sentences, what is this journey about?",
      multiLine: true,
      followUp: ["That helps clarify the scope. Thanks."],
    },
    {
      key: "phases",
      prompt: "List the phases (comma or newline separated).",
      multiLine: true,
      followUp: ["Good, those phases make sense."],
    },
    { key: "steps", prompt: "List the key actions/steps (comma or newline separated).", multiLine: true },
    { key: "painPoints", prompt: "What are the most important pain points?", multiLine: true },
    { key: "opportunities", prompt: "What are the biggest opportunities?", multiLine: true },
  ],
  blueprint: [
    { key: "name", prompt: "What should we call this blueprint?" },
    {
      key: "description",
      prompt: "In 1–2 sentences, what service does this blueprint describe?",
      multiLine: true,
      followUp: ["That gives me a clear picture of the service.", "Now let's structure it into phases."],
    },
    {
      key: "phases",
      prompt: "List the phases (comma or newline separated).",
      multiLine: true,
      followUp: ["Got it. Now let's break down what happens in each phase."],
    },
    { key: "steps", prompt: "List the main steps in order (comma or newline separated).", multiLine: true },
    { key: "physicalEvidence", prompt: "Physical evidence the customer sees (optional).", multiLine: true },
    { key: "customerActions", prompt: "Customer actions (optional).", multiLine: true },
    { key: "frontstage", prompt: "Frontstage actions (optional).", multiLine: true },
    { key: "backstage", prompt: "Backstage actions (optional).", multiLine: true },
    { key: "supportProcess", prompt: "Support processes / rules (optional).", multiLine: true },
  ],
};

const FUTURE_QUESTIONS: { key: string; prompt: string; multiLine?: boolean }[] = [
  { key: "constraints", prompt: "Any constraints? (budget/time/tech limits)", multiLine: true },
  { key: "mustKeep", prompt: "What must stay the same?", multiLine: true },
  { key: "canChange", prompt: "What can change?", multiLine: true },
  { key: "successMetrics", prompt: "How will you measure success?", multiLine: true },
];

export function initOnboarding(artifactType: ArtifactType): OnboardingState {
  const intro =
    artifactType === "journeyMap"
      ? "Let’s build a Journey Map together. Answer a few questions and I’ll generate a solid first draft you can edit."
      : "Let’s build a Service Blueprint together. Answer a few questions and I’ll generate a structured first draft you can edit.";
  const firstPrompt = QUESTIONS[artifactType][0].prompt;
  return {
    artifactType,
    stage: "describe",
    stepIndex: 0,
    answers: {},
    messages: [
      { id: uid("a"), role: "assistant", content: intro },
      { id: uid("a"), role: "assistant", content: firstPrompt },
    ] satisfies OnboardingMessage[],
    currentDraft: null,
    futureDraft: null,
  };
}

export function acceptUserMessage(state: OnboardingState, content: string): OnboardingState {
  const trimmed = content.trim();
  if (!trimmed) return state;

  const q = state.stage === "future_constraints"
    ? FUTURE_QUESTIONS[state.stepIndex]
    : QUESTIONS[state.artifactType][state.stepIndex];

  const nextAnswers = { ...state.answers, [q.key]: trimmed };
  const nextMessages: OnboardingMessage[] = [
    ...state.messages,
    { id: uid("u"), role: "user", content: trimmed },
  ];

  // Advance within current stage
  if (state.stage === "future_constraints") {
    const nextIdx = state.stepIndex + 1;
    if (nextIdx >= FUTURE_QUESTIONS.length) {
      const current = state.currentDraft as JourneyMapDraftSpec | BlueprintDraftSpec | null;
      const future =
        state.artifactType === "journeyMap"
          ? current && buildFutureJourneyMapDraft(current as JourneyMapDraftSpec, nextAnswers)
          : current && buildFutureBlueprintDraft(current as BlueprintDraftSpec, nextAnswers);
      return {
        ...state,
        answers: nextAnswers,
        messages: [
          ...nextMessages,
          { id: uid("a"), role: "assistant", content: `I think I have everything I need. Here's a draft ${state.artifactType === "journeyMap" ? "Journey Map" : "Blueprint"} (Future State) for you to review.` },
        ],
        stage: "review_future",
        stepIndex: 0,
        futureDraft: future,
      };
    }
    return {
      ...state,
      answers: nextAnswers,
      messages: [...nextMessages, { id: uid("a"), role: "assistant", content: FUTURE_QUESTIONS[nextIdx].prompt }],
      stepIndex: nextIdx,
    };
  }

  const nextIdx = state.stepIndex + 1;
  if (nextIdx >= QUESTIONS[state.artifactType].length) {
    const draft =
      state.artifactType === "journeyMap"
        ? buildJourneyMapDraft(nextAnswers)
        : buildBlueprintDraft(nextAnswers);

    return {
      ...state,
      answers: nextAnswers,
      messages: [
        ...nextMessages,
        { id: uid("a"), role: "assistant", content: `I think I have everything I need. Here's a draft ${state.artifactType === "journeyMap" ? "Journey Map" : "Blueprint"} for you to review.` },
      ],
      stage: "review_current",
      stepIndex: 0,
      currentDraft: draft,
    };
  }

  const nextQ = QUESTIONS[state.artifactType][nextIdx];
  const followUps = (nextQ as { followUp?: string[] }).followUp ?? [];
  const assistantMessages: OnboardingMessage[] = [
    ...followUps.map((c) => ({ id: uid("a"), role: "assistant" as const, content: c })),
    { id: uid("a"), role: "assistant" as const, content: nextQ.prompt },
  ];

  return {
    ...state,
    answers: nextAnswers,
    messages: [...nextMessages, ...assistantMessages],
    stepIndex: nextIdx,
  };
}

/** Returns the current question key for demo prefill lookup (null if not in a question stage). */
export function getCurrentQuestionKey(state: OnboardingState): string | null {
  if (state.stage === "future_constraints") {
    const q = FUTURE_QUESTIONS[state.stepIndex];
    return q?.key ?? null;
  }
  if (state.stage === "describe") {
    const q = QUESTIONS[state.artifactType][state.stepIndex];
    return q?.key ?? null;
  }
  return null;
}

export function startFutureConstraints(state: OnboardingState): OnboardingState {
  if (!state.currentDraft) return state;
  return {
    ...state,
    stage: "future_constraints",
    stepIndex: 0,
    messages: [
      ...state.messages,
      { id: uid("a"), role: "assistant", content: "Let’s generate a Future State. First, a few constraints so it fits reality." },
      { id: uid("a"), role: "assistant", content: FUTURE_QUESTIONS[0].prompt },
    ],
  };
}

