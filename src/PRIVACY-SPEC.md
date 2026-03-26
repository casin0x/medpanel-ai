# GDPR Privacy Architecture -- MedPanel AI

**Spec Phase:** 3.5
**Upstream:** `PRODUCT-POSITIONING.md` (GDPR section), `DISCUSSION-PROTOCOL.md` (Section 2c privacy), `SERVICES-MANIFEST.md` (API data flows), `patient-profile.json` (data model)
**Downstream:** `src/lib/privacy/` (de-identification pipeline), `src/lib/consent/` (consent management), Supabase RLS policies

---

## 1. Data Classification

MedPanel processes GDPR Article 9 special category data (health data). All patient data is classified into three tiers with strict boundaries.

### Tier 1: PII (Personally Identifiable Information)

| Field | Source | Storage | Who Sees It | Encryption |
|-------|--------|---------|-------------|------------|
| `profile_id` | System-generated UUID | Supabase EU (`patient_profiles`) | User only, system for session lookup | AES-256 at rest, TLS 1.3 in transit |
| `created_at` / `updated_at` | System timestamps | Supabase EU | User only | AES-256 at rest |
| Email address | Auth provider | Supabase Auth (EU) | User only, auth system | Supabase Auth encryption |
| `demographics.country` | User input | Supabase EU | User only | AES-256 at rest, RLS enforced |
| `demographics.ethnicity` | User input | Supabase EU | User only | AES-256 at rest, RLS enforced |
| `social_history.occupation` | User input | Supabase EU | User only | AES-256 at rest, RLS enforced |
| `social_history.living_situation` | User input | Supabase EU | User only | AES-256 at rest, RLS enforced |
| Exact dates (`onset_date`, `start_date`, `lab_results[].date`, `surgical_history[].date`) | User input | Supabase EU | User only | AES-256 at rest, RLS enforced |
| `lab_results[].lab_name` | User input | Supabase EU | User only | AES-256 at rest, RLS enforced |
| `mental_health.trauma_history` (free text) | User input | Supabase EU | User only | AES-256 at rest, RLS enforced |
| `family_history[].relationship` + context | User input | Supabase EU | User only | AES-256 at rest, RLS enforced |

**Rule:** Tier 1 data NEVER leaves Supabase EU infrastructure. Never sent to any external API. Never stored outside the user's own encrypted row.

### Tier 2: Sensitive Health Data (Clinical, De-identified)

| Field | Source | Storage | Who Sees It | Encryption |
|-------|--------|---------|-------------|------------|
| `demographics.age` | User input | In-memory during consultation | LLM agents (de-identified payload) | TLS 1.3 in transit to API |
| `demographics.sex` | User input | In-memory during consultation | LLM agents | TLS 1.3 in transit |
| `demographics.height_cm` / `weight_kg` / `bmi` | User input / computed | In-memory during consultation | LLM agents | TLS 1.3 in transit |
| `conditions[].name` / `status` / `severity` | User input | In-memory during consultation | LLM agents | TLS 1.3 in transit |
| `medications[].name` / `dose` / `frequency` | User input | In-memory, DrugBank queries | LLM agents, DrugBank API | TLS 1.3 in transit |
| `lab_results[].name` / `value` / `unit` / `reference_range` / `interpretation` | User input | In-memory during consultation | LLM agents | TLS 1.3 in transit |
| `allergies[]` (substance, type, severity, reaction) | User input | In-memory during consultation | LLM agents | TLS 1.3 in transit |
| `vitals` (BP, HR, SpO2, etc.) | User input | In-memory during consultation | LLM agents | TLS 1.3 in transit |
| `mental_health.diagnoses` | User input | In-memory during consultation | LLM agents | TLS 1.3 in transit |
| `mental_health.phq9_score` / `gad7_score` | User input | In-memory during consultation | LLM agents | TLS 1.3 in transit |
| `social_history.smoking` / `alcohol` / `exercise` / `diet` / `sleep` / `stress_level` | User input | In-memory during consultation | LLM agents | TLS 1.3 in transit |
| `family_history[].condition` / `age_of_onset` (no relationship detail) | User input | In-memory during consultation | LLM agents | TLS 1.3 in transit |
| `chief_complaint` | User input | In-memory during consultation | LLM agents | TLS 1.3 in transit |
| `goals[]` | User input | In-memory during consultation | LLM agents | TLS 1.3 in transit |

**Rule:** Tier 2 data is sent to external APIs only after the de-identification pipeline (Section 2) strips all Tier 1 fields. Tier 2 data exists in-memory during the consultation and in the stored consultation record (encrypted, user-owned).

### Tier 3: De-identified / Aggregate

| Field | Transformation | Storage | Who Sees It |
|-------|---------------|---------|-------------|
| Age range | `age` -> 5-year bucket (25-29, 30-34, ...) | `aggregate_outcomes` table | Analytics only |
| Sex | Kept as-is | `aggregate_outcomes` table | Analytics only |
| BMI range | `bmi` -> 5-unit bucket (20-24, 25-29, ...) | `aggregate_outcomes` table | Analytics only |
| Lab values | Exact values -> percentile ranges | `aggregate_outcomes` table | Analytics only |
| Medications | Kept, but rare combinations suppressed (k < 5) | `aggregate_outcomes` table | Analytics only |
| Conditions | Kept as structured codes only | `aggregate_outcomes` table | Analytics only |
| Free text | Removed entirely | Not stored | Nobody |
| Dates | Absolute -> relative (day 0, day 30, day 60) | `aggregate_outcomes` table | Analytics only |
| User ID | Replaced with random UUID per analysis run | `aggregate_outcomes` table | No join path to Tier 1 |

**Rule:** k-anonymity >= 5. If a demographic bucket has fewer than 5 users, suppress it. No join path back to Tier 1. Stored in a separate anonymized database/schema.

---

## 2. De-identification Pipeline

The de-identification pipeline runs server-side before ANY data is sent to external APIs (Claude, GPT, Perplexity, etc.). It transforms a full `PatientProfile` into a `DeidentifiedProfile` that retains clinical utility while stripping all PII.

### 2a. Field-by-Field Transformation Rules

