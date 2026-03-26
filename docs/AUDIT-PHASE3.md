# Phase 3 Technical Architecture Audit

**Date:** 2026-03-24
**Scope:** SQL Schema (001 + 002 + seed), API Routes, Orchestrator Spec, Privacy Spec, Cost Management Spec
**Cross-referenced against:** `shared-definitions.json`, `consultation.json`, `agent-output.json`, `DISCUSSION-PROTOCOL.md`, `QUESTION-CLASSIFICATION.md`

**Verdict:** 7 CRITICAL, 8 HIGH, 12 MEDIUM, 6 LOW findings. All CRITICAL and HIGH items must be resolved before Phase 4 (Build) begins.

---

## Summary of Findings

| Severity | Count | Description |
|----------|-------|-------------|
| CRITICAL | 7 | Data integrity bugs, enum mismatches that would cause runtime failures, security gaps |
| HIGH | 8 | Cross-spec inconsistencies that would cause integration failures |
| MEDIUM | 12 | Missing features, non-blocking inconsistencies, incomplete coverage |
| LOW | 6 | Typos, naming conventions, minor improvements |

---

## CRITICAL Findings

### C-01: Complexity Range Three-Way Mismatch (seed.sql vs COST-MANAGEMENT-SPEC vs ORCHESTRATOR-SPEC)

**Files:**
- `src/supabase/seed.sql` lines 13-15, 22-38
- `src/COST-MANAGEMENT-SPEC.md` lines 305-307, 333-365
- `src/ORCHESTRATOR-SPEC.md` lines 1111-1113, 1116-1119
- `src/API-ROUTES.md` lines 318-320

**Problem:** Three different complexity range definitions exist simultaneously:

| Source | Simple | Moderate | Complex |
|--------|--------|----------|---------|
| seed.sql + API-ROUTES.md + ORCHESTRATOR-SPEC `BUDGET_TIERS` | 0.0-2.5 | 2.6-6.5 | 6.6-10.0 |
| COST-MANAGEMENT-SPEC Section 3a table | 1.0-3.9 | 4.0-6.9 | 7.0-10.0 |
| COST-MANAGEMENT-SPEC `selectBudgetTier()` function | < 4.0 | 4.0-6.9 | >= 7.0 |
| ORCHESTRATOR-SPEC `selectBudgetTier()` function | <= 2.5 | 2.6-6.5 | > 6.5 |

A complexity score of 3.0 would be classified as "simple" by the orchestrator and seed.sql, but as "simple" (barely) by the COST-MANAGEMENT-SPEC table and function. A score of 3.5 would be "simple" in seed.sql/orchestrator but would still be "simple" in cost-spec (matches `< 4.0`). However, a score of 2.6 is "moderate" in seed.sql but "simple" in the cost-management spec. This **will** cause billing discrepancies.

**Fix:** Standardize on one set of ranges everywhere. Recommended canonical ranges (matching seed.sql, orchestrator, and API-ROUTES):
- Simple: 0.0-2.5
- Moderate: 2.6-6.5
- Complex: 6.6-10.0

Update COST-MANAGEMENT-SPEC Section 3a table, `selectBudgetTier()`, and all `BUDGET_TIERS` definitions to use these exact ranges and breakpoints.

---

### C-02: Token Ceiling Three-Way Mismatch (seed.sql vs ORCHESTRATOR-SPEC vs COST-MANAGEMENT-SPEC)

**Files:**
- `src/supabase/seed.sql` lines 24, 31, 38
- `src/ORCHESTRATOR-SPEC.md` lines 1111-1113
- `src/COST-MANAGEMENT-SPEC.md` lines 305-307, 335, 350, 365
- `src/API-ROUTES.md` lines 318-320

**Problem:** Token ceilings differ across three sources:

| Tier | seed.sql | ORCHESTRATOR-SPEC | COST-MANAGEMENT-SPEC (table) | COST-MANAGEMENT-SPEC (code) | API-ROUTES |
|------|---------|-------------------|------------------------------|----------------------------|------------|
| Simple | 50,000 | 60,000 | 50,000 | 50,000 | 60,000 |
| Moderate | 150,000 | 200,000 | 150,000 | 150,000 | 200,000 |
| Complex | 300,000 | 400,000 | 300,000 | 300,000 | 400,000 |

The orchestrator and API-ROUTES use higher token limits than the seed data and cost-management spec. If the code reads from the DB (seed.sql), budget enforcement will be tighter than the orchestrator expects, causing premature degradation.

