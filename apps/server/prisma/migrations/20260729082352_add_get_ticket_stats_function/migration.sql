-- Computes the ticket dashboard stats (total, open, AI-resolved count/percent,
-- average resolution time, and a 30-day daily ticket volume series) inside the
-- database, in a single round trip, instead of the several separate Prisma
-- queries the /api/tickets/stats route previously issued.
--
-- Day boundaries are computed in UTC explicitly (rather than relying on
-- CURRENT_DATE, whose calendar day depends on the session's timezone setting)
-- since "createdAt"/"updatedAt" are stored as naive UTC timestamps (TIMESTAMP(3),
-- no timezone) — this matches the previous JS implementation's use of
-- Date#toISOString(), which is always UTC-based.
CREATE OR REPLACE FUNCTION get_ticket_stats()
RETURNS JSON
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_today DATE := (now() AT TIME ZONE 'UTC')::date;
  v_total INT;
  v_open INT;
  v_ai_resolved INT;
  v_avg_resolution_ms DOUBLE PRECISION;
  v_daily_volume JSON;
BEGIN
  SELECT COUNT(*) INTO v_total FROM "ticket";

  SELECT COUNT(*) INTO v_open
  FROM "ticket"
  WHERE "status" IN ('new', 'processing', 'open');

  SELECT COUNT(*) INTO v_ai_resolved
  FROM "ticket" t
  WHERE EXISTS (
    SELECT 1 FROM "reply" r
    WHERE r."ticketId" = t."id"
      AND r."senderType" = 'agent'
      AND r."userId" IS NULL
  );

  SELECT AVG(EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) * 1000)
  INTO v_avg_resolution_ms
  FROM "ticket"
  WHERE "status" IN ('resolved', 'closed');

  SELECT COALESCE(
    json_agg(
      json_build_object('date', to_char(d.day, 'YYYY-MM-DD'), 'count', COALESCE(c.count, 0))
      ORDER BY d.day
    ),
    '[]'::json
  )
  INTO v_daily_volume
  FROM generate_series(v_today - INTERVAL '29 days', v_today, INTERVAL '1 day') AS d(day)
  LEFT JOIN (
    SELECT "createdAt"::date AS day, COUNT(*) AS count
    FROM "ticket"
    WHERE "createdAt" >= v_today - INTERVAL '29 days'
    GROUP BY "createdAt"::date
  ) c ON c.day = d.day;

  RETURN json_build_object(
    'total', v_total,
    'open', v_open,
    'aiResolved', v_ai_resolved,
    'aiResolvedPercent', CASE WHEN v_total > 0 THEN (v_ai_resolved::float / v_total) * 100 ELSE 0 END,
    'avgResolutionMs', v_avg_resolution_ms,
    'dailyVolume', v_daily_volume
  );
END;
$$;
