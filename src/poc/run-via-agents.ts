/**
 * MedPanel AI — POC via Claude Code Subagents
 *
 * Instead of direct API calls, this script generates the prompts
 * and outputs a ready-to-execute orchestration plan that uses
 * Claude Code's built-in Agent tool (runs on your Pro/Max subscription).
 *
 * Usage: npm run poc
 * Then follow the instructions to paste the generated prompts.
 *
 * Alternatively, this can be run as a Claude Code skill that
 * spawns agents directly.
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

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

async function searchPubMed(query: string, maxResults = 3): Promise<{ pmid: string; title: string; abstract: string; year: number }[]> {
  const apiKey = process.env.NCBI_API_KEY || "";
  const baseUrl = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";

  const searchUrl = `${baseUrl}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=${maxResults}&sort=relevance&retmode=json${apiKey ? `&api_key=${apiKey}` : ""}`;
  const searchRes = await fetch(searchUrl);
  const searchData = await searchRes.json() as { esearchresult?: { idlist?: string[] } };
  const pmids = searchData?.esearchresult?.idlist || [];

  if (pmids.length === 0) return [];

  const fetchUrl = `${baseUrl}/efetch.fcgi?db=pubmed&id=${pmids.join(",")}&retmode=xml${apiKey ? `&api_key=${apiKey}` : ""}`;
  const fetchRes = await fetch(fetchUrl);
  const xml = await fetchRes.text();

  const results: { pmid: string; title: string; abstract: string; year: number }[] = [];
  const articles = xml.split("<PubmedArticle>");
  for (const article of articles.slice(1)) {
    const pmid = article.match(/<PMID[^>]*>(\d+)<\/PMID>/)?.[1] || "";
    const title = article.match(/<ArticleTitle>(.+?)<\/ArticleTitle>/s)?.[1]?.replace(/<[^>]+>/g, "") || "";
    const abstractText = article.match(/<AbstractText[^>]*>(.+?)<\/AbstractText>/s)?.[1]?.replace(/<[^>]+>/g, "") || "";
    const year = parseInt(article.match(/<Year>(\d{4})<\/Year>/)?.[1] || "0");
    if (pmid && title) results.push({ pmid, title, abstract: abstractText.slice(0, 400), year });
  }
  return results;
}

async function fetchEvidence(profile: PatientProfile): Promise<string> {
  console.log("\n📚 Fetching evidence from PubMed...");

  const queries = [
    profile.chief_complaint.split("?")[0],
    ...profile.conditions.filter(c => c.status === "active").slice(0, 2).map(c => `${c.name} treatment evidence`),
  ];

  const lines = ["## Evidence Package (PubMed)\n"];
  let citationId = 1;

  for (const q of queries) {
    console.log(`  🔍 "${q.slice(0, 50)}..."`);
    try {
      const results = await searchPubMed(q, 3);
      if (results.length === 0) continue;
      lines.push(`### Query: "${q}"\n`);
      for (const a of results) {
        lines.push(`**[C-${String(citationId).padStart(3, "0")}]** ${a.title} (${a.year}) — PMID: ${a.pmid}`);
        if (a.abstract) lines.push(`> ${a.abstract.slice(0, 300)}...`);
        lines.push("");
        citationId++;
      }
      console.log(`     Found ${results.length} articles`);
    } catch (e) {
      console.log(`     ⚠️ Failed: ${(e as Error).message}`);
    }
  }

  if (citationId === 1) {
    lines.push("*No evidence retrieved. Use established medical knowledge, tag claims as clinical_reasoning.*");
  }

  return lines.join("\n");
}

// --- Main: Generate Agent Prompts ---

async function main() {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║  MedPanel AI — POC Agent Orchestrator    ║");
  console.log("╚══════════════════════════════════════════╝");

  // 1. Load profile
  const profile = loadTestCase("founder-case");
  const patientContext = formatProfileForAgent(profile);
  console.log(`\n👤 Profile: ${profile.demographics.age}yo ${profile.demographics.sex}`);
  console.log(`❓ Question: ${profile.chief_complaint}`);

  // 2. Fetch evidence
  const evidencePackage = await fetchEvidence(profile);

  // 3. Select specialists (hardcoded for POC — classifier would do this in production)
  const specialists = ["cardiologist", "nephrologist", "functional-medicine"];
  console.log(`\n🏷️  Specialists: ${specialists.join(", ")}`);

  // 4. Generate Round 1 agent prompts
  console.log("\n📝 Generating agent prompts...\n");

  const agentPrompts: Record<string, string> = {};

  for (const spec of specialists) {
    const systemPrompt = loadPrompt(spec);
    const fullPrompt = `${systemPrompt}\n\n---\n\n## Patient Context\n${patientContext}\n\n${evidencePackage}\n\nProvide your Round 1 independent analysis of the patient's question. Follow your output schema exactly.`;
    agentPrompts[spec] = fullPrompt;
  }

  // 5. Generate moderator prompt
  const moderatorPrompt = loadPrompt("moderator");
  agentPrompts["moderator"] = moderatorPrompt;

  // 6. Write orchestration file
  const orchestrationFile = join(ROOT, "tests", "poc-orchestration.md");

  const output = `# MedPanel POC — Agent Orchestration Plan

Generated: ${new Date().toISOString()}
Question: ${profile.chief_complaint}
Specialists: ${specialists.join(", ")}

## Instructions

Run these agents in Claude Code. Each specialist runs in parallel (Round 1), then the moderator synthesizes.

### Step 1: Run PubMed Evidence (DONE)
${evidencePackage.split("\n").length} lines of evidence retrieved.

### Step 2: Spawn Specialist Agents (Round 1 — Parallel)

Spawn these 3 agents simultaneously using the Agent tool:

${specialists.map((spec, i) => `#### Agent ${i + 1}: ${spec}
\`\`\`
${agentPrompts[spec].slice(0, 200)}...
[Full prompt: ${agentPrompts[spec].length} characters]
\`\`\`
`).join("\n")}

### Step 3: Collect Round 1 Outputs

After all 3 agents return, collect their outputs.

### Step 4: Round 2 — Cross-Examination

Spawn the same 3 agents again, this time each one receives ALL Round 1 outputs and must respond with agreements, disagreements, and cross-domain risks.

### Step 5: Synthesize

Spawn the moderator agent with all Round 1 + Round 2 outputs. It produces the final exploration output.

---

## Full Agent Prompts (for reference)

${specialists.map(spec => `### ${spec} (${agentPrompts[spec].length} chars)\n\nStored in: prompts/${spec}.md\nPatient context: ${patientContext.length} chars\nEvidence: ${evidencePackage.length} chars`).join("\n\n")}

---

## Quick Run Command

To run this POC right now in Claude Code, paste this:

\`\`\`
I want to run a MedPanel consultation. Read the file at ~/Documents/DiscussionAgents/tests/cases/founder-case.json for the patient profile. The question is: "${profile.chief_complaint}"

Spawn 3 specialist agents in parallel (cardiologist, nephrologist, functional-medicine). Each agent should:
1. Read their prompt from ~/Documents/DiscussionAgents/prompts/[specialist].md
2. Analyze the patient profile
3. Return their independent analysis

Use the evidence package below for grounding:

${evidencePackage}

After all 3 return, synthesize their outputs using the moderator prompt at ~/Documents/DiscussionAgents/prompts/moderator.md
\`\`\`
`;

  writeFileSync(orchestrationFile, output);
  console.log(`✅ Orchestration plan saved to: ${orchestrationFile}`);
  console.log(`\n📋 To run: copy the "Quick Run Command" from the file and paste into Claude Code.`);
  console.log(`   Or just tell me: "Run the MedPanel POC consultation"`);
}

main().catch(e => { console.error("❌", e); process.exit(1); });
