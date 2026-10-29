-- Run as a PostgreSQL administrator after the application roles exist.
-- No credentials are stored here; the test connection string belongs in TEST_DATABASE_URL.
SELECT 'CREATE DATABASE raffle_platform_test OWNER raffle_platform_migrator'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'raffle_platform_test')\gexec
