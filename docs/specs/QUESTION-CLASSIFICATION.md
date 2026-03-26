# Question Classification System -- Production Specification

## Overview

The classification system is the routing brain of MedPanel. Every user question passes through it before any specialist agent sees the case. It runs on Claude Haiku for cost and latency (target: < 2 seconds, < $0.001 per classification). It produces a structured output that determines which specialists are assembled, how many, and at what model tier.

The classifier operates on three independent axes plus a composite complexity score. All four outputs feed into the specialist selection algorithm defined in `DISCUSSION-PROTOCOL.md`.

```
User Question + Patient Profile
         |
         v
  [Safety Pre-Check] ──── EMERGENCY? ──> Abort classification, invoke SAFETY-SYSTEM.md
         |
         | (safe to proceed)
         v
  [Haiku Classifier]
         |
         ├── Axis 1: Clinical Intent
         ├── Axis 2: Organ System / Body Domain
         ├── Axis 3: Urgency Level
         └── Complexity Score (0-10)
         |
         v
  [Specialist Selection Algorithm]
         |
         v
  Panel: [internist, cardiologist, endocrinologist, ...]
         + model tier assignments
```

---

## 1. Three-Axis Classification System

### Axis 1: Clinical Intent

Classifies *what the user wants to know* -- the epistemic goal of their question.

| Intent | Definition | Trigger Signals | Example Question |
|--------|-----------|----------------|-----------------|
| `diagnostic` | User wants to understand what might be causing symptoms or what a condition is | "what's causing", "why do I", "what could explain", "what is wrong", symptom descriptions | "What could be causing my persistent fatigue and brain fog?" |
| `therapeutic` | User wants to explore treatment approaches or interventions | "how to treat", "what are the options", "should I try", "alternatives to", therapy/treatment mentions | "What are the different approaches for managing resistant hypertension?" |
| `prognostic` | User wants to understand disease trajectory, outcomes, or what to expect | "what will happen", "will it get worse", "long-term outlook", "chances of", "life expectancy" | "What's the typical trajectory for someone with stage 3 CKD and well-controlled diabetes?" |
| `preventive` | User wants to reduce risk of a condition they don't yet have | "how to prevent", "reduce my risk", "family history of...should I worry", screening questions | "My father had a heart attack at 52. What should I be doing now at 35?" |
| `optimization` | User wants to improve biomarkers, performance, or wellbeing that is already within normal range | "optimize", "improve my", "best protocol for", "biohacking", performance-oriented language | "How can I optimize my testosterone levels naturally? Current total T is 550 ng/dL." |
| `medication_management` | User has questions about current medications: interactions, side effects, switching, timing | "side effects of", "can I take X with Y", "switching from", "stopping", "when to take" | "I'm on metformin, lisinopril, and atorvastatin. Could my fatigue be a medication side effect?" |
| `interpretation` | User wants help understanding lab results, imaging, or test reports | "what does this mean", "is this normal", "my labs show", attaches numbers/results | "My TSH is 4.2 mIU/L and free T4 is 0.9 ng/dL. What should I understand about these values?" |
| `second_opinion` | User has received a diagnosis or treatment plan and wants additional perspectives | "my doctor said", "was told I need", "diagnosed with", "second opinion on", "another perspective" | "My cardiologist wants to put me on a statin but my LDL is only 130. Is this standard?" |

**Classification rules for Axis 1:**

1. Choose the SINGLE most dominant intent. If the question contains multiple intents, pick the one that best captures what the user needs answered first.
2. When ambiguous between `diagnostic` and `interpretation`: if the user provides specific lab values or test results, classify as `interpretation`. If they describe symptoms without data, classify as `diagnostic`.
3. When ambiguous between `therapeutic` and `medication_management`: if the user is asking about medications they are *currently taking*, classify as `medication_management`. If they are exploring new treatment options, classify as `therapeutic`.
4. When ambiguous between `optimization` and `preventive`: if the user has normal values and wants them better, classify as `optimization`. If the user has risk factors and wants to avoid disease, classify as `preventive`.
5. `second_opinion` requires explicit reference to a prior clinical opinion or recommendation they received from a provider.

**Edge cases:**

| Question | Might Seem Like | Correct Classification | Reasoning |
|----------|----------------|----------------------|-----------|
| "My doctor put me on metoprolol and I feel terrible" | therapeutic | medication_management | They're asking about a current medication's effects |
| "Should I take CoQ10 for my heart?" | optimization | therapeutic | CoQ10 is an intervention for a concern, not baseline optimization |
| "My A1c went from 5.7 to 6.1, what does this mean?" | interpretation | prognostic | The trend is the concern; they want trajectory, not just number meaning |
| "I want to try TRT" | therapeutic | optimization | "Want to try" suggests elective optimization, not treating a diagnosed deficiency |
| "Is 130 LDL bad?" | interpretation | interpretation | Pure value interpretation, no treatment question embedded |
| "Is 130 LDL bad enough to need a statin?" | interpretation | therapeutic | The real question is about intervention threshold |

---

### Axis 2: Organ System / Body Domain

Maps the question to one or more body systems. Aligned with ICD-10 chapter structure for downstream interoperability but uses clinically intuitive groupings.

| Domain Code | Domain Name | ICD-10 Chapters | Specialist Mapping | Example Markers |
|-------------|------------|------------------|-------------------|----------------|
| `CARDIO` | Cardiovascular | I00-I99 | cardiologist | heart, blood pressure, cholesterol, LDL, HDL, triglycerides, chest pain, palpitations, arrhythmia, atherosclerosis, heart failure |
| `ENDO` | Endocrine & Metabolic | E00-E89 | endocrinologist | thyroid, TSH, T3, T4, testosterone, estrogen, cortisol, insulin, blood sugar, A1c, diabetes, PCOS, adrenal, pituitary, metabolic syndrome |
| `NEURO` | Neurological | G00-G99 | neurologist | headache, migraine, neuropathy, seizure, tremor, cognitive decline, memory, MS, Parkinson's, nerve pain |
| `PSYCH` | Mental Health & Behavioral | F00-F99 | neuropsychiatrist | depression, anxiety, ADHD, bipolar, PTSD, insomnia (behavioral), substance use, cognitive-behavioral |
| `GI` | Gastrointestinal | K00-K95 | gastroenterologist | stomach, bowel, liver, GERD, IBS, Crohn's, colitis, microbiome, SIBO, bloating, constipation, diarrhea |
| `RENAL` | Renal / Urological | N00-N99 | nephrologist | kidney, creatinine, eGFR, BUN, urinary, proteinuria, kidney stones, CKD |
| `PULM` | Respiratory | J00-J99 | pulmonologist | breathing, lungs, asthma, COPD, shortness of breath, cough, oxygen, sleep apnea |
| `MSK` | Musculoskeletal | M00-M99 | rheumatologist / sports medicine | joints, bones, arthritis, osteoporosis, back pain, muscle weakness, autoimmune inflammatory |
| `DERM` | Dermatological | L00-L99 | dermatologist | skin, rash, eczema, psoriasis, acne, hair loss, nail changes |
| `HEME` | Hematologic / Oncologic | C00-D89 | hematologist/oncologist | anemia, blood counts, iron, ferritin, B12, clotting, cancer, tumor markers |
| `IMMUNE` | Immunological | D80-D89, specific L/M codes | immunologist | autoimmune, lupus, rheumatoid, allergies, IgE, immune deficiency, chronic inflammation |
| `REPRO` | Reproductive / Sexual Health | N40-N51, N60-N98, O00-O99 | reproductive endocrinologist | fertility, menstrual, erectile dysfunction, libido, pregnancy-related, menopause, PCOS |
| `HEPAT` | Hepatic | K70-K77, specific B codes | hepatologist | liver enzymes, ALT, AST, bilirubin, fatty liver, hepatitis, cirrhosis |
| `OPHTHO` | Ophthalmologic | H00-H59 | ophthalmologist | vision, eyes, glaucoma, macular degeneration, diabetic retinopathy |
| `ENT` | Ear/Nose/Throat | H60-H95, J00-J06 | otolaryngologist | hearing loss, tinnitus, sinus, vertigo, swallowing |
| `NUTR` | Nutritional / Functional | E40-E68, specific Z codes | functional medicine / nutritional medicine | vitamins, minerals, micronutrients, OAT, heavy metals, gut health, supplements, toxins |
| `PHARM` | Pharmacological (cross-cutting) | N/A | clinical pharmacologist | drug interactions, polypharmacy, CYP enzymes, pharmacogenomics, dosing, side effects |
| `SLEEP` | Sleep Medicine | G47 | sleep medicine specialist | insomnia, sleep apnea, circadian rhythm, sleep architecture, melatonin |
| `PAIN` | Pain Management | G89, R52 | pain management specialist | chronic pain, fibromyalgia, neuropathic pain, opioid management |
| `GERI` | Geriatric / Aging | R54, specific Z codes | geriatrician | aging, longevity, polypharmacy in elderly, falls, cognitive aging, frailty |

