# MedPanel AI -- Second Audit Pass

**Date:** 2026-03-24
**Auditor:** Schema-Prompt Alignment Verification
**Scope:** 6 schemas (shared-definitions, agent-output, consultation, evidence-package, classification-output, synthesis-output), 8 prompts (6 specialists + moderator + classifier)
**Context:** First audit found 20 critical issues. Fixes have been applied. This pass verifies completeness and checks for regressions.

---

## Check 1: Schema-Prompt Field Matrix (Round 1)

**Verdict: FAIL**

The `agent-output.json` Round 1 schema (`round_1_output`) requires these fields:
`round`, `findings[]`, `recommendations[]`, `risk_flags[]`, `information_gaps[]`, `confidence_summary`, `questions_for_doctor[]`

Plus the top-level required fields: `agent_id`, `specialist_type`, `round`, `model`, `timestamp`, `token_usage`

### Required Field Coverage Matrix

| Schema Field | cardio | endo | nephro | neuro | func-med | pharma |
|---|---|---|---|---|---|---|
| `agent_id` | YES | YES | YES | YES | YES | YES |
| `specialist_type` (enum from shared-defs) | NO (1) | NO (1) | NO (1) | NO (1) | NO (1) | NO (1) |
| `round` | YES | YES | YES | YES | YES | YES |
| `model` | NO (2) | NO (2) | NO (2) | NO (2) | NO (2) | NO (2) |
| `timestamp` | NO (2) | NO (2) | NO (2) | NO (2) | NO (2) | NO (2) |
| `token_usage` | NO (2) | NO (2) | NO (2) | NO (2) | NO (2) | NO (2) |
| `findings[]` | YES | YES | YES | YES | YES | YES |
| `findings[].id` | YES | YES | YES | YES | YES | YES |
| `findings[].category` | YES (3) | YES (3) | YES (3) | YES (3) | YES (3) | YES (3) |
| `findings[].description` | YES | YES | YES | YES | YES | YES |
| `findings[].severity` | MISMATCH (4) | MISMATCH (4) | MISMATCH (4) | MISMATCH (4) | MISMATCH (4) | MISMATCH (4) |
| `findings[].confidence` (0.0-1.0) | YES | YES | YES | YES | YES | YES |
| `findings[].evidence_basis` | YES (5) | YES (5) | YES (5) | YES (5) | YES (5) | YES (5) |
| `findings[].evidence_tier` | NO (6) | NO (6) | NO (6) | NO (6) | NO (6) | NO (6) |
| `findings[].clinical_significance` | NO | NO | NO | NO | NO | NO |
| `findings[].relevant_labs` | NO | NO | NO | NO | NO | NO |
| `findings[].interaction_flags` | YES | YES | YES | YES | YES | YES |
| `findings[].evidence_citations` | NO (7) | NO (7) | NO (7) | NO (7) | NO (7) | NO (7) |
| `recommendations[]` | NO (8) | NO (8) | NO (8) | NO (8) | NO (8) | NO (8) |
| `risk_flags[]` (safety_flag type) | PARTIAL (9) | PARTIAL (9) | PARTIAL (9) | PARTIAL (9) | PARTIAL (9) | PARTIAL (9) |
| `information_gaps[]` (structured) | NO (10) | NO (10) | NO (10) | NO (10) | NO (10) | NO (10) |
| `cross_domain_questions[]` (structured) | NO (11) | NO (11) | NO (11) | NO (11) | NO (11) | NO (11) |
| `confidence_summary.overall_confidence` (numeric) | YES | YES | YES | YES | YES | YES |
| `confidence_summary.highest_confidence_finding` | YES | YES | YES | YES | YES | YES |
| `confidence_summary.lowest_confidence_recommendation` | NO (12) | NO (12) | NO (12) | NO (12) | NO (12) | NO (12) |
| `confidence_summary.factors_reducing_confidence` | NO | NO | NO | NO | NO | NO |
| `confidence_summary.what_would_change_assessment` | NO | NO | NO | NO | NO | NO |
| `questions_for_doctor[]` (string array) | YES | YES | YES | YES | YES | YES |

### Issue Notes

1. **specialist_type**: Prompts use `"specialty": "cardiology"` instead of `"specialist_type": "cardiologist"`. The field name is wrong (`specialty` vs `specialist_type`) AND the values are domain names not role names (e.g., `"cardiology"` vs `"cardiologist"`).

