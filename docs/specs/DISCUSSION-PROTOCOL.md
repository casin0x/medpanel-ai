# Multi-Agent Medical Discussion System -- Complete Production Specification

## 1. DISCUSSION PROTOCOL -- COMPLETE SPECIFICATION

### 1a. Pre-Discussion Phase

#### Specialist Selection Algorithm

```
FUNCTION select_specialists(case_data):
  
  # Step 1: Extract medical domains from the case
  domains = extract_domains(case_data)
    # Uses structured classification, not free-text LLM inference
    # Maps ICD-10 codes, lab panels, medications, symptoms → specialist domains
    # Example: testosterone levels → endocrinology, LDL → cardiology, OAT results → functional_medicine

  # Step 2: Build the specialist roster
  required = []
  
  # Always include a generalist/internist as anchor
  required.append("internal_medicine")
  
  # Map domains to specialists using a static lookup table (NOT LLM-decided)
  DOMAIN_MAP = {
    "hormones_trt_thyroid":      "endocrinology",
    "lipids_cardiac_bp":         "cardiology",
    "neurotransmitters_psych":   "neuropsychiatry",
    "gut_microbiome_oat":        "functional_medicine",
    "supplements_interactions":  "clinical_pharmacology",
    "musculoskeletal_training":  "sports_medicine",
    "sleep_autonomic":           "sleep_medicine",
    "liver_kidney_metabolic":    "hepatology_nephrology",
    "immune_autoimmune":         "immunology",
    "nutrition_micronutrients":  "nutritional_medicine",
  }
  
  for domain in domains:
    if domain in DOMAIN_MAP:
      required.append(DOMAIN_MAP[domain])
  
  # Step 3: Cross-domain interaction check
  # Some domain PAIRS mandate an additional specialist
  INTERACTION_RULES = {
    ("endocrinology", "cardiology"):     "clinical_pharmacology",  # TRT + statins
    ("neuropsychiatry", "endocrinology"): "clinical_pharmacology",  # psych meds + hormones
    ("functional_medicine", "clinical_pharmacology"): None,         # already covered
  }
  
  for pair, additional in INTERACTION_RULES.items():
    if pair[0] in required and pair[1] in required and additional:
      required.append(additional)
  
  # Step 4: Cap at MAX_SPECIALISTS (cost control)
  MAX_SPECIALISTS = 5  # Including internist anchor
  if len(set(required)) > MAX_SPECIALISTS:
    # Prioritize by: (1) domains with most abnormal findings, (2) drug interaction risk
    required = prioritize_by_clinical_signal(required, case_data, limit=MAX_SPECIALISTS)
  
  # Step 5: Assign model tiers
  # Lead specialists (top 2 by signal strength): claude-opus-4-6 or equivalent
  # Supporting specialists: claude-sonnet-4 or equivalent
  # Internist anchor: always top tier (synthesizer role)
  
  return deduplicate(required)
```

#### Evidence Package Assembly

```
STRUCTURE evidence_package:

  # SHARED CONTEXT (goes to ALL agents)
  shared:
    patient_demographics:
      age: int
      sex: enum(male, female)
      height_cm: float
      weight_kg: float
      bmi: float (computed)
    
    current_medications: [
      { name: str, dose: str, frequency: str, duration: str, prescriber: str }
    ]
    
    current_supplements: [
      { name: str, dose: str, frequency: str, reason: str }
    ]
    
    known_conditions: [ str ]  # ICD-10 preferred
    
    allergies: [ { substance: str, reaction: str, severity: enum } ]
    
    lab_results_summary: [
      {
        test_name: str,
        value: float,
        unit: str,
        reference_range: { low: float, high: float },
        flag: enum(normal, low, high, critical_low, critical_high),
        date: date,
        trend: enum(improving, stable, worsening, insufficient_data)  # requires 2+ readings
      }
    ]
    
    consultation_question: str  # The user's actual question
    consultation_type: enum(
      optimization,       # "How do I improve X?"
      differential,       # "What's causing X?"
      medication_review,  # "Should I take/change X?"
      lab_interpretation,  # "What do these results mean?"
      risk_assessment,    # "Am I at risk for X?"
      protocol_design     # "Design a protocol for X"
    )
  
  # SPECIALIST-SPECIFIC CONTEXT (only sent to relevant agent)
  specialist_specific:
    endocrinology:
      full_hormone_panel: [ ... ]  # Complete TRT history, injection schedule, prior levels
      injection_protocol_details: str
      symptom_timeline_hormonal: [ ... ]
    
    cardiology:
      full_lipid_history: [ ... ]
      bp_readings: [ ... ]
      resting_hr_trend: [ ... ]
      cardiac_imaging: [ ... ] if available
      family_cardiac_history: str
    
    neuropsychiatry:
      psych_history: str
      current_psych_meds: [ ... ]
      substance_history: str  # Including sobriety dates
      sleep_data: [ ... ]
      autonomic_symptoms: [ ... ]
    
    functional_medicine:
      oat_report_full: object  # Complete OAT with all markers
      micronutrient_panel: object
      heavy_metal_results: object
      gut_health_markers: [ ... ]
    
    clinical_pharmacology:
      complete_medication_list: [ ... ]  # ALL substances including supplements
      known_cyp_interactions: [ ... ]   # Pre-computed interaction flags
      metabolizer_status: object if available  # Pharmacogenomics
```

#### Patient Profile Completeness Scoring

```
FUNCTION score_completeness(profile) -> { score: float, gaps: [], proceed: bool }:

  REQUIRED_FIELDS = {
    "age":                  { weight: 10, category: "critical" },
    "sex":                  { weight: 10, category: "critical" },
    "current_medications":  { weight: 10, category: "critical" },
    "known_conditions":     { weight: 8,  category: "critical" },
    "allergies":            { weight: 8,  category: "critical" },
    "consultation_question":{ weight: 10, category: "critical" },
    "lab_results":          { weight: 8,  category: "important" },
    "weight":               { weight: 4,  category: "helpful" },
    "height":               { weight: 3,  category: "helpful" },
    "supplements":          { weight: 5,  category: "important" },
    "family_history":       { weight: 3,  category: "helpful" },
    "lifestyle":            { weight: 3,  category: "helpful" },
  }
  
  total_possible = sum(field.weight for field in REQUIRED_FIELDS)
  earned = 0
  gaps = []
  
  for field_name, meta in REQUIRED_FIELDS:
    if profile[field_name] is present AND non_empty:
      earned += meta.weight
    else:
      gaps.append({ field: field_name, category: meta.category, weight: meta.weight })
  
  score = earned / total_possible  # 0.0 to 1.0
  
  # Decision logic
  critical_gaps = [g for g in gaps if g.category == "critical"]
  
  if len(critical_gaps) > 0:
    proceed = false  # BLOCK: ask user to fill critical gaps
  elif score < 0.50:
    proceed = false  # BLOCK: too many gaps for meaningful analysis
  elif score < 0.70:
    proceed = true   # WARN: proceed but flag uncertainty in output
    # Inject into each agent's system prompt:
    # "INCOMPLETE DATA WARNING: The following fields are missing: [gaps]. 
    #  You MUST explicitly state when your analysis would change if this 
    #  missing data revealed specific values. Do not assume normal."
  else:
    proceed = true   # PROCEED: adequate data
  
  return { score, gaps, proceed }
```

---

### 1b. Round-by-Round Specification

#### Round 1: Independent Analysis

Each specialist receives the evidence package and produces output conforming to this exact schema:

```json
{
  "$schema": "round_1_output",
  "agent_id": "endocrinology_001",
  "specialty": "endocrinology",
  "model": "claude-opus-4-6",
  "timestamp": "2026-03-24T14:30:00Z",
  "token_usage": { "input": 4200, "output": 1800 },
  
  "findings": [
    {
      "id": "F-ENDO-001",
      "category": "abnormal_lab",
      "description": "SHBG critically low at 17 nmol/L (ref 18-54). Amplifies free testosterone effect, increases estradiol conversion risk, associated with insulin resistance and metabolic syndrome.",
      "severity": "moderate",
      "confidence": 0.92,
      "evidence_basis": "direct_lab_value",
      "relevant_labs": ["SHBG", "free_testosterone", "estradiol"],
      "interaction_flags": ["cardiology:lipid_impact", "functional_medicine:insulin_resistance"]
    }
  ],
  
  "recommendations": [
    {
      "id": "R-ENDO-001",
      "type": "medication_adjustment",
      "action": "Consider adding low-dose boron (6-10mg/day) to modestly raise SHBG",
      "priority": "medium",
      "confidence": 0.70,
      "time_horizon": "4-8 weeks to reassess",
      "contraindication_check": {
        "checked_against": ["current_medications", "known_conditions"],
        "conflicts_found": [],
        "interaction_risk": "low"
      },
      "evidence_quality": "moderate",
      "evidence_sources": [
        "Naghii et al. 2011 - boron supplementation and steroid hormones",
        "Pizzorno 2015 - boron review"
      ],
      "monitoring_plan": "Recheck SHBG, free T, estradiol at 8 weeks",
      "what_if_not_followed": "Continued supraphysiologic free T effect despite reasonable total T. Ongoing estradiol management difficulty."
    }
  ],
  
  "risk_flags": [
    {
      "id": "RF-ENDO-001",
      "severity": "yellow",  // green, yellow, orange, red
      "description": "LDL at 135 mg/dL on TRT needs cardiology input — TRT can shift lipid particle size",
      "requires_specialist": "cardiology",
      "urgency": "routine"
    }
  ],
  
  "information_gaps": [
    {
      "what_is_missing": "Recent estradiol level post-switch to IM injection",
      "why_it_matters": "IM vs subQ changes aromatization pattern; current protocol may already be addressing SHBG concern",
      "how_to_obtain": "Lab draw 6-8 weeks post IM switch"
    }
  ],
  
  "cross_domain_questions": [
    {
      "to_specialist": "cardiology",
      "question": "Given SHBG of 17 and current TRT, do you recommend statin initiation at LDL 135, or lifestyle optimization first? What is your threshold?",
      "context": "Statins can further suppress testosterone in some studies; need to weigh cardiovascular risk vs endocrine stability"
    }
  ],
  
  "confidence_summary": {
    "overall_confidence": 0.78,
    "highest_confidence_finding": "F-ENDO-001",
    "lowest_confidence_recommendation": "R-ENDO-001",
    "factors_reducing_confidence": ["missing recent post-IM-switch labs", "limited longitudinal hormone data"]
  }
}
```

**Mandatory output rules for Round 1:**
- Every recommendation MUST include `evidence_quality` rated as: `strong` (RCTs, meta-analyses), `moderate` (observational studies, clinical guidelines), `weak` (case reports, expert opinion, mechanistic reasoning), or `extrapolated` (evidence from adjacent domain applied here).
- Every recommendation MUST include `what_if_not_followed` -- forcing the agent to articulate the actual stakes.
- Every finding MUST include `interaction_flags` naming which other specialists should weigh in.
- `cross_domain_questions` are mandatory if any `interaction_flags` were raised.

#### Round 2: Cross-Examination