**Classification rules for Axis 2:**

1. Assign ALL relevant domains. A question can map to 1-5 domains. The classifier must output them in priority order (most relevant first).
2. `PHARM` is triggered automatically when: (a) the question mentions 2+ medications, (b) the question mentions medication + supplement interaction, or (c) the patient profile contains 5+ active medications.
3. `NUTR` is triggered when supplements, vitamins, OAT results, or functional medicine topics are the primary focus.
4. When a symptom maps to multiple organ systems (e.g., fatigue), assign the top 2-3 most likely domains based on the patient profile context. Fatigue alone without context maps to `[ENDO, HEME, PSYCH]`.
5. The PRIMARY domain (first in the list) determines the lead specialist. Secondary domains determine supporting specialists.

**Multi-domain examples:**

| Question | Domains (ordered) | Reasoning |
|----------|-------------------|-----------|
| "I'm on TRT and my hematocrit is climbing. Should I be worried about clots?" | `[ENDO, HEME, CARDIO]` | TRT = endocrine, hematocrit = hematologic, clot risk = cardiovascular |
| "My A1c is 6.3 and I also have fatty liver. Are these connected?" | `[ENDO, HEPAT, GI]` | A1c = endocrine/metabolic, fatty liver = hepatic, GI for broader metabolic context |
| "I've been having anxiety, insomnia, and my TSH is low" | `[ENDO, PSYCH, SLEEP]` | Low TSH driving symptoms makes endocrine primary; psych and sleep are affected systems |
| "What supplements should I take for brain fog and low energy?" | `[NUTR, NEURO, ENDO]` | Supplement focus = nutritional, brain fog = neuro, energy = endocrine |
| "I'm on metformin, atorvastatin, and lisinopril -- are there interactions with the magnesium and CoQ10 I'm taking?" | `[PHARM, NUTR, CARDIO, ENDO]` | Multi-drug interaction = pharmacology primary, supplements = nutritional, drugs map to cardio + endo |

---

### Axis 3: Urgency Level

Determines response priority and influences panel assembly speed. This axis is informed by but independent from the Safety System (SAFETY-SYSTEM.md). The safety system handles true emergencies before classification even runs. Urgency here is for the clinical priority of *non-emergency* questions.

| Urgency Level | Definition | Response Expectation | Safety System Interaction |
|---------------|-----------|---------------------|--------------------------|
| `emergent` | Active symptoms suggesting a potentially life-threatening condition. Should not normally reach the classifier (safety system intercepts first). If it does, classification is aborted and safety escalation is triggered. | Immediate safety escalation | OVERRIDE: triggers safety system |
| `urgent` | Symptoms or findings suggesting a condition that needs medical evaluation within 24-48 hours. New acute symptoms, significantly abnormal lab values, worsening trajectory. | Fast-track panel, include safety wrapper | Safety wrapper applied to output |
| `semi_urgent` | Concerning findings that warrant medical attention within 1-2 weeks. Mildly abnormal labs trending wrong direction, new persistent symptoms, medication side effects. | Standard panel with priority flag | Monitoring reminder appended |
| `routine` | Stable condition, follow-up questions, general health exploration. No acute change. | Standard panel | No safety additions needed |
| `optimization` | User is healthy or stable and seeking to improve beyond baseline. Performance, longevity, preventive optimization. No pathology driver. | Standard panel, can be smaller (2-3 specialists) | No safety additions needed |

**Classification rules for Axis 3:**

1. If ANY emergency signal is detected, classify as `emergent` and abort -- hand off to safety system.
2. `urgent` requires ACTIVE symptoms (present tense) or lab values in critical range (flagged critical_high or critical_low in the patient profile).
3. `semi_urgent` applies when there is a clear medical concern but no acute threat: trending labs, new persistent symptoms, medication concerns.
4. `routine` is the default for stable patients asking follow-up or exploratory questions.
5. `optimization` applies ONLY when the user is explicitly seeking to improve already-normal parameters.

**Urgency override rules:**

- If urgency is `routine` or `optimization` but the patient profile reveals critical lab values the user hasn't mentioned, UPGRADE urgency to `semi_urgent` and flag the discrepancy.
- If urgency is `urgent` but temporal context suggests historical/resolved, DOWNGRADE to `semi_urgent` with a note.
- The classifier NEVER downgrades from `emergent`. Only the safety system can make that determination.

**Examples:**

| Question | Profile Context | Urgency | Reasoning |
|----------|----------------|---------|-----------|
| "I've had a new headache for 3 days that won't go away" | 55M, hypertensive | urgent | New persistent headache in hypertensive patient needs evaluation |
| "My LDL is 145. Should I start a statin?" | 40M, no CVD history | routine | Mildly elevated LDL, no acute concern |
| "My creatinine jumped from 1.1 to 1.8 in 3 months" | 50M, diabetic | urgent | Rapid renal function decline needs prompt evaluation |
| "How can I improve my sleep quality?" | 35F, healthy | optimization | No pathology, seeking improvement |
| "I started a new medication and have a rash on my trunk" | On allopurinol, started 2 weeks ago | semi_urgent | Possible drug reaction, needs medical attention but not ER |
| "My TSH was 4.5 last year, should I retest?" | 42F, fatigue | routine | Follow-up on borderline value, no acute concern |
| "I've been dizzy and seeing spots since this morning" | 68F, on warfarin | urgent | New neurological symptoms on anticoagulation needs same-day evaluation |

---

## 2. Complexity Scoring Algorithm

The complexity score (0.0 to 10.0) determines how many specialists sit on the panel and how deep the discussion goes. Higher complexity = more specialists, more discussion rounds, higher model tier allocation.

### Formula

```
COMPLEXITY = (
    (organ_system_count * W_ORGANS) +
    (comorbidity_factor * W_COMORBID) +
    (medication_factor * W_MEDS) +
    (diagnostic_uncertainty * W_UNCERTAINTY) +
    (treatment_conflict_factor * W_CONFLICT)
) / NORMALIZATION_DIVISOR
```

### Weights and Factors

