# Personalization Algorithm -- Study-to-Patient Applicability Scoring

## Core Problem

Medical evidence is generated from study populations. Individual patients rarely match those populations exactly. The system must transparently score how well any piece of evidence applies to the specific user and communicate that honestly.

---

## Applicability Scoring Algorithm

### Input: Study Characteristics + Patient Profile

```json
{
  "study_profile": {
    "population_age_range": [55, 75],
    "population_age_mean": 64,
    "population_sex_distribution": {"male": 0.72, "female": 0.28},
    "population_ethnicity": ["White European (85%)", "Other (15%)"],
    "inclusion_conditions": ["heart failure with reduced ejection fraction", "NYHA class II-III"],
    "exclusion_conditions": ["severe renal impairment", "active cancer", "recent MI"],
    "medication_context": ["on guideline-directed medical therapy"],
    "sample_size": 420,
    "study_duration_months": 24,
    "study_design": "RCT",
    "primary_endpoint": "composite cardiovascular events",
    "funding": "independent"
  },
  "patient_profile": {
    "age": 45,
    "sex": "female",
    "ethnicity": "South Asian",
    "conditions": ["heart failure with preserved ejection fraction", "type 2 diabetes", "PCOS"],
    "medications": ["metformin", "empagliflozin", "lisinopril"],
    "family_history": ["father: MI at 52", "mother: type 2 diabetes"],
    "lifestyle": {"exercise": "moderate", "diet": "vegetarian", "smoking": "never", "alcohol": "none"},
    "labs": {"ejection_fraction": 58, "A1c": 7.2, "eGFR": 88}
  }
}
```

### Scoring Dimensions

Each dimension is scored 0-100. The composite score determines the applicability language used.

#### 1. Age Match Score

```python
def score_age_match(patient_age, study_age_range, study_age_mean):
    """
    Score how well patient's age matches study population.
    """
    # Within study range: high match
    if study_age_range[0] <= patient_age <= study_age_range[1]:
        # Closer to mean = higher score
        distance_from_mean = abs(patient_age - study_age_mean)
        range_span = study_age_range[1] - study_age_range[0]
        return max(70, 100 - (distance_from_mean / range_span * 30))

    # Within 10 years of range boundary: moderate match
    distance_from_range = min(
        abs(patient_age - study_age_range[0]),
        abs(patient_age - study_age_range[1])
    )
    if distance_from_range <= 10:
        return max(40, 70 - (distance_from_range * 3))

    # More than 10 years outside range: low match
    if distance_from_range <= 20:
        return max(15, 40 - (distance_from_range - 10) * 2.5)

    # Far outside range
    return max(5, 15 - (distance_from_range - 20))
```

**Language mapping:**
- Score 80-100: "This study's population closely matches your age range."
- Score 50-79: "You're somewhat younger/older than the typical participant in this study, which may affect applicability."
- Score 20-49: "This study was conducted in a significantly [older/younger] population. The findings may not directly translate to someone your age."
- Score 0-19: "This study was conducted in a very different age group. Applicability to your age is uncertain."

#### 2. Sex Match Score

```python
def score_sex_match(patient_sex, study_sex_distribution):
    """
    Score based on whether patient's sex was well-represented in the study.
    """
    if patient_sex == "male":
        representation = study_sex_distribution.get("male", 0)
    elif patient_sex == "female":
        representation = study_sex_distribution.get("female", 0)
    else:
        # Non-binary or other: most studies have no data
        return 20  # Low confidence, flag explicitly

    if representation >= 0.40:
        return 95  # Well-represented
    elif representation >= 0.25:
        return 70  # Moderately represented
    elif representation >= 0.10:
        return 45  # Underrepresented
    elif representation > 0:
        return 25  # Severely underrepresented
    else:
        return 10  # Not included
```

**Language mapping:**
- Score 80-100: "Both sexes were well-represented in this study."
- Score 50-79: "[Sex] participants made up a smaller portion of this study, so the findings may be somewhat less certain for [sex] individuals."
- Score 20-49: "[Sex] participants were significantly underrepresented in this study. Cardiovascular conditions can present and respond differently between sexes, so applicability is limited."
- Score 0-19: "This study [did not include / barely included] [sex] participants. The findings cannot be confidently applied to you."