2. **model, timestamp, token_usage**: These are orchestrator-injected fields. Reasonable for the LLM not to produce them. However, the prompts should either include them as placeholders or the orchestrator documentation should note it injects them. Currently ambiguous.

3. **findings[].category**: Prompts use specialty-specific category enums (e.g., `coronary|electrophysiology|heart_failure|...`). Schema uses a universal enum (`abnormal_lab|symptom_pattern|risk_factor|drug_interaction|clinical_correlation|information_gap`). These are completely different taxonomies.

4. **findings[].severity**: ALL 6 prompts use `"red|orange|yellow|green"`. Schema uses `$ref` to shared-definitions severity: `"critical|high|moderate|low|informational"`. This is the EXACT same mismatch the first audit flagged. **Not fixed in prompts.**

5. **findings[].evidence_basis**: Prompts use `"strong_evidence|moderate_evidence|preliminary_evidence|mechanistic_only|traditional_use|expert_opinion|insufficient|clinical_reasoning"`. Schema uses a fixed enum: `"direct_lab_value|clinical_guideline|research_evidence|clinical_reasoning|patient_reported"`. Completely different.

6. **findings[].evidence_tier**: Schema has this as `$ref` to shared-definitions evidence_tier. Prompts do not include this field in the findings output structure (they have `evidence_basis` which serves a different purpose).

7. **findings[].evidence_citations**: Schema requires citation ID references. Prompts have a separate top-level `evidence_cited[]` array with inline citation objects instead of ID references.

8. **recommendations[]**: Schema requires a full `recommendations[]` array with `id`, `type`, `action`, `priority`, `confidence`, `evidence_quality`, `what_if_not_followed`, etc. **No prompt includes a recommendations array.** Prompts have `perspectives[]` instead, which has a different structure. This is a critical gap -- the entire recommendations pipeline in the schema has no prompt-side counterpart.

9. **risk_flags[]**: Schema uses `$ref` to `shared-definitions.json#/$defs/safety_flag` which requires `flag_id`, `concern`, `severity` (unified enum), `urgency`. Prompts produce `id`, `severity` (color enum), `description`, `requires_specialist`. Field names and severity enums differ.

10. **information_gaps[]**: Schema requires structured objects with `what_is_missing`, `why_it_matters`, `how_to_obtain`. Prompts produce a plain string array.

11. **cross_domain_questions[]**: Schema requires structured objects with `to_specialist`, `question`, `context`. Prompts produce a plain string array.

12. **confidence_summary**: Schema has `lowest_confidence_recommendation` (referencing recommendation IDs). Since prompts have no recommendations, this field cannot be populated.

### Summary

Out of ~25 required fields/structures in the Round 1 schema, prompts correctly produce about 8, partially produce 4, and completely miss or mismatch 13. The schema was rewritten to match the DISCUSSION-PROTOCOL spec, but the prompts were NOT rewritten to match the new schema. The prompts still use a structure closer to the OLD schema with some additions (e.g., Round 2 cross-examination fields, unified evidence tier vocabulary section).

---

## Check 2: Enum Consistency

**Verdict: FAIL**

### Severity Enum

| Source | Values Used |
|---|---|
| `shared-definitions.json` severity | `critical, high, moderate, low, informational` |
| All 6 specialist prompts (findings, risk_flags) | `red, orange, yellow, green` |
| All 6 specialist prompts (Round 2 cross_domain_risks) | `red, orange, yellow, green` |
| All 6 specialist prompts (Round 2 disagreements) | `fundamental, nuanced, minor` |
| Moderator prompt (safety_summary, safety_level) | `red, orange, yellow, green` |

**Every prompt uses the OLD color-based severity scale.** The schema's unified severity enum (`critical/high/moderate/low/informational`) appears in ZERO prompts.

### Evidence Tier Enum

| Source | Values Used |
|---|---|
| `shared-definitions.json` evidence_tier | `strong, moderate, preliminary, mechanistic_or_theoretical, expert_opinion, extrapolated, insufficient` |
| All 6 specialist prompts (evidence_basis field) | `strong_evidence, moderate_evidence, preliminary_evidence, mechanistic_only, traditional_use, expert_opinion, insufficient, clinical_reasoning` |
| All 6 specialist prompts (evidence_support field) | `strong_evidence, moderate_evidence, preliminary_evidence, mechanistic_only, expert_opinion` |

