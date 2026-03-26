# Prompt Quality Audit Report

**Auditor:** Prompt Engineering Review (Medical AI Specialization)
**Date:** 2026-03-24
**Scope:** All 9 prompt files, agent-output.json schema, PRODUCT-POSITIONING.md, supplement-evidence-framework.md
**Verdict:** Strong foundation with critical schema misalignment and several gaps requiring fixes before production.

---

## CRITICAL FINDING: Schema-Prompt Misalignment

The output JSON structures embedded in every specialist prompt **do not match** the canonical `schemas/agent-output.json` schema. This is the single most important finding in this audit.

### What `agent-output.json` requires (top-level required fields):

```
specialist_type, round, assessment, perspectives, evidence_cited,
confidence, uncertainties, questions_for_doctor
```

### What every specialist prompt actually produces:

```
response_metadata, problem_representation, exploration_areas,
supplement_considerations, perspectives_to_explore,
questions_for_your_doctor, lifestyle_considerations, disclaimers
```

**Zero field names overlap.** The prompts produce a completely different JSON shape than the schema defines. Specific mismatches:

| Schema Field (required) | Prompt Equivalent | Status |
|-------------------------|-------------------|--------|
| `specialist_type` (enum string) | `response_metadata.agent_type` | **Different key name** |
| `round` (integer) | Not present in any prompt | **MISSING** -- no prompt instructs the agent to output a round number, which is required for multi-round discussion protocol |
| `assessment.summary` | `problem_representation` is close but structured differently | **Structural mismatch** |
| `assessment.key_findings` (array of {finding, clinical_significance, evidence_level}) | `exploration_areas` is close but uses different field names and structure | **Structural mismatch** |
| `assessment.domain_relevance` (0-1 float) | Not present in any prompt | **MISSING** |
| `perspectives` (array with `approach`, `rationale`, `evidence_support`, `applicability_score`) | `perspectives_to_explore` uses different fields (`perspective`, `evidence_basis`, `limitations`) | **Different fields** |
| `evidence_cited` (array with `claim`, `source_type`, `pmid`, `verified`, `year`, `population`, `sample_size`) | Not present in any prompt | **MISSING** -- prompts have anti-hallucination rules against citing studies but no structured field for evidence citations |
| `confidence.overall` (enum: high/moderate/low/uncertain) | `response_metadata.confidence_level` uses "insufficient" instead of "uncertain" | **Enum mismatch** |
| `confidence.what_would_change_assessment` | Not present in any prompt | **MISSING** |
| `uncertainties` (array with `uncertainty`, `type` enum, `impact` enum) | Not present as a structured field in any prompt | **MISSING** -- prompts have epistemic humility language but no dedicated uncertainty output array |
| `safety_flags` (array with `concern`, `severity`, `action_required`) | `response_metadata.safety_flags` is a bare array (no severity/action subfields) | **Structural mismatch** |
| `interactions_with_current_profile` | Only pharmacologist has `interaction_matrix`; other prompts lack this field | **Partially covered** |
| `questions_for_doctor` (array of strings, 2-6 items) | `questions_for_your_doctor` is array of objects with subfields | **Different key name AND structure** |
| `cross_examination` (round 2+ only) | Not present in any prompt | **MISSING** -- no prompt instructs cross-examination behavior |

**Recommendation:** Either (a) rewrite every prompt's output section to match `agent-output.json`, or (b) regenerate `agent-output.json` to match what the prompts actually produce. Option (a) is correct -- the schema was designed for programmatic consensus detection and multi-round discussion. The prompts should conform to it.

**Priority:** CRITICAL -- the orchestrator, moderator, and any programmatic processing depend on schema conformity.

---

## Per-Prompt Audit

---

### 1. Cardiologist (`prompts/cardiologist.md`)

**Schema Conformity:** FAIL -- see critical finding above.

**Language Compliance (PRODUCT-POSITIONING.md):**
- PASS. Uses "perspectives to explore" framing consistently.
- PASS. "Informed exploration companion" label present.
- One concern at line 252: The standard disclaimer says "Always consult your cardiologist or primary care physician before making any health decisions." The word "Always" with "consult" could be read as prescriptive. However, this aligns with PRODUCT-POSITIONING.md's own disclaimer language, so this is acceptable.

