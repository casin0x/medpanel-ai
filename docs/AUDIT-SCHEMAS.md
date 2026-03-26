# Schema Audit Report

**Audited:** 2026-03-24
**Schemas:** `patient-profile.json`, `consultation.json`, `agent-output.json`
**Cross-referenced against:** `DISCUSSION-PROTOCOL.md`, `EVIDENCE-PIPELINE.md`

---

## 1. Missing Fields

### 1a. agent-output.json vs DISCUSSION-PROTOCOL.md Round 1 Output

The Round 1 output schema in DISCUSSION-PROTOCOL.md (lines 208-286) defines fields that do not exist in `agent-output.json`:

| Field in Spec | Present in agent-output.json? | Impact |
|---|---|---|
| `agent_id` (e.g. `"endocrinology_001"`) | Missing. Only `specialist_type` exists. | No way to distinguish multiple agents of the same specialty or track per-agent outputs across rounds. |
| `model` (e.g. `"claude-opus-4-6"`) | Missing | Cannot track which model version produced the output. |
| `timestamp` | Missing | No temporal ordering of agent outputs. |
| `token_usage` (`{ input, output }`) | Missing | Cannot enforce per-agent budget limits. |
| `findings[].id` (e.g. `"F-ENDO-001"`) | Missing. `key_findings` exists but items have no `id`. | Round 2 cross-examination references findings by ID (`"F-ENDO-001"`). Without IDs, structured cross-referencing is impossible. |
| `findings[].confidence` (number 0.0-1.0) | Missing. Top-level `confidence` exists but is `{overall: string enum}`, not per-finding. | Spec uses numeric per-finding confidence (e.g. `0.92`). Schema uses string enum at top level. |
| `findings[].interaction_flags` | Missing | Spec mandates these for triggering cross-domain questions. Without them, the cross-examination protocol breaks. |
| `findings[].relevant_labs` | Missing | Spec includes this for tracing findings back to specific lab values. |
| `recommendations` array | Missing entirely. | The spec's Round 1 output has a full `recommendations[]` with `id`, `type`, `action`, `priority`, `confidence`, `contraindication_check`, `evidence_quality`, `evidence_sources`, `monitoring_plan`, `what_if_not_followed`. None of this exists in `agent-output.json`. |
| `risk_flags[].id` | Missing. `safety_flags` exists but items have no ID. | Round 2 references risk flags by ID. |
| `risk_flags[].requires_specialist` | Missing | Spec uses this to route cross-domain risk flags. |
| `risk_flags[].urgency` | Missing | Spec distinguishes `routine` from `urgent` risk flags. |
| `information_gaps` array | Missing | Spec has explicit `what_is_missing` / `why_it_matters` / `how_to_obtain` for gaps. Schema has nothing equivalent. |
| `cross_domain_questions` | Missing | Spec mandates these when `interaction_flags` are raised. Schema has no field for specialist-to-specialist questions. |
| `confidence_summary` (with `overall_confidence` as number, `highest_confidence_finding`, `lowest_confidence_recommendation`, `factors_reducing_confidence`) | Missing. Schema has `confidence.overall` as string enum `["high", "moderate", "low", "uncertain"]`. | **Type mismatch**: Spec uses numeric 0.0-1.0, schema uses string enum. |

### 1b. agent-output.json vs DISCUSSION-PROTOCOL.md Round 2 Output

Round 2 (lines 342-410) defines a substantially different schema than `agent-output.json`:

| Field in Spec | Present in agent-output.json? | Impact |
|---|---|---|
| `responding_to` (array of agent IDs) | Missing | No structured tracking of which agents were reviewed. |
| `agreements[].with_agent`, `agreements[].finding_id`, `agreements[].my_independent_reasoning`, `agreements[].agreement_strengthens_confidence` | `cross_examination.agreements` exists but only has `with_specialist`, `point`, `reason`. Missing `finding_id` and `agreement_strengthens_confidence`. | Cannot programmatically map agreements to specific Round 1 findings. |
| `disagreements[].their_recommendation_id`, `disagreements[].their_position`, `disagreements[].my_evidence`, `disagreements[].confidence_in_disagreement` (number), `disagreements[].proposed_resolution` | `cross_examination.disagreements` exists but missing `their_recommendation_id`, `their_position`, `my_evidence`, `confidence_in_disagreement`, `proposed_resolution`. Has `severity` enum which spec does not use. | Disagreements cannot be traced back to specific recommendation IDs. |
| `cross_domain_risks[]` | Missing entirely from agent-output.json | This is a critical Round 2 output. The whole cross-domain harm detection mechanism depends on it. |
| `questions_answered[]` | Missing | Spec requires agents to answer questions directed at them from Round 1. No field for this. |
| `updated_recommendations[]` with tracked changes (`was`, `now`, `reason_for_change`) | Missing | No way to track how recommendations evolved between rounds. |
| `unresolved_disagreements[]` with `requires_round_3` flag | Missing | This is the trigger for Round 3. Without it, the orchestrator cannot determine if Round 3 is needed. |

### 1c. agent-output.json vs DISCUSSION-PROTOCOL.md Round 3 Output

Round 3 (lines 442-459) has a dedicated schema not represented at all:

- `addressing_disagreement` (ID of disagreement being resolved)
- `final_position` (with `recommendation`, `evidence`, `confidence` as number, `concession`)
- `resolution_type` (enum: `consensus`, `conditional`, `persistent_disagreement`)
- `deferred_new_concern`

The current `agent-output.json` has no concept of round-specific output shapes.

### 1d. consultation.json vs DISCUSSION-PROTOCOL.md SQL Schema

| SQL Column | Present in consultation.json? | Notes |
|---|---|---|
| `consultations.user_id` | Missing | Schema has no user reference. |
| `consultations.consultation_type` | Not directly present. `classification.intent` is the closest match but uses different enum values. | Spec enum: `optimization, differential, medication_review, lab_interpretation, risk_assessment, protocol_design`. Schema enum: `diagnostic, therapeutic, prognostic, preventive, optimization, medication_management, interpretation, second_opinion`. Only `optimization` overlaps. |
| `consultations.specialists` (JSONB array) | `classification.specialists_selected` exists. | Aligned. |
| `consultations.consensus_reached` (boolean) | Missing | No top-level field for this. |
| `consultations.profile_completeness_score` | Missing | Referenced in spec's completeness scoring function but not in schema. |
| `consultations.value_added_score` | Missing | Quality metric from spec Section 1c. |
| `consultations.diversity_score` | Missing | Quality metric from spec Section 1c. |
| `consultations.summary_hash` | Missing | Reproducibility tracking hash. |
| `recommendations` table | Missing entirely | consultation.json has no `recommendations` array matching the SQL `recommendations` table structure. The agent-level `perspectives` exist but lack `recommendation_id`, `category`, `priority`, `confidence` (as decimal), `evidence_quality`, `consensus_status`. |
| `outcome_reports` table | Partially covered by `outcome_tracking` object | consultation.json has `outcome_tracking` but it is flat (single outcome), while SQL has per-recommendation outcome tracking. Schema is missing `adherence`, `alternative_chosen`, `severity_if_worsened`, `confounders`, `reporting_method`, `confidence_in_report`. |
| `followup_schedule` table | Missing entirely | No schema representation of follow-up scheduling. |
| `lab_history` table | Missing | No dedicated lab history tracking in schemas. |
| `aggregate_outcomes` table | Missing | No anonymized aggregate schema. |

### 1e. consultation.json `evidence_package` vs EVIDENCE-PIPELINE.md Schema

The `evidence_package` object in consultation.json (lines 43-97) is a simplified version of the full evidence package schema defined in EVIDENCE-PIPELINE.md (lines 716-1006):