Mismatches:
- Prompts use `strong_evidence` vs schema `strong` (suffix difference)
- Prompts use `mechanistic_only` vs schema `mechanistic_or_theoretical`
- Prompts include `traditional_use` and `clinical_reasoning` which are NOT in the schema enum
- Schema includes `extrapolated` which is in NO prompt
- The UNIFIED EVIDENCE TIER VOCABULARY section at the bottom of each prompt defines the 7-value set. These are CLOSE but not identical to the schema values.

### Confidence Type

| Source | Type |
|---|---|
| `shared-definitions.json` confidence | `number, 0.0-1.0` |
| All 6 specialist prompts | `0.0-1.0` (correct) |
| Moderator prompt `synthesis_metadata.overall_confidence` | `"high|moderate|low|mixed"` (string enum -- WRONG) |

The moderator prompt still uses a string enum for confidence, contradicting the numeric type in shared-definitions.

### Specialist Type Naming

| Source | Pharmacologist Value |
|---|---|
| `shared-definitions.json` specialist_type | `clinical_pharmacologist` |
| All specialist prompts (agent_id) | `pharmacologist` |
| Moderator prompt (line 29) | `pharmacologist` |

The schema uses `clinical_pharmacologist` but every prompt references `pharmacologist`. This will cause validation failures or routing mismatches.

### Consensus Level Enum

| Source | Values |
|---|---|
| `shared-definitions.json` consensus_level | `strong_consensus, moderate_consensus, single_specialist_domain, disagreement` |
| Moderator prompt (consensus_areas) | `"strong|moderate"` |

Moderator uses shortened values. Missing `single_specialist_domain` and `disagreement`.

### Source Type Enum (evidence_cited)

| Source | Values |
|---|---|
| `shared-definitions.json` study_type | `systematic_review, meta_analysis, rct, cohort, case_control, cross_sectional, case_report, guideline, mechanistic, expert_opinion, narrative_review, unknown` |
| All 6 specialist prompts | `systematic_review, meta_analysis, rct, cohort, case_control, guideline, case_report, mechanistic, expert_opinion, general_knowledge` |

Prompts include `general_knowledge` (not in schema). Schema includes `cross_sectional`, `narrative_review`, `unknown` (not in prompts).

---

## Check 3: Cross-Specialist Flag Coverage

**Verdict: PASS**

All 6 specialist prompts include a STEP 5 (or STEP 6 for pharmacologist) titled "CROSS-SPECIALIST FLAGS" that explicitly names the other 5 specialists. Each specialist flags at least 5 things for other specialists:

| Specialist | Flags For |
|---|---|
| Cardiologist | endocrinologist, nephrologist, pharmacologist, neuropsychiatrist, functional medicine |
| Endocrinologist | cardiologist, nephrologist, pharmacologist, neuropsychiatrist, functional medicine |
| Nephrologist | cardiologist, endocrinologist, pharmacologist, neuropsychiatrist, functional medicine |
| Neuropsychiatrist | endocrinologist, cardiologist, nephrologist, pharmacologist, functional medicine |
| Functional Medicine | cardiologist, endocrinologist, nephrologist, neuropsychiatrist, pharmacologist |
| Pharmacologist | cardiologist, nephrologist, endocrinologist, neuropsychiatrist, functional medicine |

All flagged specialist types correspond to actual specialist prompts. The one naming discrepancy: prompts reference "pharmacologist" but the `specialist_type` enum in shared-definitions uses `clinical_pharmacologist`. This is an enum issue (covered in Check 2), not a coverage gap.

Additionally, each prompt includes a `risk_flags[].requires_specialist` field and a `cross_domain_questions[]` array in the output structure, providing the structured mechanism for cross-specialist flagging.

---

## Check 4: Evidence Citation Flow

**Verdict: PARTIAL**

### Intended Flow

```
evidence-package.json (citations with citation_id)
    → agent receives {evidence_package} with citations[]
        → agent references citations by citation_id in findings[].evidence_citations
            → moderator aggregates citations
                → synthesis-output.json evidence_landscape.key_citations
```

### Actual State

1. **evidence-package.json** -- correctly defines citations via `$ref` to `shared-definitions.json#/$defs/citation`, which includes `citation_id`. GOOD.

