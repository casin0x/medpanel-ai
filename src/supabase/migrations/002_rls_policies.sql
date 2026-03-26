-- ============================================================================
-- MedPanel AI: Row Level Security Policies
-- Migration 002 — Phase 3.2
--
-- Design decisions:
--   1. Every table with user_id: users can only SELECT/INSERT/UPDATE/DELETE
--      their own rows (auth.uid() = user_id).
--   2. recommendations: access controlled via consultation ownership —
--      user can see recommendations belonging to their consultations.
--   3. aggregate_outcomes: NO user_id. Public read (anonymized data for
--      evidence building). System-only write (via service_role key).
--   4. evidence_cache: shared cache. Public read for authenticated users.
--      System-only write (populated by evidence pipeline).
--   5. budget_tier_pricing: public read (all users need pricing info).
--      System-only write (admin managed via seed/migration).
--   6. All policies use auth.uid() which maps to auth.users.id and our
--      users.id (they are the same UUID).
-- ============================================================================

-- ============================================================================
-- USERS
-- Users can read and update their own profile only.
-- Insert happens via Supabase Auth trigger (on_auth_user_created).
-- ============================================================================

CREATE POLICY "users_select_own"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "users_insert_own"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_own"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- No delete policy — account deletion handled via Supabase Auth cascade

-- ============================================================================
-- PATIENT_PROFILES
-- Users can CRUD their own profiles (all versions).
-- ============================================================================

CREATE POLICY "patient_profiles_select_own"
  ON patient_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "patient_profiles_insert_own"
  ON patient_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "patient_profiles_update_own"
  ON patient_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "patient_profiles_delete_own"
  ON patient_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- CONSULTATIONS
-- Users can CRUD their own consultations.
-- ============================================================================

CREATE POLICY "consultations_select_own"
  ON consultations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "consultations_insert_own"
  ON consultations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "consultations_update_own"
  ON consultations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "consultations_delete_own"
  ON consultations FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- RECOMMENDATIONS
-- No direct user_id column. Access controlled via consultation ownership.
-- A user can see recommendations belonging to their consultations.
-- Insert/update/delete only for recommendations in their consultations.
-- ============================================================================

CREATE POLICY "recommendations_select_own"
  ON recommendations FOR SELECT
  USING (
    consultation_id IN (
      SELECT id FROM consultations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "recommendations_insert_own"
  ON recommendations FOR INSERT
  WITH CHECK (
    consultation_id IN (
      SELECT id FROM consultations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "recommendations_update_own"
  ON recommendations FOR UPDATE
  USING (
    consultation_id IN (
      SELECT id FROM consultations WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    consultation_id IN (
      SELECT id FROM consultations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "recommendations_delete_own"
  ON recommendations FOR DELETE
  USING (
    consultation_id IN (
      SELECT id FROM consultations WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- OUTCOME_REPORTS
-- Users can CRUD their own outcome reports.
-- ============================================================================

CREATE POLICY "outcome_reports_select_own"
  ON outcome_reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "outcome_reports_insert_own"
  ON outcome_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "outcome_reports_update_own"
  ON outcome_reports FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "outcome_reports_delete_own"
  ON outcome_reports FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- FOLLOWUP_SCHEDULE
-- Users can read and update their own follow-ups.
-- Insert is system-managed (created when consultation completes).
-- We allow user insert too for manual schedule additions.
-- ============================================================================

CREATE POLICY "followup_schedule_select_own"
  ON followup_schedule FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "followup_schedule_insert_own"
  ON followup_schedule FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "followup_schedule_update_own"
  ON followup_schedule FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "followup_schedule_delete_own"
  ON followup_schedule FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- LAB_HISTORY
-- Users can CRUD their own lab results.
-- ============================================================================

CREATE POLICY "lab_history_select_own"
  ON lab_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "lab_history_insert_own"
  ON lab_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "lab_history_update_own"
  ON lab_history FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "lab_history_delete_own"
  ON lab_history FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- AGGREGATE_OUTCOMES
-- Anonymized data — no user_id column.
-- Public read: any authenticated user can query aggregate data.
-- System-only write: only service_role (backend) can insert.
-- No update or delete from client — immutable append-only.
-- ============================================================================

CREATE POLICY "aggregate_outcomes_select_authenticated"
  ON aggregate_outcomes FOR SELECT
  USING (auth.role() = 'authenticated');

-- No INSERT/UPDATE/DELETE policies for authenticated users.
-- Writes happen via service_role key from the backend only.
-- The service_role key bypasses RLS, so no explicit policy needed for writes.

-- ============================================================================
-- EVIDENCE_CACHE
-- Shared cache — not user-specific.
-- Read: any authenticated user (evidence is shared knowledge).
-- Write: system-only (evidence pipeline populates via service_role).
-- ============================================================================

CREATE POLICY "evidence_cache_select_authenticated"
  ON evidence_cache FOR SELECT
  USING (auth.role() = 'authenticated');

-- No INSERT/UPDATE/DELETE policies for authenticated users.
-- Cache management happens via service_role key from the evidence pipeline.

-- ============================================================================
-- CONSULTATION_MESSAGES
-- Users can CRUD their own messages.
-- System/specialist messages are inserted via service_role and readable
-- by the consultation owner.
-- ============================================================================

CREATE POLICY "consultation_messages_select_own"
  ON consultation_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "consultation_messages_insert_own"
  ON consultation_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "consultation_messages_update_own"
  ON consultation_messages FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "consultation_messages_delete_own"
  ON consultation_messages FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- BUDGET_TIER_PRICING
-- Public read: all authenticated users can see pricing.
-- Write: system-only (managed via migrations/seed).
-- ============================================================================

CREATE POLICY "budget_tier_pricing_select_authenticated"
  ON budget_tier_pricing FOR SELECT
  USING (auth.role() = 'authenticated');

-- No INSERT/UPDATE/DELETE policies for authenticated users.
-- Pricing is managed via migrations and seed data.
