-- ============================================================
-- Migration: Dynamic Branding & Media Management
-- ============================================================

-- ─── 1. Add branding columns to organizations ────────────────
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS primary_color text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS logo_url      text DEFAULT NULL;

-- primary_color stores a CSS hex string e.g. '#3b82f6'
-- logo_url stores the Supabase Storage public URL for the org logo

-- ─── 2. Create workspaces storage bucket ─────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'workspaces',
  'workspaces',
  true,
  2097152,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ─── 3. Storage RLS Policies ─────────────────────────────────

-- Public read (bucket is public so URLs are directly accessible)
CREATE POLICY "workspaces: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'workspaces');

-- Org members can INSERT into their own org_id folder
-- Path convention: {org_id}/logo.webp  or  {org_id}/avatars/{user_id}.webp
CREATE POLICY "workspaces: org members can upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'workspaces'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = current_user_org_id()::text
  );

-- Org members can UPDATE (upsert) their own org's objects
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

-- Org members can DELETE their own org's objects
CREATE POLICY "workspaces: org members can delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'workspaces'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = current_user_org_id()::text
  );

-- Super-admin: full access to all workspace storage objects
CREATE POLICY "workspaces: super-admin full access"
  ON storage.objects FOR ALL
  USING (bucket_id = 'workspaces' AND is_super_admin())
  WITH CHECK (bucket_id = 'workspaces' AND is_super_admin());
