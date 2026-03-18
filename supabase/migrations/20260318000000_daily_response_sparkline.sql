-- Per-day avg first-response time for the T.M. de Resposta sparkline chart.

CREATE OR REPLACE FUNCTION get_daily_avg_response(
  p_org_id  uuid,
  p_start   timestamptz,
  p_end     timestamptz
)
RETURNS TABLE(day text, avg_minutes numeric)
LANGUAGE sql
STABLE
AS $$
  SELECT
    TO_CHAR(t.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day,
    AVG(EXTRACT(EPOCH FROM (fr.created_at - t.created_at)) / 60.0) AS avg_minutes
  FROM tickets t
  JOIN LATERAL (
    SELECT m.created_at
    FROM messages m
    WHERE m.ticket_id = t.id
      AND m.sender_role = 'agent'
    ORDER BY m.created_at ASC
    LIMIT 1
  ) fr ON TRUE
  WHERE t.org_id    = p_org_id
    AND t.status    = 'resolved'
    AND t.created_at >= p_start
    AND t.created_at <  p_end
  GROUP BY TO_CHAR(t.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')
  ORDER BY day
$$;

GRANT EXECUTE ON FUNCTION get_daily_avg_response(uuid, timestamptz, timestamptz) TO authenticated;
