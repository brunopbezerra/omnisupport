-- ============================================================
-- Migration: Dynamic Form Builder
-- ============================================================

-- ─── forms ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS forms (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title      text        NOT NULL,
  slug       text        NOT NULL UNIQUE,
  status     varchar(10) NOT NULL DEFAULT 'draft'
               CONSTRAINT chk_forms_status CHECK (status IN ('draft', 'live')),
  settings   jsonb       NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ─── form_fields ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS form_fields (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id     uuid        NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  label       text        NOT NULL DEFAULT '',
  type        varchar(20) NOT NULL
                CONSTRAINT chk_field_type CHECK (type IN ('text','number','select','radio','checkbox','textarea')),
  required    boolean     NOT NULL DEFAULT false,
  order_index integer     NOT NULL DEFAULT 0,
  options     jsonb       NOT NULL DEFAULT '[]',
  mapping     jsonb       NOT NULL DEFAULT '{}'
);

-- ─── form_logic ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS form_logic (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id         uuid        NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  source_field_id uuid        NOT NULL REFERENCES form_fields(id) ON DELETE CASCADE,
  target_field_id uuid        NOT NULL REFERENCES form_fields(id) ON DELETE CASCADE,
  operator        varchar(20) NOT NULL
                    CONSTRAINT chk_logic_operator CHECK (operator IN ('equals','not_equals','contains')),
  value           text        NOT NULL DEFAULT ''
);

-- ─── ALTER tickets ────────────────────────────────────────────
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS metadata jsonb;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS form_id  uuid REFERENCES forms(id) ON DELETE SET NULL;

-- ============================================================
-- RLS: forms
-- ============================================================
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "forms: super-admin full access"    ON forms;
DROP POLICY IF EXISTS "forms: org members can read"       ON forms;
DROP POLICY IF EXISTS "forms: admins can manage"          ON forms;
DROP POLICY IF EXISTS "forms: anon can read live"         ON forms;

CREATE POLICY "forms: super-admin full access"
  ON forms FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "forms: org members can read"
  ON forms FOR SELECT
  USING (org_id = current_user_org_id());

CREATE POLICY "forms: admins can manage"
  ON forms FOR ALL
  USING (
    org_id = current_user_org_id()
    AND current_user_role() IN ('admin', 'super-admin')
  )
  WITH CHECK (
    org_id = current_user_org_id()
    AND current_user_role() IN ('admin', 'super-admin')
  );

CREATE POLICY "forms: anon can read live"
  ON forms FOR SELECT
  TO anon
  USING (status = 'live');

-- ============================================================
-- RLS: form_fields
-- ============================================================
ALTER TABLE form_fields ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "form_fields: super-admin full access" ON form_fields;
DROP POLICY IF EXISTS "form_fields: org members can read"    ON form_fields;
DROP POLICY IF EXISTS "form_fields: admins can manage"       ON form_fields;
DROP POLICY IF EXISTS "form_fields: anon can read live"      ON form_fields;

CREATE POLICY "form_fields: super-admin full access"
  ON form_fields FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "form_fields: org members can read"
  ON form_fields FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM forms
      WHERE forms.id = form_id
        AND forms.org_id = current_user_org_id()
    )
  );

CREATE POLICY "form_fields: admins can manage"
  ON form_fields FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM forms
      WHERE forms.id = form_id
        AND forms.org_id = current_user_org_id()
        AND current_user_role() IN ('admin', 'super-admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM forms
      WHERE forms.id = form_id
        AND forms.org_id = current_user_org_id()
        AND current_user_role() IN ('admin', 'super-admin')
    )
  );

CREATE POLICY "form_fields: anon can read live"
  ON form_fields FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM forms
      WHERE forms.id = form_id
        AND forms.status = 'live'
    )
  );

-- ============================================================
-- RLS: form_logic
-- ============================================================
ALTER TABLE form_logic ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "form_logic: super-admin full access" ON form_logic;
DROP POLICY IF EXISTS "form_logic: org members can read"    ON form_logic;
DROP POLICY IF EXISTS "form_logic: admins can manage"       ON form_logic;
DROP POLICY IF EXISTS "form_logic: anon can read live"      ON form_logic;

CREATE POLICY "form_logic: super-admin full access"
  ON form_logic FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "form_logic: org members can read"
  ON form_logic FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM forms
      WHERE forms.id = form_id
        AND forms.org_id = current_user_org_id()
    )
  );

CREATE POLICY "form_logic: admins can manage"
  ON form_logic FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM forms
      WHERE forms.id = form_id
        AND forms.org_id = current_user_org_id()
        AND current_user_role() IN ('admin', 'super-admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM forms
      WHERE forms.id = form_id
        AND forms.org_id = current_user_org_id()
        AND current_user_role() IN ('admin', 'super-admin')
    )
  );

CREATE POLICY "form_logic: anon can read live"
  ON form_logic FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM forms
      WHERE forms.id = form_id
        AND forms.status = 'live'
    )
  );

-- ============================================================
-- Anon INSERT policies (public form submission)
-- ============================================================
DROP POLICY IF EXISTS "tickets: anon can insert" ON tickets;
CREATE POLICY "tickets: anon can insert"
  ON tickets FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (SELECT 1 FROM organizations WHERE id = org_id)
  );

DROP POLICY IF EXISTS "messages: anon can insert" ON messages;
CREATE POLICY "messages: anon can insert"
  ON messages FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (SELECT 1 FROM tickets WHERE id = ticket_id)
  );