**Epistemic Humility:**
- PASS. Has all six calibrated vocabulary tiers (Strong / Moderate / Preliminary / Mechanistic / Unknown / Outside Expertise).
- PASS. OUTSIDE EXPERTISE section explicitly names other specialists.
- MINOR GAP: No explicit instruction for "I genuinely don't know and cannot even point to the right specialist." The OUTSIDE EXPERTISE tier assumes the agent can always identify the right specialist. Add a fallback: "If the question falls outside all specialist domains available on this panel, say so explicitly."

**Anti-Hallucination:**
- PASS. Seven explicit rules. Rule 1 (never cite specific studies) and Rule 2 (never fabricate statistics) are strong.
- GAP: No rule against fabricating guideline years or versions. An agent could hallucinate "ACC/AHA 2023 Guidelines" when no such update exists. Add: "NEVER cite a specific guideline edition (year/version) unless certain it exists. Use 'current ACC/AHA guidelines' instead."

**Cross-Specialist Awareness:**
- PASS. Step 5 in clinical reasoning chain explicitly lists five cross-specialist flags (endocrinologist, nephrologist, pharmacologist, neuropsychiatrist, functional medicine).
- PASS. `cross_specialist_flags` field present in output JSON.
- PASS. Domain scope section explicitly lists what to defer.

**Evidence Tier Consistency:**
- PARTIAL. `exploration_areas[].evidence_tier` uses "strong|moderate|preliminary|mechanistic|unknown". `supplement_considerations[].evidence_tier` uses "S|A|B|C|D" from the supplement evidence framework. These are two different tier systems used in the same output.
- This is intentional (clinical evidence vs. supplement evidence) but **nowhere does the prompt explain the difference** to the agent. The agent may conflate the two. Add an explicit note: "The exploration evidence tiers (strong/moderate/preliminary/mechanistic/unknown) apply to clinical claims. The supplement tiers (S/A/B/C/D) apply only to supplement evidence and follow the Supplement Evidence Framework."

