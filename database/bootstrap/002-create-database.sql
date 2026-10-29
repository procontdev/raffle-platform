-- psql does not allow CREATE DATABASE inside a transaction.
-- Run this file after 001-create-roles.sql.

SELECT 'CREATE DATABASE raffle_platform OWNER raffle_platform_migrator'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'raffle_platform')\gexec