2. **Prompts receive evidence package** -- all 6 prompts include `{evidence_package}` slot and explicit instructions: "When citing evidence, reference studies from the evidence package by their citation ID." GOOD.

3. **Agent output references citations** -- HERE IS THE BREAK. The schema (`agent-output.json`) has `findings[].evidence_citations` (array of citation ID strings). But the prompts produce `evidence_cited[]` as a TOP-LEVEL array with inline citation objects (`claim`, `source_type`, `source_description`, `pmid`, `verified`). The prompts do NOT produce `findings[].evidence_citations` at all. The prompts also do NOT reference citation IDs in their `evidence_cited` entries -- they use a different citation structure entirely.

4. **Moderator aggregation** -- The moderator prompt (Phase 5) says "Compile all evidence_cited entries into a unified reference section, deduplicating by PMID where available." This references the PROMPT's `evidence_cited` field name (correct for what prompts produce), not the SCHEMA's `findings[].evidence_citations` field. The moderator also compiles into `unified_citations[]` in its output.

5. **synthesis-output.json** -- Has `evidence_landscape.key_citations[]` using `$ref` to `shared-definitions.json#/$defs/citation` (the full citation object with `citation_id`). Also has `recommendations[].source_recommendation_ids` for tracing.

### Broken Links

- **Agent -> Moderator**: The prompt-level `evidence_cited[]` uses a DIFFERENT schema than `shared-definitions.json#/$defs/citation`. The prompt version has `source_type`, `source_description`, `verified` (boolean). The schema version has `study_type`, `title`, `authors`, `verification_status` (enum). These are structurally incompatible.
- **Citation ID chain**: evidence-package provides citation_ids, prompts SAY to reference by citation ID, but the output structure in the prompts does not include a `citation_id` reference field. The `evidence_cited[].pmid` field is the closest, but it is not the same as `citation_id`.
- **Moderator -> Synthesis**: The moderator's `unified_citations[]` structure does not match `synthesis-output.json`'s `evidence_landscape.key_citations[]` which uses the shared definition citation type.

The citation flow is conceptually designed but structurally broken at every handoff point.

---

## Check 5: Known Stale References

**Verdict: PARTIAL (2 of 3 resolved)**

### 5a. specialist-agent-prompt-template.md uses OLD field names

The template still uses: `response_metadata`, `problem_representation`, `exploration_areas`, `supplement_considerations`, `perspectives_to_explore`, `questions_for_your_doctor`, `lifestyle_considerations`.

**Impact assessment**: No code exists in `src/` -- only `CONTEXT.md` is present. The template is NOT referenced by any code at runtime. It is referenced only in:
- `skills/audit-prompt/SKILL.md` (audit tooling)
- `docs/AUDIT-PROMPTS.md` (audit report)
- `CLAUDE.md` (project map, listed in folder structure)
- `prompts/CONTEXT.md` (prompt workspace router)

**Verdict**: Not a runtime risk. But it IS a developer confusion risk -- someone using the template to build a new specialist prompt will produce the wrong output format. The template should be either (a) rewritten to match the production prompts, or (b) have a prominent deprecation notice added. LOW priority.

### 5b. moderator.md line 252 has `questions_for_your_doctor` (old name)

**CONFIRMED STILL PRESENT.** The moderator prompt at line 252 uses `questions_for_your_doctor` inside the `patient_mode_output` section. The schema field name is `questions_for_doctor`. However, this is within the moderator's OWN output structure (not referencing the specialist schema), and the synthesis-output.json uses `questions_for_doctor` at the top level.

The moderator prompt has TWO different question field names:
- Line 32: references `questions_for_doctor[]` (correct, when describing specialist input)
- Line 252: uses `questions_for_your_doctor` (incorrect, in its own patient_mode_output)

Additionally, the moderator's `patient_mode_output.questions_for_your_doctor` structure (object with `question`, `why_ask_this`, `what_to_listen_for`, `priority`, `source_specialists`) does NOT match `synthesis-output.json`'s `questions_for_doctor` structure (object with `question`, `context`, `ask_who`, `priority`, `source_specialists`). Field names differ (`why_ask_this` vs `context`, missing `ask_who`).

**Verdict**: Needs fix. Two problems: wrong field name AND wrong field structure.

### 5c. source_confidence in shared-definitions.json