```python
# === WEIGHTS ===
W_ORGANS      = 0.25   # How many body systems are involved
W_COMORBID    = 0.25   # Active comorbidities that interact with the question
W_MEDS        = 0.15   # Medication/supplement complexity
W_UNCERTAINTY = 0.20   # How ambiguous the question/diagnosis is
W_CONFLICT    = 0.15   # Competing treatment considerations

NORMALIZATION_DIVISOR = 1.0  # Weights already sum to 1.0; final multiply by 10

# === FACTOR CALCULATIONS ===

def organ_system_count(classification):
    """Number of organ system domains identified in Axis 2."""
    n = len(classification.organ_systems)
    # Raw score: 1 domain = 2, 2 = 5, 3 = 7, 4 = 9, 5+ = 10
    SCORE_MAP = {1: 2, 2: 5, 3: 7, 4: 9}
    return SCORE_MAP.get(n, 10)

def comorbidity_factor(patient_profile):
    """Active conditions from the patient profile that are clinically
    relevant to the current question."""
    active_conditions = [c for c in patient_profile.conditions
                         if c.status == "active"]
    relevant = count_relevant_comorbidities(active_conditions,
                                            classification.organ_systems)
    # Score: 0 relevant = 0, 1 = 3, 2 = 5, 3 = 7, 4+ = 10
    SCORE_MAP = {0: 0, 1: 3, 2: 5, 3: 7}
    return SCORE_MAP.get(relevant, 10)

def medication_factor(patient_profile):
    """Complexity from current medication list."""
    active_meds = [m for m in patient_profile.medications
                   if m.status == "active"]
    n = len(active_meds)
    # Base score from count
    if n <= 2:
        base = 1
    elif n <= 4:
        base = 3
    elif n <= 6:
        base = 5
    elif n <= 8:
        base = 7
    else:
        base = 9
    # Bonus +1 if any known major interactions exist in the profile
    # Bonus +1 if narrow therapeutic index drugs present (warfarin, lithium,
    #   digoxin, phenytoin, theophylline, cyclosporine)
    NARROW_TI = {"warfarin", "lithium", "digoxin", "phenytoin",
                 "theophylline", "cyclosporine", "tacrolimus", "methotrexate"}
    has_narrow = any(m.name.lower() in NARROW_TI for m in active_meds)
    bonus = (1 if has_narrow else 0)
    return min(base + bonus, 10)

def diagnostic_uncertainty(classification, patient_profile):
    """How ambiguous is the clinical picture?"""
    # Score assigned by the Haiku classifier on a 0-10 scale based on:
    # - Symptom specificity (vague = high uncertainty)
    # - Number of plausible explanations
    # - Whether labs/data support a clear direction
    # - Intent type: diagnostic/interpretation inherently higher uncertainty
    #   than optimization/medication_management
    # This is LLM-assessed in the classification prompt.
    return classification.diagnostic_uncertainty_score  # 0-10

def treatment_conflict_factor(classification, patient_profile):
    """Do the patient's conditions or medications create treatment conflicts?"""
    # Examples of conflicts:
    # - Beta-blocker needed for heart but worsens asthma
    # - NSAID needed for pain but patient has CKD
    # - TRT desired but patient has polycythemia risk
    # - Immunosuppression needed but patient has active infection history
    # This is LLM-assessed by the classifier. 0-10 scale.
    return classification.treatment_conflict_score  # 0-10

# === FINAL COMPUTATION ===

def compute_complexity(classification, patient_profile):
    raw = (
        organ_system_count(classification) * W_ORGANS +
        comorbidity_factor(patient_profile) * W_COMORBID +
        medication_factor(patient_profile) * W_MEDS +
        diagnostic_uncertainty(classification, patient_profile) * W_UNCERTAINTY +
        treatment_conflict_factor(classification, patient_profile) * W_CONFLICT
    )
    # raw is already 0-10 because all factors are 0-10 and weights sum to 1.0
    return round(raw, 1)
```

### Complexity Score to Panel Size Mapping

| Complexity Score | Panel Size | Discussion Rounds | Model Tier |
|-----------------|-----------|-------------------|-----------|
| 0.0 - 2.5 | 2 specialists (internist + 1 domain lead) | 2 rounds | Sonnet for both |
| 2.6 - 4.5 | 3 specialists (internist + 2 domain) | 2 rounds | Opus for lead, Sonnet for others |
| 4.6 - 6.5 | 4 specialists (internist + 3 domain) | 3 rounds | Opus for top 2, Sonnet for others |
| 6.6 - 8.5 | 5 specialists (internist + 4 domain) | 3 rounds | Opus for top 2, Sonnet for others |
| 8.6 - 10.0 | 5 specialists + pharmacologist mandatory | 3 rounds + synthesis round | Opus for top 3, Sonnet for others |

### Worked Examples

#### Example 1: Simple Optimization Query

**Question:** "What's the best form of magnesium for sleep?"
**Profile:** 32F, healthy, no medications, no conditions.

```
Axis 1: optimization
Axis 2: [NUTR, SLEEP]
Axis 3: optimization

organ_system_count: 2 domains → score 5
comorbidity_factor: 0 relevant conditions → score 0
medication_factor: 0 medications → score 1
diagnostic_uncertainty: low (clear question, clear domain) → score 2
treatment_conflict: none → score 0

COMPLEXITY = (5 * 0.25) + (0 * 0.25) + (1 * 0.15) + (2 * 0.20) + (0 * 0.15)
           = 1.25 + 0 + 0.15 + 0.40 + 0
           = 1.8

Panel: 2 specialists (internist + functional_medicine/nutritional)
Rounds: 2
Tier: Sonnet for both
```

#### Example 2: Moderate Multi-System Case

**Question:** "I'm on TRT and my hematocrit is 52%. My cardiologist is concerned. Should I lower my TRT dose or is there another approach?"
**Profile:** 42M, active conditions: hypogonadism, hypertension. Medications: testosterone cypionate 150mg/week, lisinopril 10mg, aspirin 81mg. Labs: hematocrit 52%, total T 980 ng/dL, PSA 1.2.

```
Axis 1: medication_management
Axis 2: [ENDO, HEME, CARDIO]
Axis 3: semi_urgent

organ_system_count: 3 domains → score 7
comorbidity_factor: 2 relevant (hypogonadism, hypertension both interact) → score 5
medication_factor: 3 active meds → score 3
diagnostic_uncertainty: moderate (hematocrit is clearly elevated, but optimal
    management approach has multiple perspectives) → score 5
treatment_conflict: TRT benefits vs hematocrit risk → score 6

COMPLEXITY = (7 * 0.25) + (5 * 0.25) + (3 * 0.15) + (5 * 0.20) + (6 * 0.15)
           = 1.75 + 1.25 + 0.45 + 1.00 + 0.90
           = 5.35

Panel: 4 specialists (internist + endocrinologist + hematologist + cardiologist)
Rounds: 3
Tier: Opus for endocrinologist + internist, Sonnet for hematologist + cardiologist
```

#### Example 3: High Complexity Polypharmacy Case

**Question:** "I'm on 8 medications for heart failure, diabetes, and depression. I've been having worsening fatigue, dizziness when standing, and my morning blood sugar has been erratic. My nephrologist also said my kidney function is declining. I need help understanding what's happening."
**Profile:** 62M. Active conditions: CHF (NYHA III), T2DM, MDD, CKD stage 3b, hypertension, hyperlipidemia. Medications: carvedilol, sacubitril/valsartan, spironolactone, empagliflozin, metformin, insulin glargine, sertraline, atorvastatin. Labs: eGFR 38, A1c 8.1, BNP 450, K+ 5.3, creatinine 1.9.

```
Axis 1: diagnostic
Axis 2: [CARDIO, RENAL, ENDO, PSYCH, PHARM]
Axis 3: urgent

organ_system_count: 5 domains → score 10
comorbidity_factor: 4+ relevant conditions → score 10
medication_factor: 8 meds + spironolactone with K+ 5.3 → score 9 (base 9 + narrow-ish TI = capped 10)
diagnostic_uncertainty: high (multiple overlapping causes of fatigue/dizziness,
    could be cardiac decompensation, orthostatic from meds, hypoglycemia,
    or renal deterioration) → score 8
treatment_conflict: high (metformin + declining eGFR, spironolactone + high K+,
    sertraline + cardiac meds, SGLT2i + declining renal) → score 9

COMPLEXITY = (10 * 0.25) + (10 * 0.25) + (10 * 0.15) + (8 * 0.20) + (9 * 0.15)
           = 2.50 + 2.50 + 1.50 + 1.60 + 1.35
           = 9.45

Panel: 5 specialists + pharmacologist mandatory
  (internist, cardiologist, nephrologist, endocrinologist, neuropsychiatrist, pharmacologist)
  Note: exceeds 5 -- pharmacologist is mandatory addition at this tier.
Rounds: 3 + synthesis round
Tier: Opus for internist + cardiologist + nephrologist, Sonnet for others
```

---

## 3. Specialist Routing Rules

### Static Domain Map

This is a deterministic lookup. The classifier's Axis 2 output is mapped through this table. No LLM inference in the routing step.