**Fix:** Pick one set. The seed.sql values (50K / 150K / 300K) are more conservative and match COST-MANAGEMENT-SPEC. Update ORCHESTRATOR-SPEC and API-ROUTES to match, OR update seed.sql to match the orchestrator. Recommend the orchestrator values (60K / 200K / 400K) since those are what the code actually enforces.

---

### C-03: Model Name Inconsistency -- `claude-sonnet-4-6` vs `claude-sonnet-4`

**Files:**
- `src/ORCHESTRATOR-SPEC.md` (uses `claude-sonnet-4-6` throughout)
- `src/API-ROUTES.md` line 480 (uses `claude-sonnet-4-6`)
- `src/COST-MANAGEMENT-SPEC.md` (uses `claude-sonnet-4` throughout)

**Problem:** Two different Sonnet model identifiers used across specs:
- ORCHESTRATOR-SPEC + API-ROUTES: `claude-sonnet-4-6`
- COST-MANAGEMENT-SPEC: `claude-sonnet-4`

At build time, the `PRICING` lookup table in cost management will fail to find `claude-sonnet-4-6` (or vice versa), causing either a runtime crash or $0 cost calculation.

**Fix:** Standardize on one model name everywhere. If using the latest model naming, `claude-sonnet-4` is the correct public identifier (Anthropic uses `claude-sonnet-4-{date}` for dated versions). Pick one and replace all occurrences.

---

### C-04: Reporting Method Enum Mismatch Between SQL and API/JSON Schema

**Files:**
- `src/supabase/migrations/001_initial_schema.sql` lines 292-296: `reporting_method` enum = `'prompted', 'voluntary', 'lab_auto_import'`
- `src/API-ROUTES.md` line 740: `reporting_method: 'self_report' | 'lab_verified' | 'clinician_verified'`
- `schemas/consultation.json` line 208: `enum: ["self_report", "lab_verified", "clinician_verified"]`

**Problem:** The SQL `reporting_method` enum has completely different values from the API and JSON schema. An outcome report submitted via the API with `reporting_method: 'self_report'` will fail on INSERT because that value does not exist in the PostgreSQL enum.

**Fix:** Align the SQL enum to match the API and JSON schema:
```sql
CREATE TYPE reporting_method AS ENUM (
  'self_report',
  'lab_verified',
  'clinician_verified'
);
```

---

### C-05: Followup Type Enum Mismatch Between SQL and consultation.json

**Files:**
- `src/supabase/migrations/001_initial_schema.sql` lines 299-303: `followup_type` enum = `'subjective_check', 'lab_recheck', 'full_review'`
- `schemas/consultation.json` lines 231-232: `followup_schedule[].type` enum = `["outcome_check", "lab_recheck", "symptom_followup", "medication_review"]`

**Problem:** Only `lab_recheck` overlaps between the two. The SQL enum has `subjective_check` and `full_review` which don't exist in the JSON schema. The JSON schema has `outcome_check`, `symptom_followup`, and `medication_review` which don't exist in the SQL enum.

The DISCUSSION-PROTOCOL.md (lines 1216-1235) uses `subjective_check`, `lab_recheck`, and `full_review` -- matching the SQL.

**Fix:** The SQL enum aligns with DISCUSSION-PROTOCOL (the upstream spec). Update `consultation.json` to match:
```json
"enum": ["subjective_check", "lab_recheck", "full_review"]
```

---

### C-06: Outcome Adherence Enum Mismatch Between SQL and API/JSON Schema

**Files:**
- `src/supabase/migrations/001_initial_schema.sql` lines 275-280: `adherence_level` enum = `'followed_fully', 'followed_partially', 'did_not_follow', 'chose_alternative'`
- `src/API-ROUTES.md` line 725: `adherence: 'full' | 'partial' | 'none' | 'unknown'`
- `schemas/consultation.json` line 193: `adherence` enum = `["full", "partial", "none", "unknown"]`

**Problem:** Completely different string values. API sends `'full'`, SQL expects `'followed_fully'`. Every outcome report INSERT will fail.

**Fix:** Standardize. The SQL values (`followed_fully`, etc.) are more descriptive and match DISCUSSION-PROTOCOL.md. Update API-ROUTES and consultation.json to use the SQL values. Alternatively, add a mapping layer in the API handler, but aligning the enums is cleaner.

---

### C-07: consultation_messages RLS Blocks System/Specialist Messages

**Files:**
- `src/supabase/migrations/002_rls_policies.sql` lines 234-249

**Problem:** The `consultation_messages` SELECT policy requires `auth.uid() = user_id`. System and specialist messages are inserted by the `service_role` (bypassing RLS) but have `user_id` set to the consultation owner. This works correctly for reading because the `user_id` column on system/specialist messages must be the consultation owner's user_id.

