-- ============================================================
-- COMBINED MIGRATION — run this once in the Supabase SQL Editor
-- Includes 000000 → 000001 → 000002 → 000003
-- All statements are idempotent (safe to re-run)
-- ============================================================

-- ─── 000000: RBAC ─────────────────────────────────────────────

-- 1. Extend profiles.role to include super-admin
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('agent', 'admin', 'super-admin'));

-- 2. Add org_id to categories
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

-- 3. Add org_id to messages
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

-- 4. Helper functions
CREATE OR REPLACE FUNCTION public.current_user_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT org_id FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super-admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- 5. RLS — TICKETS
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all agents" ON tickets;
DROP POLICY IF EXISTS "Enable all access for authenticated" ON tickets;
DROP POLICY IF EXISTS "tickets: super-admin full access" ON tickets;
DROP POLICY IF EXISTS "tickets: org members can read" ON tickets;
DROP POLICY IF EXISTS "tickets: agents can update" ON tickets;
DROP POLICY IF EXISTS "tickets: admins can insert" ON tickets;
DROP POLICY IF EXISTS "tickets: admins can delete" ON tickets;

CREATE POLICY "tickets: super-admin full access"
  ON tickets FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "tickets: org members can read"
  ON tickets FOR SELECT
  USING (org_id = current_user_org_id());

CREATE POLICY "tickets: agents can update"
  ON tickets FOR UPDATE
  USING (org_id = current_user_org_id())
  WITH CHECK (org_id = current_user_org_id());

CREATE POLICY "tickets: admins can insert"
  ON tickets FOR INSERT
  WITH CHECK (
    org_id = current_user_org_id()
    AND current_user_role() IN ('admin', 'super-admin')
  );

CREATE POLICY "tickets: admins can delete"
  ON tickets FOR DELETE
  USING (
    org_id = current_user_org_id()
    AND current_user_role() IN ('admin', 'super-admin')
  );

-- 6. RLS — MESSAGES
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all agents" ON messages;
DROP POLICY IF EXISTS "Enable all access for authenticated" ON messages;
DROP POLICY IF EXISTS "messages: super-admin full access" ON messages;
DROP POLICY IF EXISTS "messages: org members can read" ON messages;
DROP POLICY IF EXISTS "messages: org members can insert" ON messages;

CREATE POLICY "messages: super-admin full access"
  ON messages FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "messages: org members can read"
  ON messages FOR SELECT
  USING (org_id = current_user_org_id());

CREATE POLICY "messages: org members can insert"
  ON messages FOR INSERT
  WITH CHECK (org_id = current_user_org_id());

-- 7. RLS — CATEGORIES
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all agents" ON categories;
DROP POLICY IF EXISTS "Enable all access for authenticated" ON categories;
DROP POLICY IF EXISTS "categories: super-admin full access" ON categories;
DROP POLICY IF EXISTS "categories: org members can read" ON categories;
DROP POLICY IF EXISTS "categories: admins can manage" ON categories;

CREATE POLICY "categories: super-admin full access"
  ON categories FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "categories: org members can read"
  ON categories FOR SELECT
  USING (org_id = current_user_org_id());

CREATE POLICY "categories: admins can manage"
  ON categories FOR ALL
  USING (
    org_id = current_user_org_id()
    AND current_user_role() IN ('admin', 'super-admin')
  )
  WITH CHECK (
    org_id = current_user_org_id()
    AND current_user_role() IN ('admin', 'super-admin')
  );

-- 8. RLS — PROFILES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all agents" ON profiles;
DROP POLICY IF EXISTS "Enable all access for authenticated" ON profiles;
DROP POLICY IF EXISTS "profiles: super-admin full access" ON profiles;
DROP POLICY IF EXISTS "profiles: org members can read same org" ON profiles;
DROP POLICY IF EXISTS "profiles: users can update own" ON profiles;
DROP POLICY IF EXISTS "profiles: admins can manage org members" ON profiles;

CREATE POLICY "profiles: super-admin full access"
  ON profiles FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "profiles: org members can read same org"
  ON profiles FOR SELECT
  USING (org_id = current_user_org_id());

CREATE POLICY "profiles: users can update own"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles: admins can manage org members"
  ON profiles FOR ALL
  USING (
    org_id = current_user_org_id()
    AND current_user_role() IN ('admin', 'super-admin')
  )
  WITH CHECK (
    org_id = current_user_org_id()
    AND current_user_role() IN ('admin', 'super-admin')
  );

-- 9. RLS — ORGANIZATIONS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "organizations: super-admin full access" ON organizations;
DROP POLICY IF EXISTS "organizations: members can read own" ON organizations;
DROP POLICY IF EXISTS "organizations: admins can update own" ON organizations;

CREATE POLICY "organizations: super-admin full access"
  ON organizations FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "organizations: members can read own"
  ON organizations FOR SELECT
  USING (id = current_user_org_id());

CREATE POLICY "organizations: admins can update own"
  ON organizations FOR UPDATE
  USING (
    id = current_user_org_id()
    AND current_user_role() IN ('admin', 'super-admin')
  )
  WITH CHECK (
    id = current_user_org_id()
    AND current_user_role() IN ('admin', 'super-admin')
  );

-- 10. RLS — TICKET_CATEGORIES
ALTER TABLE ticket_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ticket_categories: super-admin full access" ON ticket_categories;
DROP POLICY IF EXISTS "ticket_categories: org members can read" ON ticket_categories;
DROP POLICY IF EXISTS "ticket_categories: org members can manage" ON ticket_categories;

