-- Run as postgres (or another PostgreSQL administrator).
-- Change the passwords before execution.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'raffle_platform_migrator') THEN
    CREATE ROLE raffle_platform_migrator LOGIN PASSWORD 'RaffleDev_Migrator_2026!';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'raffle_platform_app') THEN
    CREATE ROLE raffle_platform_app LOGIN PASSWORD 'RaffleDev_App_2026!';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'raffle_platform_readonly') THEN
    CREATE ROLE raffle_platform_readonly LOGIN PASSWORD 'RaffleDev_Readonly_2026!';
  END IF;
END
$$;