Each agent receives:
1. Their own Round 1 output (for reference)
2. ALL other agents' Round 1 outputs
3. A structured cross-examination prompt

```
CROSS_EXAMINATION_PROMPT = """
You are reviewing the Round 1 analyses from your colleague specialists. 
You MUST address:

1. AGREEMENTS: Which findings from other specialists align with yours? 
   State the specific finding IDs.

2. DISAGREEMENTS: Where do you disagree? You MUST:
   - State the specific finding/recommendation ID you dispute
   - Provide your counter-evidence
   - Rate your confidence in your disagreement (0.0-1.0)
   - Do NOT soften disagreements. "I respectfully disagree" is banned. 
     Say "I disagree because [evidence]."

3. CROSS-DOMAIN RISKS: Identify any recommendation from another specialist 
   that could negatively impact YOUR domain. Be specific:
   - Which recommendation? (cite ID)
   - What is the mechanism of harm?
   - What is the likelihood? (rare/possible/likely)
   - What is your alternative?

4. ANSWER QUESTIONS: Address any cross_domain_questions directed to you 
   from Round 1. Do not dodge.

5. NEW INFORMATION: Did another specialist's analysis change your own 
   recommendations? If so, update them with tracked changes.

ANTI-SYCOPHANCY RULES:
- Do NOT agree with another specialist just because they stated something 
  confidently. Evaluate the evidence.
- If you would have reached a different conclusion independently, say so.
- "I agree with Dr. [X]" without your own independent reasoning is 
  PROHIBITED. You must state YOUR reasoning, then note agreement.
- If the evidence is genuinely uncertain, say "the evidence does not 
  clearly favor either position" rather than picking a side to be agreeable.
"""
```

**Round 2 Output Schema:**

```json
{
  "$schema": "round_2_output",
  "agent_id": "cardiology_001",
  "responding_to": ["endocrinology_001", "internal_medicine_001", "functional_medicine_001"],
  
  "agreements": [
    {
      "with_agent": "endocrinology_001",
      "finding_id": "F-ENDO-001",
      "my_independent_reasoning": "Low SHBG is an independent cardiovascular risk marker (JCEM 2010, n=3000). I would have flagged this from the cardiology side as well.",
      "agreement_strengthens_confidence": true
    }
  ],
  
  "disagreements": [
    {
      "with_agent": "functional_medicine_001",
      "their_recommendation_id": "R-FM-003",
      "their_position": "High-dose CoQ10 (400mg) sufficient for cardiac protection alongside TRT",
      "my_position": "CoQ10 at 400mg is reasonable as adjunct but does NOT replace lipid management. LDL of 135 with low SHBG and TRT places 10-year ASCVD risk above the threshold where lifestyle + monitoring alone is insufficient.",
      "my_evidence": "2019 ACC/AHA guidelines, MESA risk calculator adjusted for TRT",
      "confidence_in_disagreement": 0.80,
      "proposed_resolution": "CoQ10 as adjunct YES, but primary lipid strategy must be defined first"
    }
  ],
  
  "cross_domain_risks": [
    {
      "recommendation_id": "R-ENDO-001",
      "from_agent": "endocrinology_001",
      "risk_to_my_domain": "Boron supplementation can lower SHBG further in some individuals initially, which could transiently worsen the atherogenic lipid profile. Mechanism: increased free T → increased hepatic lipase → lowered HDL.",
      "likelihood": "possible",
      "severity_if_occurs": "mild",
      "my_alternative": "Accept boron trial but mandate lipid recheck at 4 weeks, not just 8 weeks",
      "mitigation": "Add NMR lipoprofile at the 4-week check to catch particle count changes early"
    }
  ],
  
  "questions_answered": [
    {
      "question_from": "endocrinology_001",
      "original_question": "Do you recommend statin initiation at LDL 135?",
      "my_answer": "Not yet. 10-year ASCVD risk at age 30 is low on standard calculators even with LDL 135. However, standard calculators underestimate risk in TRT users. My recommendation: obtain coronary artery calcium (CAC) score. If CAC > 0, initiate statin. If CAC = 0, aggressive lifestyle for 6 months then recheck. This avoids both over-treatment and under-treatment.",
      "confidence": 0.85
    }
  ],
  
  "updated_recommendations": [
    {
      "original_id": "R-CARD-002",
      "change_type": "modified",
      "was": "Recheck lipids in 3 months",
      "now": "Recheck lipids (NMR lipoprofile, not standard panel) at 4 weeks if boron initiated, otherwise 3 months. Add CAC score.",
      "reason_for_change": "Endocrinology's boron recommendation introduces a monitoring need I hadn't accounted for"
    }
  ],
  
  "unresolved_disagreements": [
    {
      "disagreement_id": "D-001",
      "parties": ["cardiology_001", "functional_medicine_001"],
      "topic": "Adequacy of supplement-only approach to lipid management",
      "my_final_position": "Supplements are adjuncts, not primary lipid therapy when risk factors compound (TRT + low SHBG + family history unknown)",
      "evidence_strength_of_my_position": "strong",
      "requires_round_3": true
    }
  ]
}
```

#### Round 3: Focused Resolution (Conditional)

**Trigger conditions** -- Round 3 fires ONLY if:
1. Any `unresolved_disagreements` exist with `requires_round_3: true` from Round 2, AND
2. The disagreement involves a recommendation with severity >= "moderate", AND
3. Token budget has not exceeded 80% ceiling

**Round 3 is scoped narrowly.** Agents ONLY address the specific unresolved disagreements. No new topics.

```
ROUND_3_PROMPT = """
FOCUSED RESOLUTION — You are ONLY addressing the following disagreement(s):
{disagreement_list}

Rules:
1. You have 500 tokens maximum. Be precise.
2. State your final position with your single strongest piece of evidence.
3. If you cannot resolve: propose the specific decision framework the USER 
   should use (e.g., "If your CAC score is >0, follow cardiology's 
   recommendation. If CAC is 0, functional medicine's approach is reasonable 
   for 6 months.")
4. Conditional recommendations are PREFERRED over forced consensus. 
   "It depends on X" is a valid and often superior resolution.
5. NEW CONCERNS are PROHIBITED in Round 3. If you think of something new, 
   it gets flagged for a SEPARATE future consultation.
"""
```

**Round 3 Output Schema:**

```json
{
  "$schema": "round_3_output",
  "agent_id": "cardiology_001",
  "addressing_disagreement": "D-001",
  
  "final_position": {
    "recommendation": "Conditional approach: obtain CAC score first. CAC > 0 → low-dose rosuvastatin 5mg + lifestyle + CoQ10. CAC = 0 → lifestyle + CoQ10 + red yeast rice for 6 months, then recheck.",
    "evidence": "MESA study (Budoff 2017): CAC of 0 in patients under 40 confers very low 10-year event rate (<1%), making aggressive pharmacotherapy net-negative when accounting for side effects.",
    "confidence": 0.88,
    "concession": "I concede that functional medicine's supplement approach is reasonable in the CAC=0 scenario. My concern was primarily about the CAC>0 scenario being left uncovered."
  },
  
  "resolution_type": "conditional",  // consensus | conditional | persistent_disagreement
  
  "deferred_new_concern": null  // or { topic: str, urgency: str } if something new arose
}
```

#### Termination Conditions

```
FUNCTION should_terminate(state) -> { terminate: bool, reason: str }:

  # Condition 1: Consensus reached
  if state.round == 2 AND len(state.unresolved_disagreements) == 0:
    return { terminate: true, reason: "consensus_after_round_2" }
  
  # Condition 2: Round 3 complete (max rounds regardless of outcome)
  if state.round == 3:
    return { terminate: true, reason: "max_rounds_reached" }
  
  # Condition 3: Budget ceiling hit
  if state.total_tokens_used >= state.budget_ceiling * 0.95:
    return { terminate: true, reason: "budget_ceiling" }
  
  # Condition 4: Information gain below threshold
  if state.round >= 2:
    round_info_gain = compute_information_gain(state.round_outputs[-1], state.round_outputs[-2])
    if round_info_gain < 0.05:  # Less than 5% new information
      return { terminate: true, reason: "diminishing_returns" }
  
  return { terminate: false, reason: null }
```

---

### 1c. Discussion Quality Metrics

#### Value-Added Score

```
FUNCTION compute_value_added(multi_agent_output, single_agent_output):
  """
  Run the same case through a single top-tier generalist agent.
  Compare against the multi-agent output.
  """
  
  metrics = {
    # 1. Finding coverage: how many distinct clinical findings were identified?
    "findings_multi":  count_unique_findings(multi_agent_output),
    "findings_single": count_unique_findings(single_agent_output),
    "finding_coverage_ratio": findings_multi / max(findings_single, 1),
    
    # 2. Interaction detection: cross-domain risks identified
    "interactions_multi":  count_cross_domain_risks(multi_agent_output),
    "interactions_single": count_cross_domain_risks(single_agent_output),
    
    # 3. Evidence diversity: unique evidence sources cited
    "evidence_sources_multi":  count_unique_sources(multi_agent_output),
    "evidence_sources_single": count_unique_sources(single_agent_output),
    
    # 4. Actionability: recommendations with specific monitoring plans
    "actionable_recs_multi":  count_actionable(multi_agent_output),
    "actionable_recs_single": count_actionable(single_agent_output),
    
    # 5. Safety catches: contraindications / risks identified
    "safety_flags_multi":  count_safety_flags(multi_agent_output),
    "safety_flags_single": count_safety_flags(single_agent_output),
  }
  
  # Composite value-added score (0.0 = no value, >1.0 = multi-agent adds value)
  weights = { 
    "finding_coverage_ratio": 0.20,
    "interaction_ratio": 0.30,  # Most important — this is what multi-agent uniquely provides
    "evidence_ratio": 0.15,
    "actionability_ratio": 0.15,
    "safety_ratio": 0.20 
  }
  
  value_added = weighted_average(metrics, weights)
  
  return {
    "value_added_score": value_added,
    "justified": value_added > 1.15,  # Multi-agent must add at least 15% more value
    "breakdown": metrics
  }
```

#### Information Gain Per Round

```
FUNCTION compute_information_gain(current_round, previous_round) -> float:
  """
  Measures what new information Round N added over Round N-1.
  Uses semantic embedding distance, not token count.
  """
  
  # Extract structured claims from each round
  claims_previous = extract_claims(previous_round)  # Set of (finding, evidence, recommendation) tuples
  claims_current  = extract_claims(current_round)
  
  # New claims: things in current not semantically similar to anything in previous
  SIMILARITY_THRESHOLD = 0.90  # Cosine similarity; above this = "same claim restated"
  
  new_claims = []
  for claim in claims_current:
    max_similarity = max(cosine_sim(claim.embedding, prev.embedding) for prev in claims_previous)
    if max_similarity < SIMILARITY_THRESHOLD:
      new_claims.append(claim)
  
  # Modified claims: same topic but materially different conclusion
  modified_claims = []
  for claim in claims_current:
    best_match = argmax(cosine_sim(claim.embedding, prev.embedding) for prev in claims_previous)
    if 0.70 < sim(claim, best_match) < 0.90:  # Same topic, different conclusion
      if claim.recommendation != best_match.recommendation:
        modified_claims.append(claim)
  
  # Information gain = (new + modified) / total current claims
  info_gain = (len(new_claims) + 0.5 * len(modified_claims)) / max(len(claims_current), 1)
  
  return info_gain  # 0.0 to 1.0; below 0.05 = stop
```

