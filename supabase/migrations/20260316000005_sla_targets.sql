-- Adds configurable SLA target columns to organizations.
-- Defaults: 4h first response (240 min), 24h resolution (1440 min).

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS target_first_response_time int NOT NULL DEFAULT 240,
  ADD COLUMN IF NOT EXISTS target_resolution_time     int NOT NULL DEFAULT 1440;