#### 3. Ethnicity Match Score

```python
def score_ethnicity_match(patient_ethnicity, study_ethnicity_distribution):
    """
    Score based on ethnic representation in the study.
    This matters because drug metabolism, disease prevalence, and genetic
    risk factors vary by ancestry.
    """
    # Check if patient's ethnicity is represented
    patient_represented = False
    representation_level = 0

    for group in study_ethnicity_distribution:
        if _ethnicity_maps_to(patient_ethnicity, group):
            patient_represented = True
            representation_level = _extract_percentage(group)
            break

    if not patient_represented:
        return 25  # Not represented -- applicability unclear

    if representation_level >= 30:
        return 90
    elif representation_level >= 15:
        return 70
    elif representation_level >= 5:
        return 50
    else:
        return 35
```

**Language mapping:**
- Score 80-100: "Your ethnic background was well-represented in this study."
- Score 50-79: "Participants of [ethnicity] background were included but underrepresented. Some cardiovascular risk factors and drug responses vary by ancestry."
- Score 25-49: "Participants of [ethnicity] background were minimally represented. Genetic and metabolic differences may affect how these findings apply to you."
- Score 0-24: "This study did not include participants of [ethnicity] background. Given known population differences in [relevant factor], applicability is uncertain."

#### 4. Condition Match Score

```python
def score_condition_match(patient_conditions, study_inclusion, study_exclusion):
    """
    The most critical dimension. Does the patient actually have the condition
    the study was designed to address?
    """
    # Primary condition match
    primary_match = _condition_overlap(patient_conditions, study_inclusion)

    if primary_match == "exact":
        base_score = 95
    elif primary_match == "related_subtype":
        # e.g., HFpEF when study was on HFrEF
        base_score = 50  # Related but importantly different
    elif primary_match == "same_organ_system":
        base_score = 30
    else:
        base_score = 10  # Not the studied condition

    # Exclusion criteria check
    for condition in patient_conditions:
        if condition in study_exclusion:
            base_score = min(base_score, 15)
            # Patient would have been EXCLUDED from this study
            break

    # Comorbidity modifier
    # More comorbidities not in the study = less applicability
    unstudied_comorbidities = [c for c in patient_conditions
                                if c not in study_inclusion
                                and c not in study_exclusion]
    comorbidity_penalty = len(unstudied_comorbidities) * 5
    base_score = max(10, base_score - comorbidity_penalty)

    return base_score
```

**Language mapping:**
- Score 80-100: "This study directly addressed your condition. The findings are highly relevant."
- Score 50-79: "This study addressed a related but distinct condition ([study condition] vs. your [patient condition]). The findings may be partially applicable, but important differences exist."
- Score 20-49: "This study was not designed for your specific condition. While there may be some mechanistic relevance, direct applicability is limited."
- Score 10-19: "You would have been excluded from this study based on your health profile. The findings should not be assumed to apply to you."
- Score 0-9: "This study does not address your condition. It is not applicable."

#### 5. Medication Context Score

```python
def score_medication_context(patient_medications, study_medication_context):
    """
    Score based on whether patient's medication profile matches study context.
    Important because medications can interact with studied interventions
    and alter baseline physiology.
    """
    # Check if patient is on the same background therapy as study participants
    background_match = _medication_overlap(patient_medications, study_medication_context)

    if background_match == "equivalent":
        base_score = 90
    elif background_match == "similar_class":
        base_score = 70
    elif background_match == "different_but_compatible":
        base_score = 55
    elif background_match == "potentially_interacting":
        base_score = 30  # Flag interaction concern
    else:
        base_score = 50  # Unknown context

    return base_score
```

#### 6. Study Quality Score

