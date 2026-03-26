-- ============================================================================
-- MedPanel AI: Initial Database Schema
-- Migration 001 — Phase 3.2
--
-- Design decisions:
--   1. All enums match shared-definitions.json exactly (single source of truth).
--   2. JSONB for complex nested data (patient profiles, specialist outputs,
--      evidence packages, full consultation output). Avoids over-normalization
--      of deeply nested medical data that is always read/written as a unit.
--   3. Versioned patient_profiles — consultations reference a specific version
--      so historical consultations remain accurate even after profile updates.
--   4. timestamptz everywhere — EU data residency means we must be TZ-aware.
--   5. ON DELETE CASCADE on child tables that are meaningless without parent.
--   6. evidence_cache is a separate denormalized table for API response caching
--      (PubMed, DrugBank, RxNorm) to reduce external API costs.
--   7. consultation_messages for follow-up Q&A threads within a consultation.
--   8. aggregate_outcomes has NO user_id — fully anonymized for evidence building.
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUMS (from shared-definitions.json — canonical source)
-- ============================================================================

-- Evidence quality scale (unified from GRADE, supplement tiers, clinical tiers)
CREATE TYPE evidence_tier AS ENUM (
  'strong',
  'moderate',
  'preliminary',
  'mechanistic_or_theoretical',
  'expert_opinion',
  'extrapolated',
  'insufficient'
);

-- Unified severity scale
CREATE TYPE severity AS ENUM (
  'critical',
  'high',
  'moderate',
  'low',
  'informational'
);

-- All specialist types (internist always included as anchor)
CREATE TYPE specialist_type AS ENUM (
  'internist',
  'cardiologist',
  'endocrinologist',
  'nephrologist',
  'neuropsychiatrist',
  'neurologist',
  'functional_medicine',
  'clinical_pharmacologist',
  'gastroenterologist',
  'hepatologist',
  'pulmonologist',
  'rheumatologist',
  'sports_medicine',
  'dermatologist',
  'hematologist',
  'immunologist',
  'reproductive_endocrinologist',
  'ophthalmologist',
  'otolaryngologist',
  'nutritional_medicine',
  'sleep_medicine',
  'pain_management',
  'geriatrician',
  'obstetrician'
);

-- Consultation intent (classifier Axis 1)
CREATE TYPE consultation_type AS ENUM (
  'diagnostic',
  'therapeutic',
  'prognostic',
  'preventive',
  'optimization',
  'medication_management',
  'interpretation',
  'second_opinion'
);

-- Urgency level (classifier Axis 3 + safety system)
CREATE TYPE urgency AS ENUM (
  'emergent',
  'urgent',
  'semi_urgent',
  'routine',
  'optimization'
);

-- Body system domain codes (classifier Axis 2, maps to ICD-10 chapters)
CREATE TYPE domain AS ENUM (
  'CARDIO',
  'ENDO',
  'NEURO',
  'PSYCH',
  'GI',
  'RENAL',
  'PULM',
  'MSK',
  'DERM',
  'HEME',
  'IMMUNE',
  'REPRO',
  'HEPAT',
  'OPHTHO',
  'ENT',
  'NUTR',
  'PHARM',
  'SLEEP',
  'PAIN',
  'GERI'
);

-- PubMed PMID verification result
CREATE TYPE verification_status AS ENUM (
  'verified',
  'misattributed',
  'not_found',
  'verification_failed',
  'no_pmid'
);

-- Clinical study type
CREATE TYPE study_type AS ENUM (
  'systematic_review',
  'meta_analysis',
  'rct',
  'cohort',
  'case_control',
  'cross_sectional',
  'case_report',
  'guideline',
  'mechanistic',
  'expert_opinion',
  'narrative_review',
  'unknown'
);

-- Medication/supplement classification
CREATE TYPE medication_type AS ENUM (
  'prescription',
  'otc',
  'supplement',
  'prn'
);

