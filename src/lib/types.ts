/** Core types for MedPanel AI pipeline */

export type Severity = "critical" | "high" | "moderate" | "low" | "informational";
export type EvidenceTier = "strong" | "moderate" | "preliminary" | "insufficient";
export type ConsultationStatus = "queued" | "classifying" | "researching" | "analyzing" | "cross_examining" | "synthesizing" | "complete" | "error";

export interface PatientProfile {
  age?: number;
  sex?: "male" | "female" | "other";
  weight_kg?: number;
  conditions?: string[];
  medications?: string[];
  supplements?: string[];
  lab_results?: LabResult[];
  locale?: "en" | "sv";
}

export interface LabResult {
  name: string;
  value: number;
  unit: string;
  reference_range?: string;
  date?: string;
}

export interface Classification {
  domains: string[];
  specialists_needed: string[];
  complexity: "simple" | "moderate" | "complex";
  urgency: "routine" | "soon" | "urgent";
  safety_screen: { is_emergency: boolean; reasoning: string };
}

export interface SafetyFlag {
  severity: Severity;
  title: string;
  description: string;
  action: string;
}

export interface SpecialistAnalysis {
  specialist: string;
  findings: string;
  safety_flags: SafetyFlag[];
  evidence_used: EvidenceCitation[];
  confidence: number;
}

export interface EvidenceCitation {
  claim: string;
  source: string;
  pmid: string | null;
  tier: EvidenceTier;
}

export interface ConsensusItem {
  text: string;
  specialists: string[];
  evidenceTier: EvidenceTier;
}

export interface Disagreement {
  topic: string;
  positions: {
    specialist: string;
    position: string;
    reasoning: string;
  }[];
}

export interface DoctorQuestion {
  question: string;
  whyAsk: string;
  whatToListen: string;
}

export interface ConsultationResult {
  id: string;
  question: string;
  patient_profile: PatientProfile;
  classification: Classification;
  specialists: string[];
  safety_flags: SafetyFlag[];
  consensus: ConsensusItem[];
  disagreements: Disagreement[];
  questions: DoctorQuestion[];
  patient_questions: DoctorQuestion[];
  evidence: {
    strong: EvidenceCitation[];
    moderate: EvidenceCitation[];
    preliminary: EvidenceCitation[];
    insufficient: EvidenceCitation[];
  };
  status: ConsultationStatus;
  created_at: string;
  completed_at?: string;
}

/** SSE event types for real-time progress */
export type ProgressEvent =
  | { type: "status"; status: ConsultationStatus; message: string }
  | { type: "classification"; data: Classification }
  | { type: "specialist_start"; specialist: string }
  | { type: "specialist_complete"; specialist: string; data: SpecialistAnalysis }
  | { type: "cross_examination_start" }
  | { type: "synthesis_start" }
  | { type: "complete"; data: ConsultationResult }
  | { type: "error"; message: string };
