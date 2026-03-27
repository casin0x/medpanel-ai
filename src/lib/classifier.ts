/** Question classifier — routes to the right specialists */

import { callClaudeJSON } from "./ai";
import type { Classification, PatientProfile } from "./types";

const CLASSIFIER_SYSTEM = `You are a medical question classifier for MedPanel AI. Analyze the patient's question and profile to determine:

1. Medical domains involved (e.g., cardiology, nephrology, endocrinology)
2. Which specialists should analyze this case (3-5 specialists)
3. Complexity level (simple/moderate/complex)
4. Urgency (routine/soon/urgent)
5. Safety screen — is this a medical emergency requiring immediate care?

Available specialists: cardiologist, nephrologist, endocrinologist, neuropsychiatrist, functional_medicine, pharmacologist, oncologist, rheumatologist, pulmonologist, gastroenterologist

Respond with valid JSON matching this schema:
{
  "domains": ["string"],
  "specialists_needed": ["string"],
  "complexity": "simple" | "moderate" | "complex",
  "urgency": "routine" | "soon" | "urgent",
  "safety_screen": { "is_emergency": boolean, "reasoning": "string" }
}`;

export async function classifyQuestion(
  question: string,
  profile: PatientProfile
): Promise<Classification> {
  const prompt = `## Patient Question
${question}

## Patient Profile
${JSON.stringify(profile, null, 2)}

Classify this question. Return JSON only.`;

  return callClaudeJSON<Classification>({
    model: "haiku",
    system: CLASSIFIER_SYSTEM,
    prompt,
    maxTokens: 1024,
  });
}