| Field | Action | Rationale |
|-------|--------|-----------|
| `profile_id` | **REMOVE** | Direct identifier |
| `created_at` / `updated_at` | **REMOVE** | Temporal fingerprint |
| `demographics.age` | **KEEP** | Needed for clinical reasoning (age-specific reference ranges, risk stratification) |
| `demographics.sex` | **KEEP** | Needed for clinical reasoning (sex-specific reference ranges, drug metabolism) |
| `demographics.height_cm` | **KEEP** | Needed for dosing, BMI |
| `demographics.weight_kg` | **KEEP** | Needed for dosing, BMI |
| `demographics.bmi` | **KEEP** | Needed for metabolic assessment |
| `demographics.body_fat_percentage` | **KEEP** | Needed for metabolic assessment |
| `demographics.ethnicity` | **REMOVE** | PII; pharmacogenomic relevance handled via explicit CYP status if available |
| `demographics.country` | **REMOVE** | Location = PII |
| `conditions[].name` | **KEEP** | Needed for reasoning |
| `conditions[].icd10_code` / `snomed_code` | **KEEP** | Needed for structured reasoning |
| `conditions[].status` / `severity` | **KEEP** | Needed for reasoning |
| `conditions[].onset_date` | **TRANSFORM** -> relative duration ("diagnosed 3 months ago", "diagnosed 5 years ago") | Exact dates are PII; relative duration retains clinical utility |
| `conditions[].notes` | **SCRUB** (see free text rules below) | May contain PII |
| `medications[].name` | **KEEP** | Needed for interaction checking and clinical reasoning |
| `medications[].rxnorm_cui` | **KEEP** | Needed for structured lookups |
| `medications[].dose` / `frequency` / `route` / `status` | **KEEP** | Needed for dosing assessment |
| `medications[].start_date` / `end_date` | **TRANSFORM** -> relative duration | Exact dates are PII |
| `medications[].prescribing_reason` | **KEEP** | Clinical context |
| `medications[].notes` | **SCRUB** | May contain PII |
| `allergies[]` | **KEEP** all structured fields | Safety-critical, no PII in structured fields |
| `vitals` | **KEEP** all values | Clinical data, no PII |
| `vitals.measured_at` | **TRANSFORM** -> relative ("measured 2 days ago") | Exact timestamps are PII |
| `lab_results[].name` / `value` / `unit` / `reference_range` / `interpretation` / `loinc_code` | **KEEP** | Needed for clinical reasoning |
| `lab_results[].date` | **TRANSFORM** -> relative ("drawn 3 weeks ago") | Exact dates are PII |
| `lab_results[].lab_name` | **REMOVE** | Location-identifying |
| `lab_results[].notes` | **SCRUB** | May contain PII |
| `family_history[].condition` | **KEEP** | Needed for risk assessment |
| `family_history[].age_of_onset` | **KEEP** | Needed for risk assessment |
| `family_history[].relationship` | **GENERALIZE** -> "first-degree relative" / "second-degree relative" | Reduces specificity while retaining genetic risk signal |
| `family_history[].deceased` / `age_at_death` / `cause_of_death` | **KEEP** (de-linked from relationship) | Needed for risk assessment |
| `surgical_history[].procedure` | **KEEP** | Clinical history |
| `surgical_history[].date` | **TRANSFORM** -> relative | Exact dates are PII |
| `surgical_history[].notes` | **SCRUB** | May contain PII |
| `social_history.smoking` / `alcohol` / `substance_use` | **KEEP** structured fields | Clinical relevance |
| `social_history.substance_use[].quit_date` | **TRANSFORM** -> relative duration | Exact dates are PII |
| `social_history.exercise` / `diet` / `sleep` | **KEEP** | Clinical relevance |
| `social_history.occupation` | **REMOVE** | Identifying |
| `social_history.stress_level` | **KEEP** | Clinical relevance |
| `social_history.living_situation` | **REMOVE** | Identifying |
| `mental_health.diagnoses` | **KEEP** | Clinical relevance |
| `mental_health.trauma_history` | **SCRUB** (see free text rules) | High PII risk in free text |
| `mental_health.current_therapy` / `therapy_type` | **KEEP** | Clinical relevance |
| `mental_health.phq9_score` / `gad7_score` | **KEEP** | Clinical relevance |
| `mental_health.substance_use_recovery` | **KEEP** structured fields | Clinical relevance |
| `goals[]` | **SCRUB** | May contain identifying context |
| `chief_complaint` | **SCRUB** | Free text, may contain names/locations |
| `completeness_score` | **REMOVE** | Internal metadata |

### 2b. Free Text Scrubbing Rules

Free text fields (`chief_complaint`, `trauma_history`, `notes`, `goals[]`) require entity-level scrubbing:

| Entity Type | Action | Example |
|-------------|--------|---------|
| Person names | Replace with role label | "Dr. Smith told me" -> "My doctor told me" |
| Location names (cities, hospitals, clinics) | Remove entirely | "at Mayo Clinic" -> "at a medical center" |
| Dates (absolute) | Convert to relative | "on January 15, 2025" -> "approximately 14 months ago" |
| Phone numbers | Remove | Stripped entirely |
| Email addresses | Remove | Stripped entirely |
| Addresses | Remove | Stripped entirely |
| Employer names | Remove | "I work at Google" -> "I work in the technology industry" |
| Names of family members | Replace with relationship | "my sister Maria" -> "my sibling" |
| Insurance/policy numbers | Remove | Stripped entirely |
| Medical record numbers | Remove | Stripped entirely |

**Implementation:** Use a two-pass approach:
1. **Regex pass:** Catch structured PII patterns (emails, phones, dates in common formats, numbers matching MRN/policy patterns)
2. **NER pass:** Use a local NER model (spaCy or similar, running on our infrastructure, NOT sent to an external API) to detect person names, organization names, and location entities in free text

**Fallback:** If NER confidence < 0.7 on a detected entity, err on the side of removal. False positives (removing non-PII) are acceptable; false negatives (leaving PII) are not.

### 2c. TypeScript Interface