| Field in EVIDENCE-PIPELINE.md | Present in consultation.json? | Impact |
|---|---|---|
| `package_id` | Missing | No unique identifier for evidence packages. |
| `retrieval_status` (with per-service status, errors, wall_clock_ms) | Missing | No way to know if evidence retrieval degraded. |
| `shared_evidence` vs `specialist_evidence` split | Missing. consultation.json lumps everything into `perplexity_results`. | The distribution model (shared vs specialist-specific evidence) is not represented. |
| `specialist_evidence` (keyed by specialist type) | Missing | No specialist-scoped evidence. |
| `citations[].verification_status` | `pmid_verified` (boolean) exists but spec uses enum: `verified, misattributed, not_found, verification_failed, no_pmid`. | Boolean is insufficient. A `misattributed` PMID and a `not_found` PMID are very different. |
| `citations[].pubmed_metadata` (actual PubMed data for cross-check) | Missing | Agents cannot cross-check Perplexity claims against PubMed data. |
| `citations[].study_type`, `sample_size`, `key_finding`, `evidence_quality` | Missing from consultation.json citation objects | The rich citation metadata from the pipeline spec is not captured. |
| `drug_interactions[].severity` | Exists as plain string | Spec defines enum: `contraindicated, major, moderate, minor`. consultation.json has no enum constraint. |
| `drug_interactions[].source` | Exists as plain string | Spec defines enum: `drugbank, natural_medicines, openfda_signal, perplexity_search, parametric`. |
| `drug_interactions[].clinical_consequence`, `management`, `source_confidence` | Missing | Critical for pharmacologist agent. |
| `pairs_with_no_data` | Missing | No tracking of unchecked medication pairs. |
| `token_budget` tracking | Missing | No evidence payload size management. |
| `$defs` for reusable `citation`, `guideline`, `interaction` types | Missing | consultation.json defines everything inline. |

---

## 2. Type Mismatches

| Field | Schema A | Schema B / Spec | Problem |
|---|---|---|---|
| `confidence` | agent-output.json: `{ overall: string enum ["high","moderate","low","uncertain"] }` | DISCUSSION-PROTOCOL.md Round 1: `confidence: 0.92` (number 0.0-1.0) | Cannot compute averages, thresholds, or reproducibility checks on string enums. The spec's reproducibility function (`are_outputs_acceptably_similar`) compares numeric confidence deltas. |
| `evidence_quality` / `evidence_level` | agent-output.json `key_findings[].evidence_level`: enum `["strong","moderate","preliminary","mechanistic","expert_opinion","unknown"]` | DISCUSSION-PROTOCOL.md Round 1 `recommendations[].evidence_quality`: enum `["strong","moderate","weak","extrapolated"]` | Two different enum sets for the same concept. `preliminary` vs `weak`, `mechanistic`/`expert_opinion`/`unknown` vs `extrapolated`. |
| `evidence_support` (perspectives) | agent-output.json: `["strong_rct","moderate_rct","observational","guideline_based","mechanistic","expert_consensus","preliminary","traditional"]` | EVIDENCE-PIPELINE.md citation `evidence_quality`: `["high","moderate","low","very_low"]` (GRADE) | Third different enum for evidence quality. No mapping between the agent-level terms and the GRADE-based pipeline terms. |
| `safety_flags[].severity` | agent-output.json: `["critical","warning","caution","informational"]` | DISCUSSION-PROTOCOL.md `risk_flags[].severity`: `["green","yellow","orange","red"]` | Color-based vs word-based severity scales. Not mappable without a lookup table. |
| `drug_interactions[].severity` (consultation.json) | Plain `string`, no enum | EVIDENCE-PIPELINE.md: `["contraindicated","major","moderate","minor"]` | No validation on interaction severity in the consultation schema. |
| `specialist_type` enum | agent-output.json: `["cardiologist","endocrinologist","nephrologist","neuropsychiatrist","functional_medicine","pharmacologist","internist","other"]` | DISCUSSION-PROTOCOL.md DOMAIN_MAP values: `["endocrinology","cardiology","neuropsychiatry","functional_medicine","clinical_pharmacology","sports_medicine","sleep_medicine","hepatology_nephrology","immunology","nutritional_medicine","internal_medicine"]` | Schema uses role names (`cardiologist`), spec uses domain names (`cardiology`). Schema is missing: `sports_medicine`, `sleep_medicine`, `hepatology` (only `nephrologist`), `immunology`, `nutritional_medicine`. Schema has `other` which is a catch-all. Spec has `internal_medicine`, schema has `internist`. |
| `consultation_type` / `intent` | consultation.json `classification.intent`: `["diagnostic","therapeutic","prognostic","preventive","optimization","medication_management","interpretation","second_opinion"]` | DISCUSSION-PROTOCOL.md `consultation_type`: `["optimization","differential","medication_review","lab_interpretation","risk_assessment","protocol_design"]` | Almost entirely different enum values. Only `optimization` is shared. |