`source_confidence` uses string enum `["high", "moderate", "low"]`. This is used in the `interaction` type for reliability of interaction data sources (DrugBank, Natural Medicines, etc.). The numeric `confidence` type (0.0-1.0) is for clinical confidence in findings and recommendations.

**Verdict**: These are intentionally different concepts. `source_confidence` = data source reliability (categorical assessment of how trustworthy a database is). `confidence` = clinical confidence (continuous score for quantitative comparison). The naming is potentially confusing but semantically correct. No fix needed, though a cross-reference note in the description would help.

---

## Check 6: Synthesis Schema vs Moderator Prompt

**Verdict: FAIL**

Field-by-field comparison of `synthesis-output.json` required fields vs moderator prompt output structure:

| synthesis-output.json field | Moderator prompt equivalent | Match? |
|---|---|---|
| `synthesis_id` (uuid) | Not present | MISSING |
| `generated_at` (datetime) | `synthesis_metadata.timestamp` | NAME MISMATCH |
| `specialists_synthesized` (string[]) | `synthesis_metadata.specialists_included` | NAME MISMATCH |
| `rounds_synthesized` (integer) | `synthesis_metadata.round` | TYPE MISMATCH (schema: integer for count, prompt: string for "which round") |
| `safety_summary.emergency_detected` (bool) | Not present | MISSING |
| `safety_summary.flags[]` | `safety_summary.red_flags[] + orange_flags[] + yellow_flags[] + green_flags[]` | STRUCTURAL MISMATCH -- schema uses single array with severity field; prompt uses 4 separate arrays |
| `safety_summary.flags[].severity` | Implicit from array name | Different structure |
| `safety_summary.flags[].urgency` | Not present | MISSING |
| `safety_summary.flags[].source_specialists` | `safety_summary.*.source_specialists` | Present but in different structure |
| `safety_summary.interaction_warnings` | Not present in safety_summary | MISSING |
| `consensus_items[]` | `patient_mode_output.where_perspectives_align[]` + `physician_mode_output.consensus_areas[]` | STRUCTURAL MISMATCH -- schema has unified array, prompt splits into two mode-specific arrays |
| `consensus_items[].consensus_level` | `physician_mode_output.consensus_areas[].consensus_level` = `"strong|moderate"` | PARTIAL -- missing `single_specialist_domain`, `disagreement` |
| `consensus_items[].evidence_tier` | Present in physician mode | OK |
| `consensus_items[].false_consensus_flag` | Not present | MISSING |
| `consensus_items[].devils_advocate_note` | Not present | MISSING |
| `divergent_items[]` | `patient_mode_output.where_perspectives_differ[]` + `physician_mode_output.disagreement_areas[]` | STRUCTURAL MISMATCH |
| `divergent_items[].resolution_status` | Not present | MISSING |
| `evidence_landscape` (by tier) | `physician_mode_output.unified_evidence_landscape` | OK (structure matches) |
| `evidence_landscape.key_citations[]` | `physician_mode_output.unified_citations[]` | STRUCTURAL MISMATCH (different field names and structure) |
| `recommendations[]` | Not present as synthesis-level array | MISSING -- the moderator prompt has no synthesized recommendations array |
| `questions_for_doctor[]` | `patient_mode_output.questions_for_your_doctor[]` | NAME MISMATCH + STRUCTURE MISMATCH (see Check 5b) |
| `information_gaps[]` | `exploration_completeness.suggested_follow_up` | STRUCTURAL MISMATCH |
| `deferred_concerns[]` | Not present | MISSING |
| `disclaimers` | `disclaimers` | OK |
| `meta` | Not present | MISSING |

### Critical Gaps

1. **No `recommendations[]` array**: The moderator prompt has no instruction to compile a unified, deduplicated recommendations list. The synthesis-output.json has a full `recommendations[]` with `recommendation_id`, `action`, `category`, `priority`, `evidence_tier`, `consensus_status`, `source_specialists`, `source_recommendation_ids`, `monitoring_plan`, `what_if_not_followed`. This is a major missing section.

2. **No `false_consensus_flag` or `devils_advocate_note`**: The synthesis schema includes false consensus detection, but the moderator prompt has no instructions to perform this check.

3. **No `deferred_concerns[]`**: The schema tracks concerns deferred from Round 3, but the moderator has no instruction to collect them.

