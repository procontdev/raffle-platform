-- Connect to raffle_platform before running this file.

REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE, CREATE ON SCHEMA public TO raffle_platform_migrator;
GRANT USAGE ON SCHEMA public TO raffle_platform_app, raffle_platform_readonly;

ALTER DEFAULT PRIVILEGES FOR ROLE raffle_platform_migrator IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO raffle_platform_app;
ALTER DEFAULT PRIVILEGES FOR ROLE raffle_platform_migrator IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO raffle_platform_app;
ALTER DEFAULT PRIVILEGES FOR ROLE raffle_platform_migrator IN SCHEMA public
  GRANT SELECT ON TABLES TO raffle_platform_readonly;