#### Diversity Score

```
FUNCTION compute_diversity(round_outputs) -> { score: float, redundant_pairs: [] }:
  """
  Are agents saying different things, or just rephrasing each other?
  """
  
  agent_outputs = [output for output in round_outputs]
  pairwise_similarities = []
  redundant_pairs = []
  
  for i, j in all_pairs(agent_outputs):
    # Compare at the RECOMMENDATION level, not the prose level
    rec_overlap = jaccard_similarity(
      set(agent_outputs[i].recommendation_actions),
      set(agent_outputs[j].recommendation_actions)
    )
    
    finding_overlap = jaccard_similarity(
      set(agent_outputs[i].finding_topics),
      set(agent_outputs[j].finding_topics)
    )
    
    combined = 0.6 * rec_overlap + 0.4 * finding_overlap
    pairwise_similarities.append(combined)
    
    if combined > 0.85:
      redundant_pairs.append({
        "agents": [agent_outputs[i].agent_id, agent_outputs[j].agent_id],
        "overlap": combined,
        "note": "These two specialists provided substantially overlapping analysis. Consider removing one in future similar consultations."
      })
  
  # Diversity = 1 - average pairwise similarity
  diversity_score = 1.0 - mean(pairwise_similarities)
  
  return {
    "score": diversity_score,  # 0.0 = all identical, 1.0 = completely unique perspectives
    "redundant_pairs": redundant_pairs,
    "recommendation": "drop_agent" if diversity_score < 0.30 else "adequate"
  }
```

---

### 1d. Cost Controls

#### Token Budget Architecture

```
BUDGET_CONFIG = {
  # Per-agent per-round limits (output tokens)
  "round_1_per_agent": 3000,     # Thorough independent analysis
  "round_2_per_agent": 2000,     # Cross-examination is more focused
  "round_3_per_agent": 500,      # Laser-focused resolution only
  
  # Input token estimates (dominated by evidence package)
  "evidence_package_shared":      4000,   # Shared patient context
  "evidence_package_specialist":  2000,   # Specialist-specific context
  "round_2_cross_exam_input":     12000,  # All Round 1 outputs (4 agents * 3000)
  
  # Total consultation budget ceiling
  "max_total_tokens": 200000,    # Input + output across all rounds and agents
  "max_total_cost_usd": 5.00,   # Hard ceiling in dollars
  
  # Model costs (per 1M tokens, approximate)
  "model_costs": {
    "claude-opus-4-6_input":   15.00,
    "claude-opus-4-6_output":  75.00,
    "claude-sonnet-4_input":    3.00,
    "claude-sonnet-4_output":  15.00,
  }
}
```

#### Budget Tracking and Enforcement

```
FUNCTION track_budget(state) -> { remaining: float, action: str }:
  
  spent = state.total_cost_usd
  ceiling = BUDGET_CONFIG["max_total_cost_usd"]
  remaining = ceiling - spent
  pct_spent = spent / ceiling
  
  if pct_spent >= 0.95:
    return { remaining, action: "HARD_STOP" }
    # Immediately synthesize whatever we have. No more agent calls.
  
  elif pct_spent >= 0.80:
    return { remaining, action: "DEGRADE" }
    # Apply degradation strategy (see below)
  
  elif pct_spent >= 0.60:
    return { remaining, action: "WARN" }
    # Log warning, reduce Round 3 budget if it occurs
  
  else:
    return { remaining, action: "PROCEED" }


FUNCTION apply_degradation(state, remaining_budget):
  """
  Graceful degradation when approaching budget ceiling.
  Applied in priority order (least impactful first).
  """
  
  strategies = [
    # Strategy 1: Reduce Round 3 token limits
    {
      "action": "reduce_round_3_tokens",
      "new_limit": 250,  # Down from 500
      "savings_estimate": "~2000 tokens"
    },
    
    # Strategy 2: Downgrade Round 2+ models to Sonnet
    {
      "action": "downgrade_models",
      "rounds_affected": [2, 3],
      "from": "claude-opus-4-6",
      "to": "claude-sonnet-4",
      "savings_estimate": "~60% cost reduction for those rounds"
    },
    
    # Strategy 3: Eliminate Round 3 entirely
    {
      "action": "skip_round_3",
      "condition": "if remaining < cost_of_round_3_estimate",
      "mitigation": "Flag unresolved disagreements clearly in synthesis"
    },
    
    # Strategy 4: Reduce agent count
    {
      "action": "drop_lowest_signal_agent",
      "criteria": "Agent with fewest unique findings in Round 1",
      "savings_estimate": "~20-25% of remaining rounds"
    },
    
    # Strategy 5: Emergency synthesis
    {
      "action": "emergency_synthesis",
      "condition": "if remaining < cost_of_any_single_agent_call",
      "behavior": "Synthesize all Round 1 outputs immediately, skip cross-examination"
    }
  ]
  
  for strategy in strategies:
    if apply_strategy_covers_gap(strategy, remaining_budget):
      return strategy
  
  return strategies[-1]  # Emergency synthesis as last resort
```

#### Budget Exceeded Before Consensus

```
FUNCTION handle_budget_exceeded_no_consensus(state):
  """
  We've hit the ceiling but agents still disagree. What now?
  """
  
  synthesis = {
    "status": "budget_limited_incomplete_consensus",
    
    "areas_of_agreement": extract_agreements(state),  # What WAS resolved
    
    "unresolved_disagreements": [
      {
        "topic": disagreement.topic,
        "position_a": { "agent": ..., "recommendation": ..., "confidence": ... },
        "position_b": { "agent": ..., "recommendation": ..., "confidence": ... },
        "user_decision_framework": generate_decision_tree(disagreement),
        # ^ e.g., "If [test result] shows X, follow Position A. If Y, follow Position B."
      }
    ],
    
    "recommended_next_step": "The most cost-effective next step is [specific test/action] which would resolve the primary disagreement.",
    
    "meta": {
      "total_spent": state.total_cost_usd,
      "rounds_completed": state.current_round,
      "agents_consulted": len(state.agents),
      "completion_percentage": estimate_completion(state)  # How much discussion was completed
    }
  }
  
  return synthesis
```

---

### 1e. Edge Cases

#### Edge Case 1: New Concern in Round 3

```
POLICY: new_concern_round_3

# Detection
if round_3_output contains finding_id not referenced in rounds 1 or 2:
  flag = "NEW_CONCERN_LATE_INTRODUCTION"

# Handling
action:
  1. The new concern is STRIPPED from Round 3 resolution output.
  2. It is placed into a `deferred_concerns` queue.
  3. The synthesis includes a dedicated section:
     "NEW CONCERN IDENTIFIED DURING REVIEW (not fully discussed):
      [concern description]
      Raised by: [agent]
      Recommended action: [schedule a focused follow-up consultation on this topic]"
  4. The new concern NEVER becomes a recommendation in the current consultation
     without cross-examination (Rounds 1-2). This prevents unchallenged advice.

# Exception
if the new concern is a SAFETY flag (severity: "red"):
  - It IS included immediately with maximum prominence
  - Marked as: "URGENT — NOT YET CROSS-EXAMINED. Seek immediate professional review."
  - The safety override trumps the process rule.
```

#### Edge Case 2: False Consensus (All Agree, Weak Evidence)

```
FUNCTION detect_false_consensus(round_outputs):
  """
  All agents agree, but is the evidence actually strong?
  """
  
  agreements = extract_all_agreements(round_outputs)
  
  for agreement in agreements:
    # Check: are agents all citing the SAME evidence source?
    unique_sources = count_unique_evidence_sources(agreement)
    total_agents_agreeing = len(agreement.agreeing_agents)
    
    # Flag 1: Echo chamber — everyone cites the same 1-2 papers
    if unique_sources <= 2 AND total_agents_agreeing >= 3:
      agreement.flag = "POSSIBLE_ECHO_CHAMBER"
      agreement.note = "All specialists agree, but cite overlapping evidence. The evidence base may be narrower than the consensus suggests."
    
    # Flag 2: Confidence inflation — average confidence > evidence quality warrants
    evidence_quality_scores = { "strong": 0.9, "moderate": 0.7, "weak": 0.4, "extrapolated": 0.3 }
    max_warranted_confidence = max(evidence_quality_scores[a.evidence_quality] for a in agreement.supporting_analyses)
    average_stated_confidence = mean(a.confidence for a in agreement.supporting_analyses)
    
    if average_stated_confidence > max_warranted_confidence + 0.15:
      agreement.flag = "CONFIDENCE_EXCEEDS_EVIDENCE"
      agreement.note = f"Specialists express {average_stated_confidence:.0%} confidence but the strongest evidence cited is '{best_evidence_quality}' quality. Actual certainty is lower than stated."
    
    # Flag 3: No dissent when dissent is expected
    # Maintain a "typical disagreement rate" per topic category from historical data
    expected_disagreement_rate = historical_disagreement_rate(agreement.topic_category)
    if expected_disagreement_rate > 0.30 AND len(agreement.disagreements) == 0:
      agreement.flag = "SUSPICIOUS_UNANIMITY"
      agreement.note = "This topic typically generates specialist disagreement. Unanimous agreement may reflect shared training bias rather than genuine consensus."
  
  # Mitigation: inject a "devil's advocate" pass
  if any agreement has flag in ["POSSIBLE_ECHO_CHAMBER", "SUSPICIOUS_UNANIMITY"]:
    trigger_devils_advocate_pass(agreement)
    # A single agent is re-prompted with:
    # "All specialists agreed on [X]. Your job is to find the strongest 
    #  counter-argument. What could go wrong? What are they all missing? 
    #  Cite evidence against the consensus position."


FUNCTION trigger_devils_advocate_pass(agreement):
  prompt = f"""
  DEVIL'S ADVOCATE ASSIGNMENT
  
  The panel unanimously recommends: {agreement.recommendation}
  Evidence cited: {agreement.evidence_summary}
  
  Your task: construct the STRONGEST possible counter-argument.
  - What published evidence contradicts this recommendation?
  - What patient-specific factors could make this recommendation harmful?
  - What assumptions are the panel making that might be wrong?
  - What would a skeptical specialist say?
  
  If you genuinely cannot find a meaningful counter-argument after rigorous 
  analysis, say so explicitly. Do not manufacture false objections.
  
  Token limit: 800
  """
  
  output = call_agent(
    model="claude-sonnet-4",  # Cost-efficient for this check
    prompt=prompt,
    role="devil_advocate"
  )
  
  # Include in synthesis regardless of content
  synthesis.add_section("CONSENSUS CHECK", output)
```

#### Edge Case 3: Cross-Domain Harm (Cardiology vs Endocrine Conflict)