```python
def score_study_quality(study_design, sample_size, duration_months, funding):
    """
    Intrinsic study quality affects how much weight to give results regardless
    of population match.
    """
    base = 0

    # Design
    design_scores = {
        "systematic_review_meta_analysis": 95,
        "RCT": 85,
        "prospective_cohort": 65,
        "retrospective_cohort": 50,
        "case_control": 40,
        "cross_sectional": 30,
        "case_series": 20,
        "case_report": 10,
        "expert_opinion": 5
    }
    base = design_scores.get(study_design, 30)

    # Sample size modifier
    if sample_size >= 1000:
        base = min(100, base + 10)
    elif sample_size >= 500:
        base = min(100, base + 5)
    elif sample_size < 50:
        base = max(5, base - 15)
    elif sample_size < 100:
        base = max(5, base - 10)

    # Duration modifier (for chronic conditions)
    if duration_months >= 24:
        base = min(100, base + 5)
    elif duration_months < 3:
        base = max(5, base - 10)

    # Funding modifier
    if funding == "independent":
        base = min(100, base + 5)
    elif funding == "industry_with_independent_oversight":
        pass  # Neutral
    elif funding == "industry_sole":
        base = max(5, base - 10)

    return base
```

### Composite Applicability Score

```python
def compute_applicability(scores, weights=None):
    """
    Compute weighted composite applicability score.

    Default weights reflect clinical importance of each dimension.
    Condition match is weighted highest because a perfect demographic
    match is meaningless if the study didn't address the patient's condition.
    """
    if weights is None:
        weights = {
            "age_match": 0.12,
            "sex_match": 0.12,
            "ethnicity_match": 0.10,
            "condition_match": 0.30,
            "medication_context": 0.12,
            "study_quality": 0.24
        }

    composite = sum(scores[dim] * weights[dim] for dim in weights)

    # Hard floor: if condition match is below 20, cap composite at 30
    # regardless of other scores. Wrong condition = not applicable.
    if scores["condition_match"] < 20:
        composite = min(composite, 30)

    # Hard floor: if patient would have been excluded, cap at 25
    if scores.get("excluded_flag", False):
        composite = min(composite, 25)

    return round(composite, 1)
```

### Applicability Tiers and Language

```json
{
  "tiers": {
    "high_applicability": {
      "score_range": [75, 100],
      "language_template": "This evidence is likely applicable to your situation. The study population and conditions closely match your profile. {specific_match_details}",
      "confidence_modifier": "none"
    },
    "moderate_applicability": {
      "score_range": [50, 74],
      "language_template": "This evidence is partially applicable to your situation. {match_summary}. The key differences are: {difference_list}. These differences mean the findings should be considered directional rather than definitive for someone with your profile.",
      "confidence_modifier": "downgrade_one_level"
    },
    "limited_applicability": {
      "score_range": [25, 49],
      "language_template": "This evidence has limited applicability to your situation. The study was conducted in {study_population_summary}, which differs from your profile in important ways: {difference_list}. The findings provide background context but should not be assumed to apply directly to you.",
      "confidence_modifier": "downgrade_two_levels"
    },
    "minimal_applicability": {
      "score_range": [0, 24],
      "language_template": "This evidence has minimal applicability to your situation. {primary_reason_for_low_score}. While it may provide some general background, it would be inappropriate to draw conclusions about your health from this research.",
      "confidence_modifier": "flag_as_not_applicable"
    }
  }
}
```

---

## Worked Example: CoQ10 Study Applied to the Sample Patient

**Patient:** 45-year-old South Asian female with HFpEF, T2DM, PCOS
**Study:** Q-SYMBIO trial (CoQ10 for heart failure)

```
Dimension Scores:
- Age match: 38/100
  Patient (45) is 10 years below study range (55-75, mean 64)

- Sex match: 45/100
  Female (28% of study population -- underrepresented)

- Ethnicity match: 25/100
  South Asian participants not specifically reported (85% White European)

- Condition match: 50/100
  Study: HFrEF. Patient: HFpEF. Same organ, fundamentally different pathophysiology.
  Additionally, patient has T2DM and PCOS (unstudied comorbidities, -10)

- Medication context: 55/100
  Patient on empagliflozin (SGLT2i for HF, not available when Q-SYMBIO was run).
  Different background therapy era.

- Study quality: 80/100
  RCT (85 base), n=420 (+5), 24 months (+5), independent funding (+5),
  but single-center adjustment (-15). Final: 80.

Composite: (38*0.12) + (45*0.12) + (25*0.10) + (50*0.30) + (55*0.12) + (80*0.24)
         = 4.56 + 5.40 + 2.50 + 15.00 + 6.60 + 19.20
         = 53.3 → MODERATE APPLICABILITY
```

