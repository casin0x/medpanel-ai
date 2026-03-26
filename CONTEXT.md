# MedPanel AI — Task Router

## What This Is

A multi-specialist AI health exploration platform. Three workspaces: research (knowledge base), design (system specs), and build (implementation). Each workspace is siloed.

**CLAUDE.md** (always loaded) has the project map and standards. This file routes you to work.

---

## Task Routing

| Your Task | Go Here | You'll Also Need |
|-----------|---------|-----------------|
| **Understand the product** | `docs/specs/PRODUCT-POSITIONING.md` | — |
| **Review/update knowledge base** | `docs/research/KNOWLEDGE-BASE-v2.md` | — |
| **Check available APIs/services** | `docs/SERVICES-MANIFEST.md` | — |
| **Write/edit a specialist prompt** | `prompts/CONTEXT.md` | `schemas/agent-output.json`, `docs/specs/supplement-evidence-framework.md` |
| **Work on the discussion engine** | `src/CONTEXT.md` | `docs/specs/DISCUSSION-PROTOCOL.md`, `schemas/consultation.json` |
| **Work on evidence retrieval** | `src/CONTEXT.md` | `docs/specs/EVIDENCE-PIPELINE.md`, `docs/SERVICES-MANIFEST.md` |
| **Work on safety system** | `src/CONTEXT.md` | `docs/specs/SAFETY-SYSTEM.md` |
| **Work on question classification** | `src/CONTEXT.md` | `docs/specs/QUESTION-CLASSIFICATION.md` |
| **Work on patient profiles** | `src/CONTEXT.md` | `schemas/patient-profile.json`, `docs/specs/personalization-algorithm.md` |
| **Work on output rendering** | `src/CONTEXT.md` | `docs/specs/PRODUCT-POSITIONING.md` (output format rules) |
| **Write/run test cases** | `tests/CONTEXT.md` | `schemas/`, relevant spec |
| **Check regulatory/legal** | `docs/specs/PRODUCT-POSITIONING.md` | — |

---

## Workspace Summary

| Workspace | Purpose | Key Files |
|-----------|---------|-----------|
| `docs/research/` | Knowledge base, competitive landscape, academic research | Knowledge base v1-v3 |
| `docs/specs/` | System design specifications (7 specs) | Discussion protocol, safety, evidence pipeline, classification, personalization, supplements, positioning |
| `prompts/` | Specialist agent prompts (8 prompts) — the core IP | Base template + 6 specialists + moderator + classifier |
| `schemas/` | JSON schemas for all data structures | Patient profile, consultation, agent output |
| `src/` | Application source code (Next.js) | Not started yet |
| `tests/` | Validation cases, safety edge cases, reproducibility | Not started yet |

---

## Cross-Workspace Flow

```
docs/research/  (knowledge base → informs specs)
    ↓
docs/specs/     (specs → inform prompts and code)
    ↓
prompts/        (specialist prompts → loaded by src/ at runtime)
    ↓
schemas/        (data schemas → enforced by src/ at runtime)
    ↓
src/            (code → uses prompts, schemas, services)
    ↓
tests/          (validation → uses schemas, prompts, test cases)
```

---

## Current Phase: Phase 2 (System Design) → Phase 3 (Tech Architecture)

Phase 2 is ~95% complete. Remaining: specialist prompt agent finalizing 8 prompt files. Then Phase 3 (tech architecture) and Phase 4 (build).