```
FUNCTION detect_cross_domain_harm(all_recommendations):
  """
  Detects when Specialist A's recommendation would negatively impact 
  Specialist B's domain.
  """
  
  # Pre-built interaction matrix (static, clinically validated)
  KNOWN_INTERACTION_PAIRS = {
    ("statin", "testosterone"): {
      "mechanism": "Statins can reduce testosterone synthesis via HMG-CoA reductase inhibition in Leydig cells",
      "severity": "mild_to_moderate",
      "evidence": "Corona et al. 2010 meta-analysis",
      "monitoring": "Recheck total T and free T at 3 months post-statin initiation"
    },
    ("beta_blocker", "exercise_performance"): {
      "mechanism": "Beta-blockers cap heart rate, reducing VO2max and exercise capacity",
      "severity": "moderate",
      "evidence": "Well-established pharmacology",
      "monitoring": "Assess exercise tolerance subjectively at 2 weeks"
    },
    ("ssri", "testosterone"): {
      "mechanism": "SSRIs can increase prolactin, suppress GnRH, reduce testosterone",
      "severity": "moderate",
      "evidence": "Safarinejad 2008",
      "monitoring": "Prolactin level at 6 weeks"
    },
    ("corticosteroid", "blood_glucose"): {
      "mechanism": "Corticosteroids directly induce insulin resistance",
      "severity": "moderate_to_severe",
      "monitoring": "Fasting glucose and HbA1c"
    },
    # ... comprehensive matrix of 50+ known pairs
  }
  
  # Step 1: Extract all recommended substances/actions
  rec_substances = []
  for agent in all_recommendations:
    for rec in agent.recommendations:
      substances = extract_substances(rec)  # NLP extraction of drug/supplement names
      rec_substances.append({
        "agent": agent.agent_id,
        "rec_id": rec.id,
        "substances": substances,
        "actions": extract_actions(rec)  # "increase", "decrease", "initiate", "discontinue"
      })
  
  # Step 2: Check all pairs against interaction matrix
  conflicts = []
  for i, j in all_pairs(rec_substances):
    if i.agent == j.agent:
      continue  # Same agent; they should handle their own interactions
    
    for sub_a in i.substances:
      for sub_b in j.substances:
        key = normalize_interaction_key(sub_a, sub_b)
        if key in KNOWN_INTERACTION_PAIRS:
          interaction = KNOWN_INTERACTION_PAIRS[key]
          conflicts.append({
            "rec_a": { "agent": i.agent, "rec_id": i.rec_id, "substance": sub_a },
            "rec_b": { "agent": j.agent, "rec_id": j.rec_id, "substance": sub_b },
            "interaction": interaction,
            "resolution_required": interaction.severity in ["moderate", "moderate_to_severe", "severe"]
          })
  
  # Step 3: For detected conflicts, inject into Round 2 prompts
  for conflict in conflicts:
    inject_into_round_2(conflict.rec_a.agent, conflict)
    inject_into_round_2(conflict.rec_b.agent, conflict)
    # Both agents must address this in their Round 2 output
  
  # Step 4: If conflict remains after Round 2, escalate in synthesis
  # The synthesis MUST present both sides and a decision framework
  
  return conflicts
```

#### Edge Case 4: Contradictory or Suspicious Patient Data

```
FUNCTION validate_patient_data(profile) -> { valid: bool, anomalies: [], action: str }:
  """
  Checks for biologically implausible or internally contradictory data.
  Runs BEFORE any agent receives the evidence package.
  """
  
  anomalies = []
  
  # Rule 1: Biological plausibility checks
  PLAUSIBILITY_RANGES = {
    # Absolute limits — outside these is likely data entry error
    "testosterone_nmol": { "male_min": 0.3, "male_max": 150, "female_min": 0.1, "female_max": 10 },
    "glucose_mmol":      { "min": 1.0, "max": 40.0 },
    "potassium_mmol":    { "min": 1.5, "max": 8.0 },
    "sodium_mmol":       { "min": 110, "max": 170 },
    "creatinine_umol":   { "min": 10, "max": 2000 },
    "tsh_miu":           { "min": 0.01, "max": 100 },
    "heart_rate_bpm":    { "min": 25, "max": 250 },
    "systolic_bp":       { "min": 60, "max": 280 },
    "bmi":               { "min": 10, "max": 70 },
  }
  
  for lab in profile.lab_results:
    key = normalize_lab_name(lab.test_name)
    if key in PLAUSIBILITY_RANGES:
      range = PLAUSIBILITY_RANGES[key]
      if lab.value < range.min or lab.value > range.max:
        anomalies.append({
          "type": "biologically_implausible",
          "field": lab.test_name,
          "value": lab.value,
          "plausible_range": range,
          "severity": "critical",
          "action": "BLOCK — request user verify this value"
        })
  
  # Rule 2: Internal consistency checks
  CONSISTENCY_RULES = [
    {
      "name": "lh_suppressed_but_no_exogenous_t",
      "check": lambda p: p.lh < 0.5 and "testosterone" not in [m.name.lower() for m in p.medications],
      "anomaly": "LH is suppressed but no exogenous testosterone reported. Either a medication is missing or the LH value is incorrect."
    },
    {
      "name": "high_hematocrit_no_trt",
      "check": lambda p: p.hematocrit > 54 and "testosterone" not in [m.name.lower() for m in p.medications],
      "anomaly": "Elevated hematocrit without TRT — investigate polycythemia vera or dehydration."
    },
    {
      "name": "contradictory_thyroid",
      "check": lambda p: p.tsh < 0.1 and p.free_t4 < 10,
      "anomaly": "TSH suppressed but free T4 low — contradicts typical thyroid patterns. Possible central hypothyroidism or lab error."
    },
    {
      "name": "impossible_lipid_math",
      "check": lambda p: abs(p.total_cholesterol - (p.ldl + p.hdl + p.triglycerides/2.2)) > 20,
      "anomaly": "Friedewald equation mismatch — total cholesterol does not equal LDL + HDL + TG/2.2. Possible direct LDL measurement or lab error."
    },
    {
      "name": "age_medication_mismatch",
      "check": lambda p: p.age < 25 and any(m.name in GERIATRIC_MEDS for m in p.medications),
      "anomaly": "Patient is under 25 but on medications typically prescribed for older adults. Verify accuracy."
    }
  ]
  
  for rule in CONSISTENCY_RULES:
    try:
      if rule.check(profile):
        anomalies.append({
          "type": "internal_inconsistency",
          "rule": rule.name,
          "description": rule.anomaly,
          "severity": "warning"
        })
    except (KeyError, AttributeError):
      pass  # Missing field; handled by completeness scoring
  
  # Rule 3: Temporal consistency
  for lab_name, readings in group_by_test(profile.lab_results).items():
    if len(readings) >= 2:
      sorted_readings = sort_by_date(readings)
      for i in range(1, len(sorted_readings)):
        prev = sorted_readings[i-1]
        curr = sorted_readings[i]
        pct_change = abs(curr.value - prev.value) / prev.value
        days_apart = (curr.date - prev.date).days
        
        # Flag changes that are physiologically unlikely in the timeframe
        MAX_CHANGE_PER_DAY = {
          "testosterone_nmol": 0.05,  # 5% per day max without intervention change
          "hba1c_pct": 0.003,         # ~0.3% per 100 days
          "creatinine_umol": 0.02,
        }
        
        expected_key = normalize_lab_name(lab_name)
        if expected_key in MAX_CHANGE_PER_DAY:
          max_expected_change = MAX_CHANGE_PER_DAY[expected_key] * days_apart
          if pct_change > max_expected_change * 3:  # 3x the expected rate
            anomalies.append({
              "type": "temporal_anomaly",
              "field": lab_name,
              "from": { "value": prev.value, "date": prev.date },
              "to": { "value": curr.value, "date": curr.date },
              "change_pct": pct_change,
              "expected_max_change": max_expected_change,
              "severity": "warning",
              "action": "Flag to agents — rapid change may indicate measurement error or acute event"
            })
  
  # Decision
  critical_anomalies = [a for a in anomalies if a.severity == "critical"]
  
  if len(critical_anomalies) > 0:
    return { 
      "valid": false, 
      "anomalies": anomalies, 
      "action": "BLOCK_AND_QUERY_USER",
      "user_message": f"We found {len(critical_anomalies)} value(s) that appear to be data entry errors. Please verify: {[a.field for a in critical_anomalies]}"
    }
  elif len(anomalies) > 0:
    return {
      "valid": true,  # Proceed but with warnings injected
      "anomalies": anomalies,
      "action": "PROCEED_WITH_WARNINGS",
      "agent_injection": f"DATA QUALITY WARNINGS: The following anomalies were detected in patient data. Factor these into your confidence levels.\n{format_anomalies(anomalies)}"
    }
  else:
    return { "valid": true, "anomalies": [], "action": "PROCEED" }
```

---

## 2. OUTCOME TRACKING SYSTEM DESIGN

### 2a. What to Track

#### Core Tracking Schema