```python
DOMAIN_TO_SPECIALIST = {
    "CARDIO":  "cardiologist",
    "ENDO":    "endocrinologist",
    "NEURO":   "neurologist",
    "PSYCH":   "neuropsychiatrist",
    "GI":      "gastroenterologist",
    "RENAL":   "nephrologist",
    "PULM":    "pulmonologist",
    "MSK":     "rheumatologist",       # or sports_medicine if optimization context
    "DERM":    "dermatologist",
    "HEME":    "hematologist",
    "IMMUNE":  "immunologist",
    "REPRO":   "reproductive_endocrinologist",
    "HEPAT":   "hepatologist",
    "OPHTHO":  "ophthalmologist",
    "ENT":     "otolaryngologist",
    "NUTR":    "functional_medicine",   # also covers nutritional_medicine
    "PHARM":   "clinical_pharmacologist",
    "SLEEP":   "sleep_medicine",
    "PAIN":    "pain_management",
    "GERI":    "geriatrician",
}

# MSK override: if intent is "optimization" and domain is MSK,
# use sports_medicine instead of rheumatologist
def resolve_msk_specialist(intent):
    if intent == "optimization":
        return "sports_medicine"
    return "rheumatologist"
```

### Cross-Domain Interaction Rules

When specific domain PAIRS appear together, an additional specialist may be mandated because the interaction space between those domains is clinically dangerous or nuanced enough to require dedicated oversight.

```python
CROSS_DOMAIN_RULES = {
    # (domain_a, domain_b): additional_specialist_or_None
    # Order-independent: both (A,B) and (B,A) are checked

    ("ENDO", "CARDIO"):    "clinical_pharmacologist",
    # TRT + cardiac meds, thyroid + heart rate, diabetes + CVD risk.
    # Pharmacological interactions are the main concern.

    ("PSYCH", "ENDO"):     "clinical_pharmacologist",
    # Psych meds + hormones: SSRIs affect cortisol, antipsychotics affect
    # metabolic syndrome, lithium affects thyroid.

    ("RENAL", "CARDIO"):   None,  # Cardiorenal handled by both specialists
    # But internist must explicitly address cardiorenal syndrome in synthesis.

    ("RENAL", "ENDO"):     None,  # Diabetic nephropathy handled by both
    # But flag metformin/SGLT2i dose adjustment consideration.

    ("PHARM", "RENAL"):    None,  # Pharmacologist already covers renal dosing

    ("HEME", "ENDO"):      None,  # TRT + hematocrit: endocrinologist covers this
    # Unless hematocrit > 54%, then add hematologist even if not in domains.

    ("CARDIO", "PULM"):    None,  # Cardiopulmonary overlap handled by both

    ("PSYCH", "PAIN"):     "clinical_pharmacologist",
    # Opioid + psych med interactions, serotonin syndrome risk, dependency concerns.

    ("PSYCH", "SLEEP"):    None,  # Neuropsychiatrist covers sleep-psych overlap

    ("ENDO", "REPRO"):     None,  # Reproductive endocrinologist covers both

    ("NUTR", "PHARM"):     None,  # Pharmacologist covers supplement-drug interactions

    ("GI", "IMMUNE"):      None,  # Autoimmune GI handled by gastroenterologist
    # But flag IBD-specific immunology if relevant.

    ("NEURO", "PSYCH"):    None,  # Neuropsychiatrist covers this overlap

    ("CARDIO", "PHARM"):   None,  # Pharmacologist already present

    ("HEPAT", "PHARM"):    None,  # Pharmacologist covers hepatic metabolism

    ("GERI", "PHARM"):     None,  # Geriatric polypharmacy: pharmacologist mandatory
    # If GERI is present AND med_count >= 5, force add clinical_pharmacologist.
}

# Special auto-add rules (independent of cross-domain pairs)
FORCE_ADD_RULES = [
    {
        "condition": lambda profile: len([m for m in profile.medications
                                          if m.status == "active"]) >= 6,
        "add": "clinical_pharmacologist",
        "reason": "Polypharmacy threshold exceeded (6+ active medications)"
    },
    {
        "condition": lambda profile, domains: "GERI" in domains and
                     len([m for m in profile.medications
                          if m.status == "active"]) >= 5,
        "add": "clinical_pharmacologist",
        "reason": "Geriatric patient with polypharmacy"
    },
    {
        "condition": lambda profile: any(
            c.name.lower() in ["pregnancy", "pregnant"]
            for c in profile.conditions if c.status == "active"
        ),
        "add": "obstetrician",
        "reason": "Active pregnancy detected -- maternal-fetal medicine perspective required"
    },
]
```

### Priority Ranking When Panel Exceeds MAX_SPECIALISTS

When more specialists are indicated than the max allows (5, or 6 at complexity >= 8.6), the system must prioritize. Ranking criteria, applied in order:

```python
def prioritize_specialists(candidates, classification, patient_profile,
                           max_size=5):
    """
    Returns the top `max_size` specialists from the candidate list.
    Internist is always included and does not count toward the limit
    for prioritization purposes (it's pre-allocated).
    """
    # Remove internist (always included)
    candidates = [c for c in candidates if c != "internist"]
    max_remaining = max_size - 1  # -1 for internist

    scored = []
    for specialist in candidates:
        score = 0

        # Factor 1: Domain priority (position in Axis 2 list)
        # First domain = 10 pts, second = 7, third = 4, fourth = 2, fifth = 1
        DOMAIN_POSITION_SCORE = [10, 7, 4, 2, 1]
        domain = SPECIALIST_TO_DOMAIN[specialist]
        if domain in classification.organ_systems:
            idx = classification.organ_systems.index(domain)
            score += DOMAIN_POSITION_SCORE[min(idx, 4)]

        # Factor 2: Abnormal findings density
        # Count how many abnormal lab values fall in this specialist's domain
        abnormal_in_domain = count_abnormal_labs_in_domain(
            patient_profile.lab_results, domain
        )
        score += min(abnormal_in_domain * 2, 8)  # cap at 8

        # Factor 3: Medication interaction risk
        # If this specialist's domain has drugs with known interactions
        interaction_risk = count_interactions_in_domain(
            patient_profile.medications, domain
        )
        score += min(interaction_risk * 3, 9)  # cap at 9

        # Factor 4: Cross-domain interaction mandate
        # If this specialist was added by a cross-domain rule, +5
        if specialist in cross_domain_additions:
            score += 5

        # Factor 5: Safety signal
        # If urgency is urgent or emergent and this domain has the
        # primary concern, +10
        if classification.urgency in ("urgent", "emergent"):
            if domain == classification.organ_systems[0]:
                score += 10

        scored.append((specialist, score))

    # Sort descending by score
    scored.sort(key=lambda x: x[1], reverse=True)

    # Take top N
    selected = [s[0] for s in scored[:max_remaining]]

    # Always include internist
    return ["internist"] + selected
```

### The Internist Always-Included Rule

The internist (general internal medicine) agent is ALWAYS present on every panel, regardless of complexity score or domain composition. Rationale:

1. **Integration role:** The internist synthesizes across specialist domains, catching interactions and gaps that siloed specialists miss.
2. **Generalist perspective:** Provides the "whole-patient" view that individual specialists may not prioritize.
3. **Moderator function:** In multi-round discussions, the internist identifies contradictions between specialists and forces resolution.
4. **Safety net:** Catches cases where no single specialist has primary ownership (e.g., constitutional symptoms that could be anything).

The internist is always assigned the top model tier (Opus).

### Model Tier Assignment

```python
def assign_model_tiers(panel, complexity_score):
    """
    Assigns Claude model tier to each specialist on the panel.
    Opus = highest reasoning capability, highest cost.
    Sonnet = strong reasoning, lower cost.
    """
    tiers = {}

    # Internist always gets Opus
    tiers["internist"] = "opus"

    # Remove internist for remaining assignments
    others = [s for s in panel if s != "internist"]

    if complexity_score <= 2.5:
        # Simple case: all Sonnet (including internist override to Sonnet
        # -- actually no, internist stays Opus even here for consistency)
        for s in others:
            tiers[s] = "sonnet"

    elif complexity_score <= 4.5:
        # Lead specialist gets Opus, rest Sonnet
        if others:
            tiers[others[0]] = "opus"
            for s in others[1:]:
                tiers[s] = "sonnet"

    elif complexity_score <= 8.5:
        # Top 2 get Opus, rest Sonnet
        for i, s in enumerate(others):
            tiers[s] = "opus" if i < 2 else "sonnet"

    else:
        # Top 3 get Opus, rest Sonnet
        for i, s in enumerate(others):
            tiers[s] = "opus" if i < 3 else "sonnet"

    return tiers
```

