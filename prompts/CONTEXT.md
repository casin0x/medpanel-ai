# Prompts Workspace

## What This Workspace Is

The core IP. Each file is a production-ready system prompt for a specialist AI agent. Prompts are parameterized with `{patient_context}` and `{evidence_package}` slots filled at runtime by the orchestrator.

Upstream: specs define what each prompt must do. Downstream: `src/` loads these prompts at runtime.

---

## What to Load

| Task | Load These | Skip These |
|------|-----------|------------|
| **Edit a specialist prompt** | The specific prompt file + `schemas/agent-output.json` (output schema it must conform to) | Other specialist prompts, all docs/specs/ |
| **Edit the moderator prompt** | `moderator.md` + `schemas/consultation.json` (synthesis output schema) | Specialist prompts |
| **Edit the classifier prompt** | `classifier.md` + `docs/specs/QUESTION-CLASSIFICATION.md` | Specialist prompts, moderator |
| **Add a new specialist type** | `specialist-agent-prompt-template.md` (base template) + `schemas/agent-output.json` | Existing specialist prompts (don't load them, follow the template) |
| **Review all prompts for consistency** | All prompt files + `docs/specs/PRODUCT-POSITIONING.md` (language rules) | schemas/, docs/research/ |

---

## Folder Structure

```
prompts/
├── CONTEXT.md                          ← You are here
├── specialist-agent-prompt-template.md ← Base template (parameterization pattern)
├── cardiologist.md                     ← Heart, vascular, lipids, BP
├── endocrinologist.md                  ← Hormones, TRT, thyroid, metabolism
├── nephrologist.md                     ← Kidneys, electrolytes, GFR
├── neuropsychiatrist.md                ← Autonomic, trauma, ADHD, medications
├── functional-medicine.md              ← Root cause, OAT, gut, mitochondria
├── pharmacologist.md                   ← Drug interactions, CYP450, dosing
├── moderator.md                        ← Synthesis agent (compiles panel output)
└── classifier.md                       ← Question classification (Haiku-optimized)
```

---

## Skills & Tools

| Tool | When | Purpose |
|------|------|---------|
| `schemas/agent-output.json` | Every prompt edit | Ensures prompt output conforms to the structured schema |
| `docs/specs/PRODUCT-POSITIONING.md` | When editing any user-facing language | Enforces exploration framing (never prescriptive) |
| `docs/specs/supplement-evidence-framework.md` | When editing supplement-related sections | Correct evidence tier language (S/A/B/C/D) |

---

## Hard Rules

1. **Every specialist prompt must output valid JSON conforming to `agent-output.json`** — no exceptions
2. **Never use prescriptive language** — "we recommend" is banned. Use "a specialist might consider" language per PRODUCT-POSITIONING.md
3. **Every prompt must include epistemic humility** — explicit "I don't know" and "outside my expertise" behaviors encoded
4. **Evidence claims must be tagged** — established / guideline / recent / clinical reasoning / uncertain
5. **Anti-hallucination measures in every prompt** — never fabricate citations, never guess dosages
6. **The base template pattern must be followed** — swap domain-specific sections, keep universal structure