**Safety Coverage:**
- PASS. Seven specific cardiac emergency triggers. Includes aortic dissection, acute decompensated HF, and limb ischemia -- these are comprehensive for cardiology.
- MINOR GAP: No mention of cardiac tamponade symptoms (Beck's triad). Consider adding.

**Parameterization:**
- PASS. `{patient_context}` and `{evidence_package}` slots present.
- PASS. Required fields list is comprehensive and cardiology-specific (premature CAD, risk calculator calibration).

**Prompt Length:**
- 274 lines. This is within acceptable range for an Opus-class model. No compression needed.

---

### 2. Endocrinologist (`prompts/endocrinologist.md`)

**Schema Conformity:** FAIL -- same systemic issue.

**Language Compliance:**
- PASS. Consistent exploration language throughout.

**Epistemic Humility:**
- PASS. All six tiers present.
- PASS. Domain-specific examples for each tier ("hormonal mechanism is well-described, but clinical outcome data is limited" for MECHANISTIC).

**Anti-Hallucination:**
- PASS. Seven rules plus one domain-specific addition (Rule 8): "Be especially cautious with emerging GLP-1 receptor agonist research -- this field is moving fast and claims change rapidly." This is excellent and timely.
- SAME GAP as cardiologist: no rule against fabricating guideline versions.

**Cross-Specialist Awareness:**
- PASS. Five cross-specialist flags in Step 5.
- UNIQUE STRENGTH: `metabolic_web_connections` field in the output JSON is a strong addition not in other prompts. This captures cross-system endocrine connections well.

**Evidence Tier Consistency:**
- SAME PARTIAL issue as cardiologist (dual tier system, unexplained).

**Safety Coverage:**
- PASS. Seven emergency triggers, all endocrine-appropriate (DKA, thyroid storm, myxedema coma, adrenal crisis, hypercalcemic crisis, pheochromocytoma crisis, severe hypoglycemia).
- Comprehensive for the specialty.

**Parameterization:**
- PASS. Both slots present.
- PASS. Domain-specific required fields (medication timing for thyroid labs, BMI for population matching).

**Specialty-Specific Strengths:**
- `hormone_axes_involved` field in `problem_representation` is a strong addition.
- `feedback_loop_position` and `temporal_trajectory` in exploration areas are excellent.
- Reasoning pattern #6 (Medication-Hormone Interaction Mapping) catches a real clinical gap (biotin interference with thyroid assays).

**Prompt Length:**
- 297 lines. Acceptable.

---

### 3. Nephrologist (`prompts/nephrologist.md`)

**Schema Conformity:** FAIL -- same systemic issue.

**Language Compliance:**
- PASS. Consistent exploration language.
- EXTRA STRENGTH: Adds "Make statements about dialysis timing or transplant candidacy" to the MUST NEVER list. This is a high-sensitivity area that is correctly handled.

**Epistemic Humility:**
- PASS. All six tiers. Includes KDIGO-specific language ("KDIGO guidelines strongly recommend..." / "KDIGO provides a conditional recommendation").
- PASS. This is the only prompt that references conditional vs. strong guideline recommendations, which is GRADE-aligned. Other prompts should adopt this.

**Anti-Hallucination:**
- PASS. Seven rules plus Rule 8: "Be especially careful with eGFR calculations -- note which equation is being referenced and its known limitations for different populations." This catches a real issue (race-based GFR equations controversy).
- SAME GAP: No rule against fabricating guideline versions.

**Cross-Specialist Awareness:**
- PASS. Five cross-specialist flags.
- STRENGTH: "CKD is a coronary risk equivalent" is explicitly called out in the cardiology flag, providing the clinical reasoning for the cross-reference.

**Evidence Tier Consistency:**
- SAME PARTIAL issue.

**Safety Coverage:**
- PASS. Seven emergency triggers. Includes anuria (>12 hours), rapidly progressive glomerulonephritis with systemic symptoms, severe hyponatremia.
- COMPREHENSIVE for the specialty.

**Specialty-Specific Strengths:**
- `nephrotoxin_scan` as a dedicated output section is excellent. No other prompt has a comparable "standing scan" output section.
- `gfr_trajectory` and `renal_compartment_focus` in problem_representation are strong.
- `renal_specific_note` in lifestyle_considerations (CKD-stage-dependent) is a good touch.
- `renal_safety_concern` field in supplement_considerations catches supplement accumulation in renal impairment.

**Prompt Length:**
- 306 lines. Acceptable.

---

### 4. Neuropsychiatrist (`prompts/neuropsychiatrist.md`)

**Schema Conformity:** FAIL -- same systemic issue.

**Language Compliance:**
- PASS. Consistent exploration language.
- EXTRA STRENGTH: "Minimize or dismiss psychological symptoms as 'just stress'" is in the MUST NEVER list. This is a sensitivity-aware addition.

**Epistemic Humility:**
- PASS. All six tiers.
- PASS. Two domain-specific caution areas in anti-hallucination: neuroplasticity/brain training claims (Rule 8) and gut-brain axis claims (Rule 9). Both are areas of heavy consumer misinformation.

**Anti-Hallucination:**
- PASS. Nine rules (most of any prompt). The two extra rules are directly relevant to the neuropsychiatric misinformation landscape.

**Cross-Specialist Awareness:**
- PASS. Five cross-specialist flags.

**Safety Coverage:**
- STRONGEST OF ALL PROMPTS. Has two-tier safety escalation:
  - IMMEDIATE EMERGENCY (8 triggers including serotonin syndrome, NMS, active suicidal ideation with plan)
  - URGENT BUT NOT IMMEDIATE (5 triggers including passive suicidal ideation, severe depression with functional impairment)
- PASS. Includes crisis resources (988, Crisis Text Line).
- This two-tier model should be adopted by other prompts. The cardiologist, for example, has only one tier (emergency). Adding an "urgent" tier for things like "new onset exertional chest pain that resolved" would be valuable.

**Specialty-Specific Strengths:**
- `sleep_cognition_mood_assessment` as a dedicated output section enforces the triangle reasoning.
- `biopsychosocial_map` in problem_representation is excellent.
- `organic_vs_functional` classification in exploration areas.
- `neurotransmitter_systems` in exploration areas.
- Interaction rule: "Validate the user's experience without minimizing or pathologizing" -- this is the only prompt with an explicit empathy instruction.

**Prompt Length:**
- 321 lines. Acceptable.

---

### 5. Functional Medicine (`prompts/functional-medicine.md`)

**Schema Conformity:** FAIL -- same systemic issue.

**Language Compliance:**
- PASS. Most rigorous language compliance of all prompts.
- EXTRA STRENGTH: "Dismiss conventional medicine or create an adversarial framing" is in the MUST NEVER list.
- EXTRA STRENGTH: "Promote unsubstantiated alternative treatments as if they are evidence-based" is in the MUST NEVER list.
- EXTRA STRENGTH: "Recommend diagnostic tests without noting their evidence quality and limitations" is in the MUST NEVER list.

**Epistemic Humility:**
- STRONGEST OF ALL PROMPTS. Has a unique sixth tier not present in others:
  - `UNSUPPORTED/OVERHYPED`: "Despite popular claims, the evidence does not strongly support..." This is critical for functional medicine's territory and should be considered for other prompts.
- The 4-tier evidence stratification within clinical reasoning (TIER 1 conventional agreement, TIER 2 plausible, TIER 3 theoretical, TIER 4 unsupported) is excellent and specific to the functional medicine context.

**Anti-Hallucination:**
- PASS. Ten rules (tied for most with pharmacologist if you count all sub-points). Includes:
  - Rule 8: "Be ESPECIALLY cautious with functional medicine claims -- this domain has more marketing-driven misinformation than most medical specialties."
  - Rule 9: "Never recommend specific supplement brands or proprietary formulations."
  - Rule 10: "Always note when a test or treatment is 'commonly used in functional medicine but not validated by conventional evidence.'"

**Cross-Specialist Awareness:**
- PASS. Five cross-specialist flags.

**Evidence Tier Consistency:**
- `exploration_areas[].evidence_tier` uses a unique 4-value enum: "tier_1_conventional_agreement|tier_2_plausible|tier_3_theoretical|tier_4_unsupported". This is DIFFERENT from the "strong|moderate|preliminary|mechanistic|unknown" used by other specialists.
- This is intentional and appropriate for functional medicine, but the moderator prompt does not account for this different tier vocabulary when doing evidence landscape compilation (Phase 5). The moderator would need a mapping between the functional medicine tiers and the standard tiers. **This is a bug in the moderator prompt.**

**Safety Coverage:**
- PASS. Eight safety triggers. Unique functional-medicine-specific triggers:
  - "Extreme dietary restriction that could cause malnutrition"
  - "Interest in replacing prescribed medications with supplements"
  - "Signs of eating disorder"
  - "Use of unregulated substances marketed as supplements"
  These are all real risks in the functional medicine consumer space.

**Specialty-Specific Strengths:**
- `testing_considerations` with `clinical_validity` rating is unique and essential for functional medicine tests (OAT, IgG food panels).
- `evidence_transparency` in disclaimers is a unique field.
- `overhype_warning` in supplement_considerations is excellent.
- `conventional_medicine_view` and `what_functional_medicine_adds` in exploration areas force balanced framing.
- `root_cause_web` in problem_representation.
- `current_supplements` as a distinct patient profile field (other prompts only have `current_medications`).

**Prompt Length:**
- 331 lines. Longest specialist prompt. Justified given the need for extra guardrails in this domain.

---

### 6. Pharmacologist (`prompts/pharmacologist.md`)

**Schema Conformity:** FAIL -- same systemic issue. Notably, the pharmacologist prompt is the closest to needing the `interactions_with_current_profile` field from `agent-output.json`, but its `interaction_matrix` uses a different structure.

**Language Compliance:**
- PASS. "perspectives to discuss with your prescriber" framing.
- EXTRA STRENGTH: "When identifying concerning interactions, ALWAYS pair with 'discuss with your prescriber' -- never create alarm without directing to professional review."

**Epistemic Humility:**
- PASS. All six tiers, adapted with pharmacology-specific language ("Major drug interaction databases classify this as...").

**Anti-Hallucination:**
- PASS. Eight rules. Includes:
  - Rule 7: "When discussing pharmacogenomics, be clear about which gene-drug pairs are CPIC-actionable vs. which are research-only." This is critical for PGx misinformation.
  - Rule 8: "NEVER simplify drug mechanisms to the point of inaccuracy."

**Cross-Specialist Awareness:**
- PASS. Five cross-specialist flags in Step 6.
- Has a unique 7-step clinical reasoning chain (other prompts have 6 steps). The extra step is "STEP 3 -- INTERACTION MATRIX" which is pharmacology-specific and appropriate.

**Safety Coverage:**
- PASS. Two-tier safety system (IMMEDIATE EMERGENCY with 10 triggers, URGENT with 4 triggers). The pharmacologist and neuropsychiatrist are the only prompts with dual-tier safety.
- Strong coverage of drug-specific emergencies: serotonin syndrome, NMS, DILI, drug-induced arrhythmia, lithium toxicity, drug-induced renal failure.
- GAP: No mention of Stevens-Johnson syndrome / toxic epidermal necrolysis (SJS/TEN), which is a severe drug reaction that should be included.

**Specialty-Specific Strengths:**
- `medication_analysis` section (drug class, metabolic pathway, therapeutic window per drug).
- `cascade_prescribing_flags` is a unique and high-value output section.
- `pharmacogenomic_considerations` with CPIC actionability classification.
- `practical_medication_considerations` (timing, food interactions, storage, adherence).
- `ask_who` field in questions ("prescriber|pharmacist|either") is a smart addition.

**Parameterization:**
- PASS. Both slots present.
- Unique required fields: `body_weight`, `pharmacogenomic_data`, `allergies_and_intolerances`. These are appropriate and not present in other prompts where they're less relevant.
- Correctly notes `current_medications` as "THIS IS YOUR PRIMARY INPUT."

**Prompt Length:**
- 340 lines. Longest specialist prompt. Justified given the complexity of interaction analysis.

---

### 7. Moderator (`prompts/moderator.md`)

**Schema Conformity:** The moderator has its own output schema (not `agent-output.json`), which is appropriate since it consumes rather than produces specialist output. However:
- GAP: The moderator prompt says "Each output follows the standardized specialist JSON schema" (line 31) but does not specify WHICH schema -- the one in `agent-output.json` or the one embedded in the specialist prompts. Since these are misaligned (see critical finding), the moderator will break.
- GAP: No `round` handling. The moderator prompt does not reference the `round` field from `agent-output.json` or explain how it handles multi-round discussion inputs. It only handles single-round synthesis.
- GAP: No `cross_examination` handling. The schema has a `cross_examination` field for round 2+, but the moderator prompt has no instructions for incorporating cross-examination data.

**Consensus Detection:**
- PASS. Phase 2 defines four levels: STRONG CONSENSUS, MODERATE CONSENSUS, SINGLE-SPECIALIST DOMAIN, DISAGREEMENT.
- PASS. Clear criteria for each level (3+ specialists = strong, 2+ with different emphasis = moderate).

**Disagreement Presentation:**
- PASS. Phase 3 ("Common Ground + Perspectives") is well-designed.
- PASS. Explicit NEVER rules: don't pick a winner, don't average, don't dismiss, don't hide.
- PASS. `user_guidance` field in disagreement output provides actionable framing.

**Dual-Mode Output:**
- PARTIAL. Patient mode is well-specified (8th-grade reading level, no jargon, narrative structure).
- PRODUCT-POSITIONING CONFLICT: The moderator says "8th-grade reading level" but PRODUCT-POSITIONING.md says "5th-6th grade reading level, Flesch-Kincaid 60-70." These must be reconciled. The product positioning document should be the authority.
- PASS. Physician mode includes GRADE ratings, named guidelines, NNT/NNH where applicable.

**Evidence Landscape Compilation:**
- PASS. Phase 5 correctly groups evidence into five tiers.
- GAP: Does not account for functional medicine's different evidence tier vocabulary ("tier_1_conventional_agreement" vs. "strong"). The moderator needs a mapping rule for this.

**Safety Aggregation:**
- PASS. Phase 1 is explicitly "ALWAYS FIRST" priority.
- PASS. Four-tier urgency classification (EMERGENCY, URGENT, IMPORTANT, INFORMATIONAL).
- PASS. Deduplication with multi-specialist agreement notation.
- PASS. "If safety flags conflict between specialists... escalate to the higher safety level."

**Synthesis Quality Rules:**
- STRONG. Ten explicit quality rules. Rule 5 ("never upgrade a specialist's evidence tier") is particularly important.
- Rule 7 ("Dual-Mode Parity: Both modes must contain the same substantive information") is well-stated.

**Language Compliance:**
- PASS. The moderator is explicitly prohibited from generating medical content ("Never generate medical content yourself -- you are a synthesizer, not a specialist").
- PASS. Closing message requirements reinforce exploration framing.

**Prompt Length:**
- 345 lines. Acceptable given the complexity of synthesis logic.

**Missing Features:**
- No instruction for handling supplement evidence tier (S/A/B/C/D) vs. clinical evidence tier (strong/moderate/preliminary) in the unified evidence landscape. The moderator will conflate these.
- No instruction for handling the `what_is_being_studied` supplement framework field in the unified synthesis.
- No explicit instruction for how many specialists need to flag a supplement interaction before it appears in the patient mode `interaction_warnings`.

---

### 8. Classifier (`prompts/classifier.md`)

**Output Schema:**
- The classifier uses its own lightweight JSON output, not `agent-output.json`. This is correct -- the classifier is a routing agent, not a specialist.
- PASS. Emergency output correctly routes to IMMEDIATE_SAFETY_ESCALATION with zero specialist routing.
- PASS. Routine/urgent output correctly includes routing, complexity, urgency, primary_domain.

**Few-Shot Examples:**
- 12 examples provided. Coverage analysis:
  - Single-domain (cardio): covered (Example 1)
  - Emergency (cardiac): covered (Example 2)
  - Multi-system (endo+nephro+pharma+cardio): covered (Example 3)
  - Cross-domain (endo+neuro+pharma): covered (Example 4)
  - Simple single-domain (func): covered (Example 5)
  - Suicidal ideation: covered (Example 6)
  - Complex multi-system: covered (Example 7)
  - Polypharmacy: covered (Example 8)
  - Cardiorenal with urgency: covered (Example 9)
  - Lifestyle simple: covered (Example 10)
  - Serotonin syndrome emergency: covered (Example 11)
  - Full panel: covered (Example 12)

**Edge Cases MISSING from few-shot examples:**
1. **Pediatric query** -- no example covers a query about a child. The classifier has no pediatric routing rule.
2. **Pregnancy** -- no example covers pregnancy-related queries. Pregnancy modifies nearly every specialist's reasoning (teratogenicity, gestational diabetes, preeclampsia). The classifier should have a routing modifier for pregnancy.
3. **Non-English or garbled input** -- no example for when the query is unclear, too vague, or in another language. The classifier should have a fallback for unclassifiable input.
4. **Query about the platform itself** -- "How does MedPanel work?" should not be routed to specialists. No example covers meta-queries.
5. **Duplicate/follow-up queries** -- "I asked about this earlier and want to dig deeper" lacks routing context. No example covers this.
6. **Oncology-adjacent query** -- "I have cancer and want to know about supplements during chemo." No specialist covers oncology. The classifier should flag this as a coverage gap.

**JSON Output Schema Concerns:**
- The routine output schema includes `model_assignment` (mapping domain to "sonnet|opus") but the few-shot examples do NOT include this field. The classifier will likely not produce it consistently.
- The routine output schema includes `secondary_domains` but the few-shot examples do NOT include this field either.
- Recommendation: Add `model_assignment` and `secondary_domains` to at least two few-shot examples so the classifier learns the full schema.

**Patient Context Integration:**
- PASS. Six routing modifiers based on patient context (medication count, known conditions, age).
- GAP: No modifier for pregnancy status, BMI/obesity, or current supplement list count.

**Prompt Length:**
- 245 lines. Appropriate for a Haiku-class model. This is well-optimized for speed.

---

### 9. Specialist Agent Prompt Template (`prompts/specialist-agent-prompt-template.md`)

This file serves two purposes: (a) an example cardiologist prompt, and (b) a parameterization guide.

**Template vs. Production Prompt Drift:**
- The template's cardiologist prompt is a **simpler version** than the actual `cardiologist.md`. Differences:
  - Template lacks DOMAIN SCOPE section (cardiologist.md has 26 lines of domain scope)
  - Template lacks KEY BIOMARKERS section
  - Template lacks SPECIALTY-SPECIFIC REASONING PATTERNS
  - Template lacks SAFETY ESCALATION TRIGGERS (critical omission)
  - Template lacks EVIDENCE PACKAGE INTEGRATION
  - Template has no `cross_specialist_flags` in the output JSON
- The template has **drifted significantly** from the production prompts. It should either be updated to match the production prompt structure or explicitly labeled as "simplified example only, see individual specialist prompts for production versions."

**Parameterization Pattern:**
- The Python config pattern at the bottom is clear and useful.
- GAP: The config lists `SHARED_OUTPUT_SCHEMA` as constant across specialists, but in practice, each specialist has unique output fields (e.g., nephrologist's `nephrotoxin_scan`, neuropsychiatrist's `sleep_cognition_mood_assessment`). The template should note that the shared schema is a base that each specialist extends.

---

## Cross-Cutting Issues

### Issue 1: No `round` field in any prompt

The `agent-output.json` schema has `round` as a REQUIRED integer field (1 = independent analysis, 2+ = cross-examination). No prompt instructs the agent to output a round number. No prompt has any cross-examination behavior instructions. This means the multi-round discussion protocol (described in `DISCUSSION-PROTOCOL.md`) cannot work with the current prompts.

**Fix required in:** All 6 specialist prompts.

### Issue 2: No `evidence_cited` structured output

The schema requires an `evidence_cited` array with structured fields including `pmid`, `verified`, `year`, `population`, `sample_size`. No prompt produces this. The anti-hallucination rules tell agents NOT to cite specific studies, which directly conflicts with the schema wanting structured citations with PMIDs.

**Resolution needed:** Either (a) the evidence pipeline provides pre-verified citations that agents can reference (and the prompt instructs them to do so), or (b) `evidence_cited` is removed from the required schema fields and replaced with the `evidence_package` passthrough approach.

### Issue 3: Dual evidence tier systems not reconciled

Specialist prompts use "strong|moderate|preliminary|mechanistic|unknown" for clinical claims. Supplement sections use "S|A|B|C|D" from the supplement evidence framework. Functional medicine uses "tier_1_conventional_agreement|tier_2_plausible|tier_3_theoretical|tier_4_unsupported" for its exploration areas. The moderator has no mapping between these three vocabularies.

**Fix required in:** Moderator prompt Phase 5, with an explicit mapping table.

### Issue 4: Reading level inconsistency

- `moderator.md` line 135: "8th-grade reading level"
- `PRODUCT-POSITIONING.md` line 125: "5th-6th grade reading level, Flesch-Kincaid 60-70"

These are materially different. A 5th-grade reading level requires much simpler sentence structure and vocabulary than an 8th-grade level.

**Fix required in:** `moderator.md` -- change to match PRODUCT-POSITIONING.md.

### Issue 5: Inconsistent disclaimer text

Each specialist has a slightly different standard disclaimer. They all convey the same meaning, but the text differs. Examples:
- Cardiologist: "Always consult your cardiologist or primary care physician..."
- Nephrologist: "Always consult your nephrologist or primary care physician..."
- Neuropsychiatrist: "Always consult your physician, psychiatrist, or mental health provider..."
- Functional medicine: "Always consult your physician before making any health decisions, including starting supplements or making significant dietary changes."

This is actually GOOD -- the disclaimers are specialty-appropriate. However, the moderator should have a unified disclaimer that is specialty-neutral:
- PRODUCT-POSITIONING.md provides one: "MedPanel is an exploration and education tool..." This should be the moderator's disclaimer, and it currently is (line 309).
- PASS.

### Issue 6: Missing `internist` specialist

The `agent-output.json` schema's `specialist_type` enum includes `"internist"` as a valid type, but no internist prompt exists. This could be intentional (internists as a future addition) or an oversight.

The classifier's routing table also does not include an internist route. If the product encounters a general medicine query that doesn't clearly fit any specialist, there's no generalist fallback.

### Issue 7: Two-tier vs. one-tier safety escalation inconsistency

- **Two-tier (IMMEDIATE + URGENT):** neuropsychiatrist, pharmacologist
- **One-tier (EMERGENCY only):** cardiologist, endocrinologist, nephrologist, functional medicine

The two-tier model is clearly superior -- "new onset exertional chest pain that has since resolved" is not an emergency but IS urgent. All specialists should adopt the two-tier model for consistency and better clinical coverage.

### Issue 8: No explicit handling of patient refusal or non-compliance

No prompt addresses what to do when a user says "My doctor told me to take X but I don't want to." This is a common real-world scenario. The prompts say "defer to the user's treating physician" but don't give the agent a script for when the user explicitly disagrees with their physician. The agent needs to avoid both (a) undermining the physician and (b) dismissing the user's concerns.

Suggested addition to all prompts under INTERACTION RULES:
```
If the user expresses disagreement with their physician's guidance, acknowledge their
concern without validating or invalidating either position. Frame as: "This sounds like
an important concern to discuss directly with your doctor. Here are some questions that
might help that conversation: [generate exploratory questions about the specific concern]."
Never side with the user against their physician or with the physician against the user.
```

### Issue 9: No explicit token/length guidance

No prompt instructs the agent on response length. An Opus-class model given these detailed prompts could produce 3,000+ token responses for simple queries. Consider adding: "Scale response length to query complexity. Simple queries should receive concise responses. Complex queries may require comprehensive responses. The output JSON should contain only populated fields -- omit arrays that would be empty."

### Issue 10: `{evidence_package}` handling when package is absent

Every prompt says "You may receive pre-retrieved evidence from the evidence pipeline" and then has rules for when it's provided. No prompt says what to do when `{evidence_package}` is empty or null. Should the agent note "No pre-retrieved evidence was available for this query"? Should it rely entirely on parametric knowledge? This should be explicit.

---

## Missing Specialist Types

Given the product's scope (health optimization, supplements, medications, mental health), the following specialist gaps exist:

### High Priority

1. **Gastroenterologist / Hepatologist** -- The functional medicine agent covers gut health from a lifestyle/microbiome perspective, but nobody owns: IBD, Crohn's, ulcerative colitis, GERD, celiac disease, NAFLD/NASH, hepatitis, cirrhosis, liver function tests in a primary hepatology context. With the gut-brain axis being a key interest area and liver being central to drug metabolism and detox biochemistry, this is a real gap.

2. **Rheumatologist / Immunologist** -- Autoimmune conditions (lupus, rheumatoid arthritis, Sjogren's, vasculitis) are only covered tangentially by nephrology (lupus nephritis) and functional medicine (inflammation). Nobody owns ANA panels, autoimmune workups, biologic medications, or autoimmune-endocrine overlap (Hashimoto's from an autoimmune perspective vs. an endocrine perspective).

### Medium Priority

3. **Pulmonologist** -- Referenced by the cardiologist as a deferral target but doesn't exist. Asthma, COPD, sleep apnea (from a respiratory perspective -- neuropsychiatrist covers the cognitive effects), pulmonary hypertension.

4. **Oncology-adjacent perspective** -- For supplement safety during cancer treatment, drug interactions with chemotherapy, integrative oncology evidence. Users with cancer history will use this platform.

### Lower Priority

5. **Geriatrician** -- The classifier has an age >= 65 modifier but no geriatric-specific perspective. Polypharmacy in elderly, frailty assessment, fall risk, and age-specific evidence applicability are covered piecemeal by pharmacologist and others but not owned.

6. **Sports Medicine / Exercise Physiologist** -- Exercise is covered by functional medicine and cardiologist (sports cardiology) but nobody deeply owns exercise prescription, overtraining syndrome, ergogenic aids, or athletic performance optimization.

---

## Summary Scorecard

| Audit Dimension | Cardio | Endo | Nephro | Neuro | Func Med | Pharma | Moderator | Classifier |
|----------------|--------|------|--------|-------|----------|--------|-----------|------------|
| Schema conformity | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL | N/A* | PASS |
| Language compliance | PASS | PASS | PASS | PASS | PASS+ | PASS | PARTIAL** | N/A |
| Epistemic humility | PASS | PASS | PASS | PASS | PASS+ | PASS | N/A | N/A |
| Anti-hallucination | PASS | PASS | PASS | PASS+ | PASS+ | PASS | N/A | N/A |
| Cross-specialist flags | PASS | PASS | PASS | PASS | PASS | PASS | PASS | N/A |
| Evidence tier consistency | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | FAIL*** | N/A |
| Safety coverage | PASS | PASS | PASS | PASS+ | PASS | PASS | PASS | PASS |
| Parameterization | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| Prompt length | OK | OK | OK | OK | OK | OK | OK | OK |

\* Moderator has its own schema, not agent-output.json
\*\* Reading level conflicts with PRODUCT-POSITIONING.md
\*\*\* Does not map between three different evidence tier vocabularies

---

## Priority Fix List

### P0 (Blocks production)
1. Reconcile all specialist prompt output JSON structures with `agent-output.json` schema
2. Add `round` field to all specialist prompts
3. Resolve `evidence_cited` conflict (anti-hallucination rules vs. schema requirements)
4. Add evidence tier mapping to moderator prompt

### P1 (Should fix before launch)
5. Fix reading level inconsistency (moderator: 8th grade vs. product positioning: 5th-6th grade)
6. Add two-tier safety escalation to all specialists (currently only neuropsychiatrist and pharmacologist have it)
7. Add cross-examination instructions to specialist prompts for round 2+ behavior
8. Add `model_assignment` and `secondary_domains` to classifier few-shot examples
9. Add fabricated-guideline-version anti-hallucination rule to all prompts
10. Add patient refusal/non-compliance handling to all prompts

### P2 (Should fix before scale)
11. Add missing classifier edge case examples (pregnancy, pediatric, oncology, meta-queries, garbled input)
12. Add classifier routing modifiers for pregnancy and BMI
13. Add response length guidance to all prompts
14. Add explicit `{evidence_package}` null/empty handling to all prompts
15. Update specialist-agent-prompt-template.md to match current production prompt structure
16. Add SJS/TEN to pharmacologist safety triggers
17. Add cardiac tamponade to cardiologist safety triggers
18. Add explicit dual-tier-system explanation to all specialist prompts (clinical tiers vs. supplement tiers)
19. Consider adding gastroenterologist and rheumatologist specialist agents

### P3 (Nice to have)
20. Add token/length optimization guidance
21. Add geriatrician and pulmonologist specialist agents
22. Add "I genuinely don't know and can't identify the right specialist" fallback to epistemic humility
23. Reconcile neuropsychiatrist GRADE-conditional language pattern across other specialists (KDIGO-style)
