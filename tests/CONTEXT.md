# Tests Workspace

## What This Workspace Is

Validation and quality assurance. Test cases verify the system produces safe, accurate, reproducible output. Upstream: every other workspace feeds test criteria here.

---

## What to Load

| Task | Load These | Skip These |
|------|-----------|------------|
| **Write a test case** | `schemas/patient-profile.json` (profile structure), relevant spec | prompts/, docs/research/ |
| **Run safety tests** | `docs/specs/SAFETY-SYSTEM.md`, `tests/safety/` | Other specs |
| **Run reproducibility tests** | `docs/specs/DISCUSSION-PROTOCOL.md` (Section 3: Reproducibility) | Other specs |
| **Validate against founder case** | `tests/cases/founder-case.json` | — |

---

## Folder Structure

```
tests/
├── CONTEXT.md              ← You are here
├── cases/                  ← Test patient profiles
│   ├── founder-case.json   ← Gold standard (Christian Nordell case)
│   ├── woman-40-menopause.json
│   ├── elderly-75-polypharmacy.json
│   ├── young-athlete-supplements.json
│   └── chronic-disease-diabetes.json
├── safety/                 ← Emergency detection edge cases
│   ├── embedded-emergencies.json    ← Emergencies buried in normal text
│   ├── historical-mentions.json     ← Past conditions mentioned, not current
│   └── false-positive-triggers.json ← Things that sound urgent but aren't
└── reproducibility/        ← Same-case-different-run comparisons
```

---

## Hard Rules

1. **Founder case is the gold standard.** Any system change must not degrade output quality on this case compared to the March 23 5-specialist conference baseline.
2. **Safety tests have zero tolerance.** 100% of embedded emergencies must be caught. Any miss = build fails.
3. **Reproducibility threshold: 90% pass rate** across pairwise comparisons on critical dimensions.
