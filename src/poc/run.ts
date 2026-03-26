/**
 * MedPanel AI — Proof of Concept
 *
 * Runs the full multi-specialist consultation pipeline:
 * 1. Load patient profile
 * 2. Classify question (determines specialists + complexity)
 * 3. Fetch evidence (PubMed + Semantic Scholar)
 * 4. Run specialist agents in parallel (Round 1)
 * 5. Run cross-examination (Round 2)
 * 6. Synthesize into final output
 *
 * Usage: npm run poc
 */

import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import "dotenv/config";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

// --- Types ---

interface PatientProfile {
  demographics: { age: number; sex: string; height_cm?: number; weight_kg?: number; body_fat_percentage?: number };
  chief_complaint: string;
  conditions: Array<{ name: string; status: string; notes?: string }>;
  medications: Array<{ name: string; type: string; dose: string; frequency: string; route: string; status: string; prescribing_reason?: string }>;
  supplements: Array<{ name: string; dose: string; frequency: string }>;
  allergies: Array<{ substance: string; type: string; severity: string; reaction: string; ige_level?: number }>;
  lab_results: Array<{ name: string; value: number | null; unit: string; reference_range_low?: number; reference_range_high?: number; date: string; interpretation?: string; notes?: string }>;
  family_history?: Array<{ relationship: string; condition: string; deceased?: boolean; cause_of_death?: string }>;
  social_history?: Record<string, unknown>;
  goals?: string[];
}

interface Classification {
  intent: string;
  organ_systems: string[];
  urgency: string;
  complexity_score: number;
  specialists_selected: string[];
  emergency_detected: boolean;
}

interface EvidenceResult {
  query: string;
  abstracts: Array<{ pmid: string; title: string; abstract: string; year: number }>;
}

// --- Helpers ---

function loadPrompt(name: string): string {
  return readFileSync(join(ROOT, "prompts", `${name}.md`), "utf-8");
}

function loadTestCase(name: string): PatientProfile {
  return JSON.parse(readFileSync(join(ROOT, "tests/cases", `${name}.json`), "utf-8"));
}

function formatProfileForAgent(profile: PatientProfile): string {
  const lines: string[] = [];
  const d = profile.demographics;
  lines.push(`## Patient: ${d.age}yo ${d.sex}, ${d.height_cm}cm, ${d.weight_kg}kg, ~${d.body_fat_percentage}% BF`);
  lines.push(`\n## Chief Complaint\n${profile.chief_complaint}`);

  lines.push(`\n## Active Conditions`);
  for (const c of profile.conditions) lines.push(`- ${c.name} (${c.status})${c.notes ? ` — ${c.notes}` : ""}`);

  lines.push(`\n## Medications`);
  for (const m of profile.medications) lines.push(`- ${m.name} ${m.dose} ${m.frequency} (${m.prescribing_reason || m.type})`);

  lines.push(`\n## Supplements`);
  for (const s of profile.supplements) lines.push(`- ${s.name} ${s.dose} ${s.frequency}`);

  lines.push(`\n## Allergies`);
  for (const a of profile.allergies) lines.push(`- ${a.substance}: ${a.reaction} (IgE: ${a.ige_level})`);

  lines.push(`\n## Lab Results`);
  for (const l of profile.lab_results) {
    if (l.value === null) {
      lines.push(`- ${l.name}: NOT TESTED — ${l.notes}`);
    } else {
      const flag = l.interpretation ? ` [${l.interpretation.toUpperCase()}]` : "";
      const ref = l.reference_range_high ? ` (ref: ${l.reference_range_low || ""}–${l.reference_range_high})` : "";
      lines.push(`- ${l.name}: ${l.value} ${l.unit}${ref}${flag} (${l.date})`);
    }
  }

  if (profile.family_history?.length) {
    lines.push(`\n## Family History`);
    for (const f of profile.family_history) lines.push(`- ${f.relationship}: ${f.condition}${f.deceased ? ` (deceased: ${f.cause_of_death})` : ""}`);
  }

  if (profile.goals?.length) {
    lines.push(`\n## Goals`);
    for (const g of profile.goals) lines.push(`- ${g}`);
  }

  return lines.join("\n");
}

