-- ============================================================================
-- Migration 003: GDPR consent_records + consultation_messages user_id trigger
-- Fixes: H-03 (missing consent table), C-07 (message user_id enforcement)
-- ============================================================================

-- Consent records (GDPR Article 7 compliance)
CREATE TABLE consent_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent_type    TEXT NOT NULL, -- 'data_processing', 'health_data', 'educational_tool', 'anonymized_sharing', 'outcome_tracking', 'email_followups', 'marketing'
  granted         BOOLEAN NOT NULL DEFAULT false,
  granted_at      TIMESTAMPTZ,
  withdrawn_at    TIMESTAMPTZ,
  consent_version TEXT NOT NULL DEFAULT '1.0', -- TOS/privacy policy version
  ip_address      TEXT, -- recorded at time of consent for audit
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_consent_user ON consent_records(user_id);
CREATE INDEX idx_consent_type ON consent_records(user_id, consent_type);

COMMENT ON TABLE consent_records IS 'GDPR Article 7 consent tracking. Every consent action (grant/withdraw) creates a record. Required for data processing lawful basis.';

-- Trigger to auto-set updated_at
CREATE TRIGGER set_updated_at_consent_records
  BEFORE UPDATE ON consent_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS for consent_records
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own consent records"
  ON consent_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own consent records"
  ON consent_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own consent records"
  ON consent_records FOR UPDATE
  USING (auth.uid() = user_id);

-- C-07 fix: Trigger to auto-set consultation_messages.user_id from consultation owner
CREATE OR REPLACE FUNCTION set_message_user_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_id := (SELECT user_id FROM consultations WHERE id = NEW.consultation_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_set_message_user_id
  BEFORE INSERT ON consultation_messages
  FOR EACH ROW EXECUTE FUNCTION set_message_user_id();

COMMENT ON TRIGGER auto_set_message_user_id ON consultation_messages IS 'C-07 fix: ensures system/specialist messages inherit the consultation owner user_id for RLS visibility';