4. **No `meta` statistics**: The schema expects counts of findings, recommendations, disagreements. The moderator has no instruction to produce these.

5. **Dual-mode split vs unified schema**: The moderator prompt produces TWO separate output trees (`patient_mode_output` and `physician_mode_output`). The synthesis-output.json is a SINGLE unified structure. The consultation.json handles the dual mode separately (`output_patient_mode` as rendered string, `output_physician_mode` as rendered string, `synthesis` as the structured data). The moderator needs to produce the synthesis-output.json structure AND the two rendered outputs.

---

## Check 7: Classification Schema vs Classifier Prompt

**Verdict: PARTIAL**

Field-by-field comparison of `classification-output.json` required fields vs classifier prompt output:

| classification-output.json field | Classifier prompt equivalent | Match? |
|---|---|---|
| `intent` (consultation_type enum) | Not present | MISSING (1) |
| `organ_systems[]` (domain enum) | `routing[]` (domain shortcodes) | PARTIAL (2) |
| `urgency` (urgency enum) | `urgency` | PARTIAL (3) |
| `diagnostic_uncertainty` (0-10) | Not present | MISSING |
| `treatment_conflict` (0-10) | Not present | MISSING |
| `reasoning_brief` (string) | `reasoning` (string) | NAME MISMATCH |
| `complexity_score` (0-10) | Not present (has `complexity` as string tier) | TYPE/CONCEPT MISMATCH (4) |
| `specialists_selected[]` (specialist_type enum) | `routing[]` (domain shortcodes) | MISMATCH (5) |
| `model_assignment` | `model_assignment` | OK |
| `secondary_domains[]` (domain enum) | `secondary_domains[]` | PARTIAL (6) |
| `emergency_detected` (bool) | Implicit from `urgency: "emergency"` | STRUCTURAL MISMATCH |
| `emergency_response` (string) | `message` | NAME MISMATCH |
| `safety_system_flags` | Not present | MISSING |
| `routing_modifiers` | `patient_context_modifiers` (string array) | STRUCTURAL MISMATCH (7) |
| `budget_tier` | Not present | MISSING |

### Issue Notes

1. **intent**: The schema requires a `consultation_type` enum (`diagnostic|therapeutic|prognostic|preventive|optimization|medication_management|interpretation|second_opinion`). The classifier prompt never classifies by intent type. It only routes by domain and urgency. This is a complete gap -- Axis 1 from the QUESTION-CLASSIFICATION spec is not implemented in the prompt.

2. **organ_systems**: Classifier uses shortcodes (`cardio`, `endo`, `nephro`, `neuro`, `func`, `pharma`). Schema uses the domain enum (`CARDIO`, `ENDO`, `NEURO`, `PSYCH`, `GI`, `RENAL`, ...). Different values, different casing, and incomplete mapping (`func` has no domain code, `pharma` has `PHARM`).

3. **urgency**: Classifier uses `"routine|urgent|emergency"`. Schema uses `"emergent|urgent|semi_urgent|routine|optimization"`. Missing `emergent` (uses `emergency` instead), missing `semi_urgent` and `optimization`.

4. **complexity_score**: Schema expects a numeric 0-10 score. Prompt produces a string tier (`simple|moderate|complex|full_panel`).

5. **specialists_selected**: Schema expects specialist_type enum values (`cardiologist`, `endocrinologist`, etc.). Prompt outputs domain shortcodes (`cardio`, `endo`, etc.).

6. **secondary_domains**: Present in prompt examples but uses shortcodes, not domain enum.

7. **routing_modifiers**: Schema expects structured booleans (`polypharmacy`, `geriatric`, `pregnancy`, `narrow_therapeutic_index`, `high_supplement_count`). Prompt produces a string array (`["age >= 65", "medication_count >= 5"]`).

---

## Remaining Fixes

### P0 -- Blocks Integration (Schema-Prompt alignment)

**FIX-1: Severity enum in ALL specialist prompts + moderator**
Replace all instances of `"severity": "red|orange|yellow|green"` and `"combined_severity": "red|orange|yellow|green"` with `"severity": "critical|high|moderate|low|informational"` in all 6 specialist prompts and the moderator prompt. Also replace the moderator's 4-array safety structure (`red_flags[]`, `orange_flags[]`, etc.) with a single `flags[]` array using severity field.