---

## 3. Broken References

### 3a. `$ref` in consultation.json

**Line 102:** `"items": { "$ref": "agent-output.json" }`

This uses a relative URI reference. Per JSON Schema 2020-12, relative `$ref` resolution depends on the `$id` of the referring schema. Neither `consultation.json` nor `agent-output.json` declare an `$id`. This means:

- **In a file-system validator** (e.g., AJV with file-system resolver): This works if both files are in the same directory and the validator resolves relative URIs from the file path. This is the likely intended behavior and will work in practice.
- **In a URL-based validator** (e.g., JSON Schema hosted at a URL): This would fail because there is no base URI to resolve against.
- **In Zod (planned runtime validation):** Zod does not support `$ref` at all. The schemas would need to be pre-compiled into standalone Zod schemas with the reference inlined.

**Verdict:** Works for offline validation tools. Will break when converting to Zod for runtime validation (per `src/CONTEXT.md` line 67: "Runtime schema validation (Zod)").

**Line 227:** `"new_lab_results": { "type": "array", "items": { "$ref": "patient-profile.json#/properties/lab_results/items" } }`

Same relative-URI issue, plus this uses a JSON Pointer to reach into patient-profile.json's `lab_results.items`. This is valid JSON Schema but adds fragility: if `patient-profile.json` restructures `lab_results`, this reference silently breaks.

**Recommendation:** Extract shared types into a `$defs` block (or a shared `definitions.json`) and reference those. This is the pattern EVIDENCE-PIPELINE.md already uses internally (its schema has `$defs` for `citation`, `guideline`, `interaction`).

---

## 4. SQL-JSON Alignment

### consultations table vs consultation.json

| SQL Column | JSON Path | Aligned? |
|---|---|---|
| `id` (UUID) | `consultation_id` | Yes |
| `user_id` (UUID) | -- | Missing from JSON |
| `created_at` | `created_at` | Yes |
| `consultation_type` (VARCHAR) | `classification.intent` | Misaligned enums (see Section 2) |
| `specialists` (JSONB) | `classification.specialists_selected` | Yes |
| `total_rounds` (INT) | `discussion_metadata.total_rounds` | Yes |
| `consensus_reached` (BOOLEAN) | -- | Missing from JSON |
| `total_cost_usd` (DECIMAL) | `discussion_metadata.total_cost_usd` | Yes |
| `profile_completeness_score` | -- | Missing from JSON |
| `value_added_score` | -- | Missing from JSON |
| `diversity_score` | -- | Missing from JSON |
| `full_output` (JSONB) | The entire consultation.json object | Yes (implicit) |
| `summary_hash` (VARCHAR) | -- | Missing from JSON |

### recommendations table vs consultation.json

The SQL `recommendations` table has no JSON schema equivalent. The agent-level `perspectives` array in `agent-output.json` is the closest match, but it lacks `recommendation_id`, `category`, `priority`, `consensus_status`, and uses string enums for `evidence_support` that differ from the SQL `evidence_quality` column.

### outcome_reports table vs consultation.json

The `outcome_tracking` object in consultation.json covers a subset: `outcome` and `outcome_details`. Missing: `adherence`, `alternative_chosen`, `severity_if_worsened`, `confounders`, `reporting_method`, `confidence_in_report`, `days_since_rec`. The JSON schema treats outcomes as per-consultation; the SQL tracks per-recommendation.

### Cache tables (pubmed_cache, rxnorm_cache, interaction_cache, supplement_interaction_cache)