```typescript
// src/lib/privacy/types.ts

import type { PatientProfile } from '@/types/patient-profile';

/**
 * The de-identified profile sent to external LLM APIs.
 * All Tier 1 (PII) fields are stripped or transformed.
 * All free text fields have been entity-scrubbed.
 */
export interface DeidentifiedProfile {
  // Demographics (subset — no country, ethnicity, profile_id)
  demographics: {
    age: number;
    sex: 'male' | 'female' | 'other';
    height_cm?: number;
    weight_kg?: number;
    bmi?: number;
    body_fat_percentage?: number;
  };

  chief_complaint: string; // Scrubbed free text

  conditions: Array<{
    name: string;
    icd10_code?: string;
    snomed_code?: string;
    status: 'active' | 'resolved' | 'remission' | 'suspected';
    onset_relative: string; // "3 months ago", "5 years ago" (transformed from onset_date)
    severity?: 'mild' | 'moderate' | 'severe';
    notes?: string; // Scrubbed
  }>;

  medications: Array<{
    name: string;
    rxnorm_cui?: string;
    type?: 'prescription' | 'otc' | 'supplement' | 'prn';
    dose?: string;
    frequency?: string;
    route?: string;
    status: 'active' | 'discontinued' | 'planned';
    duration_relative?: string; // "started 6 months ago" (transformed from start_date)
    prescribing_reason?: string;
    notes?: string; // Scrubbed
  }>;

  allergies: Array<{
    substance: string;
    type: 'allergy' | 'intolerance' | 'sensitivity';
    severity?: 'mild' | 'moderate' | 'severe' | 'life_threatening';
    reaction?: string;
    verified?: boolean;
  }>;

  vitals?: {
    blood_pressure_systolic?: number;
    blood_pressure_diastolic?: number;
    bp_measurement_context?: string;
    heart_rate_resting?: number;
    respiratory_rate?: number;
    temperature_c?: number;
    spo2?: number;
    measured_relative?: string; // "measured 2 days ago"
  };

  lab_results: Array<{
    name: string;
    loinc_code?: string;
    value?: number;
    value_string?: string;
    unit: string;
    reference_range_low?: number;
    reference_range_high?: number;
    interpretation?: 'normal' | 'high' | 'low' | 'critical_high' | 'critical_low';
    date_relative: string; // "drawn 3 weeks ago"
    trend?: 'improving' | 'stable' | 'worsening' | 'insufficient_data';
    // lab_name: REMOVED
    // notes: scrubbed or removed
  }>;

  family_history: Array<{
    relationship_degree: 'first_degree' | 'second_degree'; // Generalized from specific relationship
    condition: string;
    age_of_onset?: number;
    deceased?: boolean;
    age_at_death?: number;
    cause_of_death?: string;
  }>;

  surgical_history: Array<{
    procedure: string;
    date_relative: string; // "5 years ago"
    notes?: string; // Scrubbed
  }>;

  social_history: {
    smoking?: {
      status: 'never' | 'former' | 'current';
      quit_relative?: string; // "quit 2 years ago"
      pack_years?: number;
    };
    alcohol?: {
      status: 'never' | 'former' | 'occasional' | 'moderate' | 'heavy';
      quit_relative?: string;
    };
    substance_use?: Array<{
      substance: string;
      status: 'never' | 'former' | 'current';
      quit_relative?: string;
      duration?: string;
      notes?: string; // Scrubbed
    }>;
    exercise?: {
      type?: string;
      frequency_per_week?: number;
      duration_minutes?: number;
    };
    diet?: {
      description?: string;
      restrictions?: string[];
      protein_g_per_day?: number;
      calories_per_day?: number;
    };
    sleep?: {
      hours_per_night?: number;
      quality?: 'good' | 'fair' | 'poor';
      issues?: string[];
    };
    // occupation: REMOVED
    stress_level?: 'low' | 'moderate' | 'high' | 'severe';
    // living_situation: REMOVED
  };

  mental_health?: {
    diagnoses?: string[];
    trauma_history?: string; // Scrubbed — names/locations/dates removed
    current_therapy?: 'none' | 'planned' | 'active';
    therapy_type?: string;
    phq9_score?: number;
    gad7_score?: number;
    substance_use_recovery?: {
      in_recovery?: boolean;
      months_sober?: number;
      substances_recovered_from?: string[];
    };
  };

  goals?: string[]; // Scrubbed
}

/**
 * Result of the de-identification process.
 * Includes the cleaned profile and an audit trail.
 */
export interface DeidentificationResult {
  profile: DeidentifiedProfile;
  audit: DeidentificationAudit;
}

/**
 * Audit trail for the de-identification process.
 * Stored server-side, never sent to external APIs.
 * Required for GDPR accountability (Article 5(2)).
 */
export interface DeidentificationAudit {
  consultation_id: string;
  user_id: string; // For the user's own access/deletion rights
  timestamp: string; // ISO 8601
  fields_removed: string[]; // e.g., ["demographics.country", "demographics.ethnicity", ...]
  fields_transformed: Array<{
    field: string;
    transformation: 'date_to_relative' | 'relationship_generalized' | 'free_text_scrubbed';
  }>;
  free_text_entities_scrubbed: Array<{
    field: string;
    entity_type: 'person_name' | 'location' | 'date' | 'phone' | 'email' | 'address' | 'employer' | 'family_name' | 'mrn' | 'insurance';
    original_length: number; // NOT the original text — just length for audit
    replacement: string;
    confidence: number;
  }>;
  ner_model_version: string;
  pipeline_version: string;
}

/**
 * Core de-identification function signature.
 */
export type DeidentifyFn = (
  profile: PatientProfile,
  referenceDate: Date, // For computing relative dates
  consultationId: string,
) => Promise<DeidentificationResult>;
```

### 2d. De-identification Function Pseudocode

