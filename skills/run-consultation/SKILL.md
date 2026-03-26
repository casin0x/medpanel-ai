# Skill: Run Consultation

## Trigger

User wants to run a health consultation through the MedPanel system. Indicators:
- "Run a consultation for..."
- "Analyze this case..."
- "What would the specialists say about..."
- User provides a patient profile or health question

## What This Skill Does

Orchestrates the full MedPanel pipeline: classify the question, retrieve evidence, run specialist agents, conduct multi-round discussion, and synthesize the output. This is the main product flow.

## Files to Load

Load these files in order. Do not load anything else.

### Required (always load)

1. `schemas/patient-profile.json` -- validate the input profile
2. `schemas/agent-output.json` -- enforce specialist output structure
3. `schemas/consultation.json` -- the consultation lifecycle schema
4. `docs/specs/DISCUSSION-PROTOCOL.md` -- the full orchestration spec (round-by-round protocol, termination conditions, quality metrics)
5. `docs/SERVICES-MANIFEST.md` -- API endpoints, models, and cost info

### Load per stage (only when you reach that stage)

6. `prompts/classifier.md` -- when running classification
7. `docs/specs/EVIDENCE-PIPELINE.md` -- when assembling evidence
8. `prompts/[specialist].md` -- load only the specialist prompts for the selected specialists
9. `prompts/moderator.md` -- when running synthesis
10. `docs/specs/SAFETY-SYSTEM.md` -- when running safety checks
11. `docs/specs/PRODUCT-POSITIONING.md` -- when rendering final output (language rules)

## Step-by-Step Instructions

### Phase 1: Validate Input

1. Parse the user's input. Extract or construct a patient profile.
2. Validate the profile against `schemas/patient-profile.json`.
3. Run the completeness scoring function from DISCUSSION-PROTOCOL.md Section 1a:
   - If critical fields are missing (age, sex, medications, conditions, allergies, question): **STOP**. Ask the user to provide them.
   - If score < 0.50: **STOP**. Too many gaps.
   - If score < 0.70: **WARN**. Proceed but inject incomplete-data warnings into agent prompts.
   - If score >= 0.70: **PROCEED**.
4. Run biological plausibility checks from DISCUSSION-PROTOCOL.md Edge Case 4:
   - Check lab values against plausibility ranges.
   - Check internal consistency (e.g., suppressed LH without exogenous testosterone).
   - If critical anomalies found: **STOP**. Ask the user to verify values.
   - If warnings found: Flag them for injection into agent context.

### Phase 2: Classify the Question

5. Use the classifier prompt (`prompts/classifier.md`) to determine:
   - `intent` (diagnostic, therapeutic, optimization, etc.)
   - `organ_systems` involved
   - `urgency` level
   - `complexity_score` (0-10)
   - `specialists_selected` (2-5 specialists)
   - `emergency_detected` (boolean)
6. If `emergency_detected` is true: **STOP immediately**. Output the emergency response from SAFETY-SYSTEM.md. Do not proceed to specialist analysis.
7. Validate the classification output. Ensure specialist count is within bounds (2-5).

### Phase 3: Assemble Evidence

8. Generate search queries (one shared, one per specialist) per EVIDENCE-PIPELINE.md Section 2.
9. Simulate evidence retrieval. Since external APIs may not be live:
   - If APIs are available: call Perplexity, PubMed, DrugBank per the pipeline spec.
   - If APIs are not available: note this in retrieval_status as "unavailable" and proceed with parametric knowledge only. Cap agent confidence at "moderate".
10. Assemble the evidence package per EVIDENCE-PIPELINE.md Section 6 schema.
11. Distribute evidence: shared evidence to all agents, specialist-specific evidence to matching agents only.

### Phase 4: Round 1 -- Independent Analysis

12. For each selected specialist:
    - Load the specialist's prompt from `prompts/[specialist].md`.
    - Provide: patient profile + evidence package (shared + specialist-specific) + any historical outcome context.
    - Enforce output against Round 1 schema from DISCUSSION-PROTOCOL.md.
    - Use temperature 0.3.
    - Output must include: findings with IDs, recommendations with IDs, risk flags, information gaps, cross-domain questions, confidence summary.
