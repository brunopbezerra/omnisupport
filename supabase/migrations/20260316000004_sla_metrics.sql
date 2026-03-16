-- RPC: average first-response time in minutes for a given org.
-- "First response" = first message with sender_role = 'agent' on a resolved ticket.
-- Returns 0 when there is no data yet.

CREATE OR REPLACE FUNCTION get_avg_first_response_minutes(p_org_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    AVG(
      EXTRACT(EPOCH FROM (first_response.created_at - t.created_at)) / 60.0
    ),
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
  ) first_response ON TRUE
  WHERE t.org_id = p_org_id
    AND t.status = 'resolved'
$$;

GRANT EXECUTE ON FUNCTION get_avg_first_response_minutes(uuid) TO authenticated;