-- Interaction data source
CREATE TYPE interaction_source AS ENUM (
  'drugbank',
  'natural_medicines',
  'openfda_signal',
  'perplexity_search',
  'parametric'
);

-- Source reliability
CREATE TYPE source_confidence AS ENUM (
  'high',
  'moderate',
  'low'
);

-- Evidence pipeline step status
CREATE TYPE retrieval_step_status AS ENUM (
  'success',
  'partial',
  'timeout',
  'error',
  'skipped',
  'not_subscribed'
);

-- Evidence pipeline overall health
CREATE TYPE retrieval_overall_status AS ENUM (
  'complete',
  'partial',
  'degraded',
  'unavailable'
);

-- Consultation lifecycle status
CREATE TYPE consultation_status AS ENUM (
  'classifying',
  'retrieving_evidence',
  'specialists_analyzing',
  'discussion_round_2',
  'discussion_round_3',
  'synthesizing',
  'safety_checking',
  'completed',
  'failed',
  'cancelled'
);

-- Discussion termination reason
CREATE TYPE termination_reason AS ENUM (
  'consensus_reached',
  'consensus_after_round_2',
  'max_rounds_reached',
  'budget_exceeded',
  'no_new_information',
  'diminishing_returns',
  'emergency_synthesis'
);

-- Round 3 disagreement resolution
CREATE TYPE resolution_type AS ENUM (
  'consensus',
  'conditional',
  'persistent_disagreement'
);

-- Moderator synthesis agreement level
CREATE TYPE consensus_level AS ENUM (
  'strong_consensus',
  'moderate_consensus',
  'single_specialist_domain',
  'disagreement'
);

-- Specialist agreement on a consensus item
CREATE TYPE agreement_level AS ENUM (
  'unanimous',
  'strong_majority',
  'majority'
);

-- LLM model tier
CREATE TYPE model_tier AS ENUM (
  'opus',
  'sonnet',
  'haiku'
);

-- Budget tier
CREATE TYPE budget_tier AS ENUM (
  'simple',
  'moderate',
  'complex'
);

-- Recommendation category (from DISCUSSION-PROTOCOL Section 2)
CREATE TYPE recommendation_category AS ENUM (
  'medication_adjustment',
  'supplement',
  'lifestyle',
  'monitoring',
  'referral'
);

-- Recommendation priority
CREATE TYPE recommendation_priority AS ENUM (
  'critical',
  'high',
  'medium',
  'low'
);

-- Recommendation consensus status
CREATE TYPE recommendation_consensus AS ENUM (
  'unanimous',
  'majority',
  'conditional',
  'disputed'
);

-- Outcome adherence
-- Aligned to consultation.json (C-06 fix). API uses these shorter values.
CREATE TYPE adherence_level AS ENUM (
  'followed_fully',
  'followed_partially',
  'did_not_follow',
  'chose_alternative',
  'unknown'
);

-- Subjective outcome
-- Merged SQL + API enum values (H-02 fix). Adherence field handles not_followed/chose_alternative.
CREATE TYPE subjective_outcome AS ENUM (
  'improved',
  'unchanged',
  'worsened',
  'mixed',
  'unsure',
  'pending'
);

-- Outcome reporting method
-- Aligned to consultation.json and API-ROUTES (C-04 fix)
CREATE TYPE reporting_method AS ENUM (
  'self_report',
  'lab_verified',
  'clinician_verified'
);

-- Follow-up type
CREATE TYPE followup_type AS ENUM (
  'subjective_check',
  'lab_recheck',
  'full_review'
);

-- Lab data source
CREATE TYPE lab_source AS ENUM (
  'manual_entry',
  'pdf_import',
  'api_import',
  'consultation_input'
);

-- Evidence cache source type
CREATE TYPE evidence_source AS ENUM (
  'pubmed',
  'drugbank',
  'rxnorm',
  'openfda',
  'perplexity',
  'semantic_scholar',
  'umls'
);

