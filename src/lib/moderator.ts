/** Moderator — synthesizes specialist analyses into final output */

import { callClaudeJSON } from "./ai";
import type {
  SpecialistAnalysis,
  ConsensusItem,
  Disagreement,
  DoctorQuestion,
  SafetyFlag,
  PatientProfile,
} from "./types";

interface SynthesisOutput {
  consensus: ConsensusItem[];
  disagreements: Disagreement[];
  questions: DoctorQuestion[];
  patient_questions: DoctorQuestion[];
  safety_flags: SafetyFlag[];
}

const MODERATOR_SYSTEM = `You are the panel moderator for MedPanel AI. You synthesize multiple specialist analyses into a structured consultation output.

Your job:
1. Identify consensus — what do all/most specialists agree on?
2. Surface disagreements — where do specialists differ, and why?
3. Generate doctor questions — what should the patient bring to their next appointment?
4. Generate patient questions — same content as doctor questions, but in plain language a non-medical person can understand. Keep all numbers and facts, simplify the explanations.
5. Consolidate safety flags — merge duplicates, rank by severity.

You must output valid JSON. Do not editorialize. Present the panel's findings, not your opinion.`;

export async function synthesize(
  question: string,
  profile: PatientProfile,
  analyses: SpecialistAnalysis[]
): Promise<SynthesisOutput> {
  const specialistSummaries = analyses.map((a) =>
    `### ${a.specialist}\n**Findings:** ${a.findings}\n**Safety Flags:** ${JSON.stringify(a.safety_flags)}\n**Evidence:** ${JSON.stringify(a.evidence_used)}\n**Confidence:** ${a.confidence}`
  ).join("\n\n");

  const prompt = `## Original Question
${question}

## Patient Profile
${JSON.stringify(profile, null, 2)}

## Specialist Analyses
${specialistSummaries}

Synthesize the panel's findings. Return valid JSON:
{
  "consensus": [
    { "text": "string", "specialists": ["specialist_id"], "evidenceTier": "strong|moderate|preliminary" }
  ],
  "disagreements": [
    {
      "topic": "string",
      "positions": [
        { "specialist": "specialist_id", "position": "string", "reasoning": "string" }
      ]
    }
  ],
  "questions": [
    { "question": "Clinical question for doctor", "whyAsk": "Clinical reasoning", "whatToListen": "Clinical guidance" }
  ],
  "patient_questions": [
    { "question": "Same question in plain language", "whyAsk": "Simple explanation keeping all numbers", "whatToListen": "What to expect from doctor" }
  ],
  "safety_flags": [
    { "severity": "critical|high|moderate|low", "title": "string", "description": "string", "action": "string" }
  ]
}`;

  return callClaudeJSON<SynthesisOutput>({
    model: "sonnet",
    system: MODERATOR_SYSTEM,
    prompt,
    maxTokens: 8192,
  });
}