These SQL tables from EVIDENCE-PIPELINE.md have no JSON schema representation. They are infrastructure tables (not user-facing data) so this is acceptable. No schema file needed.

---

## 5. Validation Gaps

### patient-profile.json

| Field | Current Validation | Missing |
|---|---|---|
| `demographics.age` | `min: 0, max: 120` | Good. |
| `demographics.height_cm` | `type: number` only | Missing `minimum` and `maximum`. A height of -5 or 500 would pass validation. Recommend `min: 30, max: 275`. |
| `demographics.weight_kg` | `type: number` only | Missing bounds. Recommend `min: 1, max: 500`. |
| `demographics.bmi` | `type: number` only | Missing bounds. Spec's plausibility ranges define `min: 10, max: 70`. |
| `demographics.body_fat_percentage` | `type: number` only | Missing bounds. Recommend `min: 2, max: 70`. |
| `vitals.blood_pressure_systolic` | `type: integer` only | Missing bounds. Spec defines `min: 60, max: 280`. |
| `vitals.blood_pressure_diastolic` | `type: integer` only | Missing bounds. Recommend `min: 30, max: 180`. |
| `vitals.heart_rate_resting` | `type: integer` only | Spec defines `min: 25, max: 250`. |
| `vitals.spo2` | `type: integer` only | Missing bounds. Recommend `min: 50, max: 100`. |
| `vitals.temperature_c` | `type: number` only | Missing bounds. Recommend `min: 30, max: 45`. |
| `lab_results[].value` | `type: number` only | No bounds at all. Values like `-999` would pass. The spec defines per-test plausibility ranges. |
| `lab_results[].loinc_code` | `type: string` only | Missing pattern validation. LOINC codes follow format `12345-6`. Recommend `pattern: "^\\d{1,5}-\\d$"`. |
| `medications[].rxnorm_cui` | `type: string` only | Missing pattern validation. RxNorm CUIs are numeric strings. Recommend `pattern: "^\\d+$"`. |
| `chief_complaint` | `type: string` only | No `minLength`. An empty string passes validation but is useless. Recommend `minLength: 10`. |
| `conditions[].icd10_code` | Has pattern `^[A-Z][0-9]{2}(\\.[0-9]{1,4})?$` | Good. |
| `goals` | `items: { type: string }` | No `minLength` on items. Empty strings would pass. |
| `mental_health.phq9_score` | `type: integer` | Missing `min: 0, max: 27` (PHQ-9 range). |
| `mental_health.gad7_score` | `type: integer` | Missing `min: 0, max: 21` (GAD-7 range). |
| `social_history.smoking.pack_years` | `type: number` | Missing `minimum: 0`. |
| `social_history.exercise.frequency_per_week` | `type: integer` | Missing bounds. Recommend `min: 0, max: 28` (4x daily). |

### agent-output.json

| Field | Current Validation | Missing |
|---|---|---|
| `round` | `type: integer` | Missing `minimum: 1, maximum: 3`. |
| `questions_for_doctor` | `minItems: 2, maxItems: 6` | Good. |
| `assessment.domain_relevance` | `min: 0, max: 1` | Good. |
| `perspectives[].applicability_score` | `min: 0, max: 1` | Good. |
| `evidence_cited[].year` | `type: integer` | Missing bounds. Recommend `min: 1900, max: 2030` to catch fabricated dates. |
| `evidence_cited[].sample_size` | `type: integer` | Missing `minimum: 1`. |
| `evidence_cited[].pmid` | `type: string` | Missing pattern. PMIDs are 1-8 digit numbers. Recommend `pattern: "^\\d{1,8}$"`. |

### consultation.json

| Field | Current Validation | Missing |
|---|---|---|
| `classification.complexity_score` | `min: 0, max: 10` | Good. |
| `classification.specialists_selected` | `minItems: 2, maxItems: 6` | Good, but spec says `MAX_SPECIALISTS = 5`. The `maxItems: 6` is inconsistent. |
| `synthesis.questions_for_doctor` | `minItems: 3, maxItems: 8` | Good. |
| `status` enum | Has full lifecycle enum | Good. |
| `discussion_metadata.total_rounds` | `type: integer` | Missing `min: 1, max: 3`. |
| `discussion_metadata.total_cost_usd` | `type: number` | Missing `minimum: 0`. |
| `evidence_package.drug_interactions[].severity` | `type: string` | Missing enum. Should be `["contraindicated","major","moderate","minor"]`. |