```sql
-- Consultation record
CREATE TABLE consultations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  consultation_type VARCHAR(50) NOT NULL,  -- optimization, differential, etc.
  specialists       JSONB NOT NULL,        -- Array of specialist types involved
  total_rounds      INT NOT NULL,
  consensus_reached BOOLEAN NOT NULL,
  total_cost_usd    DECIMAL(8,4),
  profile_completeness_score DECIMAL(3,2),
  value_added_score DECIMAL(3,2),
  diversity_score   DECIMAL(3,2),
  full_output       JSONB NOT NULL,        -- Encrypted. Complete discussion output.
  summary_hash      VARCHAR(64)            -- SHA-256 of deterministic components for reproducibility
);

-- Individual recommendations from a consultation
CREATE TABLE recommendations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id   UUID NOT NULL REFERENCES consultations(id),
  agent_id          VARCHAR(100) NOT NULL,
  recommendation_id VARCHAR(50) NOT NULL,   -- R-ENDO-001 etc.
  category          VARCHAR(50) NOT NULL,   -- medication_adjustment, supplement, lifestyle, monitoring, referral
  action_text       TEXT NOT NULL,
  priority          VARCHAR(20) NOT NULL,   -- critical, high, medium, low
  confidence        DECIMAL(3,2) NOT NULL,
  evidence_quality  VARCHAR(20) NOT NULL,   -- strong, moderate, weak, extrapolated
  time_horizon      VARCHAR(100),           -- "4-8 weeks"
  consensus_status  VARCHAR(30) NOT NULL,   -- unanimous, majority, conditional, disputed
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Outcome reports linked to recommendations
CREATE TABLE outcome_reports (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id   UUID NOT NULL REFERENCES recommendations(id),
  user_id             UUID NOT NULL REFERENCES users(id),
  reported_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  days_since_rec      INT NOT NULL,
  
  -- Structured outcome
  adherence           VARCHAR(30) NOT NULL,  -- followed_fully, followed_partially, did_not_follow, chose_alternative
  alternative_chosen  TEXT,                  -- If chose_alternative, what did they do instead?
  
  subjective_outcome  VARCHAR(20) NOT NULL,  -- improved, unchanged, worsened, mixed, unsure
  subjective_detail   TEXT,                  -- Free text: "I feel more energetic but sleep got worse"
  
  severity_if_worsened VARCHAR(20),          -- mild, moderate, severe, emergency
  
  -- Objective outcome (lab results)
  new_lab_results     JSONB,                -- Array of { test_name, value, unit, date }
  
  -- Confounders
  confounders         JSONB,                -- Array of { type, description }
  -- type: medication_change, supplement_change, diet_change, stress_event, 
  --       illness, exercise_change, sleep_change, other
  
  -- Meta
  reporting_method    VARCHAR(20) NOT NULL,  -- prompted, voluntary, lab_auto_import
  confidence_in_report DECIMAL(3,2)         -- User self-rated: how confident are you this outcome is related?
);

-- Follow-up schedule
CREATE TABLE followup_schedule (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id   UUID NOT NULL REFERENCES recommendations(id),
  user_id             UUID NOT NULL REFERENCES users(id),
  scheduled_at        TIMESTAMPTZ NOT NULL,
  followup_type       VARCHAR(30) NOT NULL,  -- subjective_check, lab_recheck, full_review
  prompt_message      TEXT NOT NULL,
  sent_at             TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  snoozed_until       TIMESTAMPTZ,
  attempt_count       INT DEFAULT 0
);

-- Lab result history (for auto-comparison)
CREATE TABLE lab_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id),
  test_name   VARCHAR(100) NOT NULL,
  value       DECIMAL(12,4) NOT NULL,
  unit        VARCHAR(30) NOT NULL,
  reference_low  DECIMAL(12,4),
  reference_high DECIMAL(12,4),
  lab_date    DATE NOT NULL,
  source      VARCHAR(30) NOT NULL,  -- manual_entry, pdf_import, api_import, consultation_input
  consultation_id UUID REFERENCES consultations(id),  -- Which consultation this was part of, if any
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, test_name, lab_date)  -- Prevent duplicate entries
);

-- Aggregate anonymized outcome data (for evidence building)
CREATE TABLE aggregate_outcomes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_hash   VARCHAR(64) NOT NULL,  -- Hashed: category + action normalized
  -- No user_id, no PII
  patient_demographics_bucket JSONB,  -- { age_range: "25-35", sex: "male", bmi_range: "22-27" }
  consultation_type     VARCHAR(50),
  specialist_types      JSONB,
  adherence             VARCHAR(30),
  subjective_outcome    VARCHAR(20),
  lab_delta_pct         JSONB,         -- { test_name: percent_change } anonymized
  days_to_outcome       INT,
  confounders_present   BOOLEAN,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### Time-to-Outcome Tracking Logic

```
FUNCTION schedule_followups(consultation_id, recommendations):
  """
  Creates the follow-up schedule based on recommendation characteristics.
  """
  
  FOLLOWUP_TIMING = {
    "medication_adjustment": [
      { "days": 7,  "type": "subjective_check", "message": "It's been 1 week since your consultation recommended {action}. Quick check: how are you feeling? Any side effects?" },
      { "days": 30, "type": "subjective_check", "message": "1-month check-in on {action}. Has it made a difference?" },
      { "days": 60, "type": "lab_recheck", "message": "Time to recheck labs to see if {action} is working. The key tests to get: {monitoring_tests}" },
    ],
    "supplement": [
      { "days": 14, "type": "subjective_check", "message": "2-week check on {supplement}. Noticing any changes?" },
      { "days": 56, "type": "lab_recheck", "message": "8-week mark — ideal time to recheck {monitoring_tests} to see supplement impact." },
    ],
    "lifestyle": [
      { "days": 14, "type": "subjective_check", "message": "How's the {action} going? Any challenges sticking with it?" },
      { "days": 30, "type": "subjective_check", "message": "1 month of {action}. Feeling different?" },
      { "days": 90, "type": "full_review", "message": "3-month review of {action}. Let's see where things stand." },
    ],
    "monitoring": [
      # Timing extracted from the recommendation's time_horizon field
      { "days": "DYNAMIC", "type": "lab_recheck", "message": "Time for the follow-up labs recommended in your consultation: {monitoring_tests}" },
    ],
    "referral": [
      { "days": 7,  "type": "subjective_check", "message": "Have you scheduled the {referral_type} appointment yet?" },
      { "days": 30, "type": "subjective_check", "message": "Checking in — did you see the {referral_type}? What did they say?" },
    ],
  }
  
  for rec in recommendations:
    schedule = FOLLOWUP_TIMING.get(rec.category, FOLLOWUP_TIMING["lifestyle"])
    for followup in schedule:
      days = followup["days"]
      if days == "DYNAMIC":
        days = parse_time_horizon(rec.time_horizon)  # "4-8 weeks" → 42 days (midpoint)
      
      message = followup["message"].format(
        action=rec.action_text,
        supplement=rec.action_text,
        monitoring_tests=rec.monitoring_plan or "the tests your specialist recommended",
        referral_type=rec.action_text
      )
      
      INSERT INTO followup_schedule (
        recommendation_id=rec.id,
        user_id=rec.user_id,
        scheduled_at=now() + interval(days, "days"),
        followup_type=followup["type"],
        prompt_message=message
      )
```

### 2b. Outcome Reporting UX

#### When to Prompt

```
NOTIFICATION_POLICY = {
  # Maximum prompts per week across all active recommendations
  "max_prompts_per_week": 2,
  
  # If user has multiple active recommendations, batch them
  "batch_same_day_followups": true,
  
  # Never prompt on weekends unless urgent
  "weekend_prompts": false,
  
  # Snooze behavior
  "max_snoozes_per_followup": 3,
  "snooze_duration_days": 7,
  
  # Abandon threshold: stop asking after this many ignored prompts
  "abandon_after_ignored": 3,
  "abandoned_note": "We stopped checking in on this recommendation. You can always report back anytime from your consultation history."
}

FUNCTION select_next_prompt(user_id):
  """
  Picks the most valuable follow-up to prompt for.
  Respects fatigue limits.
  """
  
  prompts_this_week = count_prompts_sent(user_id, last_7_days)
  if prompts_this_week >= NOTIFICATION_POLICY["max_prompts_per_week"]:
    return null  # Don't over-prompt
  
  candidates = get_due_followups(user_id)
    .filter(attempt_count < max_snoozes + 1)
    .filter(not_completed)
    .order_by(
      # Priority: critical recs first, then by overdue-ness
      priority_score(rec.priority) DESC,
      days_overdue DESC
    )
  
  if len(candidates) == 0:
    return null
  
  # Batch: grab up to 3 followups due within 3 days of each other
  batch = [candidates[0]]
  for c in candidates[1:]:
    if abs((c.scheduled_at - candidates[0].scheduled_at).days) <= 3 and len(batch) < 3:
      batch.append(c)
  
  return batch
```

#### Reporting Interface Design

```
OUTCOME_REPORT_FLOW = {
  "step_1_adherence": {
    "question": "For '{recommendation_text}', what did you do?",
    "options": [
      { "value": "followed_fully",    "label": "Followed it as recommended" },
      { "value": "followed_partially", "label": "Followed it partially" },
      { "value": "did_not_follow",     "label": "Didn't follow this one" },
      { "value": "chose_alternative",  "label": "Did something different instead" },
    ],
    "follow_up_if": {
      "chose_alternative": { "type": "text", "prompt": "What did you do instead?" },
      "did_not_follow": { "type": "text", "prompt": "Any reason? (optional)", "optional": true },
    }
  },
  
  "step_2_subjective": {
    "question": "How's it going in this area?",
    "options": [
      { "value": "improved", "label": "Better",     "emoji_allowed": "thumbs_up" },
      { "value": "unchanged","label": "About the same", "emoji_allowed": "neutral" },
      { "value": "worsened", "label": "Worse",      "emoji_allowed": "thumbs_down" },
      { "value": "mixed",    "label": "Mixed — some better, some worse" },
      { "value": "unsure",   "label": "Not sure yet" },
    ],
    "follow_up_if": {
      "worsened": { 
        "type": "severity_select", 
        "prompt": "How much worse?",
        "options": ["Mildly — noticeable but manageable", "Moderately — affecting daily life", "Severely — please see a doctor if you haven't"]
      },
      "mixed": { "type": "text", "prompt": "What improved and what didn't?" },
    },
    "optional_detail": { "type": "text", "prompt": "Anything else to note? (optional)" }
  },
  
  "step_3_confounders": {
    "question": "Did anything else change recently? (helps us understand what's actually causing changes)",
    "type": "multi_select",
    "options": [
      { "value": "medication_change",  "label": "Changed a medication" },
      { "value": "supplement_change",  "label": "Changed a supplement" },
      { "value": "diet_change",        "label": "Changed diet significantly" },
      { "value": "exercise_change",    "label": "Changed exercise routine" },
      { "value": "sleep_change",       "label": "Sleep pattern changed" },
      { "value": "stress_event",       "label": "Major stress event" },
      { "value": "illness",            "label": "Got sick" },
      { "value": "nothing_changed",    "label": "Nothing else changed" },
    ],
    "follow_up_for_each": { "type": "text", "prompt": "Brief detail:" }
  },
  
  "step_4_labs": {
    "condition": "followup_type == 'lab_recheck'",
    "question": "Got new lab results?",
    "options": [
      { 
        "value": "yes_manual", 
        "label": "Yes — I'll enter them",
        "follow_up": "lab_entry_form"  # Pre-populated with expected tests from monitoring_plan
      },
      { 
        "value": "yes_upload", 
        "label": "Yes — upload PDF",
        "follow_up": "pdf_upload"  # OCR extraction pipeline
      },
      { "value": "not_yet", "label": "Haven't gotten them yet" },
      { "value": "skipped",  "label": "Decided not to get these labs" },
    ]
  }
}

