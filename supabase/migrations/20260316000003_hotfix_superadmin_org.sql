-- ============================================================
-- Hotfix: Re-anchor super-admin to Produtools org
-- Run this in the Supabase SQL editor, then reload the app.
-- ============================================================

DO $$
DECLARE
  target_org_id UUID;
BEGIN
  -- 1. Resolve the Produtools org (create it if it doesn't exist)
  SELECT id INTO target_org_id
  FROM organizations
  WHERE slug = 'produtools'
  LIMIT 1;

  IF target_org_id IS NULL THEN
    INSERT INTO organizations (name, slug)
    VALUES ('Produtools', 'produtools')
    RETURNING id INTO target_org_id;
    RAISE NOTICE 'Created Produtools org: %', target_org_id;
  ELSE
    RAISE NOTICE 'Found existing Produtools org: %', target_org_id;
  END IF;

  -- 2. Re-anchor the super-admin profile
  UPDATE profiles
  SET org_id = target_org_id,
      role   = 'super-admin'
  WHERE id = (
    SELECT id FROM auth.users
    WHERE email = 'brunopiresbezerra@gmail.com'
  );

  RAISE NOTICE 'Profile updated for brunopiresbezerra@gmail.com';

  -- 3. Backfill any orphaned rows that belong to no org
  UPDATE tickets    SET org_id = target_org_id WHERE org_id IS NULL;
  UPDATE messages   SET org_id = target_org_id WHERE org_id IS NULL;
  UPDATE categories SET org_id = target_org_id WHERE org_id IS NULL;

  RAISE NOTICE 'Orphaned rows backfilled to org: %', target_org_id;
END $$;