---

## 6. Missing Schemas

### 6a. evidence-package.json

**Status:** Does not exist as a standalone file. CLAUDE.md folder structure does not list it, but EVIDENCE-PIPELINE.md defines a complete JSON Schema for the evidence package (lines 716-1006 with `$defs`). consultation.json has a simplified inline version that does not match.

**Recommendation:** Extract the EVIDENCE-PIPELINE.md schema into `schemas/evidence-package.json`. Update `consultation.json` to `$ref` it instead of defining a simplified inline version. This eliminates the drift between the two definitions.

### 6b. Round-specific output schemas

**Status:** DISCUSSION-PROTOCOL.md defines three distinct output schemas:
- Round 1 Output (lines 208-286)
- Round 2 Output (lines 342-410)
- Round 3 Output (lines 442-459)

These are substantially different from each other and from `agent-output.json`. The current `agent-output.json` attempts to be a one-size-fits-all schema but matches none of them well.

**Recommendation:** Either:
- Option A: Create `schemas/round-1-output.json`, `schemas/round-2-output.json`, `schemas/round-3-output.json` as separate schemas.
- Option B: Use `agent-output.json` with `oneOf` / `if-then-else` to discriminate by round number.

Option A is cleaner for Zod generation and runtime validation.

### 6c. classification-output.json

**Status:** The classifier produces structured output (intent, organ_systems, urgency, complexity_score, specialists_selected, emergency_detected). This is currently defined inline in `consultation.json` under `classification` but has no standalone schema.

**Recommendation:** Extract to `schemas/classification-output.json` since the classifier is a separate agent with its own prompt (`prompts/classifier.md`) and should validate against its own schema.

### 6d. synthesis-output.json

**Status:** The moderator agent produces the `synthesis` object. Currently defined inline in `consultation.json`. No standalone schema for validation.

**Recommendation:** Extract to `schemas/synthesis-output.json`. The moderator prompt (`prompts/moderator.md`) should reference this schema the same way specialist prompts reference `agent-output.json`.

### 6e. Shared definitions file

**Status:** Three different schemas define citation objects with different fields. The evidence pipeline spec uses `$defs` for `citation`, `guideline`, `interaction`. These should be shared.

**Recommendation:** Create `schemas/shared-definitions.json` containing reusable types: `citation`, `guideline`, `drug-interaction`, `lab-result`, `evidence-quality-tier`. Reference via `$ref` from all other schemas.

---

## Summary of Critical Issues (Prioritized)

1. **agent-output.json does not match any round-specific spec.** The schema is missing `recommendations`, `findings.id`, `cross_domain_questions`, `information_gaps`, the entire Round 2 cross-domain risk structure, and the entire Round 3 resolution structure. This is the single largest gap. Nothing built against agent-output.json will conform to the discussion protocol.

2. **Confidence type mismatch (string enum vs number).** Blocks all quantitative operations: reproducibility comparison, threshold checks, budget-linked degradation decisions, false consensus detection.

3. **consultation.json evidence_package is a simplified stub.** Misses retrieval_status, shared/specialist evidence split, rich citation metadata, verification status enums. Any code building the evidence pipeline against consultation.json will not produce what the agents expect.

4. **consultation_type enum mismatch.** The classification intent enum and the SQL consultation_type column use almost entirely different values. One must be canonical.

5. **specialist_type enum is incomplete.** Missing 5 specialist types that the DOMAIN_MAP defines. Adding a new specialist type requires updating the schema enum, which is easy to forget.

6. **No standalone evidence-package.json.** The most complex data structure in the pipeline has no dedicated schema file. The inline version in consultation.json has already drifted from the spec.

7. **Validation bounds missing on 15+ numeric fields.** Biologically implausible values will pass schema validation and reach agents, causing hallucinated analysis.
