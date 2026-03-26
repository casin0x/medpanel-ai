# Source Code Workspace

## What This Workspace Is

The application implementation. Next.js App Router + TypeScript + Supabase. Code here implements the specs from `docs/specs/`, loads prompts from `prompts/`, enforces schemas from `schemas/`, and calls external APIs from `docs/SERVICES-MANIFEST.md`.

Upstream: specs + prompts + schemas define what to build. Downstream: `tests/` validates the output.

---

## What to Load

| Task | Load These | Skip These |
|------|-----------|------------|
| **Build the orchestrator** | `docs/specs/DISCUSSION-PROTOCOL.md`, `schemas/consultation.json` | Other specs, prompts (loaded at runtime) |
| **Build evidence retrieval** | `docs/specs/EVIDENCE-PIPELINE.md`, `docs/SERVICES-MANIFEST.md` | Other specs, prompts |
| **Build question classifier** | `docs/specs/QUESTION-CLASSIFICATION.md`, `prompts/classifier.md` | Other specs, other prompts |
| **Build safety system** | `docs/specs/SAFETY-SYSTEM.md` | Other specs |
| **Build patient profile intake** | `schemas/patient-profile.json` | specs/ (unless checking personalization) |
| **Build output rendering** | `docs/specs/PRODUCT-POSITIONING.md` (language rules + output format) | Other specs |
| **Build database schema** | `docs/specs/DISCUSSION-PROTOCOL.md` (has SQL tables) | prompts/ |
| **Build API routes** | Relevant spec for the route being built | Everything else |

---

## Tech Stack

- **Framework:** Next.js 16 App Router (TypeScript)
- **CSS:** Tailwind v4 + shadcn/ui
- **Database:** Supabase (EU region, Row Level Security)
- **Auth:** Supabase Auth
- **LLM:** Anthropic SDK (Claude), OpenAI SDK (GPT-4.1 fallback), Perplexity API
- **Hosting:** Vercel

---

## Folder Structure (planned)

```
src/
├── CONTEXT.md                    ← You are here
├── app/                          ← Next.js App Router pages
│   ├── page.tsx                  ← Landing / dashboard
│   ├── consultation/
│   │   ├── new/page.tsx          ← Start consultation
│   │   └── [id]/page.tsx         ← View consultation result
│   ├── profile/
│   │   └── page.tsx              ← Patient profile management
│   └── api/
│       ├── classify/route.ts     ← Question classification endpoint
│       ├── evidence/route.ts     ← Evidence retrieval pipeline
│       ├── consult/route.ts      ← Full consultation orchestration
│       └── safety/route.ts       ← Safety check endpoint
├── lib/
│   ├── agents/                   ← Agent orchestration engine
│   │   ├── orchestrator.ts       ← Multi-agent discussion controller
│   │   ├── specialist.ts         ← Specialist agent runner
│   │   ├── moderator.ts          ← Synthesis agent runner
│   │   ├── classifier.ts         ← Classification agent runner
│   │   └── safety.ts             ← Safety checker
│   ├── evidence/                 ← Evidence retrieval pipeline
│   │   ├── perplexity.ts         ← Perplexity Sonar Pro integration
│   │   ├── pubmed.ts             ← PubMed PMID verification
│   │   ├── drugbank.ts           ← DrugBank interaction checking
│   │   └── package.ts            ← Evidence package assembly
│   ├── schemas/                  ← Runtime schema validation (Zod)
│   ├── privacy/                  ← De-identification pipeline
│   └── cost/                     ← Token budget tracking
├── components/                   ← UI components
│   ├── consultation/             ← Consultation flow UI
│   ├── profile/                  ← Profile intake forms
│   └── output/                   ← Result rendering (patient + physician mode)
└── types/                        ← TypeScript types (generated from JSON schemas)
```

---

## Pipeline (Build Order)

```
Phase 4.1: Profile intake          ← schemas/patient-profile.json
Phase 4.2: Classification          ← docs/specs/QUESTION-CLASSIFICATION.md
Phase 4.3: Evidence pipeline       ← docs/specs/EVIDENCE-PIPELINE.md
Phase 4.4: Specialist execution    ← prompts/, schemas/agent-output.json
Phase 4.5: Discussion engine       ← docs/specs/DISCUSSION-PROTOCOL.md
Phase 4.6: Output rendering        ← docs/specs/PRODUCT-POSITIONING.md
Phase 4.7: Safety checks           ← docs/specs/SAFETY-SYSTEM.md
Phase 4.8: Auth + persistence      ← Supabase
Phase 4.9: Consultation history    ← schemas/consultation.json
```

Each phase's output becomes the next phase's input. Don't build Phase 4.5 before 4.4 is working.

---

## Hard Rules

1. **One spec per feature.** Every src/ module maps to exactly one spec in docs/specs/. If there's no spec, don't build it.
2. **Prompts are loaded from files, not hardcoded.** `prompts/*.md` are read at runtime. Changing a prompt doesn't require a code deploy.
3. **All LLM outputs are schema-validated.** Use Zod schemas generated from `schemas/*.json`. Invalid outputs are rejected and retried (max 2).
4. **De-identify before API calls.** Patient PII never leaves the server. The privacy/ module strips PII before any data goes to Claude/GPT/Perplexity.
5. **Cost tracking is mandatory.** Every LLM call logs tokens used and cost. Budget enforcement is not optional.