CREATE POLICY "ticket_categories: super-admin full access"
  ON ticket_categories FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "ticket_categories: org members can read"
  ON ticket_categories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tickets t
      WHERE t.id = ticket_id AND t.org_id = current_user_org_id()
    )
  );

CREATE POLICY "ticket_categories: org members can manage"
  ON ticket_categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tickets t
      WHERE t.id = ticket_id AND t.org_id = current_user_org_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tickets t
      WHERE t.id = ticket_id AND t.org_id = current_user_org_id()
    )
  );

-- 11. RLS — TICKET_EVENTS
ALTER TABLE ticket_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ticket_events: super-admin full access" ON ticket_events;
DROP POLICY IF EXISTS "ticket_events: org members can read" ON ticket_events;
DROP POLICY IF EXISTS "ticket_events: org members can insert" ON ticket_events;

CREATE POLICY "ticket_events: super-admin full access"
  ON ticket_events FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "ticket_events: org members can read"
  ON ticket_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tickets t
      WHERE t.id = ticket_id AND t.org_id = current_user_org_id()
    )
  );

CREATE POLICY "ticket_events: org members can insert"
  ON ticket_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tickets t
      WHERE t.id = ticket_id AND t.org_id = current_user_org_id()
    )
  );

-- 12. RLS — ATTACHMENTS
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "attachments: super-admin full access" ON attachments;
DROP POLICY IF EXISTS "attachments: org members can read" ON attachments;
DROP POLICY IF EXISTS "attachments: org members can insert" ON attachments;

CREATE POLICY "attachments: super-admin full access"
  ON attachments FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "attachments: org members can read"
  ON attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN tickets t ON t.id = m.ticket_id
      WHERE m.id = message_id AND t.org_id = current_user_org_id()
    )
  );

CREATE POLICY "attachments: org members can insert"
  ON attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN tickets t ON t.id = m.ticket_id
      WHERE m.id = message_id AND t.org_id = current_user_org_id()
    )
  );

-- ─── 000001 + 000003: Data — Produtools org & super-admin ─────

INSERT INTO organizations (name, slug)
VALUES ('Produtools', 'produtools')
ON CONFLICT (slug) DO NOTHING;

DO $$
DECLARE
  v_org_id  uuid;
  v_user_id uuid;
BEGIN
  SELECT id INTO v_org_id FROM organizations WHERE slug = 'produtools' LIMIT 1;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Organization "produtools" not found after INSERT.';
  END IF;

  SELECT id INTO v_user_id FROM auth.users WHERE email = 'brunopiresbezerra@gmail.com' LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User "brunopiresbezerra@gmail.com" not found in auth.users.';
  END IF;

  INSERT INTO profiles (id, full_name, role, org_id)
  VALUES (v_user_id, 'Bruno Pires', 'super-admin', v_org_id)
  ON CONFLICT (id) DO UPDATE
    SET role   = 'super-admin',
        org_id = v_org_id;

  RAISE NOTICE 'Profile → user_id: %, org_id: %, role: super-admin', v_user_id, v_org_id;

  UPDATE tickets    SET org_id = v_org_id WHERE org_id IS NULL;
  UPDATE messages m SET org_id = t.org_id FROM tickets t WHERE m.ticket_id = t.id AND m.org_id IS NULL;
  UPDATE messages   SET org_id = v_org_id WHERE org_id IS NULL;
  UPDATE categories SET org_id = v_org_id WHERE org_id IS NULL;

  RAISE NOTICE 'Backfill complete.';
END $$;

-- ─── 000002: Branding columns & storage bucket ────────────────

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS primary_color text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS logo_url      text DEFAULT NULL;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'workspaces',
  'workspaces',
  true,
  2097152,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "workspaces: public read" ON storage.objects;
DROP POLICY IF EXISTS "workspaces: org members can upload" ON storage.objects;
DROP POLICY IF EXISTS "workspaces: org members can update" ON storage.objects;
DROP POLICY IF EXISTS "workspaces: org members can delete" ON storage.objects;
DROP POLICY IF EXISTS "workspaces: super-admin full access" ON storage.objects;

CREATE POLICY "workspaces: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'workspaces');

CREATE POLICY "workspaces: org members can upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'workspaces'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = current_user_org_id()::text
  );

CREATE POLICY "workspaces: org members can update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'workspaces'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = current_user_org_id()::text
  )
  WITH CHECK (
    bucket_id = 'workspaces'
    AND (storage.foldername(name))[1] = current_user_org_id()::text
  );

CREATE POLICY "workspaces: org members can delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'workspaces'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = current_user_org_id()::text
  );

CREATE POLICY "workspaces: super-admin full access"
  ON storage.objects FOR ALL
  USING (bucket_id = 'workspaces' AND is_super_admin())
  WITH CHECK (bucket_id = 'workspaces' AND is_super_admin());

-- ─── 000004: Slug redirect history ────────────────────────────

CREATE TABLE IF NOT EXISTS organization_slug_redirects (
  old_slug        text PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE organization_slug_redirects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "slug_redirects: public read" ON organization_slug_redirects;
DROP POLICY IF EXISTS "slug_redirects: super-admin full access" ON organization_slug_redirects;

-- Anonymous users need SELECT to resolve redirects on the public form
CREATE POLICY "slug_redirects: public read"
  ON organization_slug_redirects FOR SELECT
  USING (true);

-- Only super-admins write to this table (slug is super-admin-only)
CREATE POLICY "slug_redirects: super-admin full access"
  ON organization_slug_redirects FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());