---

## 4. The Classification Prompt

This is the actual prompt sent to Claude Haiku. It receives the user's question, the patient profile summary, and outputs the full classification JSON.

```
You are the Question Classification Agent for MedPanel, a medical AI exploration platform. Your job is to analyze a user's health question and their patient profile, then produce a structured classification that determines which specialist agents are assembled.

You must be fast, accurate, and deterministic. Do not explain your reasoning in prose. Output ONLY the JSON classification object.

=== CLASSIFICATION AXES ===

AXIS 1 -- CLINICAL INTENT (pick exactly one):
- diagnostic: User wants to understand what might cause symptoms or a condition
- therapeutic: User wants to explore treatment approaches or interventions
- prognostic: User wants to understand disease trajectory or outcomes
- preventive: User wants to reduce risk of a condition they don't have
- optimization: User wants to improve already-normal parameters
- medication_management: User has questions about current medications
- interpretation: User wants help understanding lab results or test reports
- second_opinion: User has a prior clinical opinion and wants additional perspectives

AXIS 2 -- ORGAN SYSTEMS (pick 1-5, ordered by relevance):
CARDIO, ENDO, NEURO, PSYCH, GI, RENAL, PULM, MSK, DERM, HEME, IMMUNE, REPRO, HEPAT, OPHTHO, ENT, NUTR, PHARM, SLEEP, PAIN, GERI

Rules:
- PHARM is auto-included when: question mentions 2+ medications, or mentions medication + supplement interaction, or patient has 5+ active medications.
- Order matters: first domain = primary, determines lead specialist.
- Use patient profile to disambiguate vague symptoms.

AXIS 3 -- URGENCY (pick exactly one):
- emergent: Active life-threatening symptoms (should trigger safety system override)
- urgent: Needs medical evaluation within 24-48 hours
- semi_urgent: Warrants medical attention within 1-2 weeks
- routine: Stable, exploratory, follow-up
- optimization: Healthy user seeking improvement beyond baseline

COMPLEXITY SUBSCORES -- Rate each 0-10:
- diagnostic_uncertainty: How ambiguous is the clinical picture? (0 = crystal clear, 10 = completely unclear)
- treatment_conflict: Do conditions/medications create competing treatment considerations? (0 = no conflicts, 10 = severe conflicts)

=== FEW-SHOT EXAMPLES ===

EXAMPLE 1:
Question: "What's the best form of magnesium for sleep?"
Profile: 32F, healthy, no medications, no conditions
Output:
{
  "intent": "optimization",
  "organ_systems": ["NUTR", "SLEEP"],
  "urgency": "optimization",
  "diagnostic_uncertainty": 1,
  "treatment_conflict": 0,
  "reasoning_brief": "Simple supplement question for sleep optimization in healthy individual"
}

EXAMPLE 2:
Question: "I'm on TRT and my hematocrit is 52%. My cardiologist is concerned. Should I lower my TRT dose or is there another approach?"
Profile: 42M, hypogonadism, hypertension. Meds: testosterone cypionate, lisinopril, aspirin. Hematocrit 52%, total T 980.
Output:
{
  "intent": "medication_management",
  "organ_systems": ["ENDO", "HEME", "CARDIO"],
  "urgency": "semi_urgent",
  "diagnostic_uncertainty": 5,
  "treatment_conflict": 6,
  "reasoning_brief": "TRT-induced polycythemia with competing needs: TRT benefits vs hematocrit risk vs cardiovascular safety"
}

EXAMPLE 3:
Question: "My father died of colon cancer at 58. I'm 35. What screening should I be getting?"
Profile: 35M, healthy, no conditions, no medications. Family history: father colon CA at 58.
Output:
{
  "intent": "preventive",
  "organ_systems": ["GI", "HEME"],
  "urgency": "routine",
  "diagnostic_uncertainty": 2,
  "treatment_conflict": 0,
  "reasoning_brief": "Screening guidance for familial colon cancer risk. Clear guidelines exist (colonoscopy 10 years before earliest family diagnosis). HEME included for tumor marker awareness."
}

EXAMPLE 4:
Question: "I've been having crushing chest pressure for the past 20 minutes and my left arm is tingling"
Profile: 55M, hypertension, smoker.
Output:
{
  "intent": "diagnostic",
  "organ_systems": ["CARDIO"],
  "urgency": "emergent",
  "diagnostic_uncertainty": 3,
  "treatment_conflict": 0,
  "reasoning_brief": "EMERGENCY: Active symptoms consistent with acute coronary syndrome. Classification aborted -- trigger safety system."
}

EXAMPLE 5:
Question: "My TSH is 4.2 mIU/L and free T4 is 0.9 ng/dL. My doctor says it's normal but I still feel exhausted."
Profile: 38F, fatigue x6 months, no medications. TSH 4.2, fT4 0.9, ferritin 22, vitamin D 18.
Output:
{
  "intent": "interpretation",
  "organ_systems": ["ENDO", "NUTR", "HEME"],
  "urgency": "routine",
  "diagnostic_uncertainty": 6,
  "treatment_conflict": 0,
  "reasoning_brief": "Borderline thyroid values with low ferritin and vitamin D -- multiple potential contributors to fatigue. Subclinical hypothyroidism vs nutritional deficiency vs both."
}

EXAMPLE 6:
Question: "My cardiologist wants to put me on a statin but my LDL is only 130 and I don't want to take it. Are there alternatives?"
Profile: 48M, family history MI. LDL 130, HDL 45, TG 180, Lp(a) 85 nmol/L. No conditions. No medications.
Output:
{
  "intent": "second_opinion",
  "organ_systems": ["CARDIO", "NUTR", "PHARM"],
  "urgency": "routine",
  "diagnostic_uncertainty": 4,
  "treatment_conflict": 3,
  "reasoning_brief": "Statin decision with elevated Lp(a) and family history creating risk despite borderline LDL. Patient seeking alternatives. NUTR for lifestyle/supplement approaches, PHARM for non-statin pharmacological options."
}

EXAMPLE 7:
Question: "I'm on metformin, atorvastatin, lisinopril, amlodipine, sertraline, and omeprazole. I just started feeling dizzy when I stand up. Could it be my medications?"
Profile: 58M, T2DM, hypertension, depression, GERD. 6 active medications as listed. BP 118/72.
Output:
{
  "intent": "medication_management",
  "organ_systems": ["PHARM", "CARDIO", "NEURO"],
  "urgency": "semi_urgent",
  "diagnostic_uncertainty": 5,
  "treatment_conflict": 4,
  "reasoning_brief": "Orthostatic symptoms in patient on dual antihypertensives with borderline-low BP. Polypharmacy threshold triggered. Multiple medications could contribute (amlodipine, lisinopril, sertraline). Needs evaluation but not emergent."
}

EXAMPLE 8:
Question: "I've been diagnosed with Hashimoto's and my doctor wants to wait and watch. Should I be doing something now?"
Profile: 34F, Hashimoto's thyroiditis (TPO Ab 340). TSH 5.8, fT4 0.8. No medications.
Output:
{
  "intent": "second_opinion",
  "organ_systems": ["ENDO", "IMMUNE"],
  "urgency": "routine",
  "diagnostic_uncertainty": 3,
  "treatment_conflict": 2,
  "reasoning_brief": "Subclinical hypothyroidism with confirmed autoimmune etiology. Watch-and-wait vs early intervention is a legitimate clinical debate. IMMUNE for autoimmune management perspective."
}

EXAMPLE 9:
Question: "What supplements help with joint pain? I lift weights 5 times a week and my knees are killing me."
Profile: 28M, healthy, no medications, resistance training 5x/week.
Output:
{
  "intent": "therapeutic",
  "organ_systems": ["MSK", "NUTR"],
  "urgency": "routine",
  "diagnostic_uncertainty": 4,
  "treatment_conflict": 0,
  "reasoning_brief": "Exercise-related joint pain in young athlete. Could be overuse, form-related, or early chondromalacia. Supplement focus makes NUTR relevant. MSK primary for differential."
}

EXAMPLE 10:
Question: "I'm 62 and on warfarin, metoprolol, and digoxin for atrial fibrillation. I want to try fish oil and turmeric supplements. Are these safe with my medications?"
Profile: 62M, atrial fibrillation, CHF. Medications: warfarin 5mg, metoprolol 50mg bid, digoxin 0.125mg. INR 2.4.
Output:
{
  "intent": "medication_management",
  "organ_systems": ["PHARM", "CARDIO", "NUTR"],
  "urgency": "semi_urgent",
  "diagnostic_uncertainty": 2,
  "treatment_conflict": 7,
  "reasoning_brief": "Fish oil and turmeric both have anticoagulant properties -- high interaction risk with warfarin. Digoxin is narrow therapeutic index. PHARM is primary. Semi-urgent because wrong combination could cause bleeding event."
}

EXAMPLE 11:
Question: "I've had anxiety my whole life but lately it's gotten way worse. I'm also losing weight without trying and my heart races at random times."
Profile: 29F, generalized anxiety disorder. No medications. HR resting 96.
Output:
{
  "intent": "diagnostic",
  "organ_systems": ["ENDO", "PSYCH", "CARDIO"],
  "urgency": "semi_urgent",
  "diagnostic_uncertainty": 7,
  "treatment_conflict": 0,
  "reasoning_brief": "Classic hyperthyroidism symptom triad (anxiety, weight loss, tachycardia) overlapping with known GAD. Need to differentiate thyroid from psychiatric. ENDO primary -- TSH/fT4 needed. Semi-urgent because untreated hyperthyroidism carries cardiac risk."
}

EXAMPLE 12:
Question: "How can I build a longevity-focused health protocol? I'm 40, healthy, and want to optimize everything."
Profile: 40M, healthy. No conditions, no medications. Exercise 4x/week. Labs all normal.
Output:
{
  "intent": "optimization",
  "organ_systems": ["GERI", "CARDIO", "ENDO", "NUTR"],
  "urgency": "optimization",
  "diagnostic_uncertainty": 1,
  "treatment_conflict": 0,
  "reasoning_brief": "Longevity optimization in healthy individual. GERI for aging science, CARDIO for cardiovascular prevention, ENDO for metabolic optimization, NUTR for supplement/nutrition protocol."
}

=== OUTPUT SCHEMA ===

Return ONLY this JSON object. No markdown, no explanation, no preamble.

{
  "intent": "<one of: diagnostic, therapeutic, prognostic, preventive, optimization, medication_management, interpretation, second_opinion>",
  "organ_systems": ["<DOMAIN_CODE>", ...],
  "urgency": "<one of: emergent, urgent, semi_urgent, routine, optimization>",
  "diagnostic_uncertainty": <0-10>,
  "treatment_conflict": <0-10>,
  "reasoning_brief": "<one sentence explaining the classification logic>"
}

=== INPUT ===

Question: {question_text}
Patient Profile Summary: {profile_summary}
Active Conditions: {conditions_list}
Active Medications: {medications_list}
Recent Lab Highlights: {abnormal_labs}
```