However, the comment on line 231 says "System/specialist messages are inserted via service_role and readable by the consultation owner." This is correct ONLY if the `user_id` on system/specialist messages is set to the consultation owner -- which is not enforced by schema constraints. If a bug sets `user_id` to NULL or a system UUID, those messages become invisible.

**Fix:** Add a CHECK constraint or trigger ensuring `consultation_messages.user_id` matches the consultation owner:
```sql
-- Option A: Application-level enforcement (documented, enforced in code)
-- Option B: Trigger to auto-set user_id from consultations.user_id on INSERT
CREATE OR REPLACE FUNCTION set_message_user_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_id := (SELECT user_id FROM consultations WHERE id = NEW.consultation_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## HIGH Findings

### H-01: Missing ON DELETE Behavior for patient_profile_id FK on consultations

**File:** `src/supabase/migrations/001_initial_schema.sql` line 417

**Problem:** `patient_profile_id UUID NOT NULL REFERENCES patient_profiles(id)` has no `ON DELETE` clause. If a user deletes a patient profile version, the CASCADE from `users` -> `patient_profiles` will fail because `consultations` still references the profile. The DELETE will be blocked by the FK constraint.

The design comment says consultations reference a specific profile version for historical accuracy, which implies profiles should NOT cascade-delete from consultations. But the `users` CASCADE delete path is: `users` -> `patient_profiles` (CASCADE) -> blocked by `consultations.patient_profile_id`.

**Fix:** Add `ON DELETE SET NULL` and make the column nullable, OR add `ON DELETE CASCADE` if consultations should be deleted when profiles are deleted. Recommended: `ON DELETE SET NULL` (consultations remain, profile reference becomes null, the profile version is still recorded in `patient_profile_version` integer column, and `full_output` JSONB retains the data).

---

### H-02: Outcome Report `outcome` Enum Mismatch Between SQL and API

**Files:**
- `src/supabase/migrations/001_initial_schema.sql` lines 283-289: `subjective_outcome` enum = `'improved', 'unchanged', 'worsened', 'mixed', 'unsure'`
- `src/API-ROUTES.md` line 729: `outcome` enum = `'improved' | 'unchanged' | 'worsened' | 'not_followed' | 'chose_different_approach' | 'pending'`
- `schemas/consultation.json` lines 187-188: `outcome` enum = `["improved", "unchanged", "worsened", "not_followed", "chose_different_approach", "pending"]`

**Problem:** The SQL `subjective_outcome` enum has `mixed` and `unsure` but not `not_followed`, `chose_different_approach`, or `pending`. The API/JSON schema has the latter three but not `mixed` or `unsure`. Only `improved`, `unchanged`, and `worsened` overlap.

**Fix:** Merge both sets. The SQL enum should cover all use cases:
```sql
CREATE TYPE subjective_outcome AS ENUM (
  'improved', 'unchanged', 'worsened', 'mixed', 'unsure',
  'not_followed', 'chose_different_approach', 'pending'
);
```
Or align API to SQL if `not_followed`/`chose_different_approach` are covered by the separate `adherence` field (they arguably are redundant with adherence).

---

### H-03: Missing Tables from PRIVACY-SPEC Not in Migration 001

**Files:**
- `src/PRIVACY-SPEC.md` lines 850-874: `consent_records` table with RLS
- `src/COST-MANAGEMENT-SPEC.md` lines 949-983: `billing_accounts` and `billing_transactions` tables

**Problem:** The PRIVACY-SPEC defines a `consent_records` table (required for GDPR compliance) and the COST-MANAGEMENT-SPEC defines `billing_accounts` and `billing_transactions` tables. None of these exist in the initial schema migration.

The `consent_records` table is referenced in the deletion cascade (PRIVACY-SPEC Section 4b) and is a hard GDPR requirement. Missing it blocks the consent flow and account deletion flow.

**Fix:** Add `consent_records` to migration 001 (or a new migration 003). The billing tables can be deferred to a later phase since billing is marked "Future" in the spec.

---

### H-04: Severity Enum in condition.severity Uses Different Values Than SQL

**Files:**
- `src/PRIVACY-SPEC.md` line 182: `severity?: 'mild' | 'moderate' | 'severe'` (in DeidentifiedProfile)
- `schemas/shared-definitions.json` lines 24-32: `severity` enum = `["critical", "high", "moderate", "low", "informational"]`
- `src/supabase/migrations/001_initial_schema.sql` lines 40-46: `severity` enum matches shared-definitions

**Problem:** The `condition.severity` in the patient profile uses `mild/moderate/severe` (medical severity scale), but the unified `severity` enum in shared-definitions uses `critical/high/moderate/low/informational` (system severity scale). These are different domains -- medical condition severity vs. system alert severity. The SQL schema uses the system severity enum for `outcome_reports.severity_if_worsened`, which is correct for that context. But condition severity in `profile_data` JSONB would use `mild/moderate/severe`.

**Fix:** This is an intentional separation -- condition severity lives inside the JSONB `profile_data` column and uses its own scale. The `severity` PostgreSQL enum is for system-level severity flags. Document this explicitly in a comment on the `severity` enum. The PRIVACY-SPEC DeidentifiedProfile correctly uses the medical scale for conditions. No code change needed, but add a clarifying comment.

---

### H-05: consultation.json `followup_schedule` Has No Upstream Enum in shared-definitions.json

**File:** `schemas/consultation.json` lines 231-232

**Problem:** The `followup_schedule[].type` enum `["outcome_check", "lab_recheck", "symptom_followup", "medication_review"]` is defined inline in consultation.json instead of referencing shared-definitions.json. It also does not match the SQL `followup_type` enum (see C-05). There is no `followup_type` definition in shared-definitions.json at all.

**Fix:** Add a `followup_type` definition to `shared-definitions.json` matching the SQL enum values (`subjective_check`, `lab_recheck`, `full_review`). Then `$ref` it from consultation.json.

---

### H-06: Recommendation Priority Enum Mismatch Between SQL and agent-output.json

**Files:**
- `src/supabase/migrations/001_initial_schema.sql` lines 259-264: `recommendation_priority` = `'critical', 'high', 'medium', 'low'`
- `schemas/agent-output.json` line 116: `priority` enum = `["high", "medium", "low"]`

**Problem:** SQL has `critical` as a priority level. agent-output.json does not. If the moderator extracts a recommendation with `priority: 'critical'` during synthesis (from safety flags), the agent output schema validation would reject it, but the SQL INSERT would accept it. Misalignment creates a gap.

**Fix:** Add `"critical"` to agent-output.json's `priority` enum. Critical-priority recommendations are valid (e.g., "stop this medication immediately").

---

### H-07: Recommendation Category Enum Mismatch Between SQL and agent-output.json

**Files:**
- `src/supabase/migrations/001_initial_schema.sql` lines 250-256: `recommendation_category` = `'medication_adjustment', 'supplement', 'lifestyle', 'monitoring', 'referral'`
- `schemas/agent-output.json` lines 109-111: `type` enum = `["medication_adjustment", "new_medication", "lifestyle_change", "monitoring", "testing", "referral", "supplement", "dietary", "behavioral"]`

**Problem:** Different names, different values. SQL has 5 categories. agent-output.json has 9 `type` values. The mapping is non-trivial:
- SQL `lifestyle` != agent-output `lifestyle_change`
- agent-output has `new_medication`, `testing`, `dietary`, `behavioral` which have no SQL counterpart
- SQL `medication_adjustment` maps to agent-output `medication_adjustment` (match)
- SQL `supplement` maps to agent-output `supplement` (match)
- SQL `monitoring` maps to agent-output `monitoring` (match)
- SQL `referral` maps to agent-output `referral` (match)

The recommendations table stores extracted recommendations from agent outputs. If agents emit `type: 'new_medication'`, the INSERT into recommendations will fail (no matching `category` value).

**Fix:** Either expand the SQL `recommendation_category` enum to include all agent-output types, or add a mapping function in the extraction code that normalizes agent types to SQL categories (e.g., `new_medication` -> `medication_adjustment`, `lifestyle_change` -> `lifestyle`, `testing` -> `monitoring`, `dietary` -> `lifestyle`, `behavioral` -> `lifestyle`). Recommended: expand the SQL enum to be a superset and avoid lossy mapping.

---

### H-08: Missing `consent_records` and `user_settings` Tables for Privacy Opt-Out Controls

**Files:**
- `src/PRIVACY-SPEC.md` Section 4e (Right to Object): "Opt-out flags stored in user settings table"
- `src/PRIVACY-SPEC.md` Section 5a: `consent_records` table definition

**Problem:** The PRIVACY-SPEC references a "user settings table" for opt-out flags (outcome tracking, anonymized data sharing, cross-model verification) but no such table exists in the schema. The `users` table has `preferred_output_mode` and `email_notifications` but not the GDPR opt-out toggles.

**Fix:** Add columns to the `users` table:
```sql
opt_out_outcome_tracking BOOLEAN DEFAULT false,
opt_out_anonymized_analytics BOOLEAN DEFAULT false,
opt_out_cross_model_verification BOOLEAN DEFAULT false,
```

---

## MEDIUM Findings

### M-01: Missing Index on `consultations.budget_tier` for Analytics Queries

**File:** `src/supabase/migrations/001_initial_schema.sql`

**Problem:** The cost management and analytics systems will query consultations by budget tier. No index exists on `consultations.budget_tier`.

**Fix:** Add: `CREATE INDEX idx_consultations_budget_tier ON consultations(budget_tier);`

---

### M-02: Missing Index on `recommendations.category` for Aggregate Outcome Queries

**File:** `src/supabase/migrations/001_initial_schema.sql`

**Problem:** Aggregate analysis of recommendation outcomes by category requires scanning the full recommendations table. No index on `category`.

**Fix:** Add: `CREATE INDEX idx_recommendations_category ON recommendations(category);`

---

### M-03: No JSONB Schema Comment on `consultations.models_used`

**File:** `src/supabase/migrations/001_initial_schema.sql` line 438

**Problem:** The `models_used JSONB` column has no comment indicating its schema. Other JSONB columns have comments (e.g., `profile_data` references `schemas/patient-profile.json`).

**Fix:** Add: `COMMENT ON COLUMN consultations.models_used IS 'Map of role to model version. Example: {"classifier": "claude-haiku-4-5", "endocrinologist": "claude-opus-4-6"}';`

---

### M-04: No JSONB Schema Comment on `consultations.information_gain_per_round`

**File:** `src/supabase/migrations/001_initial_schema.sql` line 443

**Problem:** The `information_gain_per_round JSONB` column comment says "Array of floats per round" but does not reference a schema.

**Fix:** Add a more specific comment: `COMMENT ON COLUMN consultations.information_gain_per_round IS 'Array of floats [round_1_gain, round_2_gain, ...]. Each value is 0.0-1.0. Below 0.05 triggers termination (ORCHESTRATOR-SPEC Section 6).';`

---

### M-05: SSE Event Type `phase_transition` Exists in ORCHESTRATOR-SPEC But Not in API-ROUTES

**Files:**
- `src/ORCHESTRATOR-SPEC.md` line 1528: SSEEventType includes `'phase_transition'`
- `src/API-ROUTES.md` lines 438-456: SSEEventType registry does NOT include `phase_transition`

**Problem:** The orchestrator emits `phase_transition` events (lines 708, 765, 829) but the API-ROUTES SSE event type registry does not list it. Clients would receive an unknown event type.

**Fix:** Add `'phase_transition'` to the SSEEventType union in API-ROUTES.md.

---

### M-06: API Route Missing for Account Deletion (GDPR Requirement)

**Files:**
- `src/PRIVACY-SPEC.md` Section 4b: `DELETE /api/user/account`
- `src/PRIVACY-SPEC.md` Section 4a: `GET /api/user/data-export`
- `src/API-ROUTES.md`: Route index (lines 10-24)

**Problem:** The API-ROUTES spec does not include the GDPR-required endpoints:
- `DELETE /api/user/account` (Right to Erasure)
- `GET /api/user/data-export` (Right to Access / Portability)
- `PATCH /api/user/profile` (Right to Rectification -- partially covered by `POST /api/profiles`)

These are legally required for GDPR compliance.

**Fix:** Add these three routes to API-ROUTES.md with full request/response specs.

---

### M-07: No API Route for User Settings / Consent Management

**Files:**
- `src/PRIVACY-SPEC.md` Section 5: Consent management
- `src/API-ROUTES.md`: No consent endpoints

**Problem:** No API routes exist for:
- Viewing/granting/withdrawing consent
- Managing opt-out settings (outcome tracking, analytics, cross-model)

**Fix:** Add consent management routes to API-ROUTES.md.

---

### M-08: Timeout Math Does Not Add Up for Max Complexity Consultation

**Files:**
- `src/ORCHESTRATOR-SPEC.md` lines 356-358
- `src/API-ROUTES.md` lines 490-494

**Problem:** Worst-case timing for a 5-agent, 3-round complex consultation:
- Safety precheck: ~1s
- Classification: ~2s
- Evidence retrieval: 15s (hard timeout)
- Round 1 (5 agents parallel, 60s each): 60s worst case (parallel)
- Budget check: ~0ms
- Round 2 (5 agents parallel, 60s each): 60s worst case
- Round 3 (2-3 agents, 60s each): 60s worst case
- Synthesis: ~10s
- Safety postcheck: ~5s
- Store: ~2s
- **Total worst case: ~215s (3.6 minutes)**

This fits within the 600s consultation timeout. However, the round timeout is 180s. If agents individually time out at 60s, retry with Sonnet (another 60s), that is 120s per agent. In parallel, the round still only takes ~120s worst case. The math works.

**But:** The API-ROUTES doc says `estimated_duration_seconds` is returned in the 202 response. The example SSE stream shows completion at ~75 seconds. The actual worst case (215s) should inform the estimate. Currently no issue, but document the expected range: 30-215 seconds.

**Fix:** Document worst-case timing in the orchestrator spec. No code change needed.

---

### M-09: `SaftyPrecheckResult` Typo in ORCHESTRATOR-SPEC

**Files:**
- `src/ORCHESTRATOR-SPEC.md` lines 199, 213

**Problem:** `SaftyPrecheckResult` should be `SafetyPrecheckResult`. This is a type definition that will be copied verbatim into source code.

**Fix:** Rename to `SafetyPrecheckResult` in both occurrences.

---

### M-10: ORCHESTRATOR-SPEC `shouldTerminate` Returns Wrong `reason` for Non-Termination

**File:** `src/ORCHESTRATOR-SPEC.md` line 1087

**Problem:** When the function decides NOT to terminate, it returns `reason: 'consensus_reached'`. This is semantically wrong -- if we are not terminating, consensus was not reached. The reason should be `null` or `'proceeding_to_round_3'`.

**Fix:** Change line 1087 to: `return { terminate: false, reason: 'proceeding_to_round_3' };`

---

### M-11: No Rate Limit for `DELETE /api/user/account` or Data Export

**File:** `src/API-ROUTES.md` lines 1001-1011

**Problem:** The rate limit table does not include the GDPR endpoints (`DELETE /api/user/account`, `GET /api/user/data-export`). While these are not yet in the route index, they should be planned with rate limits to prevent abuse.

**Fix:** Add rate limits when adding the GDPR routes. Suggested: 1 deletion per day per user, 3 exports per day per user.

---

### M-12: consultation.json `discussion_metadata.total_rounds` Has `minimum: 1` But Initial State Has 0 Rounds

**File:** `schemas/consultation.json` line 64

**Problem:** The schema requires `total_rounds` minimum of 1, but the SQL default is 0 (`total_rounds INTEGER NOT NULL DEFAULT 0`). A consultation that fails during classification would have 0 rounds, violating the JSON schema.

**Fix:** Change the JSON schema minimum to 0: `"minimum": 0`.

---

## LOW Findings

### L-01: Inconsistent Use of `claude-sonnet-4-6` Naming

**Files:** Multiple

**Problem:** Anthropic model naming convention uses `claude-{model}-{version}` (e.g., `claude-opus-4-6`). The COST-MANAGEMENT-SPEC uses `claude-sonnet-4` (no date suffix) while ORCHESTRATOR-SPEC uses `claude-sonnet-4-6`. Real Anthropic model IDs are strings like `claude-sonnet-4-20250514`. Both spec names are internal aliases.

**Fix:** Pick a consistent internal alias format. Since `claude-opus-4-6` is used everywhere for Opus, use `claude-sonnet-4-6` for Sonnet to match the pattern.

---

### L-02: `aggregate_outcomes` RLS Uses `auth.role()` Instead of `auth.jwt() ->> 'role'`

**File:** `src/supabase/migrations/002_rls_policies.sql` line 207

**Problem:** `auth.role()` is a Supabase function that returns the role from the JWT. In Supabase, `auth.role()` returns `'authenticated'` for logged-in users. This is correct syntax. No actual issue -- just noting this for awareness that it depends on Supabase's built-in `auth.role()` function.

**Fix:** No change needed. This is correct for Supabase.

---

### L-03: `evidence_cache` TTL Cleanup Has No Cron/Scheduled Job Defined

**File:** `src/supabase/migrations/001_initial_schema.sql` lines 641-642

**Problem:** The `evidence_cache` table has `expires_at` column and an index for expired entries, but no mechanism for actually deleting expired rows is defined in the specs.

**Fix:** Add a note in the schema or a Supabase pg_cron job definition:
```sql
-- Schedule cleanup: DELETE FROM evidence_cache WHERE expires_at <= now()
-- Run via Supabase pg_cron every hour
```

---

### L-04: `budget_tier_pricing.complexity_range` is TEXT, Not Enforced

**File:** `src/supabase/migrations/001_initial_schema.sql` line 398

**Problem:** `complexity_range TEXT NOT NULL` stores ranges like `'0.0-2.5'` as free text. No CHECK constraint ensures the format is valid. A typo like `'0.0-25'` would be accepted.

**Fix:** Add a CHECK constraint: `CHECK (complexity_range ~ '^\d+\.\d+-\d+\.\d+$')`

---

### L-05: Missing `updated_at` Trigger on `outcome_reports` and `recommendations`

**File:** `src/supabase/migrations/001_initial_schema.sql` lines 683-701

**Problem:** The `updated_at` trigger is applied to `users`, `patient_profiles`, `consultations`, `budget_tier_pricing`, and `evidence_cache`. But `outcome_reports` and `recommendations` do not have `updated_at` columns at all. If they are append-only (no updates), this is fine. But `outcome_reports` might be updated (e.g., user corrects a report).

**Fix:** If outcome reports can be updated, add an `updated_at` column and trigger. If they are strictly append-only, document that explicitly.

---

### L-06: `consultation_messages` RLS Policy Name Inconsistency

**File:** `src/supabase/migrations/002_rls_policies.sql` lines 234-249

**Problem:** Policy names follow the pattern `{table}_{operation}_{scope}` (e.g., `users_select_own`). The consultation_messages policies match this pattern, so no actual issue. Noting for completeness.

**Fix:** No change needed.

---

## Cost Sanity Check (Question 23)

### 5-Agent, 3-Round Opus Consultation Cost Estimate

Using the orchestrator's pricing (`claude-opus-4-6`: $15/1M input, $75/1M output):

| Phase | Model | Input Tokens | Output Tokens | Cost |
|-------|-------|-------------|---------------|------|
| Classification | Haiku | ~2,000 | ~500 | $0.004 |
| Evidence (Perplexity) | sonar-pro | ~3,000 | ~2,000 | $0.05 |
| Round 1 (5 agents) | Opus | 5 x ~8,000 = 40,000 | 5 x 3,000 = 15,000 | $1.73 |
| Round 2 (5 agents) | Opus | 5 x ~12,000 = 60,000 | 5 x 2,000 = 10,000 | $1.65 |
| Round 3 (2 agents) | Opus | 2 x ~5,000 = 10,000 | 2 x 500 = 1,000 | $0.23 |
| Synthesis | Sonnet | ~15,000 | ~5,000 | $0.12 |
| Safety Check | Haiku | ~5,000 | ~1,000 | $0.008 |
| **Total** | | **~135,000** | **~34,500** | **~$3.79** |

This fits within the Complex tier $25 ceiling with significant headroom. The token total (~169,500) fits within the 300K ceiling (seed.sql) or 400K (orchestrator).

**However**, this estimate assumes relatively small input contexts. A real consultation with a comprehensive patient profile + full evidence package could push input tokens to 15,000-20,000 per agent in Round 1 and 25,000+ in Round 2 (when all Round 1 outputs are included). Revised estimate:

| Phase | Model | Input Tokens | Output Tokens | Cost |
|-------|-------|-------------|---------------|------|
| Round 1 (5 agents) | Opus | 5 x 18,000 = 90,000 | 5 x 3,000 = 15,000 | $2.48 |
| Round 2 (5 agents) | Opus | 5 x 28,000 = 140,000 | 5 x 2,000 = 10,000 | $2.85 |
| Round 3 (2 agents) | Opus | 2 x 10,000 = 20,000 | 2 x 500 = 1,000 | $0.38 |
| Other phases | Mixed | ~25,000 | ~8,500 | $0.20 |
| **Total** | | **~275,000** | **~34,500** | **~$5.91** |

Worst-case with large contexts: ~$8-12. Still fits $25 ceiling. The $25 budget is adequate.

**Finding:** Budget tiers are realistic. The Complex tier has sufficient headroom even for heavy consultations. The degradation cascade at 60-95% spend provides safety margin.

---

## Privacy Audit Summary (Questions 19-21)

### Q19: GDPR De-identification Assessment

The de-identification pipeline (PRIVACY-SPEC Section 2) is thorough. Key observations:

- **Re-identification risk:** Age + sex + rare condition combination could theoretically identify a patient. The spec strips country and ethnicity, reducing the risk. The k-anonymity >= 5 rule on Tier 3 aggregate data is a good safeguard.
- **Free text scrubbing:** The two-pass approach (regex + NER) with a conservative fallback (remove if confidence < 0.7) is appropriate.
- **Gap:** No mention of medication combination re-identification. A rare combination of 5+ medications could be quasi-identifying. The spec should note this risk and apply suppression rules for rare medication stacks in aggregate data.

### Q20: PII Data Flow Trace

Traced all external API calls:
- **Claude/GPT:** Receives DeidentifiedProfile (Tier 2 only). No PII. Confirmed.
- **Perplexity:** Receives only the clinical question (scrubbed) and condition/medication names. No patient profile data. Confirmed.
- **DrugBank/RxNorm:** Receives only drug names. No patient data. Confirmed.
- **PubMed/OpenFDA:** Receives only search terms/PMIDs. No patient data. Confirmed.
- **RunPod (PDF extraction):** Receives full PDFs -- this is flagged in the spec as the ONLY service seeing unredacted data, and it's self-hosted in EU. Acceptable.

**Verdict:** The data flow is clean. No PII reaches external APIs under normal operation. The de-identification guard (Section 6c) provides defense-in-depth.

### Q21: Account Deletion Cascade

The deletion cascade (PRIVACY-SPEC Section 4b) covers:
- `patient_profiles`: Hard delete (CASCADE from users)
- `consultations`: Hard delete (CASCADE from users)
- `recommendations`: Hard delete (CASCADE from consultations)
- `outcome_reports`: Hard delete (CASCADE from users + recommendations)
- `followup_schedule`: Hard delete (CASCADE from users + recommendations)
- `lab_history`: Hard delete (CASCADE from users)
- `consultation_messages`: Hard delete (CASCADE from users + consultations)
- `aggregate_outcomes`: No action (no user_id, already de-identified)
- `evidence_cache`: No action (shared, no user_id)

**Gap identified:** The `patient_profile_id` FK on `consultations` has no `ON DELETE` clause (see H-01). If CASCADE flows `users` -> `patient_profiles` -> (blocked by consultations FK), the deletion will fail. This must be fixed before account deletion can work.

**Gap identified:** The PRIVACY-SPEC references `consent_records` with `ON DELETE SET NULL` for user_id, but this table does not exist in the migration (see H-03).

---

## Consensus Detection Audit (Question 18)

The ORCHESTRATOR-SPEC `detectConsensus()` function (Section 6) aligns with DISCUSSION-PROTOCOL.md's `should_terminate()` function. Both check:
1. No unresolved disagreements -> consensus
2. Round 3 complete -> max rounds reached
3. Budget >= 95% -> budget exceeded
4. Information gain < 5% -> diminishing returns

The false consensus detection (`detect_false_consensus`) matches DISCUSSION-PROTOCOL.md Section 1b: echo chamber detection, confidence inflation, and suspicious unanimity are all implemented.

**Minor discrepancy:** DISCUSSION-PROTOCOL uses `state.total_tokens_used >= state.budget_ceiling * 0.95` (token-based), while ORCHESTRATOR-SPEC uses `state.budget.total_cost_usd / state.budget.tier.max_cost_usd` (cost-based). Cost-based is more accurate since token costs vary by model. This is an improvement, not a bug.

---

## State Machine Audit (Question 13)

All transitions are valid. No dead-end states exist outside the terminal states (`completed`, `failed`, `cancelled`). The emergency exit from any state to `completed` (with emergency response) is correctly handled. The budget HARD_STOP transition from `specialists_analyzing` directly to `synthesizing` is correct.

**Potential stuck state:** If the `synthesizing` phase fails (Sonnet call fails), there is no explicit fallback. The error recovery matrix (Section 10) handles `database_error` as fatal but does not specifically address synthesis failure. The emergency synthesis path handles budget exhaustion but not synthesis model failure.

**Fix:** Add an explicit synthesis retry with Haiku fallback in the error recovery matrix, or document that synthesis failure is fatal.

---

## Action Items for Phase 4 Readiness

### Must Fix (Blocking)
1. **C-01:** Standardize complexity ranges across all specs
2. **C-02:** Standardize token ceilings across all specs
3. **C-03:** Standardize model name (`claude-sonnet-4` vs `claude-sonnet-4-6`)
4. **C-04:** Fix `reporting_method` enum in SQL
5. **C-05:** Fix `followup_type` enum in consultation.json
6. **C-06:** Fix `adherence` enum mismatch
7. **C-07:** Add trigger/constraint for consultation_messages user_id
8. **H-01:** Add ON DELETE behavior to patient_profile_id FK
9. **H-02:** Fix `subjective_outcome` enum mismatch
10. **H-03:** Add `consent_records` table to migration
11. **H-06:** Add `critical` to agent-output.json priority enum
12. **H-07:** Align recommendation category enums
13. **M-06:** Add GDPR endpoints to API-ROUTES

### Should Fix (Before Beta)
14. **H-05:** Add `followup_type` to shared-definitions.json
15. **H-08:** Add GDPR opt-out columns to users table
16. **M-05:** Add `phase_transition` to API-ROUTES SSE event types
17. **M-09:** Fix `SaftyPrecheckResult` typo
18. **M-10:** Fix `shouldTerminate` return reason
19. **M-12:** Fix consultation.json total_rounds minimum

### Nice to Have
20. **M-01, M-02:** Add missing indexes
21. **M-03, M-04:** Add JSONB schema comments
22. **L-03:** Add evidence_cache TTL cleanup job
23. **L-04:** Add complexity_range format CHECK constraint
