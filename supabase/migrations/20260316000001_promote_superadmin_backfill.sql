-- ============================================================
-- Maintenance: Promote super-admin & backfill org_id
-- Run this in the Supabase SQL Editor (as postgres / service role)
-- ============================================================

-- ─── Step 1: Ensure the Produtools organization exists ────────
-- If the row is already there it will be skipped (ON CONFLICT DO NOTHING).
INSERT INTO organizations (name, slug)
VALUES ('Produtools', 'produtools')
ON CONFLICT (slug) DO NOTHING;

-- ─── Step 2: Capture the org ID into a local variable ─────────
-- We use a CTE so every subsequent statement can reference it.
DO $$
DECLARE
  v_org_id   uuid;
  v_user_id  uuid;
BEGIN

  -- Resolve org
  SELECT id INTO v_org_id
  FROM organizations
  WHERE slug = 'produtools'
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Organization "produtools" not found after INSERT — check the organizations table.';
  END IF;

  -- Resolve auth user
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'brunopiresbezerra@gmail.com'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User "brunopiresbezerra@gmail.com" not found in auth.users — check the email.';
  END IF;

  -- ─── Step 3: Upsert the profile row ──────────────────────────
  -- Creates the profile if missing (first login via magic link / OAuth
  -- may not have triggered a profiles insert yet), otherwise updates it.
  INSERT INTO profiles (id, full_name, role, org_id)
  VALUES (v_user_id, 'Bruno Pires', 'super-admin', v_org_id)
  ON CONFLICT (id) DO UPDATE
    SET role   = 'super-admin',
        org_id = v_org_id;

  RAISE NOTICE 'Profile updated → user_id: %, org_id: %, role: super-admin', v_user_id, v_org_id;

  -- ─── Step 4: Backfill tickets ─────────────────────────────────
  UPDATE tickets
  SET org_id = v_org_id
  WHERE org_id IS NULL;

  RAISE NOTICE 'Tickets backfilled: % rows', FOUND::int;

  -- ─── Step 5: Backfill messages ────────────────────────────────
  -- Prefer deriving org_id from the related ticket for accuracy.
  UPDATE messages m
  SET org_id = t.org_id
  FROM tickets t
  WHERE m.ticket_id = t.id
    AND m.org_id IS NULL;

  RAISE NOTICE 'Messages backfilled via ticket join.';

  -- Catch any orphaned messages (no matching ticket) — assign to org directly.
  UPDATE messages
  SET org_id = v_org_id
  WHERE org_id IS NULL;

  -- ─── Step 6: Backfill categories ──────────────────────────────
  UPDATE categories
  SET org_id = v_org_id
  WHERE org_id IS NULL;

  RAISE NOTICE 'Categories backfilled.';

  -- ─── Step 7: Verification summary ────────────────────────────
  RAISE NOTICE '=== Verification ===';
  RAISE NOTICE 'Tickets  with org_id NULL: %', (SELECT COUNT(*) FROM tickets  WHERE org_id IS NULL);
  RAISE NOTICE 'Messages with org_id NULL: %', (SELECT COUNT(*) FROM messages WHERE org_id IS NULL);
  RAISE NOTICE 'Categories with org_id NULL: %', (SELECT COUNT(*) FROM categories WHERE org_id IS NULL);

END $$;

-- ─── Step 8: Enforce NOT NULL now that backfill is done ───────
-- (Remove the comments if you are confident the backfill is clean)
-- ALTER TABLE tickets    ALTER COLUMN org_id SET NOT NULL;
-- ALTER TABLE messages   ALTER COLUMN org_id SET NOT NULL;
-- ALTER TABLE categories ALTER COLUMN org_id SET NOT NULL;