---

## 5. Emergency Detection Integration

### Architecture: Safety System Runs FIRST, Classification Runs SECOND

The classification system does NOT handle emergencies. The safety system (`SAFETY-SYSTEM.md`) is a pre-processing layer that evaluates every input before the classifier sees it.

```
User Input
    |
    v
[Stage 1: Regex Pattern Match] ──── HIT? ──> [Stage 3: LLM Contextual Check]
    |                                              |
    | (no hit)                                     ├── TRUE_EMERGENCY → Emergency Response (STOP)
    |                                              ├── TRUE_URGENT → Flag for classifier
    v                                              └── FALSE_POSITIVE → Continue to classifier
[Classification System]
    |
    ├── Axis 3 = emergent? ──> Secondary safety check (should not happen often)
    |                           Abort classification, trigger safety system
    |
    ├── Axis 3 = urgent? ──> Proceed with classification + attach safety wrapper
    |
    └── Axis 3 = other ──> Normal classification flow
```

### Override Rules

1. **Emergency detection ALWAYS takes priority over classification.** If the safety system flags a TRUE_EMERGENCY at Stage 1/3, the classification system is never invoked. The user receives the emergency response template immediately.

2. **Urgent flags carry forward.** If the safety system detects TRUE_URGENT, it passes a flag to the classifier. The classifier must set urgency to `urgent` or `semi_urgent` minimum. It cannot downgrade below the safety system's determination.

3. **Classifier emergency detection is a backup.** If the safety system's regex patterns miss an emergency (unlikely but possible for novel phrasings), the classifier may detect it via Axis 3 = `emergent`. In this case:
   - Classification is immediately aborted
   - The safety system's LLM classification prompt (Stage 3) is invoked as a verification step
   - If verified as TRUE_EMERGENCY, the emergency response is shown
   - If verified as something else, classification resumes with the corrected urgency

4. **Mid-classification detection.** The classifier prompt includes an instruction: if during classification the model identifies emergency signals it didn't initially catch, it should set urgency to `emergent` and stop filling other fields. The application layer detects `"urgency": "emergent"` in the output and routes to the safety system.

### The "Interrupt and Redirect" Flow

When emergency is detected after classification has already started (e.g., during specialist analysis):

```python
async def handle_classification_result(result):
    if result["urgency"] == "emergent":
        # ABORT: Do not proceed to specialist selection
        # Invoke safety system Stage 3 for verification
        safety_check = await verify_emergency(
            question=user_question,
            classification_context=result["reasoning_brief"]
        )

        if safety_check.classification in ("TRUE_EMERGENCY", "TRUE_URGENT"):
            # Show emergency response, do NOT show any specialist content
            return render_emergency_response(safety_check)
        else:
            # False positive from classifier
            # Re-run classification with urgency override
            result["urgency"] = safety_check.corrected_urgency
            return await proceed_to_specialist_selection(result)

    elif result["urgency"] == "urgent":
        # Proceed but wrap output in safety wrapper
        panel = select_specialists(result)
        output = await run_panel_discussion(panel, result)
        return wrap_with_safety_context(output, "urgent_care_redirect")

    else:
        # Normal flow
        panel = select_specialists(result)
        return await run_panel_discussion(panel, result)
```

### Emergency Signals the Classifier Must Catch

Even though the regex-based safety system runs first, the classifier serves as a second line of defense for signals that pattern matching might miss:

| Signal Type | Example | Why Regex Might Miss It |
|------------|---------|------------------------|
| Contextual emergency | "I doubled my insulin dose this morning and now I feel really weird" | No standard emergency keyword, but context is dangerous |
| Indirect emergency | "My vision is like looking through a curtain on one side" | Describes retinal detachment or stroke without naming them |
| Medication-induced emergency | "I ran out of my seizure medication 3 days ago and I'm feeling twitchy" | Abrupt withdrawal context requires medical knowledge |
| Lab value emergency | "My potassium came back at 6.2" | Requires knowing that K+ > 6.0 is dangerous |
| Combination emergency | "I'm on warfarin and I just fell down the stairs and hit my head" | Each element is benign alone; combination is dangerous |

The classifier prompt's instruction to flag these as `emergent` creates a safety net the pattern matcher cannot provide.

---

## 6. Validation

### Test Suite: 40 Diverse Questions with Expected Classifications

Each test case includes the question, a minimal patient profile, and the expected classification across all three axes plus expected complexity range.

#### Straightforward Classifications

