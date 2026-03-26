# Skill: Validate Profile

## Trigger

User uploads or enters a patient profile. Indicators:
- User provides JSON matching the patient profile structure
- User describes patient demographics, labs, medications in natural language
- "Validate this profile"
- "Check this patient data"
- "Is this profile complete enough to run?"

## What This Skill Does

Validates a patient profile against the JSON schema, runs biological plausibility checks, scores profile completeness, and flags anomalies. Produces a structured report telling the user whether the profile is ready for consultation and what to fix.

## Files to Load

1. `schemas/patient-profile.json` -- the validation schema
2. `docs/specs/DISCUSSION-PROTOCOL.md` -- Section 1a (completeness scoring) and Edge Case 4 (data validation rules)

Do NOT load: prompts, evidence pipeline, safety system, services manifest.

## Step-by-Step Instructions

### Step 1: Parse Input

1. If the user provided JSON: validate it directly.
2. If the user provided natural language: extract structured data into the patient-profile.json format. Show the parsed profile back to the user for confirmation before proceeding.
3. If the user uploaded a file (PDF, image): note that OCR/extraction is needed. If available, extract. If not, ask user to provide structured data.

### Step 2: JSON Schema Validation

4. Validate the parsed profile against `schemas/patient-profile.json`.
5. Check all required fields:
   - `demographics` (required)
   - `demographics.age` (required, integer, 0-120)
   - `demographics.sex` (required, enum: male/female/other)
   - `chief_complaint` (required, string)
6. Check type correctness for all provided fields.
7. Check enum values are valid (e.g., `conditions[].status` must be one of `active, resolved, remission, suspected`).
8. Check format constraints (e.g., `created_at` must be ISO 8601 date-time, `profile_id` must be UUID).
9. Check pattern constraints (e.g., `icd10_code` must match `^[A-Z][0-9]{2}(\.[0-9]{1,4})?$`).
10. Report all schema violations with field path, expected type/value, and actual value.

### Step 3: Completeness Scoring

11. Apply the completeness scoring function from DISCUSSION-PROTOCOL.md Section 1a:

    ```
    Field weights:
    - age: 10 (critical)
    - sex: 10 (critical)
    - current_medications: 10 (critical)
    - known_conditions: 8 (critical)
    - allergies: 8 (critical)
    - consultation_question: 10 (critical)
    - lab_results: 8 (important)
    - weight: 4 (helpful)
    - height: 3 (helpful)
    - supplements: 5 (important)
    - family_history: 3 (helpful)
    - lifestyle: 3 (helpful)
    ```

12. Calculate total score as percentage (0-100%).
13. Determine proceed/block decision:
    - **BLOCK** if any critical field is missing
    - **BLOCK** if score < 50%
    - **WARN** if score 50-69% (proceed with uncertainty warnings)
    - **PROCEED** if score >= 70%
14. List all missing fields categorized as critical / important / helpful.

### Step 4: Biological Plausibility Checks

15. Apply plausibility range checks from DISCUSSION-PROTOCOL.md Edge Case 4:

    ```
    Plausibility ranges:
    - testosterone_nmol: male 0.3-150, female 0.1-10
    - glucose_mmol: 1.0-40.0
    - potassium_mmol: 1.5-8.0
    - sodium_mmol: 110-170
    - creatinine_umol: 10-2000
    - tsh_miu: 0.01-100
    - heart_rate_bpm: 25-250
    - systolic_bp: 60-280
    - bmi: 10-70
    ```

16. For each lab value provided, check against the plausible range.
17. If a value is outside the range: flag as `biologically_implausible` with severity `critical`. Include the expected range.

### Step 5: Internal Consistency Checks

18. Apply consistency rules from DISCUSSION-PROTOCOL.md:
    - **LH suppressed without exogenous testosterone:** LH < 0.5 but no testosterone in medications list.
    - **High hematocrit without TRT:** Hematocrit > 54 without testosterone listed.
    - **Contradictory thyroid:** TSH < 0.1 and free T4 < 10 (central hypothyroidism or lab error).
    - **Impossible lipid math:** Total cholesterol does not equal LDL + HDL + TG/2.2 (Friedewald equation mismatch > 20 units).
    - **Age-medication mismatch:** Patient under 25 on medications typically for older adults.
19. For each triggered rule: flag as `internal_inconsistency` with description and suggested action.

### Step 6: Temporal Consistency Checks

20. If multiple lab readings exist for the same test:
    - Sort by date.
    - Calculate percent change between consecutive readings.
    - Check against maximum expected daily change rates:
      ```
      testosterone_nmol: 5% per day max
      hba1c_pct: 0.3% per 100 days
      creatinine_umol: 2% per day max
      ```
    - If actual change exceeds 3x expected rate: flag as `temporal_anomaly` with both values, dates, and the change percentage.

### Step 7: Additional Validation (Not in Schema)

21. **BMI consistency:** If height and weight are provided, verify BMI matches calculated value (BMI = weight_kg / (height_cm/100)^2). Flag if stated BMI differs by more than 1.0.
22. **Medication-condition coherence:** If medications are listed, check that at least one condition explains the prescription (e.g., lisinopril without hypertension listed is suspicious).
23. **Date sanity:** Ensure no dates are in the future. Ensure onset_date is before or equal to current date.
24. **Duplicate detection:** Check for duplicate entries in medications, conditions, or lab_results arrays.

## Output Format

```
# Profile Validation Report

## Decision: PROCEED / WARN / BLOCK
Completeness Score: XX% (XX/XX points)

## Schema Validation
- [PASS/FAIL] Required fields: [details]
- [PASS/FAIL] Type checks: [details]
- [PASS/FAIL] Enum values: [details]
- [PASS/FAIL] Format constraints: [details]

## Completeness
### Critical (must fix before consultation)
- [field]: missing / present
### Important (will reduce analysis quality)
- [field]: missing / present
### Helpful (nice to have)
- [field]: missing / present

## Plausibility Checks
- [PASS/FLAG] [lab_name]: value XX [unit] -- [plausible/implausible] (range: XX-XX)

## Consistency Checks
- [PASS/FLAG] [rule_name]: [description]

## Anomalies
- [anomaly description with specific values and suggested action]

## Recommendations
1. [Most important fix to make the profile consultation-ready]
2. [Next priority]
3. [etc.]
```

## Error Handling

- **Input is not valid JSON:** Attempt to parse as natural language. If unclear, ask user to provide structured data or confirm extracted values.
- **Input is empty or minimal (just a question):** Build a minimal profile skeleton with the question as `chief_complaint`. Run completeness scoring to show what is missing. Guide user through filling critical fields.
- **Lab values use different units than expected:** Note the unit provided. If convertible (e.g., mg/dL to mmol/L), convert and validate. If unclear, ask user to confirm units.
- **Conflicting information:** Flag both values and ask user which is correct. Do not silently choose one.
