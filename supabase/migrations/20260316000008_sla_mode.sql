-- Add sla_mode to organizations
-- 'calendar' = wall-clock minutes (default)
-- 'business' = Mon–Fri 09:00–18:00 UTC only

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS sla_mode varchar(10) NOT NULL DEFAULT 'calendar'
  CONSTRAINT chk_sla_mode CHECK (sla_mode IN ('calendar', 'business'));


-- ─── Helper: business minutes between two timestamps ────────────────────────
-- Assumption: business hours are Mon–Fri 09:00–18:00 UTC.
-- Timezone support (per-org) can be added later as a follow-up.

CREATE OR REPLACE FUNCTION business_minutes_between(
  p_start timestamptz,
  p_end   timestamptz
)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_cur        date;
  v_last       date;
  v_mins       numeric := 0;
  v_slot_start timestamptz;
  v_slot_end   timestamptz;
BEGIN
  IF p_end <= p_start THEN RETURN 0; END IF;

  v_cur  := (p_start AT TIME ZONE 'UTC')::date;
  v_last := (p_end   AT TIME ZONE 'UTC')::date;

  WHILE v_cur <= v_last LOOP
    -- Skip Sunday (0) and Saturday (6)
    IF EXTRACT(DOW FROM v_cur) NOT IN (0, 6) THEN
      v_slot_start := (v_cur::text || ' 09:00:00')::timestamp AT TIME ZONE 'UTC';
      v_slot_end   := (v_cur::text || ' 18:00:00')::timestamp AT TIME ZONE 'UTC';

      -- Clamp to the actual p_start / p_end window
      v_slot_start := GREATEST(v_slot_start, p_start);
      v_slot_end   := LEAST(v_slot_end,   p_end);

      IF v_slot_end > v_slot_start THEN
        v_mins := v_mins + EXTRACT(EPOCH FROM (v_slot_end - v_slot_start)) / 60.0;
      END IF;
    END IF;

    v_cur := v_cur + 1;
  END LOOP;

  RETURN v_mins;
END;
$$;


-- ─── Update get_period_avg_response ─────────────────────────────────────────
-- Now reads sla_mode from the org and uses business_minutes_between when set.