13. Run all specialists in parallel.
14. After Round 1: run `detect_cross_domain_harm()` on all recommendations.
15. Track token usage and cost against budget ceiling ($5.00 max).

### Phase 5: Round 2 -- Cross-Examination

16. For each specialist:
    - Provide: their own Round 1 output + all other specialists' Round 1 outputs + detected conflicts.
    - Use the CROSS_EXAMINATION_PROMPT from DISCUSSION-PROTOCOL.md.
    - Enforce output against Round 2 schema.
    - Use temperature 0.4.
    - Output must include: agreements (with finding IDs), disagreements (with recommendation IDs and counter-evidence), cross-domain risks, answered questions, updated recommendations, unresolved disagreements.
17. After Round 2: check termination conditions:
    - If no unresolved disagreements: terminate (consensus reached).
    - If budget >= 80%: apply degradation strategy.
    - If information gain < 5%: terminate (diminishing returns).

### Phase 6: Round 3 -- Focused Resolution (Conditional)

18. Only fire if:
    - Unresolved disagreements exist with `requires_round_3: true`
    - The disagreement involves moderate+ severity recommendations
    - Token budget has not exceeded 80% ceiling
19. Scope: agents ONLY address specific unresolved disagreements. 500 token limit per agent.
20. Use temperature 0.2.
21. Output must include: final_position, resolution_type, deferred_new_concern.
22. If a new concern is raised in Round 3: strip it from resolution, defer to a separate consultation.

### Phase 7: Synthesis

23. Load `prompts/moderator.md`.
24. Feed all round outputs to the moderator agent.
25. The synthesis must produce:
    - `consensus_items` with agreement level and supporting specialists
    - `divergent_items` with both perspectives and patient-specific factors
    - `evidence_landscape` (strong / clinical trial / preliminary / unknown / being researched)
    - `questions_for_doctor` (3-8 items, deduplicated across all specialists)
    - `safety_summary` with flags and interaction count
26. Run false consensus detection per DISCUSSION-PROTOCOL.md Edge Case 2.
27. If suspicious unanimity detected: run devil's advocate pass.

### Phase 8: Safety Check and Output

28. Run the final output through the safety system (SAFETY-SYSTEM.md).
29. Render two output modes:
    - **Patient mode:** plain language, questions-to-ask, evidence landscape. Uses PRODUCT-POSITIONING.md language rules (never prescriptive, always exploratory).
    - **Physician mode:** clinical language, GRADE ratings, citations.
30. Attach the primary disclaimer from PRODUCT-POSITIONING.md.
31. Report: consultation_id, total cost, rounds completed, quality metrics (value-added score, diversity score, information gain per round).

## Output Format

Present results in this order:
1. **Safety alerts** (if any) -- prominently at the top
2. **Consensus findings** -- what all specialists agree on
3. **Divergent perspectives** -- where specialists disagree, with both sides and patient-specific factors
4. **Evidence landscape** -- what is well-established vs preliminary vs unknown
5. **Questions for your doctor** -- the primary actionable output
6. **Detailed specialist analyses** -- collapsible per-specialist breakdowns
7. **Metadata** -- cost, rounds, specialists involved, quality metrics

## Error Handling

- **Profile validation fails:** Return specific missing fields and ask user to provide them. Do not guess.
- **Emergency detected:** Immediately output emergency response. Do not run specialists.
- **Budget exceeded mid-consultation:** Synthesize whatever rounds completed. Flag as "budget-limited" in output.
- **Agent produces invalid output:** Retry once with same seed. If still invalid, skip that agent and note in synthesis.
- **All evidence APIs fail:** Proceed with parametric knowledge only. Cap confidence at "moderate". Add banner: "Evidence retrieval unavailable -- responses based on AI training knowledge only."
- **Agent hallucination detected (fabricated PMID):** Remove the PMID, keep the claim text, flag as unverified.