// --- PubMed Evidence Retrieval ---

async function searchPubMed(query: string, maxResults = 5): Promise<EvidenceResult> {
  const apiKey = process.env.NCBI_API_KEY;
  const baseUrl = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";

  // Step 1: Search for PMIDs
  const searchUrl = `${baseUrl}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=${maxResults}&sort=relevance&retmode=json${apiKey ? `&api_key=${apiKey}` : ""}`;
  const searchRes = await fetch(searchUrl);
  const searchData = await searchRes.json() as { esearchresult?: { idlist?: string[] } };
  const pmids = searchData?.esearchresult?.idlist || [];

  if (pmids.length === 0) return { query, abstracts: [] };

  // Step 2: Fetch abstracts
  const fetchUrl = `${baseUrl}/efetch.fcgi?db=pubmed&id=${pmids.join(",")}&retmode=xml${apiKey ? `&api_key=${apiKey}` : ""}`;
  const fetchRes = await fetch(fetchUrl);
  const xml = await fetchRes.text();

  // Simple XML parsing for title + abstract
  const abstracts: EvidenceResult["abstracts"] = [];
  const articles = xml.split("<PubmedArticle>");
  for (const article of articles.slice(1)) {
    const pmid = article.match(/<PMID[^>]*>(\d+)<\/PMID>/)?.[1] || "";
    const title = article.match(/<ArticleTitle>(.+?)<\/ArticleTitle>/s)?.[1]?.replace(/<[^>]+>/g, "") || "";
    const abstractText = article.match(/<AbstractText[^>]*>(.+?)<\/AbstractText>/s)?.[1]?.replace(/<[^>]+>/g, "") || "";
    const year = parseInt(article.match(/<Year>(\d{4})<\/Year>/)?.[1] || "0");
    if (pmid && title) abstracts.push({ pmid, title, abstract: abstractText.slice(0, 500), year });
  }

  return { query, abstracts };
}

async function fetchEvidence(profile: PatientProfile, specialists: string[]): Promise<string> {
  console.log("\n📚 Fetching evidence from PubMed...");

  // Generate search queries based on the chief complaint and key conditions
  const queries = [
    profile.chief_complaint.split("?")[0], // Main question
    ...profile.conditions.filter(c => c.status === "active").slice(0, 2).map(c => `${c.name} treatment evidence`),
  ];

  const results: EvidenceResult[] = [];
  for (const q of queries) {
    console.log(`  🔍 Searching: "${q.slice(0, 60)}..."`);
    try {
      const result = await searchPubMed(q, 3);
      results.push(result);
      console.log(`     Found ${result.abstracts.length} articles`);
    } catch (e) {
      console.log(`     ⚠️ Search failed: ${(e as Error).message}`);
    }
  }

  // Format as evidence package
  const lines = ["## Evidence Package (PubMed)\n"];
  let citationId = 1;
  for (const result of results) {
    if (result.abstracts.length === 0) continue;
    lines.push(`### Query: "${result.query}"\n`);
    for (const a of result.abstracts) {
      lines.push(`**[C-${String(citationId).padStart(3, "0")}]** ${a.title} (${a.year}) — PMID: ${a.pmid}`);
      if (a.abstract) lines.push(`> ${a.abstract.slice(0, 300)}...`);
      lines.push("");
      citationId++;
    }
  }

  if (citationId === 1) {
    lines.push("*No evidence retrieved. Agents should rely on established medical knowledge and flag all claims as `evidence_basis: clinical_reasoning`.*");
  }

  return lines.join("\n");
}

// --- Agent Execution ---