# Total interaction time target: under 90 seconds for a basic report
# Under 3 minutes if entering lab values
```

#### Lab Auto-Comparison

```
FUNCTION auto_compare_labs(user_id, new_results, consultation_id):
  """
  When new labs are entered, automatically compare to pre-consultation values.
  """
  
  comparison = []
  
  for new_lab in new_results:
    # Find the most recent prior value for this test
    prior = query(
      "SELECT * FROM lab_history WHERE user_id = ? AND test_name = ? AND lab_date < ? ORDER BY lab_date DESC LIMIT 1",
      user_id, normalize_lab_name(new_lab.test_name), new_lab.date
    )
    
    if prior:
      delta = new_lab.value - prior.value
      delta_pct = (delta / prior.value) * 100
      
      # Determine if change is clinically meaningful
      CLINICALLY_MEANINGFUL_CHANGE = {
        "ldl_cholesterol": 10,   # % change
        "hdl_cholesterol": 10,
        "testosterone":    15,
        "hba1c":          5,
        "tsh":            20,
        "vitamin_d":      15,
        "ferritin":       20,
        "shbg":           15,
        "estradiol":      20,
        "creatinine":     15,
        "alt":            25,
        "ast":            25,
      }
      
      threshold = CLINICALLY_MEANINGFUL_CHANGE.get(normalize_lab_name(new_lab.test_name), 15)
      
      comparison.append({
        "test": new_lab.test_name,
        "before": { "value": prior.value, "date": prior.lab_date, "flag": prior.flag },
        "after":  { "value": new_lab.value, "date": new_lab.date, "flag": compute_flag(new_lab) },
        "delta": delta,
        "delta_pct": round(delta_pct, 1),
        "direction": "improved" if is_improvement(new_lab.test_name, delta) else "worsened" if abs(delta_pct) > threshold else "stable",
        "clinically_meaningful": abs(delta_pct) > threshold,
        "days_between": (new_lab.date - prior.lab_date).days
      })
    else:
      comparison.append({
        "test": new_lab.test_name,
        "before": null,
        "after": { "value": new_lab.value, "date": new_lab.date },
        "note": "No prior value for comparison — this is now your baseline"
      })
  
  # Store new values in lab_history
  for new_lab in new_results:
    UPSERT INTO lab_history (user_id, test_name, value, unit, lab_date, source, consultation_id)
    VALUES (user_id, new_lab.test_name, new_lab.value, new_lab.unit, new_lab.date, "outcome_report", consultation_id)
  
  return {
    "comparison": comparison,
    "summary": generate_comparison_summary(comparison),
    # e.g., "LDL improved from 135 to 118 (-12.6%, clinically meaningful). 
    #        SHBG unchanged at 18 (was 17). Estradiol improved from 42 to 35."
    "linked_recommendations": match_labs_to_recommendations(comparison, consultation_id)
    # Maps each lab change to the recommendation that targeted it
  }
```

### 2c. Feedback Loop Architecture

#### How Outcome Data Improves Future Consultations

```
FUNCTION build_outcome_context(user_id, new_consultation):
  """
  When a user starts a new consultation, inject relevant historical outcomes.
  """
  
  # Gather past consultation outcomes for this user
  past_outcomes = query("""
    SELECT r.category, r.action_text, r.evidence_quality, r.confidence,
           o.adherence, o.subjective_outcome, o.new_lab_results, o.confounders,
           o.days_since_rec
    FROM recommendations r
    JOIN outcome_reports o ON o.recommendation_id = r.id
    WHERE r.consultation_id IN (
      SELECT id FROM consultations WHERE user_id = ?
    )
    ORDER BY o.reported_at DESC
    LIMIT 20
  """, user_id)
  
  # Build outcome context for agents
  outcome_context = {
    "prior_consultations_count": count_consultations(user_id),
    
    "what_worked": [
      format_outcome(o) for o in past_outcomes 
      if o.adherence == "followed_fully" and o.subjective_outcome == "improved"
    ],
    
    "what_didnt_work": [
      format_outcome(o) for o in past_outcomes
      if o.adherence == "followed_fully" and o.subjective_outcome in ("unchanged", "worsened")
    ],
    
    "not_followed": [
      format_outcome(o) for o in past_outcomes
      if o.adherence in ("did_not_follow", "chose_alternative")
    ],
    
    "lab_trends": get_lab_trends(user_id, last_n_months=6),
    # Shows trajectory for each tracked lab value
  }
  
  # Inject as shared context in evidence package
  # Agent prompt injection:
  HISTORY_PROMPT = """
  PATIENT HISTORY WITH THIS SYSTEM:
  
  Previously tried and WORKED:
  {what_worked}
  
  Previously tried and DID NOT WORK:
  {what_didnt_work}
  → Do NOT re-recommend these without explaining why this time would be different.
  
  Previously recommended but patient DID NOT FOLLOW:
  {not_followed}
  → Consider why. If recommending again, address likely barriers.
  
  Lab trends (last 6 months):
  {lab_trends}
  """
  
  return outcome_context
```

#### Systematic Error Detection

```
FUNCTION detect_systematic_errors():
  """
  Runs periodically (weekly). Identifies patterns where the system 
  consistently gets it wrong.
  """
  
  analyses = []
  
  # Analysis 1: Recommendation category outcomes
  category_outcomes = query("""
    SELECT r.category, 
           COUNT(*) as total,
           SUM(CASE WHEN o.subjective_outcome = 'improved' THEN 1 ELSE 0 END) as improved,
           SUM(CASE WHEN o.subjective_outcome = 'worsened' THEN 1 ELSE 0 END) as worsened,
           SUM(CASE WHEN o.subjective_outcome = 'unchanged' THEN 1 ELSE 0 END) as unchanged,
           AVG(r.confidence) as avg_confidence
    FROM recommendations r
    JOIN outcome_reports o ON o.recommendation_id = r.id
    WHERE o.adherence = 'followed_fully'  -- Only count recs that were actually followed
    GROUP BY r.category
    HAVING COUNT(*) >= 20  -- Minimum sample size
  """)
  
  for cat in category_outcomes:
    worsened_rate = cat.worsened / cat.total
    improved_rate = cat.improved / cat.total
    
    # Flag: high worsening rate
    if worsened_rate > 0.15:
      analyses.append({
        "type": "high_worsening_rate",
        "category": cat.category,
        "rate": worsened_rate,
        "action": f"Review {cat.category} recommendations — {worsened_rate:.0%} of followed recommendations led to worsening."
      })
    
    # Flag: confidence-outcome mismatch
    # High confidence recommendations should have higher improvement rates
    if cat.avg_confidence > 0.80 and improved_rate < 0.50:
      analyses.append({
        "type": "overconfident_category",
        "category": cat.category,
        "avg_confidence": cat.avg_confidence,
        "actual_improvement_rate": improved_rate,
        "action": f"System is overconfident in {cat.category} recommendations. Avg confidence: {cat.avg_confidence:.0%}, actual improvement: {improved_rate:.0%}. Recalibrate."
      })
  
  # Analysis 2: Specialist-level accuracy
  specialist_outcomes = query("""
    SELECT r.agent_id,
           COUNT(*) as total,
           SUM(CASE WHEN o.subjective_outcome = 'improved' THEN 1 ELSE 0 END)::float / COUNT(*) as improvement_rate,
           AVG(r.confidence) as avg_confidence
    FROM recommendations r
    JOIN outcome_reports o ON o.recommendation_id = r.id
    WHERE o.adherence = 'followed_fully'
    GROUP BY r.agent_id
    HAVING COUNT(*) >= 15
  """)
  
  for spec in specialist_outcomes:
    # Flag: one specialist consistently underperforms
    if spec.improvement_rate < 0.40:
      analyses.append({
        "type": "underperforming_specialist",
        "agent": spec.agent_id,
        "improvement_rate": spec.improvement_rate,
        "action": f"{spec.agent_id} recommendations improve outcomes only {spec.improvement_rate:.0%} of the time. Review system prompt, evidence base, or consider model upgrade."
      })
  
  # Analysis 3: Specific recommendation pattern failures
  # Uses normalized recommendation text to cluster similar recs
  rec_clusters = cluster_recommendations_by_similarity(min_cluster_size=10)
  
  for cluster in rec_clusters:
    outcomes = get_outcomes_for_cluster(cluster)
    if outcomes.worsened_rate > 0.20:
      analyses.append({
        "type": "specific_recommendation_failure_pattern",
        "recommendation_pattern": cluster.representative_text,
        "sample_size": cluster.size,
        "worsened_rate": outcomes.worsened_rate,
        "action": f"Recommendations like '{cluster.representative_text}' lead to worsening {outcomes.worsened_rate:.0%} of the time. Add to negative evidence base."
      })
  
  # Action: feed findings back into system prompts
  for analysis in analyses:
    if analysis["type"] == "specific_recommendation_failure_pattern":
      # Add to a "lessons learned" context that all agents receive
      append_to_lessons_learned({
        "category": "avoid_or_caution",
        "pattern": analysis["recommendation_pattern"],
        "evidence": f"Internal outcome data: {analysis['worsened_rate']:.0%} worsening rate across {analysis['sample_size']} cases",
        "instruction": "If considering this recommendation, you MUST acknowledge the historical poor outcomes and explain why this case is different."
      })
  
  return analyses
