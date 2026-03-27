/** Main orchestration pipeline — coordinates the full consultation */

import { classifyQuestion } from "./classifier";
import { runSpecialist, gatherEvidence } from "./specialist";
import { synthesize } from "./moderator";
import { isLive } from "./ai";
import type {
  PatientProfile,
  ConsultationResult,
  ProgressEvent,
  SpecialistAnalysis,
  EvidenceCitation,
} from "./types";
import { getMockResult } from "./mock-data";

export type ProgressCallback = (event: ProgressEvent) => void;

export async function runConsultation(
  id: string,
  question: string,
  profile: PatientProfile,
  onProgress?: ProgressCallback,
): Promise<ConsultationResult> {
  const emit = onProgress ?? (() => {});

  // If no API key, return mock data with simulated delays
  if (!isLive()) {
    return runMockConsultation(id, question, profile, emit);
  }

  try {
    // Step 1: Classify
    emit({ type: "status", status: "classifying", message: "Analyzing your question..." });
    const classification = await classifyQuestion(question, profile);
    emit({ type: "classification", data: classification });

    if (classification.safety_screen.is_emergency) {
      emit({ type: "error", message: "This appears to be a medical emergency. Please call 112 (Sweden) or 911 (US) immediately." });
      throw new Error("Emergency detected");
    }

    // Step 2: Gather evidence
    emit({ type: "status", status: "researching", message: "Searching PubMed for relevant evidence..." });
    const evidenceBySpecialist: Record<string, EvidenceCitation[]> = {};
    for (const spec of classification.specialists_needed) {
      evidenceBySpecialist[spec] = await gatherEvidence(spec, question, profile);
    }

    // Step 3: Independent specialist analysis (parallel)
    emit({ type: "status", status: "analyzing", message: "Specialists analyzing independently..." });
    const analyses: SpecialistAnalysis[] = [];

    const specialistPromises = classification.specialists_needed.map(async (spec) => {
      emit({ type: "specialist_start", specialist: spec });
      const result = await runSpecialist(spec, question, profile, evidenceBySpecialist[spec] ?? []);
      emit({ type: "specialist_complete", specialist: spec, data: result });
      return result;
    });

    const results = await Promise.all(specialistPromises);
    analyses.push(...results);

    // Step 4: Cross-examination (Round 2) — specialists see each other's work
    emit({ type: "cross_examination_start" });
    emit({ type: "status", status: "cross_examining", message: "Specialists reviewing each other's findings..." });
    // In v1, the moderator handles cross-examination during synthesis.
    // In v2, we'll add explicit Round 2 calls where specialists respond to each other.

    // Step 5: Synthesis
    emit({ type: "synthesis_start" });
    emit({ type: "status", status: "synthesizing", message: "Building panel consensus..." });
    const synthesis = await synthesize(question, profile, analyses);

    // Collect all evidence
    const allEvidence = Object.values(evidenceBySpecialist).flat();
    const evidenceByTier = {
      strong: allEvidence.filter((e) => e.tier === "strong"),
      moderate: allEvidence.filter((e) => e.tier === "moderate"),
      preliminary: allEvidence.filter((e) => e.tier === "preliminary"),
      insufficient: allEvidence.filter((e) => e.tier === "insufficient"),
    };

    const result: ConsultationResult = {
      id,
      question,
      patient_profile: profile,
      classification,
      specialists: classification.specialists_needed,
      safety_flags: synthesis.safety_flags,
      consensus: synthesis.consensus,
      disagreements: synthesis.disagreements,
      questions: synthesis.questions,
      patient_questions: synthesis.patient_questions,
      evidence: evidenceByTier,
      status: "complete",
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    };

    emit({ type: "complete", data: result });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    emit({ type: "error", message });
    throw error;
  }
}

/** Mock consultation with simulated delays for demo without API key */
async function runMockConsultation(
  id: string,
  question: string,
  profile: PatientProfile,
  emit: ProgressCallback,
): Promise<ConsultationResult> {
  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

  emit({ type: "status", status: "classifying", message: "Analyzing your question..." });
  await delay(800);

  const mock = getMockResult(id, question, profile);

  emit({ type: "classification", data: mock.classification });
  await delay(600);

  emit({ type: "status", status: "researching", message: "Searching PubMed..." });
  await delay(1000);

  emit({ type: "status", status: "analyzing", message: "Specialists analyzing independently..." });
  for (const spec of mock.specialists) {
    emit({ type: "specialist_start", specialist: spec });
    await delay(700);
    emit({
      type: "specialist_complete",
      specialist: spec,
      data: {
        specialist: spec,
        findings: `Analysis from ${spec}...`,
        safety_flags: [],
        evidence_used: [],
        confidence: 0.85,
      },
    });
  }

  emit({ type: "cross_examination_start" });
  emit({ type: "status", status: "cross_examining", message: "Cross-examining findings..." });
  await delay(1200);

  emit({ type: "synthesis_start" });
  emit({ type: "status", status: "synthesizing", message: "Building consensus..." });
  await delay(1000);

  emit({ type: "status", status: "complete", message: "Consultation complete" });
  emit({ type: "complete", data: mock });

  return mock;
}