async function runAgent(
  client: Anthropic,
  systemPrompt: string,
  patientContext: string,
  evidencePackage: string,
  specialistType: string,
  round: number,
  previousRoundOutputs?: string
): Promise<string> {
  const userMessage = round === 1
    ? `## Patient Context\n${patientContext}\n\n${evidencePackage}\n\nProvide your Round 1 independent analysis.`
    : `## Patient Context\n${patientContext}\n\n${evidencePackage}\n\n## Round 1 Outputs From Other Specialists\n${previousRoundOutputs}\n\nProvide your Round 2 cross-examination. Address agreements, disagreements, and cross-domain risks.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const text = response.content[0];
  if (text.type !== "text") throw new Error("Unexpected response type");

  console.log(`  ✅ ${specialistType} (${response.usage.input_tokens} in / ${response.usage.output_tokens} out)`);
  return text.text;
}

// --- Classification ---

async function classifyQuestion(client: Anthropic, profile: PatientProfile): Promise<Classification> {
  console.log("\n🏷️  Classifying question...");

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 500,
    system: `You are a medical question classifier. Given a patient profile and question, output JSON with:
- intent: one of [diagnostic, therapeutic, prognostic, preventive, optimization, medication_management, interpretation, second_opinion]
- organ_systems: array of affected systems
- urgency: one of [emergent, urgent, semi_urgent, routine, optimization]
- complexity_score: 0-10 number
- specialists_selected: array of specialist types needed (from: cardiologist, endocrinologist, nephrologist, neuropsychiatrist, functional_medicine, clinical_pharmacologist, internist)
- emergency_detected: boolean

Always include "internist" in specialists_selected. Select 2-4 specialists based on the question. Output ONLY valid JSON, no markdown.`,
    messages: [{ role: "user", content: `Patient: ${profile.demographics.age}yo ${profile.demographics.sex}\nQuestion: ${profile.chief_complaint}\nConditions: ${profile.conditions.map(c => c.name).join(", ")}\nMedications: ${profile.medications.map(m => m.name).join(", ")}\nKey labs: ${profile.lab_results.filter(l => l.interpretation).map(l => `${l.name}: ${l.value} ${l.unit} [${l.interpretation}]`).join(", ")}` }],
  });

  const text = response.content[0];
  if (text.type !== "text") throw new Error("Unexpected response type");

  try {
    const classification = JSON.parse(text.text) as Classification;
    console.log(`  Intent: ${classification.intent}`);
    console.log(`  Complexity: ${classification.complexity_score}`);
    console.log(`  Specialists: ${classification.specialists_selected.join(", ")}`);
    console.log(`  Urgency: ${classification.urgency}`);
    return classification;
  } catch {
    // Fallback classification
    console.log("  ⚠️ Classification parse failed, using defaults");
    return {
      intent: "optimization",
      organ_systems: ["metabolic", "cardiovascular", "renal"],
      urgency: "optimization",
      complexity_score: 6,
      specialists_selected: ["functional_medicine", "cardiologist", "nephrologist", "internist"],
      emergency_detected: false,
    };
  }
}

// --- Synthesis ---

async function synthesize(client: Anthropic, round1Outputs: Record<string, string>, round2Outputs: Record<string, string>, profile: PatientProfile): Promise<string> {
  console.log("\n📋 Synthesizing panel discussion...");

  const allOutputs = [
    "## Round 1 — Independent Analyses\n",
    ...Object.entries(round1Outputs).map(([spec, output]) => `### ${spec}\n${output}\n`),
    "\n## Round 2 — Cross-Examination\n",
    ...Object.entries(round2Outputs).map(([spec, output]) => `### ${spec}\n${output}\n`),
  ].join("\n");

  const moderatorPrompt = loadPrompt("moderator");

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 6000,
    system: moderatorPrompt,
    messages: [{ role: "user", content: `## Patient Context\n${formatProfileForAgent(profile)}\n\n## Full Panel Discussion\n${allOutputs}\n\nSynthesize the panel discussion into the final exploration output. Include both patient mode and physician mode.` }],
  });

  const text = response.content[0];
  if (text.type !== "text") throw new Error("Unexpected response type");
  console.log(`  ✅ Synthesis complete (${response.usage.output_tokens} tokens)`);
  return text.text;
}

// --- Main ---

