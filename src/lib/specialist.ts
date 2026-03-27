/** Specialist agent runner — each specialist analyzes independently */

import { callClaudeJSON } from "./ai";
import type { SpecialistAnalysis, PatientProfile, EvidenceCitation } from "./types";
import { searchPubMed } from "./evidence/pubmed";
import { readFile } from "fs/promises";
import { join } from "path";

const PROMPT_DIR = join(process.cwd(), "prompts");

async function loadSpecialistPrompt(specialist: string): Promise<string> {
  const filename = specialist.replace(/_/g, "-") + ".md";
  try {
    return await readFile(join(PROMPT_DIR, filename), "utf-8");
  } catch {
    return getDefaultPrompt(specialist);
  }
}

function getDefaultPrompt(specialist: string): string {
  const name = specialist.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return `You are a ${name} on a multidisciplinary panel. Analyze the patient case from your specialty perspective. Be thorough, cite evidence where possible, and flag safety concerns.`;
}

export async function runSpecialist(
  specialist: string,
  question: string,
  profile: PatientProfile,
  evidence: EvidenceCitation[]
): Promise<SpecialistAnalysis> {
  const systemPrompt = await loadSpecialistPrompt(specialist);

  const evidenceContext = evidence.length > 0
    ? `\n## Relevant Evidence Retrieved\n${evidence.map((e) => `- ${e.claim} (${e.source}, PMID:${e.pmid ?? "N/A"}, Tier: ${e.tier})`).join("\n")}`
    : "";

  const prompt = `## Patient Question
${question}

## Patient Profile
${JSON.stringify(profile, null, 2)}
${evidenceContext}

Analyze this case from your specialty perspective. Return valid JSON:
{
  "specialist": "${specialist}",
  "findings": "Your detailed analysis as a paragraph",
  "safety_flags": [
    { "severity": "high|moderate|low", "title": "string", "description": "string", "action": "string" }
  ],
  "evidence_used": [
    { "claim": "string", "source": "string", "pmid": "string|null", "tier": "strong|moderate|preliminary|insufficient" }
  ],
  "confidence": 0.0-1.0
}`;

  return callClaudeJSON<SpecialistAnalysis>({
    model: "opus",
    system: systemPrompt,
    prompt,
    maxTokens: 4096,
  });
}

/** Retrieve PubMed evidence relevant to the specialist's domain */
export async function gatherEvidence(
  specialist: string,
  question: string,
  profile: PatientProfile
): Promise<EvidenceCitation[]> {
  const conditions = profile.conditions?.join(", ") ?? "";
  const medications = profile.medications?.join(", ") ?? "";
  const searchQuery = `${question} ${specialist.replace(/_/g, " ")} ${conditions} ${medications}`.slice(0, 200);

  const articles = await searchPubMed(searchQuery, 4);

  return articles.map((a) => ({
    claim: a.title,
    source: `${a.journal}, ${a.year}`,
    pmid: a.pmid,
    tier: "moderate" as const, // Will be refined by specialist
  }));
}