| # | Question | Profile | Expected Intent | Expected Domains | Expected Urgency | Complexity Range |
|---|---------|---------|----------------|-----------------|-----------------|-----------------|
| 1 | "What's the best form of magnesium for sleep?" | 32F, healthy | optimization | [NUTR, SLEEP] | optimization | 1.0-2.5 |
| 2 | "My LDL is 185. Should I worry?" | 45M, no meds | interpretation | [CARDIO] | routine | 1.5-3.0 |
| 3 | "How can I prevent type 2 diabetes? Both parents have it." | 30F, BMI 27, prediabetes | preventive | [ENDO, NUTR] | routine | 2.0-3.5 |
| 4 | "I started lisinopril 2 weeks ago and have a dry cough. Is this normal?" | 52M, HTN, lisinopril 10mg | medication_management | [PHARM, PULM] | routine | 1.5-3.0 |
| 5 | "What does a GFR of 58 mean?" | 65F, T2DM, HTN | interpretation | [RENAL, ENDO] | semi_urgent | 3.0-5.0 |
| 6 | "My doctor diagnosed me with GERD and wants me on a PPI long-term. Is there another way?" | 41M, GERD | second_opinion | [GI, PHARM] | routine | 2.0-3.5 |
| 7 | "How do I optimize my testosterone naturally? Current level 520 ng/dL." | 35M, healthy | optimization | [ENDO, NUTR] | optimization | 1.5-2.5 |
| 8 | "Will my Hashimoto's get worse over time?" | 40F, Hashimoto's, levothyroxine | prognostic | [ENDO, IMMUNE] | routine | 2.5-4.0 |
| 9 | "What exercises are safe with a herniated disc at L4-L5?" | 38M, herniated disc L4-L5 | therapeutic | [MSK, PAIN] | routine | 2.0-3.5 |
| 10 | "I've been getting headaches every afternoon for the past month." | 44F, no conditions, on oral contraceptives | diagnostic | [NEURO, REPRO] | semi_urgent | 3.0-5.0 |

#### Multi-System and Complex Classifications

| # | Question | Profile | Expected Intent | Expected Domains | Expected Urgency | Complexity Range |
|---|---------|---------|----------------|-----------------|-----------------|-----------------|
| 11 | "I'm on TRT, my hematocrit is 54%, and I'm getting headaches." | 45M, hypogonadism, TRT, HTN | diagnostic | [HEME, ENDO, CARDIO, NEURO] | urgent | 6.0-8.0 |
| 12 | "I have IBS, anxiety, and can't sleep. Are these connected?" | 33F, IBS, GAD, insomnia | diagnostic | [GI, PSYCH, SLEEP] | routine | 4.0-6.0 |
| 13 | "My A1c is 7.8, eGFR is 45, and my cardiologist just found mild LVH. How do I manage all of this?" | 59M, T2DM, CKD3b, HTN. 5 medications | therapeutic | [ENDO, RENAL, CARDIO, PHARM] | semi_urgent | 7.0-9.0 |
| 14 | "I'm 6 weeks postpartum, breastfeeding, and my thyroid antibodies are through the roof. I also have terrible brain fog." | 31F, postpartum, Hashimoto's suspected, breastfeeding | diagnostic | [ENDO, IMMUNE, REPRO, NEURO] | semi_urgent | 5.5-7.5 |
| 15 | "I've been on prednisone for 8 months for lupus and I'm developing a buffalo hump, my blood sugar is climbing, and my bones hurt." | 42F, SLE, prednisone 20mg, fasting glucose 118 | medication_management | [IMMUNE, ENDO, MSK, PHARM] | semi_urgent | 6.5-8.5 |
| 16 | "I take warfarin, metoprolol, amiodarone, furosemide, spironolactone, and potassium. My INR was 4.2 last week." | 71M, AFib, CHF. INR 4.2, K+ 5.1 | medication_management | [PHARM, CARDIO, RENAL] | urgent | 7.0-9.0 |
| 17 | "I'm 70, on 12 medications, and I keep falling. My daughter thinks I'm on too many pills." | 70F, HTN, T2DM, osteoporosis, depression, OA. 12 meds | diagnostic | [GERI, PHARM, NEURO, MSK] | urgent | 8.0-10.0 |
| 18 | "I was just told my PSA jumped from 2.1 to 5.8 in one year. My urologist wants a biopsy." | 62M, BPH | second_opinion | [REPRO, HEME] | semi_urgent | 4.0-6.0 |
| 19 | "I have PCOS, insulin resistance, and I'm trying to get pregnant. My RE put me on metformin and letrozole." | 29F, PCOS, insulin resistance, metformin, letrozole | therapeutic | [REPRO, ENDO, PHARM] | routine | 5.0-7.0 |
| 20 | "I want to build a comprehensive longevity protocol: supplements, blood work schedule, exercise framework." | 40M, healthy, very active | optimization | [GERI, NUTR, CARDIO, ENDO] | optimization | 3.0-5.0 |

#### Edge Cases and Ambiguous Questions

| # | Question | Profile | Expected Intent | Expected Domains | Expected Urgency | Complexity Range | Edge Case Reason |
|---|---------|---------|----------------|-----------------|-----------------|-----------------|-----------------|
| 21 | "I just feel... off. Tired all the time, no motivation, brain fog." | 37M, no conditions, no meds | diagnostic | [ENDO, PSYCH, HEME, NUTR] | routine | 4.0-6.0 | Maximally vague; classifier must cast wide net |
| 22 | "Is creatine safe?" | 25M, healthy | optimization | [NUTR, RENAL] | optimization | 1.0-2.0 | Extremely terse; little context to work with |
| 23 | "My naturopath says I have adrenal fatigue and leaky gut. My endocrinologist says those aren't real diagnoses. Who's right?" | 44F, fatigue, IBS-like symptoms | second_opinion | [ENDO, GI, NUTR, IMMUNE] | routine | 5.0-7.0 | Conventional vs alternative medicine tension |
| 24 | "I read that statins cause dementia. I've been on one for 5 years. Should I be worried?" | 60M, hyperlipidemia, atorvastatin | medication_management | [PHARM, NEURO, CARDIO] | routine | 3.0-5.0 | Health misinformation concern |
| 25 | "My blood pressure is 142/91 at home. My doctor said it's fine because I was stressed." | 50M, no diagnosed HTN | second_opinion | [CARDIO] | semi_urgent | 2.5-4.0 | Potentially underdiagnosed condition |
| 26 | "I want to try a 72-hour water fast. Is it safe with my medications?" | 45F, T2DM, metformin, glipizide, lisinopril | therapeutic | [NUTR, ENDO, PHARM] | semi_urgent | 5.0-7.0 | Fasting + diabetes medications = safety concern |
| 27 | "Can I take my husband's leftover amoxicillin for my sore throat?" | 32F, healthy | medication_management | [PHARM, ENT] | routine | 1.5-3.0 | Medication misuse scenario |
| 28 | "My anxiety is so bad I can't leave the house and I've been thinking about just ending it all." | 28M, GAD, no meds | diagnostic | [PSYCH] | emergent | N/A | Emergency detection -- should trigger safety system, not classifier |
| 29 | "I stopped my antidepressant cold turkey 4 days ago because I felt fine." | 35F, MDD, was on venlafaxine 150mg | medication_management | [PSYCH, PHARM] | urgent | 4.0-6.0 | Venlafaxine discontinuation syndrome is medically dangerous |
| 30 | "What's better for inflammation: turmeric, boswellia, or omega-3?" | 50M, OA, no meds | therapeutic | [NUTR, MSK, IMMUNE] | routine | 2.0-3.5 | Supplement comparison -- therapeutic because targeting a condition |

#### Safety-Adjacent and Boundary Cases

