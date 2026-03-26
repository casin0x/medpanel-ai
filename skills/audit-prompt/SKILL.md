# Skill: Audit Prompt

## Trigger

User creates or edits a specialist prompt. Indicators:
- User opens or modifies any file in `prompts/`
- "Review this prompt"
- "Does this prompt conform to the schema?"
- "Check this prompt for issues"
- User creates a new specialist agent

## What This Skill Does

Validates a specialist prompt against four dimensions: schema conformity, language compliance, evidence tier consistency, and anti-hallucination measures. Produces a pass/fail report with specific line-level feedback.

## Files to Load

1. `schemas/agent-output.json` -- the output schema every specialist prompt must produce
2. `docs/specs/PRODUCT-POSITIONING.md` -- language rules (never prescriptive, exploration framing)
3. `docs/specs/supplement-evidence-framework.md` -- evidence tier definitions (S/A/B/C/D)
4. `prompts/specialist-agent-prompt-template.md` -- the base template all prompts must follow
5. The specific prompt file being audited (e.g., `prompts/cardiologist.md`)

Do NOT load: other specialist prompts, `DISCUSSION-PROTOCOL.md`, `EVIDENCE-PIPELINE.md`, `src/` files.

## Step-by-Step Instructions

### Check 1: Schema Conformity

1. Read the prompt file being audited.
2. Read `schemas/agent-output.json`.
3. Verify the prompt instructs the agent to produce output with ALL required fields from the schema:
   - `specialist_type` (must use a valid enum value)
   - `round` (integer)
   - `assessment` with `summary`, `key_findings`, `domain_relevance`
   - `perspectives` with `approach`, `rationale`, `evidence_support`, `patient_factors`
   - `evidence_cited` with `claim`, `source_type`
   - `confidence` with `overall`, `rationale`
   - `uncertainties` with `uncertainty`, `type`
   - `questions_for_doctor` (2-6 items)
4. Check that the prompt references or embeds the output schema (either literally or by instruction).
5. Check that the prompt uses the correct enum values. Flag if the prompt references enum values not in the schema (e.g., using `"high_confidence"` when schema requires `"high"`).
6. Flag any fields the prompt adds that are NOT in the schema (schema drift).

**Also check against DISCUSSION-PROTOCOL.md Round 1 output spec** (the spec is more detailed than the current schema):
- Does the prompt instruct the agent to produce finding IDs (e.g., `F-ENDO-001`)?
- Does the prompt instruct the agent to produce recommendation IDs (e.g., `R-ENDO-001`)?
- Does the prompt include `interaction_flags` on findings?
- Does the prompt include `cross_domain_questions`?
- Does the prompt include `what_if_not_followed` on recommendations?
- Does the prompt include `evidence_quality` on recommendations?

### Check 2: Language Compliance

7. Read `docs/specs/PRODUCT-POSITIONING.md`.
8. Scan the prompt for BANNED language patterns:
   - "we recommend" / "I recommend" / "you should" / "take this" / "do this"
   - Any direct prescriptive instruction to the patient
   - "diagnosis" used as a verb directed at the patient
   - "treatment plan" without qualifier ("exploration" or "considerations" preferred)
9. Verify the prompt includes REQUIRED language patterns:
   - Exploration framing: "a specialist might consider", "this warrants discussion with your provider", "perspectives to explore"
   - Uncertainty markers: explicit "I don't know" / "outside my expertise" / "insufficient data" behaviors
   - Disclaimer reference or instruction to include disclaimers
10. Score language compliance: count banned instances and missing required patterns.

### Check 3: Evidence Tier Consistency

11. Read `docs/specs/supplement-evidence-framework.md`.
12. If the prompt discusses supplements, verify:
    - Evidence tiers are labeled correctly (S = Strong, A = Good, B = Promising, C = Preliminary, D = Insufficient)
    - The prompt does not inflate evidence tiers (e.g., calling a single small study "strong evidence")
    - The prompt instructs the agent to cite the tier level for any supplement recommendation
    - The prompt distinguishes between "established" evidence (meta-analyses, RCTs) and "mechanistic" evidence
13. Check that the prompt's evidence language aligns with the enum values in `agent-output.json`:
    - `evidence_level`: `["strong", "moderate", "preliminary", "mechanistic", "expert_opinion", "unknown"]`
    - `evidence_support`: `["strong_rct", "moderate_rct", "observational", "guideline_based", "mechanistic", "expert_consensus", "preliminary", "traditional"]`
    - `source_type`: `["systematic_review", "meta_analysis", "rct", "cohort", "case_control", "guideline", "case_report", "mechanistic", "expert_opinion", "general_knowledge"]`

### Check 4: Anti-Hallucination Measures

14. Verify the prompt includes explicit instructions for:
    - **Citation honesty:** "Never fabricate citations", "If you don't have a specific study, say so", "PMID must be real or omitted"
    - **Dosage caution:** "Never guess dosages", "Cite source for any specific dose mentioned"
    - **Scope awareness:** "State when a topic is outside your specialty", instructions to defer to other specialists
    - **Confidence calibration:** Instructions to lower confidence when evidence is weak or missing
    - **Lab value handling:** "Do not assume normal for missing values", "Flag when missing data would change assessment"
15. Flag if any of these are missing.

### Check 5: Template Conformity

16. Read `prompts/specialist-agent-prompt-template.md`.
17. Verify the prompt follows the base template structure:
    - Has the parameterization slots: `{patient_context}`, `{evidence_package}`
    - Follows the section ordering from the template
    - Domain-specific sections replace (not duplicate) template sections
    - Universal sections (output schema, safety, anti-hallucination) are preserved

## Output Format

Produce a structured audit report:

```
# Prompt Audit: [filename]

## Summary
- Schema Conformity: PASS / FAIL (N issues)
- Language Compliance: PASS / FAIL (N violations)
- Evidence Tiers: PASS / FAIL / N/A (N issues)
- Anti-Hallucination: PASS / FAIL (N missing measures)
- Template Conformity: PASS / FAIL (N deviations)

## Findings

### [CHECK_NAME] -- [PASS/FAIL]
- [Specific finding with line reference]
- [Specific finding with line reference]

### Recommendations
1. [Specific fix with exact text to add/change]
2. [Specific fix with exact text to add/change]
```

## Error Handling

- **Prompt file not found:** Ask user which prompt they want to audit. List available prompts from `prompts/`.
- **Template file not found:** Skip template conformity check. Note it in the report.
- **Prompt is for moderator or classifier (not specialist):** These have different schemas. For moderator, validate against `consultation.json` synthesis section. For classifier, validate against `consultation.json` classification section. Skip evidence tier and anti-hallucination checks (those are specialist-specific).