Files: `cardiologist.md`, `endocrinologist.md`, `nephrologist.md`, `neuropsychiatrist.md`, `functional-medicine.md`, `pharmacologist.md`, `moderator.md`

**FIX-2: specialist_type naming**
In `shared-definitions.json`, change `"clinical_pharmacologist"` to `"pharmacologist"` in the specialist_type enum (all prompts use `pharmacologist`; changing 6 prompts is worse than changing 1 schema value). Alternatively, update all prompts -- but the schema should match the actual agent naming convention.

Also: all prompts use `"specialty": "cardiology"` etc. as an output field. This needs to either be (a) removed (since `specialist_type` already identifies the agent), or (b) the schema needs to accept it as an additional field. Currently the schema does not define a `specialty` field.

File: `shared-definitions.json` or all 6 specialist prompts

**FIX-3: Recommendations array in all specialist prompts**
The schema requires a `recommendations[]` array. No prompt produces one. Each prompt's `perspectives[]` array is the closest analog but has a completely different structure. Either:
- (a) Add a `recommendations[]` section to each specialist prompt matching the schema, OR
- (b) Rename/restructure `perspectives[]` to match `recommendations[]`, OR
- (c) Remove `recommendations[]` from the schema and keep `perspectives[]` as the canonical output.

Option (a) or (b) recommended, since recommendations are needed for the outcome tracking pipeline and the synthesis-output.

Files: All 6 specialist prompts

**FIX-4: findings[].category enum alignment**
Schema uses universal categories (`abnormal_lab|symptom_pattern|risk_factor|drug_interaction|clinical_correlation|information_gap`). Prompts use specialty-specific categories (`coronary|electrophysiology|heart_failure|...`). Either:
- (a) Change schema to accept specialty-specific categories (add them all to the enum or use a string without enum constraint), OR
- (b) Change prompts to use universal categories and add a `domain` subfield for specialty specifics.

File: `agent-output.json` or all 6 specialist prompts

**FIX-5: findings[].evidence_basis enum alignment**
Prompts use `strong_evidence|moderate_evidence|preliminary_evidence|mechanistic_only|traditional_use|expert_opinion|insufficient|clinical_reasoning`. Schema uses `direct_lab_value|clinical_guideline|research_evidence|clinical_reasoning|patient_reported`. These serve different purposes. The schema `evidence_basis` seems to describe WHERE evidence comes from; the prompt version describes HOW STRONG it is (which overlaps with `evidence_tier`). Clarify whether both fields are needed or merge them.

File: `agent-output.json` or all 6 specialist prompts

**FIX-6: risk_flags structure alignment**
Prompts produce `{id, severity, description, requires_specialist}`. Schema expects `{flag_id, concern, severity, urgency, action_required, requires_specialist}` via `$ref` to safety_flag. Align the field names.

Files: All 6 specialist prompts

**FIX-7: information_gaps structure**
Prompts produce plain string array. Schema requires `{what_is_missing, why_it_matters, how_to_obtain}` objects. Update prompts to use structured format.

Files: All 6 specialist prompts

**FIX-8: cross_domain_questions structure**
Prompts produce plain string array. Schema requires `{to_specialist, question, context}` objects. Update prompts to use structured format.

Files: All 6 specialist prompts

**FIX-9: Evidence citation structure alignment**
Prompts produce top-level `evidence_cited[]` with inline citations. Schema expects `findings[].evidence_citations` as citation ID references. The citation flow is broken at every handoff. Decide on ONE citation structure and apply it everywhere.

Recommended: Keep the prompt's top-level `evidence_cited[]` (agents need to cite evidence) but change its structure to match `shared-definitions.json#/$defs/citation`, and ADD `evidence_citations` (citation_id array) to each finding.

Files: All 6 specialist prompts

### P1 -- Blocks Synthesis Pipeline

**FIX-10: Moderator prompt output -> synthesis-output.json alignment**
The moderator prompt output structure does not match synthesis-output.json. The moderator needs to produce:
- `synthesis_id`, `generated_at`, `specialists_synthesized`, `rounds_synthesized` (metadata)
- `safety_summary` with unified `flags[]` array (not 4 separate color arrays)
- `consensus_items[]` as a unified array with `consensus_level`, `evidence_tier`, `false_consensus_flag`, `devils_advocate_note`
- `divergent_items[]` with `resolution_status`
- `recommendations[]` (synthesized, deduplicated, with source tracing)
- `questions_for_doctor` (not `questions_for_your_doctor`)
- `information_gaps[]`, `deferred_concerns[]`, `meta`

