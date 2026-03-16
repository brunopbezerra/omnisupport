-- get_org_health_snapshot: all signals needed to compute the workspace health score
-- for a single org (used by the dashboard health meter).

CREATE OR REPLACE FUNCTION get_org_health_snapshot(p_org_id uuid)
RETURNS json
LANGUAGE sql
STABLE
AS $$
  WITH
  first_responses AS (
    SELECT
      t.id,
      EXTRACT(EPOCH FROM (MIN(m.created_at) - t.created_at)) / 60.0 AS response_minutes
    FROM tickets t
    JOIN messages m ON m.ticket_id = t.id AND m.sender_role = 'agent'
    WHERE t.org_id = p_org_id
      AND t.status = 'resolved'
    GROUP BY t.id
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
$$;

GRANT EXECUTE ON FUNCTION get_org_health_snapshot(uuid) TO authenticated;


-- get_all_orgs_health_snapshots: same signals for every org in one query.
-- Only callable by super-admins (enforced inside the function).

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
      EXTRACT(EPOCH FROM (MIN(m.created_at) - t.created_at)) / 60.0 AS response_minutes
    FROM tickets t
    JOIN messages m ON m.ticket_id = t.id AND m.sender_role = 'agent'
    WHERE t.status = 'resolved'
    GROUP BY t.org_id, t.id
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