async function main() {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║   MedPanel AI — Proof of Concept v0.1   ║");
  console.log("╚══════════════════════════════════════════╝");

  // 1. Load patient profile
  const profile = loadTestCase("founder-case");
  const patientContext = formatProfileForAgent(profile);
  console.log(`\n👤 Loaded profile: ${profile.demographics.age}yo ${profile.demographics.sex}`);
  console.log(`❓ Question: ${profile.chief_complaint}`);

  // 2. Init Anthropic client
  const client = new Anthropic();

  // 3. Classify
  const classification = await classifyQuestion(client, profile);

  if (classification.emergency_detected) {
    console.log("\n🚨 EMERGENCY DETECTED — Directing to emergency services.");
    return;
  }

  // 4. Fetch evidence
  const evidencePackage = await fetchEvidence(profile, classification.specialists_selected);

  // 5. Round 1 — Independent Analysis (parallel)
  console.log(`\n🔬 Round 1 — Independent Analysis (${classification.specialists_selected.length} specialists)`);

  const round1Outputs: Record<string, string> = {};
  const round1Promises = classification.specialists_selected.map(async (specialist) => {
    let promptName = specialist;
    // Map specialist types to prompt file names
    if (specialist === "internist") promptName = "functional-medicine"; // Use FM as generalist for POC
    if (specialist === "clinical_pharmacologist") promptName = "pharmacologist";

    try {
      const prompt = loadPrompt(promptName);
      const output = await runAgent(client, prompt, patientContext, evidencePackage, specialist, 1);
      round1Outputs[specialist] = output;
    } catch (e) {
      console.log(`  ❌ ${specialist} failed: ${(e as Error).message}`);
      round1Outputs[specialist] = `[Agent failed: ${(e as Error).message}]`;
    }
  });

  await Promise.allSettled(round1Promises);
  console.log(`  Completed: ${Object.keys(round1Outputs).length}/${classification.specialists_selected.length}`);

  // 6. Round 2 — Cross-Examination (parallel, each sees all Round 1 outputs)
  console.log(`\n🔄 Round 2 — Cross-Examination`);

  const round1Summary = Object.entries(round1Outputs)
    .map(([spec, output]) => `### ${spec}\n${output}`)
    .join("\n\n");

  const round2Outputs: Record<string, string> = {};
  const round2Promises = classification.specialists_selected.map(async (specialist) => {
    let promptName = specialist;
    if (specialist === "internist") promptName = "functional-medicine";
    if (specialist === "clinical_pharmacologist") promptName = "pharmacologist";

    try {
      const prompt = loadPrompt(promptName);
      const output = await runAgent(client, prompt, patientContext, evidencePackage, specialist, 2, round1Summary);
      round2Outputs[specialist] = output;
    } catch (e) {
      console.log(`  ❌ ${specialist} Round 2 failed: ${(e as Error).message}`);
    }
  });

  await Promise.allSettled(round2Promises);
  console.log(`  Completed: ${Object.keys(round2Outputs).length}/${classification.specialists_selected.length}`);

  // 7. Synthesize
  const synthesis = await synthesize(client, round1Outputs, round2Outputs, profile);

  // 8. Output
  console.log("\n" + "═".repeat(60));
  console.log("MEDPANEL AI — EXPLORATION OUTPUT");
  console.log("═".repeat(60) + "\n");
  console.log(synthesis);
  console.log("\n" + "═".repeat(60));

  // Save full output
  const outputPath = join(ROOT, "tests", "poc-output.md");
  const fullOutput = [
    "# MedPanel POC Output\n",
    `**Date:** ${new Date().toISOString()}`,
    `**Question:** ${profile.chief_complaint}`,
    `**Specialists:** ${classification.specialists_selected.join(", ")}`,
    `**Complexity:** ${classification.complexity_score}`,
    "\n---\n",
    "## Classification\n```json\n" + JSON.stringify(classification, null, 2) + "\n```\n",
    "## Round 1 Outputs\n",
    ...Object.entries(round1Outputs).map(([s, o]) => `### ${s}\n${o}\n`),
    "## Round 2 Outputs\n",
    ...Object.entries(round2Outputs).map(([s, o]) => `### ${s}\n${o}\n`),
    "## Synthesis\n",
    synthesis,
  ].join("\n");

  const { writeFileSync } = await import("fs");
  writeFileSync(outputPath, fullOutput);
  console.log(`\n💾 Full output saved to: ${outputPath}`);
}

main().catch((e) => {
  console.error("\n❌ Fatal error:", e);
  process.exit(1);
});