**Generated Language:**
```
"The Q-SYMBIO trial studied CoQ10 supplementation in heart failure patients
and found a reduction in major cardiac events. However, your profile differs
from the study population in several important ways:

- The study focused on heart failure with REDUCED ejection fraction (HFrEF).
  You have heart failure with PRESERVED ejection fraction (HFpEF). These are
  increasingly understood as different conditions with different underlying
  mechanisms and different treatment responses.

- The study population was predominantly older (average age 64) and male (72%).
  As a 45-year-old woman, the findings may not translate directly.

- South Asian individuals were not specifically represented in the trial.
  Cardiovascular disease patterns and responses can differ by ancestry.

- The study was conducted before SGLT2 inhibitors (like your empagliflozin)
  were part of standard heart failure therapy, so the background treatment
  context has changed.

Overall, this study provides interesting context but has limited direct
applicability to your specific situation. If CoQ10 is something you're
interested in exploring, it would be worth discussing with your cardiologist
specifically in the context of HFpEF, where the evidence base is thinner."
```

---

## Handling No Matching Studies

This is the most common scenario for patients with multiple comorbidities. The system must handle it gracefully.

### Detection Logic

```python
def assess_evidence_landscape(patient_conditions, available_evidence):
    """
    Determine if there is ANY evidence that matches the patient's
    specific combination of conditions.
    """
    # Check for evidence addressing the specific combination
    combination_evidence = find_studies_matching_all(patient_conditions, available_evidence)
    if combination_evidence:
        return "combination_studied", combination_evidence

    # Check for evidence addressing each condition individually
    individual_evidence = {}
    for condition in patient_conditions:
        studies = find_studies_matching(condition, available_evidence)
        individual_evidence[condition] = studies

    if all(individual_evidence.values()):
        return "individual_studied_not_combined", individual_evidence

    # Check for evidence addressing some but not all
    studied = {c: s for c, s in individual_evidence.items() if s}
    unstudied = {c: s for c, s in individual_evidence.items() if not s}
    if studied:
        return "partial_evidence", {"studied": studied, "unstudied": unstudied}

    return "no_evidence", None
```

### Language Templates for Each Scenario

**No study matches the patient's combination:**
```
"An important caveat: The studies I'm drawing from looked at [condition A]
and [condition B] separately. Your situation involves both conditions together,
and the interaction between them hasn't been specifically studied in the
context of [intervention]. This matters because:

- [Condition A] and [Condition B] may interact in ways that alter how
  [intervention] works
- Medication interactions between treatments for each condition add complexity
- The net effect could be different (better, worse, or unchanged) compared
  to what studies on each condition alone would predict

This is exactly the kind of complexity where your physician's clinical judgment
-- knowing your full picture -- is essential. The individual-condition evidence
gives us a starting point for discussion, not a conclusion."
```

**No evidence exists for a condition:**
```
"I want to be transparent: there is very limited or no clinical research on
[intervention] for [patient's specific condition]. This doesn't mean it
couldn't help or couldn't harm -- it means the question hasn't been studied.

In situations like this, your doctor may reason from:
- Related conditions where evidence does exist
- The known mechanism of action
- Their clinical experience with similar patients
- General safety data for the intervention

I can share what's known about [intervention] in related contexts, but I want
to be clear that we're extrapolating, not citing direct evidence."
```

**Evidence exists but for different populations:**
```
"The available research on [intervention] for [condition] was conducted
primarily in [study population description]. Your profile -- [key differences]
-- means we're working with indirect evidence. Here's what the research shows
in the populations that were studied, along with my assessment of how
transferable each finding might be to someone with your characteristics."
```

---

## Genetic Factor Integration

When genetic data is available (pharmacogenomics, ancestry-based risk variants):