-- Consultation message role (for follow-up Q&A)
CREATE TYPE message_role AS ENUM (
  'user',
  'system',
  'specialist'
);

-- ============================================================================
-- TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- users
-- Supabase Auth provides auth.users; this is the public-facing profile table
-- that mirrors auth.users.id and stores app-specific user metadata.
-- ----------------------------------------------------------------------------
CREATE TABLE users (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT UNIQUE NOT NULL,
  display_name    TEXT,
  avatar_url      TEXT,
  timezone        TEXT DEFAULT 'UTC',
  -- Preferences
  preferred_output_mode TEXT DEFAULT 'patient' CHECK (preferred_output_mode IN ('patient', 'physician')),
  email_notifications   BOOLEAN DEFAULT true,
  -- Metadata
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE users IS 'Public user profile. Mirrors auth.users(id). App-specific settings live here.';

-- ----------------------------------------------------------------------------
-- patient_profiles (versioned)
-- Full FHIR-aligned patient profile stored as JSONB for flexibility.
-- Each update creates a new version row. Consultations reference a specific
-- version so the medical context at consultation time is preserved.
-- ----------------------------------------------------------------------------
CREATE TABLE patient_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  version         INTEGER NOT NULL DEFAULT 1,
  -- Profile data stored as JSONB matching schemas/patient-profile.json
  -- Contains: demographics, conditions, medications, allergies, vitals,
  -- lab_results, family_history, surgical_history, social_history,
  -- mental_health, goals
  profile_data    JSONB NOT NULL,
  -- Computed from profile_data for quick access without JSONB parsing
  completeness_score  DECIMAL(5,2),
  missing_fields      JSONB,           -- Array of missing field names
  -- Whether this is the active (latest) version
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One active version per user; inactive versions are historical
  UNIQUE(user_id, version)
);

COMMENT ON TABLE patient_profiles IS 'Versioned patient profiles. Each profile update creates version N+1. Consultations pin to a specific version.';
COMMENT ON COLUMN patient_profiles.profile_data IS 'Full patient profile as JSONB (schemas/patient-profile.json). Includes demographics, conditions, medications, labs, etc.';

-- Index for fast lookup of active profile by user
CREATE INDEX idx_patient_profiles_user_active ON patient_profiles(user_id) WHERE is_active = true;
CREATE INDEX idx_patient_profiles_user_version ON patient_profiles(user_id, version);

