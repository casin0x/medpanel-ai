# Skill: Compare Runs

## Trigger

User wants to check consultation reproducibility. Indicators:
- "Run this case multiple times and compare"
- "Check reproducibility"
- "Is the output stable?"
- "Compare runs"
- "How consistent are the results?"
- User references "Enhanced Reliability Mode"

## What This Skill Does

Runs the same consultation N times (default: 3), compares outputs using the reproducibility similarity function from DISCUSSION-PROTOCOL.md, and reports stability scores, stable vs unstable recommendations, and drift analysis.

## Files to Load

1. `docs/specs/DISCUSSION-PROTOCOL.md` -- Section 3 (Reproducibility Solution): reproducibility tiers, `are_outputs_acceptably_similar()` function, technical controls, seed strategy, and test suite spec
2. `schemas/consultation.json` -- to validate each run's output structure
3. `schemas/agent-output.json` -- to validate per-agent outputs across runs

Do NOT load: prompts (loaded by `run-consultation` skill internally), evidence pipeline, safety system.

## Step-by-Step Instructions

### Step 1: Configure the Comparison

1. Determine the number of runs. Default: 3. User can specify more (max 5 recommended for cost control).
2. Determine the case to run:
   - If user provides a patient profile + question: use that.
   - If user references an existing consultation: replay that case data.
   - If user wants to use a test case: check `tests/` for predefined cases.
3. Calculate estimated cost: N * estimated single consultation cost. Warn user if total exceeds $15. Get confirmation before proceeding.

### Step 2: Configure Seeds

4. Apply the seed strategy from DISCUSSION-PROTOCOL.md Section 3:
   ```
   base_seed = hash(
     patient_id +
     consultation_question +
     sorted(lab_values) +
     sorted(medications) +
     date_bucket(consultation_date, granularity='week')
   ) % (2^32)
   ```
5. For each run i (0 to N-1), use seed = `base_seed + i`.
6. Per-agent seeds: `run_seed + hash(agent_specialty)`.
7. Temperature settings per round:
   - Round 1: 0.3
   - Round 2: 0.4
   - Round 3: 0.2
   - Synthesis: 0.2
   - Devil's advocate: 0.6

### Step 3: Execute Runs

8. For each run i:
   - Use the `run-consultation` skill flow (or invoke the orchestrator directly).
   - Pass the seed for this run.
   - Capture the complete output including all round outputs, synthesis, quality metrics.
   - Record token usage and cost per run.
9. Runs may be sequential (simpler) or parallel (faster, if cost tracking permits).
10. After all runs complete, collect all N output sets.

### Step 4: Pairwise Comparison

11. For each pair of runs (i, j), apply the `are_outputs_acceptably_similar()` function from DISCUSSION-PROTOCOL.md:

    **Check 1 -- Findings Overlap (Jaccard):**
    - Normalize finding topics from each run (strip prose, keep clinical topic).
    - Compute Jaccard similarity: |A intersection B| / |A union B|.
    - Threshold: >= 0.80.

    **Check 2 -- Recommendations Overlap (Jaccard):**
    - Normalize recommendations by action category + target.
    - Compute Jaccard similarity.
    - Threshold: >= 0.75.

    **Check 3 -- Confidence Stability:**
    - Match recommendations across runs by normalized content.
    - Compute absolute confidence delta for each matched pair.
    - Max delta threshold: <= 0.15.
    - Average delta threshold: <= 0.08.

    **Check 4 -- Risk Flag Consistency:**
    - Match risk flags by normalized topic.
    - Check that severity levels match exactly for all common flags.
    - Threshold: 0 severity mismatches.

    **Check 5 -- Consensus Classification:**
    - Check that the final consensus status (consensus/conditional/disputed) is the same.
    - Must match exactly.

    **Check 6 -- Evidence Source Overlap:**
    - For each matched recommendation, compare cited evidence sources.
    - Compute overlap ratio.
    - Threshold: >= 0.60.

12. Compute overall verdict per pair:
    - **PASS:** All critical checks pass (recommendations overlap, risk flag consistency, consensus classification).
    - **PARTIAL:** Critical checks pass but non-critical dimensions differ.
    - **FAIL:** Any critical check fails.

### Step 5: Aggregate Analysis

