-- Time-bounded avg first-response time for the trend comparison in KPI cards.

CREATE OR REPLACE FUNCTION get_period_avg_response(
  p_org_id  uuid,
  p_start   timestamptz,
  p_end     timestamptz
)
RETURNS numeric
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    AVG(EXTRACT(EPOCH FROM (fr.created_at - t.created_at)) / 60.0),
    0
  )
  FROM tickets t
  JOIN LATERAL (
    SELECT m.created_at
    FROM messages m
    WHERE m.ticket_id = t.id
      AND m.sender_role = 'agent'
    ORDER BY m.created_at ASC
    LIMIT 1
  ) fr ON TRUE
  WHERE t.org_id = p_org_id
    AND t.status  = 'resolved'
    AND t.created_at >= p_start
    AND t.created_at <  p_end
$$;

GRANT EXECUTE ON FUNCTION get_period_avg_response(uuid, timestamptz, timestamptz) TO authenticated;
