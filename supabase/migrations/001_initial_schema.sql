-- BroadcastHQ — Complete Database Schema
-- Run in Supabase SQL editor or via: supabase db push

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- WORKSPACES (Multi-tenancy root)
-- ============================================================
CREATE TABLE workspaces (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  avatar_url TEXT,
  plan_id    TEXT        NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- PROFILES (Auth users linked to workspaces with roles)
-- ============================================================
CREATE TABLE profiles (
  id           UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email        TEXT        NOT NULL,
  name         TEXT,
  role         TEXT        NOT NULL DEFAULT 'owner'
                 CHECK (role IN ('owner','admin','editor','viewer')),
  status       TEXT        NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active','invited')),
  last_active  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_workspace ON profiles(workspace_id);

-- ============================================================
-- WHATSAPP CONNECTIONS (Meta Cloud API credentials per workspace)
-- ============================================================
CREATE TABLE whatsapp_connections (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        UUID        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  waba_id             TEXT,
  phone_number_id     TEXT,
  phone_number        TEXT,
  access_token        TEXT,
  verification_status TEXT        NOT NULL DEFAULT 'unverified'
                        CHECK (verification_status IN ('verified','unverified','pending')),
  quality_rating      TEXT        CHECK (quality_rating IN ('high','medium','low')),
  messaging_limit     TEXT,
  is_active           BOOLEAN     NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_whatsapp_connections_workspace ON whatsapp_connections(workspace_id);

-- ============================================================
-- TEMPLATES (WhatsApp approved message templates)
-- ============================================================
CREATE TABLE templates (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     UUID        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name             TEXT        NOT NULL,
  category         TEXT        NOT NULL DEFAULT 'MARKETING'
                     CHECK (category IN ('MARKETING','UTILITY','AUTHENTICATION')),
  language         TEXT        NOT NULL DEFAULT 'en_US',
  status           TEXT        NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('approved','pending','rejected')),
  content          TEXT        NOT NULL,
  variables        TEXT[]      DEFAULT '{}',
  meta_template_id TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_templates_workspace      ON templates(workspace_id);
CREATE UNIQUE INDEX idx_templates_name    ON templates(workspace_id, name);

-- ============================================================
-- CAMPAIGNS
-- ============================================================
CREATE TABLE campaigns (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id       UUID        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name               TEXT        NOT NULL,
  status             TEXT        NOT NULL DEFAULT 'draft'
                       CHECK (status IN ('draft','scheduled','running','completed','failed')),
  template_id        UUID        REFERENCES templates(id) ON DELETE SET NULL,
  template_name      TEXT,
  template_variables JSONB       DEFAULT '{}',
  recipients_count   INTEGER     NOT NULL DEFAULT 0,
  delivery_rate      FLOAT       NOT NULL DEFAULT 0,
  read_rate          FLOAT       NOT NULL DEFAULT 0,
  fail_count         INTEGER     NOT NULL DEFAULT 0,
  sent_date          TIMESTAMPTZ,
  scheduled_date     TIMESTAMPTZ,
  tags               TEXT[]      DEFAULT '{}',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaigns_workspace ON campaigns(workspace_id);
CREATE INDEX idx_campaigns_status    ON campaigns(workspace_id, status);

-- ============================================================
-- CONTACTS
-- ============================================================
CREATE TABLE contacts (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  phone         TEXT        NOT NULL,
  first_name    TEXT,
  last_name     TEXT,
  status        TEXT        NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','opted_out','bounced','unverified')),
  tags          TEXT[]      DEFAULT '{}',
  custom_fields JSONB       DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active   TIMESTAMPTZ,
  UNIQUE (workspace_id, phone)
);

CREATE INDEX idx_contacts_workspace     ON contacts(workspace_id);
CREATE INDEX idx_contacts_status        ON contacts(workspace_id, status);
CREATE INDEX idx_contacts_tags          ON contacts USING GIN(tags);
CREATE INDEX idx_contacts_custom_fields ON contacts USING GIN(custom_fields);

-- ============================================================
-- MESSAGES (Per-message delivery tracking)
-- ============================================================
CREATE TABLE messages (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  campaign_id  UUID        REFERENCES campaigns(id) ON DELETE SET NULL,
  contact_id   UUID        NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  status       TEXT        NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','sent','delivered','read','failed','replied')),
  content      TEXT,
  twilio_sid   TEXT,
  sent_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  read_at      TIMESTAMPTZ,
  error_reason TEXT
);

CREATE INDEX idx_messages_workspace  ON messages(workspace_id);
CREATE INDEX idx_messages_campaign   ON messages(campaign_id);
CREATE INDEX idx_messages_contact    ON messages(contact_id);
CREATE INDEX idx_messages_status     ON messages(workspace_id, status);
CREATE INDEX idx_messages_twilio_sid ON messages(twilio_sid) WHERE twilio_sid IS NOT NULL;

-- ============================================================
-- API KEYS (External integration — HMAC-SHA256 hashed)
-- ============================================================
CREATE TABLE api_keys (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  key_prefix   TEXT        NOT NULL,
  key_hash     TEXT        NOT NULL UNIQUE,
  permissions  JSONB       NOT NULL DEFAULT
                 '{"campaigns":["read","run"],"contacts":["read","write"],"messages":["read"]}',
  is_active    BOOLEAN     NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ,
  created_by   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_keys_workspace ON api_keys(workspace_id);
CREATE INDEX idx_api_keys_hash      ON api_keys(key_hash);

-- ============================================================
-- IMPORT JOBS (CSV contact import tracking)
-- ============================================================
CREATE TABLE import_jobs (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     UUID        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  filename         TEXT        NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','processing','completed','failed')),
  total_rows       INTEGER     NOT NULL DEFAULT 0,
  processed_rows   INTEGER     NOT NULL DEFAULT 0,
  new_contacts     INTEGER     NOT NULL DEFAULT 0,
  updated_contacts INTEGER     NOT NULL DEFAULT 0,
  skipped_contacts INTEGER     NOT NULL DEFAULT 0,
  errors           JSONB       DEFAULT '[]',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_import_jobs_workspace ON import_jobs(workspace_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE workspaces           ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates            ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns            ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages             ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys             ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_jobs          ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION get_workspace_id()
RETURNS UUID AS $$
  SELECT workspace_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE POLICY workspace_isolation        ON workspaces           FOR ALL USING (id = get_workspace_id());
CREATE POLICY profiles_isolation         ON profiles             FOR ALL USING (workspace_id = get_workspace_id());
CREATE POLICY wa_connections_isolation   ON whatsapp_connections FOR ALL USING (workspace_id = get_workspace_id());
CREATE POLICY templates_isolation        ON templates            FOR ALL USING (workspace_id = get_workspace_id());
CREATE POLICY campaigns_isolation        ON campaigns            FOR ALL USING (workspace_id = get_workspace_id());
CREATE POLICY contacts_isolation         ON contacts             FOR ALL USING (workspace_id = get_workspace_id());
CREATE POLICY messages_isolation         ON messages             FOR ALL USING (workspace_id = get_workspace_id());
CREATE POLICY api_keys_isolation         ON api_keys             FOR ALL USING (workspace_id = get_workspace_id());
CREATE POLICY import_jobs_isolation      ON import_jobs          FOR ALL USING (workspace_id = get_workspace_id());

-- ============================================================
-- TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON templates FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_wa_connections_updated_at
  BEFORE UPDATE ON whatsapp_connections FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_import_jobs_updated_at
  BEFORE UPDATE ON import_jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-recalculate campaign delivery/read rates from message status changes
CREATE OR REPLACE FUNCTION recalculate_campaign_analytics(p_campaign_id UUID)
RETURNS VOID AS $$
DECLARE
  v_total INTEGER; v_delivered INTEGER; v_read INTEGER; v_failed INTEGER;
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status IN ('delivered','read')),
    COUNT(*) FILTER (WHERE status = 'read'),
    COUNT(*) FILTER (WHERE status = 'failed')
  INTO v_total, v_delivered, v_read, v_failed
  FROM messages WHERE campaign_id = p_campaign_id;

  IF v_total > 0 THEN
    UPDATE campaigns SET
      recipients_count = v_total,
      delivery_rate    = ROUND((v_delivered::FLOAT / v_total * 100)::NUMERIC, 1),
      read_rate        = ROUND((v_read::FLOAT    / v_total * 100)::NUMERIC, 1),
      fail_count       = v_failed,
      updated_at       = now()
    WHERE id = p_campaign_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION trigger_recalculate_campaign()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.campaign_id IS NOT NULL THEN
    PERFORM recalculate_campaign_analytics(NEW.campaign_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recalculate_on_message_change
  AFTER INSERT OR UPDATE OF status ON messages
  FOR EACH ROW EXECUTE FUNCTION trigger_recalculate_campaign();

-- ============================================================
-- ANALYTICS VIEW (fast workspace-level dashboard queries)
-- ============================================================
CREATE OR REPLACE VIEW workspace_analytics AS
SELECT
  w.id                                                                       AS workspace_id,
  COUNT(DISTINCT c.id)                                                       AS total_contacts,
  COUNT(DISTINCT ca.id)                                                      AS total_campaigns,
  COUNT(DISTINCT ca.id) FILTER (WHERE ca.status = 'running')                AS active_campaigns,
  COALESCE(SUM(msg.cnt), 0)                                                  AS total_messages_sent,
  COALESCE(AVG(ca.delivery_rate) FILTER (WHERE ca.status = 'completed'), 0) AS avg_delivery_rate,
  COALESCE(AVG(ca.read_rate)     FILTER (WHERE ca.status = 'completed'), 0) AS avg_read_rate
FROM workspaces w
LEFT JOIN contacts  c   ON c.workspace_id  = w.id
LEFT JOIN campaigns ca  ON ca.workspace_id = w.id
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS cnt FROM messages WHERE campaign_id = ca.id AND status != 'failed'
) msg ON true
GROUP BY w.id;