```

#### Privacy Considerations

```
PRIVACY_ARCHITECTURE = {
  "data_tiers": {
    "tier_1_individual": {
      "description": "Full patient data — linked to user",
      "stored_where": "Encrypted at rest (AES-256). User's own account only.",
      "who_sees_it": "The user, their chosen agents during consultation",
      "retention": "Until user deletes account. User can export/delete anytime.",
      "encryption": "Row-level encryption. Decryption key derived from user auth.",
    },
    
    "tier_2_anonymized": {
      "description": "Outcome data stripped of all PII for evidence building",
      "transformation": [
        "Remove user_id, replace with random UUID per analysis run",
        "Age → 5-year bucket (25-29, 30-34, ...)",
        "Exact lab values → percentile ranges",
        "Free text → removed entirely (only structured fields kept)",
        "Dates → relative (day 0, day 30, day 60) not absolute",
        "Medications → kept (not PII) but rare combinations suppressed if <5 users",
      ],
      "stored_where": "Separate anonymized database. No join path back to tier 1.",
      "who_sees_it": "Aggregate analytics only. No individual record access.",
      "k_anonymity": "k >= 5. If a demographic bucket has <5 users, suppress it.",
    },
    
    "tier_3_aggregate": {
      "description": "Statistical summaries only",
      "examples": [
        "Mean improvement rate for supplement category X: 62%",
        "Specialist disagreement rate for topic Y: 34%",
      ],
      "no_individual_records": true,
    }
  },
  
  "user_controls": {
    "opt_out_outcome_tracking": true,     # User can disable all follow-ups
    "opt_out_anonymized_sharing": true,    # User can exclude from aggregate data
    "export_all_data": true,              # GDPR-compliant export
    "delete_all_data": true,              # GDPR-compliant deletion
    "view_what_was_shared": true,         # Transparency: show what went to tier 2
  },
  
  "technical_controls": {
    "no_llm_training": "Outcome data is NEVER used for model fine-tuning without explicit separate consent. Default: no.",
    "no_third_party": "Tier 1 and Tier 2 data never shared with third parties.",
    "audit_log": "All access to tier 1 data logged with accessor identity and purpose.",
    "breach_protocol": "If encryption compromised → notify affected users within 72 hours.",
  }
}
```

### 2d. Validation Framework

#### Key Metrics Dashboard

```
METRICS_SCHEMA = {
  "user_satisfaction": {
    "measurement": "Post-consultation rating (1-5) + optional free text",
    "when": "Immediately after receiving synthesis, and again at 30 days",
    "targets": {
      "immediate_satisfaction": ">= 4.0 average",
      "30_day_satisfaction": ">= 3.8 average",
      "30_day_would_use_again": ">= 80%"
    }
  },
  
  "clinical_accuracy": {
    "measurement": "Quarterly spot-check by board-certified physicians",
    "method": """
      1. Random sample of 50 consultations per quarter
      2. Blinded review by 2 independent physicians
      3. Each physician rates on:
         a) Factual accuracy of stated evidence (0-10)
         b) Appropriateness of recommendations for the case (0-10)
         c) Safety — any recommendations that could cause harm? (binary + severity)
         d) Completeness — did the system miss anything important? (0-10)
         e) Overall grade: A (excellent) / B (good) / C (adequate) / D (concerning) / F (dangerous)
      4. Inter-rater reliability measured (Cohen's kappa >= 0.70 required)
    """,
    "targets": {
      "factual_accuracy": ">= 8.0/10",
      "recommendation_appropriateness": ">= 7.5/10",
      "safety_events": "0 grade-F consultations per quarter",
      "completeness": ">= 7.0/10",
      "grade_distribution": ">= 80% A or B"
    }
  },
  
  "safety_events": {
    "measurement": "User-reported worsening with severity >= moderate",
    "tracking": "Real-time. Any severe worsening triggers immediate review.",
    "targets": {
      "severe_worsening_rate": "< 1% of followed recommendations",
      "moderate_worsening_rate": "< 5% of followed recommendations",
      "time_to_review": "< 24 hours for any reported severe worsening"
    },
    "escalation": {
      "severe": "Automated flag → human clinical review within 24h → user contacted",
      "pattern": "If same recommendation pattern causes 3+ moderate worsenings, auto-suspend that recommendation pattern pending review"
    }
  },
  
  "outcome_improvement_rate": {
    "measurement": "% of followed recommendations leading to 'improved' outcome",
    "baseline": "First 3 months of operation (expected: ~50%)",
    "targets": {
      "6_month": ">= 55%",
      "12_month": ">= 60%",
      "improvement_from_feedback_loop": ">= 5% improvement per year from outcome-driven refinement"
    }
  },
  
  "multi_agent_value": {
    "measurement": "Value-added score from section 1c",
    "target": ">= 1.15 (multi-agent adds at least 15% more value than single agent)"
  }
}
```

#### A/B Testing Framework

```
AB_TEST_FRAMEWORK = {
  "test_definitions": [
    {
      "test_id": "single_vs_multi",
      "hypothesis": "Multi-agent consultation produces better outcomes than single top-tier agent",
      "arms": {
        "control": {
          "description": "Single claude-opus-4-6 agent with generalist prompt covering all specialties",
          "cost_per_consultation": "~$0.50"
        },
        "treatment": {
          "description": "Full multi-agent protocol (3-5 specialists, up to 3 rounds)",
          "cost_per_consultation": "~$3.00"
        }
      },
      "primary_metric": "outcome_improvement_rate at 60 days",
      "secondary_metrics": [
        "user_satisfaction_immediate",
        "number_of_unique_findings",
        "cross_domain_risks_identified",
        "clinical_accuracy_spot_check"
      ],
      "sample_size": "200 per arm (power analysis: 80% power to detect 10% improvement rate difference, alpha=0.05)",
      "randomization": "User-level (not consultation-level, to avoid within-user contamination)",
      "stratification": ["consultation_type", "profile_completeness_bucket"],
      "duration": "3 months enrollment + 2 months follow-up",
      "stopping_rules": {
        "futility": "If p > 0.90 for no difference at interim analysis (50% enrollment), stop",
        "safety": "If treatment arm shows >2x worsening rate, stop immediately",
        "efficacy": "If p < 0.001 at interim, can stop early for overwhelming efficacy"
      }
    },
    
    {
      "test_id": "specialist_count",
      "hypothesis": "4-5 specialists adds value over 2-3 specialists",
      "arms": {
        "lean": { "description": "2 specialists (internist + primary domain)", "cost": "~$1.50" },
        "full": { "description": "4-5 specialists (full protocol)", "cost": "~$3.00" }
      },
      "primary_metric": "cross_domain_risks_identified",
      "sample_size": "150 per arm",
    },
    
    {
      "test_id": "round_count",
      "hypothesis": "Rounds 2-3 add meaningful value over Round 1 alone",
      "arms": {
        "one_round":   { "description": "Round 1 only, then synthesize" },
        "two_rounds":  { "description": "Rounds 1-2, then synthesize" },
        "three_rounds": { "description": "Full Rounds 1-3" }
      },
      "primary_metric": "information_gain_per_round",
      "secondary_metric": "outcome_improvement_rate",
      "sample_size": "100 per arm",
    }
  ],
  
  "gold_standard_comparison": {
    "method": """
    Quarterly: take 20 anonymized cases and present them to:
    1. Our multi-agent system
    2. A real panel of 3 board-certified physicians (different specialties)
    3. A single senior physician (generalist)
    
    Blinded evaluation by a separate physician panel rates all three outputs on:
    - Accuracy, completeness, safety, actionability
    
    This gives us:
    - Multi-agent vs real panel (target: within 15% on all metrics)
    - Multi-agent vs single physician (target: exceed on completeness and cross-domain)
    - Real panel vs single physician (calibration benchmark)
    """,
    "cost": "~$2000/quarter for physician panel compensation",
    "frequency": "Quarterly for first year, then semi-annually"
  }
}
```

---

## 3. REPRODUCIBILITY SOLUTION

### What Must Be Deterministic

```
REPRODUCIBILITY_TIERS = {
  "tier_1_deterministic": {
    "description": "Must produce IDENTICAL output every run",
    "components": [
      "specialist_selection",          # Same case → same specialists every time
      "evidence_package_assembly",     # Same profile → same package
      "patient_data_validation",       # Same data → same anomaly flags
      "completeness_scoring",          # Same profile → same score
      "cross_domain_harm_detection",   # Same recommendations → same conflict flags
      "budget_calculations",           # Same usage → same remaining budget
      "followup_scheduling",           # Same recommendations → same schedule
      "lab_comparison",                # Same values → same deltas
    ],
    "how": "Pure functions. No LLM calls. No randomness. Unit tested with frozen inputs."
  },
  
  "tier_2_structurally_stable": {
    "description": "Must agree on structure and key conclusions; wording may vary",
    "components": [
      "agent_findings",                # Same labs → same findings (maybe different phrasing)
      "agent_recommendations",         # Same case → same set of recommendations
      "evidence_citations",            # Same claim → cites same key studies
      "confidence_scores",             # Same evidence → confidence within ±0.10
      "risk_flag_severity",            # Same risk → same severity level
      "consensus_status",              # Same discussion → same consensus/disagreement classification
    ],
    "acceptable_variation": "defined below"
  },
  
  "tier_3_naturally_variable": {
    "description": "Expected to differ; this is fine",
    "components": [
      "prose_wording",                 # "LDL is elevated" vs "LDL exceeds optimal range"
      "explanation_depth",             # May elaborate more or less
      "analogy_choices",               # Different illustrative examples
      "recommendation_ordering",       # Sequence may differ (priority level stays the same)
      "cross_examination_tone",        # How forcefully an agent disagrees
    ],
    "no_control_needed": true
  }
}
```

### Defining "Acceptably Similar"

```
FUNCTION are_outputs_acceptably_similar(output_a, output_b) -> { similar: bool, report: {} }:
  """
  Compares two outputs from the same case run twice.
  Returns whether they are acceptably similar.
  """
  
  checks = []
  
  # Check 1: Same set of findings (by topic, not by exact text)
  findings_a = set(normalize_finding_topic(f) for f in output_a.findings)
  findings_b = set(normalize_finding_topic(f) for f in output_b.findings)
  finding_jaccard = len(findings_a & findings_b) / len(findings_a | findings_b)
  checks.append({
    "dimension": "findings_overlap",
    "value": finding_jaccard,
    "threshold": 0.80,
    "pass": finding_jaccard >= 0.80
  })
  
  # Check 2: Same set of recommendations (by action category + target)
  recs_a = set(normalize_rec(r) for r in output_a.recommendations)
  recs_b = set(normalize_rec(r) for r in output_b.recommendations)
  rec_jaccard = len(recs_a & recs_b) / len(recs_a | recs_b)
  checks.append({
    "dimension": "recommendations_overlap",
    "value": rec_jaccard,
    "threshold": 0.75,
    "pass": rec_jaccard >= 0.75
  })
  
  # Check 3: Confidence scores within tolerance
  matched_recs = match_recommendations(output_a.recommendations, output_b.recommendations)
  confidence_deltas = [abs(a.confidence - b.confidence) for a, b in matched_recs]
  max_confidence_delta = max(confidence_deltas) if confidence_deltas else 0
  avg_confidence_delta = mean(confidence_deltas) if confidence_deltas else 0
  checks.append({
    "dimension": "confidence_stability",
    "max_delta": max_confidence_delta,
    "avg_delta": avg_confidence_delta,
    "threshold_max": 0.15,
    "threshold_avg": 0.08,
    "pass": max_confidence_delta <= 0.15 and avg_confidence_delta <= 0.08
  })
  
  # Check 4: Same risk flag severities
  flags_a = {normalize_flag(f): f.severity for f in output_a.risk_flags}
  flags_b = {normalize_flag(f): f.severity for f in output_b.risk_flags}
  common_flags = set(flags_a.keys()) & set(flags_b.keys())
  severity_mismatches = sum(1 for f in common_flags if flags_a[f] != flags_b[f])
  checks.append({
    "dimension": "risk_flag_consistency",
    "total_common_flags": len(common_flags),
    "severity_mismatches": severity_mismatches,
    "threshold": 0,  # Severity levels must match exactly
    "pass": severity_mismatches == 0
  })
  
  # Check 5: Same consensus/disagreement classification
  consensus_match = (output_a.consensus_status == output_b.consensus_status)
  checks.append({
    "dimension": "consensus_classification",
    "a": output_a.consensus_status,
    "b": output_b.consensus_status,
    "pass": consensus_match
  })
  
  # Check 6: Same evidence sources cited for key recommendations
  for a_rec, b_rec in matched_recs:
    sources_a = set(a_rec.evidence_sources)
    sources_b = set(b_rec.evidence_sources)
    source_overlap = len(sources_a & sources_b) / max(len(sources_a | sources_b), 1)
    checks.append({
      "dimension": f"evidence_sources_{a_rec.id}",
      "value": source_overlap,
      "threshold": 0.60,  # At least 60% of cited sources should overlap
      "pass": source_overlap >= 0.60
    })
  
  # Overall verdict
  critical_checks = [c for c in checks if c["dimension"] in 
    ["recommendations_overlap", "risk_flag_consistency", "consensus_classification"]]
  all_checks_pass = all(c["pass"] for c in checks)
  critical_checks_pass = all(c["pass"] for c in critical_checks)
  
  return {
    "similar": critical_checks_pass,  # Critical dimensions must all pass
    "fully_similar": all_checks_pass, # Nice to have: all dimensions pass
    "checks": checks,
    "verdict": "PASS" if critical_checks_pass else "FAIL",
    "note": "PARTIAL — non-critical dimensions differ" if critical_checks_pass and not all_checks_pass else None
  }
