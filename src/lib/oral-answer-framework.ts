import { z } from "zod";
import type { OralPart } from "@/lib/oral-system-prompt";

const sectionKinds = [
  "triage",
  "assessment",
  "red_flags",
  "decision",
  "recommendation",
  "counselling",
  "follow_up",
  "jurisdiction",
  "legal_professional_issue",
  "verification",
  "communication",
  "documentation",
  "clinical_problem",
  "monitoring",
] as const;

export const oralAnswerSchema = z.object({
  directResponse: z.string().trim().min(1),
  urgency: z.enum(["routine", "priority", "urgent", "emergency"]),
  sections: z
    .array(
      z.object({
        kind: z.enum(sectionKinds),
        heading: z.string().trim().min(1),
        bullets: z.array(z.string().trim().min(1)).min(1).max(10),
      }),
    )
    .min(1)
    .max(9),
  references: z
    .array(
      z.object({
        source: z.string().trim().min(1),
        location: z.string().trim(),
        supports: z.string().trim().min(1),
      }),
    )
    .max(10),
  evidenceGaps: z.array(z.string().trim().min(1)).max(8),
  examinerFollowUps: z
    .array(
      z.object({
        question: z.string().trim().min(1),
        idealResponse: z.string().trim().min(1),
      }),
    )
    .max(6),
});

export type StructuredOralAnswer = z.infer<typeof oralAnswerSchema>;

export const oralAnswerJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "directResponse",
    "urgency",
    "sections",
    "references",
    "evidenceGaps",
    "examinerFollowUps",
  ],
  properties: {
    directResponse: { type: "string" },
    urgency: {
      type: "string",
      enum: ["routine", "priority", "urgent", "emergency"],
    },
    sections: {
      type: "array",
      minItems: 1,
      maxItems: 9,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["kind", "heading", "bullets"],
        properties: {
          kind: { type: "string", enum: sectionKinds },
          heading: { type: "string" },
          bullets: {
            type: "array",
            minItems: 1,
            maxItems: 10,
            items: { type: "string" },
          },
        },
      },
    },
    references: {
      type: "array",
      maxItems: 10,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["source", "location", "supports"],
        properties: {
          source: { type: "string" },
          location: { type: "string" },
          supports: { type: "string" },
        },
      },
    },
    evidenceGaps: {
      type: "array",
      maxItems: 8,
      items: { type: "string" },
    },
    examinerFollowUps: {
      type: "array",
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["question", "idealResponse"],
        properties: {
          question: { type: "string" },
          idealResponse: { type: "string" },
        },
      },
    },
  },
} as const;

const partFrameworks: Record<OralPart, string> = {
  A: `PART A — PRIMARY HEALTHCARE / OTC ROLE-PLAY
Use a patient-facing, consultation-first structure. Include only sections that earn marks for this case, normally in this order:
1. Immediate triage: identify emergency or urgent referral before product discussion.
2. Targeted assessment: who the patient is, symptoms, onset/duration, severity, associated symptoms, previous treatment, medicines, conditions, allergies, pregnancy/breastfeeding and other case-specific questions.
3. Red flags and referral threshold: state the finding and the action it triggers.
4. Decision and recommendation: give the most likely assessment only when supported; recommend referral, non-drug care or a specific medicine with dose, route, frequency and duration when appropriate.
5. Essential counselling: administration, expected benefit, common or serious adverse effects that change action, precautions and practical advice.
6. Follow-up and safety net: when improvement should occur and when to return or seek urgent care.
Do not recite a generic WWHAM checklist. Tailor every question and counselling point to the presentation.`,
  B: `PART B — LAW, ETHICS AND PROFESSIONAL PRACTICE
Use a safety-first professional decision structure, normally in this order:
1. Immediate action: protect the patient, secure medicines or records, pause supply or escalate where required.
2. Jurisdiction: identify the Australian state or territory. Do not state jurisdiction-specific law until the jurisdiction is known or retrieved.
3. Legal and professional issues: distinguish legislation, Pharmacy Board/Ahpra expectations, professional standards, privacy/consent and local policy.
4. Information to verify: prescription details, identity, authority, timing, records, prescriber confirmation and relevant monitoring systems.
5. Decision: state clearly what can and cannot be done now, plus any lawful alternative pathway.
6. Communication and escalation: patient, prescriber, pharmacist-in-charge, proprietor, supervisor, regulator or emergency services as relevant.
7. Documentation and follow-up: exactly what must be recorded and what happens next.
Never invent a section number, legal rule or emergency-supply entitlement. Label every jurisdiction-dependent point that still requires confirmation.`,
  C: `PART C — CLINICAL AND PRESCRIPTION PROBLEM SOLVING
Use a prioritised clinical-review structure, normally in this order:
1. Priority clinical problem: identify the highest-risk prescription or medicine-related issue first.
2. Relevant verification: patient, prescription validity, indication, dose, route, duration, allergies, medicines, adherence, pathology, renal/hepatic function, pregnancy and other case-specific facts.
3. Clinical assessment: explain the relevant contraindication, interaction, duplication, dosing problem, untreated indication or monitoring gap and its consequence.
4. Immediate decision and intervention: dispense, defer, withhold, clarify, modify, refer or urgently escalate; state the safe interim plan.
5. Prescriber or supervisor communication: use a concise ISBAR-style recommendation when communication is required.
6. Patient counselling: only the administration, adverse-effect, interaction, monitoring and safety-net points relevant to the final plan.
7. Monitoring and follow-up: parameter, timing, responsible clinician and action threshold.
Do not list every possible interaction or counselling point. Prioritise clinically significant, actionable issues.`,
};

export function buildPartAnswerFramework(part: OralPart) {
  return partFrameworks[part];
}

export function renderStructuredOralAnswer(answer: StructuredOralAnswer): string {
  const lines: string[] = [
    "## Direct response",
    answer.directResponse,
    "",
    `**Urgency:** ${answer.urgency}`,
  ];

  for (const section of answer.sections) {
    lines.push("", `## ${section.heading}`);
    for (const bullet of section.bullets) lines.push(`- ${bullet}`);
  }

  lines.push("", "## References");
  if (answer.references.length === 0) {
    lines.push("No indexed reference was available for this answer.");
  } else {
    for (const reference of answer.references) {
      const location = reference.location ? ` — ${reference.location}` : "";
      lines.push(`- ${reference.source}${location}: ${reference.supports}`);
    }
  }

  lines.push("", "## More details");

  if (answer.evidenceGaps.length > 0) {
    lines.push("", "### Evidence to confirm");
    for (const gap of answer.evidenceGaps) lines.push(`- ${gap}`);
  }

  if (answer.examinerFollowUps.length > 0) {
    lines.push("", "### Likely examiner follow-up questions");
    for (const item of answer.examinerFollowUps) {
      lines.push(`- **${item.question}** ${item.idealResponse}`);
    }
  }

  if (answer.evidenceGaps.length === 0 && answer.examinerFollowUps.length === 0) {
    lines.push("No additional educational notes were required.");
  }

  return lines.join("\n");
}