-- ----------------------------------------------------------------------------
-- budget_tier_pricing
-- Lookup table for consultation cost ceilings by complexity tier.
-- Seeded via seed.sql. Referenced by the orchestrator for budget enforcement.
-- ----------------------------------------------------------------------------
CREATE TABLE budget_tier_pricing (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier              budget_tier UNIQUE NOT NULL,
  complexity_range  TEXT NOT NULL,         -- e.g., '0.0-2.5'
  max_cost_usd      DECIMAL(8,2) NOT NULL,
  max_total_tokens   INTEGER NOT NULL,
  description       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE budget_tier_pricing IS 'Consultation cost ceilings by complexity. Simple/moderate/complex with token and USD limits.';

-- ----------------------------------------------------------------------------
-- consultations
-- Core consultation record. One row per consultation session.
-- full_output JSONB stores the complete encrypted discussion output
-- (specialist outputs, evidence package, synthesis, etc.)
-- ----------------------------------------------------------------------------
CREATE TABLE consultations (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  patient_profile_id          UUID REFERENCES patient_profiles(id) ON DELETE SET NULL, -- H-01 fix: nullable, SET NULL on delete so consultations survive profile deletion
  patient_profile_version     INTEGER NOT NULL,
  -- Question
  question_text               TEXT NOT NULL,
  question_context            TEXT,
  -- Classification (computed by Haiku classifier)
  consultation_type           consultation_type NOT NULL,
  domains                     domain[] NOT NULL DEFAULT '{}',
  urgency                     urgency NOT NULL DEFAULT 'routine',
  complexity_score            DECIMAL(4,2),          -- 0.00-10.00
  -- Status
  status                      consultation_status NOT NULL DEFAULT 'classifying',
  -- Panel composition
  specialists                 specialist_type[] NOT NULL DEFAULT '{}',
  total_rounds                INTEGER NOT NULL DEFAULT 0 CHECK (total_rounds BETWEEN 0 AND 3),
  consensus_reached           BOOLEAN,
  termination_reason          termination_reason,
  -- Cost tracking
  budget_tier                 budget_tier,
  total_tokens_used           INTEGER DEFAULT 0,
  total_cost_usd              DECIMAL(8,4) DEFAULT 0,
  models_used                 JSONB,                 -- { role: model_version } map
  -- Quality metrics
  profile_completeness_score  DECIMAL(5,2),
  value_added_score           DECIMAL(5,2),          -- Multi-agent vs single-agent value ratio
  diversity_score             DECIMAL(3,2),          -- 1 - avg pairwise similarity
  information_gain_per_round  JSONB,                 -- Array of floats per round
  -- Full output (encrypted at rest by Supabase)
  full_output                 JSONB,                 -- Complete discussion: evidence, specialist outputs, synthesis
  specialist_outputs          JSONB,                 -- Array of per-agent structured outputs
  evidence_package            JSONB,                 -- Evidence retrieval pipeline output
  synthesis                   JSONB,                 -- Moderator compiled output
  -- Rendered outputs
  output_patient_mode         TEXT,                  -- 5th-6th grade reading level
  output_physician_mode       TEXT,                  -- Clinical language with GRADE ratings
  -- Reproducibility
  summary_hash                VARCHAR(64),           -- SHA-256 of synthesis
  -- Timing
  completed_at                TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE consultations IS 'Core consultation sessions. Each row = one multi-specialist discussion.';
COMMENT ON COLUMN consultations.full_output IS 'Complete consultation output as JSONB. Encrypted at rest via Supabase column encryption.';
COMMENT ON COLUMN consultations.specialist_outputs IS 'Array of per-specialist structured outputs (schemas/agent-output.json).';
COMMENT ON COLUMN consultations.evidence_package IS 'Evidence retrieval pipeline output: PubMed results, DrugBank interactions, clinical guidelines.';

-- Indexes for consultations
CREATE INDEX idx_consultations_user_id ON consultations(user_id);
CREATE INDEX idx_consultations_user_created ON consultations(user_id, created_at DESC);
CREATE INDEX idx_consultations_status ON consultations(status) WHERE status NOT IN ('completed', 'failed', 'cancelled');
CREATE INDEX idx_consultations_created_at ON consultations(created_at DESC);

-- ----------------------------------------------------------------------------
-- recommendations
-- Individual recommendations extracted from specialist outputs.
-- Normalized for outcome tracking and aggregate analysis.
-- ----------------------------------------------------------------------------
CREATE TABLE recommendations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id   UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  agent_id          VARCHAR(100) NOT NULL,            -- e.g., 'endocrinologist'
  recommendation_id VARCHAR(50) NOT NULL,             -- e.g., 'R-ENDO-001'
  category          recommendation_category NOT NULL,
  action_text       TEXT NOT NULL,
  priority          recommendation_priority NOT NULL,
  confidence        DECIMAL(3,2) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  evidence_quality  evidence_tier NOT NULL,
  time_horizon      VARCHAR(100),                     -- e.g., '4-8 weeks'
  consensus_status  recommendation_consensus NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE recommendations IS 'Individual recommendations from specialist agents. One row per recommendation per consultation.';

-- Indexes for recommendations
CREATE INDEX idx_recommendations_consultation ON recommendations(consultation_id);
CREATE INDEX idx_recommendations_agent ON recommendations(agent_id);

-- ----------------------------------------------------------------------------
-- outcome_reports
-- User-reported outcomes linked to specific recommendations.
-- Supports both subjective and objective (lab-verified) outcomes.
-- ----------------------------------------------------------------------------
CREATE TABLE outcome_reports (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id     UUID NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  days_since_rec        INTEGER NOT NULL CHECK (days_since_rec >= 0),
  -- Structured outcome
  adherence             adherence_level NOT NULL,
  alternative_chosen    TEXT,                          -- If chose_alternative
  subjective_outcome    subjective_outcome NOT NULL,
  subjective_detail     TEXT,                          -- Free text detail
  severity_if_worsened  severity,                      -- Only if worsened
  -- Objective outcome (lab results)
  new_lab_results       JSONB,                         -- Array of lab_result objects
  -- Confounders
  confounders           JSONB,                         -- Array of { type, description }
  -- Meta
  reporting_method      reporting_method NOT NULL,
  confidence_in_report  DECIMAL(3,2) CHECK (confidence_in_report BETWEEN 0 AND 1),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE outcome_reports IS 'User-reported outcomes for recommendations. Tracks adherence, subjective results, and objective lab changes.';

-- Indexes for outcome_reports
CREATE INDEX idx_outcome_reports_recommendation ON outcome_reports(recommendation_id);
CREATE INDEX idx_outcome_reports_user ON outcome_reports(user_id);

-- ----------------------------------------------------------------------------
-- followup_schedule
-- Scheduled follow-up prompts for outcome tracking.
-- Created automatically when a consultation completes.
-- ----------------------------------------------------------------------------
CREATE TABLE followup_schedule (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id     UUID NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scheduled_at          TIMESTAMPTZ NOT NULL,
  followup_type         followup_type NOT NULL,
  prompt_message        TEXT NOT NULL,
  sent_at               TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ,
  snoozed_until         TIMESTAMPTZ,
  attempt_count         INTEGER DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE followup_schedule IS 'Scheduled follow-up checkpoints. Auto-generated based on recommendation time horizons.';

-- Indexes for followup_schedule
CREATE INDEX idx_followup_user ON followup_schedule(user_id);
CREATE INDEX idx_followup_scheduled ON followup_schedule(scheduled_at) WHERE completed_at IS NULL;
CREATE INDEX idx_followup_recommendation ON followup_schedule(recommendation_id);

-- ----------------------------------------------------------------------------
-- lab_history
-- Longitudinal lab result tracking for trend analysis.
-- Auto-comparison between consultations uses this table.
-- ----------------------------------------------------------------------------
CREATE TABLE lab_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  test_name       VARCHAR(100) NOT NULL,
  value           DECIMAL(12,4) NOT NULL,
  unit            VARCHAR(30) NOT NULL,
  reference_low   DECIMAL(12,4),
  reference_high  DECIMAL(12,4),
  lab_date        DATE NOT NULL,
  source          lab_source NOT NULL,
  consultation_id UUID REFERENCES consultations(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Prevent duplicate entries for same user/test/date
  UNIQUE(user_id, test_name, lab_date)
);

COMMENT ON TABLE lab_history IS 'Longitudinal lab results for trend analysis. UNIQUE on (user_id, test_name, lab_date) prevents duplicates.';

-- Indexes for lab_history
-- Composite index for the most common query pattern: "show me all values of test X for user Y"
CREATE INDEX idx_lab_history_user_test ON lab_history(user_id, test_name, lab_date DESC);
CREATE INDEX idx_lab_history_user ON lab_history(user_id);
CREATE INDEX idx_lab_history_consultation ON lab_history(consultation_id) WHERE consultation_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- aggregate_outcomes
-- Anonymized outcome data for evidence building and system calibration.
-- NO user_id — fully de-identified. Demographics are bucketed, not exact.
-- ----------------------------------------------------------------------------
CREATE TABLE aggregate_outcomes (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_hash         VARCHAR(64) NOT NULL,  -- SHA-256 of category + normalized action
  -- No user_id, no PII
  patient_demographics_bucket JSONB,                  -- { age_range, sex, bmi_range }
  consultation_type           consultation_type,
  specialist_types            specialist_type[],
  adherence                   adherence_level,
  subjective_outcome          subjective_outcome,
  lab_delta_pct               JSONB,                  -- { test_name: percent_change }
  days_to_outcome             INTEGER,
  confounders_present         BOOLEAN,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE aggregate_outcomes IS 'Anonymized outcome data. No user_id or PII. Used for system calibration and evidence building.';

-- Index for aggregate analysis queries
CREATE INDEX idx_aggregate_rec_hash ON aggregate_outcomes(recommendation_hash);
CREATE INDEX idx_aggregate_consultation_type ON aggregate_outcomes(consultation_type);
CREATE INDEX idx_aggregate_outcome ON aggregate_outcomes(subjective_outcome);

-- ----------------------------------------------------------------------------
-- evidence_cache
-- Caches external API responses (PubMed, DrugBank, RxNorm, etc.) to reduce
-- costs and latency. TTL-based expiration via expires_at column.
-- Not user-specific — shared cache for all users.
-- ----------------------------------------------------------------------------
CREATE TABLE evidence_cache (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source          evidence_source NOT NULL,
  query_hash      VARCHAR(64) NOT NULL,               -- SHA-256 of the normalized query
  query_text      TEXT NOT NULL,                       -- Original query for debugging
  response_data   JSONB NOT NULL,                      -- Full API response
  result_count    INTEGER,                             -- Number of results in response
  -- TTL management
  expires_at      TIMESTAMPTZ NOT NULL,                -- Cache expiration
  hit_count       INTEGER DEFAULT 0,                   -- Cache hit counter for analytics
  last_hit_at     TIMESTAMPTZ,
  -- Metadata
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One cache entry per source+query combination
  UNIQUE(source, query_hash)
);

COMMENT ON TABLE evidence_cache IS 'Shared API response cache for PubMed, DrugBank, RxNorm, etc. TTL-based expiration. Reduces external API costs.';

-- Indexes for evidence_cache
CREATE INDEX idx_evidence_cache_lookup ON evidence_cache(source, query_hash) WHERE expires_at > now();
CREATE INDEX idx_evidence_cache_expiry ON evidence_cache(expires_at) WHERE expires_at <= now();

-- ----------------------------------------------------------------------------
-- consultation_messages
-- Follow-up questions and answers within a consultation session.
-- Enables conversational refinement after initial consultation completes.
-- ----------------------------------------------------------------------------
CREATE TABLE consultation_messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id   UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role              message_role NOT NULL,
  content           TEXT NOT NULL,
  -- If a specialist responded, which one
  specialist        specialist_type,
  -- Metadata
  tokens_used       INTEGER,
  cost_usd          DECIMAL(8,4),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE consultation_messages IS 'Follow-up Q&A within a consultation. Users can ask clarifying questions after the panel completes.';

-- Indexes for consultation_messages
CREATE INDEX idx_messages_consultation ON consultation_messages(consultation_id, created_at);
CREATE INDEX idx_messages_user ON consultation_messages(user_id);

-- ============================================================================
-- TRIGGERS: auto-update updated_at on row modification
-- ============================================================================

-- Generic trigger function for updated_at
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER set_updated_at_users
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_patient_profiles
  BEFORE UPDATE ON patient_profiles
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_consultations
  BEFORE UPDATE ON consultations
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_budget_tier_pricing
  BEFORE UPDATE ON budget_tier_pricing
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_evidence_cache
  BEFORE UPDATE ON evidence_cache
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY on all tables
-- Policies are defined in 002_rls_policies.sql
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE followup_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE aggregate_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_tier_pricing ENABLE ROW LEVEL SECURITY;