```

### Technical Controls for Reproducibility

```
REPRODUCIBILITY_CONTROLS = {
  "temperature_settings": {
    "round_1": 0.3,   # Low temperature for consistent clinical analysis
    "round_2": 0.4,   # Slightly higher for genuine cross-examination (allow disagreement)
    "round_3": 0.2,   # Very low — focused resolution should be precise
    "synthesis": 0.2,  # Low — final output should be stable
    "devils_advocate": 0.6,  # Higher — want creative counter-arguments
  },
  
  "seed_strategy": {
    "method": "deterministic_seed_from_case",
    "implementation": """
      seed = hash(
        patient_id + 
        consultation_question + 
        sorted(lab_values) + 
        sorted(medications) +
        date_bucket(consultation_date, granularity='week')  
        # Weekly bucket: same case in same week gets same seed
        # Different week allows natural evolution as models update
      ) % (2**32)
    """,
    "per_agent_seed": "base_seed + hash(agent_specialty)",
    "note": "Seeds provide reproducibility within a model version. Model updates will naturally shift outputs — this is acceptable and expected."
  },
  
  "structured_output_enforcement": {
    "method": "JSON schema validation on all agent outputs",
    "implementation": """
      Every agent call uses structured output mode (tool_use / function_calling).
      The output schema is rigidly defined (see Round 1/2/3 schemas above).
      This forces agents to fill all required fields, preventing omission variance.
      
      Free-text fields (descriptions, explanations) are the ONLY source of 
      natural language variation. All classification fields (severity, confidence, 
      category) are enum-constrained.
    """,
    "validation": "JSON Schema validation runs on every agent output. Invalid outputs are rejected and re-requested (max 2 retries)."
  },
  
  "consensus_across_runs": {
    "description": "For critical recommendations (priority: critical or high), run the consultation 3 times and take the intersection.",
    "when": "Only for recommendations flagged as critical/high priority",
    "implementation": """
      FUNCTION consensus_across_runs(case_data, n_runs=3):
        outputs = [run_consultation(case_data, seed=base_seed+i) for i in range(n_runs)]
        
        # Extract critical/high recommendations from each run
        rec_sets = [
          set(normalize_rec(r) for r in output.recommendations 
              if r.priority in ('critical', 'high'))
          for output in outputs
        ]
        
        # Intersection: only include recs that appeared in ALL runs
        stable_recs = rec_sets[0]
        for s in rec_sets[1:]:
          stable_recs = stable_recs & s
        
        # Recs that appeared in some but not all runs
        unstable_recs = (rec_sets[0] | rec_sets[1] | rec_sets[2]) - stable_recs
        
        return {
          "stable_recommendations": stable_recs,  # High confidence — consistent across runs
          "unstable_recommendations": unstable_recs,  # Flag to user: "These recommendations were not consistent across multiple analyses. Treat with extra scrutiny."
          "stability_score": len(stable_recs) / len(stable_recs | unstable_recs)
        }
    """,
    "cost": "3x the normal consultation cost. Reserve for high-stakes consultations only.",
    "user_option": "Offer as 'Enhanced Reliability Mode' at higher price point."
  }
}
```

### Systematic Reproducibility Testing

```
REPRODUCIBILITY_TEST_SUITE = {
  "test_cases": {
    "source": "Curated set of 50 representative cases spanning all consultation types",
    "refresh": "Add 10 new cases per quarter, retire 10 oldest",
    "diversity": "Cover: all specialist combinations, complete vs incomplete profiles, cases with known disagreements, edge cases"
  },
  
  "test_protocol": """
    FREQUENCY: Run after every model update, monthly for stability monitoring
    
    FOR each test_case in test_suite:
      results = []
      FOR i in range(5):  # 5 runs per case
        output = run_full_consultation(test_case, seed=base_seed+i)
        results.append(output)
      
      # Pairwise similarity across all 5 runs
      FOR (a, b) in all_pairs(results):
        similarity = are_outputs_acceptably_similar(a, b)
        record(test_case.id, similarity)
      
      # Aggregate metrics for this test case
      case_metrics = {
        "recommendation_stability": jaccard_across_runs(results, field="recommendations"),
        "finding_stability": jaccard_across_runs(results, field="findings"),
        "confidence_cv": coefficient_of_variation_across_runs(results, field="confidence"),
        "severity_agreement": fleiss_kappa_across_runs(results, field="risk_flag_severities"),
        "consensus_agreement": all_same(results, field="consensus_status"),
      }
      record(test_case.id, case_metrics)
    
    # Suite-level metrics
    suite_metrics = {
      "overall_pass_rate": pct of pairwise comparisons that pass,
      "critical_pass_rate": pct of CRITICAL dimension checks that pass,
      "recommendation_stability_mean": mean across all cases,
      "worst_case": test_case with lowest stability scores,
    }
    
    THRESHOLDS:
      overall_pass_rate >= 0.90     # 90% of run-pairs are acceptably similar
      critical_pass_rate >= 0.95    # 95% on critical dimensions
      recommendation_stability >= 0.80  # Mean Jaccard >= 0.80
      
    IF any threshold breached:
      ALERT: "Reproducibility regression detected"
      ACTION: investigate worst_case, check if model update caused it, 
              consider tightening temperature or adding structured constraints
  """,
  
  "regression_detection": {
    "method": "Compare current run against a frozen 'golden output' for each test case",
    "golden_outputs": "Generated once, reviewed by a physician, then frozen",
    "comparison": "Same are_outputs_acceptably_similar() function",
    "drift_tracking": """
      Over time, outputs will naturally drift from golden as models update.
      Track the drift velocity:
        drift_per_month = mean(1 - similarity_to_golden) across test suite
      
      Acceptable drift: < 0.05 per month
      Alert if: drift > 0.10 in any single month
      Action if: drift > 0.20 cumulative → regenerate golden outputs with physician review
    """
  }
}
```

---

## COMPLETE ORCHESTRATION FLOW

Putting it all together -- the end-to-end decision tree:

```
FUNCTION run_consultation(user_id, case_data):
  
  # ═══════════ PRE-DISCUSSION ═══════════
  
  # 1. Validate patient data
  validation = validate_patient_data(case_data)
  if not validation.valid:
    return { "status": "blocked", "reason": validation.action, "message": validation.user_message }
  
  # 2. Score completeness
  completeness = score_completeness(case_data)
  if not completeness.proceed:
    return { "status": "incomplete", "gaps": completeness.gaps }
  
  # 3. Select specialists
  specialists = select_specialists(case_data)
  
  # 4. Assemble evidence packages
  shared_context = build_shared_context(case_data)
  specialist_contexts = { s: build_specialist_context(s, case_data) for s in specialists }
  
  # 5. Load historical outcomes
  outcome_context = build_outcome_context(user_id, case_data)
  
  # 6. Initialize budget tracker
  budget = BudgetTracker(ceiling=BUDGET_CONFIG["max_total_cost_usd"])
  
  # ═══════════ ROUND 1: INDEPENDENT ANALYSIS ═══════════
  
  round_1_outputs = {}
  for specialist in specialists:
    # Parallel execution (all agents run simultaneously)
    output = call_agent(
      specialty=specialist,
      prompt=ROUND_1_PROMPT,
      context=shared_context + specialist_contexts[specialist] + outcome_context,
      schema=ROUND_1_OUTPUT_SCHEMA,
      temperature=0.3,
      seed=compute_seed(case_data, specialist),
      max_output_tokens=BUDGET_CONFIG["round_1_per_agent"]
    )
    round_1_outputs[specialist] = output
    budget.record(output.token_usage)
  
  # Post-Round-1: detect cross-domain harm
  conflicts = detect_cross_domain_harm(round_1_outputs)
  
  # Post-Round-1: check budget
  budget_status = track_budget(budget)
  if budget_status.action == "HARD_STOP":
    return synthesize_early(round_1_outputs, reason="budget")
  
  # ═══════════ ROUND 2: CROSS-EXAMINATION ═══════════
  
  if budget_status.action == "DEGRADE":
    apply_degradation(budget, budget_status.remaining)
  
  round_2_outputs = {}
  for specialist in specialists:
    other_outputs = { k: v for k, v in round_1_outputs.items() if k != specialist }
    
    output = call_agent(
      specialty=specialist,
      prompt=CROSS_EXAMINATION_PROMPT,
      context=round_1_outputs[specialist] + other_outputs + conflicts,
      schema=ROUND_2_OUTPUT_SCHEMA,
      temperature=0.4,
      seed=compute_seed(case_data, specialist, round=2),
      max_output_tokens=BUDGET_CONFIG["round_2_per_agent"]
    )
    round_2_outputs[specialist] = output
    budget.record(output.token_usage)
  
  # Post-Round-2: check termination
  termination = should_terminate(state={ "round": 2, "outputs": round_2_outputs, "budget": budget })
  
  if termination.terminate and termination.reason != "budget_ceiling":
    # Check for false consensus before finalizing
    false_consensus = detect_false_consensus(round_2_outputs)
    if false_consensus.any_flags:
      # Run devil's advocate pass
      devils_output = trigger_devils_advocate_pass(false_consensus)
      round_2_outputs["devils_advocate"] = devils_output
      budget.record(devils_output.token_usage)
  
  # ═══════════ ROUND 3: FOCUSED RESOLUTION (conditional) ═══════════
  
  round_3_outputs = {}
  unresolved = collect_unresolved_disagreements(round_2_outputs)
  
  if len(unresolved) > 0 and not termination.terminate:
    budget_status = track_budget(budget)
    if budget_status.action != "HARD_STOP":
      
      for disagreement in unresolved:
        involved_agents = disagreement.parties
        for agent in involved_agents:
          output = call_agent(
            specialty=agent,
            prompt=ROUND_3_PROMPT.format(disagreement=disagreement),
            schema=ROUND_3_OUTPUT_SCHEMA,
            temperature=0.2,
            seed=compute_seed(case_data, agent, round=3),
            max_output_tokens=BUDGET_CONFIG["round_3_per_agent"]
          )
          
          # Edge case: new concern in Round 3
          if output.deferred_new_concern:
            output.deferred_new_concern.status = "deferred"
            # Strip from resolution, add to deferred queue
          
          round_3_outputs[f"{agent}_{disagreement.id}"] = output
          budget.record(output.token_usage)
  
  # ═══════════ SYNTHESIS ═══════════
  
  synthesis = generate_synthesis(
    round_1=round_1_outputs,
    round_2=round_2_outputs,
    round_3=round_3_outputs,
    conflicts=conflicts,
    false_consensus_flags=false_consensus if exists else None,
    budget_state=budget,
    data_anomalies=validation.anomalies
  )
  
  # ═══════════ POST-CONSULTATION ═══════════
  
  # Store consultation
  consultation_id = store_consultation(synthesis, budget, user_id)
  
  # Schedule follow-ups
  schedule_followups(consultation_id, synthesis.recommendations)
  
  # Compute quality metrics
  quality = {
    "value_added": compute_value_added(synthesis, single_agent_baseline(case_data)),
    "diversity": compute_diversity(round_1_outputs),
    "information_gain": [
      compute_information_gain(round_2_outputs, round_1_outputs),
      compute_information_gain(round_3_outputs, round_2_outputs) if round_3_outputs else None
    ],
    "reproducibility_hash": hash_deterministic_components(synthesis)
  }
  
  store_quality_metrics(consultation_id, quality)
  
  return {
    "consultation_id": consultation_id,
    "synthesis": synthesis,
    "quality_metrics": quality,
    "followup_schedule": get_schedule(consultation_id),
    "cost": budget.total_spent_usd
  }
```