```typescript
// src/lib/privacy/deidentify.ts

import type { PatientProfile } from '@/types/patient-profile';
import type { DeidentifiedProfile, DeidentificationResult, DeidentificationAudit } from './types';
import { scrubFreeText } from './scrubber';
import { toRelativeDate } from './date-utils';

const RELATIONSHIP_MAP: Record<string, 'first_degree' | 'second_degree'> = {
  father: 'first_degree',
  mother: 'first_degree',
  sibling: 'first_degree',
  child: 'first_degree',
  grandparent_paternal: 'second_degree',
  grandparent_maternal: 'second_degree',
  other: 'second_degree',
};

export async function deidentify(
  profile: PatientProfile,
  referenceDate: Date,
  consultationId: string,
): Promise<DeidentificationResult> {
  const audit: DeidentificationAudit = {
    consultation_id: consultationId,
    user_id: profile.profile_id,
    timestamp: new Date().toISOString(),
    fields_removed: [],
    fields_transformed: [],
    free_text_entities_scrubbed: [],
    ner_model_version: NER_MODEL_VERSION,
    pipeline_version: PIPELINE_VERSION,
  };

  // 1. Strip Tier 1 fields entirely
  audit.fields_removed.push(
    'profile_id', 'created_at', 'updated_at',
    'demographics.country', 'demographics.ethnicity',
    'social_history.occupation', 'social_history.living_situation',
    'completeness_score',
  );

  // 2. Scrub free text fields
  const chiefComplaint = await scrubFreeText(profile.chief_complaint, 'chief_complaint', audit);
  const traumaHistory = profile.mental_health?.trauma_history
    ? await scrubFreeText(profile.mental_health.trauma_history, 'mental_health.trauma_history', audit)
    : undefined;
  const goals = profile.goals
    ? await Promise.all(profile.goals.map((g, i) => scrubFreeText(g, `goals[${i}]`, audit)))
    : undefined;

  // 3. Transform dates to relative
  const conditions = (profile.conditions ?? []).map(c => {
    const onset_relative = c.onset_date
      ? toRelativeDate(c.onset_date, referenceDate)
      : undefined;
    if (c.onset_date) {
      audit.fields_transformed.push({ field: `conditions[${c.name}].onset_date`, transformation: 'date_to_relative' });
    }
    const notes = c.notes ? scrubFreeTextSync(c.notes, `conditions[${c.name}].notes`, audit) : undefined;
    return {
      name: c.name,
      icd10_code: c.icd10_code,
      snomed_code: c.snomed_code,
      status: c.status,
      onset_relative,
      severity: c.severity,
      notes,
    };
  });

  // 4. Transform medication dates
  const medications = (profile.medications ?? []).map(m => {
    const duration_relative = m.start_date
      ? toRelativeDate(m.start_date, referenceDate)
      : undefined;
    if (m.start_date) {
      audit.fields_transformed.push({ field: `medications[${m.name}].start_date`, transformation: 'date_to_relative' });
    }
    return {
      name: m.name,
      rxnorm_cui: m.rxnorm_cui,
      type: m.type,
      dose: m.dose,
      frequency: m.frequency,
      route: m.route,
      status: m.status,
      duration_relative,
      prescribing_reason: m.prescribing_reason,
    };
  });

  // 5. Transform lab dates, remove lab_name
  const labResults = (profile.lab_results ?? []).map(lr => {
    audit.fields_removed.push(`lab_results[${lr.name}].lab_name`);
    audit.fields_transformed.push({ field: `lab_results[${lr.name}].date`, transformation: 'date_to_relative' });
    return {
      name: lr.name,
      loinc_code: lr.loinc_code,
      value: lr.value,
      value_string: lr.value_string,
      unit: lr.unit,
      reference_range_low: lr.reference_range_low,
      reference_range_high: lr.reference_range_high,
      interpretation: lr.interpretation,
      date_relative: toRelativeDate(lr.date, referenceDate),
    };
  });

  // 6. Generalize family history relationships
  const familyHistory = (profile.family_history ?? []).map(fh => {
    audit.fields_transformed.push({ field: `family_history[${fh.condition}].relationship`, transformation: 'relationship_generalized' });
    return {
      relationship_degree: RELATIONSHIP_MAP[fh.relationship ?? 'other'] ?? 'second_degree',
      condition: fh.condition,
      age_of_onset: fh.age_of_onset,
      deceased: fh.deceased,
      age_at_death: fh.age_at_death,
      cause_of_death: fh.cause_of_death,
    };
  });

  // 7. Assemble de-identified profile
  const deidentified: DeidentifiedProfile = {
    demographics: {
      age: profile.demographics.age,
      sex: profile.demographics.sex,
      height_cm: profile.demographics.height_cm,
      weight_kg: profile.demographics.weight_kg,
      bmi: profile.demographics.bmi,
      body_fat_percentage: profile.demographics.body_fat_percentage,
    },
    chief_complaint: chiefComplaint,
    conditions,
    medications,
    allergies: (profile.allergies ?? []).map(a => ({
      substance: a.substance,
      type: a.type,
      severity: a.severity,
      reaction: a.reaction,
      verified: a.verified,
    })),
    vitals: profile.vitals ? {
      blood_pressure_systolic: profile.vitals.blood_pressure_systolic,
      blood_pressure_diastolic: profile.vitals.blood_pressure_diastolic,
      bp_measurement_context: profile.vitals.bp_measurement_context,
      heart_rate_resting: profile.vitals.heart_rate_resting,
      respiratory_rate: profile.vitals.respiratory_rate,
      temperature_c: profile.vitals.temperature_c,
      spo2: profile.vitals.spo2,
      measured_relative: profile.vitals.measured_at
        ? toRelativeDate(profile.vitals.measured_at, referenceDate)
        : undefined,
    } : undefined,
    lab_results: labResults,
    family_history: familyHistory,
    surgical_history: (profile.surgical_history ?? []).map(sh => ({
      procedure: sh.procedure,
      date_relative: sh.date ? toRelativeDate(sh.date, referenceDate) : 'unknown',
    })),
    social_history: {
      smoking: profile.social_history?.smoking ? {
        status: profile.social_history.smoking.status,
        quit_relative: profile.social_history.smoking.quit_date
          ? toRelativeDate(profile.social_history.smoking.quit_date, referenceDate)
          : undefined,
        pack_years: profile.social_history.smoking.pack_years,
      } : undefined,
      alcohol: profile.social_history?.alcohol ? {
        status: profile.social_history.alcohol.status,
        quit_relative: profile.social_history.alcohol.quit_date
          ? toRelativeDate(profile.social_history.alcohol.quit_date, referenceDate)
          : undefined,
      } : undefined,
      substance_use: profile.social_history?.substance_use?.map(su => ({
        substance: su.substance,
        status: su.status,
        quit_relative: su.quit_date ? toRelativeDate(su.quit_date, referenceDate) : undefined,
        duration: su.duration,
      })),
      exercise: profile.social_history?.exercise,
      diet: profile.social_history?.diet,
      sleep: profile.social_history?.sleep ? {
        hours_per_night: profile.social_history.sleep.hours_per_night,
        quality: profile.social_history.sleep.quality,
        issues: profile.social_history.sleep.issues,
      } : undefined,
      stress_level: profile.social_history?.stress_level,
    },
    mental_health: profile.mental_health ? {
      diagnoses: profile.mental_health.diagnoses,
      trauma_history: traumaHistory,
      current_therapy: profile.mental_health.current_therapy,
      therapy_type: profile.mental_health.therapy_type,
      phq9_score: profile.mental_health.phq9_score,
      gad7_score: profile.mental_health.gad7_score,
      substance_use_recovery: profile.mental_health.substance_use_recovery,
    } : undefined,
    goals,
  };

  return { profile: deidentified, audit };
}
```