The dual patient/physician mode outputs can remain as ADDITIONAL fields, but the structured synthesis-output.json fields must be the PRIMARY output.

File: `moderator.md`

**FIX-11: Moderator confidence type**
Line 200 uses `"overall_confidence": "high|moderate|low|mixed"` (string enum). Should be numeric 0.0-1.0 per shared-definitions.

File: `moderator.md`

**FIX-12: Moderator questions field name**
Line 252 uses `questions_for_your_doctor`. Change to `questions_for_doctor`.

File: `moderator.md`

### P2 -- Blocks Classification Pipeline

**FIX-13: Classifier prompt -> classification-output.json alignment**
The classifier prompt is missing several schema fields. Add:
- `intent` (consultation_type classification -- Axis 1 from the spec)
- `diagnostic_uncertainty` and `treatment_conflict` (numeric subscores)
- `complexity_score` (numeric, not string tier)
- `emergency_detected` (explicit boolean)
- `safety_system_flags`
- `routing_modifiers` as structured booleans (not string array)
- `budget_tier` computation
- Map `routing[]` shortcodes to proper specialist_type enum values
- Map urgency values to the canonical urgency enum

File: `classifier.md`

### P3 -- Cleanup

**FIX-14: Template deprecation**
Add a deprecation header to `specialist-agent-prompt-template.md`:
```
> DEPRECATED: This template uses the OLD output format. See the individual
> specialist prompts (cardiologist.md, etc.) for the current production format.
> This file is retained as a historical reference only.
```

File: `prompts/specialist-agent-prompt-template.md`

**FIX-15: Round 2 disagreement severity enum**
All prompts use `"severity": "fundamental|nuanced|minor"` for disagreements. The schema uses `$ref` to shared-definitions severity (`critical|high|moderate|low|informational`). These are different concepts -- disagreement intensity vs clinical severity. The schema should either use a separate `disagreement_severity` type or the prompts should map to the unified severity scale.

File: `shared-definitions.json` (add `disagreement_severity` type) or all 6 specialist prompts

**FIX-16: Evidence tier vocabulary suffix mismatch**
Prompt evidence tiers use suffixed names (`strong_evidence`, `moderate_evidence`). Schema evidence_tier uses bare names (`strong`, `moderate`). One must change to match the other. Since the schema is the source of truth and is referenced by `$ref` everywhere, the prompts should drop the `_evidence` suffix.

Files: All 6 specialist prompts (EVIDENCE TIER VOCABULARY sections and output format sections)

---

## Summary Scorecard

| Check | Verdict | Blocking? |
|---|---|---|
| 1. Schema-Prompt Field Matrix | **FAIL** | YES -- 13/25 fields missing or mismatched |
| 2. Enum Consistency | **FAIL** | YES -- severity, evidence tier, confidence type, specialist naming all wrong |
| 3. Cross-Specialist Flag Coverage | **PASS** | No |
| 4. Evidence Citation Flow | **PARTIAL** | YES -- chain broken at every handoff |
| 5. Known Stale References | **PARTIAL** | Moderate -- moderator field name wrong, template stale but not runtime |
| 6. Synthesis Schema vs Moderator | **FAIL** | YES -- major structural mismatch, no recommendations, no false consensus |
| 7. Classification Schema vs Classifier | **PARTIAL** | YES -- missing Axis 1 intent, numeric scores, budget tier |

**Bottom line**: The schemas were thoroughly rewritten to address the first audit's findings. They now properly define round-specific output shapes, use shared definitions, have unified enums, and cover the full discussion protocol. However, the 8 prompt files were NOT updated to produce the new schema structures. The prompts still output the OLD format with some surface-level additions (unified evidence tier vocabulary section, two-tier safety, cross-examination fields). The result is that schemas and prompts are now MORE misaligned than before the fix, because the schemas moved to match the spec while the prompts stayed mostly in place.

**Recommended fix order**: FIX-1 (severity enum) -> FIX-3 (recommendations) -> FIX-9 (citations) -> FIX-10 (moderator) -> FIX-13 (classifier) -> remaining fixes. This unblocks the integration pipeline in priority order.