13. Compute suite-level metrics:
    - **Overall pass rate:** % of pairwise comparisons that PASS.
    - **Critical pass rate:** % of critical dimension checks that pass.
    - **Recommendation stability (mean Jaccard):** Average Jaccard across all pairs.
    - **Confidence CV:** Coefficient of variation for confidence scores across runs.
    - **Severity agreement (Fleiss' kappa):** Inter-run agreement on risk flag severities.
    - **Consensus agreement:** Do all runs agree on consensus status?

14. Identify stable vs unstable items:
    - **Stable recommendations:** Recommendations that appeared in ALL N runs (intersection).
    - **Unstable recommendations:** Recommendations that appeared in some but not all runs.
    - **Stable findings:** Findings present in all runs.
    - **Unstable findings:** Findings present in some runs only.

15. Apply the `consensus_across_runs` logic from DISCUSSION-PROTOCOL.md:
    - For critical/high priority recommendations: only those in the intersection are considered reliable.
    - Unstable critical recommendations get flagged: "This recommendation was not consistent across multiple analyses. Treat with extra scrutiny."

16. Calculate a stability score: `|stable_recs| / |stable_recs union unstable_recs|`.

### Step 6: Compare Against Thresholds

17. Apply DISCUSSION-PROTOCOL.md thresholds:
    - Overall pass rate >= 0.90 (90% of run-pairs are acceptably similar)
    - Critical pass rate >= 0.95 (95% on critical dimensions)
    - Recommendation stability mean >= 0.80

18. If any threshold is breached:
    - Flag: "Reproducibility regression detected."
    - Identify the worst-performing dimension.
    - Suggest corrective actions: tighten temperature, add structured constraints, investigate unstable recommendations.

## Output Format

```
# Reproducibility Report

## Configuration
- Case: [description or ID]
- Runs: N
- Seeds: [base_seed, base_seed+1, ..., base_seed+N-1]
- Total cost: $X.XX across all runs

## Overall Verdict: PASS / PARTIAL / FAIL
- Overall pass rate: XX% (threshold: >= 90%)
- Critical pass rate: XX% (threshold: >= 95%)
- Recommendation stability: X.XX (threshold: >= 0.80)

## Pairwise Results
| Run A | Run B | Findings | Recs | Confidence | Risk Flags | Consensus | Evidence | Verdict |
|-------|-------|----------|------|------------|------------|-----------|----------|---------|
| 1 | 2 | 0.XX | 0.XX | 0.XX avg | match/mismatch | match/mismatch | 0.XX | PASS/FAIL |
| 1 | 3 | ... | ... | ... | ... | ... | ... | ... |
| 2 | 3 | ... | ... | ... | ... | ... | ... | ... |

## Stable Recommendations (appeared in ALL runs)
1. [Recommendation text] -- confidence range: [X.XX - X.XX]
2. ...

## Unstable Recommendations (appeared in some runs only)
1. [Recommendation text] -- appeared in runs [1, 3] but not [2]
   Possible reason: [analysis]
2. ...

## Stable Findings (appeared in ALL runs)
1. [Finding topic]
2. ...

## Unstable Findings
1. [Finding topic] -- appeared in runs [X] only
2. ...

## Confidence Drift
| Recommendation | Run 1 | Run 2 | Run 3 | Max Delta | Stable? |
|---------------|-------|-------|-------|-----------|---------|
| [rec] | 0.XX | 0.XX | 0.XX | 0.XX | Yes/No |

## Dimension Analysis
- Findings overlap: mean X.XX, min X.XX (threshold: 0.80)
- Recommendations overlap: mean X.XX, min X.XX (threshold: 0.75)
- Confidence max delta: X.XX (threshold: 0.15)
- Confidence avg delta: X.XX (threshold: 0.08)
- Risk flag mismatches: N (threshold: 0)
- Consensus agreement: unanimous / split

## Recommendations
1. [If failing: specific corrective action]
2. [If passing: "System is stable for this case type"]
```

## Error Handling

- **Cost too high:** If N runs would exceed $15, warn user and suggest N=2 or a simpler case. Get explicit confirmation before proceeding.
- **One run fails mid-consultation:** Complete the remaining runs. Report the failure. Compare only successful runs. Note reduced sample size.
- **Wildly different outputs (stability < 0.50):** This indicates a systemic issue. Stop after 3 runs. Report the divergence. Suggest investigating: (1) Is the case ambiguous enough that different specialist selections occur? (2) Is the evidence retrieval returning different results? (3) Are temperatures too high?
- **All runs identical (stability = 1.0):** Good for deterministic components. For LLM outputs, perfect identity across runs with different seeds is suspicious and may indicate the model is ignoring the seed or the outputs are cached. Note this.
- **External API variance:** Evidence retrieval may return different results across runs (Perplexity results change over time). If comparing runs separated by time, note that evidence variance is expected and not an LLM reproducibility issue. For clean comparisons, cache the evidence package from run 1 and reuse it for all subsequent runs.