---

## 3. Data Flow Diagram

### 3a. What Goes Where

```
                          ┌─────────────────────────────────────────┐
                          │  SUPABASE EU (Tier 1 + Tier 2 at rest) │
                          │  Full patient profile, encrypted        │
                          │  Consultation results, encrypted        │
                          │  Consent records                        │
                          │  Audit logs                             │
                          └──────────────┬────────────────────────-─┘
                                         │
                                         │ De-identification
                                         │ Pipeline (server-side)
                                         │
                          ┌──────────────▼──────────────────────────┐
                          │  DE-IDENTIFIED PROFILE (in-memory)      │
                          │  No: names, emails, locations, exact     │
                          │  dates, lab names, occupation, ethnicity │
                          └──────────────┬──────────────────────────┘
                                         │
                    ┌────────────────────-┼───────────────────────────┐
                    │                    │                            │
              ┌─────▼─────┐      ┌──────▼───────┐           ┌───────▼──────┐
              │  Claude    │      │  Perplexity  │           │  DrugBank    │
              │  (Opus/    │      │  Sonar Pro   │           │  API         │
              │  Sonnet/   │      │              │           │              │
              │  Haiku)    │      └──────────────┘           └──────────────┘
              └────────────┘
```

### 3b. Per-API Data Flow

#### Anthropic (Claude Opus / Sonnet / Haiku)

| Aspect | Detail |
|--------|--------|
| **What IS sent** | De-identified profile (Tier 2): age, sex, height, weight, BMI, conditions (no dates), medications (no dates), lab values (relative dates), scrubbed chief complaint, scrubbed trauma history, vitals, family history (generalized relationships), allergies, social history (no occupation/location), mental health diagnoses, PHQ-9/GAD-7, goals (scrubbed) |
| **What is NOT sent** | Name, email, profile_id, country, ethnicity, occupation, living_situation, exact dates, lab_name, unscrubbed free text, completeness_score |
| **Does the API store data?** | No. Anthropic API does not train on API inputs/outputs. Zero data retention on API tier. |
| **DPA status** | Anthropic provides a Data Processing Addendum (DPA) for API customers. Must be executed before production launch. |
| **API configuration** | Set `anthropic-beta` headers as needed. Use API tier (not consumer Claude). Confirm zero-retention is active on the account. |

#### Perplexity (Sonar Pro / Sonar / Deep Research)

| Aspect | Detail |
|--------|--------|
| **What IS sent** | The consultation question (scrubbed), condition names, medication names. Structured as a medical research query. NO patient profile is sent. |
| **What is NOT sent** | Patient demographics, lab values, personal history, any patient data. Perplexity receives only the clinical question framed as a general medical research query. |
| **Does the API store data?** | Perplexity's API terms: queries may be logged. Since no patient data is in the query, this is acceptable. |
| **DPA status** | Not required — no personal data sent. Monitor Perplexity's privacy policy for changes. |
| **Query construction** | `"What does current evidence say about [condition/medication/question]?"` — never `"A 35-year-old male patient with..."` |

#### DrugBank API

| Aspect | Detail |
|--------|--------|
| **What IS sent** | Medication names and supplement names only. Structured as interaction lookup queries. |
| **What is NOT sent** | Patient demographics, dosing context, lab values, conditions, any patient profile data. |
| **Does the API store data?** | DrugBank logs API queries for rate limiting. Since only generic drug names are sent, no PII risk. |
| **DPA status** | Not required — no personal data sent. Drug names are not PII. |

#### PubMed API (NCBI E-utilities)

| Aspect | Detail |
|--------|--------|
| **What IS sent** | PMIDs for citation verification. Search terms for backup evidence retrieval (medical topic keywords only). |
| **What is NOT sent** | Zero patient data. PubMed receives only bibliographic lookup queries. |
| **Does the API store data?** | NCBI logs queries per their data use policy. No PII risk. |
| **DPA status** | Not required. Public API, no personal data sent. |

#### OpenFDA API

| Aspect | Detail |
|--------|--------|
| **What IS sent** | Drug names for adverse event lookups and label retrieval. |
| **What is NOT sent** | Zero patient data. |
| **Does the API store data?** | Public API, queries may be logged. No PII risk. |
| **DPA status** | Not required. Public API, no personal data sent. |

#### RxNorm API (NLM)

| Aspect | Detail |
|--------|--------|
| **What IS sent** | Drug/supplement names for normalization to RxNorm CUI codes. |
| **What is NOT sent** | Zero patient data. |
| **Does the API store data?** | Public API. No PII risk. |
| **DPA status** | Not required. Public API. |

#### OpenAI (GPT-4.1, fallback/cross-verification)

| Aspect | Detail |
|--------|--------|
| **What IS sent** | Same de-identified profile as Claude. Only used for cross-model verification on safety-critical outputs (drug interactions, dosing, emergency triage). |
| **What is NOT sent** | Same exclusions as Claude — no PII. |
| **Does the API store data?** | OpenAI API: zero data retention when opted out via API settings. Must confirm zero-retention is enabled on the account. |
| **DPA status** | OpenAI provides a DPA for API customers. Must be executed before production launch. |

