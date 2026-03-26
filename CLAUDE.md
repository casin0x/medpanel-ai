# MedPanel AI — Project Map

## What This Is

Multi-specialist AI health exploration platform. Simulates MDT case conferences where specialist agents research, discuss, and surface perspectives for complex health questions.

**Positioning:** Educational exploration tool, NOT clinical decision support. Not a medical device. Primary output: "questions to ask your doctor" + evidence landscapes + multi-perspective analysis.

**CONTEXT.md** (top-level) routes you to the right workspace. This file is the map.

---

## Folder Structure

```
DiscussionAgents/
├── CLAUDE.md                                ← You are here (always loaded)
├── CONTEXT.md                               ← Task router
│
├── docs/                                    ← Knowledge + specifications
│   ├── research/                            ← Knowledge base, academic research
│   │   ├── KNOWLEDGE-BASE-v1.md
│   │   └── KNOWLEDGE-BASE-v2.md
│   ├── specs/                               ← System design specs (7 specs)
│   │   ├── PRODUCT-POSITIONING.md           ← Legal, disclaimers, output format rules
│   │   ├── DISCUSSION-PROTOCOL.md           ← Round-by-round agent interaction (2,299 lines)
│   │   ├── EVIDENCE-PIPELINE.md             ← Perplexity + PubMed + DrugBank integration
│   │   ├── QUESTION-CLASSIFICATION.md       ← 3-axis taxonomy, complexity scoring, routing
│   │   ├── SAFETY-SYSTEM.md                 ← Emergency detection, 9 pattern categories
│   │   ├── supplement-evidence-framework.md ← S/A/B/C/D evidence tiers
│   │   └── personalization-algorithm.md     ← Study-to-patient matching, 6 dimensions
│   └── SERVICES-MANIFEST.md                 ← All APIs, costs, architecture flow
│
├── schemas/                                 ← JSON schemas for all data structures
│   ├── patient-profile.json                 ← FHIR-aligned, 15 sections
│   ├── consultation.json                    ← Full consultation lifecycle
│   └── agent-output.json                    ← Structured specialist output + cross-examination
│
├── prompts/                                 ← Specialist agent prompts (core IP)
│   ├── CONTEXT.md                           ← Prompt workspace router
│   ├── specialist-agent-prompt-template.md  ← Base template (parameterization pattern)
│   ├── cardiologist.md
│   ├── endocrinologist.md
│   ├── nephrologist.md
│   ├── neuropsychiatrist.md
│   ├── functional-medicine.md
│   ├── pharmacologist.md
│   ├── moderator.md                         ← Discussion synthesis agent
│   └── classifier.md                        ← Question classification (Haiku-optimized)
│
├── src/                                     ← Application source (Next.js)
│   └── CONTEXT.md                           ← Build workspace router
│
└── tests/                                   ← Validation cases, safety edge cases
    └── CONTEXT.md                           ← Test workspace router
```

---

## Quick Navigation

| Want to... | Go here |
|------------|---------|
| **Understand the product** | `docs/specs/PRODUCT-POSITIONING.md` |
| **Edit a specialist prompt** | `prompts/CONTEXT.md` |
| **Build a feature** | `src/CONTEXT.md` |
| **Write tests** | `tests/CONTEXT.md` |
| **Check APIs/costs** | `docs/SERVICES-MANIFEST.md` |
| **Read knowledge base** | `docs/research/KNOWLEDGE-BASE-v2.md` |

---

## Cross-Workspace Flow

```
docs/research/  → docs/specs/  → prompts/  → src/  → tests/
 (knowledge)     (design)       (prompts)   (code)   (validation)
```

Each workspace is siloed. An agent editing prompts never loads src/. An agent building code loads the relevant spec + schema, not the knowledge base.

---

## Tech Stack

- **Framework:** Next.js 16 App Router (TypeScript)
- **CSS:** Tailwind v4 + shadcn/ui
- **Database:** Supabase (EU region, RLS)
- **LLMs:** Claude Opus (specialists), Sonnet (synthesis), Haiku (routing), Perplexity Sonar Pro (evidence), GPT-4.1 (fallback)
- **Evidence APIs:** PubMed, DrugBank, OpenFDA, RxNorm, UMLS, Semantic Scholar
- **Hosting:** Vercel
- **Privacy:** De-identification before API calls, EU data residency

---

## Naming Conventions

| Content Type | Pattern | Example |
|-------------|---------|---------|
| Specialist prompts | `[specialty].md` | `cardiologist.md` |
| Specs | `UPPER-CASE-NAME.md` | `DISCUSSION-PROTOCOL.md` |
| Schemas | `[name].json` | `patient-profile.json` |
| Test cases | `[descriptor].json` | `founder-case.json` |
| Source files | `[name].ts` / `[name].tsx` | `orchestrator.ts` |

---

## Token Management

Each workspace is siloed. Don't load everything.

- Editing a prompt? → Load that prompt + `schemas/agent-output.json`. Skip all specs.
- Building the orchestrator? → Load `DISCUSSION-PROTOCOL.md` + `consultation.json`. Skip prompts.
- Writing tests? → Load relevant spec + schema. Skip prompts, skip research.

The CONTEXT.md files in each workspace tell you exactly what to load. Trust them.

---

## GitHub

- Account: `casin0x`
- Repository: TBD

## Commands (when src/ is built)

- `npm run dev` — local development
- `npm run build` — production build
- `npm run test` — validation suite
