/** Mock consultation data — used when ANTHROPIC_API_KEY is not set */

import type { ConsultationResult, PatientProfile } from "./types";

export function getMockResult(
  id: string,
  question: string,
  profile: PatientProfile
): ConsultationResult {
  return {
    id,
    question,
    patient_profile: profile,
    classification: {
      domains: ["nephrology", "cardiology", "metabolic"],
      specialists_needed: ["cardiologist", "nephrologist", "functional_medicine"],
      complexity: "complex",
      urgency: "routine",
      safety_screen: { is_emergency: false, reasoning: "Non-acute clinical question" },
    },
    specialists: ["cardiologist", "nephrologist", "functional_medicine"],
    safety_flags: [
      {
        severity: "high",
        title: "Atherogenic dyslipidemia pattern",
        description: "LDL 151 mg/dL with HDL 36 mg/dL and hs-CRP 5.8 mg/L creates a high-risk cardiovascular triad.",
        action: "Request advanced lipid panel including ApoB, Lp(a), and LDL particle number.",
      },
      {
        severity: "moderate",
        title: "Elevated hs-CRP requires investigation",
        description: "hs-CRP of 5.8 mg/L is nearly 6x the upper reference limit.",
        action: "Retest hs-CRP to establish current baseline.",
      },
      {
        severity: "moderate",
        title: "Kidney function below threshold",
        description: "Creatinine 1.26 mg/dL with eGFR 79 mL/min. Cystatin C-based eGFR was 88 mL/min.",
        action: "Track eGFR trajectory with cystatin C every 3-6 months.",
      },
    ],
    consensus: [
      {
        text: "CoQ10 at 200mg daily is safe for this patient profile. No contraindications with current medications.",
        specialists: ["cardiologist", "nephrologist", "functional_medicine"],
        evidenceTier: "strong",
      },
      {
        text: "CoQ10 supplementation is reasonable but is NOT the highest priority intervention.",
        specialists: ["cardiologist", "nephrologist", "functional_medicine"],
        evidenceTier: "moderate",
      },
      {
        text: "Ubiquinol form is preferred over ubiquinone for better bioavailability.",
        specialists: ["cardiologist", "nephrologist", "functional_medicine"],
        evidenceTier: "moderate",
      },
    ],
    disagreements: [
      {
        topic: "What should be the immediate clinical priority?",
        positions: [
          { specialist: "cardiologist", position: "Advanced lipid characterization first", reasoning: "LDL 151 / HDL 36 / CRP 5.8 triad is the most immediate actionable risk." },
          { specialist: "nephrologist", position: "GFR trajectory monitoring takes precedence", reasoning: "With eGFR at 79 and history of nephrotoxic substance use, establishing trajectory is critical." },
          { specialist: "functional_medicine", position: "Identify the inflammation source", reasoning: "hs-CRP of 5.8 is the linchpin connecting cardiovascular risk AND mitochondrial stress." },
        ],
      },
    ],
    questions: [
      {
        question: "Order ApoB, Lp(a), and LDL particle count to characterize atherogenic burden.",
        whyAsk: "LDL-C of 151 with HDL 36 and TG 73 on TRT. Standard panel underestimates risk.",
        whatToListen: "If ApoB >90 mg/dL or Lp(a) >50 mg/dL, threshold for pharmacotherapy shifts.",
      },
      {
        question: "Repeat hs-CRP to confirm chronicity. If >2.0, investigate inflammatory source.",
        whyAsk: "Prior hs-CRP 5.8 during active substance use. Patient now 6 months sober.",
        whatToListen: "Three specialists independently flagged CRP as most interconnected finding.",
      },
      {
        question: "Establish GFR trajectory with serial cystatin C. Order baseline UACR.",
        whyAsk: "Cystatin C eGFR 88 at age 30 represents ~25-30% reduction from expected baseline.",
        whatToListen: "Trajectory is everything. Flat over 6 months vs -3/year are different prognoses.",
      },
    ],
    patient_questions: [
      {
        question: "Can we check my cholesterol more thoroughly? I'd like to know my ApoB and Lp(a) numbers.",
        whyAsk: "Regular cholesterol tests miss important details. ApoB counts the actual harmful particles.",
        whatToListen: "Your doctor should be willing to order these. Explain you're on testosterone and HDL is low.",
      },
      {
        question: "My inflammation marker (CRP) was high at 5.8. Can we retest it?",
        whyAsk: "This number was from 18 months ago. If it's come down, that's great news.",
        whatToListen: "If still above 2.0, ask what could be causing it — gut issues, dental, insulin resistance.",
      },
      {
        question: "Can we keep an eye on my kidney function with cystatin C every few months?",
        whyAsk: "Your kidneys are working below expected for your age. Tracking over time is the only way to know.",
        whatToListen: "Ask whether past ketamine use could have affected your kidneys.",
      },
    ],
    evidence: {
      strong: [
        { claim: "CoQ10 supplementation safe at doses up to 1200mg/day", source: "Cochrane, 2022", pmid: "35726131", tier: "strong" },
        { claim: "Statin-induced CoQ10 depletion well-established", source: "J Am Heart Assoc, 2018", pmid: "30571591", tier: "strong" },
      ],
      moderate: [
        { claim: "CoQ10 200-300mg improves mitochondrial bioenergetics", source: "Mitochondrion, 2021", pmid: "33476817", tier: "moderate" },
        { claim: "ApoB superior to LDL-C for cardiovascular risk", source: "ESC/EAS, 2019", pmid: "31504429", tier: "moderate" },
      ],
      preliminary: [
        { claim: "Elevated cis-aconitic acid correlates with TCA cycle disruption", source: "Clin Chem Lab Med, 2019", pmid: "30903754", tier: "preliminary" },
      ],
      insufficient: [
        { claim: "Long-term CoQ10 effects on TCA cycle organic acid markers", source: "No studies found", pmid: null, tier: "insufficient" },
      ],
    },
    status: "complete",
    created_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
  };
}