| # | Question | Profile | Expected Intent | Expected Domains | Expected Urgency | Complexity Range | Notes |
|---|---------|---------|----------------|-----------------|-----------------|-----------------|-------|
| 31 | "I've been having chest tightness when I exercise for the past 2 weeks." | 50M, smoker, family hx MI | diagnostic | [CARDIO, PULM] | urgent | 4.0-6.0 | Exertional chest symptoms in high-risk patient |
| 32 | "I had a panic attack last night and thought I was having a heart attack. Now I'm fine but scared." | 28F, panic disorder | diagnostic | [PSYCH, CARDIO] | routine | 3.0-5.0 | Past tense, resolved. Not urgent despite scary language |
| 33 | "My child is 6 and has been complaining of stomach aches every morning before school." | N/A (pediatric) | diagnostic | [GI, PSYCH] | routine | 3.0-4.5 | Pediatric case -- classifier should note this for output framing |
| 34 | "I've been spotting between periods and my Pap smear came back abnormal." | 35F, no conditions | diagnostic | [REPRO, HEME] | semi_urgent | 4.0-5.5 | Cancer screening adjacent -- needs careful framing |
| 35 | "I take lithium and my hands are shaking and I've been vomiting since yesterday." | 42M, bipolar, lithium 900mg | medication_management | [PHARM, PSYCH, NEURO] | urgent | 5.5-7.5 | Possible lithium toxicity -- urgent but not emergent if alert/oriented |
| 36 | "My blood sugar was 45 this morning but I ate and feel okay now." | 55F, T2DM, insulin + glipizide | interpretation | [ENDO, PHARM] | semi_urgent | 4.0-6.0 | Was emergent, now resolved -- but recurrence risk is high |
| 37 | "I want to know everything about metformin." | 50M, T2DM, metformin 1000mg bid | interpretation | [PHARM, ENDO] | routine | 2.0-3.0 | Open-ended educational query |
| 38 | "I've had ringing in my ears since starting aspirin 325mg daily." | 68F, post-MI, aspirin | medication_management | [ENT, PHARM, CARDIO] | routine | 3.0-4.5 | Aspirin ototoxicity -- known side effect |
| 39 | "My ferritin is 8 but my hemoglobin is still normal. Should I supplement?" | 28F, heavy periods, ferritin 8, Hgb 12.1 | interpretation | [HEME, REPRO, NUTR] | semi_urgent | 3.5-5.0 | Iron deficiency without anemia -- undertreated condition |
| 40 | "I'm training for an Ironman. How do I prevent rhabdomyolysis and keep my kidneys safe?" | 32M, healthy athlete | preventive | [MSK, RENAL, NUTR] | optimization | 2.5-4.0 | MSK specialist should be sports_medicine given optimization context |

### Accuracy Targets

| Axis | Metric | Target | Measurement Method |
|------|--------|--------|-------------------|
| Intent (Axis 1) | Exact match accuracy | >= 85% | Classified intent matches human-labeled intent |
| Intent (Axis 1) | Top-2 accuracy (correct intent in top 2 if we allowed 2) | >= 95% | For ambiguous cases where two intents are defensible |
| Organ Systems (Axis 2) | Primary domain exact match | >= 90% | First domain in list matches human-labeled primary |
| Organ Systems (Axis 2) | Full domain set F1 score | >= 0.80 | Precision/recall across all domains in the set |
| Organ Systems (Axis 2) | No critical domain missed | >= 98% | A domain that would change the specialist panel is never omitted |
| Urgency (Axis 3) | Exact match accuracy | >= 90% | Classified urgency matches human label |
| Urgency (Axis 3) | No under-triage | >= 99% | urgent/emergent cases are never classified as routine/optimization |
| Urgency (Axis 3) | Over-triage tolerance | <= 15% | Acceptable to over-triage (safer direction) |
| Complexity | Within +/- 1.5 of human score | >= 85% | Human raters score 0-10, model within range |
| Emergency detection | True positive rate | >= 99.5% | Every genuine emergency is caught (classifier as backup to regex) |
| Emergency detection | False positive rate | <= 3% | Minimal unnecessary emergency escalations |

### Evaluation Protocol

1. **Gold standard creation:** 200 questions hand-labeled by 2 clinicians. Disagreements resolved by third clinician. Labels include all three axes + complexity score + specialist panel.

2. **Automated regression suite:** The 40 test cases above run as automated tests on every prompt change. Fail = any case outside expected range.

3. **Monthly accuracy review:** Sample 100 real classifications from production. Two reviewers independently label. Compute accuracy metrics against targets.

4. **Edge case bank:** Every misclassification in production is added to the test suite with the correct label. Bank grows over time; regressions are caught immediately.

5. **Urgency audit:** Quarterly audit of all `urgent` and `emergent` classifications. False negatives (missed urgency) trigger immediate prompt revision. This is the highest-priority metric.

---

## Appendix A: Classification Output JSON Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "MedPanel Question Classification",
  "description": "Output of the Haiku classifier. Feeds into specialist selection.",
  "type": "object",
  "required": ["intent", "organ_systems", "urgency", "diagnostic_uncertainty", "treatment_conflict", "reasoning_brief"],
  "properties": {
    "intent": {
      "type": "string",
      "enum": ["diagnostic", "therapeutic", "prognostic", "preventive", "optimization", "medication_management", "interpretation", "second_opinion"]
    },
    "organ_systems": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": ["CARDIO", "ENDO", "NEURO", "PSYCH", "GI", "RENAL", "PULM", "MSK", "DERM", "HEME", "IMMUNE", "REPRO", "HEPAT", "OPHTHO", "ENT", "NUTR", "PHARM", "SLEEP", "PAIN", "GERI"]
      },
      "minItems": 1,
      "maxItems": 5
    },
    "urgency": {
      "type": "string",
      "enum": ["emergent", "urgent", "semi_urgent", "routine", "optimization"]
    },
    "diagnostic_uncertainty": {
      "type": "integer",
      "minimum": 0,
      "maximum": 10
    },
    "treatment_conflict": {
      "type": "integer",
      "minimum": 0,
      "maximum": 10
    },
    "reasoning_brief": {
      "type": "string",
      "maxLength": 300,
      "description": "One sentence explaining the classification logic. For audit trail only."
    }
  }
}
```

## Appendix B: Domain-to-ICD10 Reverse Lookup

For mapping patient profile ICD-10 codes back to organ system domains during automated domain inference from the patient profile.

```python
ICD10_CHAPTER_TO_DOMAIN = {
    "A": "IMMUNE",    # Certain infectious diseases
    "B": "IMMUNE",    # Other infectious diseases (B15-B19 → HEPAT override)
    "C": "HEME",      # Neoplasms
    "D00-D48": "HEME",  # Neoplasms (benign)
    "D50-D89": "HEME",  # Blood/immune disorders
    "E00-E07": "ENDO",  # Thyroid
    "E08-E13": "ENDO",  # Diabetes
    "E15-E16": "ENDO",  # Other glucose regulation
    "E20-E35": "ENDO",  # Other endocrine
    "E40-E68": "NUTR",  # Nutritional
    "E70-E89": "ENDO",  # Metabolic
    "F": "PSYCH",        # Mental/behavioral
    "G": "NEURO",        # Nervous system (G47 → SLEEP override)
    "H00-H59": "OPHTHO", # Eye
    "H60-H95": "ENT",    # Ear
    "I": "CARDIO",        # Circulatory
    "J": "PULM",          # Respiratory
    "K00-K69": "GI",      # Digestive (non-hepatic)
    "K70-K77": "HEPAT",   # Liver
    "K80-K95": "GI",      # Other digestive
    "L": "DERM",           # Skin
    "M": "MSK",            # Musculoskeletal
    "N00-N39": "RENAL",   # Urinary/kidney
    "N40-N99": "REPRO",   # Reproductive/genital
    "O": "REPRO",          # Pregnancy
    "R": None,             # Symptoms -- map by specific code
    "Z": None,             # Health status -- map by context
}
```

## Appendix C: Integration Points

| System | Interface | Data Flow |
|--------|----------|-----------|
| Safety System (SAFETY-SYSTEM.md) | Classification receives `safety_flag` from pre-check; outputs `urgency: emergent` as backup detection | Safety → Classifier (flag in) / Classifier → Safety (emergency out) |
| Discussion Protocol (DISCUSSION-PROTOCOL.md) | Classification output feeds `select_specialists()` | Classifier → Panel Selection |
| Patient Profile (patient-profile.json) | Classifier reads conditions, medications, labs for context | Profile → Classifier (read only) |
| Consultation Schema (consultation.json) | Classification output stored in `consultation.classification` | Classifier → Consultation record |
| Evidence Pipeline (EVIDENCE-PIPELINE.md) | Organ systems + intent determine evidence retrieval queries | Classifier → Evidence retrieval query construction |