#### RunPod (Self-hosted Llama 3.3 70B)

| Aspect | Detail |
|--------|--------|
| **What IS sent** | Full patient PDF documents for extraction (this is the ONLY service that sees unredacted patient data outside Supabase). |
| **What is NOT sent** | N/A — this is self-hosted on EU RunPod infrastructure. |
| **Does the API store data?** | Self-hosted. We control the infrastructure. Data in-memory during processing only, not persisted on RunPod. |
| **DPA status** | RunPod DPA required (they provide EU infrastructure). |

### 3c. Data Residency Summary

| Data Type | Location | Leaves EU? |
|-----------|----------|------------|
| Patient profiles (Tier 1) | Supabase EU | No |
| Consultation results | Supabase EU | No |
| De-identified API payloads | In-transit to Anthropic/OpenAI (US servers) | Yes, but de-identified |
| Evidence queries | In-transit to Perplexity/PubMed/DrugBank | Yes, but contain no patient data |
| PDF extraction | RunPod EU (self-hosted) | No |
| Aggregate analytics (Tier 3) | Supabase EU | No |

**GDPR Article 46 compliance for US transfers:** De-identified data is not personal data under GDPR (Recital 26). The de-identification pipeline ensures the data sent to US-based APIs cannot be re-linked to a natural person. As a defense-in-depth measure, DPAs with Standard Contractual Clauses (SCCs) are executed with Anthropic, OpenAI, and RunPod.

---

## 4. User Rights (GDPR Articles 15-22)

### 4a. Right to Access (Article 15)

**Endpoint:** `GET /api/user/data-export`

```typescript
interface DataExportResponse {
  format: 'json';
  generated_at: string; // ISO 8601
  user: {
    email: string;
    account_created: string;
    last_login: string;
  };
  profile: PatientProfile; // Full profile as stored
  consultations: Array<{
    consultation_id: string;
    created_at: string;
    question: string;
    classification: object;
    specialist_outputs: object[]; // All agent outputs
    synthesis: object;
    safety_flags: object[];
    cost: { total_tokens: number; total_cost_usd: number };
  }>;
  consent_records: ConsentRecord[];
  data_processing_log: Array<{
    timestamp: string;
    action: 'consultation' | 'profile_update' | 'data_export' | 'data_deletion';
    apis_called: string[]; // Which external APIs received de-identified data
  }>;
  audit_trail: DeidentificationAudit[]; // What was de-identified and when
}
```

**Implementation:**
- Must respond within 30 days (Article 12(3))
- Verify user identity before export (email confirmation + auth check)
- Export is machine-readable JSON (satisfies Article 20 portability too)
- Log the export request itself in the audit trail

### 4b. Right to Erasure (Article 17)

**Endpoint:** `DELETE /api/user/account`

**Deletion Cascade:**

| Table/Store | Action | Timing |
|-------------|--------|--------|
| `patient_profiles` | Hard delete entire row | Immediate |
| `consultations` | Hard delete all consultation rows for user | Immediate |
| `consultation_agent_outputs` | Hard delete (cascaded from consultations FK) | Immediate |
| `lab_results` | Hard delete all lab rows for user | Immediate |
| `consent_records` | Anonymize: keep record of consent existence (legal obligation) but remove user_id linkage | Immediate |
| `audit_logs` | Anonymize: replace user_id with "deleted_user_[hash]", retain for 3 years (legal obligation under GDPR Article 17(3)(e)) | Immediate |
| `aggregate_outcomes` | No action needed — already de-identified, no join path to user | N/A |
| Supabase Auth | Delete user account | Immediate |
| Stripe customer record | Delete via Stripe API (if billing active) | Immediate |

**Post-deletion verification:**
1. Run a verification query: `SELECT count(*) FROM [each table] WHERE user_id = [deleted_id]` — must return 0
2. Log deletion completion with timestamp
3. Send confirmation email to user's email (sent before email is deleted)
4. Retain deletion receipt (anonymized) for compliance proof

**What is NOT deleted (legal basis: legitimate interest / legal obligation):**
- Anonymized aggregate outcomes (no join path, not personal data)
- Anonymized audit logs (legal obligation to demonstrate compliance)
- Anonymized consent records (legal obligation to prove consent was obtained)

### 4c. Right to Rectification (Article 16)

**Endpoint:** `PATCH /api/user/profile`

- User can update any field in their profile at any time through the profile management UI
- Profile updates increment `profile_version`
- Previous versions are NOT retained (minimization principle) — only the current version exists
- Consultations reference the profile version they used; if profile is corrected, past consultations are NOT retroactively re-run (but user can start a new consultation with corrected data)

### 4d. Right to Data Portability (Article 20)

**Endpoint:** Same as data export (`GET /api/user/data-export`)

```typescript
interface PortableExport {
  // Structured, machine-readable, commonly used format (JSON)
  schema_version: string; // For forward compatibility
  exported_at: string;

  // Patient profile in FHIR-aligned JSON (interoperable with health systems)
  profile: PatientProfile;

  // Consultation history with full outputs
  consultations: ConsultationExport[];

  // Metadata
  platform: 'MedPanel AI';
  export_format_version: '1.0';
}
```

**Requirements:**
- JSON format (machine-readable, commonly used)
- FHIR-aligned patient profile structure (interoperable)
- Include all user-provided data and all system-generated outputs
- Must be transmittable to another controller (provide download link)

### 4e. Right to Object to Processing (Article 21)

**Granular opt-out controls:**

| Processing Purpose | Opt-out Mechanism | Effect |
|-------------------|-------------------|--------|
| Outcome tracking (follow-up surveys) | Toggle in settings | No follow-up prompts, no outcome data collection |
| Anonymized data sharing (aggregate analytics) | Toggle in settings | User's data excluded from Tier 3 aggregation |
| Cross-model verification (sending to GPT-4.1) | Toggle in settings | Only Claude is used; cross-verification disabled |
| All processing | Account deletion | Full erasure per Section 4b |

