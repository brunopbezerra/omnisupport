-- ============================================================
-- Migration: Workspace & RBAC Architecture
-- ============================================================

-- ─── 1. Extend profiles.role to include super-admin ──────────
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('agent', 'admin', 'super-admin'));

-- ─── 2. Add org_id to categories ─────────────────────────────
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

-- Backfill: assign existing categories to the first org (manual fix may be needed)
-- UPDATE categories SET org_id = (SELECT id FROM organizations LIMIT 1) WHERE org_id IS NULL;

-- After backfilling, enforce NOT NULL
-- ALTER TABLE categories ALTER COLUMN org_id SET NOT NULL;

-- ─── 3. Add org_id to messages ────────────────────────────────
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

-- Backfill from related ticket
-- UPDATE messages m SET org_id = t.org_id FROM tickets t WHERE m.ticket_id = t.id AND m.org_id IS NULL;

-- After backfilling, enforce NOT NULL
-- ALTER TABLE messages ALTER COLUMN org_id SET NOT NULL;

-- ─── 4. Helper function: get current user's org_id ───────────
CREATE OR REPLACE FUNCTION public.current_user_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT org_id FROM profiles WHERE id = auth.uid();
$$;

-- ─── 5. Helper function: is current user a super-admin ────────
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

-- ─── 6. Helper function: get current user's role ──────────────
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- ─── TICKETS ─────────────────────────────────────────────────
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Drop all existing permissive policies
DROP POLICY IF EXISTS "Enable read access for all agents" ON tickets;
DROP POLICY IF EXISTS "Enable all access for authenticated" ON tickets;

-- Super-admin: full access
CREATE POLICY "tickets: super-admin full access"
  ON tickets FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Org members: read their org's tickets
CREATE POLICY "tickets: org members can read"
  ON tickets FOR SELECT
  USING (org_id = current_user_org_id());

-- Agents: can update tickets in their org (but not delete)
CREATE POLICY "tickets: agents can update"
  ON tickets FOR UPDATE
  USING (org_id = current_user_org_id())
  WITH CHECK (org_id = current_user_org_id());

-- Admins: can insert tickets in their org
CREATE POLICY "tickets: admins can insert"
  ON tickets FOR INSERT
  WITH CHECK (
    org_id = current_user_org_id()
    AND current_user_role() IN ('admin', 'super-admin')
  );

-- Admins: can delete tickets in their org
CREATE POLICY "tickets: admins can delete"
  ON tickets FOR DELETE
  USING (
    org_id = current_user_org_id()
    AND current_user_role() IN ('admin', 'super-admin')
  );

-- ─── MESSAGES ────────────────────────────────────────────────
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all agents" ON messages;
DROP POLICY IF EXISTS "Enable all access for authenticated" ON messages;

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

-- ─── CATEGORIES ──────────────────────────────────────────────
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all agents" ON categories;
DROP POLICY IF EXISTS "Enable all access for authenticated" ON categories;

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

-- ─── PROFILES ────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all agents" ON profiles;
DROP POLICY IF EXISTS "Enable all access for authenticated" ON profiles;

CREATE POLICY "profiles: super-admin full access"
  ON profiles FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Users can read profiles in their org (to populate assignment dropdowns, etc.)
CREATE POLICY "profiles: org members can read same org"
  ON profiles FOR SELECT
  USING (org_id = current_user_org_id());

-- Users can update their own profile
CREATE POLICY "profiles: users can update own"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admins can manage profiles in their org
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

-- ─── ORGANIZATIONS ───────────────────────────────────────────
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "organizations: super-admin full access"
  ON organizations FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Members can read their own org
CREATE POLICY "organizations: members can read own"
  ON organizations FOR SELECT
  USING (id = current_user_org_id());

-- Admins can update their own org
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

-- ─── TICKET_CATEGORIES ───────────────────────────────────────
ALTER TABLE ticket_categories ENABLE ROW LEVEL SECURITY;

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

-- ─── TICKET_EVENTS / AUDIT_LOGS ──────────────────────────────
ALTER TABLE ticket_events ENABLE ROW LEVEL SECURITY;

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

-- ─── ATTACHMENTS ─────────────────────────────────────────────
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

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

-- ─── PUBLIC: allow anonymous ticket creation via org slug ─────
-- The /[slug] public form uses an anon key and inserts tickets + messages.
-- Adjust the anon role policies as needed for your public form.
-- Example: allow anon INSERT on tickets if org exists and is active.
