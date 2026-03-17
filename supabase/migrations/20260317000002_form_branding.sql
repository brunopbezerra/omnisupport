-- Form branding: all new fields live inside forms.settings (JSONB) — no column changes needed.
-- New keys added to the settings object:
--   header_image_url   TEXT    — public URL of banner image in storage bucket 'workspaces'
--   primary_color      TEXT    — hex override (e.g. '#3b82f6'); falls back to org primary_color
--   footer_html        TEXT    — raw HTML for the form footer (legal notices, privacy links)
--   thank_you_title    TEXT    — heading on the post-submission screen
--   thank_you_text     TEXT    — body copy on the post-submission screen (already existed)
--   thank_you_image_url TEXT   — optional success illustration URL
--   cta_label          TEXT    — label for the CTA button on the thank-you page
--   redirect_url       TEXT    — URL to redirect to after submission
--   redirect_delay     INTEGER — seconds before automatic redirect (0 / NULL = disabled)
--
-- Storage: images are uploaded to the 'workspaces' bucket under
--   form-branding/{form_id}/banner   (header image)
--   form-branding/{form_id}/success  (thank-you image)
-- Make sure the bucket exists and has appropriate RLS policies allowing:
--   - authenticated (admin/super-admin) users to upload/delete
--   - public (anon) users to SELECT (read)

-- Ensure the storage bucket exists (run once manually or via Supabase Studio if not present)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('workspaces', 'workspaces', true)
-- ON CONFLICT (id) DO NOTHING;

-- Allow admins to upload form branding images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'form_branding_upload'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY form_branding_upload ON storage.objects
        FOR INSERT TO authenticated
        WITH CHECK (
          bucket_id = 'workspaces'
          AND name LIKE 'form-branding/%'
        )
    $pol$;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'form_branding_delete'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY form_branding_delete ON storage.objects
        FOR DELETE TO authenticated
        USING (
          bucket_id = 'workspaces'
          AND name LIKE 'form-branding/%'
        )
    $pol$;
  END IF;
END $$;