```json
{
  "genetic_applicability_modifiers": {
    "pharmacogenomic": {
      "description": "Known drug-gene interactions that affect metabolism",
      "examples": [
        "CYP2D6 poor metabolizer status affecting drug clearance",
        "CYP2C19 variants affecting clopidogrel activation",
        "SLCO1B1 variants affecting statin myopathy risk"
      ],
      "language": "Genetic testing has identified that you [genetic finding]. This is relevant because [mechanism]. Studies of [intervention] may not account for this genetic variation, and the effect on you could be [different/stronger/weaker].",
      "confidence_impact": "Increase confidence if genetic data supports applicability. Decrease if genetic data suggests different metabolism."
    },
    "ancestry_risk_variants": {
      "description": "Population-specific risk alleles",
      "examples": [
        "South Asian ancestry: higher insulin resistance at lower BMI",
        "African ancestry: different renin-angiotensin profile affecting ACE inhibitor response",
        "East Asian ancestry: higher alcohol flush reaction (ALDH2 variant)"
      ],
      "language": "Research has identified that individuals of [ancestry] background may have [specific difference]. This is relevant to [intervention/condition] because [mechanism]. The standard evidence base may [over/under]estimate the [effect/risk] for you.",
      "confidence_impact": "Adjust applicability score based on known population-specific differences"
    }
  }
}
```

---

## Complete Output Example: Personalized Evidence Card

```json
{
  "evidence_card": {
    "intervention": "CoQ10 supplementation (300mg/day)",
    "target_outcome": "Cardiovascular event reduction in heart failure",
    "evidence_tier": "A",
    "key_study": "Q-SYMBIO trial (general reference, not cited as specific)",
    "applicability_assessment": {
      "composite_score": 53.3,
      "tier": "moderate",
      "dimension_scores": {
        "age_match": {"score": 38, "note": "You are younger than the study population (45 vs. average 64)"},
        "sex_match": {"score": 45, "note": "Women were underrepresented (28% of participants)"},
        "ethnicity_match": {"score": 25, "note": "South Asian individuals were not specifically represented"},
        "condition_match": {"score": 50, "note": "The study addressed HFrEF; you have HFpEF -- related but mechanistically distinct"},
        "medication_context": {"score": 55, "note": "Your current medications reflect modern therapy not available during the study"},
        "study_quality": {"score": 80, "note": "Well-designed RCT, independent funding, adequate duration"}
      }
    },
    "personalized_summary": "The evidence for CoQ10 in heart failure is meaningful but was generated in a population that differs from your profile in several important ways. The most significant gap is that the study addressed a different subtype of heart failure (reduced vs. preserved ejection fraction). This is a reasonable topic to discuss with your cardiologist, but the evidence does not directly address your specific situation.",
    "questions_for_your_doctor": [
      {
        "question": "Is there any evidence for CoQ10 specifically in HFpEF, or would you be extrapolating from the HFrEF data?",
        "why_this_matters": "HFpEF and HFrEF respond differently to many treatments. What works in one may not work in the other.",
        "what_to_listen_for": "Whether your doctor is aware of any HFpEF-specific data, or whether they'd consider it based on the general mechanism."
      },
      {
        "question": "Given that I'm on empagliflozin, which has its own mitochondrial effects, would CoQ10 add anything or potentially interact?",
        "why_this_matters": "SGLT2 inhibitors have cardioprotective mechanisms that may overlap with CoQ10's proposed benefits.",
        "what_to_listen_for": "Whether your doctor sees redundancy or complementarity in the mechanisms."
      },
      {
        "question": "Are there any concerns about CoQ10 interacting with my current medications (metformin, empagliflozin, lisinopril)?",
        "why_this_matters": "Supplement-drug interactions are often understudied, and your doctor or pharmacist may have additional information.",
        "what_to_listen_for": "Specific interaction concerns, or a general 'no known issues' response."
      }
    ]
  }
}
```

---

## Algorithm Performance Expectations

- **Scoring latency:** < 50ms per study-patient comparison (all rule-based, no LLM call needed)
- **Language generation:** LLM-generated based on score outputs (adds typical LLM latency)
- **Accuracy target:** Applicability tier matches expert assessment >= 80% of the time (validated against cardiologist panel ratings)
- **Transparency requirement:** Every score must be explainable. Users can ask "why did you rate this as moderate applicability?" and get a dimension-by-dimension breakdown
- **Override capability:** If a patient provides new information that changes a dimension score, the system recalculates and regenerates language in real time