**Implementation:** Opt-out flags stored in user settings table. Checked at every processing decision point. Default: all processing enabled (with consent).

### 4f. Right to Explanation (Article 22 — Automated Decision-Making)

MedPanel's architecture inherently supports this right because the system is designed for transparency:

| Requirement | How MedPanel Satisfies It |
|-------------|--------------------------|
| Meaningful information about the logic | Multi-perspective output shows each specialist's reasoning chain, evidence citations, and confidence levels |
| Significance and envisaged consequences | Evidence landscape format explicitly shows strength of evidence for each claim; safety flags highlight risks |
| Right to human review | MedPanel explicitly states output is for discussion with healthcare providers; it does not make decisions |
| Ability to contest | Users can start new consultations, update their profile, and see different perspectives |

**Additional transparency measures:**
- Every recommendation links to its evidence source (PubMed ID where available)
- Disagreements between specialists are surfaced, not hidden
- Confidence levels are shown (numeric 0.0-1.0)
- "Questions to Ask Your Doctor" framing ensures human oversight

---

## 5. Consent Management

### 5a. Consent Records Schema

```typescript
interface ConsentRecord {
  consent_id: string; // UUID
  user_id: string;
  consent_type: ConsentType;
  version: string; // e.g., "1.0", "1.1" — TOS/privacy policy version
  granted: boolean;
  granted_at: string; // ISO 8601
  withdrawn_at?: string; // ISO 8601, if withdrawn
  ip_address_hash: string; // SHA-256 hash of IP (not raw IP)
  user_agent: string; // Browser/device for audit
  consent_text_hash: string; // SHA-256 of the exact text the user agreed to
}

type ConsentType =
  | 'terms_of_service' // Must accept to use platform
  | 'health_data_processing' // GDPR Article 9(2)(a) explicit consent
  | 'educational_disclaimer' // Understanding MedPanel is not medical advice
  | 'outcome_tracking' // Optional: 30/60/90 day follow-ups
  | 'anonymized_analytics' // Optional: include in aggregate data
  | 'cross_model_verification' // Optional: data sent to OpenAI for cross-check
  | 'marketing_communications'; // Optional: product updates
```

**Supabase table:**

```sql
CREATE TABLE consent_records (
  consent_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  consent_type  VARCHAR(50) NOT NULL,
  version       VARCHAR(10) NOT NULL,
  granted       BOOLEAN NOT NULL,
  granted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  withdrawn_at  TIMESTAMPTZ,
  ip_hash       VARCHAR(64) NOT NULL,
  user_agent    TEXT,
  consent_text_hash VARCHAR(64) NOT NULL,

  -- RLS: users can only read their own consent records
  -- System can insert/update
);

-- Index for quick lookup
CREATE INDEX idx_consent_user_type ON consent_records(user_id, consent_type);

-- RLS policy
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own consents"
  ON consent_records FOR SELECT
  USING (auth.uid() = user_id);
```

### 5b. Required vs Optional Consents

| Consent Type | Required? | Blocking? | Default |
|-------------|-----------|-----------|---------|
| `terms_of_service` | Yes | Cannot use platform without it | N/A |
| `health_data_processing` | Yes | Cannot run consultations without it | N/A |
| `educational_disclaimer` | Yes | Cannot use platform without it | N/A |
| `outcome_tracking` | No | Platform works without it | Off |
| `anonymized_analytics` | No | Platform works without it | Off |
| `cross_model_verification` | No | Only Claude used if declined | On |
| `marketing_communications` | No | No impact on functionality | Off |

### 5c. Re-consent Triggers

| Trigger | Action | UX |
|---------|--------|-----|
| TOS version change | Block access until re-consent | Modal on next login: "Our terms have been updated. Please review and accept to continue." |
| Privacy policy version change | Block access until re-consent | Same as above |
| New data processing purpose added | Request consent for new purpose only | Non-blocking modal: "We've added a new optional feature. Would you like to opt in?" |
| 30-day periodic re-acknowledgment | Re-present educational disclaimer | Inline banner at start of consultation: "Reminder: MedPanel is an educational tool..." with checkbox |
| Regulatory change (GDPR update, new guidance) | Review all consents, re-request if scope changed | Full re-consent flow if material change |

### 5d. Consent Withdrawal

```typescript
interface ConsentWithdrawal {
  consent_type: ConsentType;
  user_id: string;
  withdrawn_at: string;
  effect: 'immediate' | 'end_of_current_session';
  consequences: string[]; // Shown to user before confirming
}

// Withdrawal effects by consent type:
const WITHDRAWAL_EFFECTS: Record<ConsentType, { effect: string; consequence: string }> = {
  terms_of_service: {
    effect: 'Account deactivation. All processing stops.',
    consequence: 'You will need to re-accept terms to use MedPanel again.',
  },
  health_data_processing: {
    effect: 'Cannot run new consultations. Existing data retained until deletion requested.',
    consequence: 'Your profile and history remain accessible. You can export or delete your data.',
  },
  educational_disclaimer: {
    effect: 'Account deactivation.',
    consequence: 'Acknowledgment of educational nature is required to use MedPanel.',
  },
  outcome_tracking: {
    effect: 'No more follow-up prompts. Existing outcome data retained.',
    consequence: 'We will stop tracking outcomes for your consultations.',
  },
  anonymized_analytics: {
    effect: 'Your data excluded from future aggregate analysis.',
    consequence: 'Already-aggregated data cannot be disaggregated (it has no link to you).',
  },
  cross_model_verification: {
    effect: 'Only Claude is used for your consultations.',
    consequence: 'Cross-model safety verification will be disabled for your account.',
  },
  marketing_communications: {
    effect: 'No more marketing emails.',
    consequence: 'You will still receive transactional emails (receipts, security alerts).',
  },
};
```

---

## 6. Breach Protocol

### 6a. What Constitutes a Breach

In this system, a data breach is any of:

| Breach Type | Example | Severity |
|-------------|---------|----------|
| **Unauthorized access to Tier 1 data** | Database compromise, RLS bypass, auth token theft | Critical |
| **PII sent to external API** | De-identification pipeline failure, bug allowing raw profile to reach Claude/GPT | Critical |
| **Unauthorized access to Tier 2 data** | Consultation results accessed by non-owner | High |
| **Logging PII** | Server logs accidentally capture patient data | High |
| **Consent record tampering** | Consent records modified without user action | High |
| **De-identification audit trail loss** | Audit records deleted or corrupted | Moderate |
| **Third-party API breach** | Anthropic/OpenAI reports a breach affecting our API calls | Variable (de-identified data only) |

### 6b. Breach Response Timeline

```
Hour 0:    DETECTION
           ├── Automated: Supabase audit log anomalies, error rate spikes on
           │   de-identification pipeline, unexpected data in API request logs
           ├── Manual: User report, security researcher disclosure, employee discovery
           └── Third-party notification: API provider reports incident

Hour 0-4:  INITIAL ASSESSMENT
           ├── Classify breach severity (critical/high/moderate)
           ├── Identify scope: how many users affected?
           ├── Determine: was Tier 1 (PII) data exposed?
           ├── Determine: was data exposed to external parties or only internal?
           └── Activate incident response team

Hour 0-24: CONTAINMENT
           ├── If de-identification failure: kill switch on all API calls (no consultations)
           ├── If database compromise: rotate all keys, revoke all sessions
           ├── If auth bypass: force logout all users, disable new logins
           ├── Preserve evidence: snapshot logs, database state, API call records
           └── Begin root cause analysis

Hour 0-72: NOTIFICATION (GDPR Article 33 — 72-hour deadline)
           ├── Supervisory authority notification (if Tier 1 data exposed):
           │   - Nature of breach
           │   - Categories and approximate number of data subjects
           │   - Contact details of DPO
           │   - Likely consequences
           │   - Measures taken or proposed
           ├── User notification (Article 34 — if high risk to individuals):
           │   - Clear, plain language description
           │   - What data was exposed
           │   - What we're doing about it
           │   - What they should do (change passwords, monitor accounts)
           │   - DPO contact information
           └── If de-identified data only (no PII): document decision NOT to notify
               (de-identified data is not personal data; breach does not affect individuals)

Week 1-4:  REMEDIATION
           ├── Fix root cause
           ├── Deploy additional safeguards
           ├── Conduct post-incident review
           ├── Update DPIA if risk profile changed
           └── Update this breach protocol if gaps identified

Ongoing:   DOCUMENTATION
           ├── Maintain breach register (Article 33(5))
           ├── Record: facts, effects, remedial action taken
           ├── Retain for minimum 5 years
           └── Available for supervisory authority inspection
```

### 6c. Kill Switch: De-identification Pipeline Failure

The most system-specific breach scenario is a de-identification pipeline failure that allows PII to reach an external API.

```typescript
interface DeidentificationGuard {
  /**
   * Runs AFTER de-identification, BEFORE any API call.
   * Validates that the output contains no Tier 1 fields.
   * If validation fails, the API call is blocked and an alert fires.
   */
  validate(payload: unknown): GuardResult;
}

interface GuardResult {
  safe: boolean;
  violations: Array<{
    field: string;
    violation_type: 'pii_field_present' | 'date_not_relative' | 'suspicious_entity';
    value_preview: string; // First 10 chars only, for debugging
  }>;
}

// Guard checks:
// 1. No field named "profile_id", "email", "country", "ethnicity", "occupation",
//    "living_situation", "lab_name", "completeness_score" exists in payload
// 2. No date strings match ISO date patterns (YYYY-MM-DD, YYYY-MM-DDTHH:mm:ss)
// 3. No strings match email regex, phone regex, or known PII patterns
// 4. Payload size sanity check (de-identified should be smaller than original)

// If guard fails:
// 1. API call is BLOCKED (not sent)
// 2. Alert fires to incident response channel
// 3. Consultation returns error: "Unable to process your consultation. Our team has been notified."
// 4. Incident logged with full payload (in encrypted incident store, not in regular logs)
```

### 6d. Third-Party API Breach Handling

If Anthropic, OpenAI, or another API provider reports a data breach:

1. **Assess exposure:** All data sent to these APIs is de-identified. Review de-identification audit logs for the affected time period to confirm no PII was sent.
2. **If de-identification was intact:** Document the incident. No user notification required (de-identified data is not personal data).
3. **If de-identification had gaps during the period:** Treat as a Tier 1 breach. Follow the full 72-hour notification protocol. Identify affected users from audit logs.
4. **Regardless:** Review and potentially tighten de-identification rules. Add the incident to the breach register.

---

## 7. Data Protection Impact Assessment (DPIA) Requirements

Per GDPR Article 35, a DPIA is required before launch because MedPanel:
- Processes health data (Article 9 special category) at scale
- Uses automated processing to generate outputs about health conditions
- Involves new technologies (multi-agent LLM reasoning)

The DPIA must cover:
1. Systematic description of processing operations and purposes
2. Assessment of necessity and proportionality
3. Assessment of risks to data subjects
4. Measures to address risks (this entire document serves as the technical measures component)

**DPIA must be completed and approved before any real patient data is processed in production.**

---

## 8. Technical Controls Summary

| Control | Implementation |
|---------|---------------|
| Encryption at rest | AES-256 via Supabase (all patient data tables) |
| Encryption in transit | TLS 1.3 for all connections (Supabase, API calls, client) |
| Row-level security | Supabase RLS: users can only access their own data |
| De-identification | Automated pipeline with validation guard (Section 2) |
| Audit logging | Every data access, modification, and API call logged |
| Access control | Supabase Auth + RLS. No admin access to patient data without explicit reason and audit trail |
| Key management | Supabase managed keys for data encryption. API keys stored in environment variables, rotated quarterly |
| Session management | JWT tokens via Supabase Auth. Short-lived access tokens (1 hour), refresh tokens (7 days) |
| Data minimization | Only process data necessary for the consultation. Unused profile fields not sent to agents |
| Purpose limitation | Data processed only for consultation and user-consented purposes |
| Storage limitation | Data retained until user deletes. No indefinite retention of unused accounts (inactive > 2 years -> prompt for re-consent or deletion) |
| De-identification validation | Post-pipeline guard blocks API calls if PII detected (Section 6c) |