CREATE OR REPLACE FUNCTION get_period_avg_response(
  p_org_id  uuid,
  p_start   timestamptz,
  p_end     timestamptz
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_sla_mode varchar(10);
BEGIN
  SELECT sla_mode INTO v_sla_mode
  FROM organizations WHERE id = p_org_id;

  RETURN (
    SELECT COALESCE(
      AVG(
        CASE WHEN v_sla_mode = 'business'
          THEN business_minutes_between(t.created_at, fr.first_reply)
          ELSE EXTRACT(EPOCH FROM (fr.first_reply - t.created_at)) / 60.0
        END
      ),
      0
    )
    FROM tickets t
    JOIN LATERAL (
      SELECT MIN(m.created_at) AS first_reply
      FROM messages m
      WHERE m.ticket_id = t.id
        AND m.sender_role = 'agent'
    ) fr ON fr.first_reply IS NOT NULL
    WHERE t.org_id = p_org_id
      AND t.status  = 'resolved'
      AND t.created_at >= p_start
      AND t.created_at <  p_end
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_period_avg_response(uuid, timestamptz, timestamptz) TO authenticated;


-- ─── Update get_org_health_snapshot ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_org_health_snapshot(p_org_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_sla_mode varchar(10);
BEGIN
  SELECT sla_mode INTO v_sla_mode FROM organizations WHERE id = p_org_id;

  RETURN (
    WITH
    first_responses AS (
      SELECT
        t.id,
        CASE WHEN v_sla_mode = 'business'
          THEN business_minutes_between(t.created_at, fr.first_reply)
          ELSE EXTRACT(EPOCH FROM (fr.first_reply - t.created_at)) / 60.0
        END AS response_minutes
      FROM tickets t
      JOIN LATERAL (
        SELECT MIN(m.created_at) AS first_reply
        FROM messages m
        WHERE m.ticket_id = t.id AND m.sender_role = 'agent'
      ) fr ON fr.first_reply IS NOT NULL
      WHERE t.org_id = p_org_id
        AND t.status = 'resolved'
    ),
    active_counts AS (
      SELECT
        COUNT(*)                                              AS active_total,
        COUNT(CASE WHEN assigned_to IS NULL THEN 1 END)      AS unassigned_count
      FROM tickets
      WHERE org_id = p_org_id
        AND status IN ('open', 'in_progress')
    ),
    org AS (
      SELECT target_first_response_time FROM organizations WHERE id = p_org_id
    )
    SELECT json_build_object(
      'avg_first_response_minutes',   COALESCE((SELECT AVG(response_minutes) FROM first_responses), 0),
      'sla_compliance_pct',           CASE
                                        WHEN (SELECT COUNT(*) FROM first_responses) = 0 THEN 100
                                        ELSE ROUND(
                                          100.0
                                          * (SELECT COUNT(*) FROM first_responses
                                             WHERE response_minutes <= (SELECT target_first_response_time FROM org))
                                          / (SELECT COUNT(*) FROM first_responses)
                                        )
                                      END,
      'active_total',                 (SELECT active_total    FROM active_counts),
      'unassigned_count',             (SELECT unassigned_count FROM active_counts),
      'target_first_response_minutes',(SELECT target_first_response_time FROM org)
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_org_health_snapshot(uuid) TO authenticated;


-- ─── Update get_all_orgs_health_snapshots ────────────────────────────────────

CREATE OR REPLACE FUNCTION get_all_orgs_health_snapshots()
RETURNS TABLE (
  org_id                          uuid,
  avg_first_response_minutes      numeric,
  sla_compliance_pct              numeric,
  active_total                    bigint,
  unassigned_count                bigint,
  target_first_response_minutes   int
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super-admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: super-admin required';
  END IF;

  RETURN QUERY
  WITH
  first_responses AS (
    SELECT
      t.org_id,
      t.id AS ticket_id,
      CASE WHEN o.sla_mode = 'business'
        THEN business_minutes_between(t.created_at, fr.first_reply)
        ELSE EXTRACT(EPOCH FROM (fr.first_reply - t.created_at)) / 60.0
      END AS response_minutes
    FROM tickets t
    JOIN organizations o ON o.id = t.org_id
    JOIN LATERAL (
      SELECT MIN(m.created_at) AS first_reply
      FROM messages m
      WHERE m.ticket_id = t.id AND m.sender_role = 'agent'
    ) fr ON fr.first_reply IS NOT NULL
    WHERE t.status = 'resolved'
  ),
  response_stats AS (
    SELECT
      fr.org_id,
      COALESCE(AVG(fr.response_minutes), 0)                          AS avg_response,
      CASE
        WHEN COUNT(*) = 0 THEN 100
        ELSE ROUND(
          100.0
          * COUNT(CASE WHEN fr.response_minutes <= o.target_first_response_time THEN 1 END)
          / COUNT(*)
        )
      END                                                            AS compliance_pct
    FROM first_responses fr
    JOIN organizations o ON o.id = fr.org_id
    GROUP BY fr.org_id
  ),
  active_stats AS (
    SELECT
      org_id,
      COUNT(*)                                             AS total,
      COUNT(CASE WHEN assigned_to IS NULL THEN 1 END)     AS unassigned
    FROM tickets
    WHERE status IN ('open', 'in_progress')
    GROUP BY org_id
  )
  SELECT
    o.id,
    COALESCE(rs.avg_response,    0)::numeric,
    COALESCE(rs.compliance_pct, 100)::numeric,
    COALESCE(acts.total,         0),
    COALESCE(acts.unassigned,    0),
    o.target_first_response_time
  FROM organizations o
  LEFT JOIN response_stats rs   ON rs.org_id   = o.id
  LEFT JOIN active_stats   acts ON acts.org_id = o.id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_all_orgs_health_snapshots() TO authenticated;
